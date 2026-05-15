@echo off
echo ============================================================
echo   AI Email Automation Agent — DKnex Intelligence
echo ============================================================

REM Copy .env.example to .env if not present
if not exist .env (
    copy .env.example .env
    echo [SETUP] Created .env from .env.example — please edit it!
    echo [SETUP] Add your GROQ_API_KEY and Email credentials.
    pause
)

REM Create virtualenv if not present
if not exist venv (
    echo [SETUP] Creating virtual environment...
    python -m venv venv
)

REM Activate and install
echo [SETUP] Installing dependencies...
call venv\Scripts\activate.bat
pip install -r requirements.txt --quiet

echo.
echo [START] Starting server at http://localhost:8080
echo [INFO]  Default login: admin@company.com / Admin@123!
echo [INFO]  Press Ctrl+C to stop
echo.

python main.py
pause
