"""Follow-up and reminder automation."""
import logging
import smtplib
from datetime import datetime, timezone, timedelta
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from db.models import Lead, LeadStatus, EmailDraft, DraftStatus
from db import crud
from config import get_settings
from core.draft_generator import generate_followup_draft

logger = logging.getLogger(__name__)
settings = get_settings()


def send_smtp_email(to: str, subject: str, body: str) -> bool:
    """Send an email via SMTP (Zoho)."""
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = settings.email_address
        msg["To"] = to
        msg.attach(MIMEText(body, "plain"))

        with smtplib.SMTP(settings.smtp_server, settings.smtp_port) as server:
            server.ehlo()
            server.starttls()
            server.login(settings.email_address, settings.email_password)
            server.sendmail(settings.email_address, to, msg.as_string())
        return True
    except Exception as e:
        logger.error("SMTP send failed to %s: %s", to, e)
        return False


async def send_approved_drafts(db: AsyncSession):
    """Send all approved email drafts."""
    drafts = await crud.get_drafts(db, status="Approved")
    for draft in drafts:
        success = send_smtp_email(draft.to_email, draft.subject, draft.body)
        if success:
            await crud.update_draft(db, draft.id, {
                "status": "Sent",
                "sent_at": datetime.now(timezone.utc),
            })
            await crud.log_activity(db, "draft", draft.id, "sent", f"Email sent to {draft.to_email}")


async def check_deadline_reminders(db: AsyncSession):
    """
    Check for leads approaching submission deadlines and create reminder drafts.
    Triggers at 3 days, 1 day before deadline.
    """
    now = datetime.now(timezone.utc)
    thresholds = [timedelta(days=3), timedelta(days=1)]

    result = await db.execute(
        select(Lead).where(
            Lead.status.in_(["New", "In Progress"]),
            Lead.submission_deadline.is_not(None),
        )
    )
    leads = result.scalars().all()

    for lead in leads:
        deadline = lead.submission_deadline
        if deadline.tzinfo is None:
            deadline = deadline.replace(tzinfo=timezone.utc)

        for threshold in thresholds:
            window_start = deadline - threshold
            window_end = window_start + timedelta(hours=2)

            if window_start <= now <= window_end:
                days_left = (deadline - now).days + 1
                logger.info(
                    "Deadline reminder: lead %s has %d day(s) left",
                    lead.lead_id, days_left
                )
                await generate_followup_draft(db, lead)
                await crud.log_activity(
                    db, "lead", lead.id,
                    "reminder",
                    f"Deadline reminder generated ({days_left} days left)"
                )
                break
