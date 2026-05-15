from pydantic import BaseModel, Field
from typing import Optional, List

class AgentRequest(BaseModel):
    input: str = Field(..., description="User message to the agent")
    agent_type: Optional[str] = Field("chat", description="Type of agent: chat, code, or automation")
    session_id: Optional[str] = Field("default", description="Optional session ID for memory tracking")

class AgentResponse(BaseModel):
    output: str = Field(..., description="AI response content")
    agent_type: str = Field(..., description="The type of agent that processed the request")

class HealthResponse(BaseModel):
    status: str
    version: str
