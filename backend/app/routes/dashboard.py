from datetime import date, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.analytics.snapshot import build_training_snapshot, get_load_risk_signals
from app.analytics.volume import recent_activities, weekly_run_km_chart
from app.auth import get_current_user
from app.db import get_db
from app.metric_glossary import METRIC_EXPLAINERS
from app.models import Activity, AthleteGoal, PlannedSession, TrainingPlan, User
from app.services.engagement import (
    match_sessions_to_activities,
    proactive_nudges,
    weekly_brief,
)
from app.services.strava_profile import athlete_display_name

router = APIRouter(prefix="/api", tags=["Dashboard"])


@router.get("/today")
def get_today(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    today = date.today()
    plan = (
        db.query(TrainingPlan)
        .filter(TrainingPlan.user_id == user.id, TrainingPlan.status == "ACTIVE")
        .first()
    )
    session = None
    if plan:
        match_sessions_to_activities(db, user, plan)
        session = (
            db.query(PlannedSession)
            .filter(PlannedSession.plan_id == plan.id, PlannedSession.scheduled_date == today)
            .first()
        )
    goal = (
        db.query(AthleteGoal)
        .filter(AthleteGoal.user_id == user.id, AthleteGoal.status == "ACTIVE")
        .first()
    )
    return {
        "date": today.isoformat(),
        "session": _session_dict(session) if session else None,
        "days_to_race": (goal.race_date - today).days if goal else None,
        "race_date": goal.race_date.isoformat() if goal else None,
        "event_type": goal.event_type if goal else None,
        "plan_phase": plan.phase if plan else None,
    }


@router.get("/plan/week")
def get_plan_week(
    offset: int = Query(0, description="Week offset from current week"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    plan = (
        db.query(TrainingPlan)
        .filter(TrainingPlan.user_id == user.id, TrainingPlan.status == "ACTIVE")
        .first()
    )
    if not plan:
        return {"week_start": None, "days": []}

    week_start = date.today() - timedelta(days=date.today().weekday()) + timedelta(weeks=offset)
    week_end = week_start + timedelta(days=6)
    match_sessions_to_activities(db, user, plan)

    sessions = (
        db.query(PlannedSession)
        .filter(
            PlannedSession.plan_id == plan.id,
            PlannedSession.scheduled_date >= week_start,
            PlannedSession.scheduled_date <= week_end,
        )
        .all()
    )
    activities = (
        db.query(Activity)
        .filter(
            Activity.user_id == user.id,
            Activity.start_date >= week_start,
            Activity.start_date < week_end + timedelta(days=1),
        )
        .all()
    )

    days = []
    for i in range(7):
        d = week_start + timedelta(days=i)
        day_sessions = [s for s in sessions if s.scheduled_date == d]
        day_acts = [a for a in activities if a.start_date.date() == d]
        days.append(
            {
                "date": d.isoformat(),
                "sessions": [_session_dict(s) for s in day_sessions],
                "activities": [
                    {
                        "id": str(a.id),
                        "name": a.name,
                        "sport_type": a.sport_type,
                        "distance_km": round(a.distance_meters / 1000, 2),
                    }
                    for a in day_acts
                ],
            }
        )

    return {
        "week_start": week_start.isoformat(),
        "week_end": week_end.isoformat(),
        "plan_id": str(plan.id),
        "race_date": plan.race_date.isoformat(),
        "phase": plan.phase,
        "days": days,
    }


@router.get("/brief/weekly")
def get_weekly_brief(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return weekly_brief(db, user)


@router.get("/training/snapshot")
def training_snapshot(
    window_days: int = Query(28, ge=7, le=365),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    snap = build_training_snapshot(db, user, window_days)
    snap["risk"] = get_load_risk_signals(snap)
    snap["metric_explainers"] = METRIC_EXPLAINERS
    return snap


@router.get("/nudges")
def get_nudges(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return {"nudges": proactive_nudges(db, user)}


@router.get("/dashboard")
def get_dashboard(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Single payload for the home dashboard."""
    today = get_today(user=user, db=db)
    snapshot = build_training_snapshot(db, user, 28)
    snapshot["risk"] = get_load_risk_signals(snapshot)
    snapshot["metric_explainers"] = METRIC_EXPLAINERS
    brief = weekly_brief(db, user)
    goal = (
        db.query(AthleteGoal)
        .filter(AthleteGoal.user_id == user.id, AthleteGoal.status == "ACTIVE")
        .first()
    )
    plan = (
        db.query(TrainingPlan)
        .filter(TrainingPlan.user_id == user.id, TrainingPlan.status == "ACTIVE")
        .first()
    )
    adherence = brief.get("adherence_pct")
    return {
        "athlete": {
            "email": user.email,
            "display_name": athlete_display_name(user),
            "profile_photo_url": user.profile_photo_url,
            "max_heart_rate": user.max_heart_rate,
            "resting_heart_rate": user.resting_heart_rate,
            "lthr": user.lthr,
            "strava_connected": bool(user.access_token),
            "last_sync_at": user.last_sync_at.isoformat() if user.last_sync_at else None,
        },
        "plan_week": get_plan_week(offset=0, user=user, db=db),
        "today": today,
        "goal": {
            "event_type": goal.event_type,
            "race_date": goal.race_date.isoformat(),
            "days_to_race": (goal.race_date - date.today()).days,
        }
        if goal
        else None,
        "plan": {
            "id": str(plan.id),
            "phase": plan.phase,
            "race_date": plan.race_date.isoformat(),
            "total_weeks": plan.total_weeks,
        }
        if plan
        else None,
        "metrics": snapshot,
        "weekly_volume_chart": weekly_run_km_chart(db, user, 8),
        "recent_activities": recent_activities(db, user, 10),
        "weekly_brief": brief,
        "adherence_pct": adherence,
        "nudges": proactive_nudges(db, user),
    }


@router.post("/sessions/{session_id}/status")
def update_session_status(
    session_id: str,
    status: str = Query(..., pattern="^(DONE|SKIPPED|PENDING)$"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = db.query(PlannedSession).filter(PlannedSession.id == session_id).first()
    if not session:
        return {"ok": False}
    plan = db.query(TrainingPlan).filter(TrainingPlan.id == session.plan_id).first()
    if not plan or plan.user_id != user.id:
        return {"ok": False}
    session.status = status
    db.commit()
    return {"ok": True, "session": _session_dict(session)}


def _session_dict(session: PlannedSession | None) -> dict | None:
    if not session:
        return None
    return {
        "id": str(session.id),
        "scheduled_date": session.scheduled_date.isoformat(),
        "session_type": session.session_type,
        "target_distance_km": session.target_distance_km,
        "target_hr_min": session.target_hr_min,
        "target_hr_max": session.target_hr_max,
        "status": session.status,
        "notes": session.notes,
    }
