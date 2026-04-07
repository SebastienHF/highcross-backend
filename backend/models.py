from pydantic import BaseModel
from typing import Any, Optional


class UserRegister(BaseModel):
    email: str
    password: str


class UserLogin(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    token: str
    email: str


class DocumentAttachment(BaseModel):
    id: str
    name: str
    base64: str
    mediaType: str


class ChatRequest(BaseModel):
    content: str
    documents: Optional[list[DocumentAttachment]] = None


class ClientCreate(BaseModel):
    id: Optional[str] = None
    name: str
    initials: str
    fact_find: dict[str, str] = {}
    soft_knowledge: str = ""
    open_items: list[str] = []


class ClientUpdate(BaseModel):
    name: Optional[str] = None
    initials: Optional[str] = None
    fact_find: Optional[dict[str, str]] = None
    soft_knowledge: Optional[str] = None
    open_items: Optional[list[str]] = None


class RecommendationIn(BaseModel):
    type: str
    summary: str
    confirmedAt: str


class ArtifactIn(BaseModel):
    id: str
    type: str
    content: str
    structuredData: Optional[Any] = None
    confirmed: bool = False
    confirmedAt: Optional[str] = None
    savedToFile: bool = False
    version: int = 1
    supersedes: Optional[str] = None
    createdAt: str


class ArtifactUpdate(BaseModel):
    confirmed: Optional[bool] = None
    confirmedAt: Optional[str] = None
    savedToFile: Optional[bool] = None
