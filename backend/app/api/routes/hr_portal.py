"""
HR Admin Portal Endpoints - DCI HireMind
Private, authenticated endpoints for authorized HR Recruiters and Admins.
Protected by Supabase Auth JWT and backend role verification.
"""

import logging
import math
from datetime import datetime, timezone
from typing import Annotated, Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc

from app.core.auth import SupabaseUser, get_current_user, require_roles
from app.database.session import get_db
from app.models.application import Application
from app.models.candidate import Candidate
from app.models.job import Job
from app.models.user import User
from app.models.resume_analysis import ResumeAnalysis
from app.services.supabase_storage import storage_service

logger = logging.getLogger("dci_hiremind.hr_portal")
router = APIRouter(prefix="/api/hr", tags=["HR Admin Portal"])


# ---------------------------------------------------------------------------
# HR Schemas
# ---------------------------------------------------------------------------
class HRDashboardStats(BaseModel):
    total_candidates: int
    total_jobs: int
    total_applications: int
    new_applications: int
    under_review_count: int
    shortlisted_candidates: int
    interview_scheduled: int
    selected_candidates: int
    rejected_count: int
    recent_applications: List[Dict[str, Any]]
    recent_candidates: List[Dict[str, Any]]


class HRApplicationItem(BaseModel):
    id: int
    reference_number: Optional[str] = None
    stage: str
    job_id: int
    job_title: str
    job_department: Optional[str] = None
    candidate_id: int
    candidate_name: str
    candidate_email: str
    candidate_phone: Optional[str] = None
    candidate_location: Optional[str] = None
    candidate_experience_years: Optional[float] = None
    candidate_education: Optional[str] = None
    candidate_skills: Optional[List[str]] = None
    resume_file_name: Optional[str] = None
    resume_signed_url: Optional[str] = None
    match_score: Optional[float] = None
    match_rationale: Optional[str] = None
    human_decision: Optional[str] = None
    human_feedback: Optional[str] = None
    human_reviewed_at: Optional[datetime] = None
    created_at: Optional[datetime] = None


class HRApplicationListResponse(BaseModel):
    items: List[HRApplicationItem]
    total: int
    page: int
    page_size: int
    total_pages: int
    stage_counts: Dict[str, int]


class HRStatusUpdateRequest(BaseModel):
    stage: str = Field(..., description="Target stage: APPLIED, UNDER_REVIEW, SHORTLISTED, INTERVIEW_SCHEDULED, SELECTED, REJECTED")
    human_decision: Optional[str] = Field(None, description="Human decision rationale (MANDATORY if stage is REJECTED)")
    human_feedback: Optional[str] = Field(None, description="Internal HR notes or feedback")


