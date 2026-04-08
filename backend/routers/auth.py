import os
from fastapi import APIRouter, HTTPException
from models import UserRegister, UserLogin, TokenResponse
import database as db
from auth import hash_password, verify_password, create_access_token

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=201)
async def register(data: UserRegister):
    expected = os.environ.get("INVITE_CODE", "")
    if not expected or data.invite_code != expected:
        raise HTTPException(403, "Invalid invite code")
    existing = await db.get_user_by_email(data.email)
    if existing:
        raise HTTPException(400, "Email already registered")
    hashed = hash_password(data.password)
    user = await db.create_user(data.email, hashed)
    token = create_access_token({"sub": str(user["id"]), "email": user["email"]})
    return {"token": token, "email": user["email"]}


@router.post("/login", response_model=TokenResponse)
async def login(data: UserLogin):
    user = await db.get_user_by_email(data.email)
    if not user or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(401, "Invalid email or password")
    token = create_access_token({"sub": str(user["id"]), "email": user["email"]})
    return {"token": token, "email": user["email"]}
