import os
import logging
from pathlib import Path
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct
import uuid

from app.config import settings

logger = logging.getLogger(__name__)

_embeddings = None

def get_embeddings() -> GoogleGenerativeAIEmbeddings:
    global _embeddings
    if _embeddings is None:
        logger.info(f"Loading embedding model: {settings.embedding_model}")
        if not settings.google_api_key:
            raise ValueError("GOOGLE_API_KEY is missing. Please add it to your config/environment.")
        _embeddings = GoogleGenerativeAIEmbeddings(
            model=settings.embedding_model,
            google_api_key=settings.google_api_key,
        )
    return _embeddings


def get_qdrant_client() -> QdrantClient:
    return QdrantClient(host=settings.qdrant_host, port=settings.qdrant_port)


def ensure_collection(client: QdrantClient, embedding_dim: int = 384) -> None:
    collections = [c.name for c in client.get_collections().collections]
    if settings.collection_name not in collections:
        logger.info(f"Creating collection: {settings.collection_name}")
        client.create_collection(
            collection_name=settings.collection_name,
            vectors_config=VectorParams(size=embedding_dim, distance=Distance.COSINE),
        )


def load_and_split_pdf(file_path: str, chunk_size: int = 1000, chunk_overlap: int = 200) -> list:
    loader = PyPDFLoader(file_path)
    documents = loader.load()

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        length_function=len,
        add_start_index=True,
    )
    chunks = splitter.split_documents(documents)
    logger.info(f"Split '{Path(file_path).name}' into {len(chunks)} chunks")
    return chunks


def ingest_pdf(file_path: str) -> int:
    chunks = load_and_split_pdf(file_path)
    if not chunks:
        return 0

    embeddings = get_embeddings()
    client = get_qdrant_client()

    sample_vector = embeddings.embed_query("test")
    embedding_dim = len(sample_vector)
    ensure_collection(client, embedding_dim)

    texts = [chunk.page_content for chunk in chunks]
    vectors = embeddings.embed_documents(texts)

    points = []
    for i, (chunk, vector) in enumerate(zip(chunks, vectors)):
        source = chunk.metadata.get("source", "unknown")
        point = PointStruct(
            id=str(uuid.uuid4()),
            vector=vector,
            payload={
                "content": chunk.page_content,
                "source": os.path.basename(source),
                "page": chunk.metadata.get("page", 0),
                "start_index": chunk.metadata.get("start_index", 0),
            },
        )
        points.append(point)

    batch_size = 100
    for i in range(0, len(points), batch_size):
        batch = points[i : i + batch_size]
        client.upsert(collection_name=settings.collection_name, points=batch)

    logger.info(f"Ingested {len(points)} chunks into '{settings.collection_name}'")
    return len(points)
