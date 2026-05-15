import logging
import sys
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from models.schemas import CodeRequest, CodeResponse, HealthResponse, InlineRequest, InlineResponse, RunRequest, RunResponse
from services.code_assistant import code_assistant
from services.inline_service import inline_service
from services.execution_service import execution_service
from services.groq_service import groq_service
from config.settings import settings

# ── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger(__name__)

# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="DKnex AI — Code Assistant Agent",
    description=(
        "Production-ready code assistant powered by Groq. "
        "Supports code generation, debugging, explanation, optimization, and conversion."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/health", response_model=HealthResponse, tags=["System"])
async def health_check():
    """Liveness probe — returns service status and active model."""
    return HealthResponse(
        status="healthy",
        version="1.0.0",
        model=settings.GROQ_MODEL,
    )


@app.post("/code-assist", response_model=CodeResponse, tags=["Code Assistant"])
async def code_assist(request: CodeRequest):
    """
    Primary endpoint for all code assistant tasks.

    **Intent values:**
    - `generate`  → produce working code from a description
    - `debug`     → find bugs and return the fixed version
    - `explain`   → step-by-step breakdown of code
    - `optimize`  → refactor for performance / readability
    - `convert`   → translate code to another language

    Pass `language` to hint the target/source programming language.
    Pass `session_id` to maintain multi-turn conversation context.
    """
    try:
        logger.info(f"POST /code-assist | intent={request.intent} | session={request.session_id}")
        response = await code_assistant.run(request)
        return response
    except Exception as exc:
        logger.error(f"Error in /code-assist: {exc}")
        raise HTTPException(status_code=500, detail=str(exc))

@app.post("/inline-fix", response_model=InlineResponse, tags=["Code Assistant"])
async def inline_fix(request: InlineRequest):
    """
    Analyzes a specific line of code within a document context and suggests inline corrections.
    Returns JSON with `has_suggestion`, `suggested_line`, and `explanation`.
    """
    try:
        logger.info(f"POST /inline-fix | line={request.line_number}")
        response = await inline_service.analyze_inline(request)
        return response
    except Exception as exc:
        logger.error(f"Error in /inline-fix: {exc}")
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/run-code", response_model=RunResponse, tags=["Code Assistant"])
async def run_code(request: RunRequest):
    """
    Executes the provided code snippet locally and returns stdout/stderr.
    Only supports Python for now.
    """
    try:
        logger.info(f"POST /run-code | language={request.language}")
        response = await execution_service.run_code(request)
        return response
    except Exception as exc:
        logger.error(f"Error in /run-code: {exc}")
        raise HTTPException(status_code=500, detail=str(exc))


@app.delete("/session/{session_id}", tags=["System"])
async def clear_session(session_id: str):
    """
    Clear the conversation history for a given session_id.
    Useful when the user starts a fresh task.
    """
    cleared = groq_service.clear_session(session_id)
    if cleared:
        return {"message": f"Session '{session_id}' cleared successfully."}
    return {"message": f"Session '{session_id}' not found (nothing to clear)."}


# ── Entry point ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=settings.PORT,
        reload=True,
        log_level=settings.LOG_LEVEL.lower(),
    )
