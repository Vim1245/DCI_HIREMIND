"""
Authentication & User Management Endpoints - DCI HireMind
Integrates with Supabase Auth (GoTrue) for secure registration, login, logout,
password resets, and role-based access control.
"""

import logging
from datetime import datetime, timezone
from typing import Any, Dict, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth import (
    SupabaseUser,
    get_current_user,
    get_supabase_client,
    normalize_role,
    require_roles,
)
from app.database.session import get_db
from app.models.user import User

logger = logging.getLogger("dci_hiremind.api.auth")
router = APIRouter(tags=["Supabase Authentication"])


# ==============================================================================
# Request & Response Schemas
# ==============================================================================
class UserRegisterRequest(BaseModel):
    """User registration payload."""
    email: str = Field(..., description="Valid user email address")
    password: str = Field(..., min_length=6, description="Password (min 6 characters for Supabase)")
    full_name: str = Field(..., min_length=2, description="User full name")
    role: Optional[str] = Field("Candidate", description="Requested role: 'Candidate' or 'Recruiter'")
    phone_number: Optional[str] = Field(None, description="Contact phone number")


class UserLoginRequest(BaseModel):
    """User login payload."""
    email: str = Field(..., description="Registered email address")
    password: str = Field(..., description="User account password")


class ForgotPasswordRequest(BaseModel):
    """Password reset request payload."""
    email: str = Field(..., description="Email address associated with the account")
    redirect_to: Optional[str] = Field(
        None, description="Optional frontend URL to redirect after password reset"
    )


class TokenRefreshRequest(BaseModel):
    """Token refresh payload."""
    refresh_token: str = Field(..., description="Valid Supabase refresh token")


