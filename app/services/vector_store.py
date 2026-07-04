import os
from typing import List
from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_core.documents import Document

class VectorStoreService:
    def __init__(self, persist_directory: str = "./data/chroma", collection_name: str = "engineering_docs"):
        self.persist_directory = persist_directory
        self.collection_name = collection_name
        self.embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
        
        # Initialize Chroma vector store
        self.vector_store = Chroma(
            collection_name=self.collection_name,
            embedding_function=self.embeddings,
            persist_directory=self.persist_directory
        )

    def add_documents(self, documents: List[Document]):
        """Adds documents to the vector store."""
        if not documents:
            return
        self.vector_store.add_documents(documents)

    def search(self, query: str, k: int = 5) -> List[Document]:
        """Searches the vector store for relevant documents."""
        # Using similarity search. Could also use max marginal relevance (MMR).
        return self.vector_store.similarity_search(query, k=k)
    
    def get_retriever(self, k: int = 5):
        """Returns a Langchain retriever."""
        return self.vector_store.as_retriever(search_kwargs={"k": k})
