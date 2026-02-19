"""add structured job intelligence fields and indexes

Revision ID: 3d2b7a9e4d11
Revises: d89976657c23
Create Date: 2026-02-18 20:30:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "3d2b7a9e4d11"
down_revision = "d89976657c23"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("jobs", sa.Column("opening_date", sa.Date(), nullable=True))
    op.add_column("jobs", sa.Column("closing_date", sa.Date(), nullable=True))
    op.add_column("jobs", sa.Column("vacancy_count", sa.Integer(), nullable=True))
    op.add_column("jobs", sa.Column("salary", sa.String(length=255), nullable=True))
    op.add_column("jobs", sa.Column("pay_level", sa.String(length=100), nullable=True))
    op.add_column("jobs", sa.Column("age_limit", sa.String(length=255), nullable=True))
    op.add_column("jobs", sa.Column("qualification", sa.Text(), nullable=True))
    op.add_column("jobs", sa.Column("exam_centers", sa.Text(), nullable=True))
    op.add_column("jobs", sa.Column("application_fee", sa.String(length=255), nullable=True))
    op.add_column("jobs", sa.Column("official_apply_url", sa.String(length=500), nullable=True))
    op.add_column("jobs", sa.Column("official_notification_pdf_url", sa.String(length=500), nullable=True))
    op.add_column("jobs", sa.Column("short_description", sa.Text(), nullable=True))
    op.add_column("jobs", sa.Column("detailed_description", sa.Text(), nullable=True))
    op.add_column("jobs", sa.Column("is_verified", sa.Boolean(), nullable=False, server_default=sa.text("false")))
    op.add_column("jobs", sa.Column("confidence_score", sa.Float(), nullable=False, server_default=sa.text("0")))
    op.add_column("jobs", sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")))

    op.create_index("ix_jobs_opening_date", "jobs", ["opening_date"], unique=False)
    op.create_index("ix_jobs_closing_date", "jobs", ["closing_date"], unique=False)
    op.create_index("ix_jobs_is_verified", "jobs", ["is_verified"], unique=False)
    op.create_index("ix_jobs_is_active", "jobs", ["is_active"], unique=False)
    op.create_index("ix_jobs_status", "jobs", ["status"], unique=False)
    op.create_index("ix_jobs_created_at", "jobs", ["created_at"], unique=False)
    op.create_index("ix_jobs_organization", "jobs", ["organization"], unique=False)
    op.create_index("ix_jobs_state", "jobs", ["state"], unique=False)

    op.alter_column("jobs", "is_verified", server_default=None)
    op.alter_column("jobs", "confidence_score", server_default=None)
    op.alter_column("jobs", "is_active", server_default=None)


def downgrade():
    op.drop_index("ix_jobs_state", table_name="jobs")
    op.drop_index("ix_jobs_organization", table_name="jobs")
    op.drop_index("ix_jobs_created_at", table_name="jobs")
    op.drop_index("ix_jobs_status", table_name="jobs")
    op.drop_index("ix_jobs_is_active", table_name="jobs")
    op.drop_index("ix_jobs_is_verified", table_name="jobs")
    op.drop_index("ix_jobs_closing_date", table_name="jobs")
    op.drop_index("ix_jobs_opening_date", table_name="jobs")

    op.drop_column("jobs", "is_active")
    op.drop_column("jobs", "confidence_score")
    op.drop_column("jobs", "is_verified")
    op.drop_column("jobs", "detailed_description")
    op.drop_column("jobs", "short_description")
    op.drop_column("jobs", "official_notification_pdf_url")
    op.drop_column("jobs", "official_apply_url")
    op.drop_column("jobs", "application_fee")
    op.drop_column("jobs", "exam_centers")
    op.drop_column("jobs", "qualification")
    op.drop_column("jobs", "age_limit")
    op.drop_column("jobs", "pay_level")
    op.drop_column("jobs", "salary")
    op.drop_column("jobs", "vacancy_count")
    op.drop_column("jobs", "closing_date")
    op.drop_column("jobs", "opening_date")
