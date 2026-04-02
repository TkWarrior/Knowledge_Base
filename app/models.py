from pydantic import BaseModel, Field


class QueryRequest(BaseModel):
    question: str = Field(..., min_length=1, description="The question to ask")
    top_k: int = Field(default=5, ge=1, le=20, description="Number of documents to retrieve")


class SourceDocument(BaseModel):
    content: str
    source: str
    page: int | None = None
    relevance_score: str = ""


class QueryResponse(BaseModel):
    answer: str
    sources: list[SourceDocument] = []
    web_search_used: bool = False
    hallucination_check: str = ""


class IngestResponse(BaseModel):
    message: str
    filename: str
    chunks_ingested: int
    collection: str
