"""
DCI HireMind – Enterprise Application Configuration
Uses pydantic-settings to manage environment variables safely and securely.
"""

from functools import lru_cache
from pathlib import Path
from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict

# Base backend directory
BACKEND_DIR = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    """
    Central application settings validated at runtime.
    Primary database: Supabase PostgreSQL.
    SQLite is preserved exclusively as an opt-in local testing option.
    """

    model_config = SettingsConfigDict(
        env_file=str(BACKEND_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Project metadata
    PROJECT_NAME: str = "DCI HireMind API"
    VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    API_V1_STR: str = "/api/v1"
    PORT: int = 8000

    # Security
    SECRET_KEY: str = "dev_secret_key_change_in_production_32char_minimum"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    # Supabase Cloud Configuration
    SUPABASE_URL: str = "https://idsdhynpmhllhwhwddub.supabase.co"
    SUPABASE_ANON_KEY: str = (
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlkc2RoeW5wbWhsbGh3aHdkZHViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ4OTYxOTUsImV4cCI6MjExMDQ3MjE5NX0._13OjNQg_239S9gRkf4NPOgzRG8pmFIx_d5bQXIebpw"
    )
    SUPABASE_PROJECT_REF: str = "idsdhynpmhllhwhwddub"
    SUPABASE_DB_HOST: str = "db.idsdhynpmhllhwhwddub.supabase.co"
    SUPABASE_DB_PORT: int = 5432
    SUPABASE_DB_USER: str = "postgres"
    SUPABASE_DB_NAME: str = "postgres"
    SUPABASE_DB_PASSWORD: Optional[str] = None
    SUPABASE_STORAGE_BUCKET_RESUMES: str = "resumes"

    # Database Configuration (Supabase PostgreSQL primary)
    DATABASE_URL: Optional[str] = None

    # Explicit SQLite local testing flag (default: False - never silently fall back)
    USE_SQLITE: bool = False
    SQLITE_URL: str = "sqlite:///./dci_hiremind.db"

    # Local Ollama AI settings
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama3.1:8b"
    OLLAMA_EMBED_MODEL: str = "nomic-embed-text"

    # OpenAI API Configuration (Step 6.1)
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_MODEL: str = "gpt-4o-mini"
    OPENAI_BASE_URL: Optional[str] = None
    OPENAI_TIMEOUT_SECONDS: float = 30.0
    OPENAI_MAX_RETRIES: int = 2

    # LangSmith tracing
    LANGCHAIN_TRACING_V2: bool = False
    LANGCHAIN_API_KEY: Optional[str] = None
    LANGCHAIN_PROJECT: str = "dci-hiremind"

    @property
    def has_openai_credentials(self) -> bool:
        """Checks if valid OpenAI / OpenRouter API credentials are provided."""
        if not self.OPENAI_API_KEY:
            return False
        cleaned = self.OPENAI_API_KEY.strip()
        return bool(cleaned and cleaned != "your_openai_or_openrouter_api_key_here")

    @property
    def effective_openai_base_url(self) -> str:
        """
        Determines the active base URL for OpenAI-compatible endpoints.
        Defaults to OpenRouter if key starts with 'sk-or-', or official OpenAI endpoint.
        """
        if self.OPENAI_BASE_URL:
            return self.OPENAI_BASE_URL.rstrip("/")
        if self.OPENAI_API_KEY and self.OPENAI_API_KEY.startswith("sk-or-"):
            return "https://openrouter.ai/api/v1"
        return "https://api.openai.com/v1"

    @property
    def effective_openai_model(self) -> str:
        """Returns the model identifier configured for the provider."""
        if self.OPENAI_MODEL:
            return self.OPENAI_MODEL
        if self.effective_openai_base_url.startswith("https://openrouter.ai"):
            return "openai/gpt-4o-mini"
        return "gpt-4o-mini"

    @property
    def masked_openai_key(self) -> str:
        """Returns safe masked key for logging and diagnostics."""
        if not self.OPENAI_API_KEY:
            return "NOT_CONFIGURED"
        k = self.OPENAI_API_KEY.strip()
        if len(k) <= 8:
            return "****"
        return f"{k[:8]}...{k[-4:]}"

    @property
    def has_postgres_credentials(self) -> bool:
        """Checks if valid Supabase PostgreSQL credentials are provided."""
        if self.USE_SQLITE:
            return False
        if self.SUPABASE_DB_PASSWORD and self.SUPABASE_DB_PASSWORD != "your_supabase_db_password_here":
            return True
        if self.DATABASE_URL:
            # Check if DATABASE_URL is a valid PostgreSQL URL without placeholders
            return (
                self.DATABASE_URL.startswith("postgresql")
                and "[YOUR-PASSWORD]" not in self.DATABASE_URL
                and "your_supabase_db_password_here" not in self.DATABASE_URL
            )
        return False

    @property
    def effective_database_url(self) -> str:
        """
        Determines the active database URL:
        1. If USE_SQLITE is explicitly enabled, use SQLITE_URL.
        2. If DATABASE_URL is set and valid, use it.
        3. If SUPABASE_DB_PASSWORD is provided, construct the Supabase PostgreSQL connection string
           with the password URL-encoded to handle special characters safely.
        4. Otherwise, return a template URL (requires password configuration).
        """
        from urllib.parse import quote_plus

        if self.USE_SQLITE:
            return self.SQLITE_URL

        if self.DATABASE_URL and self.DATABASE_URL.startswith("postgresql"):
            return self.DATABASE_URL

        password = self.SUPABASE_DB_PASSWORD or "[YOUR-PASSWORD]"
        encoded_password = quote_plus(password) if self.SUPABASE_DB_PASSWORD else password
        return (
            f"postgresql+psycopg://{self.SUPABASE_DB_USER}:{encoded_password}@"
            f"{self.SUPABASE_DB_HOST}:{self.SUPABASE_DB_PORT}/{self.SUPABASE_DB_NAME}?sslmode=require"
        )

    @property
    def is_sqlite(self) -> bool:
        """Helper to determine if the active database is SQLite."""
        return self.USE_SQLITE or self.effective_database_url.startswith("sqlite")

    @property
    def masked_supabase_key(self) -> str:
        """Returns safe masked key for logging and diagnostics."""
        if not self.SUPABASE_ANON_KEY:
            return "NOT_SET"
        return f"{self.SUPABASE_ANON_KEY[:10]}...{self.SUPABASE_ANON_KEY[-6:]}"


@lru_cache()
def get_settings() -> Settings:
    """Returns a cached Settings instance."""
    return Settings()
