"""Map Strava athlete payloads onto User profile fields."""

from typing import Any

from app.models import User


def apply_strava_athlete_profile(user: User, athlete: dict[str, Any] | None) -> None:
    if not athlete:
        return
    athlete_id = athlete.get("id")
    if athlete_id is not None:
        user.strava_athlete_id = str(athlete_id)
    first = athlete.get("firstname") or athlete.get("first_name")
    last = athlete.get("lastname") or athlete.get("last_name")
    if first:
        user.strava_first_name = first
    if last:
        user.strava_last_name = last
    photo = athlete.get("profile") or athlete.get("profile_medium")
    if photo:
        user.profile_photo_url = photo


def athlete_display_name(user: User) -> str | None:
    parts = [user.strava_first_name, user.strava_last_name]
    name = " ".join(p for p in parts if p).strip()
    return name or None
