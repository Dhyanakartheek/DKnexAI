import os
import logging
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI
app = FastAPI(title="RAG Application")

# Add CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize RAG components globally
rag_error = None
try:
    from langchain_groq import ChatGroq
    from app.retriever.vector_db import vector_db
    
    # Initialize LLM
    llm = ChatGroq(
        model="llama-3.1-8b-instant",
        temperature=0
    )

    # Initialize Retriever
    retriever = vector_db.as_retriever(search_kwargs={"k": 4})
    rag_initialized = True
except Exception as e:
    import traceback
    error_msg = f"Error initializing RAG components: {e}\n{traceback.format_exc()}"
    logger.error(error_msg)
    with open("init_error.log", "w") as f:
        f.write(error_msg)
    rag_error = traceback.format_exc()
    rag_initialized = False

@app.get("/debug_error")
def debug_error():
    return {"rag_initialized": rag_initialized, "error": rag_error}

class QueryRequest(BaseModel):
    question: str

class QueryResponse(BaseModel):
    answer: str

def is_greeting(query: str) -> bool:
    greetings = ["hi", "hello", "hey", "good morning", "good evening", "greetings"]
    return query.lower().strip() in greetings

def ask_rag(query: str) -> str:
    if is_greeting(query):
        import json
        return json.dumps({
            "title": "Welcome",
            "direct_answer": "Hi! How can I help you today?",
            "key_points": [],
            "tips": []
        })

    if not rag_initialized:
        raise Exception("RAG components are not properly initialized. Check your configuration and environment variables.")
        
    try:
        # Step 1: Retrieve
        docs = retriever.invoke(query)
        
        # Step 2: Build context
        context = "\n\n".join([doc.page_content for doc in docs])
        
        if not context.strip():
            return "I could not find relevant information in the provided context to answer your question."
            
        # Step 3: Prompt
        prompt = f"""
Return ONLY valid JSON. No extra text. Ensure your answer is highly detailed, informative, and comprehensive.

{{
  "title": "Descriptive and engaging title",
  "direct_answer": "A comprehensive, detailed explanation containing at least 4-6 sentences. Provide deep context.",
  "key_points": ["Detailed point 1", "Detailed point 2", "Detailed point 3", "Detailed point 4", "Detailed point 5"],
  "tips": ["Actionable tip 1", "Actionable tip 2", "Actionable tip 3", "Actionable tip 4", "Actionable tip 5"]
}}

Context:
{context}

Question:
{query}
"""
        
        # Step 4: Generate
        response = llm.invoke(prompt)
        
        import json
        try:
            # Clean up potential markdown formatting and extra text from LLM
            raw_content = response.content.strip()
            
            # Extract just the JSON part (from first { to last })
            start_idx = raw_content.find('{')
            end_idx = raw_content.rfind('}')
            
            if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
                json_str = raw_content[start_idx:end_idx+1]
            else:
                json_str = raw_content
                
            # Parse and clean data
            data = json.loads(json_str)
            
            # Clean data
            if "key_points" in data and isinstance(data["key_points"], list):
                data["key_points"] = list(dict.fromkeys(data["key_points"]))[:10]
            else:
                data["key_points"] = []
                
            if "tips" in data and isinstance(data["tips"], list):
                data["tips"] = list(dict.fromkeys(data["tips"]))[:10]
            else:
                data["tips"] = []
                
            if "title" not in data:
                data["title"] = "Answer"
                
            return json.dumps(data)
            
        except json.JSONDecodeError:
            # Safe parse fallback
            fallback_data = {
                "title": "Answer",
                "direct_answer": response.content,
                "key_points": [],
                "tips": []
            }
            return json.dumps(fallback_data)
    except Exception as e:
        logger.error(f"RAG Error: {e}")
        raise e

@app.post("/ask", response_model=QueryResponse)
async def ask_endpoint(request: QueryRequest):
    try:
        if not request.question or not request.question.strip():
            raise HTTPException(status_code=400, detail="Question cannot be empty.")
            
        answer = ask_rag(request.question)
        
        if not answer:
            answer = "Sorry, I could not generate an answer at this time. Please try again."
            
        return QueryResponse(answer=answer)
    except Exception as e:
        logger.error(f"Error processing request: {str(e)}")
        # Error handling: return fallback message on error
        return QueryResponse(answer=f"Sorry, an error occurred while processing your request. Error details: {str(e)}")

@app.get("/")
def read_root():
    return {"status": "Backend API is running. Use the /ask POST endpoint to submit questions."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8002, reload=True)
