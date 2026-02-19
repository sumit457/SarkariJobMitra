from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.api.deps import get_db
from app.core.security import verify_password, create_access_token
from app.crud.admin_users import get_by_email

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/login")
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = get_by_email(db, form.username)
    if not user or not verify_password(form.password, user.password_hash) or not user.is_active:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token(subject=user.email)
    return {"access_token": token, "token_type": "bearer"}
