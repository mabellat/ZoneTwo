from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.db import get_db
from app.models import TrainingPlan, User
from app.planning.adapt import adapt_plan

router = APIRouter(prefix="/api/plan", tags=["Plan"])


class AdaptRequest(BaseModel):
    intent: str


@router.post("/adapt")
def adapt_user_plan(
    body: AdaptRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    plan = (
        db.query(TrainingPlan)
        .filter(TrainingPlan.user_id == user.id, TrainingPlan.status == "ACTIVE")
        .first()
    )
    if not plan:
        return {"ok": False, "error": "no_active_plan"}
    return adapt_plan(db, plan, body.intent)


@router.get("/ics")
def export_ics(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    plan = (
        db.query(TrainingPlan)
        .filter(TrainingPlan.user_id == user.id, TrainingPlan.status == "ACTIVE")
        .first()
    )
    if not plan:
        return Response(content="No active plan", status_code=404)

    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Zone2Coach//EN",
    ]
    for session in plan.sessions:
        if session.session_type == "rest":
            continue
        start = datetime.combine(session.scheduled_date, datetime.min.time()) + timedelta(hours=7)
        end = start + timedelta(minutes=session.target_duration_minutes or 60)
        uid = f"{session.id}@zone2coach"
        summary = f"{session.session_type.title()} {session.target_distance_km or 0}km"
        lines.extend(
            [
                "BEGIN:VEVENT",
                f"UID:{uid}",
                f"DTSTART:{start.strftime('%Y%m%dT%H%M%S')}",
                f"DTEND:{end.strftime('%Y%m%dT%H%M%S')}",
                f"SUMMARY:{summary}",
                "END:VEVENT",
            ]
        )
    lines.append("END:VCALENDAR")
    body = "\r\n".join(lines)
    return Response(
        content=body,
        media_type="text/calendar",
        headers={"Content-Disposition": "attachment; filename=training_plan.ics"},
    )
