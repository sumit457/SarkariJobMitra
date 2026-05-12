from sqladmin import ModelView
from app.models.source import Source
from app.models.job import Job
from app.models.raw_item import RawItem
from app.models.audit_log import AuditLog
from app.models.admin_user import AdminUser

class SourceAdmin(ModelView, model=Source):
    column_list = [
        Source.name,
        Source.type,
        Source.org,
        Source.state,
        Source.list_url,
        Source.source_type,
        Source.priority,
        Source.trust_level,
        Source.health_score,
        Source.parser_key,
        Source.is_active,
        Source.last_checked_at,
        Source.last_crawled_at,
    ]

    form_excluded_columns = [
        Source.created_at,
        Source.updated_at,
        Source.last_crawled_at,  # optional: also hide this in create form
    ]

class JobAdmin(ModelView, model=Job):
    column_list = [
        Job.title,
        Job.organization,
        Job.state,
        Job.notice_type,
        Job.verification_status,
        Job.confidence_score,
        Job.is_duplicate,
        Job.status,
        Job.published_at,
        Job.updated_at,
    ]
    column_searchable_list = [Job.title, Job.organization, Job.state]
    column_filters = [Job.status, Job.notice_type, Job.verification_status, Job.is_duplicate, Job.organization, Job.state]
    column_default_sort = ("created_at", True)  # True = DESC


    form_excluded_columns = [
        Job.created_at,
        Job.updated_at,
        Job.published_at,
    ]

class RawItemAdmin(ModelView, model=RawItem):
    column_list = [RawItem.title_raw, RawItem.url_raw, RawItem.notice_type, RawItem.raw_status, RawItem.is_probable_job, RawItem.status, RawItem.found_at]

class AuditAdmin(ModelView, model=AuditLog):
    column_list = [AuditLog.actor, AuditLog.action, AuditLog.entity_type, AuditLog.entity_id, AuditLog.created_at]

class AdminUserAdmin(ModelView, model=AdminUser):
    column_list = [AdminUser.email, AdminUser.is_active, AdminUser.created_at]
    can_delete = False
