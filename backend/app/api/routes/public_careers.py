"""
Public Careers Website Endpoints - DCI HireMind
Allows any visitor to browse active job openings and submit applications 
without creating an account or logging in.
"""

import logging
import math
import re
import uuid
from typing import Annotated, Any, Dict, List, Optional
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.database.session import get_db
from app.models.job import Job
from app.models.candidate import Candidate
from app.models.application import Application
from app.models.resume_analysis import ResumeAnalysis
from app.services.supabase_storage import storage_service

logger = logging.getLogger("dci_hiremind.public_careers")
router = APIRouter(prefix="/api/public", tags=["Public Careers"])

# Maximum file size for resume uploads: 10MB
MAX_RESUME_SIZE_BYTES = 10 * 1024 * 1024
ALLOWED_RESUME_EXTENSIONS = {"pdf", "doc", "docx"}


# ---------------------------------------------------------------------------
# Public Schemas
# ---------------------------------------------------------------------------
class PublicJobSummary(BaseModel):
    id: int
    title: str
    department: Optional[str] = None
    location: Optional[str] = None
    employment_type: str = "Full-Time"
    experience_level: Optional[str] = None
    description_snippet: str
    required_skills: Optional[List[str]] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class PublicJobDetail(BaseModel):
    id: int
    title: str
    department: Optional[str] = None
    location: Optional[str] = None
    employment_type: str = "Full-Time"
    experience_level: Optional[str] = None
    description: str
    requirements: Optional[str] = None
    required_skills: Optional[List[str]] = None
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class PublicJobListResponse(BaseModel):
    items: List[PublicJobSummary]
    total: int
    page: int
    page_size: int
    total_pages: int
    departments: List[str]
    locations: List[str]


class PublicApplicationResponse(BaseModel):
    success: bool
    reference_number: str
    message: str
    job_id: int
    job_title: str
    applicant_name: str
    submitted_at: str


# ---------------------------------------------------------------------------
# GET /api/public/jobs - List Published & Active Jobs
# ---------------------------------------------------------------------------
@router.get(
    "/jobs",
    response_model=PublicJobListResponse,
    summary="Browse published jobs (Public, No Login Required)",
)
async def list_public_jobs(
    db: Annotated[Session, Depends(get_db)],
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=50),
    q: Optional[str] = Query(None, description="Search by title or keyword"),
    department: Optional[str] = Query(None, description="Filter by department"),
    location: Optional[str] = Query(None, description="Filter by location"),
    employment_type: Optional[str] = Query(None, description="Filter by employment type"),
) -> PublicJobListResponse:
    """
    Public endpoint: lists all published and active jobs (status='OPEN').
    Does not expose sensitive recruiter information or internal metrics.
    """
    try:
        # Base query restricted exclusively to OPEN / published jobs
        query = db.query(Job).filter(Job.status == "OPEN")

        if q:
            term = f"%{q.strip()}%"
            query = query.filter(
                or_(
                    Job.title.ilike(term),
                    Job.description.ilike(term),
                    Job.department.ilike(term),
                )
            )

        if department and department.strip() != "All":
            query = query.filter(Job.department.ilike(f"%{department.strip()}%"))

        if location and location.strip() != "All":
            query = query.filter(Job.location.ilike(f"%{location.strip()}%"))

        if employment_type and employment_type.strip() != "All":
            query = query.filter(Job.employment_type.ilike(f"%{employment_type.strip()}%"))

        # Order by newest first
        query = query.order_by(Job.created_at.desc())

        total = query.count()
        offset = (page - 1) * page_size
        jobs = query.offset(offset).limit(page_size).all()

        # Build list of active departments and locations for filter pills
        all_open_jobs = db.query(Job.department, Job.location).filter(Job.status == "OPEN").all()
        departments = sorted(list({j[0] for j in all_open_jobs if j[0]}))
        locations = sorted(list({j[1] for j in all_open_jobs if j[1]}))

        summaries = []
        for job in jobs:
            snippet = job.description[:220] + "..." if len(job.description) > 220 else job.description
            summaries.append(
                PublicJobSummary(
                    id=job.id,
                    title=job.title,
                    department=job.department,
                    location=job.location,
                    employment_type=job.employment_type,
                    experience_level=job.experience_level,
                    description_snippet=snippet,
                    required_skills=job.required_skills or [],
                    created_at=job.created_at,
                )
            )

        return PublicJobListResponse(
            items=summaries,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=math.ceil(total / page_size) if total else 0,
            departments=departments,
            locations=locations,
        )
    except Exception as exc:
        logger.error(f"Error retrieving public jobs: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to load public career opportunities.",
        )