# ---------------------------------------------------------------------------
# GET /api/hr/dashboard/stats - Real Database Recruitment Analytics
# ---------------------------------------------------------------------------
@router.get(
    "/dashboard/stats",
    response_model=HRDashboardStats,
    summary="Get live HR dashboard statistics from PostgreSQL",
)
async def get_hr_dashboard_stats(
    db: Annotated[Session, Depends(get_db)],
    current_user: SupabaseUser = Depends(require_roles(["Admin", "Recruiter"])),
) -> HRDashboardStats:
    """
    Returns live database recruitment analytics:
    - Candidate totals
    - Job requisition totals
    - Application funnel breakdown (Applied, Under Review, Shortlisted, Interview, Selected, Rejected)
    - Recent applications and candidate registrations
    """
    try:
        total_candidates = db.query(Candidate).count()
        total_jobs = db.query(Job).count()
        total_applications = db.query(Application).count()

        # Application stage metrics
        apps = db.query(Application.stage).all()
        stages = [a[0].upper() for a in apps if a[0]]

        new_applications = sum(1 for s in stages if s == "APPLIED")
        under_review = sum(1 for s in stages if s in ("UNDER_REVIEW", "IN_REVIEW", "SCREENING", "AI_PROCESSED"))
        shortlisted = sum(1 for s in stages if s == "SHORTLISTED")
        interview_sched = sum(1 for s in stages if s in ("INTERVIEW_SCHEDULED", "INTERVIEW"))
        selected = sum(1 for s in stages if s in ("SELECTED", "OFFER", "HIRED"))
        rejected = sum(1 for s in stages if s == "REJECTED")

        # Recent 5 applications with candidate & job joined
        recent_apps_records = (
            db.query(Application, Candidate, Job)
            .join(Candidate, Application.candidate_id == Candidate.id)
            .join(Job, Application.job_id == Job.id)
            .order_by(desc(Application.created_at))
            .limit(5)
            .all()
        )

        recent_applications = []
        for app, cand, job in recent_apps_records:
            recent_applications.append({
                "id": app.id,
                "reference_number": app.reference_number or f"APP-{app.id:06d}",
                "candidate_name": f"{cand.first_name or ''} {cand.last_name or ''}".strip() or cand.email,
                "candidate_email": cand.email,
                "job_title": job.title,
                "job_department": job.department,
                "stage": app.stage,
                "match_score": app.match_score,
                "created_at": app.created_at.isoformat() if app.created_at else None,
            })

        # Recent 5 candidates
        recent_cands_records = (
            db.query(Candidate).order_by(desc(Candidate.created_at)).limit(5).all()
        )
        recent_candidates = []
        for cand in recent_cands_records:
            recent_candidates.append({
                "id": cand.id,
                "full_name": f"{cand.first_name or ''} {cand.last_name or ''}".strip() or cand.email,
                "email": cand.email,
                "location": cand.location,
                "skills": cand.skills or [],
                "years_of_experience": cand.years_of_experience,
                "education_level": cand.education_level,
                "created_at": cand.created_at.isoformat() if cand.created_at else None,
            })

        return HRDashboardStats(
            total_candidates=total_candidates,
            total_jobs=total_jobs,
            total_applications=total_applications,
            new_applications=new_applications,
            under_review_count=under_review,
            shortlisted_candidates=shortlisted,
            interview_scheduled=interview_sched,
            selected_candidates=selected,
            rejected_count=rejected,
            recent_applications=recent_applications,
            recent_candidates=recent_candidates,
        )
    except Exception as exc:
        logger.error(f"Error compiling HR stats: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve HR dashboard metrics.",
        )


