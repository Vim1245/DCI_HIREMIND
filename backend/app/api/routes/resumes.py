"""
Resume API Routes - DCI HireMind
Handles resume file uploads to Supabase Storage and records metadata in resume_analyses table.
"""

import logging
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.core.auth import SupabaseUser, get_current_user
from app.database.session import get_db
from app.models.candidate import Candidate
from app.models.resume_analysis import ResumeAnalysis
from app.services.supabase_storage import storage_service

logger = logging.getLogger("dci_hiremind.resumes")
router = APIRouter()


@router.post(
    "/upload",
    status_code=status.HTTP_201_CREATED,
    summary="Upload candidate resume to Supabase Storage",
)
async def upload_candidate_resume(
    candidate_id: Annotated[int, Form(..., description="ID of the candidate")],
    file: UploadFile = File(..., description="Resume PDF or DOCX file"),
    db: Session = Depends(get_db),
    current_user: SupabaseUser = Depends(get_current_user),
):
    """
    Uploads candidate resume document directly to Supabase Storage bucket ('resumes')
    and creates a ResumeAnalysis database record.
    """
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Candidate with ID {candidate_id} not found.",
        )

    # If Candidate role, ensure they are uploading for themselves
    if current_user.role == "Candidate" and candidate.email.lower() != current_user.email.lower():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Candidates may only upload resumes for their own profile.",
        )

    try:
        # Check storage status
        is_ready, diag = storage_service.check_storage_status()
        if not is_ready:
            # If bucket is not created yet in Supabase Dashboard, log warning and store reference
            logger.warning(f"Supabase storage bucket missing: {diag.get('message')}")
            # Still record in DB with pending storage status
            analysis = ResumeAnalysis(
                candidate_id=candidate.id,
                file_name=file.filename or "resume.pdf",
                storage_path=f"pending/{candidate.id}/{file.filename}",
                file_type=(file.filename or "").split(".")[-1].lower() or "pdf",
                parsing_status="PENDING_STORAGE_BUCKET",
            )
            db.add(analysis)
            db.commit()
            db.refresh(analysis)
            return {
                "success": True,
                "id": analysis.id,
                "candidate_id": candidate.id,
                "file_name": file.filename,
                "storage_status": "pending_bucket_creation",
                "message": (
                    "Resume recorded in database. Note: 'resumes' storage bucket must be created in "
                    "Supabase Dashboard -> Storage to enable live file storage."
                ),
            }

        # Live upload to Supabase Storage
        upload_result = await storage_service.upload_resume(candidate_id=candidate.id, file=file)

        # Create ResumeAnalysis record in Supabase PostgreSQL
        analysis = ResumeAnalysis(
            candidate_id=candidate.id,
            file_name=upload_result["file_name"],
            storage_path=upload_result["storage_path"],
            file_type=upload_result["file_type"],
            file_size_bytes=upload_result["file_size_bytes"],
            parsing_status="UPLOADED",
        )
        db.add(analysis)
        db.commit()
        db.refresh(analysis)

        signed_url = None
        try:
            signed_url = storage_service.get_signed_url(upload_result["storage_path"], expires_in=3600)
        except Exception:
            pass

        return {
            "success": True,
            "id": analysis.id,
            "candidate_id": candidate.id,
            "file_name": analysis.file_name,
            "storage_path": analysis.storage_path,
            "file_size_bytes": analysis.file_size_bytes,
            "signed_url": signed_url,
            "message": "Resume uploaded successfully to Supabase Storage and registered.",
        }
    except HTTPException:
        raise
    except Exception as exc:
        db.rollback()
        logger.error(f"Error processing resume upload: {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process resume upload: {str(exc)}",
        )


@router.get(
    "",
    summary="List all uploaded resumes",
)
def list_all_resumes(
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db),
    current_user: SupabaseUser = Depends(get_current_user),
):
    query = db.query(ResumeAnalysis).order_by(ResumeAnalysis.created_at.desc())
    total = query.count()
    offset = (page - 1) * page_size
    records = query.offset(offset).limit(page_size).all()

    cand_ids = [r.candidate_id for r in records if r.candidate_id]
    cands = {c.id: c for c in db.query(Candidate).filter(Candidate.id.in_(cand_ids)).all()} if cand_ids else {}

    results = []
    for r in records:
        signed_url = None
        if r.storage_path and not r.storage_path.startswith("pending/"):
            try:
                signed_url = storage_service.get_signed_url(r.storage_path, expires_in=3600)
            except Exception:
                pass
        cand = cands.get(r.candidate_id)
        cand_name = "Unknown Candidate"
        if cand:
            cand_name = getattr(cand, "full_name", None) or f"{cand.first_name or ''} {cand.last_name or ''}".strip() or cand.email
        results.append({
            "id": r.id,
            "candidate_id": r.candidate_id,
            "candidate_name": cand_name,
            "candidate_email": cand.email if cand else "",
            "file_name": r.file_name,
            "file_type": r.file_type,
            "file_size_bytes": r.file_size_bytes,
            "storage_path": r.storage_path,
            "parsing_status": r.parsing_status,
            "signed_url": signed_url,
            "created_at": r.created_at,
        })
    return {
        "items": results,
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.get(
    "/candidate/{candidate_id}",
    summary="Get candidate resume analyses",
)
def get_candidate_resumes(
    candidate_id: int,
    db: Session = Depends(get_db),
    current_user: SupabaseUser = Depends(get_current_user),
):
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found.")

    resumes = db.query(ResumeAnalysis).filter(ResumeAnalysis.candidate_id == candidate_id).all()
    results = []
    for r in resumes:
        signed_url = None
        if r.storage_path and not r.storage_path.startswith("pending/"):
            try:
                signed_url = storage_service.get_signed_url(r.storage_path, expires_in=3600)
            except Exception:
                pass
        results.append({
            "id": r.id,
            "file_name": r.file_name,
            "file_type": r.file_type,
            "file_size_bytes": r.file_size_bytes,
            "storage_path": r.storage_path,
            "parsing_status": r.parsing_status,
            "signed_url": signed_url,
            "created_at": r.created_at,
        })
    return {"resumes": results}
