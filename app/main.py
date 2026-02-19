from fastapi import FastAPI
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.core.logging import setup_logging
from app.core.config import settings
from app.db.session import SessionLocal
from app.core.security import hash_password
from app.models.admin_user import AdminUser

from app.api.routes.auth import router as auth_router
from app.api.routes.public_jobs import router as jobs_router
from app.api.routes.admin_actions import router as admin_actions_router
from app.api.image_tool import router as image_tool_router



from app.api.convert import router as convert_router
from app.api.compress import router as compress_router

from app.admin.panel import setup_admin

from fastapi.middleware.cors import CORSMiddleware
setup_logging()

# ✅ app must be created BEFORE include_router
app = FastAPI(title=settings.APP_NAME)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
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

# ✅ include routers AFTER app exists
app.include_router(auth_router)
app.include_router(jobs_router)
app.include_router(admin_actions_router)
app.include_router(image_tool_router)                # ✅ add this
app.include_router(convert_router)
app.include_router(compress_router)

# ✅ admin panel
setup_admin(app)


@app.on_event("startup")
def seed_admin():
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
    finally:
        db.close()
