from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.approved_domain import ApprovedDomain
from app.models.source import Source


@dataclass(frozen=True)
class SourceSeed:
    name: str
    type: str
    base_url: str
    list_url: str
    org: str
    state: str | None
    parser_key: str
    crawl_frequency_minutes: int
    is_active: bool = True
    source_type: str = "other"
    priority: int = 50
    trust_level: int = 80
    parser_type: str = "generic"
    coverage_group: str | None = None
    official_homepage_url: str | None = None
    notification_page_url: str | None = None


DEFAULT_SOURCE_SEEDS: tuple[SourceSeed, ...] = (
    SourceSeed(
        name="SSC - Notices (ssc.nic.in)",
        type="html_list",
        base_url="https://ssc.nic.in",
        list_url="https://ssc.nic.in/portal/notices",
        org="SSC",
        state=None,
        parser_key="ssc_notices",
        crawl_frequency_minutes=180,
        is_active=True,
        source_type="central",
        priority=95,
        trust_level=95,
        parser_type="ssc_notices",
        coverage_group="SSC",
        official_homepage_url="https://ssc.gov.in",
        notification_page_url="https://ssc.nic.in/portal/notices",
    ),
    SourceSeed(
        name="UPSC - Active Exams",
        type="html_list",
        base_url="https://upsc.gov.in",
        list_url="https://upsc.gov.in/examinations/active-exams",
        org="UPSC",
        state=None,
        parser_key="upsc_active_exams",
        crawl_frequency_minutes=180,
        is_active=True,
        source_type="central",
        priority=95,
        trust_level=95,
        parser_type="upsc_active_exams",
        coverage_group="UPSC",
        official_homepage_url="https://upsc.gov.in",
        notification_page_url="https://upsc.gov.in/examinations/active-exams",
    ),
    SourceSeed(
        name="UPSC - Forthcoming Exams",
        type="html_list",
        base_url="https://upsc.gov.in",
        list_url="https://upsc.gov.in/examinations/forthcoming-exams",
        org="UPSC",
        state=None,
        parser_key="upsc_forthcoming_exams",
        crawl_frequency_minutes=360,
        is_active=True,
        source_type="central",
        priority=90,
        trust_level=95,
        parser_type="upsc_forthcoming_exams",
        coverage_group="UPSC",
        official_homepage_url="https://upsc.gov.in",
        notification_page_url="https://upsc.gov.in/examinations/forthcoming-exams",
    ),
    SourceSeed(
        name="UPSC - Exam Calendar (2026)",
        type="html_list",
        base_url="https://upsc.gov.in",
        list_url="https://upsc.gov.in/examinations/exam-calendar",
        org="UPSC",
        state=None,
        parser_key="upsc_exam_calendar_2026",
        crawl_frequency_minutes=720,
        is_active=True,
        source_type="central",
        priority=80,
        trust_level=95,
        parser_type="upsc_exam_calendar",
        coverage_group="UPSC",
        official_homepage_url="https://upsc.gov.in",
        notification_page_url="https://upsc.gov.in/examinations/exam-calendar",
    ),
    SourceSeed("Railway Recruitment Boards Central Apply", "html_list", "https://www.rrbapply.gov.in", "https://www.rrbapply.gov.in/", "RRB", None, "generic_official", 120, source_type="railway", priority=95, trust_level=90, coverage_group="Railway"),
    SourceSeed("RRB Chandigarh", "html_list", "https://www.rrbcdg.gov.in", "https://www.rrbcdg.gov.in/", "RRB", None, "generic_official", 180, source_type="railway", priority=85, trust_level=85, coverage_group="Railway"),
    SourceSeed("RBI Opportunities", "html_list", "https://opportunities.rbi.org.in", "https://opportunities.rbi.org.in/", "RBI", None, "generic_official", 180, source_type="banking", priority=90, trust_level=95, coverage_group="Banking"),
    SourceSeed("IBPS Current Openings", "html_list", "https://www.ibps.in", "https://www.ibps.in/current-openings/", "IBPS", None, "generic_official", 120, source_type="banking", priority=95, trust_level=90, coverage_group="Banking"),
    SourceSeed("NABARD Career Notices", "html_list", "https://www.nabard.org", "https://www.nabard.org/careers-notices.aspx", "NABARD", None, "generic_official", 360, source_type="banking", priority=75, trust_level=85, coverage_group="Banking"),
    SourceSeed("Join Indian Army", "html_list", "https://joinindianarmy.nic.in", "https://joinindianarmy.nic.in/", "Indian Army", None, "generic_official", 180, source_type="defence", priority=90, trust_level=90, coverage_group="Defence"),
    SourceSeed("Join Indian Navy", "html_list", "https://www.joinindiannavy.gov.in", "https://www.joinindiannavy.gov.in/", "Indian Navy", None, "generic_official", 180, source_type="defence", priority=90, trust_level=90, coverage_group="Defence"),
    SourceSeed("Indian Air Force AFCAT", "html_list", "https://afcat.cdac.in", "https://afcat.cdac.in/AFCAT/", "Indian Air Force", None, "generic_official", 180, source_type="defence", priority=90, trust_level=90, coverage_group="Defence"),
    SourceSeed("Agnipath Vayu", "html_list", "https://agnipathvayu.cdac.in", "https://agnipathvayu.cdac.in/", "Indian Air Force", None, "generic_official", 180, source_type="defence", priority=90, trust_level=90, coverage_group="Defence"),
    SourceSeed("BSF Recruitment", "html_list", "https://rectt.bsf.gov.in", "https://rectt.bsf.gov.in/", "BSF", None, "generic_official", 180, source_type="police", priority=80, trust_level=90, coverage_group="Defence"),
    SourceSeed("CRPF Recruitment", "html_list", "https://rect.crpf.gov.in", "https://rect.crpf.gov.in/", "CRPF", None, "generic_official", 180, source_type="police", priority=80, trust_level=90, coverage_group="Defence"),
    SourceSeed("CISF Recruitment", "html_list", "https://cisfrectt.cisf.gov.in", "https://cisfrectt.cisf.gov.in/", "CISF", None, "generic_official", 180, source_type="police", priority=80, trust_level=90, coverage_group="Defence"),
    SourceSeed("ITBP Recruitment", "html_list", "https://recruitment.itbpolice.nic.in", "https://recruitment.itbpolice.nic.in/", "ITBP", None, "generic_official", 180, source_type="police", priority=80, trust_level=90, coverage_group="Defence"),
    SourceSeed("NTA Recruitment", "html_list", "https://recruitment.nta.nic.in", "https://recruitment.nta.nic.in/", "NTA", None, "generic_official", 240, source_type="teaching", priority=80, trust_level=85, coverage_group="Central Government"),
    SourceSeed("KVS Recruitment", "html_list", "https://kvsangathan.nic.in", "https://kvsangathan.nic.in/recruitment/", "KVS", None, "generic_official", 360, source_type="teaching", priority=75, trust_level=85, coverage_group="State Teaching"),
    SourceSeed("NVS Recruitment", "html_list", "https://navodaya.gov.in", "https://navodaya.gov.in/nvs/en/Recruitment/", "NVS", None, "generic_official", 360, source_type="teaching", priority=75, trust_level=85, coverage_group="State Teaching"),
    SourceSeed("AIIMS Exams", "html_list", "https://www.aiimsexams.ac.in", "https://www.aiimsexams.ac.in/", "AIIMS", None, "generic_official", 240, source_type="health", priority=80, trust_level=90, coverage_group="State Health"),
    SourceSeed("ESIC Recruitments", "html_list", "https://www.esic.gov.in", "https://www.esic.gov.in/recruitments", "ESIC", None, "generic_official", 360, source_type="health", priority=75, trust_level=85, coverage_group="State Health"),
    SourceSeed("ONGC Careers", "html_list", "https://ongcindia.com", "https://ongcindia.com/web/eng/career/recruitment-notice", "ONGC", None, "generic_official", 360, source_type="psu", priority=75, trust_level=85, coverage_group="PSU"),
    SourceSeed("IOCL Careers", "html_list", "https://iocl.com", "https://iocl.com/latest-job-opening", "IOCL", None, "generic_official", 360, source_type="psu", priority=75, trust_level=85, coverage_group="PSU"),
    SourceSeed("BHEL Careers", "html_list", "https://careers.bhel.in", "https://careers.bhel.in/", "BHEL", None, "generic_official", 360, source_type="psu", priority=70, trust_level=85, coverage_group="PSU"),
    SourceSeed("SAIL Careers", "html_list", "https://sailcareers.com", "https://sailcareers.com/", "SAIL", None, "generic_official", 360, source_type="psu", priority=70, trust_level=85, coverage_group="PSU"),
    SourceSeed("NTPC Careers", "html_list", "https://careers.ntpc.co.in", "https://careers.ntpc.co.in/", "NTPC", None, "generic_official", 360, source_type="psu", priority=70, trust_level=85, coverage_group="PSU"),
    SourceSeed("Supreme Court Recruitment", "html_list", "https://www.sci.gov.in", "https://www.sci.gov.in/recruitments/", "Supreme Court of India", None, "generic_official", 360, source_type="court", priority=75, trust_level=90, coverage_group="Courts"),
    SourceSeed("Allahabad High Court Recruitment", "html_list", "https://www.allahabadhighcourt.in", "https://www.allahabadhighcourt.in/event/recruitment.jsp", "Allahabad High Court", "UP", "generic_official", 360, source_type="court", priority=75, trust_level=90, coverage_group="Courts"),
    SourceSeed("Patna High Court Recruitment", "html_list", "https://patnahighcourt.gov.in", "https://patnahighcourt.gov.in/Recruitments.aspx", "Patna High Court", "Bihar", "generic_official", 360, source_type="court", priority=75, trust_level=90, coverage_group="Courts"),
    SourceSeed("UPPSC", "html_list", "https://uppsc.up.nic.in", "https://uppsc.up.nic.in/", "UPPSC", "UP", "generic_official", 180, source_type="state", priority=90, trust_level=90, coverage_group="State PSC"),
    SourceSeed("UPSSSC", "html_list", "https://upsssc.gov.in", "https://upsssc.gov.in/", "UPSSSC", "UP", "generic_official", 180, source_type="state", priority=90, trust_level=90, coverage_group="State PSC"),
    SourceSeed("UP Police Recruitment Board", "html_list", "https://uppbpb.gov.in", "https://uppbpb.gov.in/", "UP Police", "UP", "generic_official", 180, source_type="police", priority=90, trust_level=90, coverage_group="State Police"),
    SourceSeed("BPSC", "html_list", "https://bpsc.bihar.gov.in", "https://bpsc.bihar.gov.in/", "BPSC", "Bihar", "generic_official", 180, source_type="state", priority=90, trust_level=90, coverage_group="State PSC"),
    SourceSeed("Bihar Police CSBC", "html_list", "https://csbc.bihar.gov.in", "https://csbc.bihar.gov.in/", "Bihar Police", "Bihar", "generic_official", 180, source_type="police", priority=85, trust_level=90, coverage_group="State Police"),
    SourceSeed("BTSC Bihar", "html_list", "https://btsc.bihar.gov.in", "https://btsc.bihar.gov.in/", "BTSC", "Bihar", "generic_official", 240, source_type="health", priority=80, trust_level=85, coverage_group="State Health"),
    SourceSeed("BSSC", "html_list", "https://bssc.bihar.gov.in", "https://bssc.bihar.gov.in/", "BSSC", "Bihar", "generic_official", 240, source_type="state", priority=80, trust_level=85, coverage_group="State PSC"),
    SourceSeed("JPSC", "html_list", "https://www.jpsc.gov.in", "https://www.jpsc.gov.in/", "JPSC", "Jharkhand", "generic_official", 240, source_type="state", priority=80, trust_level=85, coverage_group="State PSC"),
    SourceSeed("JSSC", "html_list", "https://jssc.jharkhand.gov.in", "https://jssc.jharkhand.gov.in/", "JSSC", "Jharkhand", "generic_official", 240, source_type="state", priority=80, trust_level=85, coverage_group="State PSC"),
    SourceSeed("RPSC", "html_list", "https://rpsc.rajasthan.gov.in", "https://rpsc.rajasthan.gov.in/", "RPSC", "Rajasthan", "generic_official", 240, source_type="state", priority=80, trust_level=85, coverage_group="State PSC"),
    SourceSeed("Rajasthan Staff Selection Board", "html_list", "https://rssb.rajasthan.gov.in", "https://rssb.rajasthan.gov.in/", "RSSB", "Rajasthan", "generic_official", 240, source_type="state", priority=80, trust_level=85, coverage_group="State PSC"),
    SourceSeed("HPSC", "html_list", "https://hpsc.gov.in", "https://hpsc.gov.in/", "HPSC", "Haryana", "generic_official", 240, source_type="state", priority=80, trust_level=85, coverage_group="State PSC"),
    SourceSeed("HSSC", "html_list", "https://hssc.gov.in", "https://hssc.gov.in/", "HSSC", "Haryana", "generic_official", 240, source_type="state", priority=80, trust_level=85, coverage_group="State PSC"),
    SourceSeed("UKPSC", "html_list", "https://psc.uk.gov.in", "https://psc.uk.gov.in/", "UKPSC", "Uttarakhand", "generic_official", 240, source_type="state", priority=80, trust_level=85, coverage_group="State PSC"),
    SourceSeed("UKSSSC", "html_list", "https://sssc.uk.gov.in", "https://sssc.uk.gov.in/", "UKSSSC", "Uttarakhand", "generic_official", 240, source_type="state", priority=80, trust_level=85, coverage_group="State PSC"),
    SourceSeed("HPPSC", "html_list", "https://www.hppsc.hp.gov.in", "https://www.hppsc.hp.gov.in/", "HPPSC", "Himachal Pradesh", "generic_official", 240, source_type="state", priority=80, trust_level=85, coverage_group="State PSC"),
    SourceSeed("JKSSB", "html_list", "https://jkssb.nic.in", "https://jkssb.nic.in/", "JKSSB", "Jammu and Kashmir", "generic_official", 240, source_type="state", priority=80, trust_level=85, coverage_group="State PSC"),
)


