"""LLM-based email draft generator."""
import logging
from groq import AsyncGroq
from config import get_settings
from db import crud
from db.models import Lead

logger = logging.getLogger(__name__)
settings = get_settings()


def _get_client() -> AsyncGroq:
    return AsyncGroq(api_key=settings.groq_api_key)


async def _call_llm(prompt: str) -> str:
    client = _get_client()
    response = await client.chat.completions.create(
        model=settings.groq_model,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.4,
        max_tokens=600,
    )
    return response.choices[0].message.content.strip()


async def generate_acknowledgement_draft(db, lead: Lead, to_email: str):
    """Generate an acknowledgement email draft for a new lead."""
    prompt = f"""Write a professional business acknowledgement email for the following request.
Keep it concise, warm, and professional. Include:
- Thank the sender for reaching out
- Acknowledge receipt of the {lead.type} for {lead.project_name or 'the project'}
- Mention the team will review and respond within 2 business days
- Include a professional sign-off

Client: {lead.client_name or 'Valued Client'}
Project/Role: {lead.project_name or lead.role or 'N/A'}
Contact: {lead.contact_person or 'Team'}

Return ONLY the email body (no subject line, no markdown)."""

    try:
        body = await _call_llm(prompt)
        subject = f"Re: {lead.type} Acknowledgement – {lead.project_name or lead.role or 'Your Request'}"
        await crud.create_draft(db, {
            "lead_id": lead.id,
            "to_email": to_email,
            "subject": subject,
            "body": body,
            "draft_type": "acknowledgement",
        })
        logger.info("Generated acknowledgement draft for lead %s", lead.lead_id)
    except Exception as e:
        logger.error("Draft generation failed: %s", e)


async def generate_followup_draft(db, lead: Lead) -> None:
    """Generate a follow-up email draft."""
    prompt = f"""Write a professional follow-up email for a {lead.type} submission.
The follow-up should:
- Remind the client about the submitted proposal/response
- Express continued interest
- Ask for an update on the review process
- Be polite and concise (under 150 words)

Client: {lead.client_name or 'Valued Client'}
Project: {lead.project_name or lead.role or 'N/A'}
Deadline was: {lead.submission_deadline.strftime('%B %d, %Y') if lead.submission_deadline else 'recently'}

Return ONLY the email body."""

    try:
        body = await _call_llm(prompt)
        subject = f"Follow-up: {lead.type} – {lead.project_name or lead.role or 'Our Submission'}"
        contact_email = lead.contact_email or ""
        await crud.create_draft(db, {
            "lead_id": lead.id,
            "to_email": contact_email,
            "subject": subject,
            "body": body,
            "draft_type": "follow_up",
        })
        logger.info("Generated follow-up draft for lead %s", lead.lead_id)
    except Exception as e:
        logger.error("Follow-up draft generation failed: %s", e)
