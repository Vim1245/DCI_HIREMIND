"""
DCI HireMind – Enterprise AI HR & Recruitment Automation Platform
Backend Application Entry Point with Supabase Integration
"""

import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Any, Dict

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.router import api_router
from app.api.routes import auth
from app.core.config import get_settings
from app.database.session import check_db_connection
from app.services.supabase_storage import storage_service

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("dci_hiremind")
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager.
    Verifies PostgreSQL database and Supabase Storage independently on startup.
    """
    logger.info(f"Starting {settings.PROJECT_NAME} v{settings.VERSION} [{settings.ENVIRONMENT}]...")

    # 1. Independent Database Check (Supabase PostgreSQL primary)
    is_db_connected, dialect, db_diagnostics = check_db_connection()
    if is_db_connected:
        logger.info(f"Database connection verified: {dialect} ({settings.SUPABASE_DB_HOST})")
    else:
        logger.warning(
            f"Database status: {db_diagnostics.get('status')} - {db_diagnostics.get('error')}"
        )

    # 2. Independent Storage Check (Supabase Storage)
    is_storage_ready, storage_diagnostics = storage_service.check_storage_status()
    if is_storage_ready:
        logger.info(f"Supabase Storage verified: bucket '{settings.SUPABASE_STORAGE_BUCKET_RESUMES}' is ready.")
    else:
        logger.warning(
            f"Supabase Storage status: {storage_diagnostics.get('bucket_status')} - {storage_diagnostics.get('message')}"
        )

    # 3. Independent AI Provider Check
    if settings.has_openai_credentials:
        logger.info(f"OpenAI service configured: [Model: {settings.effective_openai_model}, Endpoint: {settings.effective_openai_base_url}]")
    else:
        logger.warning("OpenAI service not configured: OPENAI_API_KEY is not set.")

    yield

    logger.info(f"Shutting down {settings.PROJECT_NAME}...")


# Initialize FastAPI application
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Enterprise AI HR & Recruitment Automation Platform API with Supabase PostgreSQL & Storage",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

# Configure CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8080",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:8080",
    ],
    allow_origin_regex=r"https://.*\.onrender\.com",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global Exception Handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """Standardized response format for HTTP exceptions."""
    logger.warning(f"HTTP {exc.status_code} error at {request.url.path}: {exc.detail}")
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "detail": exc.detail,
            "error": {
                "code": exc.status_code,
                "message": exc.detail,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "path": request.url.path,
            },
        },
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    """Standardized response format for request validation errors."""
    logger.warning(f"Validation error at {request.url.path}: {exc.errors()}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "detail": "Request validation failed",
            "error": {
                "code": status.HTTP_422_UNPROCESSABLE_ENTITY,
                "message": "Request validation failed",
                "details": exc.errors(),
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "path": request.url.path,
            },
        },
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Standardized response format for unhandled server exceptions."""
    logger.error(f"Unhandled exception at {request.url.path}: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "error": {
                "code": status.HTTP_500_INTERNAL_SERVER_ERROR,
                "message": "Internal server error occurred.",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "path": request.url.path,
            },
        },
    )


# Root Endpoint
@app.get(
    "/",
    tags=["Root"],
    summary="Welcome Endpoint",
    response_description="API service metadata and endpoints",
)
async def root() -> Dict[str, Any]:
    """Root endpoint returning service identity, version, and documentation links."""
    return {
        "success": True,
        "message": "Welcome to DCI HireMind – Enterprise AI HR & Recruitment Automation Platform API",
        "application": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "status": "online",
        "database": {
            "primary_engine": "postgresql" if not settings.USE_SQLITE else "sqlite",
            "host": settings.SUPABASE_DB_HOST,
        },
        "supabase": {
            "project_ref": settings.SUPABASE_PROJECT_REF,
            "url": settings.SUPABASE_URL,
        },
        "endpoints": {
            "docs": "/docs",
            "health": "/health",
            "db_health": "/api/health/database",
            "storage_health": "/api/health/storage",
            "api_auth": "/api/auth",
            "api_v1": settings.API_V1_STR,
        },
    }


