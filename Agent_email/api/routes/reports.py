"""Report generation and download routes."""
from fastapi import APIRouter, Depends
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from db.database import get_db
from api.auth_utils import get_current_user
from core.reporter import generate_excel_report, generate_pdf_report
from db import crud

router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.get("/excel")
async def download_excel(
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    data = await generate_excel_report(db)
    return Response(
        content=data,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=lead_report.xlsx"},
    )


@router.get("/pdf")
async def download_pdf(
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    data = await generate_pdf_report(db)
    return Response(
        content=data,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=lead_report.pdf"},
    )


@router.get("/dashboard")
async def dashboard_stats(
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    return await crud.get_dashboard_stats(db)


@router.get("/activity")
async def activity_log(
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    logs = await crud.get_activity_logs(db, limit=limit)
    return [
        {
            "id": log.id,
            "entity_type": log.entity_type,
            "entity_id": log.entity_id,
            "action": log.action,
            "detail": log.detail,
            "created_at": log.created_at.isoformat(),
        }
        for log in logs
    ]
