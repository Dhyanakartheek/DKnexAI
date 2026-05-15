import logging
import json
from typing import Optional
from groq import AsyncGroq
from config.settings import settings
from models.schemas import InlineRequest, InlineResponse

logger = logging.getLogger(__name__)

INLINE_SYSTEM_PROMPT = """
You are an ultra-fast, highly accurate inline code linter and auto-completer.
Your job is to analyze the provided code, focus on the specified line number, and determine if there is a syntax error, logical flaw, or incomplete statement.

If there is an error or a highly obvious completion:
Return a JSON object matching this schema:
{
    "has_suggestion": true,
    "original_line": "the exact text of the faulty line",
    "suggested_line": "the exact text of the corrected line (matching indentation)",
    "explanation": "Short 1-sentence reason"
}

If the code on that line is correct and needs no changes:
Return:
{
    "has_suggestion": false
}

RULES:
1. ONLY return valid JSON. Do not return markdown blocks like ```json ... ```. Just the raw JSON string.
2. Ensure `suggested_line` preserves the exact original indentation (spaces/tabs).
3. Do not suggest major refactors, ONLY fix the specific line or complete the immediate statement.
"""

class InlineService:
    def __init__(self):
        self._client = AsyncGroq(api_key=settings.GROQ_API_KEY)
        
    async def analyze_inline(self, request: InlineRequest) -> InlineResponse:
        logger.info(f"Inline analysis requested for line {request.line_number} in {request.language}")
        
        # We'll split the code and mark the target line to help the model focus
        lines = request.code.split('\n')
        target_line_text = ""
        
        code_context = ""
        for i, line in enumerate(lines, 1):
            if i == request.line_number:
                target_line_text = line
                code_context += f">>> Line {i}: {line}\n"
            else:
                code_context += f"    Line {i}: {line}\n"
                
        user_prompt = f"Language: {request.language}\nTarget Line: {request.line_number}\n\nCode Context:\n{code_context}"
        
        try:
            response = await self._client.chat.completions.create(
                messages=[
                    {"role": "system", "content": INLINE_SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt}
                ],
                model=settings.GROQ_MODEL,
                temperature=0.1,  # Low temperature for deterministic corrections
                max_tokens=256,
                response_format={"type": "json_object"}
            )
            
            result_text = response.choices[0].message.content
            logger.debug(f"Inline raw response: {result_text}")
            
            data = json.loads(result_text)
            
            if data.get("has_suggestion"):
                return InlineResponse(
                    has_suggestion=True,
                    original_line=data.get("original_line", target_line_text),
                    suggested_line=data.get("suggested_line", ""),
                    explanation=data.get("explanation", "")
                )
            else:
                return InlineResponse(has_suggestion=False)
                
        except Exception as exc:
            logger.error(f"Groq API error in inline_service: {exc}")
            # Fail gracefully, no suggestion
            return InlineResponse(has_suggestion=False)

inline_service = InlineService()