# ---------------------------------------------------------------------------
# GET /api/public/jobs/{job_id} - Public Job Details
# ---------------------------------------------------------------------------
@router.get(
    "/jobs/{job_id}",
    response_model=PublicJobDetail,
    summary="Get single published job details (Public, No Login Required)",
)
async def get_public_job(
    job_id: int,
    db: Annotated[Session, Depends(get_db)],
) -> PublicJobDetail:
    """
    Public endpoint: retrieves full details of an active, published job requisition.
    """
    job = db.query(Job).filter(Job.id == job_id, Job.status == "OPEN").first()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="The requested job opening is not available or has been closed.",
        )

    return PublicJobDetail(
        id=job.id,
        title=job.title,
        department=job.department,
        location=job.location,
        employment_type=job.employment_type,
        experience_level=job.experience_level,
        description=job.description,
        requirements=job.requirements,
        required_skills=job.required_skills or [],
        salary_min=job.salary_min,
        salary_max=job.salary_max,
        created_at=job.created_at,
    )


# ---------------------------------------------------------------------------
# POST /api/public/applications - Submit Job Application (No Login Required)
# ---------------------------------------------------------------------------
@router.post(
    "/applications",
    response_model=PublicApplicationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit a job application without login",
)
async def submit_public_application(
    job_id: Annotated[int, Form(..., description="ID of the job opening")],
    first_name: Annotated[str, Form(..., min_length=1, max_length=100)],
    last_name: Annotated[str, Form(..., min_length=1, max_length=100)],
    email: Annotated[str, Form(..., min_length=5, max_length=255)],
    phone: Annotated[str, Form(..., min_length=5, max_length=50)],
    location: Annotated[str, Form(..., min_length=2, max_length=150)],
    education_level: Annotated[str, Form(..., min_length=2, max_length=100)],
    years_of_experience: Annotated[float, Form(..., ge=0, le=50)],
    skills: Annotated[str, Form(..., description="Comma-separated skills list")],
    resume: Annotated[UploadFile, File(..., description="Resume PDF or DOCX file")],
    linkedin_url: Optional[str] = Form(None),
    portfolio_url: Optional[str] = Form(None),
    cover_letter: Optional[str] = Form(None),
    db: Session = Depends(get_db),
) -> PublicApplicationResponse:
    """
    Public Application Submission:
    - Validates candidate info and resume file.
    - Prevents duplicate applications for the same job.
    - Saves candidate and application records to Supabase PostgreSQL.
    - Uploads resume securely to Supabase Storage ('resumes' bucket).
    - Generates a unique tracking reference number.
    - Does NOT require Supabase authentication.
    """
    clean_email = email.strip().lower()

    # 1. Email format validation
    email_regex = r"^[\w\.-]+@[\w\.-]+\.\w+$"
    if not re.match(email_regex, clean_email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please provide a valid email address.",
        )

    # 2. Validate Target Job is Open
    job = db.query(Job).filter(Job.id == job_id, Job.status == "OPEN").first()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="The selected job requisition is closed or no longer accepting applications.",
        )

    # 3. Validate Resume File
    filename = resume.filename or "resume.pdf"
    file_ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if file_ext not in ALLOWED_RESUME_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type '{file_ext}'. Allowed formats are PDF, DOC, and DOCX.",
        )

    # Read and validate size
    try:
        content = await resume.read()
        file_size = len(content)
        if file_size > MAX_RESUME_SIZE_BYTES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Resume file size exceeds the 10MB limit (uploaded: {file_size / (1024 * 1024):.1f}MB).",
            )
        # Rewind file pointer for storage service
        await resume.seek(0)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Could not read uploaded resume file: {exc}",
        )

    # 4. Parse Skills list
    parsed_skills = [s.strip() for s in skills.split(",") if s.strip()]

    # 5. Check or Create Candidate Profile in Supabase PostgreSQL
    try:
        candidate = db.query(Candidate).filter(Candidate.email == clean_email).first()

        if not candidate:
            anonymized_id = uuid.uuid4().hex
            candidate = Candidate(
                first_name=first_name.strip(),
                last_name=last_name.strip(),
                email=clean_email,
                phone=phone.strip(),
                location=location.strip(),
                anonymized_id=anonymized_id,
                skills=parsed_skills,
                years_of_experience=years_of_experience,
                education_level=education_level.strip(),
                linkedin_url=linkedin_url.strip() if linkedin_url else None,
                portfolio_url=portfolio_url.strip() if portfolio_url else None,
                status="NEW",
            )
            db.add(candidate)
            db.commit()
            db.refresh(candidate)
            logger.info(f"Created new candidate #{candidate.id} for public application: {clean_email}")
        else:
            # Update existing candidate fields with latest information
            candidate.first_name = first_name.strip()
            candidate.last_name = last_name.strip()
            candidate.phone = phone.strip()
            candidate.location = location.strip()
            candidate.skills = parsed_skills
            candidate.years_of_experience = years_of_experience
            candidate.education_level = education_level.strip()
            if linkedin_url:
                candidate.linkedin_url = linkedin_url.strip()
            if portfolio_url:
                candidate.portfolio_url = portfolio_url.strip()
            db.commit()

        # 6. Check Duplicate Application Prevention
        existing_app = db.query(Application).filter(
            Application.job_id == job.id,
            Application.candidate_id == candidate.id,
        ).first()

        if existing_app:
            ref = existing_app.reference_number or f"APP-{existing_app.id:06d}"
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"You have already applied for '{job.title}'. Your existing application reference is {ref}.",
            )

        # 7. Upload Resume to Supabase Storage
        storage_path = f"resumes/{candidate.id}/{filename}"
        try:
            upload_result = await storage_service.upload_resume(candidate_id=candidate.id, file=resume)
            storage_path = upload_result.get("storage_path", storage_path)
            file_type = upload_result.get("file_type", file_ext)
            file_size_bytes = upload_result.get("file_size_bytes", file_size)
        except Exception as storage_exc:
            logger.warning(f"Supabase storage upload notice: {storage_exc}. Fallback path used.")
            file_type = file_ext
            file_size_bytes = file_size

        # Create ResumeAnalysis record
        analysis = ResumeAnalysis(
            candidate_id=candidate.id,
            file_name=filename,
            storage_path=storage_path,
            file_type=file_type,
            file_size_bytes=file_size_bytes,
            parsing_status="UPLOADED",
            extracted_skills=parsed_skills,
            experience_years=years_of_experience,
        )
        db.add(analysis)
        db.commit()

        # 8. Create Application Record with Reference Number
        ref_number = f"APP-{datetime.now().year}-{uuid.uuid4().hex[:6].upper()}"
        application = Application(
            job_id=job.id,
            candidate_id=candidate.id,
            stage="APPLIED",
            reference_number=ref_number,
            cover_letter=cover_letter.strip() if cover_letter else None,
        )
        db.add(application)
        db.commit()
        db.refresh(application)

        logger.info(
            f"Public application submitted: ID={application.id}, Ref={ref_number}, "
            f"Job='{job.title}', Candidate='{clean_email}'"
        )

        return PublicApplicationResponse(
            success=True,
            reference_number=ref_number,
            message=(
                f"Your application for '{job.title}' has been submitted successfully! "
                f"Our recruitment team will review your qualifications."
            ),
            job_id=job.id,
            job_title=job.title,
            applicant_name=f"{candidate.first_name} {candidate.last_name}",
            submitted_at=datetime.now(timezone.utc).isoformat(),
        )

    except HTTPException:
        db.rollback()
        raise
    except Exception as exc:
        db.rollback()
        logger.error(f"Error submitting public application: {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while saving your application. Please try again.",
        )
