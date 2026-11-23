"""
Application Pydantic Schemas - DCI HireMind
Request/response validation schemas for the Application CRUD API.
Upholds Zero Auto-Rejection: human_decision is mandatory for rejections.
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class ApplicationCreate(BaseModel):
    job_id: int
    candidate_id: int
    cover_letter: Optional[str] = None


class ApplicationStatusUpdate(BaseModel):
    stage: Optional[str] = Field(None, max_length=50)
    human_decision: Optional[str] = Field(None, max_length=50)
    human_feedback: Optional[str] = None


class ApplicationResponse(BaseModel):
    id: int
    job_id: int
    candidate_id: int
    stage: str
    match_score: Optional[float]
    match_rationale: Optional[str]
    skill_gap_analysis: Optional[Dict[str, Any]]
    ai_recommendation: Optional[str]
    human_decision: Optional[str]
    human_feedback: Optional[str]
    human_reviewed_at: Optional[datetime]
    created_at: Optional[datetime]
    updated_at: Optional[datetime]
    model_config = {"from_attributes": True}


class ApplicationListResponse(BaseModel):
    items: List[ApplicationResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
