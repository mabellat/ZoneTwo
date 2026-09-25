import logging
from datetime import datetime

import httpx
from fastapi import APIRouter, Depends, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.auth import get_current_user, sign_oauth_state, verify_oauth_state
from app.config import get_settings
from app.db import get_db
from app.models import User
from app.services.strava_client import StravaClient
from app.services.strava_profile import apply_strava_athlete_profile

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/strava", tags=["Strava"])
settings = get_settings()


@router.get("/authorize")
def strava_authorize(user: User = Depends(get_current_user)):
    state = sign_oauth_state(user.id)
    url = (
        f"https://www.strava.com/oauth/authorize?"
        f"client_id={settings.strava_client_id}&"
        f"response_type=code&"
        f"redirect_uri={settings.strava_redirect_uri}&"
        f"approval_prompt=force&"
        f"scope=read,activity:read_all&"
        f"state={state}"
    )
    return {"url": url}


@router.get("/callback")
async def strava_callback(
    code: str | None = Query(None),
    error: str | None = Query(None),
    state: str | None = Query(None),
    db: Session = Depends(get_db),
):
    frontend = settings.frontend_url
    if error or not code or not state:
        return RedirectResponse(url=f"{frontend}?auth_error=cancelled")

    user_id = verify_oauth_state(state)
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return RedirectResponse(url=f"{frontend}?auth_error=user_not_found")

    async with httpx.AsyncClient(timeout=30.0) as client:
        token_res = await client.post(
            "https://www.strava.com/oauth/token",
            data={
                "client_id": settings.strava_client_id,
                "client_secret": settings.strava_client_secret,
                "code": code,
                "grant_type": "authorization_code",
            },
        )
        tokens = token_res.json()
        access_token = tokens.get("access_token")
        if not access_token:
            return RedirectResponse(url=f"{frontend}?auth_error=token_failed")

        athlete_info = tokens.get("athlete", {})
        apply_strava_athlete_profile(user, athlete_info)
        user.access_token = access_token
        user.refresh_token = tokens.get("refresh_token")
        expires_at = tokens.get("expires_at")
        if expires_at:
            user.token_expires_at = datetime.utcfromtimestamp(expires_at)
        db.commit()
        db.refresh(user)

        strava = StravaClient(db, user)
        await strava.sync_activities(full_backfill=True)

    return RedirectResponse(url=f"{frontend}?strava_connected=true")


@router.post("/sync")
async def sync_strava(
    full_backfill: bool = False,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    client = StravaClient(db, user)
    result = await client.sync_activities(full_backfill=full_backfill)
    return result
