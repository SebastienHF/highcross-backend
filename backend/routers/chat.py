import json
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from models import ChatRequest
import database as db
from claude import agentic_chat
from tools import execute_write_tool
from auth import get_current_user

router = APIRouter(prefix="/api/clients", tags=["chat"], dependencies=[Depends(get_current_user)])

# In-memory store for write-tool actions awaiting adviser confirmation.
# Keyed by confirmation ID (conf_<hex>). Entries are popped on confirm or decline.
# Acceptable for a single Railway instance; replace with Redis if scaling horizontally.
_pending_confirmations: dict[str, dict] = {}


@router.post("/{client_id}/chat")
async def chat(client_id: str, request: ChatRequest):
    client = await db.get_client(client_id)
    if not client:
        raise HTTPException(404, "Client not found")

    history = await db.get_messages(client_id, limit=20)

    docs = (
        [d.model_dump() for d in request.documents]
        if request.documents else None
    )

    # Save user message immediately (document blobs are not stored — too large)
    await db.save_message(client_id, "user", request.content)

    response_buffer: list[str] = []

    async def generate():
        try:
            async for event in agentic_chat(request.content, history, client, docs):

                if "text" in event:
                    response_buffer.append(event["text"])
                    yield f"data: {json.dumps({'text': event['text']})}\n\n"

                elif "tool_use" in event:
                    yield f"data: {json.dumps({'tool_use': event['tool_use']})}\n\n"

                elif "confirmation_request" in event:
                    conf = event["confirmation_request"]
                    # Store the action so the confirm endpoint can execute it later
                    _pending_confirmations[conf["id"]] = {
                        "tool": conf["tool"],
                        "args": conf["args"],
                    }
                    yield f"data: {json.dumps({'confirmation_request': conf})}\n\n"

            full_response = "".join(response_buffer)
            await db.save_message(client_id, "assistant", full_response)
            yield f"data: {json.dumps({'done': True})}\n\n"

        except Exception as exc:
            yield f"data: {json.dumps({'error': str(exc)})}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")


@router.post("/{client_id}/confirm/{conf_id}")
async def confirm_action(client_id: str, conf_id: str):
    """Execute a pending write-tool action after the adviser has confirmed."""
    pending = _pending_confirmations.pop(conf_id, None)
    if not pending:
        raise HTTPException(404, "Confirmation not found or already handled")
    result = await execute_write_tool(pending["tool"], pending["args"])
    return {"ok": True, "result": result}


@router.delete("/{client_id}/confirm/{conf_id}", status_code=204)
async def decline_action(client_id: str, conf_id: str):
    """Discard a pending write-tool action — no changes made."""
    _pending_confirmations.pop(conf_id, None)
