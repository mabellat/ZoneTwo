import json
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response, StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.db import SessionLocal, get_db
from app.engine.coach_agent import (
    CoachUnavailableError,
    interact_with_coach,
    stream_coach_response,
)
from app.models import ChatMessage, ChatThread, User
from app.pagination import paginate_query
from app.services.chat_titles import derive_thread_title

router = APIRouter(prefix="/api/chat", tags=["Chat & Threads"])


class CreateThreadRequest(BaseModel):
    title: str | None = "New chat"
    context: dict | None = None


class SendMessageRequest(BaseModel):
    thread_id: str
    user_input: str
    context: dict | None = None


def _assert_thread_owner(thread: ChatThread, user: User) -> None:
    if thread.user_id != user.id:
        raise HTTPException(status_code=404, detail="Thread not found")


@router.post("/threads")
def create_thread(
    req: CreateThreadRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    thread = ChatThread(
        user_id=user.id,
        user_email=user.email,
        title=req.title,
        context_json=req.context or {},
    )
    db.add(thread)
    db.commit()
    db.refresh(thread)
    return {"thread_id": str(thread.id), "title": thread.title, "created_at": thread.created_at}


@router.get("/threads")
def list_threads(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    base = (
        db.query(ChatThread)
        .filter(ChatThread.user_id == user.id)
        .order_by(ChatThread.updated_at.desc())
    )
    rows, meta = paginate_query(base, page, page_size)
    return {
        "threads": [
            {"id": str(t.id), "title": t.title, "updated_at": t.updated_at} for t in rows
        ],
        **meta,
    }


@router.delete("/threads/{thread_id}")
def delete_thread(
    thread_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    thread = db.query(ChatThread).filter(ChatThread.id == uuid.UUID(thread_id)).first()
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    _assert_thread_owner(thread, user)
    db.delete(thread)
    db.commit()
    return {"ok": True}


@router.get("/threads/{thread_id}/messages")
def get_thread_messages(
    thread_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    thread = db.query(ChatThread).filter(ChatThread.id == uuid.UUID(thread_id)).first()
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    _assert_thread_owner(thread, user)
    base = (
        db.query(ChatMessage)
        .filter(ChatMessage.thread_id == thread.id)
        .order_by(ChatMessage.created_at.asc())
    )
    rows, meta = paginate_query(base, page, page_size)
    return {
        "messages": [
            {"id": str(m.id), "role": m.role, "content": m.content, "created_at": m.created_at}
            for m in rows
        ],
        **meta,
    }


@router.post("/message")
def send_message(
    req: SendMessageRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    thread = db.query(ChatThread).filter(ChatThread.id == uuid.UUID(req.thread_id)).first()
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    _assert_thread_owner(thread, user)

    existing_messages = (
        db.query(ChatMessage)
        .filter(ChatMessage.thread_id == thread.id)
        .order_by(ChatMessage.created_at.asc())
        .all()
    )
    history = [{"role": m.role, "content": m.content} for m in existing_messages]

    user_msg = ChatMessage(thread_id=thread.id, role="user", content=req.user_input)
    db.add(user_msg)
    db.commit()

    if len(existing_messages) == 0:
        thread.title = derive_thread_title(req.user_input)

    context = {**(thread.context_json or {}), **(req.context or {})}
    try:
        bot_response = interact_with_coach(
            history_messages=history,
            user_input=req.user_input,
            user_id=str(user.id),
            email=user.email,
            context=context,
        )
    except CoachUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    assistant_msg = ChatMessage(thread_id=thread.id, role="assistant", content=bot_response)
    db.add(assistant_msg)
    db.commit()
    return {"response": bot_response}


@router.post("/message/stream")
async def send_message_stream(
    req: SendMessageRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    thread = db.query(ChatThread).filter(ChatThread.id == uuid.UUID(req.thread_id)).first()
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    _assert_thread_owner(thread, user)

    existing_messages = (
        db.query(ChatMessage)
        .filter(ChatMessage.thread_id == thread.id)
        .order_by(ChatMessage.created_at.asc())
        .all()
    )
    history = [{"role": m.role, "content": m.content} for m in existing_messages]
    user_msg = ChatMessage(thread_id=thread.id, role="user", content=req.user_input)
    db.add(user_msg)
    db.commit()

    context = {**(thread.context_json or {}), **(req.context or {})}

    async def event_generator():
        full = ""
        async for chunk in stream_coach_response(
            history, req.user_input, str(user.id), user.email, context
        ):
            if chunk.startswith("event: token"):
                full = chunk.split("data: ", 1)[-1].strip()
            yield chunk
        if full:
            save_db = SessionLocal()
            try:
                save_db.add(
                    ChatMessage(thread_id=thread.id, role="assistant", content=full)
                )
                save_db.commit()
            finally:
                save_db.close()

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@router.get("/export/{thread_id}")
def export_plan(
    thread_id: str,
    format: str = "json",
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    thread = db.query(ChatThread).filter(ChatThread.id == uuid.UUID(thread_id)).first()
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    _assert_thread_owner(thread, user)
    messages = (
        db.query(ChatMessage)
        .filter(ChatMessage.thread_id == thread.id)
        .order_by(ChatMessage.created_at.asc())
        .all()
    )

    if format == "markdown":
        content = "# Training Plan Export\n\n"
        for m in messages:
            content += f"### {m.role.capitalize()}\n{m.content}\n\n---\n\n"
        return Response(
            content=content,
            media_type="text/markdown",
            headers={"Content-Disposition": f"attachment; filename=plan_{thread_id}.md"},
        )

    data = [{"role": m.role, "content": m.content} for m in messages]
    return Response(
        content=json.dumps(data, indent=2),
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename=plan_{thread_id}.json"},
    )
