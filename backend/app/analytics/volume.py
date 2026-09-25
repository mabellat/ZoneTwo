from datetime import datetime, timedelta
from typing import Any

from sqlalchemy.orm import Session

from app.analytics.snapshot import RUN_TYPES, get_activities_in_window
from app.models import Activity, User


def weekly_run_km_chart(db: Session, user: User, weeks: int = 8) -> list[dict[str, Any]]:
    """Km per calendar week, oldest → newest (for charts)."""
    days = weeks * 7 + 7
    activities = get_activities_in_window(db, user.id, days)
    runs = [a for a in activities if a.sport_type in RUN_TYPES]

    today = datetime.utcnow().date()
    # Monday-start weeks
    start_of_this_week = today - timedelta(days=today.weekday())

    buckets: dict[str, float] = {}
    labels: dict[str, str] = {}
    for i in range(weeks):
        week_start = start_of_this_week - timedelta(weeks=(weeks - 1 - i))
        key = week_start.isoformat()
        buckets[key] = 0.0
        labels[key] = week_start.strftime("%b %d")

    for run in runs:
        d = run.start_date.date()
        week_start = d - timedelta(days=d.weekday())
        key = week_start.isoformat()
        if key in buckets:
            buckets[key] += run.distance_meters / 1000.0

    return [
        {"week_start": k, "label": labels[k], "km": round(buckets[k], 1)}
        for k in sorted(buckets.keys())
    ]


def recent_activities(db: Session, user: User, limit: int = 10) -> list[dict[str, Any]]:
    rows = (
        db.query(Activity)
        .filter(Activity.user_id == user.id)
        .order_by(Activity.start_date.desc())
        .limit(limit)
        .all()
    )
    out = []
    for a in rows:
        pace_min = None
        if a.distance_meters > 0 and a.moving_time_seconds > 0:
            pace_sec_per_km = a.moving_time_seconds / (a.distance_meters / 1000.0)
            pace_min = round(pace_sec_per_km / 60.0, 2)
        out.append(
            {
                "id": str(a.id),
                "name": a.name,
                "sport_type": a.sport_type,
                "date": a.start_date.isoformat(),
                "distance_km": round(a.distance_meters / 1000.0, 2),
                "duration_min": round(a.moving_time_seconds / 60.0),
                "avg_hr": a.average_heartrate,
                "pace_min_per_km": pace_min,
            }
        )
    return out
