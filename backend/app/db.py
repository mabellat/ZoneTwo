import os
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Always load backend/.env (not cwd-dependent)
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError("DATABASE_URL is not set. Please check your backend/.env file.")


def _normalize_database_url(url: str) -> str:
    """Use psycopg2 (psycopg2-binary) for Supabase-style postgres URLs."""
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+psycopg2://", 1)
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+psycopg2://", 1)
    return url


# Supabase/poolers drop idle connections; ping before use and recycle well under their timeout.
engine = create_engine(
    _normalize_database_url(DATABASE_URL),
    pool_pre_ping=True,
    pool_recycle=280,
    pool_size=5,
    max_overflow=5,
    connect_args={
        "sslmode": "require",
        "connect_timeout": 10,
        "keepalives": 1,
        "keepalives_idle": 30,
        "keepalives_interval": 10,
        "keepalives_count": 5,
    },
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()