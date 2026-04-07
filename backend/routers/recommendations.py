from fastapi import APIRouter, Depends, HTTPException
from models import RecommendationIn
import database as db
from auth import get_current_user

router = APIRouter(tags=["recommendations"], dependencies=[Depends(get_current_user)])


@router.post("/api/clients/{client_id}/recommendations", status_code=201)
async def add_recommendation(client_id: str, rec: RecommendationIn):
    client = await db.get_client(client_id)
    if not client:
        raise HTTPException(404, "Client not found")
    await db.add_recommendation(client_id, rec.model_dump())
    return {"ok": True}
