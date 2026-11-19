"""Backend-only DeepSeek generation; routing and embeddings stay local."""
import asyncio
import logging
import os
import time

import httpx

MODEL = "deepseek-flash"
CHAT_COMPLETIONS_URL = "https://api.deepseek.com/chat/completions"
MAX_TOKENS = 768
DEADLINE_SECONDS = 45
HTTP_TIMEOUT = httpx.Timeout(30, connect=5)
ROLES = {"system": "system", "human": "user", "ai": "assistant"}

logger = logging.getLogger(__name__)


class GenerationError(RuntimeError):
    """Only sanitized, application-owned categories are safe to log."""


async def _complete(messages: list, api_key: str) -> str:
    started = time.monotonic()
    try:
        # Read timeouts alone reset when the provider sends keep-alive whitespace.
        async with asyncio.timeout(DEADLINE_SECONDS), httpx.AsyncClient(
            timeout=HTTP_TIMEOUT, trust_env=False,
        ) as client:
            response = await client.post(
                CHAT_COMPLETIONS_URL,
                headers={"Authorization": f"Bearer {api_key}"},
                json={
                    "model": MODEL,
                    "messages": [{"role": ROLES[m.type], "content": m.content} for m in messages],
                    "stream": False,
                    "thinking": {"type": "disabled"},
                    "safety_check": {"level": "high"},
                    "max_tokens": MAX_TOKENS,
                },
            )
    except (TimeoutError, httpx.TimeoutException):
        raise GenerationError("timeout") from None
    except httpx.HTTPError:
        raise GenerationError("transport_error") from None

    if response.status_code != 200:
        raise GenerationError(f"upstream_http_{response.status_code}")

    try:
        payload = response.json()
        choice = payload["choices"][0]
        finish_reason = choice["finish_reason"]
        content = choice["message"]["content"]
    except (ValueError, TypeError, KeyError, IndexError):
        raise GenerationError("invalid_response") from None

    if finish_reason == "content_filter":
        raise GenerationError("content_filter")
    if finish_reason != "stop" or not isinstance(content, str) or not content.strip():
        raise GenerationError("incomplete_response")

    usage = payload.get("usage")
    usage = usage if isinstance(usage, dict) else {}
    tokens = [usage.get(key) for key in ("prompt_tokens", "completion_tokens")]
    logger.info("deepseek completed in %.2fs (prompt_tokens=%s, completion_tokens=%s)",
                time.monotonic() - started,
                *(value if type(value) is int else None for value in tokens))
    return content


def generate(messages: list) -> str:
    if os.getenv("DEEPSEEK_ALLOW_CHAT_EGRESS") != "1":
        raise GenerationError("egress_disabled")
    api_key = os.getenv("DEEPSEEK_API_KEY", "").strip()
    if not api_key:
        raise GenerationError("missing_api_key")
    # Both FastAPI chat handlers call this synchronously from worker threads.
    return asyncio.run(_complete(messages, api_key))
