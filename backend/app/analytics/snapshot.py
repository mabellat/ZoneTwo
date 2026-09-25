from datetime import datetime, timedelta
from typing import Any

from sqlalchemy.orm import Session

from app.analytics.load import compute_acwr, weekly_load_series
from app.analytics.zones import hr_zone_distribution
from app.models import Activity, User

RUN_TYPES = {"Run", "TrailRun", "VirtualRun"}


def _filter_activities(
    activities: list[Activity],
    sport_types: set | None = None,
) -> list[Activity]:
    if not sport_types:
        return activities
    return [a for a in activities if a.sport_type in sport_types]


def get_activities_in_window(db: Session, user_id, days: int) -> list[Activity]:
    since = datetime.utcnow() - timedelta(days=days)
    return (
        db.query(Activity)
        .filter(Activity.user_id == user_id, Activity.start_date >= since)
        .order_by(Activity.start_date.desc())
        .all()
    )


def build_training_snapshot(db: Session, user: User, window_days: int = 28) -> dict[str, Any]:
    activities = get_activities_in_window(db, user.id, window_days)
    runs = _filter_activities(activities, RUN_TYPES)

    total_km = sum(a.distance_meters for a in runs) / 1000.0
    weeks = max(window_days / 7.0, 1)
    weekly_avg_km = round(total_km / weeks, 1)

    longest_run_km = 0.0
    if runs:
        longest_run_km = round(max(a.distance_meters for a in runs) / 1000.0, 1)

    hr_activities = [a for a in runs if a.average_heartrate]
    hr_coverage = round(len(hr_activities) / len(runs) * 100, 1) if runs else 0.0

    zone_dist = hr_zone_distribution(runs, user.max_heart_rate, user.resting_heart_rate)
    load_series = weekly_load_series(runs)
    acwr = compute_acwr(load_series)

    sport_breakdown: dict[str, float] = {}
    for a in activities:
        sport_breakdown[a.sport_type] = sport_breakdown.get(a.sport_type, 0) + a.distance_meters / 1000.0

    return {
        "window_days": window_days,
        "activity_count": len(activities),
        "run_count": len(runs),
        "total_run_km": round(total_km, 1),
        "avg_weekly_run_km": weekly_avg_km,
        "longest_run_km": longest_run_km,
        "data_quality": {
            "hr_coverage_pct": hr_coverage,
            "has_recent_runs": len(runs) > 0,
        },
        "zone_distribution_pct": zone_dist,
        "weekly_load": load_series,
        "acwr": acwr,
        "sport_breakdown_km": {k: round(v, 1) for k, v in sport_breakdown.items()},
        "strava_connected": bool(user.access_token),
        "last_sync_at": user.last_sync_at.isoformat() if user.last_sync_at else None,
    }


def get_load_risk_signals(snapshot: dict[str, Any]) -> dict[str, Any]:
    flags: list[str] = []
    acwr = snapshot.get("acwr") or {}
    ratio = acwr.get("ratio")
    if ratio is not None and ratio > 1.5:
        flags.append("acwr_elevated")
    weekly = snapshot.get("weekly_load") or []
    if len(weekly) >= 2:
        prev, curr = weekly[-2], weekly[-1]
        if prev > 0 and (curr - prev) / prev > 0.15:
            flags.append("volume_spike")
    if not snapshot.get("data_quality", {}).get("has_recent_runs"):
        flags.append("no_recent_runs")
    return {"flags": flags, "acwr": acwr, "severity": "high" if flags else "low"}