# ---------------------------------------------------------------------------
# GET /api/hr/applications - Search, Filter, and Process Applications
# ---------------------------------------------------------------------------
@router.get(
    "/applications",
    response_model=HRApplicationListResponse,
    summary="List, search, and filter all applications (HR Only)",
)
async def list_hr_applications(
    db: Annotated[Session, Depends(get_db)],
    current_user: SupabaseUser = Depends(require_roles(["Admin", "Recruiter"])),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    stage: Optional[str] = Query(None, description="Filter by stage"),
    job_id: Optional[int] = Query(None, description="Filter by Job ID"),
    q: Optional[str] = Query(None, description="Search candidate name, email, or skills"),
) -> HRApplicationListResponse:
    """
    Returns enriched applications with candidate profiles and job details.
    Restricted to authenticated HR users (Admin, Recruiter).
    """
    try:
        query = (
            db.query(Application, Candidate, Job)
            .join(Candidate, Application.candidate_id == Candidate.id)
            .join(Job, Application.job_id == Job.id)
        )

        if stage and stage.strip() != "ALL":
            stage_upper = stage.strip().upper()
            if stage_upper == "UNDER_REVIEW":
                query = query.filter(Application.stage.in_(["UNDER_REVIEW", "IN_REVIEW", "SCREENING", "AI_PROCESSED"]))
            elif stage_upper == "INTERVIEW_SCHEDULED":
                query = query.filter(Application.stage.in_(["INTERVIEW_SCHEDULED", "INTERVIEW"]))
            elif stage_upper == "SELECTED":
                query = query.filter(Application.stage.in_(["SELECTED", "OFFER", "HIRED"]))
            else:
                query = query.filter(Application.stage == stage_upper)

        if job_id:
            query = query.filter(Application.job_id == job_id)

        if q and q.strip():
            term = f"%{q.strip()}%"
            query = query.filter(
                or_(
                    Candidate.first_name.ilike(term),
                    Candidate.last_name.ilike(term),
                    Candidate.email.ilike(term),
                    Candidate.location.ilike(term),
                    Job.title.ilike(term),
                )
            )

        total = query.count()
        offset = (page - 1) * page_size
        records = query.order_by(desc(Application.created_at)).offset(offset).limit(page_size).all()

        # Compute stage counts for tab badges
        all_apps = db.query(Application.stage).all()
        stage_counts = {
            "ALL": len(all_apps),
            "APPLIED": 0,
            "UNDER_REVIEW": 0,
            "SHORTLISTED": 0,
            "INTERVIEW_SCHEDULED": 0,
            "SELECTED": 0,
            "REJECTED": 0,
        }
        for (st,) in all_apps:
            s = (st or "").upper()
            if s == "APPLIED":
                stage_counts["APPLIED"] += 1
            elif s in ("UNDER_REVIEW", "IN_REVIEW", "SCREENING", "AI_PROCESSED"):
                stage_counts["UNDER_REVIEW"] += 1
            elif s == "SHORTLISTED":
                stage_counts["SHORTLISTED"] += 1
            elif s in ("INTERVIEW_SCHEDULED", "INTERVIEW"):
                stage_counts["INTERVIEW_SCHEDULED"] += 1
            elif s in ("SELECTED", "OFFER", "HIRED"):
                stage_counts["SELECTED"] += 1
            elif s == "REJECTED":
                stage_counts["REJECTED"] += 1

        # Look up resumes for these candidates
        candidate_ids = [c.id for _, c, _ in records]
        resumes = (
            db.query(ResumeAnalysis)
            .filter(ResumeAnalysis.candidate_id.in_(candidate_ids))
            .order_by(desc(ResumeAnalysis.created_at))
            .all()
        )
        resume_map: Dict[int, ResumeAnalysis] = {}
        for r in resumes:
            if r.candidate_id not in resume_map:
                resume_map[r.candidate_id] = r

        items = []
        for app, cand, job in records:
            res_record = resume_map.get(cand.id)
            signed_url = None
            file_name = None
            if res_record:
                file_name = res_record.file_name
                if not res_record.storage_path.startswith("pending/"):
                    try:
                        signed_url = storage_service.get_signed_url(res_record.storage_path, expires_in=3600)
                    except Exception:
                        pass

            cand_full_name = f"{cand.first_name or ''} {cand.last_name or ''}".strip() or cand.email
            items.append(
                HRApplicationItem(
                    id=app.id,
                    reference_number=app.reference_number or f"APP-{app.id:06d}",
                    stage=app.stage,
                    job_id=job.id,
                    job_title=job.title,
                    job_department=job.department,
                    candidate_id=cand.id,
                    candidate_name=cand_full_name,
                    candidate_email=cand.email,
                    candidate_phone=cand.phone,
                    candidate_location=cand.location,
                    candidate_experience_years=cand.years_of_experience,
                    candidate_education=cand.education_level,
                    candidate_skills=cand.skills or [],
                    resume_file_name=file_name,
                    resume_signed_url=signed_url,
                    match_score=app.match_score,
                    match_rationale=app.match_rationale,
                    human_decision=app.human_decision,
                    human_feedback=app.human_feedback,
                    human_reviewed_at=app.human_reviewed_at,
                    created_at=app.created_at,
                )
            )

        return HRApplicationListResponse(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=math.ceil(total / page_size) if total else 0,
            stage_counts=stage_counts,
        )
    except Exception as exc:
        logger.error(f"Error listing HR applications: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve applications.",
        )


