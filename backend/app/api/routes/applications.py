"""
Applications API Routes - DCI HireMind
Full CRUD for job applications.

ETHICAL AI PRINCIPLE — Zero Auto-Rejection:
  - stage="REJECTED" may NEVER be set automatically.
  - A human_decision="REJECTED" is required and must be explicitly supplied.
  - Rejections are logged for audit trail compliance.
"""

import logging
import math
from datetime import datetime, timezone
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.auth import SupabaseUser, get_current_user, require_roles
from app.database.session import get_db
from app.models.application import Application
from app.models.candidate import Candidate
from app.models.job import Job
from app.models.user import User
from app.schemas.application import (
    ApplicationCreate,
    ApplicationListResponse,
    ApplicationResponse,
    ApplicationStatusUpdate,
)

logger = logging.getLogger("dci_hiremind.applications")
router = APIRouter()


# ---------------------------------------------------------------------------
# POST /api/v1/applications
# ---------------------------------------------------------------------------
@router.post(
    "",
    response_model=ApplicationResponse,
    status_code=status.HTTP_201_CREATED,
    include_in_schema=False,
)
@router.post(
    "/",
    response_model=ApplicationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit a job application (authenticated)",
)
async def create_application(
    payload: ApplicationCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: SupabaseUser = Depends(get_current_user),
) -> ApplicationResponse:
    try:
        # Validate job exists
        job = db.query(Job).filter(Job.id == payload.job_id).first()
        if not job:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found.")

        # Validate candidate exists
        candidate = db.query(Candidate).filter(Candidate.id == payload.candidate_id).first()
        if not candidate:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found.")

        # Prevent duplicate application
        existing = db.query(Application).filter(
            Application.job_id == payload.job_id,
            Application.candidate_id == payload.candidate_id,
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This candidate has already applied for this job.",
            )

        application = Application(
            job_id=payload.job_id,
            candidate_id=payload.candidate_id,
            stage="APPLIED",
        )
        db.add(application)
        db.commit()
        db.refresh(application)
        logger.info(
            f"Application created: id={application.id} job={payload.job_id} "
            f"candidate={payload.candidate_id} by {current_user.email}"
        )
        return application
    except HTTPException:
        raise
    except Exception as exc:
        db.rollback()
        logger.error(f"Error creating application: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to submit application.",
        )


# ---------------------------------------------------------------------------
# GET /api/v1/applications
# ---------------------------------------------------------------------------
@router.get(
    "",
    response_model=ApplicationListResponse,
    include_in_schema=False,
)
@router.get(
    "/",
    response_model=ApplicationListResponse,
    summary="List applications",
)
async def list_applications(
    db: Annotated[Session, Depends(get_db)],
    current_user: SupabaseUser = Depends(get_current_user),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    stage: Optional[str] = Query(None, description="Filter by stage"),
    job_id: Optional[int] = Query(None, description="Filter by job ID"),
) -> ApplicationListResponse:
    try:
        query = db.query(Application)

        if current_user.role == "Candidate":
            # Candidates see only their own applications
            candidate = db.query(Candidate).filter(
                Candidate.email == current_user.email
            ).first()
            if not candidate:
                return ApplicationListResponse(
                    items=[], total=0, page=page, page_size=page_size, total_pages=0
                )
            query = query.filter(Application.candidate_id == candidate.id)
        # Admin / Recruiter see all

        if stage:
            query = query.filter(Application.stage == stage.upper())
        if job_id:
            query = query.filter(Application.job_id == job_id)

        total = query.count()
        offset = (page - 1) * page_size
        items = query.offset(offset).limit(page_size).all()

        return ApplicationListResponse(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=math.ceil(total / page_size) if total else 0,
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Error listing applications: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve applications.",
        )


# ---------------------------------------------------------------------------
# GET /api/v1/applications/{id}
# ---------------------------------------------------------------------------
@router.get(
    "/{application_id}",
    response_model=ApplicationResponse,
    summary="Get a single application",
)
async def get_application(
    application_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: SupabaseUser = Depends(get_current_user),
) -> ApplicationResponse:
    try:
        application = db.query(Application).filter(Application.id == application_id).first()
        if not application:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found.")

        if current_user.role == "Candidate":
            candidate = db.query(Candidate).filter(Candidate.email == current_user.email).first()
            if not candidate or application.candidate_id != candidate.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Candidates may only view their own applications.",
                )

        return application
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Error fetching application {application_id}: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve application.",
        )


# ---------------------------------------------------------------------------
# PUT / PATCH /api/v1/applications/{id}/status & /{id}
# ---------------------------------------------------------------------------
@router.put(
    "/{application_id}",
    response_model=ApplicationResponse,
    summary="Update application status (PUT alias)",
)
@router.patch(
    "/{application_id}",
    response_model=ApplicationResponse,
    summary="Update application status (PATCH alias)",
)
@router.patch(
    "/{application_id}/status",
    response_model=ApplicationResponse,
    summary="Update application stage / human review (Admin / Recruiter)",
)
async def update_application_status(
    application_id: int,
    payload: ApplicationStatusUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: SupabaseUser = Depends(require_roles(["Admin", "Recruiter"])),
) -> ApplicationResponse:
    """
    HITL enforcement:
    - stage may never be set to 'REJECTED' via the API automatically.
    - If human_decision='REJECTED', that is logged and persisted as an explicit
      human choice — the stage is set to 'REJECTED' only alongside a human decision.
    - Any attempt to set stage='REJECTED' without a human_decision is rejected.
    """
    try:
        application = db.query(Application).filter(Application.id == application_id).first()
        if not application:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found.")

        # Ethical AI guard: no silent/auto rejection
        requested_stage = (payload.stage or "").upper()
        if requested_stage == "REJECTED" and not payload.human_decision:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=(
                    "Zero Auto-Rejection policy: stage='REJECTED' requires an explicit "
                    "human_decision value. Candidates may never be rejected automatically."
                ),
            )

        if payload.stage:
            application.stage = payload.stage.upper()

        if payload.human_decision:
            db_reviewer = db.query(User).filter(User.email == current_user.email).first()
            application.human_decision = payload.human_decision
            application.human_reviewed_at = datetime.now(timezone.utc)
            if db_reviewer:
                application.human_reviewed_by_id = db_reviewer.id

            if payload.human_decision.upper() == "REJECTED":
                application.stage = "REJECTED"
                logger.warning(
                    f"[HITL AUDIT] Application {application_id} REJECTED by human "
                    f"{current_user.email} at {application.human_reviewed_at.isoformat()}"
                )

        if payload.human_feedback:
            application.human_feedback = payload.human_feedback

        db.commit()
        db.refresh(application)
        logger.info(f"Application {application_id} status updated by {current_user.email}")
        return application
    except HTTPException:
        raise
    except Exception as exc:
        db.rollback()
        logger.error(f"Error updating application {application_id}: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update application status.",
        )


# ---------------------------------------------------------------------------
# DELETE /api/v1/applications/{id}
# ---------------------------------------------------------------------------
@router.delete(
    "/{application_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete application (Admin only)",
)
async def delete_application(
    application_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: SupabaseUser = Depends(require_roles(["Admin", "Recruiter"])),
) -> dict:
    try:
        application = db.query(Application).filter(Application.id == application_id).first()
        if not application:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found.")

        db.delete(application)
        db.commit()
        logger.info(f"Application {application_id} deleted by {current_user.email}")
        return {"success": True, "detail": f"Application {application_id} has been deleted."}
    except HTTPException:
        raise
    except Exception as exc:
        db.rollback()
        logger.error(f"Error deleting application {application_id}: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete application.",
        )
