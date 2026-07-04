# Agentic AI Engineering Document Assistant

## Problem Statement
Engineering, operations, and service teams frequently rely on dense technical manuals, SOPs, and service records to troubleshoot equipment or prepare for maintenance. Finding specific, accurate information within hundreds of pages of documentation is time-consuming and error-prone. 

## Why Agentic AI Instead of a Basic Chatbot
A standard RAG chatbot treats all queries the same way (retrieve -> generate). However, engineering queries are often complex and require different reasoning paths:
- **Summarization**: "Summarize the safety precautions for maintenance shutdown."
- **Comparison**: "Compare the troubleshooting steps for overheating vs insulation failure."
- **Procedure Extraction**: "Extract the step-by-step procedure from this service manual."
- **Factual QA**: "What is the acceptable voltage range for the transformer?"

An **Agentic AI** system can route queries to specialized agents based on intent, evaluate the generated answers against source documents, and reject hallucinated answers. This leads to higher accuracy, which is critical for engineering and safety applications.

## Features
- **Intelligent Routing**: Automatically categorizes user queries and routes them to specialized agents (Summarizer, Extractor, Comparator, QA).
- **Multi-modal Document Ingestion**: Supports uploading PDFs, TXTs, and CSVs.
- **Robust RAG Pipeline**: Uses ChromaDB and OpenAI embeddings for fast, accurate retrieval.
- **Answer Validation**: A dedicated Validation Agent checks the generated answer against retrieved context, assigning a Confidence Score (High, Medium, Low). 
- **Citations**: Grounded answers always include source document names, sections, and page numbers.
- **Clean UI**: Built with Streamlit for a smooth user experience.

## Architecture
This project uses a modular, microservices-style architecture:
- **Frontend**: Streamlit
- **Backend API**: FastAPI
- **Agent Orchestration**: LangGraph and LangChain
- **Vector Store**: ChromaDB
- **LLM/Embeddings**: OpenAI (GPT-4o & text-embedding-3-small)

## Tech Stack
- **Python 3.11**
- **FastAPI** (Backend)
- **Streamlit** (Frontend)
- **LangChain / LangGraph** (Agent Framework)
- **ChromaDB** (Vector Database)
- **Docker & Docker Compose** (Containerization)
- **PyTest** (Unit Testing)

## Setup Instructions

### Prerequisites
- Docker and Docker Compose installed
- OpenAI API Key

### How to run locally
1. Clone the repository.
2. Create a `.env` file based on `.env.example` and add your `OPENAI_API_KEY`:
   ```bash
   cp .env.example .env
   ```
3. Build and run the containers using Docker Compose:
   ```bash
   docker-compose up --build
   ```
4. Access the Streamlit frontend at `http://localhost:8501`.
5. Access the FastAPI Swagger docs at `http://localhost:8000/docs`.

## Example Queries
- *Factual QA*: "What are the inspection steps before transformer oil testing?"
- *Summarization*: "Summarize the safety precautions for maintenance shutdown."
- *Comparison*: "Compare the troubleshooting steps for overheating vs insulation failure."
- *Procedure Extraction*: "Extract the procedure for replacing the stator winding."

## Future Improvements
- Integrate open-source local LLMs (e.g., Llama 3) and sentence-transformers for air-gapped environments.
- Add MLflow for tracing agent execution paths and logging confidence scores.
- Support parsing complex tables from PDFs.

## Resume-ready Impact Statement
*Developed an end-to-end Agentic AI Engineering Assistant using LangGraph, FastAPI, and ChromaDB, capable of intelligently routing technical queries (summarization, comparison, procedure extraction) across dense engineering manuals. Implemented a robust RAG validation layer that reduced hallucinations by assigning confidence scores and explicit citations, packaged in a scalable Dockerized architecture.*
