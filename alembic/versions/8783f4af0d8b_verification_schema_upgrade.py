"""verification schema upgrade

Revision ID: 8783f4af0d8b
Revises: 3d2b7a9e4d11
Create Date: 2026-05-12 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '8783f4af0d8b'
down_revision = '3d2b7a9e4d11'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('sources', sa.Column('source_type', sa.String(length=50), nullable=True))
    op.add_column('sources', sa.Column('official_homepage_url', sa.String(length=500), nullable=True))
    op.add_column('sources', sa.Column('notification_page_url', sa.String(length=500), nullable=True))
    op.add_column('sources', sa.Column('apply_page_pattern', sa.String(length=500), nullable=True))
    op.add_column('sources', sa.Column('pdf_url_pattern', sa.String(length=500), nullable=True))
    op.add_column('sources', sa.Column('priority', sa.Integer(), nullable=False, server_default=sa.text('50')))
    op.add_column('sources', sa.Column('trust_level', sa.Integer(), nullable=False, server_default=sa.text('80')))
    op.add_column('sources', sa.Column('parser_type', sa.String(length=50), nullable=False, server_default='generic'))
    op.add_column('sources', sa.Column('coverage_group', sa.String(length=120), nullable=True))
    op.add_column('sources', sa.Column('last_checked_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('sources', sa.Column('last_success_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('sources', sa.Column('last_new_job_found_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('sources', sa.Column('consecutive_failures', sa.Integer(), nullable=False, server_default=sa.text('0')))
    op.add_column('sources', sa.Column('last_failure_reason', sa.Text(), nullable=True))
    op.add_column('sources', sa.Column('health_score', sa.Integer(), nullable=False, server_default=sa.text('100')))

    op.add_column('raw_items', sa.Column('raw_html', sa.Text(), nullable=True))
    op.add_column('raw_items', sa.Column('raw_text', sa.Text(), nullable=True))
    op.add_column('raw_items', sa.Column('detected_pdf_urls', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='{}'))
    op.add_column('raw_items', sa.Column('detected_apply_urls', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='{}'))
    op.add_column('raw_items', sa.Column('detected_dates', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='{}'))
    op.add_column('raw_items', sa.Column('url_hash', sa.String(length=64), nullable=True))
    op.add_column('raw_items', sa.Column('first_seen_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('raw_items', sa.Column('last_seen_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('raw_items', sa.Column('crawl_batch_id', sa.UUID(), nullable=True))
    op.add_column('raw_items', sa.Column('raw_status', sa.String(length=30), nullable=False, server_default='new'))
    op.add_column('raw_items', sa.Column('notice_type', sa.String(length=50), nullable=True))
    op.add_column('raw_items', sa.Column('is_probable_job', sa.Boolean(), nullable=False, server_default=sa.text('false')))
    op.add_column('raw_items', sa.Column('is_duplicate', sa.Boolean(), nullable=False, server_default=sa.text('false')))
    op.add_column('raw_items', sa.Column('duplicate_of_id', sa.UUID(), nullable=True))
    op.add_column('raw_items', sa.Column('extraction_error', sa.Text(), nullable=True))
    op.create_index('ix_raw_items_raw_status', 'raw_items', ['raw_status'], unique=False)
    op.create_index('ix_raw_items_notice_type', 'raw_items', ['notice_type'], unique=False)
    op.create_index('ix_raw_items_is_duplicate', 'raw_items', ['is_duplicate'], unique=False)

    op.add_column('jobs', sa.Column('advertisement_number', sa.String(length=200), nullable=True))
    op.add_column('jobs', sa.Column('post_name', sa.String(length=200), nullable=True))
    op.add_column('jobs', sa.Column('total_vacancies', sa.Integer(), nullable=True))
    op.add_column('jobs', sa.Column('qualification_summary', sa.Text(), nullable=True))
    op.add_column('jobs', sa.Column('application_start_date', sa.Date(), nullable=True))
    op.add_column('jobs', sa.Column('application_end_date', sa.Date(), nullable=True))
    op.add_column('jobs', sa.Column('official_notification_url', sa.String(length=800), nullable=True))
    op.add_column('jobs', sa.Column('official_pdf_url', sa.String(length=800), nullable=True))
    op.add_column('jobs', sa.Column('notice_type', sa.String(length=50), nullable=False, server_default='new_job'))
    op.add_column('jobs', sa.Column('verification_status', sa.String(length=50), nullable=False, server_default='unverified'))
    op.add_column('jobs', sa.Column('raw_item_id', sa.UUID(), nullable=True))
    op.add_column('jobs', sa.Column('is_duplicate', sa.Boolean(), nullable=False, server_default=sa.text('false')))
    op.add_column('jobs', sa.Column('duplicate_of_job_id', sa.UUID(), nullable=True))
    op.add_column('jobs', sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('jobs', sa.Column('priority', sa.Integer(), nullable=False, server_default=sa.text('50')))
    op.add_column('jobs', sa.Column('latest_update_type', sa.String(length=120), nullable=True))
    op.add_column('jobs', sa.Column('latest_update_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('jobs', sa.Column('admin_locked', sa.Boolean(), nullable=False, server_default=sa.text('false')))
    op.create_index('ix_jobs_notice_type', 'jobs', ['notice_type'], unique=False)
    op.create_index('ix_jobs_verification_status', 'jobs', ['verification_status'], unique=False)
    op.create_index('ix_jobs_is_duplicate', 'jobs', ['is_duplicate'], unique=False)
    op.create_index('ix_jobs_advertisement_number', 'jobs', ['advertisement_number'], unique=False)
    op.create_index('ix_jobs_source_id', 'jobs', ['source_id'], unique=False)

    op.create_table(
        'job_details',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('job_id', sa.UUID(), nullable=False),
        sa.Column('full_description', sa.Text(), nullable=True),
        sa.Column('important_dates_json', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('application_fee_json', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('age_limit_json', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('vacancy_details_json', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('qualification_details_json', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('selection_process', sa.Text(), nullable=True),
        sa.Column('salary', sa.Text(), nullable=True),
        sa.Column('how_to_apply', sa.Text(), nullable=True),
        sa.Column('important_links_json', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('raw_pdf_text', sa.Text(), nullable=True),
        sa.Column('source_summary', sa.Text(), nullable=True),
        sa.Column('pdf_text_quality_score', sa.Integer(), nullable=True),
        sa.Column('ocr_used', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('number_of_pages', sa.Integer(), nullable=True),
        sa.Column('tables_detected', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('language_detected', sa.String(length=80), nullable=True),
        sa.Column('extraction_method', sa.String(length=120), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['job_id'], ['jobs.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('job_id', name='uq_job_details_job_id')
    )

    op.create_table(
        'field_candidates',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('job_id', sa.UUID(), nullable=True),
        sa.Column('raw_item_id', sa.UUID(), nullable=True),
        sa.Column('field_name', sa.String(length=120), nullable=False),
        sa.Column('value', sa.Text(), nullable=False),
        sa.Column('normalized_value', sa.Text(), nullable=True),
        sa.Column('source_type', sa.String(length=50), nullable=False),
        sa.Column('source_url', sa.Text(), nullable=True),
        sa.Column('extractor_name', sa.String(length=120), nullable=True),
        sa.Column('confidence', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('selected', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('rejected', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('rejection_reason', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['job_id'], ['jobs.id'], ),
        sa.ForeignKeyConstraint(['raw_item_id'], ['raw_items.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    op.create_table(
        'field_conflicts',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('job_id', sa.UUID(), nullable=False),
        sa.Column('field_name', sa.String(length=120), nullable=False),
        sa.Column('value_a', sa.Text(), nullable=True),
        sa.Column('source_a', sa.String(length=200), nullable=True),
        sa.Column('value_b', sa.Text(), nullable=True),
        sa.Column('source_b', sa.String(length=200), nullable=True),
        sa.Column('resolution_status', sa.String(length=50), nullable=False, server_default='unresolved'),
        sa.Column('resolved_value', sa.Text(), nullable=True),
        sa.Column('resolved_by', sa.String(length=120), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('resolved_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['job_id'], ['jobs.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    op.create_table(
        'job_updates',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('job_id', sa.UUID(), nullable=False),
        sa.Column('update_type', sa.String(length=80), nullable=False),
        sa.Column('title', sa.String(length=500), nullable=True),
        sa.Column('source_url', sa.Text(), nullable=True),
        sa.Column('pdf_url', sa.Text(), nullable=True),
        sa.Column('published_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('extracted_data_json', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('confidence_score', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['job_id'], ['jobs.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    op.create_table(
        'crawl_runs',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('source_id', sa.UUID(), nullable=False),
        sa.Column('started_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('ended_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=False),
        sa.Column('items_found', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('new_items', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('updated_items', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('failed_items', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('parser_version', sa.String(length=120), nullable=True),
        sa.ForeignKeyConstraint(['source_id'], ['sources.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    op.create_table(
        'approved_domains',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('domain', sa.String(length=300), nullable=False),
        sa.Column('organization', sa.String(length=200), nullable=True),
        sa.Column('source_id', sa.UUID(), nullable=True),
        sa.Column('trust_level', sa.Integer(), nullable=False, server_default=sa.text('80')),
        sa.Column('verified_by_admin', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['source_id'], ['sources.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('domain', name='uq_approved_domains_domain')
    )

    op.create_table(
        'field_locks',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('job_id', sa.UUID(), nullable=False),
        sa.Column('field_name', sa.String(length=120), nullable=False),
        sa.Column('locked_value', sa.Text(), nullable=False),
        sa.Column('locked_by', sa.String(length=120), nullable=True),
        sa.Column('locked_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('reason', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['job_id'], ['jobs.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    op.create_index('ix_sources_priority', 'sources', ['priority'], unique=False)
    op.create_index('ix_sources_trust_level', 'sources', ['trust_level'], unique=False)
    op.create_index('ix_sources_source_type', 'sources', ['source_type'], unique=False)
    op.create_index('ix_sources_coverage_group', 'sources', ['coverage_group'], unique=False)
    op.create_index('ix_jobs_published_at', 'jobs', ['published_at'], unique=False)

    op.alter_column('sources', 'priority', server_default=None)
    op.alter_column('sources', 'trust_level', server_default=None)
    op.alter_column('sources', 'parser_type', server_default=None)
    op.alter_column('sources', 'consecutive_failures', server_default=None)
    op.alter_column('sources', 'health_score', server_default=None)
    op.alter_column('raw_items', 'detected_pdf_urls', server_default=None)
    op.alter_column('raw_items', 'detected_apply_urls', server_default=None)
    op.alter_column('raw_items', 'detected_dates', server_default=None)
    op.alter_column('raw_items', 'raw_status', server_default=None)
    op.alter_column('raw_items', 'is_probable_job', server_default=None)
    op.alter_column('raw_items', 'is_duplicate', server_default=None)
    op.alter_column('jobs', 'notice_type', server_default=None)
    op.alter_column('jobs', 'verification_status', server_default=None)
    op.alter_column('jobs', 'is_duplicate', server_default=None)
    op.alter_column('jobs', 'priority', server_default=None)
    op.alter_column('jobs', 'admin_locked', server_default=None)


def downgrade():
    op.drop_index('ix_jobs_published_at', table_name='jobs')
    op.drop_index('ix_sources_coverage_group', table_name='sources')
    op.drop_index('ix_sources_source_type', table_name='sources')
    op.drop_index('ix_sources_trust_level', table_name='sources')
    op.drop_index('ix_sources_priority', table_name='sources')
    op.drop_table('field_locks')
    op.drop_table('approved_domains')
    op.drop_table('crawl_runs')
    op.drop_table('job_updates')
    op.drop_table('field_conflicts')
    op.drop_table('field_candidates')
    op.drop_table('job_details')
    op.drop_index('ix_jobs_source_id', table_name='jobs')
    op.drop_index('ix_jobs_advertisement_number', table_name='jobs')
    op.drop_index('ix_jobs_is_duplicate', table_name='jobs')
    op.drop_index('ix_jobs_verification_status', table_name='jobs')
    op.drop_index('ix_jobs_notice_type', table_name='jobs')
    op.drop_column('jobs', 'admin_locked')
    op.drop_column('jobs', 'latest_update_at')
    op.drop_column('jobs', 'latest_update_type')
    op.drop_column('jobs', 'priority')
    op.drop_column('jobs', 'expires_at')
    op.drop_column('jobs', 'duplicate_of_job_id')
    op.drop_column('jobs', 'is_duplicate')
    op.drop_column('jobs', 'raw_item_id')
    op.drop_column('jobs', 'verification_status')
    op.drop_column('jobs', 'notice_type')
    op.drop_column('jobs', 'official_pdf_url')
    op.drop_column('jobs', 'official_notification_url')
    op.drop_column('jobs', 'application_end_date')
    op.drop_column('jobs', 'application_start_date')
    op.drop_column('jobs', 'qualification_summary')
    op.drop_column('jobs', 'post_name')
    op.drop_column('jobs', 'advertisement_number')
    op.drop_column('raw_items', 'extraction_error')
    op.drop_column('raw_items', 'duplicate_of_id')
    op.drop_column('raw_items', 'is_duplicate')
    op.drop_column('raw_items', 'is_probable_job')
    op.drop_column('raw_items', 'notice_type')
    op.drop_column('raw_items', 'raw_status')
    op.drop_column('raw_items', 'crawl_batch_id')
    op.drop_column('raw_items', 'last_seen_at')
    op.drop_column('raw_items', 'first_seen_at')
    op.drop_column('raw_items', 'url_hash')
    op.drop_column('raw_items', 'detected_dates')
    op.drop_column('raw_items', 'detected_apply_urls')
    op.drop_column('raw_items', 'detected_pdf_urls')
    op.drop_column('raw_items', 'raw_text')
    op.drop_column('raw_items', 'raw_html')
    op.drop_index('ix_raw_items_is_duplicate', table_name='raw_items')
    op.drop_index('ix_raw_items_notice_type', table_name='raw_items')
    op.drop_index('ix_raw_items_raw_status', table_name='raw_items')
    op.drop_index('ix_jobs_source_id', table_name='jobs')
    op.drop_index('ix_jobs_advertisement_number', table_name='jobs')
    op.drop_index('ix_jobs_is_duplicate', table_name='jobs')
    op.drop_index('ix_jobs_verification_status', table_name='jobs')
    op.drop_index('ix_jobs_notice_type', table_name='jobs')
    op.drop_column('sources', 'health_score')
    op.drop_column('sources', 'last_failure_reason')
    op.drop_column('sources', 'consecutive_failures')
    op.drop_column('sources', 'last_new_job_found_at')
    op.drop_column('sources', 'last_success_at')
    op.drop_column('sources', 'last_checked_at')
    op.drop_column('sources', 'coverage_group')
    op.drop_column('sources', 'parser_type')
    op.drop_column('sources', 'trust_level')
    op.drop_column('sources', 'priority')
    op.drop_column('sources', 'pdf_url_pattern')
    op.drop_column('sources', 'apply_page_pattern')
    op.drop_column('sources', 'notification_page_url')
    op.drop_column('sources', 'official_homepage_url')
    op.drop_column('sources', 'source_type')
