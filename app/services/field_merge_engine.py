from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.field_candidate import FieldCandidate
from app.models.field_conflict import FieldConflict
from app.models.field_lock import FieldLock
from app.schemas.normalized_job import NormalizedJobPayload


SOURCE_PRIORITY = {
    "manual": 700,
    "official_pdf": 600,
    "official_page": 500,
    "apply_page": 400,
    "regex": 300,
    "llm": 200,
    "aggregator": 100,
}

PAYLOAD_FIELD_MAP = {
    "important_dates": "important_dates",
    "application_fee": "application_fee",
    "age_limit": "age_limit",
    "vacancy_details": "vacancy_details",
    "qualification_details": "qualification_details",
    "selection_process": "selection_process",
    "salary": "salary",
    "how_to_apply": "how_to_apply",
    "important_links": "important_links",
}

CRITICAL_FIELDS = {
    "title",
    "organization",
    "application_end_date",
    "official_notification_url",
    "official_pdf_url",
    "apply_url",
}


@dataclass(frozen=True)
class MergeDecision:
    field_name: str
    value: str
    source_type: str
    confidence: int
    conflict: bool = False


def _score(candidate: FieldCandidate) -> int:
    return SOURCE_PRIORITY.get(candidate.source_type, 0) + int(candidate.confidence or 0)


def _value(candidate: FieldCandidate) -> str:
    return candidate.normalized_value or candidate.value


def _conflicts(left: FieldCandidate, right: FieldCandidate) -> bool:
    return _value(left).strip().lower() != _value(right).strip().lower()


def _load_candidates(db: Session, *, raw_item_id=None, job_id=None) -> list[FieldCandidate]:
    stmt = select(FieldCandidate).where(FieldCandidate.rejected.is_(False))
    if job_id is not None:
        stmt = stmt.where(FieldCandidate.job_id == job_id)
    if raw_item_id is not None:
        stmt = stmt.where(FieldCandidate.raw_item_id == raw_item_id)
    return list(db.scalars(stmt))


def merge_field_candidates(db: Session, *, raw_item_id=None, job_id=None) -> NormalizedJobPayload:
    candidates = _load_candidates(db, raw_item_id=raw_item_id, job_id=job_id)
    locks = {
        lock.field_name: lock
        for lock in db.scalars(select(FieldLock).where(FieldLock.job_id == job_id)) if job_id is not None
    }

    grouped: dict[str, list[FieldCandidate]] = defaultdict(list)
    for candidate in candidates:
        grouped[candidate.field_name].append(candidate)

    payload_data = {name: None for name in NormalizedJobPayload.model_fields}
    field_confidences: dict[str, int] = {}
    extraction_sources: dict[str, dict[str, str | int]] = {}

    for field_name, items in grouped.items():
        if field_name in locks:
            lock = locks[field_name]
            payload_data[field_name] = lock.locked_value
            field_confidences[field_name] = 100
            extraction_sources[field_name] = {"source_type": "manual_lock", "confidence": 100}
            continue

        ranked = sorted(items, key=_score, reverse=True)
        top = ranked[0]
        selected_value = _value(top)
        top.selected = True
        payload_key = PAYLOAD_FIELD_MAP.get(field_name, field_name)
        if payload_key in payload_data:
            payload_data[payload_key] = selected_value
        field_confidences[payload_key] = int(top.confidence or 0)
        extraction_sources[payload_key] = {
            "source_type": top.source_type,
            "source_url": top.source_url or "",
            "confidence": int(top.confidence or 0),
        }

        if len(ranked) > 1:
            runner_up = ranked[1]
            if (
                field_name in CRITICAL_FIELDS
                and int(top.confidence or 0) >= 70
                and int(runner_up.confidence or 0) >= 70
                and _conflicts(top, runner_up)
            ):
                exists = db.scalar(
                    select(FieldConflict).where(
                        FieldConflict.job_id == job_id,
                        FieldConflict.field_name == field_name,
                        FieldConflict.resolution_status == "unresolved",
                    )
                )
                if exists is None and job_id is not None:
                    db.add(
                        FieldConflict(
                            job_id=job_id,
                            field_name=field_name,
                            value_a=selected_value,
                            source_a=top.source_type,
                            value_b=_value(runner_up),
                            source_b=runner_up.source_type,
                        )
                    )

    payload_data["field_confidences"] = field_confidences or None
    payload_data["extraction_sources"] = extraction_sources or None
    return NormalizedJobPayload(**payload_data)
