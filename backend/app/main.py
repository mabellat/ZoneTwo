from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.init_db import init_database
from app.logging_config import setup_logging
from app.routes import activities, auth, chat, dashboard, plan, strava

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging()
    init_database()
    yield


app = FastAPI(title="Zone 2 Autonomous AI Coach", lifespan=lifespan)

origins = [settings.frontend_url, "http://localhost:3000"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(chat.router)
app.include_router(strava.router)
app.include_router(dashboard.router)
app.include_router(activities.router)
app.include_router(plan.router)


@app.get("/")
def root():
    return {"status": "AI Coach Engine Running", "docs": "/docs"}
