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

def ask_rag(query: str) -> str:
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
You are an expert AI assistant.

Use ONLY the context below. If the answer is not in the context, say "I don't have enough information to answer that."

Context:
{context}

Question:
{query}

Answer clearly with:
- Direct answer
- Key points
- Practical tips
"""
        
        # Step 4: Generate
        response = llm.invoke(prompt)
        return response.content
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
