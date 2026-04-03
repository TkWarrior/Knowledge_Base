from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    groq_api_key: str = ""
    llm_model: str = "llama-3.3-70b-versatile"
    llm_temperature: float = 0.0
    tavily_api_key: str = ""
    nomic_api_key: str = ""
    qdrant_host: str = "localhost"
    qdrant_port: int = 6333
    collection_name: str = "knowledge_base_nomic"
    embedding_model: str = "nomic-embed-text-v1.5"
    top_k: int = 5
    upload_dir: str = "uploads"

settings = Settings()
