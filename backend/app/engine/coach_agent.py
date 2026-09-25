"""LangGraph coach: model fallback chain, transient-error backoff, typed unavailability."""

import logging
import time
from collections.abc import AsyncIterator

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.prebuilt import create_react_agent

from app.config import get_settings
from app.engine.tools import get_coach_tools

logger = logging.getLogger(__name__)
settings = get_settings()

SAFETY_POLICY = """
Safety policy:
- You are not a doctor. No medical diagnosis. Refer injuries to professionals.
- Never invent metrics; only cite tool outputs.
- Refuse unsafe plans (e.g. marathon in under 8 weeks) unless user acknowledges risk via adapt tools.
- If ACWR or volume_spike flags appear, recommend recovery before intensity.
"""

SYSTEM_PROMPT = """You are an elite Zone 2 endurance coach (running focus, triathlon-aware).

Active athlete user_id: {user_id}
Email: {email}

Workflow:
1. Call get_training_snapshot to ground advice in real data.
2. If Strava not connected, call get_strava_auth_link and explain next steps.
3. For race goals, collect event_type, race_date, days_per_week then call create_race_plan (not free-form JSON).
4. For life changes, use adapt_training_plan with structured intents.
5. Use get_weekly_coach_brief for weekly summaries.

Always present plans in clear Markdown with week-by-week structure when a plan exists.
{context_block}
""" + SAFETY_POLICY

_agent_cache: dict[str, object] = {}


class CoachUnavailableError(Exception):
    """Gemini temporarily down or rate-limited; safe to retry."""


def _gemini_api_key() -> str:
    if not settings.gemini_api_key:
        raise CoachUnavailableError("GEMINI_API_KEY is not configured.")
    return settings.gemini_api_key


def _model_chain() -> list[str]:
    primary = (settings.gemini_model or "gemini-2.0-flash").strip()
    models: list[str] = []
    for name in [primary, *settings.gemini_fallback_models.split(",")]:
        name = name.strip()
        if name and name not in models:
            models.append(name)
    return models


def _get_agent(model: str):
    if model not in _agent_cache:
        llm = ChatGoogleGenerativeAI(
            model=model,
            google_api_key=_gemini_api_key(),
            temperature=0.3,
        )
        _agent_cache[model] = create_react_agent(llm, get_coach_tools())
    return _agent_cache[model]


def _is_transient_gemini_error(exc: BaseException) -> bool:
    text = str(exc).lower()
    return any(
        token in text
        for token in (
            "503",
            "unavailable",
            "429",
            "resource exhausted",
            "high demand",
            "overloaded",
        )
    )


def _format_context(context: dict | None) -> str:
    if not context:
        return ""
    return f"Chat context: {context}"


def _extract_text(content) -> str:
    if isinstance(content, list):
        text_parts = [
            part.get("text", "") if isinstance(part, dict) else str(part) for part in content
        ]
        return "".join(text_parts).strip()
    return str(content).strip()


def _invoke_agent(messages: list, model: str) -> str:
    agent = _get_agent(model)
    result = agent.invoke({"messages": messages})
    return _extract_text(result["messages"][-1].content)


def interact_with_coach(
    history_messages: list[dict[str, str]],
    user_input: str,
    user_id: str,
    email: str,
    context: dict | None = None,
) -> str:
    system_prompt = SYSTEM_PROMPT.format(
        user_id=user_id,
        email=email,
        context_block=_format_context(context),
    )
    messages = [SystemMessage(content=system_prompt)]
    for msg in history_messages:
        if msg["role"] == "user":
            messages.append(HumanMessage(content=msg["content"]))
        elif msg["role"] == "assistant":
            messages.append(AIMessage(content=msg["content"]))
    messages.append(HumanMessage(content=user_input))

    models = _model_chain()
    last_error: Exception | None = None

    for model in models:
        for attempt in range(3):
            try:
                logger.info("Coach invoke model=%s attempt=%s", model, attempt + 1)
                return _invoke_agent(messages, model)
            except Exception as exc:
                last_error = exc
                if not _is_transient_gemini_error(exc):
                    logger.exception("Coach non-retryable error model=%s", model)
                    raise CoachUnavailableError(
                        "The coaching engine returned an error. Check your API key and model name."
                    ) from exc
                wait = 2 ** attempt
                logger.warning(
                    "Gemini transient error model=%s attempt=%s: %s",
                    model,
                    attempt + 1,
                    exc,
                )
                time.sleep(wait)
        logger.warning("Switching Gemini model after failures on %s", model)

    raise CoachUnavailableError(
        "The coaching engine is temporarily unavailable. Wait a minute and try again."
    ) from last_error


async def stream_coach_response(
    history_messages: list[dict[str, str]],
    user_input: str,
    user_id: str,
    email: str,
    context: dict | None = None,
) -> AsyncIterator[str]:
    yield "event: status\ndata: Analyzing your training data...\n\n"
    response = interact_with_coach(history_messages, user_input, user_id, email, context)
    yield f"event: token\ndata: {response}\n\n"
    yield "event: done\ndata: [DONE]\n\n"
