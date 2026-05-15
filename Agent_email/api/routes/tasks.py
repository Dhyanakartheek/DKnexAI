"""Task management routes."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from datetime import datetime
from db.database import get_db
from db import crud
from api.auth_utils import get_current_user

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


class TaskCreate(BaseModel):
    lead_id: str | None = None
    title: str
    description: str | None = None
    assigned_to: str | None = None
    due_date: datetime | None = None
    notes: str | None = None


class TaskUpdate(BaseModel):
    status: str | None = None
    notes: str | None = None
    assigned_to: str | None = None
    due_date: datetime | None = None


@router.get("")
async def list_tasks(
    lead_id: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    # Staff only see their own tasks
    owner_filter = None if current_user.role == "admin" else current_user.id
    tasks = await crud.get_tasks(db, lead_id=lead_id, assigned_to=owner_filter)
    return [_task_dict(t) for t in tasks]


@router.post("")
async def create_task(
    body: TaskCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    task = await crud.create_task(db, body.model_dump())
    return _task_dict(task)


@router.patch("/{task_id}")
async def update_task(
    task_id: str,
    body: TaskUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    data = {k: v for k, v in body.model_dump().items() if v is not None}
    task = await crud.update_task(db, task_id, data)
    if not task:
        raise HTTPException(404, "Task not found")
    return _task_dict(task)


def _task_dict(t) -> dict:
    return {
        "id": t.id,
        "lead_id": t.lead_id,
        "title": t.title,
        "description": t.description,
        "assigned_to": t.assigned_to,
        "due_date": t.due_date.isoformat() if t.due_date else None,
        "status": t.status,
        "notes": t.notes,
        "created_at": t.created_at.isoformat(),
    }
