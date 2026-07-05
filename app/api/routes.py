from fastapi import APIRouter, UploadFile, File, HTTPException
import os
import shutil
import traceback
from app.models.schemas import QueryRequest, QueryResponse, IngestionResponse
from app.ingestion.loader import DocumentIngestor
from app.agents.graph import run_agent
from app.services.vector_store import VectorStoreService

router = APIRouter()
vector_store_service = VectorStoreService()
ingestor = DocumentIngestor()

UPLOAD_DIR = "./data/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload", response_model=IngestionResponse)
async def upload_file(file: UploadFile = File(...)):
    try:
        file_path = os.path.join(UPLOAD_DIR, file.filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        chunks = ingestor.process_and_chunk(file_path)
        vector_store_service.add_documents(chunks)
        
        return IngestionResponse(
            message=f"Successfully ingested {file.filename}",
            num_chunks=len(chunks)
        )
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/query", response_model=QueryResponse)
async def query_assistant(request: QueryRequest):
    try:
        result = run_agent(request.query)
        
        return QueryResponse(
            answer=result.get("answer", "No answer generated."),
            citations=result.get("citations", []),
            confidence_score=result.get("confidence_score", 0.0),
            confidence_level=result.get("confidence_level", "Low"),
            task_type=result.get("task_type", "general_qa"),
            retry_count=result.get("retry_count", 0)
        )
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
