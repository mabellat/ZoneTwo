import logging
from datetime import datetime
from urllib.parse import quote

import httpx
from fastapi import APIRouter, Depends, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.auth import (
    create_access_token,
    get_current_user,
    sign_oauth_state,
    sign_strava_login_state,
    verify_strava_oauth_state,
)
from app.config import get_settings
from app.db import get_db
from app.models import User
from app.services.strava_client import StravaClient
from app.services.strava_profile import apply_strava_athlete_profile

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/strava", tags=["Strava"])
settings = get_settings()


def _strava_authorize_url(state: str) -> str:
    return (
        f"https://www.strava.com/oauth/authorize?"
        f"client_id={settings.strava_client_id}&"
        f"response_type=code&"
        f"redirect_uri={settings.strava_redirect_uri}&"
        f"approval_prompt=auto&"
        f"scope=read,activity:read_all&"
        f"state={quote(state, safe='')}"
    )


async def _exchange_code_for_tokens(client: httpx.AsyncClient, code: str) -> dict:
    token_res = await client.post(
        "https://www.strava.com/oauth/token",
        data={
            "client_id": settings.strava_client_id,
            "client_secret": settings.strava_client_secret,
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": settings.strava_redirect_uri,
        },
    )
    if token_res.status_code >= 400:
        logger.warning("Strava token exchange failed: %s", token_res.text)
        return {}
    return token_res.json()


def _apply_tokens_to_user(user: User, tokens: dict, db: Session) -> None:
    athlete_info = tokens.get("athlete", {})
    apply_strava_athlete_profile(user, athlete_info)
    user.access_token = tokens.get("access_token")
    user.refresh_token = tokens.get("refresh_token")
    expires_at = tokens.get("expires_at")
    if expires_at:
        user.token_expires_at = datetime.utcfromtimestamp(expires_at)
    db.commit()
    db.refresh(user)


def _user_for_strava_login(db: Session, athlete: dict, tokens: dict) -> User:
    athlete_id = athlete.get("id")
    if athlete_id is None:
        raise ValueError("missing athlete id")
    athlete_key = str(athlete_id)
    user = db.query(User).filter(User.strava_athlete_id == athlete_key).first()
    if not user:
        user = User(
            email=f"strava_{athlete_key}@strava.local",
            password_hash=None,
        )
        db.add(user)
        db.flush()
    _apply_tokens_to_user(user, tokens, db)
    return user


@router.get("/login")
def strava_login():
    """Start OAuth for sign-up / sign-in (no existing session required)."""
    state = sign_strava_login_state()
    return {"url": _strava_authorize_url(state)}


@router.get("/authorize")
def strava_authorize(user: User = Depends(get_current_user)):
    state = sign_oauth_state(user.id)
    return {"url": _strava_authorize_url(state)}


@router.get("/callback")
async def strava_callback(
    code: str | None = Query(None),
    error: str | None = Query(None),
    state: str | None = Query(None),
    db: Session = Depends(get_db),
):
    frontend = settings.frontend_url.rstrip("/")
    if error or not code or not state:
        return RedirectResponse(url=f"{frontend}/login?auth_error=cancelled")

    oauth_state = verify_strava_oauth_state(state)

    async with httpx.AsyncClient(timeout=60.0) as client:
        tokens = await _exchange_code_for_tokens(client, code)
        access_token = tokens.get("access_token")
        if not access_token:
            return RedirectResponse(url=f"{frontend}/login?auth_error=token_failed")

        athlete_info = tokens.get("athlete", {}) or {}

        if oauth_state.mode == "login":
            try:
                user = _user_for_strava_login(db, athlete_info, tokens)
            except ValueError:
                return RedirectResponse(url=f"{frontend}/login?auth_error=token_failed")

            strava = StravaClient(db, user)
            await strava.sync_activities(full_backfill=True)

            jwt = create_access_token(user.id, user.email)
            return RedirectResponse(url=f"{frontend}/login#access_token={jwt}")

        user = db.query(User).filter(User.id == oauth_state.user_id).first()
        if not user:
            return RedirectResponse(url=f"{frontend}/login?auth_error=user_not_found")

        _apply_tokens_to_user(user, tokens, db)
        strava = StravaClient(db, user)
        await strava.sync_activities(full_backfill=True)

    return RedirectResponse(url=f"{frontend}/home?strava_connected=true")
