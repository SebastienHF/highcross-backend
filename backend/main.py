import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import database as db
from routers import clients, chat, artifacts, messages, recommendations, auth

# Load .env from the project root (one level up from backend/)
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"))


@asynccontextmanager
async def lifespan(app: FastAPI):
    await db.init_pool()
    yield
    await db.close_pool()


app = FastAPI(title="Adviser Workspace API", lifespan=lifespan)

ALLOWED_ORIGINS = [
    "https://lovely-axolotl-7f6eab.netlify.app",
    "http://localhost:5173",
    "http://localhost:4173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(clients.router)
app.include_router(chat.router)
app.include_router(artifacts.router)
app.include_router(messages.router)
app.include_router(recommendations.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
