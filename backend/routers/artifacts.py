from fastapi import APIRouter, Depends, HTTPException
from models import ArtifactIn, ArtifactUpdate
import database as db
from auth import get_current_user

router = APIRouter(tags=["artifacts"], dependencies=[Depends(get_current_user)])


@router.post("/api/clients/{client_id}/artifacts", status_code=201)
async def save_artifact(client_id: str, artifact: ArtifactIn):
    client = await db.get_client(client_id)
    if not client:
        raise HTTPException(404, "Client not found")
    await db.upsert_artifact(client_id, artifact.model_dump())
    return {"ok": True}


@router.put("/api/artifacts/{artifact_id}")
async def update_artifact(artifact_id: str, data: ArtifactUpdate):
    await db.update_artifact(artifact_id, data.model_dump(exclude_none=True))
    return {"ok": True}


@router.delete("/api/artifacts/{artifact_id}", status_code=204)
async def delete_artifact(artifact_id: str):
    await db.delete_artifact(artifact_id)
