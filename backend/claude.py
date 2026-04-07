"""
Handles all communication with the Anthropic Claude API.
The API key lives here in the backend — the frontend never touches it.
"""

import json
import os
import re
from typing import AsyncIterator

import httpx

from context import SYSTEM_PROMPT, build_client_context

CLAUDE_API_URL = "https://api.anthropic.com/v1/messages"
MODEL = "claude-sonnet-4-6"
MAX_TOKENS = 16384
MAX_OLD_CHARS = 1200


def _strip_artifacts(text: str) -> str:
    cleaned = re.sub(r"<artifact\b[^>]*>[\s\S]*?</artifact>", "[artifact omitted]", text)
    cleaned = re.sub(r'\{"sourceAssets":\s*\[[\s\S]{200,}\}', "[presentation data omitted]", cleaned)
    cleaned = re.sub(
        r"\[CASHFLOW SPREADSHEET:.*?\][\s\S]*?\[END SPREADSHEET\]",
        "[cashflow spreadsheet data omitted]",
        cleaned,
    )
    return cleaned


def _build_messages(
    user_message: str,
    history: list[dict],
    client: dict,
    documents: list[dict] | None,
) -> list[dict]:
    client_context = build_client_context(client)

    # Trim history: strip and truncate older assistant messages
    recent_history = history[-20:]
    trimmed = []
    for i, msg in enumerate(recent_history):
        if msg["role"] != "assistant":
            trimmed.append({"role": msg["role"], "content": msg["content"]})
            continue
        is_recent = i >= len(recent_history) - 4
        stripped = _strip_artifacts(msg["content"])
        content = stripped if is_recent else (
            stripped[:MAX_OLD_CHARS] + "\n[…response truncated]"
            if len(stripped) > MAX_OLD_CHARS else stripped
        )
        trimmed.append({"role": "assistant", "content": content})

    # Build current user message content (with optional document blocks)
    if documents:
        parts: list[dict] = []
        for doc in documents:
            parts.append({
                "type": "document",
                "source": {
                    "type": "base64",
                    "media_type": doc["mediaType"],
                    "data": doc["base64"],
                },
            })
        parts.append({"type": "text", "text": user_message})
        current_content: str | list = parts
    else:
        current_content = user_message

    messages = trimmed + [{"role": "user", "content": current_content}]

    # Prepend client context to the first user message
    if messages:
        first = messages[0]
        if isinstance(first["content"], str):
            first["content"] = f"{client_context}\n\n{first['content']}"
        else:
            for part in first["content"]:
                if part.get("type") == "text":
                    part["text"] = f"{client_context}\n\n{part['text']}"
                    break

    return messages


async def stream_chat(
    user_message: str,
    history: list[dict],
    client: dict,
    documents: list[dict] | None = None,
) -> AsyncIterator[str]:
    """Async generator that yields text chunks from Claude."""
    api_key = os.environ["ANTHROPIC_API_KEY"]
    messages = _build_messages(user_message, history, client, documents)

    beta_headers = ["prompt-caching-2024-07-31", "output-128k-2025-02-19"]
    if documents:
        beta_headers.append("pdfs-2024-09-25")

    payload = {
        "model": MODEL,
        "max_tokens": MAX_TOKENS,
        "stream": True,
        "system": [{"type": "text", "text": SYSTEM_PROMPT, "cache_control": {"type": "ephemeral"}}],
        "messages": messages,
    }

    headers = {
        "Content-Type": "application/json",
        "x-api-key": api_key,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": ",".join(beta_headers),
    }

    async with httpx.AsyncClient(timeout=300.0) as client_http:
        async with client_http.stream("POST", CLAUDE_API_URL, json=payload, headers=headers) as response:
            if response.status_code != 200:
                body = await response.aread()
                try:
                    err = json.loads(body).get("error", {}).get("message", f"HTTP {response.status_code}")
                except Exception:
                    err = f"HTTP {response.status_code}"
                raise RuntimeError(err)

            buffer = ""
            async for raw_chunk in response.aiter_text():
                buffer += raw_chunk
                lines = buffer.split("\n")
                buffer = lines.pop()

                for line in lines:
                    if not line.startswith("data: "):
                        continue
                    data = line[6:].strip()
                    if data == "[DONE]":
                        continue
                    try:
                        event = json.loads(data)
                        if (
                            event.get("type") == "content_block_delta"
                            and event.get("delta", {}).get("type") == "text_delta"
                        ):
                            yield event["delta"]["text"]
                        elif event.get("type") == "error":
                            raise RuntimeError(event.get("error", {}).get("message", "Stream error"))
                    except json.JSONDecodeError:
                        pass
