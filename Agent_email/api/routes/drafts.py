"""Email draft approval and sending routes."""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from db.database import get_db, AsyncSessionLocal
from db import crud
from api.auth_utils import get_current_user

router = APIRouter(prefix="/api/drafts", tags=["drafts"])


class DraftApproval(BaseModel):
    action: str  # "approve" | "reject"


@router.get("")
async def list_drafts(
    status: str | None = None,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    drafts = await crud.get_drafts(db, status=status)
    return [_draft_dict(d) for d in drafts]


@router.post("/{draft_id}/action")
async def draft_action(
    draft_id: str,
    body: DraftApproval,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    if body.action not in ("approve", "reject"):
        raise HTTPException(400, "Action must be 'approve' or 'reject'")

    new_status = "Approved" if body.action == "approve" else "Rejected"
    draft = await crud.update_draft(db, draft_id, {"status": new_status})
    if not draft:
        raise HTTPException(404, "Draft not found")

    if body.action == "approve":
        async def _send():
            async with AsyncSessionLocal() as send_db:
                from core.follow_up import send_smtp_email
                d = await crud.update_draft(send_db, draft_id, {})
                if d:
                    from datetime import datetime, timezone
                    success = send_smtp_email(d.to_email, d.subject, d.body)
                    if success:
                        await crud.update_draft(send_db, draft_id, {
                            "status": "Sent",
                            "sent_at": datetime.now(timezone.utc),
                        })
        background_tasks.add_task(_send)

    return _draft_dict(draft)


def _draft_dict(d) -> dict:
    return {
        "id": d.id,
        "lead_id": d.lead_id,
        "to_email": d.to_email,
        "subject": d.subject,
        "body": d.body,
        "draft_type": d.draft_type,
        "status": d.status,
        "created_at": d.created_at.isoformat(),
        "sent_at": d.sent_at.isoformat() if d.sent_at else None,
    }
