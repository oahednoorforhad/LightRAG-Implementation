from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from lightrag import LightRAG, QueryParam
from lightrag.llm import ollama_model_complete, ollama_embedding
from lightrag.utils import EmbeddingFunc
import os
import logging
import time
import nest_asyncio

nest_asyncio.apply()

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
WORKING_DIR = "./dickens"
INPUT_FILE = "./infobot.txt"

logging.basicConfig(format="%(levelname)s:%(message)s", level=logging.INFO)

if not os.path.exists(WORKING_DIR):
    os.mkdir(WORKING_DIR)

# Initialize LightRAG
rag = LightRAG(
    working_dir=WORKING_DIR,
    llm_model_func=ollama_model_complete,
    llm_model_name="qwen2.5:7b",
    llm_model_max_async=1,
    llm_model_max_token_size=8000,
    llm_model_kwargs={"host": "http://localhost:11434", "options": {"num_ctx": 32768}},
    embedding_func=EmbeddingFunc(
        embedding_dim=768,
        max_token_size=4096,
        func=lambda texts: ollama_embedding(
            texts, embed_model="nomic-embed-text", host="http://localhost:11434"
        ),
    ),
)

def extract_clean_response(response):
    if isinstance(response, str):
        # Remove logging lines
        lines = [line for line in response.split('\n') 
                if not line.startswith(('INFO:', 'WARNING:', 'ERROR:', 'DEBUG:'))]
        return '\n'.join(lines).strip()
    return response

@app.get("/modes")
async def get_available_modes():
    return [
        {"id": "naive", "name": "Naive", "description": "Simple direct question answering"},
        {"id": "local", "name": "Local", "description": "Uses local context analysis"},
        {"id": "global", "name": "Global", "description": "Uses global document context"},
        {"id": "hybrid", "name": "Hybrid", "description": "Combines local and global analysis"}
    ]

@app.get("/query")
async def query_rag(question: str, mode: str = "naive"):
    try:
        # Validate mode
        valid_modes = ["naive", "local", "global", "hybrid"]
        if mode not in valid_modes:
            return {
                "status": "error",
                "response": None,
                "error": f"Invalid mode. Must be one of: {', '.join(valid_modes)}",
                "mode": mode
            }

        # Process query with specified mode
        result = rag.query(question, param=QueryParam(mode=mode))
        clean_result = extract_clean_response(result)
        
        return {
            "status": "success",
            "response": clean_result,
            "error": None,
            "mode": mode
        }
    except Exception as e:
        logging.error(f"Error processing query: {str(e)}")
        return {
            "status": "error",
            "response": None,
            "error": str(e),
            "mode": mode
        }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)