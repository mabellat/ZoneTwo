"""Create your local dev user from .env (optional). Strava data comes from OAuth sync, not this script."""

import os
import sys
from pathlib import Path

from dotenv import load_dotenv

# Always load backend/.env even if you run from repo root
load_dotenv(Path(__file__).resolve().parent / ".env")

from app.auth import hash_password
from app.db import SessionLocal
from app.init_db import init_database
from app.models import User


def seed_database() -> None:
    email = (os.getenv("SEED_USER_EMAIL") or "").strip().lower()
    password = os.getenv("SEED_USER_PASSWORD") or ""

    if not email or not password:
        print(
            "Set SEED_USER_EMAIL and SEED_USER_PASSWORD in backend/.env, then run again.\n"
            "Or skip this script and use POST /api/auth/register in Swagger.",
            file=sys.stderr,
        )
        sys.exit(1)

    max_hr = int(os.getenv("SEED_USER_MAX_HR", "188"))
    resting_hr = int(os.getenv("SEED_USER_RESTING_HR", "56"))

    init_database()
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            user = User(
                email=email,
                password_hash=hash_password(password),
                max_heart_rate=max_hr,
                resting_heart_rate=resting_hr,
            )
            db.add(user)
            db.commit()
            print(f"Created your dev user: {email}")
        else:
            print(f"User already exists: {email} (not changing password)")
        print("Next: start API, log in with this email, then Connect Strava.")
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