def seed_default_sources(db: Session) -> dict[str, int]:
    """
    Ensure default crawler sources exist.
    Uses parser_key + list_url as stable identity to avoid duplicates.
    """
    created = 0
    updated = 0
    domains_created = 0

    for seed in DEFAULT_SOURCE_SEEDS:
        stmt = select(Source).where(
            Source.parser_key == seed.parser_key,
            Source.list_url == seed.list_url,
        )
        existing = db.scalar(stmt)

        if existing is None:
            db.add(
                Source(
                    name=seed.name,
                    type=seed.type,
                    base_url=seed.base_url,
                    list_url=seed.list_url,
                    org=seed.org,
                    state=seed.state,
                    parser_key=seed.parser_key,
                    crawl_frequency_minutes=seed.crawl_frequency_minutes,
                    is_active=seed.is_active,
                    source_type=seed.source_type,
                    priority=seed.priority,
                    trust_level=seed.trust_level,
                    parser_type=seed.parser_type,
                    coverage_group=seed.coverage_group,
                    official_homepage_url=seed.official_homepage_url or seed.base_url,
                    notification_page_url=seed.notification_page_url or seed.list_url,
                )
            )
            created += 1
            continue

        changed = False
        for field, value in (
            ("name", seed.name),
            ("type", seed.type),
            ("base_url", seed.base_url),
            ("org", seed.org),
            ("state", seed.state),
            ("crawl_frequency_minutes", seed.crawl_frequency_minutes),
            ("is_active", seed.is_active),
            ("source_type", seed.source_type),
            ("priority", seed.priority),
            ("trust_level", seed.trust_level),
            ("parser_type", seed.parser_type),
            ("coverage_group", seed.coverage_group),
            ("official_homepage_url", seed.official_homepage_url or seed.base_url),
            ("notification_page_url", seed.notification_page_url or seed.list_url),
        ):
            if getattr(existing, field) != value:
                setattr(existing, field, value)
                changed = True

        if changed:
            db.add(existing)
            updated += 1

    for seed in DEFAULT_SOURCE_SEEDS:
        domain = (seed.official_homepage_url or seed.base_url).replace("https://", "").replace("http://", "").split("/")[0].removeprefix("www.")
        if not domain:
            continue
        existing_domain = db.scalar(select(ApprovedDomain).where(ApprovedDomain.domain == domain))
        if existing_domain is None:
            db.add(
                ApprovedDomain(
                    domain=domain,
                    organization=seed.org,
                    trust_level=seed.trust_level,
                    verified_by_admin=seed.trust_level >= 90,
                )
            )
            domains_created += 1

    if created or updated or domains_created:
        db.commit()

    return {"created": created, "updated": updated, "domains_created": domains_created}
