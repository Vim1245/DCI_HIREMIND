"""
AI Assistant & Recruitment Intelligence API Routes - DCI HireMind
Provides chat completions, candidate-job matching analysis, and AI status using OpenAI/OpenRouter.
"""

import logging
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.auth import SupabaseUser, get_current_user
from app.database.session import get_db
from app.models.candidate import Candidate
from app.models.job import Job
from app.services.openai_service import openai_service

logger = logging.getLogger("dci_hiremind.ai")
router = APIRouter()


class ChatMessage(BaseModel):
    role: str = Field(..., description="Role: 'user', 'assistant', or 'system'")
    content: str = Field(..., description="Message content")


class AIChatRequest(BaseModel):
    message: str = Field(..., min_length=1, description="User prompt or recruitment query")
    conversation_history: Optional[List[ChatMessage]] = Field(default=[], description="Previous conversation turns")
    candidate_id: Optional[int] = Field(default=None, description="Optional candidate context")
    job_id: Optional[int] = Field(default=None, description="Optional job requisition context")


class AIChatResponse(BaseModel):
    success: bool
    reply: str
    model: str
    tokens_used: Optional[int] = None


class AIMatchRequest(BaseModel):
    candidate_id: int
    job_id: int


class AIMatchResponse(BaseModel):
    success: bool
    candidate_name: str
    job_title: str
    match_score: int
    analysis: str
    strengths: List[str]
    gaps: List[str]
    recommendation: str
    ethical_note: str


@router.get("/status", summary="Get AI provider connectivity and model status")
async def get_ai_status(current_user: SupabaseUser = Depends(get_current_user)) -> Dict[str, Any]:
    """Returns the live status of the configured OpenAI / OpenRouter engine."""
    diagnostics = openai_service.check_connection()
    return {
        "success": diagnostics.get("status") == "connected",
        "ai_service": diagnostics,
    }


@router.post("/chat", response_model=AIChatResponse, summary="Chat with AI Recruitment Assistant")
async def ai_recruitment_chat(
    payload: AIChatRequest,
    db: Session = Depends(get_db),
    current_user: SupabaseUser = Depends(get_current_user),
) -> AIChatResponse:
    """
    Enterprise Recruitment AI Copilot.
    Analyzes candidates, job descriptions, and provides structured recruitment advice.
    """
    # Build contextual grounding
    system_prompt = (
        "You are DCI HireMind AI, an elite enterprise recruitment and talent intelligence assistant.\n"
        "You help recruiters, hiring managers, and HR leaders screen candidates, analyze job descriptions, "
        "formulate interview questions, and assess role fit.\n"
        "IMPORTANT ETHICAL DIRECTIVE:\n"
        "All candidate hiring/rejection decisions require mandatory human oversight. Never proclaim automated "
        "rejection or disqualify candidates without transparent, evidence-based reasoning."
    )

    context_snippets = []

    if payload.candidate_id:
        cand = db.query(Candidate).filter(Candidate.id == payload.candidate_id).first()
        if cand:
            skills = ", ".join(cand.skills) if cand.skills else "None specified"
            context_snippets.append(
                f"[Candidate Context: Name={cand.full_name}, Email={cand.email}, Experience={cand.experience_years} years, "
                f"Skills={skills}, Education={cand.education or 'N/A'}]"
            )

    if payload.job_id:
        job = db.query(Job).filter(Job.id == payload.job_id).first()
        if job:
            skills = ", ".join(job.skills_required) if job.skills_required else "None specified"
            context_snippets.append(
                f"[Job Context: Title={job.title}, Department={job.department}, Location={job.location}, "
                f"Required Experience={job.experience_min}-{job.experience_max} yrs, Skills={skills}, Type={job.job_type}]"
            )

    if context_snippets:
        system_prompt += "\n\nACTIVE CONTEXT:\n" + "\n".join(context_snippets)

    messages = [{"role": "system", "content": system_prompt}]

    if payload.conversation_history:
        for turn in payload.conversation_history[-6:]:
            if turn.role in ["user", "assistant"]:
                messages.append({"role": turn.role, "content": turn.content})

    messages.append({"role": "user", "content": payload.message})

    try:
        reply_text = openai_service.generate_chat_completion(
            messages=messages,
            temperature=0.7,
            max_tokens=1000,
        )
        return AIChatResponse(
            success=True,
            reply=reply_text,
            model=openai_service.settings.effective_openai_model,
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"AI Chat error: {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI recruitment engine error: {str(exc)}",
        )


