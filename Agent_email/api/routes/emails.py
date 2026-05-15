"""Email log and manual trigger routes."""
from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from db.database import get_db, AsyncSessionLocal
from db import crud
from api.auth_utils import get_current_user

router = APIRouter(prefix="/api/emails", tags=["emails"])


@router.get("")
async def list_emails(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    emails = await crud.get_emails(db, skip=skip, limit=limit)
    return [
        {
            "id": e.id,
            "message_id": e.message_id,
            "subject": e.subject,
            "sender": e.sender,
            "received_at": e.received_at.isoformat() if e.received_at else None,
            "classification": e.classification,
            "processed": e.processed,
            "lead_id": e.lead_id,
        }
        for e in emails
    ]


@router.post("/trigger-poll")
async def trigger_poll(
    background_tasks: BackgroundTasks,
    current_user=Depends(get_current_user),
):
    """Manually trigger an email inbox poll. Admin only."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    async def _run():
        async with AsyncSessionLocal() as db:
            from core.email_monitor import process_new_emails
            await process_new_emails(db)

    background_tasks.add_task(_run)
    return {"message": "Email poll triggered"}
