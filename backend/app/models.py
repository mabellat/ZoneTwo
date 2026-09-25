import uuid
from datetime import datetime

from sqlalchemy import (
    JSON,
    Boolean,
    Column,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from app.db import Base


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=True)
    max_heart_rate = Column(Integer, default=188)
    resting_heart_rate = Column(Integer, default=56)
    lthr = Column(Integer, nullable=True)
    strava_athlete_id = Column(String, unique=True, nullable=True)
    strava_first_name = Column(String, nullable=True)
    strava_last_name = Column(String, nullable=True)
    profile_photo_url = Column(String, nullable=True)
    access_token = Column(Text, nullable=True)
    refresh_token = Column(Text, nullable=True)
    token_expires_at = Column(DateTime, nullable=True)
    last_sync_at = Column(DateTime, nullable=True)
    onboarding_complete = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    activities = relationship("Activity", back_populates="user", cascade="all, delete-orphan")
    goals = relationship("AthleteGoal", back_populates="user", cascade="all, delete-orphan")
    training_plans = relationship("TrainingPlan", back_populates="user", cascade="all, delete-orphan")
    chat_threads = relationship("ChatThread", back_populates="user", cascade="all, delete-orphan")


class Activity(Base):
    __tablename__ = "activities"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    strava_activity_id = Column(String, unique=True, nullable=False)
    name = Column(String, nullable=False)
    sport_type = Column(String, nullable=False, default="Run")
    distance_meters = Column(Float, nullable=False)
    moving_time_seconds = Column(Integer, nullable=False)
    average_heartrate = Column(Float, nullable=True)
    max_heartrate = Column(Float, nullable=True)
    elevation_gain = Column(Float, nullable=True)
    average_watts = Column(Float, nullable=True)
    start_date = Column(DateTime, nullable=False)
    strava_payload = Column(JSONB, nullable=True)

    user = relationship("User", back_populates="activities")


class AthleteGoal(Base):
    __tablename__ = "athlete_goals"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    event_type = Column(String, nullable=False)
    race_date = Column(Date, nullable=False)
    target_time_seconds = Column(Integer, nullable=True)
    days_per_week = Column(Integer, default=4)
    constraints_json = Column(JSON, default=dict)
    status = Column(String, default="ACTIVE")
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="goals")


class TrainingPlan(Base):
    __tablename__ = "training_plans"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    goal_id = Column(UUID(as_uuid=True), ForeignKey("athlete_goals.id"), nullable=True)
    event_type = Column(String, nullable=False)
    race_date = Column(Date, nullable=False)
    phase = Column(String, default="base")
    status = Column(String, default="ACTIVE")
    total_weeks = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="training_plans")
    goal = relationship("AthleteGoal")
    sessions = relationship(
        "PlannedSession",
        back_populates="plan",
        cascade="all, delete-orphan",
        order_by="PlannedSession.scheduled_date",
    )


class PlannedSession(Base):
    __tablename__ = "planned_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    plan_id = Column(UUID(as_uuid=True), ForeignKey("training_plans.id", ondelete="CASCADE"), nullable=False)
    scheduled_date = Column(Date, nullable=False)
    session_type = Column(String, nullable=False)
    target_distance_km = Column(Float, nullable=True)
    target_duration_minutes = Column(Integer, nullable=True)
    target_hr_min = Column(Integer, nullable=True)
    target_hr_max = Column(Integer, nullable=True)
    notes = Column(Text, nullable=True)
    status = Column(String, default="PENDING")
    matched_activity_id = Column(UUID(as_uuid=True), ForeignKey("activities.id"), nullable=True)

    plan = relationship("TrainingPlan", back_populates="sessions")
    matched_activity = relationship("Activity")


class ChatThread(Base):
    __tablename__ = "chat_threads"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    user_email = Column(String, nullable=False)
    title = Column(String, default="New Coaching Session")
    context_json = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="chat_threads")
    messages = relationship("ChatMessage", back_populates="thread", cascade="all, delete-orphan")
    legacy_plan = relationship("RacePlan", back_populates="thread", uselist=False)


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    thread_id = Column(UUID(as_uuid=True), ForeignKey("chat_threads.id", ondelete="CASCADE"), nullable=False)
    role = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    thread = relationship("ChatThread", back_populates="messages")


class RacePlan(Base):
    """Legacy chat-exported plans; new flows use TrainingPlan."""

    __tablename__ = "race_plans"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    thread_id = Column(UUID(as_uuid=True), ForeignKey("chat_threads.id", ondelete="CASCADE"), nullable=True)
    user_email = Column(String, nullable=False)
    target_race = Column(String, nullable=False)
    weekly_mileage_km = Column(Float, nullable=True)
    plan_data = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    thread = relationship("ChatThread", back_populates="legacy_plan")
