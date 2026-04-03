import os
import logging
import shutil
from pathlib import Path
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.models import QueryRequest, QueryResponse, IngestResponse, SourceDocument
from app.ingestion import ingest_pdf, get_qdrant_client
from app.graph import rag_graph

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(name)s | %(levelname)s | %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Corrective RAG API",
    description="Production-grade Corrective RAG with Qdrant, LangGraph & Groq",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = Path(settings.upload_dir)
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "corrective-rag"}


@app.post("/upload", response_model=IngestResponse)
async def upload_pdf(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    file_path = UPLOAD_DIR / file.filename
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        chunks_ingested = ingest_pdf(str(file_path))

        return IngestResponse(
            message="PDF ingested successfully",
            filename=file.filename,
            chunks_ingested=chunks_ingested,
            collection=settings.collection_name,
        )

    except Exception as e:
        logger.error(f"Upload failed: {e}")
        if file_path.exists():
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {str(e)}")


@app.post("/query", response_model=QueryResponse)
async def query(request: QueryRequest):
    try:
        client = get_qdrant_client()
        collections = [c.name for c in client.get_collections().collections]
        if settings.collection_name not in collections:
            raise HTTPException(
                status_code=404,
                detail="No documents ingested yet. Upload a PDF first.",
            )

        initial_state = {
            "question": request.question,
            "documents": [],
            "generation": "",
            "web_search_used": False,
            "hallucination_check": "",
            "top_k": request.top_k,
        }

        result = rag_graph.invoke(initial_state)

        sources = []
        for doc in result.get("documents", []):
            sources.append(SourceDocument(
                content=doc.page_content[:500],
                source=doc.metadata.get("source", "unknown"),
                page=doc.metadata.get("page"),
            ))

        return QueryResponse(
            answer=result.get("generation", "No answer generated"),
            sources=sources,
            web_search_used=result.get("web_search_used", False),
            hallucination_check=result.get("hallucination_check", ""),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Query failed: {e}")
        raise HTTPException(status_code=500, detail=f"Query failed: {str(e)}")


@app.get("/collections")
def list_collections():
    try:
        client = get_qdrant_client()
        collections = client.get_collections().collections
        result = []
        for col in collections:
            info = client.get_collection(col.name)
            result.append({
                "name": col.name,
                "vectors_count": info.vectors_count,
                "points_count": info.points_count,
            })
        return {"collections": result}
    except Exception as e:
        logger.error(f"Failed to list collections: {e}")
        raise HTTPException(status_code=500, detail=str(e))
