"""
User Database Model - DCI HireMind
Provides Role-Based Access Control (RBAC), Supabase Auth identity linking,
and complete user profile information.
"""

from typing import TYPE_CHECKING, List, Optional
from sqlalchemy import Boolean, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.job import Job
    from app.models.application import Application


class User(Base, TimestampMixin):
    """
    User entity representing system users across three roles:
    - Admin: Full system governance and user management
    - Recruiter: Job posting, candidate evaluation, interview scheduling
    - Candidate: Application submission and status tracking
    """
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    supabase_uid: Mapped[Optional[str]] = mapped_column(
        String(64), unique=True, index=True, nullable=True
    )
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    full_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    phone_number: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    role: Mapped[str] = mapped_column(String(50), default="Candidate", nullable=False)
    hashed_password: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_superuser: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Relationships
    posted_jobs: Mapped[List["Job"]] = relationship(
        "Job",
        back_populates="created_by",
        cascade="all, delete-orphan",
    )
    reviewed_applications: Mapped[List["Application"]] = relationship(
        "Application",
        back_populates="reviewed_by",
    )

    def __repr__(self) -> str:
        return f"<User id={self.id} email='{self.email}' role='{self.role}'>"


# Class alias for User Profile
UserProfile = User
