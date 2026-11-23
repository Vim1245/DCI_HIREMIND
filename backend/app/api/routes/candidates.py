"""
Candidates API Routes - DCI HireMind
Full CRUD for candidate profiles with RBAC and ethical-AI anonymisation.
"""

import logging
import math
import secrets
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.auth import SupabaseUser, get_current_user, require_roles
from app.database.session import get_db
from app.models.candidate import Candidate
from app.models.user import User
from app.schemas.candidate import (
    CandidateCreate,
    CandidateListResponse,
    CandidateResponse,
    CandidateUpdate,
)

logger = logging.getLogger("dci_hiremind.candidates")
router = APIRouter()


# ---------------------------------------------------------------------------
# POST /api/v1/candidates
# ---------------------------------------------------------------------------
@router.post(
    "",
    response_model=CandidateResponse,
    status_code=status.HTTP_201_CREATED,
    include_in_schema=False,
)
@router.post(
    "/",
    response_model=CandidateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new candidate profile",
)
async def create_candidate(
    payload: CandidateCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: SupabaseUser = Depends(get_current_user),
) -> CandidateResponse:
    """
    Any authenticated user may call this endpoint.
    Candidate-role users may only register their own email.
    """
    if current_user.role == "Candidate":
        if payload.email.lower().strip() != current_user.email.lower().strip():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Candidate role users can only create a profile for their own email.",
            )

    try:
        # Duplicate email check
        existing = db.query(Candidate).filter(Candidate.email == payload.email).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"A candidate with email '{payload.email}' already exists.",
            )

        candidate = Candidate(
            first_name=payload.first_name,
            last_name=payload.last_name,
            email=payload.email,
            phone=payload.phone,
            location=payload.location,
            skills=payload.skills,
            years_of_experience=payload.years_of_experience,
            education_level=payload.education_level,
            anonymized_id=secrets.token_hex(16),
            status="NEW",
        )
        db.add(candidate)
        db.commit()
        db.refresh(candidate)
        logger.info(f"Candidate created: id={candidate.id} by {current_user.email}")
        return candidate

    except HTTPException:
        raise
    except Exception as exc:
        db.rollback()
        logger.error(f"Error creating candidate: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create candidate profile.",
        )


# ---------------------------------------------------------------------------
# GET /api/v1/candidates
# ---------------------------------------------------------------------------
@router.get(
    "",
    response_model=CandidateListResponse,
    include_in_schema=False,
)
@router.get(
    "/",
    response_model=CandidateListResponse,
    summary="List candidates (Admin / Recruiter)",
)
async def list_candidates(
    db: Annotated[Session, Depends(get_db)],
    current_user: SupabaseUser = Depends(require_roles(["Admin", "Recruiter"])),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=100, description="Results per page"),
    q: Optional[str] = Query(None, description="Search by name, email, or skill"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status"),
) -> CandidateListResponse:
    try:
        query = db.query(Candidate)

        if q:
            search_term = f"%{q}%"
            query = query.filter(
                Candidate.first_name.ilike(search_term)
                | Candidate.last_name.ilike(search_term)
                | Candidate.email.ilike(search_term)
            )

        if status_filter:
            query = query.filter(Candidate.status == status_filter.upper())

        total = query.count()
        offset = (page - 1) * page_size
        items = query.offset(offset).limit(page_size).all()

        # Post-filter by skills in Python (JSON column; DB-agnostic)
        if q:
            q_lower = q.lower()
            # Include any item that wasn't already matched by name/email but matches a skill
            matched_ids = {c.id for c in items}
            skill_matches = [
                c for c in db.query(Candidate).all()
                if c.id not in matched_ids
                and c.skills
                and any(q_lower in s.lower() for s in c.skills)
            ]
            items = items + skill_matches

        return CandidateListResponse(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=math.ceil(total / page_size) if total else 0,
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Error listing candidates: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve candidate list.",
        )


# ---------------------------------------------------------------------------
# GET /api/v1/candidates/{id}
# ---------------------------------------------------------------------------
@router.get(
    "/{candidate_id}",
    response_model=CandidateResponse,
    summary="Get a single candidate",
)
async def get_candidate(
    candidate_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: SupabaseUser = Depends(get_current_user),
) -> CandidateResponse:
    try:
        candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
        if not candidate:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found.")

        if current_user.role == "Candidate":
            if candidate.email.lower() != current_user.email.lower():
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Candidates may only view their own profile.",
                )

        return candidate
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Error fetching candidate {candidate_id}: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve candidate.",
        )


# ---------------------------------------------------------------------------
# PUT / PATCH /api/v1/candidates/{id}
# ---------------------------------------------------------------------------
@router.put(
    "/{candidate_id}",
    response_model=CandidateResponse,
    summary="Update candidate (PUT alias)",
)
@router.patch(
    "/{candidate_id}",
    response_model=CandidateResponse,
    summary="Update candidate (Admin / Recruiter)",
)
async def update_candidate(
    candidate_id: int,
    payload: CandidateUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: SupabaseUser = Depends(require_roles(["Admin", "Recruiter"])),
) -> CandidateResponse:
    try:
        candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
        if not candidate:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found.")

        update_data = payload.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(candidate, field, value)

        db.commit()
        db.refresh(candidate)
        logger.info(f"Candidate {candidate_id} updated by {current_user.email}")
        return candidate
    except HTTPException:
        raise
    except Exception as exc:
        db.rollback()
        logger.error(f"Error updating candidate {candidate_id}: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update candidate.",
        )


# ---------------------------------------------------------------------------
# DELETE /api/v1/candidates/{id}  — soft delete (ARCHIVED)
# ---------------------------------------------------------------------------
@router.delete(
    "/{candidate_id}",
    status_code=status.HTTP_200_OK,
    summary="Archive candidate (Admin only)",
)
async def archive_candidate(
    candidate_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: SupabaseUser = Depends(require_roles(["Admin"])),
) -> dict:
    try:
        candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
        if not candidate:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found.")

        candidate.status = "ARCHIVED"
        db.commit()
        logger.info(f"Candidate {candidate_id} archived by {current_user.email}")
        return {"detail": f"Candidate {candidate_id} has been archived."}
    except HTTPException:
        raise
    except Exception as exc:
        db.rollback()
        logger.error(f"Error archiving candidate {candidate_id}: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to archive candidate.",
        )
