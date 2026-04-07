import json
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from models import ChatRequest
import database as db
from claude import stream_chat
from auth import get_current_user

router = APIRouter(prefix="/api/clients", tags=["chat"], dependencies=[Depends(get_current_user)])


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

    # Save user message immediately (without document blobs — too large to store)
    await db.save_message(client_id, "user", request.content)

    response_buffer: list[str] = []

    async def generate():
        try:
            async for chunk in stream_chat(request.content, history, client, docs):
                response_buffer.append(chunk)
                yield f"data: {json.dumps({'text': chunk})}\n\n"

            full_response = "".join(response_buffer)
            await db.save_message(client_id, "assistant", full_response)
            yield f"data: {json.dumps({'done': True})}\n\n"

        except Exception as exc:
            yield f"data: {json.dumps({'error': str(exc)})}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")