# ---------------------------------------------------------------------------
# GET /api/hr/applications/{id} - Single Application Full Detail
# ---------------------------------------------------------------------------
@router.get(
    "/applications/{application_id}",
    summary="Get complete application details for HR review",
)
async def get_hr_application_detail(
    application_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: SupabaseUser = Depends(require_roles(["Admin", "Recruiter"])),
):
    """
    Returns comprehensive profile and application data for HR review,
    including candidate profile, education, resume signed URL, and notes.
    """
    record = (
        db.query(Application, Candidate, Job)
        .join(Candidate, Application.candidate_id == Candidate.id)
        .join(Job, Application.job_id == Job.id)
        .filter(Application.id == application_id)
        .first()
    )
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Application with ID {application_id} not found.",
        )

    app, cand, job = record

    # Latest resume
    resume = (
        db.query(ResumeAnalysis)
        .filter(ResumeAnalysis.candidate_id == cand.id)
        .order_by(desc(ResumeAnalysis.created_at))
        .first()
    )
    resume_data = None
    if resume:
        signed_url = None
        if not resume.storage_path.startswith("pending/"):
            try:
                signed_url = storage_service.get_signed_url(resume.storage_path, expires_in=7200)
            except Exception:
                pass
        resume_data = {
            "id": resume.id,
            "file_name": resume.file_name,
            "file_type": resume.file_type,
            "storage_path": resume.storage_path,
            "file_size_bytes": resume.file_size_bytes,
            "signed_url": signed_url,
            "extracted_skills": resume.extracted_skills,
            "ai_summary": resume.ai_summary,
        }

    return {
        "success": True,
        "application": {
            "id": app.id,
            "reference_number": app.reference_number or f"APP-{app.id:06d}",
            "stage": app.stage,
            "cover_letter": app.cover_letter,
            "match_score": app.match_score,
            "match_rationale": app.match_rationale,
            "skill_gap_analysis": app.skill_gap_analysis,
            "ai_recommendation": app.ai_recommendation,
            "human_decision": app.human_decision,
            "human_feedback": app.human_feedback,
            "human_reviewed_at": app.human_reviewed_at.isoformat() if app.human_reviewed_at else None,
            "created_at": app.created_at.isoformat() if app.created_at else None,
        },
        "candidate": {
            "id": cand.id,
            "first_name": cand.first_name,
            "last_name": cand.last_name,
            "full_name": f"{cand.first_name or ''} {cand.last_name or ''}".strip(),
            "email": cand.email,
            "phone": cand.phone,
            "location": cand.location,
            "skills": cand.skills or [],
            "years_of_experience": cand.years_of_experience,
            "education_level": cand.education_level,
            "linkedin_url": getattr(cand, "linkedin_url", None),
            "portfolio_url": getattr(cand, "portfolio_url", None),
            "status": cand.status,
        },
        "job": {
            "id": job.id,
            "title": job.title,
            "department": job.department,
            "location": job.location,
            "employment_type": job.employment_type,
            "experience_level": job.experience_level,
            "required_skills": job.required_skills or [],
        },
        "resume": resume_data,
    }


