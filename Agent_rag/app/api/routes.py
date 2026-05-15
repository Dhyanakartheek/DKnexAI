from fastapi import APIRouter
from pydantic import BaseModel
from app.graph.workflow import MultiDomainAgentFlow

router = APIRouter()
agent_flow = MultiDomainAgentFlow()

class QueryRequest(BaseModel):
    query: str

class QueryResponse(BaseModel):
    response: str
    
@router.post("/chat", response_model=QueryResponse)
async def chat_endpoint(request: QueryRequest):
    response = agent_flow.run(request.query)
    return QueryResponse(response=response)
