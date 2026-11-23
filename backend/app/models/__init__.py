"""
Models Package - DCI HireMind
Exports all SQLAlchemy models for easy import across the application and Alembic.
"""

from app.database.base import Base, TimestampMixin
from app.models.user import User, UserProfile
from app.models.candidate import Candidate
from app.models.job import Job
from app.models.application import Application
from app.models.resume_analysis import ResumeAnalysis
from app.models.interview_result import InterviewResult

__all__ = [
    "Base",
    "TimestampMixin",
    "User",
    "UserProfile",
    "Candidate",
    "Job",
    "Application",
    "ResumeAnalysis",
    "InterviewResult",
]