# ==============================================================================
# Authentication Endpoints
# ==============================================================================
@router.post(
    "/register",
    summary="Register New User",
    response_description="Registration status and user profile",
    status_code=status.HTTP_201_CREATED,
)
async def register(
    payload: UserRegisterRequest,
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """
    Registers a new user via Supabase Auth and provisions their database profile.
    
    Security Guardrail:
    - Frontend users CANNOT self-assign the 'Admin' role.
    - Public self-registration permits only 'Candidate' or 'Recruiter'.
    - If 'Admin' is supplied, the request is rejected with HTTP 400.
    """
    # 1. Enforce Role Sanitization
    requested_role = payload.role.strip() if payload.role else "Candidate"
    if requested_role.lower() == "admin":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Security Violation: Direct self-assignment of the 'Admin' role is prohibited.",
        )

    canonical_role = normalize_role(requested_role, default="Candidate")

    # 2. Check for duplicate email in local database
    existing_user = db.scalar(select(User).where(User.email == payload.email.strip().lower()))
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists.",
        )

    # 3. Register user with Supabase Auth
    supabase = get_supabase_client()
    try:
        auth_response = supabase.auth.sign_up(
            {
                "email": payload.email.strip().lower(),
                "password": payload.password,
                "options": {
                    "data": {
                        "full_name": payload.full_name.strip(),
                        "role": canonical_role,
                        "phone_number": payload.phone_number.strip() if payload.phone_number else None,
                    }
                },
            }
        )
    except Exception as exc:
        logger.error(f"Supabase registration error: {exc}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Registration failed: {str(exc)}",
        )

    auth_user = auth_response.user
    session = auth_response.session
    if not auth_user:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create user record in Supabase Auth.",
        )

    # 4. Provision or sync local database profile
    db_user = User(
        supabase_uid=str(auth_user.id),
        email=payload.email.strip().lower(),
        full_name=payload.full_name.strip(),
        phone_number=payload.phone_number.strip() if payload.phone_number else None,
        role=canonical_role,
        is_active=True,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    is_confirmed = bool(auth_user.confirmed_at or auth_user.email_confirmed_at)

    return {
        "success": True,
        "message": (
            "Registration successful. Please check your email to verify your account."
            if not is_confirmed and not session
            else "Registration successful."
        ),
        "user": {
            "id": db_user.id,
            "supabase_uid": str(auth_user.id),
            "email": db_user.email,
            "full_name": db_user.full_name,
            "role": db_user.role,
            "phone_number": db_user.phone_number,
            "email_confirmed": is_confirmed,
            "created_at": db_user.created_at.isoformat() if db_user.created_at else None,
        },
        "session": {
            "access_token": session.access_token if session else None,
            "refresh_token": session.refresh_token if session else None,
            "token_type": "bearer" if session else None,
        } if session else None,
    }


@router.post(
    "/login",
    summary="Authenticate User",
    response_description="Access and refresh tokens with user profile",
)
async def login(
    payload: UserLoginRequest,
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """
    Authenticates a user using Supabase Auth with email and password.
    Returns Supabase JWT access and refresh tokens.
    """
    supabase = get_supabase_client()

    try:
        auth_response = supabase.auth.sign_in_with_password(
            {
                "email": payload.email.strip().lower(),
                "password": payload.password,
            }
        )
    except Exception as exc:
        logger.warning(f"Failed login attempt for {payload.email}: {exc}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    session = auth_response.session
    auth_user = auth_response.user
    if not session or not auth_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Sync / fetch database profile
    db_user = db.scalar(
        select(User).where(
            (User.supabase_uid == str(auth_user.id)) | (User.email == auth_user.email)
        )
    )

    metadata = auth_user.user_metadata or {}
    canonical_role = normalize_role(metadata.get("role", "Candidate"))

    if not db_user:
        db_user = User(
            supabase_uid=str(auth_user.id),
            email=auth_user.email or "",
            full_name=metadata.get("full_name"),
            phone_number=metadata.get("phone_number"),
            role=canonical_role,
            is_active=True,
        )
        db.add(db_user)
        db.commit()
        db.refresh(db_user)

    return {
        "success": True,
        "message": "Authentication successful.",
        "access_token": session.access_token,
        "refresh_token": session.refresh_token,
        "token_type": "bearer",
        "expires_in": session.expires_in,
        "user": {
            "id": db_user.id,
            "supabase_uid": str(auth_user.id),
            "email": db_user.email,
            "full_name": db_user.full_name,
            "role": db_user.role,
            "phone_number": db_user.phone_number,
            "created_at": db_user.created_at.isoformat() if db_user.created_at else None,
        },
    }


@router.post(
    "/refresh",
    summary="Refresh Session Token",
    response_description="New access and refresh tokens",
)
async def refresh_session(
    payload: TokenRefreshRequest,
) -> Dict[str, Any]:
    """
    Refreshes an expired access token using the Supabase refresh token.
    """
    supabase = get_supabase_client()
    try:
        auth_response = supabase.auth.refresh_session(payload.refresh_token)
    except Exception as exc:
        logger.warning(f"Supabase refresh_session error: {exc}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session refresh failed. Refresh token is expired or invalid.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    session = auth_response.session
    if not session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not refresh session token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return {
        "success": True,
        "access_token": session.access_token,
        "refresh_token": session.refresh_token,
        "token_type": "bearer",
        "expires_in": session.expires_in,
    }


@router.post(
    "/logout",
    summary="Logout User",
    response_description="Logout confirmation message",
)
async def logout(
    authorization: Optional[str] = Header(None),
) -> Dict[str, Any]:
    """
    Terminates the active user session on Supabase Auth.
    Requires Bearer token in the Authorization header.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header with Bearer token is required for logout.",
        )

    token = authorization.split(" ")[1]
    supabase = get_supabase_client()

    try:
        # Invalidate session on Supabase
        supabase.auth.sign_out()
    except Exception as exc:
        logger.warning(f"Supabase sign_out notice: {exc}")

    return {
        "success": True,
        "message": "User session has been successfully logged out.",
    }


@router.get(
    "/me",
    summary="Get Current User Profile",
    response_description="Verified user profile and roles",
)
async def get_me(
    current_user: SupabaseUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """
    Retrieves the authenticated user's verified identity, role, and profile.
    Protected by Supabase JWT verification.
    """
    db_user = db.scalar(
        select(User).where(
            (User.supabase_uid == current_user.id) | (User.email == current_user.email)
        )
    )

    return {
        "success": True,
        "user": {
            "id": db_user.id if db_user else None,
            "supabase_uid": current_user.id,
            "email": current_user.email,
            "full_name": current_user.full_name,
            "role": current_user.role,
            "phone_number": current_user.phone_number,
            "email_confirmed": current_user.email_confirmed,
            "created_at": db_user.created_at.isoformat() if db_user and db_user.created_at else None,
        },
    }


@router.post(
    "/forgot-password",
    summary="Request Password Reset",
    response_description="Password reset email confirmation",
)
async def forgot_password(payload: ForgotPasswordRequest) -> Dict[str, Any]:
    """
    Sends a password reset email via Supabase Auth.
    Does not leak whether the email exists for account security.
    """
    supabase = get_supabase_client()

    try:
        options = {}
        if payload.redirect_to:
            options["redirect_to"] = payload.redirect_to

        supabase.auth.reset_password_email(payload.email.strip().lower(), options=options)
    except Exception as exc:
        logger.warning(f"Password reset request error for {payload.email}: {exc}")

    return {
        "success": True,
        "message": "If an account exists with this email address, a password reset link has been sent.",
    }


# ==============================================================================
# Role-Protected Verification Endpoints (Used for testing and RBAC validation)
# ==============================================================================
@router.get(
    "/admin-only",
    summary="Admin-Only Endpoint",
    response_description="Accessible only by users with 'Admin' role",
)
async def admin_only_endpoint(
    current_user: SupabaseUser = Depends(require_roles(["Admin"])),
) -> Dict[str, Any]:
    """Protected endpoint accessible exclusively by Admins."""
    return {
        "success": True,
        "message": "Access granted: You have Admin privileges.",
        "user": current_user.email,
        "role": current_user.role,
    }


@router.get(
    "/recruiter-only",
    summary="Recruiter-Only Endpoint",
    response_description="Accessible by 'Recruiter' or 'Admin' roles",
)
async def recruiter_only_endpoint(
    current_user: SupabaseUser = Depends(require_roles(["Admin", "Recruiter"])),
) -> Dict[str, Any]:
    """Protected endpoint accessible by Recruiters and Admins."""
    return {
        "success": True,
        "message": "Access granted: You have Recruiter/Admin privileges.",
        "user": current_user.email,
        "role": current_user.role,
    }


@router.get(
    "/candidate-only",
    summary="Candidate-Accessible Endpoint",
    response_description="Accessible by all registered roles",
)
async def candidate_only_endpoint(
    current_user: SupabaseUser = Depends(require_roles(["Admin", "Recruiter", "Candidate"])),
) -> Dict[str, Any]:
    """Protected endpoint accessible by all authenticated users."""
    return {
        "success": True,
        "message": "Access granted: Authenticated user.",
        "user": current_user.email,
        "role": current_user.role,
    }
