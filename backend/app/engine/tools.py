import uuid
from datetime import date
from typing import Any

from langchain_core.tools import tool
from pydantic import BaseModel, Field

from app.analytics.snapshot import build_training_snapshot, get_load_risk_signals
from app.config import get_settings
from app.db import SessionLocal
from app.models import AthleteGoal, TrainingPlan, User
from app.planning.adapt import adapt_plan
from app.planning.marathon import create_marathon_plan, plan_to_summary
from app.services.engagement import weekly_brief

settings = get_settings()


class CreatePlanInput(BaseModel):
    user_id: str = Field(description="UUID of the athlete")
    event_type: str = Field(description="e.g. marathon, half_marathon")
    race_date: str = Field(description="ISO date YYYY-MM-DD")
    days_per_week: int = Field(default=4, ge=2, le=6)
    target_time: str | None = Field(default=None, description="Optional goal time HH:MM:SS")


@tool
def get_strava_auth_link(user_id: str) -> str:
    """Return Strava OAuth URL with signed state for this user."""
    from app.auth import sign_oauth_state

    state = sign_oauth_state(uuid.UUID(user_id))
    return (
        f"https://www.strava.com/oauth/authorize?"
        f"client_id={settings.strava_client_id}&"
        f"response_type=code&"
        f"redirect_uri={settings.strava_redirect_uri}&"
        f"approval_prompt=force&"
        f"scope=read,activity:read_all&"
        f"state={state}"
    )


@tool
def get_training_snapshot(user_id: str, window_days: int = 28) -> dict[str, Any]:
    """Return grounded training metrics from the database."""
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == uuid.UUID(user_id)).first()
        if not user:
            return {"error": "user_not_found"}
        snap = build_training_snapshot(db, user, window_days)
        snap["risk"] = get_load_risk_signals(snap)
        return snap
    finally:
        db.close()


@tool
def get_weekly_coach_brief(user_id: str) -> dict[str, Any]:
    """Template-generated weekly summary for the athlete."""
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == uuid.UUID(user_id)).first()
        if not user:
            return {"error": "user_not_found"}
        return weekly_brief(db, user)
    finally:
        db.close()


@tool
def create_race_plan(
    user_id: str,
    event_type: str,
    race_date: str,
    days_per_week: int = 4,
) -> dict[str, Any]:
    """Create a deterministic marathon-style plan stored in the database."""
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == uuid.UUID(user_id)).first()
        if not user:
            return {"ok": False, "error": "user_not_found"}
        parsed_date = date.fromisoformat(race_date)
        if parsed_date <= date.today():
            return {"ok": False, "error": "race_date_must_be_future"}

        for g in db.query(AthleteGoal).filter(AthleteGoal.user_id == user.id, AthleteGoal.status == "ACTIVE"):
            g.status = "ARCHIVED"

        goal = AthleteGoal(
            user_id=user.id,
            event_type=event_type,
            race_date=parsed_date,
            days_per_week=days_per_week,
            status="ACTIVE",
        )
        db.add(goal)
        db.flush()

        snapshot = build_training_snapshot(db, user, 28)
        current_km = snapshot.get("avg_weekly_run_km") or 20.0
        weeks_out = (parsed_date - date.today()).days // 7
        if event_type == "marathon" and weeks_out < 12:
            return {
                "ok": False,
                "error": "compressed_timeline",
                "message": "Marathon prep under 12 weeks is high risk. Offer half or extend date.",
            }

        plan = create_marathon_plan(db, user, goal, float(current_km))
        user.onboarding_complete = True
        db.commit()
        return {"ok": True, "plan": plan_to_summary(plan), "baseline_weekly_km": current_km}
    except Exception as exc:
        db.rollback()
        return {"ok": False, "error": str(exc)}
    finally:
        db.close()


@tool
def adapt_training_plan(user_id: str, intent: str) -> dict[str, Any]:
    """Adapt active plan: injured, travel_week, move_long_run, race_moved_2_weeks, missed_week."""
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == uuid.UUID(user_id)).first()
        if not user:
            return {"ok": False, "error": "user_not_found"}
        plan = (
            db.query(TrainingPlan)
            .filter(TrainingPlan.user_id == user.id, TrainingPlan.status == "ACTIVE")
            .first()
        )
        if not plan:
            return {"ok": False, "error": "no_active_plan"}
        return adapt_plan(db, plan, intent)
    finally:
        db.close()


def get_coach_tools():
    return [
        get_strava_auth_link,
        get_training_snapshot,
        get_weekly_coach_brief,
        create_race_plan,
        adapt_training_plan,
    ]
