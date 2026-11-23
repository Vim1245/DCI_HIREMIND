"""
Job Requisition Database Model - DCI HireMind
Represents open employment requisitions, skill criteria, and evaluation rubrics.
"""

from typing import TYPE_CHECKING, List, Optional
from sqlalchemy import Float, ForeignKey, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.application import Application


class Job(Base, TimestampMixin):
    """
    Job entity representing open requisitions and their skill criteria.
    """
    __tablename__ = "jobs"

    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    department: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    location: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    employment_type: Mapped[str] = mapped_column(String(50), default="Full-Time", nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    requirements: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    required_skills: Mapped[Optional[List[str]]] = mapped_column(JSON, nullable=True)
    experience_level: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    salary_min: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    salary_max: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Status: DRAFT, OPEN, PAUSED, CLOSED
    status: Mapped[str] = mapped_column(String(50), default="OPEN", nullable=False)

    # Creator / Owner
    created_by_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    # Relationships
    created_by: Mapped[Optional["User"]] = relationship(
        "User",
        back_populates="posted_jobs",
    )
    applications: Mapped[List["Application"]] = relationship(
        "Application",
        back_populates="job",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<Job id={self.id} title='{self.title}' status={self.status}>"

