from fastapi import FastAPI, Request
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.core.logging import setup_logging
from app.core.config import settings
from app.core.rate_limit import check_public_tool_rate_limit
from app.db.session import SessionLocal
from app.core.security import hash_password
from app.models.admin_user import AdminUser
from app.services.source_registry import seed_default_sources

from app.api.image_tool import router as image_tool_router
from app.api.convert import router as convert_router
from app.api.compress import router as compress_router

from fastapi.middleware.cors import CORSMiddleware
setup_logging()

# ✅ app must be created BEFORE include_router
app = FastAPI(title=settings.APP_NAME)

def _cors_origins() -> list[str]:
    return [origin.strip() for origin in settings.CORS_ORIGINS.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=[
        "X-Output-Bytes",
        "X-Output-KB",
        "X-JPEG-Quality",
        "X-Output-Width",
        "X-Output-Height",
        "Content-Disposition",
    ],
)


@app.middleware("http")
async def public_tool_rate_limit(request: Request, call_next):
    limited_response = check_public_tool_rate_limit(request)
    if limited_response is not None:
        return limited_response
    return await call_next(request)

# Public phase 1: tools are safe to expose without publishing job/admin surfaces.
app.include_router(image_tool_router)
app.include_router(convert_router)
app.include_router(compress_router)

if settings.PUBLIC_SITE_PHASE != "tools":
    from app.api.routes.auth import router as auth_router
    from app.api.routes.public_jobs import router as jobs_router
    from app.api.routes.admin_actions import router as admin_actions_router
    from app.admin.panel import setup_admin

    app.include_router(auth_router)
    app.include_router(jobs_router)
    app.include_router(admin_actions_router)
    setup_admin(app)


@app.on_event("startup")
def seed_admin():
    if settings.PUBLIC_SITE_PHASE == "tools":
        return

    db: Session = SessionLocal()
    try:
        existing = db.scalar(select(AdminUser).where(AdminUser.email == settings.ADMIN_SEED_EMAIL))
        if not existing:
            db.add(
                AdminUser(
                    email=settings.ADMIN_SEED_EMAIL,
                    password_hash=hash_password(settings.ADMIN_SEED_PASSWORD),
                    is_active=True,
                )
            )
            db.commit()
        seed_default_sources(db)
    finally:
        db.close()
