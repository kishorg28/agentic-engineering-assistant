import os
import json
import sqlite3
from typing import List
from dotenv import load_dotenv
from langchain_community.embeddings import HuggingFaceInferenceAPIEmbeddings
from langchain_core.documents import Document

# Load env variables so we can fetch API keys
load_dotenv()

class VectorStoreService:
    def __init__(self, persist_directory: str = "./data/sqlite_vs", collection_name: str = "engineering_docs"):
        self.persist_directory = persist_directory
        self.collection_name = collection_name
        
        # Ensure directories exist
        os.makedirs(self.persist_directory, exist_ok=True)
        self.db_path = os.path.join(self.persist_directory, f"{self.collection_name}.db")
        
        # Use Hugging Face Inference API with fallback key if HUGGINGFACEHUB_API_TOKEN is not in env,
        # to avoid initialization / validation crashes during startup or testing.
        huggingface_token = os.getenv("HUGGINGFACEHUB_API_TOKEN") or "dummy_token"
        
        self.embeddings = HuggingFaceInferenceAPIEmbeddings(
            api_key=huggingface_token,
            model_name="sentence-transformers/all-MiniLM-L6-v2"
        )
        
        # Initialize SQLite database
        self._init_db()

    def _init_db(self):
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS documents (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    page_content TEXT NOT NULL,
                    metadata TEXT NOT NULL,
                    embedding TEXT NOT NULL
                )
            """)
            conn.commit()

    def add_documents(self, documents: List[Document]):
        """Adds documents to the vector store by generating and storing their embeddings."""
        if not documents:
            return
        
        # Compute embeddings for all document contents in one batch
        texts = [doc.page_content for doc in documents]
        embeddings = self.embeddings.embed_documents(texts)
        
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            for doc, emb in zip(documents, embeddings):
                meta_json = json.dumps(doc.metadata)
                emb_json = json.dumps(emb)
                cursor.execute(
                    "INSERT INTO documents (page_content, metadata, embedding) VALUES (?, ?, ?)",
                    (doc.page_content, meta_json, emb_json)
                )
            conn.commit()

    def search(self, query: str, k: int = 5) -> List[Document]:
        """Searches the vector store for relevant documents using Cosine Similarity."""
        # Get query embedding
        query_emb = self.embeddings.embed_query(query)
        
        # Fetch all documents
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT page_content, metadata, embedding FROM documents")
            rows = cursor.fetchall()
        
        if not rows:
            return []
            
        # Compute cosine similarity
        results = []
        for page_content, metadata_str, embedding_str in rows:
            doc_emb = json.loads(embedding_str)
            
            # Cosine similarity in pure Python
            dot_product = sum(q * d for q, d in zip(query_emb, doc_emb))
            mag_q = sum(q * q for q in query_emb) ** 0.5
            mag_d = sum(d * d for d in doc_emb) ** 0.5
            
            similarity = dot_product / (mag_q * mag_d) if (mag_q and mag_d) else 0.0
            
            results.append((similarity, page_content, metadata_str))
            
        # Sort by similarity in descending order
        results.sort(key=lambda x: x[0], reverse=True)
        
        # Return top k as LangChain Documents
        return [
            Document(page_content=content, metadata=json.loads(meta))
            for _, content, meta in results[:k]
        ]
    
    def get_retriever(self, k: int = 5):
        """Returns a helper object that exposes get_relevant_documents."""
        class SimpleRetriever:
            def __init__(self, search_fn, k_val):
                self.search_fn = search_fn
                self.k = k_val
            def get_relevant_documents(self, query_str: str) -> List[Document]:
                return self.search_fn(query_str, k=self.k)
        return SimpleRetriever(self.search, k)
