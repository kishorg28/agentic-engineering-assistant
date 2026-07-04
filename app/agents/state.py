from typing import TypedDict, List, Optional
from langchain_core.documents import Document
from app.models.schemas import Citation

class AgentState(TypedDict):
    query: str
    original_query: Optional[str]   # Preserved from first user input; set on first retry
    task_type: Optional[str]
    documents: List[Document]
    answer: Optional[str]
    citations: List[Citation]
    confidence_score: Optional[float]
    confidence_level: Optional[str]
    retry_count: int                 # Number of self-correction attempts made (max 2)
