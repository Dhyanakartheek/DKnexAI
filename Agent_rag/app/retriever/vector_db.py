import os
from typing import List
from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_core.documents import Document

class VectorDBManager:
    def __init__(self, db_path="app/data/faiss_index"):
        self.db_path = db_path
        self.embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
        self.vector_store = None
        
        if os.path.exists(self.db_path):
            self.vector_store = FAISS.load_local(self.db_path, self.embeddings, allow_dangerous_deserialization=True)
            
    def initialize_db(self, documents: List[Document]):
        """Initialize and save the vector DB."""
        self.vector_store = FAISS.from_documents(documents, self.embeddings)
        self.vector_store.save_local(self.db_path)
        
    def add_documents(self, documents: List[Document]):
        if self.vector_store is None:
            self.initialize_db(documents)
        else:
            self.vector_store.add_documents(documents)
            self.vector_store.save_local(self.db_path)
            
    def retrieve(self, query: str, domain: str, k: int = 3) -> List[Document]:
        """Retrieve using metadata filtering."""
        if self.vector_store is None:
            return []
            
        # FAISS supports filtering with dict. E.g., filter={"domain": domain}
        search_kwargs = {"k": k, "filter": {"domain": domain}}
        retriever = self.vector_store.as_retriever(search_kwargs=search_kwargs)
        return retriever.invoke(query)

# Create a singleton instance and export the raw FAISS vector store
vector_db_manager = VectorDBManager()
vector_db = vector_db_manager.vector_store
