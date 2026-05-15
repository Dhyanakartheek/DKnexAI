import httpx
import logging
from typing import List, Dict
from config.settings import settings

logger = logging.getLogger(__name__)

class GroqService:
    def __init__(self):
        self.api_url = settings.GROQ_API_URL
        self.api_key = settings.GROQ_API_KEY
        self.model = settings.GROQ_MODEL
        self.timeout = settings.TIMEOUT
        
        # Simple in-memory storage for conversation context
        # In production, use Redis or a database
        # Structure: {session_id: [message1, message2, ...]}
        self._memory: Dict[str, List[Dict[str, str]]] = {}

    def _get_headers(self) -> Dict[str, str]:
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

    def _update_memory(self, session_id: str, role: str, content: str):
        if session_id not in self._memory:
            self._memory[session_id] = []
        
        self._memory[session_id].append({"role": role, "content": content})
        
        # Keep only the last 4 messages (2 user + 2 assistant pairs) for "bonus memory: last 2 messages"
        # User requested last 2 messages, which typically means 1 round trip or just 2 history items.
        # I'll keep 4 items to ensure we have context.
        if len(self._memory[session_id]) > 4:
            self._memory[session_id] = self._memory[session_id][-4:]

    async def call_groq(self, user_input: str, system_prompt: str, session_id: str = "default") -> str:
        # Prepare messages
        messages = [{"role": "system", "content": system_prompt}]
        
        # Add historical context if available
        if session_id in self._memory:
            messages.extend(self._memory[session_id])
            
        # Add current user message
        messages.append({"role": "user", "content": user_input})
        
        payload = {
            "model": self.model,
            "messages": messages
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                logger.info(f"Calling Groq API for session {session_id}")
                response = await client.post(
                    self.api_url,
                    headers=self._get_headers(),
                    json=payload
                )
                
                response.raise_for_status()
                data = response.json()
                
                ai_response = data["choices"][0]["message"]["content"]
                
                # Update memory
                self._update_memory(session_id, "user", user_input)
                self._update_memory(session_id, "assistant", ai_response)
                
                return ai_response

        except httpx.HTTPStatusError as e:
            logger.error(f"Groq API Error: {e.response.status_code} - {e.response.text}")
            raise Exception(f"Groq API failed with status {e.response.status_code}")
        except httpx.TimeoutException:
            logger.error("Groq API request timed out")
            raise Exception("Request to AI service timed out")
        except Exception as e:
            logger.error(f"Unexpected error in GroqService: {str(e)}")
            raise Exception("An internal error occurred while communicating with the AI")

groq_service = GroqService()
