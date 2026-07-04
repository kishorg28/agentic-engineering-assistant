from pydantic import BaseModel, Field
from typing import List, Optional

class QueryRequest(BaseModel):
    query: str = Field(..., description="The user's query")

class Citation(BaseModel):
    document_name: str
    page_number: Optional[str] = "N/A"
    section_title: Optional[str] = "Unknown"

class QueryResponse(BaseModel):
    answer: str = Field(..., description="The generated answer")
    citations: List[Citation] = Field(default_factory=list, description="Citations used for the answer")
    confidence_score: float = Field(..., description="Confidence score between 0.0 and 1.0")
    confidence_level: str = Field(..., description="High, Medium, or Low")
    task_type: str = Field(..., description="The type of task determined by the router")
    retry_count: int = Field(default=0, description="Number of self-correction retries performed")

class IngestionResponse(BaseModel):
    message: str
    num_chunks: int
