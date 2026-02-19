from sqlalchemy.orm import Session
from sqlalchemy import select
from app.models.admin_user import AdminUser

def get_by_email(db: Session, email: str) -> AdminUser | None:
    return db.scalar(select(AdminUser).where(AdminUser.email == email))

def create_admin(db: Session, email: str, password_hash: str) -> AdminUser:
    user = AdminUser(email=email, password_hash=password_hash)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
