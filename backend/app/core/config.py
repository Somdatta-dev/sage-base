from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://sagebase:sagebase_secret@localhost:5437/sagebase"
    
    # JWT Authentication
    SECRET_KEY: str = "your-super-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # Default admin account
    DEFAULT_ADMIN_EMAIL: str = "admin@sagebase.com"
    DEFAULT_ADMIN_PASSWORD: str = "Admin123!"
    
    # API URLs
    API_DOMAIN: str = "http://localhost:8787"
    WEBSITE_DOMAIN: str = "http://localhost:3737"
    
    # Qdrant
    QDRANT_HOST: str = "localhost"
    QDRANT_PORT: int = 6337
    
    # AI Model Configuration (OpenAI-compatible, works with vLLM)
    OPENAI_API_KEY: str = ""
    OPENAI_BASE_URL: str = "https://api.openai.com/v1"  # Change for vLLM
    OPENAI_MODEL: str = "gpt-4o-mini"  # Chat model
    EMBEDDING_MODEL: str = "text-embedding-3-small"
    EMBEDDING_DIMENSIONS: int = 1536
    
    # Tavily Web Search
    TAVILY_API_KEY: str = ""
    
    # File uploads
    UPLOAD_DIR: str = "./uploads"
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024  # 10MB
    
    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
