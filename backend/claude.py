"""
Handles all communication with the Anthropic Claude API.
The API key lives here in the backend — the frontend never touches it.

stream_chat has been replaced by agentic_chat, which supports the full
tool-use loop: Claude can call read tools automatically and request
confirmation for write tools before they execute.
"""

import json
import os
import re
import uuid
from typing import AsyncIterator

import httpx

from context import SYSTEM_PROMPT, build_client_context
from tools import TOOL_DEFINITIONS, READ_TOOLS, execute_read_tool, describe_write_tool

CLAUDE_API_URL = "https://api.anthropic.com/v1/messages"
MODEL = "claude-sonnet-4-6"
MAX_TOKENS = 16384
MAX_OLD_CHARS = 1200
MAX_AGENTIC_TURNS = 10


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


async def agentic_chat(
    user_message: str,
    history: list[dict],
    client: dict,
    documents: list[dict] | None = None,
) -> AsyncIterator[dict]:
    """
    Async generator yielding typed event dicts for the SSE stream:

    {"text": "chunk"}
        Streaming text from Claude — forwarded directly to the browser.

    {"tool_use": {"name": str, "input": dict, "result": str}}
        A read tool was called and executed automatically.

    {"confirmation_request": {"id": str, "tool": str, "args": dict, "summary": str}}
        A write tool was called — paused for adviser confirmation.
        chat.py stores the pending action keyed by id.
    """
    api_key = os.environ["ANTHROPIC_API_KEY"]
    messages = _build_messages(user_message, history, client, documents)

    first_turn = True

    for _iteration in range(MAX_AGENTIC_TURNS):
        beta_headers = ["prompt-caching-2024-07-31", "output-128k-2025-02-19"]
        if first_turn and documents:
            beta_headers.append("pdfs-2024-09-25")
        first_turn = False

        headers = {
            "Content-Type": "application/json",
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
            "anthropic-beta": ",".join(beta_headers),
        }

        payload = {
            "model": MODEL,
            "max_tokens": MAX_TOKENS,
            "stream": True,
            "system": [{"type": "text", "text": SYSTEM_PROMPT, "cache_control": {"type": "ephemeral"}}],
            "messages": messages,
            "tools": TOOL_DEFINITIONS,
        }

        # content_blocks: index → {type, id, name, text, input_json}
        content_blocks: dict[int, dict] = {}
        stop_reason: str | None = None

        async with httpx.AsyncClient(timeout=300.0) as http:
            async with http.stream("POST", CLAUDE_API_URL, json=payload, headers=headers) as response:
                if response.status_code != 200:
                    body = await response.aread()
                    try:
                        err = json.loads(body).get("error", {}).get("message", f"HTTP {response.status_code}")
                    except Exception:
                        err = f"HTTP {response.status_code}"
                    raise RuntimeError(err)

                buffer = ""
                async for raw in response.aiter_text():
                    buffer += raw
                    lines = buffer.split("\n")
                    buffer = lines.pop()

                    for line in lines:
                        if not line.startswith("data: "):
                            continue
                        data = line[6:].strip()
                        if data == "[DONE]":
                            continue
                        try:
                            ev = json.loads(data)
                            etype = ev.get("type")

                            if etype == "content_block_start":
                                idx = ev["index"]
                                block = ev["content_block"]
                                content_blocks[idx] = {
                                    "type": block["type"],
                                    "id": block.get("id"),
                                    "name": block.get("name"),
                                    "text": block.get("text", ""),
                                    "input_json": "",
                                }

                            elif etype == "content_block_delta":
                                idx = ev["index"]
                                delta = ev["delta"]
                                if delta["type"] == "text_delta":
                                    text = delta["text"]
                                    content_blocks[idx]["text"] += text
                                    yield {"text": text}
                                elif delta["type"] == "input_json_delta":
                                    content_blocks[idx]["input_json"] += delta.get("partial_json", "")

                            elif etype == "message_delta":
                                stop_reason = ev.get("delta", {}).get("stop_reason")

                            elif etype == "error":
                                raise RuntimeError(ev.get("error", {}).get("message", "Stream error"))

                        except json.JSONDecodeError:
                            pass

        # ── Not a tool-use turn — we're done ──────────────────────────────────
        if stop_reason != "tool_use":
            break

        # ── Tool-use turn: build assistant message + process each call ────────
        assistant_content: list[dict] = []
        tool_calls: list[dict] = []

        for idx in sorted(content_blocks):
            block = content_blocks[idx]
            if block["type"] == "text" and block["text"]:
                assistant_content.append({"type": "text", "text": block["text"]})
            elif block["type"] == "tool_use":
                try:
                    tool_input = json.loads(block["input_json"]) if block["input_json"] else {}
                except json.JSONDecodeError:
                    tool_input = {}
                assistant_content.append({
                    "type": "tool_use",
                    "id": block["id"],
                    "name": block["name"],
                    "input": tool_input,
                })
                tool_calls.append({
                    "id": block["id"],
                    "name": block["name"],
                    "input": tool_input,
                })

        messages.append({"role": "assistant", "content": assistant_content})

        tool_results: list[dict] = []

        for call in tool_calls:
            if call["name"] in READ_TOOLS:
                try:
                    result = await execute_read_tool(call["name"], call["input"])
                except Exception as exc:
                    result = f"Error executing {call['name']}: {exc}"

                yield {"tool_use": {"name": call["name"], "input": call["input"], "result": result}}
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": call["id"],
                    "content": result,
                })

            else:
                # Write tool — pause for adviser confirmation
                conf_id = f"conf_{uuid.uuid4().hex[:16]}"
                summary = describe_write_tool(call["name"], call["input"])

                yield {"confirmation_request": {
                    "id": conf_id,
                    "tool": call["name"],
                    "args": call["input"],
                    "summary": summary,
                }}

                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": call["id"],
                    "content": (
                        "This action is pending adviser confirmation. "
                        "Please inform the user and continue the conversation."
                    ),
                })

        messages.append({"role": "user", "content": tool_results})
