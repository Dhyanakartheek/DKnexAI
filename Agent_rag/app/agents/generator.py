from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
import os

class ResponseGenerator:
    def __init__(self):
        # We can use a local model or OpenAI. 
        # Using a placeholder model, in production this would be set properly.
        # Make sure OPENAI_API_KEY is available in the environment variables.
        self.llm = ChatGroq(
            temperature=0.2, 
            model_name="llama3-8b-8192", 
            api_key=os.getenv("GROQ_API_KEY")
        )
        
    def generate(self, domain: str, query: str, context: str) -> str:
        sys_msg = (
            "You are an expert autonomous agent specializing in {domain}. "
            "Provide clear, actionable, and domain-specific advice based ONLY on the provided context.\n"
        )
        if domain == "ayurveda":
            sys_msg += (
                "SAFETY CONSTRAINTS: Do NOT provide medical dosages. Do NOT claim disease cures. "
                "Keep responses general, safe, and lifestyle-focused. Include a brief medical disclaimer.\n"
                "Format as:\n"
                "🌿 Ayurveda Suggestions:\n"
                "- Diet:\n"
                "- Remedies:\n"
                "- Lifestyle:\n"
            )
        sys_msg += "\nContext:\n{context}"
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", sys_msg),
            ("user", "{query}")
        ])
        
        chain = prompt | self.llm | StrOutputParser()
        return chain.invoke({"domain": domain, "query": query, "context": context})
