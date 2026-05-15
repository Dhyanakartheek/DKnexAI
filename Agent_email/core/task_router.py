"""Task routing — assigns leads to stakeholders based on skills."""
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from db.models import User, Lead, Task
from db import crud

logger = logging.getLogger(__name__)


def _skill_overlap(required: str | None, user_skills: str | None) -> int:
    """Count overlapping skills between requirement and user."""
    if not required or not user_skills:
        return 0
    req = {s.strip().lower() for s in required.split(",")}
    usr = {s.strip().lower() for s in user_skills.split(",")}
    return len(req & usr)


async def route_lead_to_stakeholder(db: AsyncSession, lead: Lead) -> User | None:
    """Find the best-matching active stakeholder for a lead."""
    result = await db.execute(select(User).where(User.is_active == True))
    users = result.scalars().all()

    if not users:
        logger.warning("No active stakeholders found")
        return None

    # Score each user by skill overlap; fall back to round-robin (first user)
    scored = [(u, _skill_overlap(lead.skills, u.skills)) for u in users]
    scored.sort(key=lambda x: x[1], reverse=True)
    best_user = scored[0][0]

    # Assign lead
    lead.assigned_to = best_user.id
    await db.commit()

    # Create a task
    await crud.create_task(db, {
        "lead_id": lead.id,
        "title": f"Review & respond to {lead.type}: {lead.project_name or lead.role or lead.lead_id}",
        "description": f"Client: {lead.client_name}\nSkills: {lead.skills}\nDeadline: {lead.submission_deadline}",
        "assigned_to": best_user.id,
        "due_date": lead.submission_deadline,
        "status": "Pending",
    })

    logger.info("Routed lead %s to %s", lead.lead_id, best_user.email)
    return best_user
