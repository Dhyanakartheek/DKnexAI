import logging
import sys
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from models.schemas import AgentRequest, AgentResponse, HealthResponse
from services.agent_manager import agent_manager
from config.settings import settings

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="DKnex AI Agent Service",
    description="Production-ready Python service for AI agent execution",
    version="1.0.0"
)

# Enable CORS for frontend/backend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Check the health status of the service."""
    return HealthResponse(status="healthy", version="1.0.0")

@app.post("/run-agent", response_model=AgentResponse)
async def run_agent(request: AgentRequest):
    """
    Primary endpoint to run an AI agent.
    Receives user input and agent type, routes to Groq LLM, and returns response.
    """
    try:
        logger.info(f"Received request: {request.model_dump()}")
        response = await agent_manager.run_agent(request)
        logger.info(f"Returning response for session: {request.session_id}")
        return response
    except Exception as e:
        logger.error(f"Error processing request: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    # In production, use environment variables to configure host/port
    uvicorn.run(app, host="0.0.0.0", port=8000)
