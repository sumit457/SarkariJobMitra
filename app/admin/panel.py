from sqladmin import Admin
from app.db.session import engine
from app.admin.views import SourceAdmin, JobAdmin, RawItemAdmin, AuditAdmin, AdminUserAdmin

def setup_admin(app):
    admin = Admin(app, engine)
    admin.add_view(SourceAdmin)
    admin.add_view(JobAdmin)
    admin.add_view(RawItemAdmin)
    admin.add_view(AuditAdmin)
    admin.add_view(AdminUserAdmin)
