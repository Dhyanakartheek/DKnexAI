import logging
from services.groq_service import groq_service
from models.schemas import AgentRequest, AgentResponse

logger = logging.getLogger(__name__)

class AgentManager:
    def __init__(self):
        formatting_rules = """
Return ONLY valid JSON. No extra text. Do NOT include markdown formatting like ```json.
Ensure your answer is highly detailed, informative, and comprehensive.

{
  "title": "Descriptive and engaging title",
  "direct_answer": "A comprehensive, detailed explanation containing at least 4-6 sentences. Provide deep context.",
  "key_points": ["Detailed point 1", "Detailed point 2", "Detailed point 3", "Detailed point 4", "Detailed point 5"],
  "tips": ["Actionable tip 1", "Actionable tip 2", "Actionable tip 3", "Actionable tip 4", "Actionable tip 5"],
  "code": "Optional code snippet if relevant. Leave as empty string if no code is requested. Do NOT wrap in markdown backticks."
}
"""
        # Define system prompts for different agent types
        self.prompts = {
            "chat": "You are a helpful AI assistant for the DKnex AI platform.\n" + formatting_rules,
            "code": "You are an expert software engineer. Provide high-quality code solutions and explanations.\n" + formatting_rules,
            "automation": "You are an automation expert. Help the user design and implement efficient workflows.\n" + formatting_rules
        }

    async def run_agent(self, request: AgentRequest) -> AgentResponse:
        agent_type = request.agent_type.lower() if request.agent_type else "chat"
        
        # Determine the system prompt based on agent type
        system_prompt = self.prompts.get(agent_type, self.prompts["chat"])
        
        logger.info(f"Processing '{agent_type}' request: {request.input[:50]}...")
        
        import json
        
        # Execute the request via Groq service
        output = await groq_service.call_groq(
            user_input=request.input,
            system_prompt=system_prompt,
            session_id=request.session_id
        )
        
        # Extract and parse JSON
        raw_content = output.strip()
        start_idx = raw_content.find('{')
        end_idx = raw_content.rfind('}')
        
        if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
            json_str = raw_content[start_idx:end_idx+1]
        else:
            json_str = raw_content
            
        try:
            data = json.loads(json_str)
            
            # Clean data
            if "key_points" in data and isinstance(data["key_points"], list):
                data["key_points"] = list(dict.fromkeys(data["key_points"]))[:5]
            else:
                data["key_points"] = []
                
            if "tips" in data and isinstance(data["tips"], list):
                data["tips"] = list(dict.fromkeys(data["tips"]))[:5]
            else:
                data["tips"] = []
                
            if "title" not in data:
                data["title"] = "System Response"
                
            if "code" not in data:
                data["code"] = ""
                
            final_output = json.dumps(data)
        except json.JSONDecodeError:
            # Safe parse fallback
            fallback_data = {
                "title": "System Response",
                "direct_answer": output,
                "key_points": [],
                "tips": [],
                "code": ""
            }
            final_output = json.dumps(fallback_data)
        
        return AgentResponse(
            output=final_output,
            agent_type=agent_type
        )

agent_manager = AgentManager()
