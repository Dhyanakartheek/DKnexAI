"""FastAPI application entry point."""
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path

from config import get_settings
from db.database import init_db
from db import crud
from api.auth_utils import hash_password
from db.database import AsyncSessionLocal
from core.scheduler import start_scheduler, stop_scheduler

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup ──────────────────────────────────────────────
    logger.info("Initializing database…")
    await init_db()

    # Seed admin user
    async with AsyncSessionLocal() as db:
        existing = await crud.get_user_by_email(db, settings.admin_email)
        if not existing:
            await crud.create_user(db, {
                "name": "Administrator",
                "email": settings.admin_email,
                "hashed_password": hash_password(settings.admin_password),
                "role": "admin",
                "skills": "management,operations",
            })
            logger.info("Admin user seeded: %s", settings.admin_email)

    logger.info("Starting background scheduler…")
    start_scheduler()

    yield

    # ── Shutdown ─────────────────────────────────────────────
    logger.info("Stopping scheduler…")
    stop_scheduler()


app = FastAPI(
    title="AI Email Automation Agent",
    description="Intelligent email processing, lead management, and reporting",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── API Routes ───────────────────────────────────────────────
from api.routes import auth, leads, emails, tasks, drafts, reports

app.include_router(auth.router)
app.include_router(leads.router)
app.include_router(emails.router)
app.include_router(tasks.router)
app.include_router(drafts.router)
app.include_router(reports.router)

# ── Static Frontend ──────────────────────────────────────────
frontend_dir = Path(__file__).parent / "frontend"
if frontend_dir.exists():
    app.mount("/static", StaticFiles(directory=str(frontend_dir)), name="static")

    @app.get("/", include_in_schema=False)
    async def serve_frontend():
        return FileResponse(str(frontend_dir / "index.html"))

    @app.get("/{path:path}", include_in_schema=False)
    async def catch_all(path: str):
        file = frontend_dir / path
        if file.exists() and file.is_file():
            return FileResponse(str(file))
        return FileResponse(str(frontend_dir / "index.html"))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.app_host,
        port=settings.app_port,
        reload=False,
        log_level="info",
    )
