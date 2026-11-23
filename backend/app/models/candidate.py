"""
Candidate Database Model - DCI HireMind
Designed with Ethical AI principles: stores both confidential PII and 
anonymized profiles to enable bias-free blind screening workflows.
"""

from typing import TYPE_CHECKING, Any, Dict, List, Optional
from sqlalchemy import Float, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.application import Application
    from app.models.resume_analysis import ResumeAnalysis


class Candidate(Base, TimestampMixin):
    """
    Candidate entity maintaining raw applicant data alongside
    anonymized profiles used in unbiased AI screening.
    """
    __tablename__ = "candidates"

    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)

    # Protected Personal Information (Restricted Access)
    first_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    last_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    location: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    linkedin_url: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    portfolio_url: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Ethical Blind Screening Attributes
    anonymized_id: Mapped[str] = mapped_column(
        String(64), unique=True, index=True, nullable=False
    )
    raw_resume_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    anonymized_resume_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    skills: Mapped[Optional[List[str]]] = mapped_column(JSON, nullable=True)
    years_of_experience: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    education_level: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # General Candidate Status: NEW, SCREENING, IN_REVIEW, SHORTLISTED, REJECTED, HIRED
    status: Mapped[str] = mapped_column(String(50), default="NEW", nullable=False)

    # Relationships
    applications: Mapped[List["Application"]] = relationship(
        "Application",
        back_populates="candidate",
        cascade="all, delete-orphan",
    )
    resume_analyses: Mapped[List["ResumeAnalysis"]] = relationship(
        "ResumeAnalysis",
        back_populates="candidate",
        cascade="all, delete-orphan",
    )

    @property
    def full_name(self) -> str:
        parts = [p for p in [self.first_name, self.last_name] if p]
        return " ".join(parts) if parts else (self.email or "Anonymous Candidate")

    def __repr__(self) -> str:
        return f"<Candidate id={self.id} anon_id={self.anonymized_id} status={self.status}>"