# ---------------------------------------------------------------------------
# PATCH /api/hr/applications/{id}/status - Update Stage & HR Review Decision
# ---------------------------------------------------------------------------
@router.patch(
    "/applications/{application_id}/status",
    summary="Update application stage with human review decision (HR Only)",
)
async def update_hr_application_status(
    application_id: int,
    payload: HRStatusUpdateRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: SupabaseUser = Depends(require_roles(["Admin", "Recruiter"])),
):
    """
    Updates the stage of an application.
    Enforces Ethical AI Human-in-the-Loop:
    - Never auto-reject candidates.
    - An explicit human_decision explanation is mandatory when setting stage='REJECTED'.
    - Updates audit trail: reviewer identity, timestamp, and notes.
    """
    app = db.query(Application).filter(Application.id == application_id).first()
    if not app:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Application with ID {application_id} not found.",
        )

    valid_stages = {
        "APPLIED",
        "UNDER_REVIEW",
        "SHORTLISTED",
        "INTERVIEW_SCHEDULED",
        "SELECTED",
        "REJECTED",
    }
    target_stage = payload.stage.strip().upper()

    if target_stage not in valid_stages:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid stage '{payload.stage}'. Must be one of: {', '.join(sorted(valid_stages))}",
        )

    # Ethical AI Gate: Rejections require a human explanation
    if target_stage == "REJECTED" and not payload.human_decision:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "Ethical AI Zero Auto-Rejection Policy: A human decision explanation is "
                "mandatory when rejecting an applicant. Rejections can never be made automatically."
            ),
        )

    # Resolve reviewer DB ID
    db_reviewer = db.query(User).filter(User.email == current_user.email).first()

    app.stage = target_stage
    app.human_decision = payload.human_decision or target_stage
    app.human_reviewed_at = datetime.now(timezone.utc)
    if db_reviewer:
        app.human_reviewed_by_id = db_reviewer.id

    if payload.human_feedback:
        app.human_feedback = payload.human_feedback.strip()

    db.commit()
    db.refresh(app)

    logger.info(
        f"[HR DECISION] Application #{app.id} updated to '{target_stage}' by "
        f"{current_user.email} (Notes: {app.human_feedback})"
    )

    return {
        "success": True,
        "message": f"Application status successfully updated to {target_stage}.",
        "application_id": app.id,
        "stage": app.stage,
        "human_decision": app.human_decision,
        "human_feedback": app.human_feedback,
        "reviewed_by": current_user.email,
        "reviewed_at": app.human_reviewed_at.isoformat(),
    }


# ---------------------------------------------------------------------------
# GET /api/hr/candidates - List Candidates with Application Summaries
# ---------------------------------------------------------------------------
@router.get(
    "/candidates",
    summary="List all candidates with application counts (HR Only)",
)
async def list_hr_candidates(
    db: Annotated[Session, Depends(get_db)],
    current_user: SupabaseUser = Depends(require_roles(["Admin", "Recruiter"])),
    page: int = Query(1, ge=1),
    page_size: int = Query(15, ge=1, le=100),
    q: Optional[str] = Query(None, description="Search candidate name, email, or skills"),
):
    query = db.query(Candidate)

    if q and q.strip():
        term = f"%{q.strip()}%"
        query = query.filter(
            or_(
                Candidate.first_name.ilike(term),
                Candidate.last_name.ilike(term),
                Candidate.email.ilike(term),
                Candidate.location.ilike(term),
            )
        )

    total = query.count()
    offset = (page - 1) * page_size
    candidates = query.order_by(desc(Candidate.created_at)).offset(offset).limit(page_size).all()

    cand_ids = [c.id for c in candidates]
    # Count applications per candidate
    apps = db.query(Application.candidate_id, Application.stage).filter(Application.candidate_id.in_(cand_ids)).all()
    app_counts: Dict[int, int] = {}
    for cid, _ in apps:
        app_counts[cid] = app_counts.get(cid, 0) + 1

    items = []
    for c in candidates:
        full_name = f"{c.first_name or ''} {c.last_name or ''}".strip() or c.email
        items.append({
            "id": c.id,
            "full_name": full_name,
            "first_name": c.first_name,
            "last_name": c.last_name,
            "email": c.email,
            "phone": c.phone,
            "location": c.location,
            "skills": c.skills or [],
            "years_of_experience": c.years_of_experience,
            "education_level": c.education_level,
            "status": c.status,
            "application_count": app_counts.get(c.id, 0),
            "created_at": c.created_at.isoformat() if c.created_at else None,
        })

    return {
        "success": True,
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": math.ceil(total / page_size) if total else 0,
    }
