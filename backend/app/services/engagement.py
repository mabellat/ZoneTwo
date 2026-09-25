from datetime import date, datetime, timedelta
from typing import Any

from sqlalchemy.orm import Session

from app.analytics.snapshot import build_training_snapshot, get_load_risk_signals
from app.models import Activity, AthleteGoal, TrainingPlan, User

RUN_TYPES = {"Run", "TrailRun", "VirtualRun"}


def match_sessions_to_activities(db: Session, user: User, plan: TrainingPlan) -> int:
    """Link completed Strava runs to planned sessions on the same day."""
    activities = (
        db.query(Activity)
        .filter(Activity.user_id == user.id, Activity.sport_type.in_(RUN_TYPES))
        .all()
    )
    by_date: dict[date, Activity] = {}
    for act in activities:
        d = act.start_date.date()
        if d not in by_date or act.distance_meters > by_date[d].distance_meters:
            by_date[d] = act

    matched = 0
    for session in plan.sessions:
        if session.status in ("DONE", "SKIPPED"):
            continue
        act = by_date.get(session.scheduled_date)
        if not act:
            continue
        if session.session_type == "rest":
            session.status = "DONE"
        elif session.target_distance_km and act.distance_meters / 1000 >= session.target_distance_km * 0.8:
            session.status = "DONE"
            session.matched_activity_id = act.id
            matched += 1
        elif act.distance_meters > 0:
            session.status = "PARTIAL"
            session.matched_activity_id = act.id
    db.commit()
    return matched


def weekly_brief(db: Session, user: User) -> dict[str, Any]:
    snapshot = build_training_snapshot(db, user, 7)
    risk = get_load_risk_signals(build_training_snapshot(db, user, 28))
    plan = (
        db.query(TrainingPlan)
        .filter(TrainingPlan.user_id == user.id, TrainingPlan.status == "ACTIVE")
        .first()
    )
    goal = (
        db.query(AthleteGoal)
        .filter(AthleteGoal.user_id == user.id, AthleteGoal.status == "ACTIVE")
        .first()
    )

    planned_km = 0.0
    completed = 0
    total_sessions = 0
    if plan:
        week_start = date.today() - timedelta(days=date.today().weekday())
        week_end = week_start + timedelta(days=6)
        week_sessions = [
            s for s in plan.sessions if week_start <= s.scheduled_date <= week_end
        ]
        total_sessions = len(week_sessions)
        for s in week_sessions:
            planned_km += s.target_distance_km or 0
            if s.status == "DONE":
                completed += 1

    days_to_race = None
    if goal:
        days_to_race = (goal.race_date - date.today()).days

    run_n = snapshot["run_count"]
    act_word = "activity" if run_n == 1 else "activities"
    lines = [
        f"Past 7 days: {snapshot['total_run_km']} km across {run_n} {act_word}.",
        f"Longest session: {snapshot['longest_run_km']} km.",
    ]
    if plan and total_sessions:
        adherence = round(completed / total_sessions * 100) if total_sessions else 0
        lines.append(f"This week: {completed}/{total_sessions} sessions done ({adherence}% adherence).")
    if risk["flags"]:
        lines.append(f"Load signals: {', '.join(risk['flags'])}.")
    if days_to_race is not None:
        lines.append(f"Race in {days_to_race} days.")

    return {
        "summary": " ".join(lines),
        "snapshot_7d": snapshot,
        "risk": risk,
        "days_to_race": days_to_race,
        "adherence_pct": round(completed / total_sessions * 100) if total_sessions else None,
    }


def proactive_nudges(db: Session, user: User) -> list[dict[str, str]]:
    nudges: list[dict[str, str]] = []
    if user.last_sync_at and (datetime.utcnow() - user.last_sync_at).days >= 7:
        nudges.append({"type": "stale_sync", "message": "No Strava sync in 7+ days. Reconnect or sync now."})

    snapshot = build_training_snapshot(db, user, 28)
    risk = get_load_risk_signals(snapshot)
    if "volume_spike" in risk["flags"]:
        nudges.append({"type": "volume_spike", "message": "Weekly load jumped >15%. Consider an extra easy day."})
    if "acwr_elevated" in risk["flags"]:
        nudges.append({"type": "acwr", "message": "Training stress ratio is elevated. Prioritize recovery."})

    goal = (
        db.query(AthleteGoal)
        .filter(AthleteGoal.user_id == user.id, AthleteGoal.status == "ACTIVE")
        .first()
    )
    if goal and 0 < (goal.race_date - date.today()).days <= 14:
        if snapshot["longest_run_km"] < 16:
            nudges.append({
                "type": "long_run",
                "message": "Race in 2 weeks but no long run over 16 km recently.",
            })
    return nudges
