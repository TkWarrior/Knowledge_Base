import logging
from langchain_qdrant import QdrantVectorStore
from qdrant_client import QdrantClient

from app.config import settings
from app.ingestion import get_embeddings

logger = logging.getLogger(__name__)


def get_retriever(top_k: int | None = None):
    k = top_k or settings.top_k

    client = QdrantClient(host=settings.qdrant_host, port=settings.qdrant_port)
    embeddings = get_embeddings()

    vector_store = QdrantVectorStore(
        client=client,
        collection_name=settings.collection_name,
        embedding=embeddings,
    )

    retriever = vector_store.as_retriever(
        search_type="similarity",
        search_kwargs={"k": k},
    )

    logger.info(f"Created retriever with top_k={k} on '{settings.collection_name}'")
    return retriever
