"""
Jobs API Routes - DCI HireMind
Full CRUD for job requisitions. Listing is a PUBLIC endpoint.
"""

import logging
import math
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.auth import SupabaseUser, get_current_user, require_roles
from app.database.session import get_db
from app.models.job import Job
from app.models.user import User
from app.schemas.job import (
    JobCreate,
    JobListResponse,
    JobResponse,
    JobUpdate,
)

logger = logging.getLogger("dci_hiremind.jobs")
router = APIRouter()


# ---------------------------------------------------------------------------
# POST /api/v1/jobs & /api/jobs (supports both with and without trailing slash)
# ---------------------------------------------------------------------------
@router.post(
    "",
    response_model=JobResponse,
    status_code=status.HTTP_201_CREATED,
    include_in_schema=False,
)
@router.post(
    "/",
    response_model=JobResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a job requisition (Admin / Recruiter)",
)
async def create_job(
    payload: JobCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: SupabaseUser = Depends(require_roles(["Admin", "Recruiter"])),
) -> JobResponse:
    try:
        # Resolve DB user to get the integer PK (by UID or email)
        db_user = db.query(User).filter(
            (User.supabase_uid == current_user.id) | (User.email == current_user.email)
        ).first()
        created_by_id = db_user.id if db_user else None

        job = Job(
            title=payload.title,
            department=payload.department,
            location=payload.location,
            employment_type=payload.employment_type,
            description=payload.description,
            requirements=payload.requirements,
            required_skills=payload.required_skills,
            experience_level=payload.experience_level,
            salary_min=payload.salary_min,
            salary_max=payload.salary_max,
            status="OPEN",
            created_by_id=created_by_id,
        )
        db.add(job)
        db.commit()
        db.refresh(job)
        logger.info(f"Job created: id={job.id} '{job.title}' by {current_user.email} (user_id={created_by_id})")
        return job
    except HTTPException:
        raise
    except Exception as exc:
        db.rollback()
        logger.error(f"Error creating job: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create job requisition: {str(exc)}",
        )


# ---------------------------------------------------------------------------
# GET /api/v1/jobs & /api/jobs  — PUBLIC
# ---------------------------------------------------------------------------
@router.get(
    "",
    response_model=JobListResponse,
    include_in_schema=False,
)
@router.get(
    "/",
    response_model=JobListResponse,
    summary="List jobs (public)",
)
async def list_jobs(
    db: Annotated[Session, Depends(get_db)],
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    q: Optional[str] = Query(None, description="Search by title"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status"),
    location: Optional[str] = Query(None, description="Filter by location"),
) -> JobListResponse:
    try:
        query = db.query(Job)

        if q:
            query = query.filter(Job.title.ilike(f"%{q}%"))
        if status_filter:
            query = query.filter(Job.status == status_filter.upper())
        if location:
            query = query.filter(Job.location.ilike(f"%{location}%"))

        query = query.order_by(Job.created_at.desc(), Job.id.desc())

        total = query.count()
        offset = (page - 1) * page_size
        items = query.offset(offset).limit(page_size).all()

        return JobListResponse(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=math.ceil(total / page_size) if total else 0,
        )
    except Exception as exc:
        logger.error(f"Error listing jobs: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve job list.",
        )


# ---------------------------------------------------------------------------
# GET /api/v1/jobs/{id}  — PUBLIC
# ---------------------------------------------------------------------------
@router.get(
    "/{job_id}",
    response_model=JobResponse,
    summary="Get a single job (public)",
)
async def get_job(
    job_id: int,
    db: Annotated[Session, Depends(get_db)],
) -> JobResponse:
    try:
        job = db.query(Job).filter(Job.id == job_id).first()
        if not job:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found.")
        return job
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Error fetching job {job_id}: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve job.",
        )


# ---------------------------------------------------------------------------
# PUT / PATCH /api/v1/jobs/{id}
# ---------------------------------------------------------------------------
@router.put(
    "/{job_id}",
    response_model=JobResponse,
    summary="Update job (PUT alias)",
)
@router.patch(
    "/{job_id}",
    response_model=JobResponse,
    summary="Update job (Admin / Recruiter)",
)
async def update_job(
    job_id: int,
    payload: JobUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: SupabaseUser = Depends(require_roles(["Admin", "Recruiter"])),
) -> JobResponse:
    try:
        job = db.query(Job).filter(Job.id == job_id).first()
        if not job:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found.")

        update_data = payload.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(job, field, value)

        db.commit()
        db.refresh(job)
        logger.info(f"Job {job_id} updated by {current_user.email}")
        return job
    except HTTPException:
        raise
    except Exception as exc:
        db.rollback()
        logger.error(f"Error updating job {job_id}: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update job.",
        )


# ---------------------------------------------------------------------------
# DELETE /api/v1/jobs/{id}  — soft close
# ---------------------------------------------------------------------------
@router.delete(
    "/{job_id}",
    status_code=status.HTTP_200_OK,
    summary="Close job (Admin only)",
)
async def close_job(
    job_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: SupabaseUser = Depends(require_roles(["Admin"])),
) -> dict:
    try:
        job = db.query(Job).filter(Job.id == job_id).first()
        if not job:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found.")

        job.status = "CLOSED"
        db.commit()
        logger.info(f"Job {job_id} closed by {current_user.email}")
        return {"detail": f"Job {job_id} has been closed."}
    except HTTPException:
        raise
    except Exception as exc:
        db.rollback()
        logger.error(f"Error closing job {job_id}: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to close job.",
        )
