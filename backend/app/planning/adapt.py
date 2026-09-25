from datetime import date, timedelta

from sqlalchemy.orm import Session

from app.models import PlannedSession, TrainingPlan


def adapt_plan(db: Session, plan: TrainingPlan, intent: str) -> dict[str, object]:
    today = date.today()
    pending = (
        db.query(PlannedSession)
        .filter(
            PlannedSession.plan_id == plan.id,
            PlannedSession.scheduled_date >= today,
            PlannedSession.status == "PENDING",
        )
        .order_by(PlannedSession.scheduled_date)
        .all()
    )
    if not pending:
        return {"ok": False, "message": "No upcoming sessions to adapt."}

    changed = 0
    if intent == "injured":
        for s in pending[:7]:
            if s.session_type in ("intervals", "tempo"):
                s.session_type = "rest"
                s.target_distance_km = 0
                s.notes = (s.notes or "") + " | Reduced due to injury"
                changed += 1
    elif intent == "travel_week":
        for s in pending[:5]:
            if s.session_type == "long":
                s.target_distance_km = round((s.target_distance_km or 10) * 0.6, 1)
                s.notes = (s.notes or "") + " | Travel week reduction"
                changed += 1
    elif intent == "move_long_run":
        longs = [s for s in pending if s.session_type == "long"]
        if longs:
            session = longs[0]
            session.scheduled_date = session.scheduled_date + timedelta(days=1)
            session.notes = (session.notes or "") + " | Long run moved"
            changed += 1
    elif intent == "race_moved_2_weeks":
        plan.race_date = plan.race_date + timedelta(days=14)
        for s in pending:
            s.scheduled_date = s.scheduled_date + timedelta(days=14)
            changed += 1
    elif intent == "missed_week":
        for s in pending[:5]:
            if s.target_distance_km:
                s.target_distance_km = round(s.target_distance_km * 0.85, 1)
                s.notes = (s.notes or "") + " | Missed week adjustment"
                changed += 1
    else:
        return {"ok": False, "message": f"Unknown intent: {intent}"}

    db.commit()
    return {"ok": True, "sessions_changed": changed, "intent": intent}
