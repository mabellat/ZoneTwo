from datetime import datetime
from typing import Any

from app.models import Activity


def session_load(activity: Activity) -> float:
    """Simple TRIMP proxy: duration minutes weighted by avg HR if present."""
    minutes = activity.moving_time_seconds / 60.0
    if activity.average_heartrate:
        return minutes * (activity.average_heartrate / 100.0)
    return minutes


def weekly_load_series(activities: list[Activity], weeks: int = 8) -> list[float]:
    if not activities:
        return [0.0] * weeks
    now = datetime.utcnow()
    buckets = [0.0] * weeks
    for act in activities:
        age_days = (now - act.start_date).days
        week_idx = age_days // 7
        if 0 <= week_idx < weeks:
            buckets[weeks - 1 - week_idx] += session_load(act)
    return [round(x, 1) for x in buckets]


def compute_acwr(weekly_load: list[float]) -> dict[str, Any]:
    if len(weekly_load) < 2:
        return {"acute": None, "chronic": None, "ratio": None}
    acute = weekly_load[-1]
    chronic_window = weekly_load[-4:] if len(weekly_load) >= 4 else weekly_load
    chronic = sum(chronic_window) / len(chronic_window)
    ratio = round(acute / chronic, 2) if chronic > 0 else None
    return {"acute": round(acute, 1), "chronic": round(chronic, 1), "ratio": ratio}
