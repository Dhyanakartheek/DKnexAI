"""CRUD helpers for all models."""
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from db.models import (
    User, ProcessedEmail, Lead, Task, EmailDraft, ActivityLog,
    LeadStatus, EmailType
)


# ─── Lead ─────────────────────────────────────────────────────────────────────

async def get_next_lead_id(db: AsyncSession) -> str:
    result = await db.execute(select(func.count()).select_from(Lead))
    count = result.scalar() or 0
    return f"LEAD-{count + 1:04d}"


async def create_lead(db: AsyncSession, data: dict) -> Lead:
    lead_id = await get_next_lead_id(db)
    lead = Lead(lead_id=lead_id, **data)
    db.add(lead)
    await db.commit()
    await db.refresh(lead)
    await log_activity(db, "lead", lead.id, "created", f"Lead {lead_id} created")
    return lead


async def get_leads(
    db: AsyncSession,
    status: str | None = None,
    type_filter: str | None = None,
    assigned_to: str | None = None,
    skip: int = 0,
    limit: int = 100,
):
    q = select(Lead)
    if status:
        q = q.where(Lead.status == status)
    if type_filter:
        q = q.where(Lead.type == type_filter)
    if assigned_to:
        q = q.where(Lead.assigned_to == assigned_to)
    q = q.offset(skip).limit(limit).order_by(Lead.created_at.desc())
    result = await db.execute(q)
    return result.scalars().all()


async def get_lead(db: AsyncSession, lead_id: str) -> Lead | None:
    result = await db.execute(select(Lead).where(Lead.id == lead_id))
    return result.scalar_one_or_none()


async def update_lead(db: AsyncSession, lead_id: str, data: dict) -> Lead | None:
    lead = await get_lead(db, lead_id)
    if not lead:
        return None
    for k, v in data.items():
        setattr(lead, k, v)
    lead.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(lead)
    return lead


# ─── Email ────────────────────────────────────────────────────────────────────

async def email_exists(db: AsyncSession, message_id: str) -> bool:
    result = await db.execute(
        select(ProcessedEmail).where(ProcessedEmail.message_id == message_id)
    )
    return result.scalar_one_or_none() is not None


async def create_processed_email(db: AsyncSession, data: dict) -> ProcessedEmail:
    email = ProcessedEmail(**data)
    db.add(email)
    await db.commit()
    await db.refresh(email)
    return email


async def get_emails(db: AsyncSession, skip: int = 0, limit: int = 100):
    q = select(ProcessedEmail).order_by(ProcessedEmail.received_at.desc()).offset(skip).limit(limit)
    result = await db.execute(q)
    return result.scalars().all()


# ─── Task ─────────────────────────────────────────────────────────────────────

async def create_task(db: AsyncSession, data: dict) -> Task:
    task = Task(**data)
    db.add(task)
    await db.commit()
    await db.refresh(task)
    return task


async def get_tasks(
    db: AsyncSession,
    lead_id: str | None = None,
    assigned_to: str | None = None,
):
    q = select(Task)
    if lead_id:
        q = q.where(Task.lead_id == lead_id)
    if assigned_to:
        q = q.where(Task.assigned_to == assigned_to)
    q = q.order_by(Task.due_date.asc())
    result = await db.execute(q)
    return result.scalars().all()


async def update_task(db: AsyncSession, task_id: str, data: dict) -> Task | None:
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        return None
    for k, v in data.items():
        setattr(task, k, v)
    task.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(task)
    return task


# ─── Draft ────────────────────────────────────────────────────────────────────

async def create_draft(db: AsyncSession, data: dict) -> EmailDraft:
    draft = EmailDraft(**data)
    db.add(draft)
    await db.commit()
    await db.refresh(draft)
    return draft


async def get_drafts(db: AsyncSession, status: str | None = None):
    q = select(EmailDraft)
    if status:
        q = q.where(EmailDraft.status == status)
    q = q.order_by(EmailDraft.created_at.desc())
    result = await db.execute(q)
    return result.scalars().all()


async def update_draft(db: AsyncSession, draft_id: str, data: dict) -> EmailDraft | None:
    result = await db.execute(select(EmailDraft).where(EmailDraft.id == draft_id))
    draft = result.scalar_one_or_none()
    if not draft:
        return None
    for k, v in data.items():
        setattr(draft, k, v)
    await db.commit()
    await db.refresh(draft)
    return draft


# ─── User ─────────────────────────────────────────────────────────────────────

async def get_user_by_email(db: AsyncSession, email: str) -> User | None:
    result = await db.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()


async def create_user(db: AsyncSession, data: dict) -> User:
    user = User(**data)
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def get_users(db: AsyncSession):
    result = await db.execute(select(User).where(User.is_active == True))
    return result.scalars().all()


async def get_user(db: AsyncSession, user_id: str) -> User | None:
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


async def update_user(db: AsyncSession, user_id: str, data: dict) -> User | None:
    user = await get_user(db, user_id)
    if not user:
        return None
    for k, v in data.items():
        setattr(user, k, v)
    await db.commit()
    await db.refresh(user)
    return user


async def deactivate_user(db: AsyncSession, user_id: str) -> bool:
    """Soft-delete: marks user as inactive."""
    user = await get_user(db, user_id)
    if not user:
        return False
    user.is_active = False
    await db.commit()
    return True


async def get_all_users(db: AsyncSession):
    """Return ALL users (including inactive) for admin management."""
    result = await db.execute(select(User).order_by(User.created_at.asc()))
    return result.scalars().all()


# ─── Dashboard Stats ──────────────────────────────────────────────────────────

async def get_dashboard_stats(db: AsyncSession) -> dict:
    total = (await db.execute(select(func.count()).select_from(Lead))).scalar() or 0
    by_type = {}
    for t in EmailType:
        cnt = (
            await db.execute(
                select(func.count()).select_from(Lead).where(Lead.type == t.value)
            )
        ).scalar() or 0
        by_type[t.value] = cnt

    by_status = {}
    for s in LeadStatus:
        cnt = (
            await db.execute(
                select(func.count()).select_from(Lead).where(Lead.status == s.value)
            )
        ).scalar() or 0
        by_status[s.value] = cnt

    pending_drafts = (
        await db.execute(
            select(func.count()).select_from(EmailDraft).where(EmailDraft.status == "Pending")
        )
    ).scalar() or 0

    pending_tasks = (
        await db.execute(
            select(func.count()).select_from(Task).where(Task.status == "Pending")
        )
    ).scalar() or 0

    emails_processed = (
        await db.execute(select(func.count()).select_from(ProcessedEmail))
    ).scalar() or 0

    return {
        "total_leads": total,
        "by_type": by_type,
        "by_status": by_status,
        "pending_drafts": pending_drafts,
        "pending_tasks": pending_tasks,
        "emails_processed": emails_processed,
    }


# ─── Activity Log ─────────────────────────────────────────────────────────────

async def log_activity(
    db: AsyncSession,
    entity_type: str,
    entity_id: str | None,
    action: str,
    detail: str | None = None,
):
    log = ActivityLog(
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        detail=detail,
    )
    db.add(log)
    await db.commit()


async def get_activity_logs(db: AsyncSession, limit: int = 50):
    result = await db.execute(
        select(ActivityLog).order_by(ActivityLog.created_at.desc()).limit(limit)
    )
    return result.scalars().all()
