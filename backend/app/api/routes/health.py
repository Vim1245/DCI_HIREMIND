"""
Health & Diagnostic Endpoints - DCI HireMind
Provides independent health checks for:
1. Supabase PostgreSQL database connectivity
2. Supabase Cloud Storage bucket status
"""

from datetime import datetime, timezone
from typing import Any, Dict

from fastapi import APIRouter, status
from fastapi.responses import JSONResponse

from app.core.config import get_settings
from app.database.session import check_db_connection
from app.services.supabase_storage import storage_service
from app.services.openai_service import openai_service

router = APIRouter(tags=["Health & Diagnostics"])
settings = get_settings()


@router.get(
    "/health/db",
    summary="PostgreSQL Database Health Check",
    response_description="Database connection status and engine metadata",
)
@router.get(
    "/health/database",
    summary="PostgreSQL Database Health Check (Alias)",
    response_description="Database connection status and engine metadata",
)
async def database_health_check() -> Dict[str, Any]:
    """
    Independently verifies database connectivity to Supabase PostgreSQL via SQLAlchemy.
    """
    is_healthy, dialect, diagnostics = check_db_connection()

    response_payload = {
        "success": is_healthy,
        "database": {
            "status": "connected" if is_healthy else "disconnected",
            "engine": dialect,
            "host": diagnostics.get("supabase_host"),
            "port": diagnostics.get("supabase_port"),
            "database_name": diagnostics.get("database_name"),
            "credentials_configured": diagnostics.get("credentials_configured"),
            "diagnostics": diagnostics,
        },
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

    if not is_healthy:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content=response_payload,
        )

    return response_payload


@router.get(
    "/health/storage",
    summary="Supabase Storage Health Check",
    response_description="Storage connectivity and 'resumes' bucket status",
)
async def storage_health_check() -> Dict[str, Any]:
    """
    Independently verifies Supabase Storage API connectivity and checks bucket readiness.
    """
    is_ready, diagnostics = storage_service.check_storage_status()

    response_payload = {
        "success": is_ready,
        "storage": diagnostics,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

    if not is_ready:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content=response_payload,
        )

    return response_payload


@router.get(
    "/health/ai",
    summary="AI Provider Health Check",
    response_description="OpenAI / OpenRouter API connectivity and model status",
)
@router.get(
    "/health/openai",
    summary="OpenAI API Health Check (Alias)",
    response_description="OpenAI / OpenRouter API connectivity and model status",
)
async def ai_health_check() -> Dict[str, Any]:
    """
    Independently verifies OpenAI / OpenRouter API connectivity and diagnostic probe.
    Does not expose sensitive credentials.
    """
    diagnostics = openai_service.check_connection()
    is_healthy = diagnostics.get("status") == "connected"

    response_payload = {
        "success": is_healthy,
        "ai_service": diagnostics,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

    if not is_healthy:
        status_code = (
            status.HTTP_503_SERVICE_UNAVAILABLE
            if diagnostics.get("status") in ("missing_credentials", "connection_error", "timeout")
            else status.HTTP_502_BAD_GATEWAY
        )
        return JSONResponse(
            status_code=status_code,
            content=response_payload,
        )

    return response_payload
