"""
Application Database Model - DCI HireMind
Connects Candidates to Job Requisitions and embeds:
1. Explainable AI Match Analyses (match score, rationale, skill gaps)
2. Human-in-the-Loop (HITL) Decision Audit Trails (Zero Auto-Rejection enforcement)
"""

from datetime import datetime
from typing import TYPE_CHECKING, Any, Dict, List, Optional
from sqlalchemy import DateTime, Float, ForeignKey, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.candidate import Candidate
    from app.models.job import Job
    from app.models.interview_result import InterviewResult


class Application(Base, TimestampMixin):
    """
    Application entity linking candidates to jobs, tracking stages,
    AI evaluation scores, and mandatory human review decisions.
    """
    __tablename__ = "applications"

    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)

    # Foreign Keys
    job_id: Mapped[int] = mapped_column(
        ForeignKey("jobs.id", ondelete="CASCADE"), index=True, nullable=False
    )
    candidate_id: Mapped[int] = mapped_column(
        ForeignKey("candidates.id", ondelete="CASCADE"), index=True, nullable=False
    )

    # Recruitment Stage: APPLIED, UNDER_REVIEW, SHORTLISTED, INTERVIEW_SCHEDULED, SELECTED, REJECTED
    stage: Mapped[str] = mapped_column(String(50), default="APPLIED", nullable=False)

    # Public Application Metadata
    reference_number: Mapped[Optional[str]] = mapped_column(String(64), unique=True, index=True, nullable=True)
    cover_letter: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Explainable AI Analysis (Assistive Intelligence Only)
    match_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    match_rationale: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    skill_gap_analysis: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    ai_recommendation: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Human-in-the-Loop (HITL) Decision Gate
    # Candidates are NEVER rejected automatically. A human decision is mandatory.
    human_reviewed_by_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    human_decision: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    human_feedback: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    human_reviewed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationships
    job: Mapped["Job"] = relationship(
        "Job",
        back_populates="applications",
    )
    candidate: Mapped["Candidate"] = relationship(
        "Candidate",
        back_populates="applications",
    )
    reviewed_by: Mapped[Optional["User"]] = relationship(
        "User",
        back_populates="reviewed_applications",
    )
    interview_results: Mapped[List["InterviewResult"]] = relationship(
        "InterviewResult",
        back_populates="application",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return (
            f"<Application id={self.id} job_id={self.job_id} "
            f"candidate_id={self.candidate_id} stage={self.stage}>"
        )

