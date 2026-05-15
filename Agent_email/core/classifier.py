"""LLM-based email classification and data extraction using Groq."""
import json
import logging
from groq import AsyncGroq
from config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()
_client: AsyncGroq | None = None


def get_groq_client() -> AsyncGroq:
    global _client
    if _client is None:
        _client = AsyncGroq(api_key=settings.groq_api_key)
    return _client


CLASSIFICATION_PROMPT = """You are an expert email classifier for a business development team.
Analyze the email below and return a JSON object with the following structure:

{{
  "classification": "<RFP|RFI|JD|OTHER>",
  "confidence": <0.0-1.0>,
  "client_name": "<string or null>",
  "project_name": "<string or null>",
  "role": "<string or null>",
  "skills": "<comma-separated string or null>",
  "experience": "<string or null>",
  "submission_deadline": "<ISO 8601 date string or null>",
  "contact_person": "<string or null>",
  "contact_email": "<string or null>",
  "summary": "<1-2 sentence summary>"
}}

Classification rules:
- RFP: Request for Proposal — asking for a business proposal or quote
- RFI: Request for Information — asking for information about services/capabilities
- JD: Job Description — hiring/staffing requirement for a specific role
- OTHER: newsletters, marketing, spam, or anything that doesn't fit above

Email Subject: {subject}
Email From: {sender}
Email Body:
{body}

Return ONLY valid JSON, no markdown, no explanation."""


async def classify_and_extract(subject: str, sender: str, body: str) -> dict:
    """Classify email and extract structured data in one LLM call."""
    prompt = CLASSIFICATION_PROMPT.format(
        subject=subject or "(no subject)",
        sender=sender or "(unknown)",
        body=body[:4000] if body else "(empty)",
    )
    try:
        client = get_groq_client()
        response = await client.chat.completions.create(
            model=settings.groq_model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            max_tokens=800,
        )
        raw = response.choices[0].message.content.strip()
        # Strip markdown fences if present
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        data = json.loads(raw)
        return data
    except json.JSONDecodeError as e:
        logger.error("JSON parse error from LLM: %s", e)
        return {"classification": "OTHER", "confidence": 0.0, "summary": "Parse error"}
    except Exception as e:
        logger.error("LLM call failed: %s", e)
        return {"classification": "OTHER", "confidence": 0.0, "summary": str(e)}
