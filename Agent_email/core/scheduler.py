"""APScheduler background jobs."""
import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from config import get_settings
from db.database import AsyncSessionLocal

logger = logging.getLogger(__name__)
settings = get_settings()

scheduler = AsyncIOScheduler()


async def _email_poll_job():
    async with AsyncSessionLocal() as db:
        try:
            from core.email_monitor import process_new_emails
            await process_new_emails(db)
        except Exception as e:
            logger.error("Email poll job error: %s", e)


async def _follow_up_job():
    async with AsyncSessionLocal() as db:
        try:
            from core.follow_up import send_approved_drafts, check_deadline_reminders
            await send_approved_drafts(db)
            await check_deadline_reminders(db)
        except Exception as e:
            logger.error("Follow-up job error: %s", e)


def start_scheduler():
    scheduler.add_job(
        _email_poll_job,
        trigger=IntervalTrigger(minutes=settings.poll_interval_minutes),
        id="email_poll",
        name="Email Inbox Poller",
        replace_existing=True,
    )
    scheduler.add_job(
        _follow_up_job,
        trigger=IntervalTrigger(minutes=30),
        id="follow_up",
        name="Follow-up & Reminder Checker",
        replace_existing=True,
    )
    scheduler.start()
    logger.info(
        "Scheduler started — polling every %d minutes",
        settings.poll_interval_minutes,
    )


def stop_scheduler():
    if scheduler.running:
        scheduler.shutdown()
