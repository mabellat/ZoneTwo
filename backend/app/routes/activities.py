import uuid
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.analytics.zones import activity_hr_zone_fields
from app.auth import get_current_user
from app.db import get_db
from app.models import Activity, User
from app.pagination import paginate_query

router = APIRouter(prefix="/api", tags=["Activities"])


@router.get("/activities")
def list_activities(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    base = (
        db.query(Activity)
        .filter(Activity.user_id == user.id)
        .order_by(Activity.start_date.desc())
    )
    rows, meta = paginate_query(base, page, page_size)
    return {
        "activities": [_activity_summary(a) for a in rows],
        **meta,
    }


@router.get("/activities/training-log")
def training_log(
    days: int = Query(28, ge=7, le=90),
    page: int = Query(1, ge=1),
    page_size: int = Query(8, ge=1, le=50),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Activities in a rolling window with HR zone classification per session."""
    since = datetime.utcnow() - timedelta(days=days)
    filters = (Activity.user_id == user.id, Activity.start_date >= since)

    total_count = db.query(func.count(Activity.id)).filter(*filters).scalar() or 0
    total_km_raw = (
        db.query(func.coalesce(func.sum(Activity.distance_meters), 0)).filter(*filters).scalar() or 0
    )
    with_hr_count = (
        db.query(func.count(Activity.id))
        .filter(*filters, Activity.average_heartrate.isnot(None))
        .scalar()
        or 0
    )

    base = db.query(Activity).filter(*filters).order_by(Activity.start_date.desc())
    rows, meta = paginate_query(base, page, page_size)

    items = []
    for a in rows:
        z_key, z_label, z_num = activity_hr_zone_fields(
            a, user.max_heart_rate, user.resting_heart_rate
        )
        items.append(
            {
                **_activity_summary(a),
                "moving_time_seconds": a.moving_time_seconds,
                "max_heartrate": a.max_heartrate,
                "elevation_gain_m": a.elevation_gain,
                "hr_zone": z_key,
                "hr_zone_label": z_label,
                "hr_zone_number": z_num,
            }
        )

    return {
        "window_days": days,
        "activity_count": int(total_count),
        "total_km": round(float(total_km_raw) / 1000.0, 1),
        "with_hr_count": int(with_hr_count),
        "activities": items,
        **meta,
    }


@router.get("/activities/{activity_id}")
def get_activity(
    activity_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    activity = (
        db.query(Activity)
        .filter(Activity.id == activity_id, Activity.user_id == user.id)
        .first()
    )
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    return _activity_detail(activity)


def _pace_min_per_km(a: Activity) -> float | None:
    if a.distance_meters <= 0 or a.moving_time_seconds <= 0:
        return None
    pace_sec = a.moving_time_seconds / (a.distance_meters / 1000.0)
    return round(pace_sec / 60.0, 2)


def _activity_summary(a: Activity) -> dict:
    return {
        "id": str(a.id),
        "name": a.name,
        "sport_type": a.sport_type,
        "date": a.start_date.isoformat(),
        "distance_km": round(a.distance_meters / 1000.0, 2),
        "duration_min": round(a.moving_time_seconds / 60.0),
        "avg_hr": a.average_heartrate,
        "pace_min_per_km": _pace_min_per_km(a),
    }


def _activity_detail(a: Activity) -> dict:
    summary = _activity_summary(a)
    summary.update(
        {
            "strava_activity_id": a.strava_activity_id,
            "strava_url": f"https://www.strava.com/activities/{a.strava_activity_id}",
            "moving_time_seconds": a.moving_time_seconds,
            "elevation_gain_m": a.elevation_gain,
            "max_heartrate": a.max_heartrate,
            "average_watts": a.average_watts,
        }
    )
    return summary
