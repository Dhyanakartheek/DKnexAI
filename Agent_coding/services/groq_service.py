import logging
from typing import Optional, Dict, List
from groq import AsyncGroq
from config.settings import settings

logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────────────────────────────────────
# Master system prompt — behaves like GitHub Copilot + Senior Engineer
# ──────────────────────────────────────────────────────────────────────────────
CODE_ASSISTANT_SYSTEM_PROMPT = """
You are an advanced Code Assistant AI Agent for the DKnex AI platform.
You behave like a senior software engineer with production-level experience.

CORE CAPABILITIES
Generate clean, production-ready code, debug and fix errors precisely, explain code step-by-step, optimize and refactor, and convert code between languages.

STRICT FORMATTING RULES:

Return ONLY valid JSON. No extra text. Do NOT include markdown formatting like ```json.

{
  "title": "Short descriptive title (e.g., Code Generation, Debugging, Explanation)",
  "direct_answer": "Clear, concise direct answer to the user's prompt",
  "key_points": ["point 1", "point 2"],
  "tips": ["tip 1", "tip 2"],
  "code": "Optional code snippet if relevant. Leave as empty string if no code is requested. Do NOT wrap in markdown backticks."
}
""".strip()

# Intent-specific prefixes to sharpen the model response
INTENT_PREFIXES: Dict[str, str] = {
    "generate":  "Generate clean, production-ready code for the following request:",
    "debug":     "Debug the following code. Identify the exact problem, show the fixed version, and explain what changed:",
    "explain":   "Explain the following code step-by-step using numbered steps:",
    "optimize":  "Optimize the following code for performance and readability. Show the improved version and explain why it's better:",
    "convert":   "Convert the following code to the requested language. Preserve logic exactly and note key differences:",
}

class GroqService:
    """Thin wrapper around Groq SDK for code-assistant sessions."""

    def __init__(self):
        self._client = AsyncGroq(api_key=settings.GROQ_API_KEY)
        # Per-session chat history: session_id → list of message dicts
        self._sessions: Dict[str, List[Dict[str, str]]] = {}
        logger.info(f"GroqService initialised with model: {settings.GROQ_MODEL}")

    def _get_session_messages(self, session_id: str) -> List[Dict[str, str]]:
        """Return existing chat session messages or create a new one."""
        if session_id not in self._sessions:
            self._sessions[session_id] = [
                {"role": "system", "content": CODE_ASSISTANT_SYSTEM_PROMPT}
            ]
            logger.debug(f"Created new chat session: {session_id}")
        return self._sessions[session_id]

    async def call_groq(
        self,
        user_input: str,
        intent: str = "generate",
        language: Optional[str] = None,
        session_id: str = "default",
    ) -> str:
        """Send a message to Groq and return the formatted response."""
        # Build the final prompt
        prefix = INTENT_PREFIXES.get(intent, INTENT_PREFIXES["generate"])
        lang_hint = f"\nTarget language: {language}" if language else ""
        full_prompt = f"{prefix}{lang_hint}\n\n{user_input}"

        logger.info(f"[{session_id}] intent={intent} | prompt_len={len(full_prompt)}")

        messages = self._get_session_messages(session_id)
        messages.append({"role": "user", "content": full_prompt})

        try:
            response = await self._client.chat.completions.create(
                messages=messages,
                model=settings.GROQ_MODEL,
                temperature=0.5,
                max_tokens=2048,
            )
            
            assistant_message = response.choices[0].message.content
            # Append assistant response to history
            messages.append({"role": "assistant", "content": assistant_message})
            
            return assistant_message
            
        except Exception as exc:
            logger.error(f"Groq API error: {exc}")
            raise RuntimeError(f"Groq API error: {exc}") from exc

    def clear_session(self, session_id: str) -> bool:
        """Wipe conversation history for a session."""
        if session_id in self._sessions:
            del self._sessions[session_id]
            logger.info(f"Cleared session: {session_id}")
            return True
        return False

# Singleton
groq_service = GroqService()
