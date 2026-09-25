"""Strava HTTP client: token refresh, paginated sync, and resilient upstream requests."""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Any

import httpx
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models import Activity, User
from app.services.strava_profile import apply_strava_athlete_profile

logger = logging.getLogger(__name__)
settings = get_settings()

_MAX_REQUEST_ATTEMPTS = 4

RUN_SPORTS = {"Run", "TrailRun", "VirtualRun", "Walk", "Hike"}
BIKE_SPORTS = {"Ride", "VirtualRide", "EBikeRide", "GravelRide"}
SWIM_SPORTS = {"Swim"}


class StravaAPIError(Exception):
    def __init__(self, message: str, status_code: int | None = None, retry_after: int | None = None):
        super().__init__(message)
        self.status_code = status_code
        self.retry_after = retry_after


class StravaClient:
    def __init__(self, db: Session, user: User):
        self.db = db
        self.user = user

    async def _request(
        self,
        client: httpx.AsyncClient,
        method: str,
        url: str,
        **kwargs,
    ) -> httpx.Response:
        await self._ensure_valid_token(client)
        headers = kwargs.pop("headers", {})
        headers["Authorization"] = f"Bearer {self.user.access_token}"
        for attempt in range(_MAX_REQUEST_ATTEMPTS):
            response = await client.request(method, url, headers=headers, **kwargs)
            if response.status_code == 429:
                retry_after = int(response.headers.get("Retry-After", "2"))
                await asyncio.sleep(min(retry_after, 30))
                continue
            if response.status_code >= 500 and attempt < _MAX_REQUEST_ATTEMPTS - 1:
                await asyncio.sleep(2 ** attempt)
                continue
            if response.status_code == 401:
                await self._refresh_token(client)
                headers["Authorization"] = f"Bearer {self.user.access_token}"
                continue
            if response.status_code >= 400:
                raise StravaAPIError(
                    f"Strava API error: {response.text}",
                    status_code=response.status_code,
                )
            return response
        raise StravaAPIError("Strava API rate limit or server error", status_code=429)

    async def _ensure_valid_token(self, client: httpx.AsyncClient) -> None:
        if not self.user.access_token:
            raise StravaAPIError("Strava not connected", status_code=401)
        if self.user.token_expires_at and self.user.token_expires_at <= datetime.utcnow() + timedelta(minutes=5):
            await self._refresh_token(client)

    async def _refresh_token(self, client: httpx.AsyncClient) -> None:
        if not self.user.refresh_token:
            raise StravaAPIError("Strava token expired; reconnect required", status_code=401)
        response = await client.post(
            "https://www.strava.com/oauth/token",
            data={
                "client_id": settings.strava_client_id,
                "client_secret": settings.strava_client_secret,
                "grant_type": "refresh_token",
                "refresh_token": self.user.refresh_token,
            },
        )
        data = response.json()
        if not data.get("access_token"):
            raise StravaAPIError("Failed to refresh Strava token", status_code=401)
        self.user.access_token = data["access_token"]
        self.user.refresh_token = data.get("refresh_token", self.user.refresh_token)
        expires_at = data.get("expires_at")
        if expires_at:
            self.user.token_expires_at = datetime.utcfromtimestamp(expires_at)
        self.db.commit()
        self.db.refresh(self.user)

    async def fetch_activities_page(
        self,
        client: httpx.AsyncClient,
        page: int,
        per_page: int = 100,
        after: int | None = None,
    ) -> list[dict[str, Any]]:
        params: dict[str, Any] = {"page": page, "per_page": per_page}
        if after is not None:
            params["after"] = after
        url = "https://www.strava.com/api/v3/athlete/activities"
        response = await self._request(client, "GET", url, params=params)
        data = response.json()
        return data if isinstance(data, list) else []

    async def fetch_athlete(self, client: httpx.AsyncClient) -> dict[str, Any]:
        response = await self._request(client, "GET", "https://www.strava.com/api/v3/athlete")
        data = response.json()
        return data if isinstance(data, dict) else {}

    def upsert_activity(self, act: dict[str, Any]) -> bool:
        sport = act.get("sport_type") or act.get("type") or "Run"
        strava_id = str(act.get("id"))
        existing = (
            self.db.query(Activity)
            .filter(Activity.strava_activity_id == strava_id)
            .first()
        )
        raw_date = (act.get("start_date_local") or act.get("start_date") or "").replace("Z", "")
        try:
            start_dt = datetime.fromisoformat(raw_date) if raw_date else datetime.utcnow()
        except ValueError:
            start_dt = datetime.utcnow()

        fields = {
            "name": act.get("name") or "Activity",
            "sport_type": sport,
            "distance_meters": float(act.get("distance") or 0),
            "moving_time_seconds": int(act.get("moving_time") or 0),
            "average_heartrate": act.get("average_heartrate"),
            "max_heartrate": act.get("max_heartrate"),
            "elevation_gain": act.get("total_elevation_gain"),
            "average_watts": act.get("average_watts"),
            "start_date": start_dt,
            "strava_payload": act,
        }
        if existing:
            for key, value in fields.items():
                setattr(existing, key, value)
            return False
        self.db.add(
            Activity(
                user_id=self.user.id,
                strava_activity_id=strava_id,
                **fields,
            )
        )
        return True

    async def sync_activities(self, full_backfill: bool = False) -> dict[str, Any]:
        if not self.user.access_token:
            return {"ok": False, "error": "not_connected", "message": "Connect Strava first."}

        after_ts: int | None = None
        if not full_backfill and self.user.last_sync_at:
            after_ts = int(self.user.last_sync_at.timestamp())
        elif full_backfill:
            months = settings.strava_backfill_months
            after_dt = datetime.utcnow() - timedelta(days=months * 30)
            after_ts = int(after_dt.timestamp())

        added = 0
        updated = 0
        page = 1
        async with httpx.AsyncClient(timeout=60.0) as client:
            while True:
                batch = await self.fetch_activities_page(client, page=page, after=after_ts)
                if not batch:
                    break
                for act in batch:
                    if self.upsert_activity(act):
                        added += 1
                    else:
                        updated += 1
                if len(batch) < 100:
                    break
                page += 1
                if page > 50:
                    break
            try:
                athlete = await self.fetch_athlete(client)
                apply_strava_athlete_profile(self.user, athlete)
            except StravaAPIError as exc:
                logger.warning("Could not refresh Strava athlete profile: %s", exc)
            self.user.last_sync_at = datetime.utcnow()
            self.db.commit()

        return {
            "ok": True,
            "added": added,
            "updated": updated,
            "last_sync_at": self.user.last_sync_at.isoformat(),
        }