# Comprehensive Health Check
@app.get(
    "/health",
    tags=["Health & Diagnostics"],
    summary="System Health Check",
    response_description="Independent health statuses for database, storage, and Supabase cloud",
)
@app.get(
    "/api/health",
    tags=["Health & Diagnostics"],
    summary="System Health Check (API alias)",
    include_in_schema=False,
)
async def health_check() -> Dict[str, Any]:
    """
    Comprehensive health check reporting independent diagnostics for:
    1. Database (PostgreSQL)
    2. Storage ('resumes' bucket)
    3. Supabase Cloud API
    """
    is_db_connected, dialect, db_diag = check_db_connection()
    is_storage_ready, storage_diag = storage_service.check_storage_status()

    return {
        "success": True,
        "status": "healthy" if (is_db_connected and is_storage_ready) else "configuration_required",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "database": {
            "engine": dialect,
            "status": "connected" if is_db_connected else db_diag.get("status", "disconnected"),
            "host": db_diag.get("supabase_host"),
            "credentials_configured": db_diag.get("credentials_configured"),
            "diagnostics": db_diag,
        },
        "storage": {
            "status": storage_diag.get("bucket_status"),
            "target_bucket": settings.SUPABASE_STORAGE_BUCKET_RESUMES,
            "diagnostics": storage_diag,
        },
        "supabase_api": {
            "status": storage_diag.get("api_connection", "connected"),
            "project_ref": settings.SUPABASE_PROJECT_REF,
            "url": settings.SUPABASE_URL,
        },
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


# Independent Database Health Endpoint
@app.get(
    "/api/health/database",
    tags=["Health & Diagnostics"],
    summary="Independent Database Health Probe",
    response_description="Direct PostgreSQL connectivity status",
)
async def api_health_database() -> Dict[str, Any]:
    """Independently verifies Supabase PostgreSQL connectivity."""
    is_healthy, dialect, diagnostics = check_db_connection()

    payload = {
        "success": is_healthy,
        "database": {
            "status": "connected" if is_healthy else diagnostics.get("status", "disconnected"),
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
            content=payload,
        )

    return payload


# Independent Storage Health Endpoint
@app.get(
    "/api/health/storage",
    tags=["Health & Diagnostics"],
    summary="Independent Storage Health Probe",
    response_description="Supabase Storage connectivity and bucket readiness",
)
async def api_health_storage() -> Dict[str, Any]:
    """Independently verifies Supabase Storage connectivity and bucket existence."""
    is_ready, diagnostics = storage_service.check_storage_status()

    payload = {
        "success": is_ready,
        "storage": diagnostics,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

    if not is_ready:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content=payload,
        )

    return payload


# Independent AI Health Endpoint
@app.get(
    "/api/health/ai",
    tags=["Health & Diagnostics"],
    summary="Independent AI Provider Health Probe",
    response_description="OpenAI / OpenRouter connectivity and model readiness",
)
async def api_health_ai() -> Dict[str, Any]:
    """Independently verifies OpenAI / OpenRouter connectivity."""
    from app.services.openai_service import openai_service
    diagnostics = openai_service.check_connection()
    is_healthy = diagnostics.get("status") == "connected"

    payload = {
        "success": is_healthy,
        "ai_service": diagnostics,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

    if not is_healthy:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content=payload,
        )

    return payload


# Mount API Routers
from app.api.routes import candidates, jobs, applications, resumes, ai, public_careers, hr_portal

api_direct = FastAPI().router
api_direct.include_router(candidates.router, prefix="/api/candidates", tags=["Candidates"])
api_direct.include_router(jobs.router, prefix="/api/jobs", tags=["Jobs"])
api_direct.include_router(applications.router, prefix="/api/applications", tags=["Applications"])
api_direct.include_router(resumes.router, prefix="/api/resumes", tags=["Resumes"])
api_direct.include_router(ai.router, prefix="/api/ai", tags=["AI Intelligence"])

app.include_router(auth.router, prefix="/api/auth")
app.include_router(public_careers.router)
app.include_router(hr_portal.router)
app.include_router(api_direct)
app.include_router(api_router)
