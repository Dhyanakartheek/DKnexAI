print("SCRIPT STARTED")

from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document

from app.retriever.vector_db import VectorDBManager

def classify_subdomain(text):
    t = text.lower()

    if "diet" in t or "food" in t or "eat" in t:
        return "diet"
    elif "herb" in t or "remedy" in t or "treatment" in t:
        return "remedy"
    elif "routine" in t or "sleep" in t:
        return "lifestyle"
    elif "vata" in t or "pitta" in t or "kapha" in t:
        return "body_type"
    else:
        return "general"


def run_ingestion():
    print("Loading PDF...")

    loader = PyPDFLoader("app/data/raw/AyurvedaEncyclopedia.pdf.pdf")
    docs = loader.load()[660:690]   

    print(f"Loaded {len(docs)} pages")

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=300,
        chunk_overlap=50
    )

    chunks = splitter.split_documents(docs)

    print(f"Created {len(chunks)} chunks")

    processed_docs = []

    for doc in chunks:
        text = doc.page_content.strip()

        if len(text) < 50:
            continue

        subdomain = classify_subdomain(text)

        processed_docs.append(Document(
            page_content=text[:300],   # keep it short for now
            metadata={
                "domain": "ayurveda",
                "subdomain": subdomain
            }
        ))

    print(f"Processed {len(processed_docs)} docs")

    vector_db = VectorDBManager()
    vector_db.add_documents(processed_docs)

    print("DONE: Data added to vector DB")


if __name__ == "__main__":
    run_ingestion()