"""
Database Session Management - DCI HireMind
Handles SQLAlchemy engine lifecycle with Supabase PostgreSQL as the primary database.
SQLite is preserved exclusively as an explicit local testing option.
"""

import logging
from typing import Any, Dict, Generator, Tuple

from sqlalchemy import create_engine, text
from sqlalchemy.exc import OperationalError, SQLAlchemyError
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import get_settings

logger = logging.getLogger("dci_hiremind.database")
settings = get_settings()


def create_db_engine():
    """
    Creates and configures the SQLAlchemy engine based on configuration.
    Primary engine: Supabase PostgreSQL (SSL enforced).
    Preserves SQLite ONLY when USE_SQLITE is explicitly True.
    """
    if settings.USE_SQLITE:
        logger.info(f"Using explicitly selected local SQLite database: {settings.SQLITE_URL}")
        return create_engine(
            settings.SQLITE_URL,
            connect_args={"check_same_thread": False},
            echo=(settings.ENVIRONMENT == "development_debug"),
        )

    # Supabase PostgreSQL configuration
    db_url = settings.effective_database_url
    logger.info(
        f"Configuring Supabase PostgreSQL engine (Host: {settings.SUPABASE_DB_HOST}:{settings.SUPABASE_DB_PORT})..."
    )

    if not settings.has_postgres_credentials:
        logger.warning(
            "Supabase PostgreSQL is the active primary engine, but SUPABASE_DB_PASSWORD is not set in .env. "
            "Database connections will remain in a pending-configuration state until the password is provided."
        )

    connect_args = {}
    if "pg8000" in db_url:
        import ssl
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        connect_args["ssl_context"] = ctx

    return create_engine(
        db_url,
        connect_args=connect_args,
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=10,
        pool_recycle=300,
        echo=(settings.ENVIRONMENT == "development_debug"),
    )


# Global engine and session factory
engine = create_db_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    """
    FastAPI dependency yielding a SQLAlchemy database session per request.
    Ensures safe rollback on exception and guaranteed closure in the finally block.
    """
    db = SessionLocal()
    try:
        yield db
    except SQLAlchemyError as e:
        logger.error(f"Database error during request session: {str(e)}", exc_info=True)
        db.rollback()
        raise
    finally:
        db.close()


def check_db_connection() -> Tuple[bool, str, Dict[str, Any]]:
    """
    Independently verifies database connectivity (SQLAlchemy).
    Executes SELECT 1 on the configured engine without mixing storage checks.

    Returns:
        (is_healthy, dialect_name, diagnostics)
    """
    dialect = "sqlite" if settings.USE_SQLITE else "postgresql"
    diagnostics: Dict[str, Any] = {
        "engine": dialect,
        "is_explicit_sqlite_test_mode": settings.USE_SQLITE,
        "supabase_host": settings.SUPABASE_DB_HOST,
        "supabase_port": settings.SUPABASE_DB_PORT,
        "database_name": settings.SUPABASE_DB_NAME,
        "credentials_configured": settings.has_postgres_credentials,
    }

    if not settings.USE_SQLITE and not settings.has_postgres_credentials:
        diagnostics["status"] = "pending_configuration"
        diagnostics["error"] = (
            "SUPABASE_DB_PASSWORD is missing in .env. "
            "Please provide your Supabase database password to establish direct PostgreSQL connection."
        )
        return False, dialect, diagnostics

    try:
        with engine.connect() as connection:
            result = connection.execute(text("SELECT 1"))
            value = result.scalar()
            if value == 1:
                diagnostics["status"] = "connected"
                return True, dialect, diagnostics
            else:
                diagnostics["status"] = "unexpected_scalar"
                diagnostics["error"] = f"Unexpected query scalar: {value}"
                return False, dialect, diagnostics
    except OperationalError as oe:
        diagnostics["status"] = "failed"
        diagnostics["error"] = f"OperationalError: {str(oe)}"
        logger.error(f"PostgreSQL connectivity check failed: {oe}")
        return False, dialect, diagnostics
    except Exception as exc:
        diagnostics["status"] = "error"
        diagnostics["error"] = f"Connection error: {str(exc)}"
        logger.error(f"Unexpected error checking PostgreSQL connection: {exc}")
        return False, dialect, diagnostics
