import subprocess
import tempfile
import os
import sys
from models.schemas import RunRequest, RunResponse

class ExecutionService:
    async def run_code(self, request: RunRequest) -> RunResponse:
        if request.language.lower() != "python":
            return RunResponse(
                stdout="",
                stderr=f"Execution for {request.language} is not supported yet.",
                exit_code=1
            )

        # Create a temporary file to hold the code
        with tempfile.NamedTemporaryFile(suffix=".py", delete=False, mode="w", encoding="utf-8") as tmp:
            tmp.write(request.code)
            tmp_path = tmp.name

        try:
            # Run the code using the current python interpreter
            result = subprocess.run(
                [sys.executable, tmp_path],
                capture_output=True,
                text=True,
                timeout=10 # Prevent infinite loops
            )
            return RunResponse(
                stdout=result.stdout,
                stderr=result.stderr,
                exit_code=result.returncode
            )
        except subprocess.TimeoutExpired:
            return RunResponse(
                stdout="",
                stderr="Error: Execution timed out (exceeded 10s limit).",
                exit_code=124
            )
        except Exception as e:
            return RunResponse(
                stdout="",
                stderr=f"Execution Error: {str(e)}",
                exit_code=1
            )
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)

execution_service = ExecutionService()
