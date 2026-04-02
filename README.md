# Knowledge Base

A **production-grade Corrective Retrieval-Augmented Generation** system built with **FastAPI**, **LangGraph**, **Qdrant**, and **Groq**. Upload PDFs, ask questions, and receive grounded, hallucination-checked answers with automatic web-search fallback when local documents fall short.

---

## Table of Contents

- [Key Features](#key-features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Setup and Installation](#setup-and-installation)
  - [Option A — Docker Compose (Recommended)](#option-a--docker-compose-recommended)
  - [Option B — Local Development](#option-b--local-development)
- [Configuration](#configuration)
- [API Reference](#api-reference)
- [How It Works — The Corrective RAG Pipeline](#how-it-works--the-corrective-rag-pipeline)
- [License](#license)

---

## Key Features

| Feature | Description |
|---|---|
| **PDF Ingestion** | Upload any PDF — it is chunked, embedded, and stored in Qdrant automatically. |
| **Corrective RAG Workflow** | A LangGraph state-machine grades retrieved documents, falls back to web search when needed, and checks for hallucinations before returning an answer. |
| **Hallucination Guard** | Every generated answer is verified for factual grounding **and** question relevance. |
| **Web Search Fallback** | When local documents aren't relevant enough, Tavily web search seamlessly fills the gap. |
| **Production Docker Setup** | One-command deployment with Docker Compose — Qdrant + FastAPI, health-checked and ready. |
| **Fully Configurable** | All settings (model, temperature, embedding model, top-k, etc.) are driven from a single `.env` file. |

---

## Architecture

### High-Level System Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT (cURL / Postman / Frontend)         │
│                                                                     │
│           POST /upload (PDF)              POST /query (question)    │
└────────────┬──────────────────────────────────┬─────────────────────┘
             │                                  │
             ▼                                  ▼
┌────────────────────────────────────────────────────────────────────┐
│                     FastAPI Application  (port 8000)               │
│                                                                    │
│  ┌──────────────┐    ┌──────────────────────────────────────────┐  │
│  │  /upload      │    │  /query                                  │  │
│  │              │    │                                          │  │
│  │  PyPDFLoader │    │      ┌──────────────────────────┐       │  │
│  │      ↓       │    │      │   LangGraph State Machine │       │  │
│  │  TextSplitter│    │      │   (Corrective RAG Graph)  │       │  │
│  │      ↓       │    │      └──────────────────────────┘       │  │
│  │  HuggingFace │    │                                          │  │
│  │  Embeddings  │    │                                          │  │
│  │      ↓       │    │                                          │  │
│  │  Qdrant      │    │                                          │  │
│  │  Upsert      │    │                                          │  │
│  └──────────────┘    └──────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────┘
             │                                  │
             ▼                                  ▼
┌────────────────────────┐        ┌──────────────────────────┐
│   Qdrant Vector DB     │        │   External Services      │
│   (port 6333 / 6334)   │◄───────│                          │
│                        │        │  • Groq LLM API          │
│   Collection:          │        │    (Llama 3.3 70B)       │
│   "knowledge_base"     │        │                          │
│                        │        │  • Tavily Web Search API │
│   Distance: Cosine     │        │                          │
│   Dim: 384             │        │  • HuggingFace Embeddings│
└────────────────────────┘        │    (all-MiniLM-L6-v2)   │
                                  └──────────────────────────┘
```

### Corrective RAG — LangGraph Workflow

```mermaid
graph TD
    A(["START"]) --> B["Retrieve: Fetch top-k documents from Qdrant"]
    B --> C["Grade Documents: LLM judges each doc as relevant or irrelevant"]
    C -->|Relevant docs exist| E["Generate: LLM answers using relevant context"]
    C -->|No relevant docs| D["Web Search: Tavily fetches fresh results from the web"]
    D --> E
    E --> F["Hallucination Check: Verify grounding and answer relevance"]
    F --> G(["END: Return answer and metadata"])

    style A fill:#4ade80,stroke:#16a34a,color:#000
    style G fill:#f87171,stroke:#dc2626,color:#000
    style B fill:#60a5fa,stroke:#2563eb,color:#000
    style C fill:#fbbf24,stroke:#d97706,color:#000
    style D fill:#c084fc,stroke:#7c3aed,color:#000
    style E fill:#34d399,stroke:#059669,color:#000
    style F fill:#fb923c,stroke:#ea580c,color:#000
```

### Workflow Step-by-Step

| Step | Node | What Happens |
|------|------|-------------|
| 1 | **Retrieve** | The user's question is embedded and the top-k most similar chunks are fetched from Qdrant. |
| 2 | **Grade Documents** | Each retrieved document is graded by the LLM for relevance to the question (yes / no). |
| 3 | **Decide** | If relevant docs found, proceed to **Generate**. If none, fall back to **Web Search**. |
| 4 | **Web Search** (conditional) | Tavily searches the web for the question, returning up to 3 results as surrogate documents. |
| 5 | **Generate** | The LLM generates a concise answer grounded in the (filtered or web-sourced) context. |
| 6 | **Hallucination Check** | Two checks run: (a) Is the answer grounded in the provided facts? (b) Does it actually address the question? Result is `passed`, `failed_grounding`, or `failed_relevance`. |

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **API Framework** | FastAPI 0.115 | Async REST API with automatic OpenAPI docs |
| **Orchestration** | LangGraph 0.4+ | Stateful, graph-based RAG workflow |
| **LLM** | Groq (Llama 3.3 70B Versatile) | Ultra-fast inference for grading and generation |
| **Embeddings** | HuggingFace `all-MiniLM-L6-v2` | Lightweight 384-dim sentence embeddings |
| **Vector Store** | Qdrant | High-performance vector similarity search |
| **Web Search** | Tavily API | Real-time web search fallback |
| **PDF Parsing** | PyPDF | Robust PDF text extraction |
| **Config** | Pydantic Settings + `.env` | Type-safe, validated configuration |
| **Containerization** | Docker + Docker Compose | One-command reproducible deployment |

---

## Project Structure

```
Knowledge_Base/
│
├── app/                          # Application source code
│   ├── main.py                   # FastAPI app — routes and middleware
│   ├── config.py                 # Pydantic Settings (reads .env)
│   ├── models.py                 # Request/Response Pydantic models
│   ├── ingestion.py              # PDF loading, chunking, embedding and Qdrant upsert
│   ├── retrieval.py              # Vector store retriever factory
│   ├── graph.py                  # LangGraph Corrective RAG state machine
│   └── prompts.py                # All LLM prompt templates
│
├── uploads/                      # Runtime directory for uploaded PDFs
├── .env                          # Environment variables (API keys, config)
├── .gitignore                    # Git ignore rules
├── requirements.txt              # Python dependencies
├── Dockerfile                    # App container image
├── docker-compose.yml            # Multi-service orchestration (App + Qdrant)
└── README.md                     # You are here
```

---

## Prerequisites

Before you begin, make sure you have the following:

| Requirement | Version | Notes |
|---|---|---|
| **Docker and Docker Compose** | 20.x+ / 2.x+ | Required for Option A |
| **Python** | 3.11+ | Required for Option B |
| **Groq API Key** | — | Sign up at [console.groq.com](https://console.groq.com) |
| **Tavily API Key** | — | Sign up at [tavily.com](https://tavily.com) |
| **Git** | 2.x+ | To clone the repository |

---

## Setup and Installation

### Option A — Docker Compose (Recommended)

This is the fastest path. Docker Compose starts both the **FastAPI app** and the **Qdrant database** with a single command.

#### 1. Clone the Repository

```bash
git clone https://github.com/your-username/Knowledge_Base.git
cd Knowledge_Base
```

#### 2. Configure Environment Variables

Create a `.env` file in the project root (or edit the existing one):

```dotenv
# LLM and Search
GROQ_API_KEY=gsk_your_groq_api_key_here
TAVILY_API_KEY=tvly-your_tavily_api_key_here

# Qdrant
QDRANT_HOST=localhost
QDRANT_PORT=6333

# Collection and Embeddings
COLLECTION_NAME=knowledge_base
EMBEDDING_MODEL=all-MiniLM-L6-v2

# LLM Settings
LLM_MODEL=llama-3.3-70b-versatile
LLM_TEMPERATURE=0.0

# Retrieval
TOP_K=5

# Uploads
UPLOAD_DIR=uploads
```

> **Warning:** Never commit your real API keys. The `.env` file is already in `.gitignore`.

#### 3. Build and Start

```bash
docker compose up --build -d
```

This will:
1. Pull the `qdrant/qdrant:latest` image.
2. Build the FastAPI app image from the `Dockerfile`.
3. Start Qdrant on ports **6333** (HTTP) and **6334** (gRPC).
4. Wait for Qdrant's health check to pass, then start the app on port **8000**.

#### 4. Verify

```bash
# Check all containers are running
docker compose ps

# Hit the health endpoint
curl http://localhost:8000/health
```

Expected response:

```json
{"status": "healthy", "service": "corrective-rag"}
```

#### 5. Stop

```bash
docker compose down          # Stop containers (data persists in volumes)
docker compose down -v       # Stop containers AND delete vector data
```

---

### Option B — Local Development

Use this if you want to run the app directly on your machine for development or debugging.

#### 1. Clone the Repository

```bash
git clone https://github.com/your-username/Knowledge_Base.git
cd Knowledge_Base
```

#### 2. Start Qdrant

You still need Qdrant running. The simplest way is with Docker:

```bash
docker run -d --name qdrant_db -p 6333:6333 -p 6334:6334 -v qdrant_storage:/qdrant/storage qdrant/qdrant:latest
```

Alternatively, see the [Qdrant installation docs](https://qdrant.tech/documentation/guides/installation/) for other options.

#### 3. Create a Virtual Environment

```bash
python -m venv .venv
```

Activate it:

**Windows (PowerShell):**
```powershell
.\.venv\Scripts\Activate.ps1
```

**macOS / Linux:**
```bash
source .venv/bin/activate
```

#### 4. Install Dependencies

```bash
pip install -r requirements.txt
```

> **Note:** The first run will download the `all-MiniLM-L6-v2` embedding model (~80 MB). This only happens once.

#### 5. Configure Environment Variables

Create or edit the `.env` file as shown in [Option A, Step 2](#2-configure-environment-variables). Make sure `QDRANT_HOST` is set to `localhost`.

#### 6. Run the Application

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

The `--reload` flag enables hot-reload so changes to the source files are picked up automatically.

#### 7. Open the Docs

Navigate to [http://localhost:8000/docs](http://localhost:8000/docs) for the interactive Swagger UI.

---

## Configuration

All configuration is managed through environment variables loaded via **Pydantic Settings**. Place these in the `.env` file at the project root.

| Variable | Default | Description |
|---|---|---|
| `GROQ_API_KEY` | (required) | API key for Groq LLM inference |
| `TAVILY_API_KEY` | (required) | API key for Tavily web search fallback |
| `QDRANT_HOST` | `localhost` | Hostname of the Qdrant instance |
| `QDRANT_PORT` | `6333` | HTTP port for Qdrant |
| `COLLECTION_NAME` | `knowledge_base` | Qdrant collection to store document vectors |
| `EMBEDDING_MODEL` | `all-MiniLM-L6-v2` | HuggingFace sentence-transformer model name |
| `LLM_MODEL` | `llama-3.3-70b-versatile` | Groq model identifier |
| `LLM_TEMPERATURE` | `0.0` | Temperature for LLM generation (0 = deterministic) |
| `TOP_K` | `5` | Default number of documents to retrieve |
| `UPLOAD_DIR` | `uploads` | Directory for storing uploaded PDFs |

---

## API Reference

The API exposes 4 endpoints. Full interactive documentation is available at `/docs` (Swagger UI) and `/redoc` (ReDoc) when the server is running.

### GET /health

Health check endpoint.

**Response:**

```json
{ "status": "healthy", "service": "corrective-rag" }
```

---

### POST /upload

Upload and ingest a PDF file into the vector database.

**Request:** `multipart/form-data` with a `file` field (PDF only).

```bash
curl -X POST http://localhost:8000/upload \
  -F "file=@/path/to/your/document.pdf"
```

**Response:**

```json
{
  "message": "PDF ingested successfully",
  "filename": "document.pdf",
  "chunks_ingested": 42,
  "collection": "knowledge_base"
}
```

---

### POST /query

Ask a question against the ingested knowledge base.

**Request Body:**

```json
{
  "question": "What are the key findings of the paper?",
  "top_k": 5
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `question` | string | Yes | The question to ask |
| `top_k` | int | No | Number of documents to retrieve (1-20, default: 5) |

```bash
curl -X POST http://localhost:8000/query \
  -H "Content-Type: application/json" \
  -d '{"question": "What is the main contribution of this paper?", "top_k": 5}'
```

**Response:**

```json
{
  "answer": "The main contribution is ...",
  "sources": [
    {
      "content": "Excerpt from the document ...",
      "source": "document.pdf",
      "page": 3,
      "relevance_score": ""
    }
  ],
  "web_search_used": false,
  "hallucination_check": "passed"
}
```

| Field | Description |
|---|---|
| `answer` | The generated answer |
| `sources` | List of source documents used (content truncated to 500 chars) |
| `web_search_used` | `true` if Tavily web search was triggered |
| `hallucination_check` | `passed`, `failed_grounding`, or `failed_relevance` |

---

### GET /collections

List all Qdrant collections and their stats.

```bash
curl http://localhost:8000/collections
```

**Response:**

```json
{
  "collections": [
    {
      "name": "knowledge_base",
      "vectors_count": 42,
      "points_count": 42
    }
  ]
}
```

---

## How It Works — The Corrective RAG Pipeline

Traditional RAG retrieves documents and passes them directly to an LLM. **Corrective RAG** adds self-reflection layers that dramatically improve answer quality:

1. **Retrieve** — Embed the question and fetch top-k similar chunks from Qdrant using cosine similarity.

2. **Grade** — The LLM evaluates each retrieved document: "Is this document relevant to the question?". Irrelevant documents are filtered out, reducing noise in context.

3. **Decide** — If relevant documents remain, proceed to generation. If all documents were filtered out, the system falls back to **web search**.

4. **Web Search** (fallback) — Tavily API searches the web for the query, returning up to 3 fresh results that serve as surrogate context.

5. **Generate** — The LLM produces an answer grounded in the filtered (or web-sourced) context.

6. **Hallucination Check** — Two final verification passes:
   - **Grounding check** — Is the answer actually supported by the provided documents?
   - **Relevance check** — Does the answer address the original question?

   The result is returned as part of the response so the client can act on it.

---

## License

This project is open-source. Feel free to use, modify, and distribute as needed.

---

<p align="center">
  Built with FastAPI, LangGraph, Qdrant, and Groq
</p>
