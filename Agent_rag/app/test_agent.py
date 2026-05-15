import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

from langchain_groq import ChatGroq
from app.retriever.vector_db import vector_db

# LLM
llm = ChatGroq(
    model="llama-3.1-8b-instant",
    temperature=0
)

# Retriever
retriever = vector_db.as_retriever(search_kwargs={"k": 4})


def ask(query):
    print("\nQuery:", query)

    # Step 1: Retrieve
    docs = retriever.invoke(query)

    print(f"\nRetrieved {len(docs)} docs")

    # Step 2: Build context
    context = "\n\n".join([doc.page_content for doc in docs])

    # Step 3: Prompt
    prompt = f"""
You are an expert AI assistant.

Use ONLY the context below.

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

    print("\nAnswer:\n", response.content)


if __name__ == "__main__":
    ask("What is Pitta imbalance?")