@router.post("/match", response_model=AIMatchResponse, summary="AI Candidate-to-Job Matching Analysis")
async def ai_match_candidate_job(
    payload: AIMatchRequest,
    db: Session = Depends(get_db),
    current_user: SupabaseUser = Depends(get_current_user),
) -> AIMatchResponse:
    """
    Evaluates candidate skills and experience against job requisition requirements.
    Calculates transparent match score and identifies strength/gap alignment.
    """
    candidate = db.query(Candidate).filter(Candidate.id == payload.candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found.")

    job = db.query(Job).filter(Job.id == payload.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job requisition not found.")

    cand_skills = ", ".join(candidate.skills) if candidate.skills else "None specified"
    job_skills = ", ".join(job.skills_required) if job.skills_required else "None specified"

    prompt = (
        f"You are the DCI HireMind Talent Matching Engine.\n"
        f"Analyze the match between this candidate and job requisition.\n\n"
        f"CANDIDATE:\n"
        f"- Name: {candidate.full_name}\n"
        f"- Experience: {candidate.experience_years} years\n"
        f"- Skills: {cand_skills}\n"
        f"- Education: {candidate.education or 'Not provided'}\n\n"
        f"JOB REQUISITION:\n"
        f"- Title: {job.title}\n"
        f"- Experience Required: {job.experience_min} to {job.experience_max} years\n"
        f"- Required Skills: {job_skills}\n"
        f"- Description: {job.description[:400] if job.description else 'N/A'}\n\n"
        f"Respond in strict JSON with the following keys:\n"
        f"{{\n"
        f'  "match_score": <integer from 0 to 100>,\n'
        f'  "analysis": "<2-3 sentence overview of the candidate\'s fit>",\n'
        f'  "strengths": ["<strength 1>", "<strength 2>"],\n'
        f'  "gaps": ["<gap 1>", "<gap 2>"],\n'
        f'  "recommendation": "<Shortlist for Interview | Needs Technical Screen | Consider for Alternative Role>"\n'
        f"}}"
    )

    try:
        raw_json = openai_service.generate_chat_completion(
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=600,
            json_mode=True,
        )
        import json
        data = json.loads(raw_json)
        return AIMatchResponse(
            success=True,
            candidate_name=candidate.full_name,
            job_title=job.title,
            match_score=int(data.get("match_score", 75)),
            analysis=data.get("analysis", "Candidate shows relevant core competencies."),
            strengths=data.get("strengths", ["Skill alignment"]),
            gaps=data.get("gaps", []),
            recommendation=data.get("recommendation", "Shortlist for Interview"),
            ethical_note="All hiring decisions require mandatory human recruiter oversight.",
        )
    except Exception as exc:
        logger.warning(f"AI structured match fallback: {exc}")
        # Deterministic fallback matching based on skills intersection
        c_set = set(s.lower() for s in (candidate.skills or []))
        j_set = set(s.lower() for s in (job.skills_required or []))
        overlap = c_set.intersection(j_set)
        score = int((len(overlap) / max(len(j_set), 1)) * 100) if j_set else 70

        return AIMatchResponse(
            success=True,
            candidate_name=candidate.full_name,
            job_title=job.title,
            match_score=min(max(score, 30), 95),
            analysis=f"Candidate matches {len(overlap)} of {len(j_set)} core required skills.",
            strengths=list(overlap) if overlap else ["General domain background"],
            gaps=list(j_set - c_set) if (j_set - c_set) else ["None identified"],
            recommendation="Review profile for interview alignment",
            ethical_note="All hiring decisions require mandatory human recruiter oversight.",
        )
