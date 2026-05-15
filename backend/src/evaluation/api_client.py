from __future__ import annotations

import json
from dataclasses import dataclass, field

import httpx
from loguru import logger

from src.evaluation.config import eval_settings

_INTENT_TO_AGENT: dict[str, str] = {
    "app_guide": "guide_agent",
    "general": "guide_agent",
    "market_data": "data_agent",
    "market_analysis": "analysis_agent",
    "investment_advice": "advisor_agent",
}


@dataclass
class ChatResult:
    actual_agent: str
    tools_called: list[str] = field(default_factory=list)
    full_response: str = ""
    conversation_id: str | None = None
    is_blocked: bool = False
    error: str | None = None


async def login(email: str, password: str) -> str:
    """Login and return the access token."""
    url = f"{eval_settings.EVAL_BASE_URL}/auth/login"
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            url,
            data={"username": email, "password": password},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        if resp.status_code != 200:
            raise RuntimeError(
                f"Login failed ({resp.status_code}): {resp.text[:200]}"
            )
        data = resp.json()
        token = data.get("access_token")
        if not token:
            raise RuntimeError(f"Login response missing 'access_token': {data}")
        return token


async def chat(
    message: str,
    token: str,
    conversation_id: str | None = None,
) -> ChatResult:
    """
    Send a chat message to the backend SSE endpoint and collect the full response.

    Parses SSE events:
    - routing → maps intent to agent name
    - token   → accumulates full response text
    - done    → extracts tools_used and conversation_id
    - error   → records error message

    Returns ChatResult with is_blocked=True when HTTP 400 is returned (guardrails hit).
    """
    url = f"{eval_settings.EVAL_BASE_URL}/ai/chat"
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "text/event-stream",
        "Content-Type": "application/json",
    }
    payload: dict = {"message": message}
    if conversation_id:
        payload["conversation_id"] = conversation_id

    result = ChatResult(actual_agent="unknown")

    try:
        async with httpx.AsyncClient(timeout=120) as client:
            async with client.stream("POST", url, headers=headers, json=payload) as resp:
                if resp.status_code == 400:
                    # Guardrails blocked the request
                    body = await resp.aread()
                    try:
                        detail = json.loads(body).get("detail", "Blocked")
                    except Exception:
                        detail = body.decode(errors="replace")[:200]
                    result.is_blocked = True
                    result.actual_agent = "blocked"
                    result.full_response = f"BLOCKED (HTTP 400): {detail}"
                    return result

                if resp.status_code != 200:
                    body = await resp.aread()
                    result.error = f"HTTP {resp.status_code}: {body.decode(errors='replace')[:200]}"
                    return result

                # Parse SSE stream
                current_event: str | None = None
                async for line in resp.aiter_lines():
                    line = line.rstrip()
                    if line.startswith("event:"):
                        current_event = line[len("event:"):].strip()
                    elif line.startswith("data:"):
                        raw = line[len("data:"):].strip()
                        if not raw:
                            continue
                        try:
                            data = json.loads(raw)
                        except json.JSONDecodeError:
                            logger.warning(f"SSE non-JSON data: {raw[:100]}")
                            continue

                        if current_event == "routing":
                            intent = data.get("intent", "")
                            result.actual_agent = _INTENT_TO_AGENT.get(intent, intent)

                        elif current_event == "token":
                            result.full_response += data.get("text", "")

                        elif current_event == "done":
                            result.tools_called = data.get("tools_used", [])
                            result.conversation_id = data.get("conversation_id")

                        elif current_event == "error":
                            result.error = data.get("detail", "Unknown error")
                            logger.warning(f"SSE error event: {result.error}")

                    elif line == "":
                        current_event = None  # Reset after blank separator

    except httpx.TimeoutException:
        result.error = "Request timed out after 120s"
        logger.error(f"Timeout calling /ai/chat for message: {message[:80]!r}")
    except Exception as e:
        result.error = str(e)
        logger.exception(f"Unexpected error calling /ai/chat: {e}")

    return result
