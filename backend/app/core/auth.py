"""
Supabase Authentication & Role-Based Access Control (RBAC) - DCI HireMind
Validates incoming Supabase Bearer JWT tokens and enforces strict role permissions.

Roles:
- Admin: Full administrative privileges
- Recruiter: Job management, candidate review, interview scheduling
- Candidate: Application submission and personal profile tracking
"""

import logging
from typing import Any, Callable, Dict, List, Optional
from pydantic import BaseModel
from fastapi import Depends, HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session
from supabase import Client, create_client

from app.core.config import get_settings
from app.database.session import get_db
from app.models.user import User

logger = logging.getLogger("dci_hiremind.auth")
settings = get_settings()

security = HTTPBearer(auto_error=False)

# Validated Application Roles
VALID_ROLES = {"Admin", "Recruiter", "Candidate"}
ROLE_MAP = {r.lower(): r for r in VALID_ROLES}


def normalize_role(role_input: Optional[str], default: str = "Candidate") -> str:
    """Normalizes role strings to canonical TitleCase (Admin, Recruiter, Candidate)."""
    if not role_input:
        return default
    return ROLE_MAP.get(role_input.strip().lower(), default)


class SupabaseUser(BaseModel):
    """Authenticated user context containing Supabase identity and profile data."""
    id: str  # Supabase UID
    email: str
    full_name: Optional[str] = None
    role: str = "Candidate"
    phone_number: Optional[str] = None
    email_confirmed: bool = False
    user_metadata: Dict[str, Any] = {}
    app_metadata: Dict[str, Any] = {}

    @property
    def is_admin(self) -> bool:
        return self.role == "Admin"

    @property
    def is_recruiter(self) -> bool:
        return self.role in ("Admin", "Recruiter")


def get_supabase_client() -> Client:
    """Returns initialized Supabase client."""
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security),
    db: Session = Depends(get_db),
) -> SupabaseUser:
    """
    FastAPI dependency validating the Supabase JWT token from the Authorization header.
    Queries Supabase Auth to confirm active token status, and syncs with local User profile.
    """
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided. Include 'Authorization: Bearer <token>' header.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    supabase = get_supabase_client()

    try:
        # Validate token against Supabase Auth service
        user_response = supabase.auth.get_user(token)
        if not user_response or not user_response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired Supabase authentication session.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        auth_user = user_response.user
        metadata = auth_user.user_metadata or {}
        raw_role = metadata.get("role") or (auth_user.app_metadata or {}).get("role") or "Candidate"
        canonical_role = normalize_role(raw_role)

        # Check / sync database user profile
        db_user = None
        try:
            db_user = db.scalar(
                select(User).where(
                    (User.supabase_uid == str(auth_user.id)) | (User.email == auth_user.email)
                )
            )
        except Exception as db_err:
            logger.warning(f"Database query failed in get_current_user (falling back to JWT metadata): {db_err}")

        full_name = metadata.get("full_name")
        phone_number = metadata.get("phone_number") or metadata.get("phone")

        if not db_user:
            try:
                db_user = User(
                    supabase_uid=str(auth_user.id),
                    email=auth_user.email or "",
                    full_name=full_name,
                    phone_number=phone_number,
                    role=canonical_role,
                    is_active=True,
                )
                db.add(db_user)
                db.commit()
                db.refresh(db_user)
            except Exception:
                db.rollback()
        else:
            # Sync any updated UID or fields
            dirty = False
            if not db_user.supabase_uid:
                db_user.supabase_uid = str(auth_user.id)
                dirty = True
            if full_name and not db_user.full_name:
                db_user.full_name = full_name
                dirty = True
            if phone_number and not db_user.phone_number:
                db_user.phone_number = phone_number
                dirty = True
            if dirty:
                try:
                    db.commit()
                except Exception:
                    db.rollback()

        # Database role takes precedence if modified by an Admin
        final_role = normalize_role((db_user.role if db_user else None) or canonical_role)

        return SupabaseUser(
            id=str(auth_user.id),
            email=auth_user.email or "",
            full_name=(db_user.full_name if db_user else None) or full_name,
            role=final_role,
            phone_number=(db_user.phone_number if db_user else None) or phone_number,
            email_confirmed=bool(auth_user.confirmed_at or auth_user.email_confirmed_at),
            user_metadata=metadata,
            app_metadata=auth_user.app_metadata or {},
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.warning(f"Supabase token validation error: {exc}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session verification failed. Token is expired or invalid.",
            headers={"WWW-Authenticate": "Bearer"},
        )


def require_roles(allowed_roles: List[str]) -> Callable:
    """
    Role-Based Access Control (RBAC) dependency factory.
    Enforces that current user possesses at least one of the allowed roles.
    Example: Depends(require_roles(["Admin", "Recruiter"]))
    """
    normalized_allowed = {r.lower() for r in allowed_roles}

    async def role_checker(
        current_user: SupabaseUser = Depends(get_current_user),
    ) -> SupabaseUser:
        user_role_lower = current_user.role.lower()
        if user_role_lower not in normalized_allowed:
            logger.warning(
                f"Access denied: User {current_user.email} (Role: {current_user.role}) "
                f"attempted to access an endpoint requiring {allowed_roles}."
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Forbidden: Access requires one of the following roles: {allowed_roles}. Current role: '{current_user.role}'.",
            )
        return current_user

    return role_checker
