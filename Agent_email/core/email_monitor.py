"""IMAP email monitor — polls inbox and processes new emails."""
import imaplib
import email
import logging
from datetime import datetime, timezone
from email.header import decode_header
from email.utils import parsedate_to_datetime
from sqlalchemy.ext.asyncio import AsyncSession
from config import get_settings
from db import crud
from core.classifier import classify_and_extract

logger = logging.getLogger(__name__)
settings = get_settings()


def _decode_str(value: str | bytes | None, charset: str | None = "utf-8") -> str:
    if value is None:
        return ""
    if isinstance(value, bytes):
        try:
            return value.decode(charset or "utf-8", errors="replace")
        except Exception:
            return value.decode("latin-1", errors="replace")
    return value


def _decode_header(raw_header: str | None) -> str:
    if not raw_header:
        return ""
    parts = decode_header(raw_header)
    decoded = []
    for part, charset in parts:
        decoded.append(_decode_str(part, charset))
    return "".join(decoded)


def _extract_body(msg: email.message.Message) -> str:
    """Extract plain-text body from a (possibly multipart) email."""
    body = ""
    if msg.is_multipart():
        for part in msg.walk():
            ct = part.get_content_type()
            cd = str(part.get("Content-Disposition", ""))
            if ct == "text/plain" and "attachment" not in cd:
                payload = part.get_payload(decode=True)
                charset = part.get_content_charset() or "utf-8"
                body += _decode_str(payload, charset)
    else:
        payload = msg.get_payload(decode=True)
        charset = msg.get_content_charset() or "utf-8"
        body = _decode_str(payload, charset)
    return body.strip()


def fetch_new_emails(seen_ids: set[str]) -> list[dict]:
    """Connect via IMAP and return unseen emails not already in seen_ids."""
    results = []
    try:
        mail = imaplib.IMAP4_SSL(settings.imap_server, settings.imap_port)
        mail.login(settings.email_address, settings.email_password)
        mail.select("INBOX")

        _, data = mail.search(None, "UNSEEN")
        ids = data[0].split()
        logger.info("Found %d unseen emails", len(ids))

        for num in ids:
            _, msg_data = mail.fetch(num, "(RFC822)")
            raw = msg_data[0][1]
            msg = email.message_from_bytes(raw)

            message_id = msg.get("Message-ID", "").strip()
            if not message_id or message_id in seen_ids:
                continue

            subject = _decode_header(msg.get("Subject"))
            sender = msg.get("From", "")
            body = _extract_body(msg)

            try:
                received_at = parsedate_to_datetime(msg.get("Date"))
            except Exception:
                received_at = datetime.now(timezone.utc)

            results.append({
                "message_id": message_id,
                "subject": subject,
                "sender": sender,
                "body": body,
                "received_at": received_at,
            })

        mail.logout()
    except Exception as e:
        logger.error("IMAP fetch error: %s", e)

    return results


async def process_new_emails(db: AsyncSession):
    """Main routine called by the scheduler — fetch, classify, store, create leads."""
    # Get already-processed message IDs
    existing = await crud.get_emails(db, limit=10000)
    seen_ids = {e.message_id for e in existing}

    raw_emails = fetch_new_emails(seen_ids)
    logger.info("Processing %d new emails", len(raw_emails))

    for raw in raw_emails:
        # Skip if already stored
        if await crud.email_exists(db, raw["message_id"]):
            continue

        # Classify + extract
        extracted = await classify_and_extract(
            raw["subject"], raw["sender"], raw["body"]
        )

        classification = extracted.get("classification", "OTHER")

        email_record = await crud.create_processed_email(db, {
            "message_id": raw["message_id"],
            "subject": raw["subject"],
            "sender": raw["sender"],
            "received_at": raw["received_at"],
            "body": raw["body"],
            "classification": classification,
            "processed": True,
        })

        # Auto-create lead for actionable emails
        if classification in ("RFP", "RFI", "JD"):
            deadline_raw = extracted.get("submission_deadline")
            deadline = None
            if deadline_raw:
                try:
                    deadline = datetime.fromisoformat(deadline_raw)
                except Exception:
                    pass

            lead = await crud.create_lead(db, {
                "type": classification,
                "client_name": extracted.get("client_name"),
                "project_name": extracted.get("project_name"),
                "role": extracted.get("role"),
                "skills": extracted.get("skills"),
                "experience": extracted.get("experience"),
                "submission_deadline": deadline,
                "contact_person": extracted.get("contact_person"),
                "contact_email": extracted.get("contact_email"),
                "email_ref": raw["message_id"],
                "notes": extracted.get("summary"),
            })

            # Link email → lead
            await crud.update_draft  # just ensure imported
            email_record.lead_id = lead.id
            await db.commit()

            logger.info("Created lead %s from email %s", lead.lead_id, raw["message_id"])

            # Generate acknowledgement draft
            from core.draft_generator import generate_acknowledgement_draft
            await generate_acknowledgement_draft(db, lead, raw["sender"])
