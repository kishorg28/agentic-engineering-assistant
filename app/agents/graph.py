from langgraph.graph import StateGraph, END
from app.agents.state import AgentState
from app.agents.nodes import (
    route_query, retrieve_documents, summarize_task,
    compare_task, extract_procedure_task, general_qa_task,
    validate_answer, reformulate_query
)

def build_graph():
    workflow = StateGraph(AgentState)

    # --- Nodes ---
    workflow.add_node("router", route_query)
    workflow.add_node("retriever", retrieve_documents)
    workflow.add_node("summarizer", summarize_task)
    workflow.add_node("comparator", compare_task)
    workflow.add_node("extractor", extract_procedure_task)
    workflow.add_node("qa", general_qa_task)
    workflow.add_node("validator", validate_answer)
    workflow.add_node("reformulator", reformulate_query)  # Self-correction node

    # --- Entry ---
    workflow.set_entry_point("router")
    workflow.add_edge("router", "retriever")

    # --- Retriever → specialized task (based on task_type) ---
    def route_to_task(state: AgentState):
        task = state.get("task_type", "general_qa")
        if task == "summarize":
            return "summarizer"
        elif task == "compare":
            return "comparator"
        elif task == "extract_procedure":
            return "extractor"
        else:
            return "qa"

    workflow.add_conditional_edges(
        "retriever",
        route_to_task,
        {
            "summarizer": "summarizer",
            "comparator": "comparator",
            "extractor": "extractor",
            "qa": "qa",
        },
    )

    # --- All tasks → validator ---
    workflow.add_edge("summarizer", "validator")
    workflow.add_edge("comparator", "validator")
    workflow.add_edge("extractor", "validator")
    workflow.add_edge("qa", "validator")

    # --- Self-Correction Loop ---
    # validator → reformulator (if Low confidence AND still have retries left)
    # validator → END         (otherwise)
    def should_retry(state: AgentState):
        confidence_level = state.get("confidence_level", "Low")
        retry_count = state.get("retry_count", 0)
        if confidence_level == "Low" and retry_count < 2:
            return "reformulate"
        return "end"

    workflow.add_conditional_edges(
        "validator",
        should_retry,
        {
            "reformulate": "reformulator",
            "end": END,
        },
    )

    # Reformulator feeds back into retriever with the new query.
    # The router is skipped on retry to preserve the task_type already determined.
    workflow.add_edge("reformulator", "retriever")

    return workflow.compile()


# Compiled graph (singleton — loaded once at startup)
agent_graph = build_graph()


def run_agent(query: str) -> dict:
    initial_state = {
        "query": query,
        "original_query": None,
        "task_type": None,
        "documents": [],
        "answer": None,
        "citations": [],
        "confidence_score": None,
        "confidence_level": None,
        "retry_count": 0,
    }
    result = agent_graph.invoke(initial_state)
    return result
