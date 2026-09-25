from datetime import date, timedelta
from typing import Any

from sqlalchemy.orm import Session

from app.models import AthleteGoal, PlannedSession, TrainingPlan, User

MAX_WEEKLY_INCREASE = 0.10
PEAK_LONG_RUN_KM = 32.0


def _weeks_until(race_date: date, today: date) -> int:
    return max((race_date - today).days // 7, 1)


def _phase_for_week(week_index: int, total_weeks: int) -> str:
    if week_index >= total_weeks - 2:
        return "taper"
    if week_index >= total_weeks * 0.7:
        return "peak"
    if week_index >= total_weeks * 0.35:
        return "build"
    return "base"


def _session_templates(days_per_week: int) -> list[str]:
    if days_per_week <= 3:
        return ["easy", "tempo", "long"]
    if days_per_week == 4:
        return ["easy", "tempo", "easy", "long"]
    return ["easy", "intervals", "easy", "tempo", "easy", "long"][:days_per_week]


def create_marathon_plan(
    db: Session,
    user: User,
    goal: AthleteGoal,
    current_weekly_km: float,
    start_date: date | None = None,
) -> TrainingPlan:
    today = start_date or date.today()
    total_weeks = _weeks_until(goal.race_date, today)
    total_weeks = min(max(total_weeks, 8), 20)

    for plan in db.query(TrainingPlan).filter(
        TrainingPlan.user_id == user.id, TrainingPlan.status == "ACTIVE"
    ):
        plan.status = "ARCHIVED"

    plan = TrainingPlan(
        user_id=user.id,
        goal_id=goal.id,
        event_type=goal.event_type,
        race_date=goal.race_date,
        phase="base",
        status="ACTIVE",
        total_weeks=total_weeks,
    )
    db.add(plan)
    db.flush()

    weekly_km = max(current_weekly_km, 15.0)
    templates = _session_templates(goal.days_per_week)

    for week in range(total_weeks):
        phase = _phase_for_week(week, total_weeks)
        if phase == "taper":
            week_volume = weekly_km * (0.7 if week == total_weeks - 2 else 0.55)
        elif phase == "peak":
            week_volume = weekly_km * 1.05
        else:
            week_volume = weekly_km

        week_start = today + timedelta(weeks=week)
        long_fraction = 0.35 if phase != "taper" else 0.25
        long_km = min(week_volume * long_fraction, PEAK_LONG_RUN_KM)

        day_offsets = list(range(len(templates)))
        for i, session_type in enumerate(templates):
            session_date = week_start + timedelta(days=day_offsets[i])
            if session_date > goal.race_date:
                continue
            dist = None
            if session_type == "long":
                dist = round(long_km, 1)
            elif session_type == "rest":
                dist = 0
            elif session_type == "easy":
                dist = round((week_volume - long_km) / max(len(templates) - 1, 1) * 0.85, 1)
            else:
                dist = round((week_volume - long_km) / max(len(templates) - 1, 1) * 1.1, 1)

            hr_min, hr_max = _hr_targets(session_type, user.max_heart_rate, user.resting_heart_rate)
            db.add(
                PlannedSession(
                    plan_id=plan.id,
                    scheduled_date=session_date,
                    session_type=session_type,
                    target_distance_km=dist,
                    target_hr_min=hr_min,
                    target_hr_max=hr_max,
                    notes=f"{phase} week {week + 1}",
                    status="PENDING",
                )
            )

        if phase not in ("taper", "peak"):
            weekly_km = min(weekly_km * (1 + MAX_WEEKLY_INCREASE), 80.0)

    db.commit()
    db.refresh(plan)
    return plan


def _hr_targets(session_type: str, max_hr: int, resting_hr: int) -> tuple:
    reserve = max_hr - resting_hr
    if session_type == "easy" or session_type == "long":
        return int(resting_hr + reserve * 0.65), int(resting_hr + reserve * 0.75)
    if session_type == "tempo":
        return int(resting_hr + reserve * 0.78), int(resting_hr + reserve * 0.85)
    if session_type == "intervals":
        return int(resting_hr + reserve * 0.88), int(resting_hr + reserve * 0.95)
    return None, None


def plan_to_summary(plan: TrainingPlan) -> dict[str, Any]:
    return {
        "plan_id": str(plan.id),
        "event_type": plan.event_type,
        "race_date": plan.race_date.isoformat(),
        "phase": plan.phase,
        "total_weeks": plan.total_weeks,
        "session_count": len(plan.sessions),
    }
