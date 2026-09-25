
from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.auth import (
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)
from app.config import get_settings
from app.db import get_db
from app.models import User
from app.services.strava_profile import athlete_display_name

router = APIRouter(prefix="/api/auth", tags=["Auth"])
settings = get_settings()


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ProfileUpdate(BaseModel):
    max_heart_rate: int | None = None
    resting_heart_rate: int | None = None
    lthr: int | None = None


@router.post("/register")
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == req.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(email=req.email.lower(), password_hash=hash_password(req.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token(user.id, user.email)
    return {"access_token": token, "user": _user_dict(user)}


@router.post("/login")
def login(req: LoginRequest, response: Response, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email.lower()).first()
    if not user or not user.password_hash or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token(user.id, user.email)
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        samesite="lax",
        max_age=30 * 24 * 3600,
    )
    return {"access_token": token, "user": _user_dict(user)}


@router.get("/me")
def me(user: User = Depends(get_current_user)):
    return _user_dict(user)


@router.patch("/profile")
def update_profile(
    body: ProfileUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if body.max_heart_rate is not None:
        if not 100 <= body.max_heart_rate <= 230:
            raise HTTPException(status_code=400, detail="max_heart_rate must be between 100 and 230")
        user.max_heart_rate = body.max_heart_rate
    if body.resting_heart_rate is not None:
        if not 30 <= body.resting_heart_rate <= 120:
            raise HTTPException(status_code=400, detail="resting_heart_rate must be between 30 and 120")
        user.resting_heart_rate = body.resting_heart_rate
    if body.lthr is not None:
        if body.lthr == 0:
            user.lthr = None
        else:
            if body.lthr < 120 or body.lthr > 220:
                raise HTTPException(status_code=400, detail="lthr must be between 120 and 220")
            user.lthr = body.lthr
    db.commit()
    db.refresh(user)
    return _user_dict(user)


def _user_dict(user: User) -> dict:
    return {
        "id": str(user.id),
        "email": user.email,
        "display_name": athlete_display_name(user),
        "profile_photo_url": user.profile_photo_url,
        "max_heart_rate": user.max_heart_rate,
        "resting_heart_rate": user.resting_heart_rate,
        "lthr": user.lthr,
        "strava_connected": bool(user.access_token),
        "last_sync_at": user.last_sync_at.isoformat() if user.last_sync_at else None,
        "onboarding_complete": user.onboarding_complete,
    }
