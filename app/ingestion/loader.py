import os
import pandas as pd
from typing import List, Dict, Any
from langchain_community.document_loaders import PyPDFLoader, TextLoader, CSVLoader
from langchain_core.documents import Document
from langchain.text_splitter import RecursiveCharacterTextSplitter

class DocumentIngestor:
    def __init__(self, chunk_size: int = 1000, chunk_overlap: int = 200):
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            separators=["\n\n", "\n", ".", " ", ""]
        )

    def load_document(self, file_path: str) -> List[Document]:
        """Loads a document based on its extension."""
        ext = os.path.splitext(file_path)[1].lower()
        if ext == ".pdf":
            loader = PyPDFLoader(file_path)
            docs = loader.load()
        elif ext == ".txt":
            loader = TextLoader(file_path, encoding='utf-8')
            docs = loader.load()
        elif ext == ".csv":
            loader = CSVLoader(file_path)
            docs = loader.load()
        else:
            raise ValueError(f"Unsupported file format: {ext}")
        
        # Add basic metadata if missing
        doc_name = os.path.basename(file_path)
        for d in docs:
            d.metadata['document_name'] = doc_name
            if 'page' in d.metadata:
                d.metadata['page_number'] = d.metadata['page']
            d.metadata['document_type'] = ext.replace('.', '')
            
            # Simple heuristic for section title
            lines = d.page_content.split('\n')
            d.metadata['section_title'] = lines[0][:50] if lines else "Unknown"

        return docs

    def process_and_chunk(self, file_path: str) -> List[Document]:
        """Loads a document and splits it into chunks."""
        docs = self.load_document(file_path)
        chunks = self.text_splitter.split_documents(docs)
        return chunks
