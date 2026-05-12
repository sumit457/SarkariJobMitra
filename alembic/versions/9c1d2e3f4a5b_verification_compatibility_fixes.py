"""verification compatibility fixes

Revision ID: 9c1d2e3f4a5b
Revises: 8783f4af0d8b
Create Date: 2026-05-12 00:30:00.000000
"""
from alembic import op
import sqlalchemy as sa


revision = "9c1d2e3f4a5b"
down_revision = "8783f4af0d8b"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("ALTER TABLE raw_items ADD COLUMN IF NOT EXISTS raw_title VARCHAR(500)")
    op.execute("ALTER TABLE raw_items ADD COLUMN IF NOT EXISTS raw_url VARCHAR(800)")
    op.execute("UPDATE raw_items SET raw_title = title_raw WHERE raw_title IS NULL")
    op.execute("UPDATE raw_items SET raw_url = url_raw WHERE raw_url IS NULL")

    op.execute("ALTER TABLE sources ALTER COLUMN crawl_frequency_minutes SET DEFAULT 1440")
    op.execute("UPDATE sources SET crawl_frequency_minutes = 1440 WHERE crawl_frequency_minutes IS NULL")

    # Phase 1 allows jobs created during review/update matching to be attached
    # to a raw item before a source-level relationship is known.
    op.alter_column("jobs", "source_id", existing_type=sa.UUID(), nullable=True)

    op.execute("CREATE INDEX IF NOT EXISTS ix_raw_items_url_hash ON raw_items (url_hash)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_field_candidates_job_field ON field_candidates (job_id, field_name)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_field_candidates_raw_field ON field_candidates (raw_item_id, field_name)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_field_conflicts_job_status ON field_conflicts (job_id, resolution_status)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_field_locks_job_field ON field_locks (job_id, field_name)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_job_updates_job_type ON job_updates (job_id, update_type)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_crawl_runs_source_started ON crawl_runs (source_id, started_at)")


def downgrade():
    op.execute("DROP INDEX IF EXISTS ix_crawl_runs_source_started")
    op.execute("DROP INDEX IF EXISTS ix_job_updates_job_type")
    op.execute("DROP INDEX IF EXISTS ix_field_locks_job_field")
    op.execute("DROP INDEX IF EXISTS ix_field_conflicts_job_status")
    op.execute("DROP INDEX IF EXISTS ix_field_candidates_raw_field")
    op.execute("DROP INDEX IF EXISTS ix_field_candidates_job_field")
    op.execute("DROP INDEX IF EXISTS ix_raw_items_url_hash")
    op.alter_column("jobs", "source_id", existing_type=sa.UUID(), nullable=False)
    op.execute("ALTER TABLE sources ALTER COLUMN crawl_frequency_minutes DROP DEFAULT")
    op.drop_column("raw_items", "raw_url")
    op.drop_column("raw_items", "raw_title")
