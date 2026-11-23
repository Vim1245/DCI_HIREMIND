"""
Master API v1 Router - DCI HireMind
Aggregates modular routers for health, authentication, jobs, candidates, and applications.
"""

from fastapi import APIRouter
from app.api.routes import auth, health, candidates, jobs, applications, resumes, ai, public_careers, hr_portal

api_router = APIRouter(prefix="/api/v1")

# Mount route modules under /api/v1
api_router.include_router(health.router)
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(candidates.router, prefix="/candidates", tags=["Candidates"])
api_router.include_router(jobs.router, prefix="/jobs", tags=["Jobs"])
api_router.include_router(applications.router, prefix="/applications", tags=["Applications"])
api_router.include_router(resumes.router, prefix="/resumes", tags=["Resumes"])
api_router.include_router(ai.router, prefix="/ai", tags=["AI Intelligence"])
api_router.include_router(public_careers.router)
api_router.include_router(hr_portal.router)
