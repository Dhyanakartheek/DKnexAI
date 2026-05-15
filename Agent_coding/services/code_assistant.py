import logging
from models.schemas import CodeRequest, CodeResponse
from services.groq_service import groq_service

logger = logging.getLogger(__name__)


class CodeAssistantManager:
    """
    Orchestrates incoming CodeRequests → GeminiService → CodeResponse.

    Detects intent from the request and delegates to the Gemini service
    which applies the correct prompt prefix and maintains session history.
    """

    async def run(self, request: CodeRequest) -> CodeResponse:
        intent = (request.intent or "generate").lower()
        session_id = request.session_id or "default"

        logger.info(
            f"[{session_id}] Running code assistant | intent={intent} "
            f"| language={request.language} | input_len={len(request.input)}"
        )

        import json
        
        output = await groq_service.call_groq(
            user_input=request.input,
            intent=intent,
            language=request.language,
            session_id=session_id,
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
                data["title"] = "Code Assistant"
                
            if "code" not in data:
                data["code"] = ""
                
            final_output = json.dumps(data)
        except json.JSONDecodeError:
            # Safe parse fallback
            fallback_data = {
                "title": "Code Assistant",
                "direct_answer": output,
                "key_points": [],
                "tips": [],
                "code": ""
            }
            final_output = json.dumps(fallback_data)

        return CodeResponse(
            output=final_output,
            intent=intent,
            session_id=session_id,
        )


code_assistant = CodeAssistantManager()
