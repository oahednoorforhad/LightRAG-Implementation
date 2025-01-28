import os
import inspect
import logging
import asyncio
import time
from lightrag import LightRAG, QueryParam
from lightrag.llm import ollama_model_complete, ollama_embedding
from lightrag.utils import EmbeddingFunc
import nest_asyncio

nest_asyncio.apply()

# Configuration
WORKING_DIR = "./dickens"
INPUT_FILE = "./infobot.txt"

logging.basicConfig(format="%(levelname)s:%(message)s", level=logging.INFO)

# Ensure the working directory exists
if not os.path.exists(WORKING_DIR):
    os.mkdir(WORKING_DIR)

# Initialize LightRAG
rag = LightRAG(
    working_dir=WORKING_DIR,
    llm_model_func=ollama_model_complete,
    llm_model_name="qwen2.5:7b",
    llm_model_max_async=1,
    llm_model_max_token_size=4096,
    llm_model_kwargs={"host": "http://localhost:11434", "options": {"num_ctx": 32768}},
    embedding_func=EmbeddingFunc(
        embedding_dim=768,
        max_token_size=4096,
        func=lambda texts: ollama_embedding(
            texts, embed_model="nomic-embed-text", host="http://localhost:11434"
        ),
    ),
)

# Insert text into LightRAG
def insert_text():
    try:
        if not os.path.exists(INPUT_FILE):
            logging.error(f"Input file '{INPUT_FILE}' not found.")
            return False

        with open(INPUT_FILE, "r", encoding="utf-8") as f:
            text_data = f.read().strip()
            if not text_data:
                logging.error("Input file is empty. Please provide valid content.")
                return False

            logging.info("Preparing to insert data into LightRAG...")
            
            # Split text into smaller chunks for processing
            chunk_size = 1000
            chunks = [text_data[i:i + chunk_size] for i in range(0, len(text_data), chunk_size)]
            
            total_chunks = len(chunks)
            logging.info(f"Total number of chunks: {total_chunks}")

            for i, chunk in enumerate(chunks):
                try:
                    rag.insert(chunk)
                    logging.info(f"Inserted chunk {i + 1}/{total_chunks}")
                    time.sleep(0.1)  # Add a short delay for stability
                except Exception as e:
                    logging.error(f"Error inserting chunk {i + 1}: {str(e)}")
                    continue

            logging.info("Data insertion completed.")
            return True

    except Exception as e:
        logging.error(f"Unexpected error during data insertion: {str(e)}")
        return False

# Query the RAG system
# print(
#     rag.query("tell me about prof shamsul alam ", param=QueryParam(mode="naive"))
# )

# # Perform local search
# print(
#     rag.query("tell me about prof shamsul alam ", param=QueryParam(mode="local"))
# )

# # Perform global search
# print(
#     rag.query("tell me about prof shamsul alam ", param=QueryParam(mode="global"))
# )

# Perform hybrid search
print(
    rag.query("Tell me the history of IIUC.", param=QueryParam(mode="global"))
)