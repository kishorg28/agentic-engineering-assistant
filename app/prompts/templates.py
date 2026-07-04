from langchain_core.prompts import PromptTemplate

ROUTER_PROMPT = """You are a smart router for an Engineering Document Assistant.
Analyze the user's query and decide the type of task to perform.
The output must be EXACTLY one of these strings, with no additional text:
- summarize
- compare
- extract_procedure
- general_qa

Query: {query}
Task type:"""

SUMMARIZATION_PROMPT = """You are an expert Engineering Assistant. 
Summarize the following retrieved document excerpts relevant to the user's query.
Keep the summary concise and focused on the query.

Query: {query}
Retrieved Context: {context}

Summary:"""

COMPARISON_PROMPT = """You are an expert Engineering Assistant. 
Compare the entities or concepts mentioned in the user's query based on the retrieved document excerpts.
Structure your comparison logically, highlighting similarities and differences.

Query: {query}
Retrieved Context: {context}

Comparison:"""

EXTRACTION_PROMPT = """You are an expert Engineering Assistant. 
Extract a step-by-step procedure from the following retrieved document excerpts to answer the user's query.
Structure the response as a clear, numbered list of steps.

Query: {query}
Retrieved Context: {context}

Procedure:"""

QA_PROMPT = """You are an expert Engineering Assistant. 
Answer the user's query based ONLY on the provided context. If the context does not contain enough information to answer the question, state that clearly.

Query: {query}
Retrieved Context: {context}

Answer:"""

VALIDATOR_PROMPT = """You are a validator for an Engineering Document Assistant.
Evaluate the generated answer against the provided retrieved context.
Return a single float value between 0.0 and 1.0 representing your confidence that the answer is fully supported by the context.
Do not output anything else besides the float value.

Context: {context}
Generated Answer: {answer}

Confidence Score (0.0 to 1.0):"""

QUERY_REFORMULATION_PROMPT = """You are an expert at improving search queries for an Engineering Document Assistant.

The original user query was:
"{original_query}"

The assistant searched for relevant documents but the retrieved context was insufficient to produce a confident answer.

Your task: Rewrite the query to be more specific, use alternative engineering terminology, or break it into a more targeted question that is more likely to match content in a technical manual or SOP.

Return ONLY the reformulated query — no explanations, no preamble.

Reformulated query:"""
