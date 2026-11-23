"""
Resume Analysis Database Model - DCI HireMind
Stores file metadata, Supabase Storage paths, and parsed/anonymized resume representations.
"""

from typing import TYPE_CHECKING, Any, Dict, List, Optional
from sqlalchemy import Float, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.candidate import Candidate


class ResumeAnalysis(Base, TimestampMixin):
    """
    Tracks uploaded resume documents stored in Supabase Storage,
    along with their parsed and anonymized text extracted for blind screening.
    """
    __tablename__ = "resume_analyses"

    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    candidate_id: Mapped[int] = mapped_column(
        ForeignKey("candidates.id", ondelete="CASCADE"), index=True, nullable=False
    )

    # Supabase Storage Metadata
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    storage_path: Mapped[str] = mapped_column(String(500), nullable=False)
    file_type: Mapped[str] = mapped_column(String(20), nullable=False)  # pdf, docx
    file_size_bytes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Text extraction & Ethical Blind Screening
    raw_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    anonymized_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    extracted_skills: Mapped[Optional[List[str]]] = mapped_column(JSON, nullable=True)
    experience_years: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    education_entries: Mapped[Optional[List[Dict[str, Any]]]] = mapped_column(JSON, nullable=True)
    certifications: Mapped[Optional[List[str]]] = mapped_column(JSON, nullable=True)

    # AI Summary & Processing Status
    ai_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    parsing_status: Mapped[str] = mapped_column(String(50), default="COMPLETED", nullable=False)
    parsing_error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationship
    candidate: Mapped["Candidate"] = relationship(
        "Candidate",
        back_populates="resume_analyses",
    )

    def __repr__(self) -> str:
        return f"<ResumeAnalysis id={self.id} candidate_id={self.candidate_id} file='{self.file_name}'>"

