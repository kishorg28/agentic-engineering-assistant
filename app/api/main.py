import sys
import types

# Stub 'pwd' module on Windows to prevent langchain-community import errors
if sys.platform == "win32":
    pwd_mock = types.ModuleType("pwd")
    # Define placeholder methods to avoid AttributeErrors
    pwd_mock.getpwuid = lambda uid: None
    pwd_mock.getpwnam = lambda name: None
    sys.modules["pwd"] = pwd_mock

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import router
import uvicorn
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Agentic Engineering Document Assistant API")

# Enable CORS for frontend deployment
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins in development/free tier deployments
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("API_PORT", 8000)))
