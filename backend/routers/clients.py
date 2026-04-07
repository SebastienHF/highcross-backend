import re
import time
from fastapi import APIRouter, Depends, HTTPException
from models import ClientCreate, ClientUpdate
import database as db
from auth import get_current_user

router = APIRouter(prefix="/api/clients", tags=["clients"], dependencies=[Depends(get_current_user)])


@router.get("/")
async def list_clients():
    return await db.get_all_clients()


@router.post("/", status_code=201)
async def create_client(data: ClientCreate):
    if not data.id:
        slug = re.sub(r"\s+", "-", data.name.lower())
        data.id = f"{slug}-{int(time.time() * 1000)}"
    existing = await db.get_client(data.id)
    if existing:
        raise HTTPException(400, "Client ID already exists")
    return await db.create_client(data.model_dump())


@router.get("/{client_id}")
async def get_client(client_id: str):
    client = await db.get_client(client_id)
    if not client:
        raise HTTPException(404, "Client not found")
    return client


@router.put("/{client_id}")
async def update_client(client_id: str, data: ClientUpdate):
    client = await db.get_client(client_id)
    if not client:
        raise HTTPException(404, "Client not found")
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    return await db.update_client(client_id, update_data)


@router.delete("/{client_id}", status_code=204)
async def delete_client(client_id: str):
    client = await db.get_client(client_id)
    if not client:
        raise HTTPException(404, "Client not found")
    await db.delete_client(client_id)
