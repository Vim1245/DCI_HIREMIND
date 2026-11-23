"""
Schemas Package - DCI HireMind
Exports all Pydantic request/response models for the API layer.
"""

from app.schemas.candidate import (
    CandidateCreate,
    CandidateUpdate,
    CandidateResponse,
    CandidateListResponse,
)
from app.schemas.job import (
    JobCreate,
    JobUpdate,
    JobResponse,
    JobListResponse,
)
from app.schemas.application import (
    ApplicationCreate,
    ApplicationStatusUpdate,
    ApplicationResponse,
    ApplicationListResponse,
)
from app.schemas.user import UserProfileResponse

__all__ = [
    # Candidate
    "CandidateCreate",
    "CandidateUpdate",
    "CandidateResponse",
    "CandidateListResponse",
    # Job
    "JobCreate",
    "JobUpdate",
    "JobResponse",
    "JobListResponse",
    # Application
    "ApplicationCreate",
    "ApplicationStatusUpdate",
    "ApplicationResponse",
    "ApplicationListResponse",
    # User
    "UserProfileResponse",
]
