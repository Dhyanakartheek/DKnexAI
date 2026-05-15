# AI Email Automation Agent

An AI-powered desktop agent that monitors your Zoho inbox, classifies incoming RFPs/RFIs/JDs using Groq LLM, creates leads, assigns tasks, and automates follow-ups.

## Quick Start

### 1. Configure environment
```
copy .env.example .env
```
Edit `.env` with:
- `GROQ_API_KEY` — from [console.groq.com](https://console.groq.com)
- `EMAIL_ADDRESS` + `EMAIL_PASSWORD` — your Zoho mail credentials
- `APP_SECRET_KEY` — any long random string

### 2. Run (Windows)
```
start.bat
```
Or manually:
```bash
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

### 3. Open Dashboard
Navigate to **http://localhost:8080**

Default login: `admin@company.com` / `Admin@123!`

---

## Features

| Feature | Status |
|---|---|
| IMAP Email Monitoring (Zoho) | ✅ |
| LLM Classification (RFP/RFI/JD) | ✅ |
| Auto Lead Creation | ✅ |
| Data Extraction (client, skills, deadline) | ✅ |
| Task Assignment & Routing | ✅ |
| Email Draft Generation | ✅ |
| Human-in-the-loop Approval | ✅ |
| Deadline Reminders | ✅ |
| Follow-up Automation | ✅ |
| Excel Report Export | ✅ |
| PDF Report Export | ✅ |
| JWT Authentication | ✅ |
| Activity Audit Log | ✅ |
| Dashboard UI | ✅ |

## Architecture

```
Agent_email/
├── main.py              # FastAPI app + lifespan
├── config.py            # Settings (env vars)
├── core/
│   ├── classifier.py    # Groq LLM classification + extraction
│   ├── email_monitor.py # IMAP inbox poller
│   ├── draft_generator.py # LLM email draft generation
│   ├── task_router.py   # Skill-based stakeholder routing
│   ├── follow_up.py     # SMTP sending + reminders
│   ├── scheduler.py     # APScheduler background jobs
│   └── reporter.py      # Excel + PDF reports
├── db/
│   ├── models.py        # SQLAlchemy ORM models
│   ├── database.py      # Async session
│   └── crud.py          # CRUD operations
├── api/
│   ├── auth_utils.py    # JWT + bcrypt
│   └── routes/          # FastAPI routers
└── frontend/            # HTML/CSS/JS dashboard
```

## Adding Stakeholders
After logging in, use the **Register** endpoint to add team members:
```
POST /api/auth/register
{ "name": "John", "email": "john@co.com", "password": "...", "skills": "python,ml,nlp" }
```
Leads will be auto-routed to the best skill match.
