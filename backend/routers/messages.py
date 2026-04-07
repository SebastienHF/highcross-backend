from fastapi import APIRouter, Depends, HTTPException
import database as db
from auth import get_current_user

router = APIRouter(tags=["messages"], dependencies=[Depends(get_current_user)])


@router.delete("/api/clients/{client_id}/messages", status_code=204)
async def clear_messages(client_id: str):
    client = await db.get_client(client_id)
    if not client:
        raise HTTPException(404, "Client not found")
    await db.clear_messages(client_id)


@router.delete("/api/messages/{message_id}", status_code=204)
async def delete_message(message_id: str):
    await db.delete_message(message_id)
