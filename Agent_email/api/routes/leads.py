"""Lead management routes."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Any
from datetime import datetime
from db.database import get_db
from db import crud
from api.auth_utils import get_current_user

router = APIRouter(prefix="/api/leads", tags=["leads"])


class LeadUpdate(BaseModel):
    client_name: str | None = None
    project_name: str | None = None
    role: str | None = None
    skills: str | None = None
    experience: str | None = None
    submission_deadline: datetime | None = None
    contact_person: str | None = None
    contact_email: str | None = None
    status: str | None = None
    assigned_to: str | None = None
    notes: str | None = None


@router.get("")
async def list_leads(
    status: str | None = Query(None),
    type: str | None = Query(None),
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    # Staff can only see leads assigned to them
    owner_filter = None if current_user.role == "admin" else current_user.id
    leads = await crud.get_leads(
        db,
        status=status,
        type_filter=type,
        assigned_to=owner_filter,
        skip=skip,
        limit=limit,
    )
    return [_lead_to_dict(l) for l in leads]


@router.get("/{lead_id}")
async def get_lead(
    lead_id: str,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    lead = await crud.get_lead(db, lead_id)
    if not lead:
        raise HTTPException(404, "Lead not found")
    return _lead_to_dict(lead)


@router.patch("/{lead_id}")
async def update_lead(
    lead_id: str,
    body: LeadUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    data = {k: v for k, v in body.model_dump().items() if v is not None}
    lead = await crud.update_lead(db, lead_id, data)
    if not lead:
        raise HTTPException(404, "Lead not found")
    return _lead_to_dict(lead)


@router.delete("/{lead_id}")
async def delete_lead(
    lead_id: str,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    lead = await crud.get_lead(db, lead_id)
    if not lead:
        raise HTTPException(404, "Lead not found")
    await db.delete(lead)
    await db.commit()
    return {"message": "Deleted"}


def _lead_to_dict(lead) -> dict:
    return {
        "id": lead.id,
        "lead_id": lead.lead_id,
        "type": lead.type,
        "client_name": lead.client_name,
        "project_name": lead.project_name,
        "role": lead.role,
        "skills": lead.skills,
        "experience": lead.experience,
        "submission_deadline": lead.submission_deadline.isoformat() if lead.submission_deadline else None,
        "contact_person": lead.contact_person,
        "contact_email": lead.contact_email,
        "email_ref": lead.email_ref,
        "status": lead.status,
        "assigned_to": lead.assigned_to,
        "notes": lead.notes,
        "created_at": lead.created_at.isoformat(),
        "updated_at": lead.updated_at.isoformat(),
    }
