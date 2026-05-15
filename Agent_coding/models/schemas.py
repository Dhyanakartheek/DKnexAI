from pydantic import BaseModel, Field
from typing import Optional, List, Literal

class CodeRequest(BaseModel):
    input: str = Field(..., description="User message / code task")
    intent: Optional[Literal["generate", "debug", "explain", "optimize", "convert"]] = Field(
        "generate", description="Intent: generate | debug | explain | optimize | convert"
    )
    language: Optional[str] = Field(None, description="Target programming language (e.g. python, java, js)")
    session_id: Optional[str] = Field("default", description="Session ID for conversation continuity")

class CodeResponse(BaseModel):
    output: str = Field(..., description="Formatted AI response with code and explanation")
    intent: str = Field(..., description="Detected or provided intent")
    session_id: str = Field(..., description="Session ID")

class HealthResponse(BaseModel):
    status: str
    version: str
    model: str

class InlineRequest(BaseModel):
    code: str = Field(..., description="The full code snippet from the editor")
    line_number: int = Field(..., description="1-indexed line number where the cursor is or where the error is suspected")
    language: str = Field("python", description="Programming language")

class InlineResponse(BaseModel):
    has_suggestion: bool = Field(..., description="True if a fix is suggested, False otherwise")
    original_line: Optional[str] = Field(None, description="The faulty line text")
    suggested_line: Optional[str] = Field(None, description="The corrected line text to replace the original")
    explanation: Optional[str] = Field(None, description="Short explanation of what was fixed")


class RunRequest(BaseModel):
    code: str = Field(..., description="The code to execute")
    language: str = Field("python", description="Programming language")

class RunResponse(BaseModel):
    stdout: str = Field(..., description="Standard output from execution")
    stderr: str = Field(..., description="Standard error from execution")
    exit_code: int = Field(..., description="Exit code of the process")
