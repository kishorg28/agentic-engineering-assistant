import os
from dotenv import load_dotenv
load_dotenv()
from langchain_groq import ChatGroq
from langchain_core.prompts import PromptTemplate
from app.agents.state import AgentState
from app.models.schemas import Citation
from app.prompts.templates import (
    ROUTER_PROMPT, SUMMARIZATION_PROMPT, COMPARISON_PROMPT,
    EXTRACTION_PROMPT, QA_PROMPT, VALIDATOR_PROMPT,
    QUERY_REFORMULATION_PROMPT
)
from app.services.vector_store import VectorStoreService

# Initialize LLM and Vector Store
llm = ChatGroq(model_name="llama-3.1-8b-instant", temperature=0)
vector_store_service = VectorStoreService()

def route_query(state: AgentState) -> AgentState:
    """Routes the query to the appropriate task type."""
    prompt = PromptTemplate.from_template(ROUTER_PROMPT)
    chain = prompt | llm
    response = chain.invoke({"query": state["query"]})
    task_type = response.content.strip().lower()
    
    valid_tasks = ["summarize", "compare", "extract_procedure", "general_qa"]
    if task_type not in valid_tasks:
        task_type = "general_qa"
        
    return {"task_type": task_type}

def retrieve_documents(state: AgentState) -> AgentState:
    """Retrieves relevant documents from the vector store."""
    query = state["query"]
    docs = vector_store_service.search(query, k=5)
    return {"documents": docs}

def _generate_answer(state: AgentState, prompt_template: str) -> str:
    """Helper to generate an answer based on a prompt and context."""
    prompt = PromptTemplate.from_template(prompt_template)
    chain = prompt | llm
    
    context = "\n\n".join(
        f"Document: {doc.metadata.get('document_name', 'Unknown')}\n"
        f"Section: {doc.metadata.get('section_title', 'Unknown')}\n"
        f"Content: {doc.page_content}"
        for doc in state["documents"]
    )
    
    response = chain.invoke({"query": state["query"], "context": context})
    return response.content

def summarize_task(state: AgentState) -> AgentState:
    answer = _generate_answer(state, SUMMARIZATION_PROMPT)
    return {"answer": answer}

def compare_task(state: AgentState) -> AgentState:
    answer = _generate_answer(state, COMPARISON_PROMPT)
    return {"answer": answer}

def extract_procedure_task(state: AgentState) -> AgentState:
    answer = _generate_answer(state, EXTRACTION_PROMPT)
    return {"answer": answer}

def general_qa_task(state: AgentState) -> AgentState:
    answer = _generate_answer(state, QA_PROMPT)
    return {"answer": answer}

def validate_answer(state: AgentState) -> AgentState:
    """Validates the answer against the context and assigns a confidence score."""
    if not state.get("documents"):
        return {
            "confidence_score": 0.0,
            "confidence_level": "Low",
            "answer": "I could not find sufficient evidence in the uploaded documents."
        }

    prompt = PromptTemplate.from_template(VALIDATOR_PROMPT)
    chain = prompt | llm
    
    context = "\n\n".join([doc.page_content for doc in state["documents"]])
    response = chain.invoke({"context": context, "answer": state["answer"]})
    
    import re
    score_str = response.content.strip()
    # Find all float or integer numbers in the response
    matches = re.findall(r"[-+]?\d*\.\d+|\d+", score_str)
    if matches:
        try:
            score = float(matches[0])
            score = max(0.0, min(1.0, score))
        except ValueError:
            score = 0.5
    else:
        score = 0.5
        
    if score > 0.8:
        level = "High"
    elif score >= 0.6:
        level = "Medium"
    else:
        level = "Low"
        
    final_answer = state["answer"]
    if level == "Low":
         final_answer = "I could not find sufficient evidence in the uploaded documents."
         
    # Extract citations
    citations = []
    for doc in state["documents"]:
        citations.append(Citation(
            document_name=doc.metadata.get("document_name", "Unknown"),
            page_number=str(doc.metadata.get("page_number", "N/A")),
            section_title=doc.metadata.get("section_title", "Unknown")
        ))
        
    return {
        "confidence_score": score,
        "confidence_level": level,
        "answer": final_answer,
        "citations": citations
    }

def reformulate_query(state: AgentState) -> AgentState:
    """Reformulates the query when confidence is Low, to improve retrieval on retry."""
    current_retry = state.get("retry_count", 0)
    
    # On the first retry, save the original query so we can reference it in future reformulations
    original_query = state.get("original_query") or state["query"]
    
    prompt = PromptTemplate.from_template(QUERY_REFORMULATION_PROMPT)
    chain = prompt | llm
    response = chain.invoke({"original_query": original_query})
    new_query = response.content.strip()
    
    return {
        "query": new_query,
        "original_query": original_query,
        "retry_count": current_retry + 1,
        # Reset documents and answer so the next retrieval starts fresh
        "documents": [],
        "answer": None,
        "citations": [],
        "confidence_score": None,
        "confidence_level": None,
    }
