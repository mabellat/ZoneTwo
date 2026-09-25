"""Create ORM tables on Supabase Postgres (no Alembic). Run once or on startup."""

import logging
import os

from sqlalchemy import text
from sqlalchemy.exc import OperationalError

from app.db import Base, engine

logger = logging.getLogger(__name__)

_USER_PROFILE_COLUMNS = (
    ("strava_first_name", "VARCHAR"),
    ("strava_last_name", "VARCHAR"),
    ("profile_photo_url", "VARCHAR"),
)


def _column_exists(conn, table: str, column: str) -> bool:
    row = conn.execute(
        text(
            """
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = :table
              AND column_name = :column
            LIMIT 1
            """
        ),
        {"table": table, "column": column},
    ).first()
    return row is not None


def _ensure_user_profile_columns() -> None:
    """Add legacy profile columns only when missing — avoids slow ALTER on every boot."""
    if os.getenv("DB_SKIP_STARTUP_MIGRATIONS", "").lower() in ("1", "true", "yes"):
        logger.info("Skipping startup column migrations (DB_SKIP_STARTUP_MIGRATIONS)")
        return

    with engine.connect() as conn:
        # DDL autocommit avoids long transactions and plays nicer with Supabase poolers.
        conn = conn.execution_options(isolation_level="AUTOCOMMIT")
        for col, col_type in _USER_PROFILE_COLUMNS:
            if _column_exists(conn, "users", col):
                continue
            logger.info("Adding missing column users.%s", col)
            try:
                conn.execute(
                    text(f"ALTER TABLE users ADD COLUMN {col} {col_type}")
                )
            except OperationalError as exc:
                logger.warning(
                    "Could not add users.%s (%s). If the app fails later, add the column "
                    "in the Supabase SQL editor or use the direct (non-pooler) DATABASE_URL once.",
                    col,
                    exc.orig if hasattr(exc, "orig") else exc,
                )


def init_database() -> None:
    Base.metadata.create_all(bind=engine)
    _ensure_user_profile_columns()
    logger.info("Database tables ensured via SQLAlchemy create_all")
