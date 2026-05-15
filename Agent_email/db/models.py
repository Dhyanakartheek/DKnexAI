"""ORM Models for the Email Automation Agent."""
import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    String, Text, DateTime, Boolean, ForeignKey, Integer, Enum
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from db.database import Base
import enum as py_enum


def utcnow():
    return datetime.now(timezone.utc)


def new_uuid():
    return str(uuid.uuid4())


# ─── Enums ────────────────────────────────────────────────────────────────────

class EmailType(str, py_enum.Enum):
    RFP = "RFP"
    RFI = "RFI"
    JD = "JD"
    OTHER = "OTHER"


class LeadStatus(str, py_enum.Enum):
    NEW = "New"
    IN_PROGRESS = "In Progress"
    SUBMITTED = "Submitted"
    CLOSED = "Closed"
    WON = "Won"
    LOST = "Lost"


class TaskStatus(str, py_enum.Enum):
    PENDING = "Pending"
    IN_PROGRESS = "In Progress"
    DONE = "Done"


class DraftStatus(str, py_enum.Enum):
    PENDING = "Pending"
    APPROVED = "Approved"
    REJECTED = "Rejected"
    SENT = "Sent"


# ─── Models ───────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_uuid)
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(50), default="staff")
    skills: Mapped[str | None] = mapped_column(Text, nullable=True)  # comma-separated
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    tasks: Mapped[list["Task"]] = relationship("Task", back_populates="assignee")
    leads: Mapped[list["Lead"]] = relationship("Lead", back_populates="owner")


class ProcessedEmail(Base):
    __tablename__ = "processed_emails"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_uuid)
    message_id: Mapped[str] = mapped_column(String(512), unique=True, index=True)
    subject: Mapped[str | None] = mapped_column(String(512))
    sender: Mapped[str | None] = mapped_column(String(255))
    received_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    body: Mapped[str | None] = mapped_column(Text)
    classification: Mapped[str] = mapped_column(
        Enum(EmailType), default=EmailType.OTHER
    )
    processed: Mapped[bool] = mapped_column(Boolean, default=False)
    lead_id: Mapped[str | None] = mapped_column(
        String, ForeignKey("leads.id"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    lead: Mapped["Lead | None"] = relationship("Lead", back_populates="emails")


class Lead(Base):
    __tablename__ = "leads"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_uuid)
    lead_id: Mapped[str] = mapped_column(String(50), unique=True, index=True)  # e.g. LEAD-0001
    type: Mapped[str] = mapped_column(Enum(EmailType), default=EmailType.OTHER)

    client_name: Mapped[str | None] = mapped_column(String(255))
    project_name: Mapped[str | None] = mapped_column(String(255))
    role: Mapped[str | None] = mapped_column(String(255))
    skills: Mapped[str | None] = mapped_column(Text)
    experience: Mapped[str | None] = mapped_column(String(100))
    submission_deadline: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    contact_person: Mapped[str | None] = mapped_column(String(255))
    contact_email: Mapped[str | None] = mapped_column(String(255))
    email_ref: Mapped[str | None] = mapped_column(String(512))

    status: Mapped[str] = mapped_column(Enum(LeadStatus), default=LeadStatus.NEW)
    assigned_to: Mapped[str | None] = mapped_column(
        String, ForeignKey("users.id"), nullable=True
    )
    notes: Mapped[str | None] = mapped_column(Text)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )

    owner: Mapped["User | None"] = relationship("User", back_populates="leads")
    emails: Mapped[list["ProcessedEmail"]] = relationship("ProcessedEmail", back_populates="lead")
    tasks: Mapped[list["Task"]] = relationship("Task", back_populates="lead")
    drafts: Mapped[list["EmailDraft"]] = relationship("EmailDraft", back_populates="lead")


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_uuid)
    lead_id: Mapped[str | None] = mapped_column(
        String, ForeignKey("leads.id"), nullable=True
    )
    title: Mapped[str] = mapped_column(String(512))
    description: Mapped[str | None] = mapped_column(Text)
    assigned_to: Mapped[str | None] = mapped_column(
        String, ForeignKey("users.id"), nullable=True
    )
    due_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    status: Mapped[str] = mapped_column(Enum(TaskStatus), default=TaskStatus.PENDING)
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )

    lead: Mapped["Lead | None"] = relationship("Lead", back_populates="tasks")
    assignee: Mapped["User | None"] = relationship("User", back_populates="tasks")


class EmailDraft(Base):
    __tablename__ = "email_drafts"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_uuid)
    lead_id: Mapped[str | None] = mapped_column(
        String, ForeignKey("leads.id"), nullable=True
    )
    to_email: Mapped[str] = mapped_column(String(255))
    subject: Mapped[str] = mapped_column(String(512))
    body: Mapped[str] = mapped_column(Text)
    draft_type: Mapped[str] = mapped_column(String(100))  # acknowledgement, follow-up, etc.
    status: Mapped[str] = mapped_column(Enum(DraftStatus), default=DraftStatus.PENDING)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    lead: Mapped["Lead | None"] = relationship("Lead", back_populates="drafts")


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_uuid)
    entity_type: Mapped[str] = mapped_column(String(50))   # lead / email / task / draft
    entity_id: Mapped[str | None] = mapped_column(String, nullable=True)
    action: Mapped[str] = mapped_column(String(255))
    detail: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
