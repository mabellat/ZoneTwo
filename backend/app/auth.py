import hashlib
import hmac
import json
import secrets
import uuid
from datetime import datetime, timedelta

import bcrypt
from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db import get_db
from app.models import User

security = HTTPBearer(auto_error=False)
settings = get_settings()

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 30
OAUTH_STATE_MAX_AGE_SECONDS = 600


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def create_access_token(user_id: uuid.UUID, email: str) -> str:
    expire = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    payload = {
        "sub": str(user_id),
        "email": email,
        "exp": int(expire.timestamp()),
    }
    return jwt.encode(payload, settings.auth_secret, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.auth_secret, algorithms=[ALGORITHM])
    except JWTError as exc:
        raise HTTPException(status_code=401, detail="Invalid or expired token") from exc


def sign_oauth_state(user_id: uuid.UUID) -> str:
    payload = json.dumps(
        {
            "user_id": str(user_id),
            "nonce": secrets.token_urlsafe(8),
            "iat": int(datetime.utcnow().timestamp()),
        }
    )
    sig = hmac.new(
        settings.auth_secret.encode(),
        payload.encode(),
        hashlib.sha256,
    ).hexdigest()
    return f"{payload}|{sig}"


def verify_oauth_state(state: str) -> uuid.UUID:
    try:
        payload_part, sig = state.rsplit("|", 1)
        expected = hmac.new(
            settings.auth_secret.encode(),
            payload_part.encode(),
            hashlib.sha256,
        ).hexdigest()
        if not hmac.compare_digest(sig, expected):
            raise ValueError("bad signature")
        data = json.loads(payload_part)
        issued = data.get("iat")
        if issued is None or int(datetime.utcnow().timestamp()) - int(issued) > OAUTH_STATE_MAX_AGE_SECONDS:
            raise ValueError("expired state")
        return uuid.UUID(data["user_id"])
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Invalid OAuth state") from exc


def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    token = None
    if credentials:
        token = credentials.credentials
    elif request.cookies.get("access_token"):
        token = request.cookies.get("access_token")

    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    payload = decode_token(token)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    user = db.query(User).filter(User.id == uuid.UUID(user_id)).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def get_optional_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: Session = Depends(get_db),
) -> User | None:
    if not credentials:
        return None
    try:
        payload = decode_token(credentials.credentials)
        user_id = payload.get("sub")
        if not user_id:
            return None
        return db.query(User).filter(User.id == uuid.UUID(user_id)).first()
    except HTTPException:
        return None
