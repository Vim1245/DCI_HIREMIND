"""
Interview Result Database Model - DCI HireMind
Tracks structured interview results, AI-suggested question rubrics,
and mandatory human interviewer ratings and recommendations.
"""

from datetime import datetime
from typing import TYPE_CHECKING, Any, Dict, List, Optional
from sqlalchemy import DateTime, Float, ForeignKey, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.application import Application
    from app.models.user import User


class InterviewResult(Base, TimestampMixin):
    """
    Records interview rounds, questions, AI assistive notes,
    and interviewer ratings with mandatory human signoff.
    """
    __tablename__ = "interview_results"

    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    application_id: Mapped[int] = mapped_column(
        ForeignKey("applications.id", ondelete="CASCADE"), index=True, nullable=False
    )
    interviewer_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    interview_type: Mapped[str] = mapped_column(
        String(50), default="TECHNICAL", nullable=False
    )  # TECHNICAL, BEHAVIORAL, SYSTEM_DESIGN, HR_SCREEN
    scheduled_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[str] = mapped_column(
        String(50), default="SCHEDULED", nullable=False
    )  # SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED

    # AI Assistive Intelligence (Objective rubrics & evaluation aid)
    ai_suggested_questions: Mapped[Optional[List[Dict[str, Any]]]] = mapped_column(
        JSON, nullable=True
    )
    ai_transcript_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ai_competency_scores: Mapped[Optional[Dict[str, float]]] = mapped_column(JSON, nullable=True)

    # Human Interviewer Assessment & Scorecard (Mandatory Human Decision)
    interviewer_rating: Mapped[Optional[float]] = mapped_column(Float, nullable=True)  # 1.0 - 5.0
    interviewer_feedback: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    recommendation: Mapped[Optional[str]] = mapped_column(
        String(50), nullable=True
    )  # STRONG_HIRE, HIRE, NO_HIRE, FURTHER_ROUND

    # Relationships
    application: Mapped["Application"] = relationship(
        "Application",
        back_populates="interview_results",
    )
    interviewer: Mapped[Optional["User"]] = relationship(
        "User",
    )

    def __repr__(self) -> str:
        return f"<InterviewResult id={self.id} app_id={self.application_id} type={self.interview_type}>"

