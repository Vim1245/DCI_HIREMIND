"""
Candidate Pydantic Schemas - DCI HireMind
Request/response validation schemas for the Candidate CRUD API.
"""

from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import datetime


class CandidateCreate(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    email: str = Field(..., min_length=5, max_length=255)
    phone: Optional[str] = Field(None, max_length=50)
    location: Optional[str] = Field(None, max_length=150)
    skills: Optional[List[str]] = None
    years_of_experience: Optional[float] = Field(None, ge=0, le=60)
    education_level: Optional[str] = Field(None, max_length=100)

    @field_validator('email')
    @classmethod
    def validate_email_format(cls, v: str) -> str:
        if '@' not in v or '.' not in v.split('@')[-1]:
            raise ValueError('Invalid email format')
        return v.lower().strip()


class CandidateUpdate(BaseModel):
    first_name: Optional[str] = Field(None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(None, min_length=1, max_length=100)
    phone: Optional[str] = Field(None, max_length=50)
    location: Optional[str] = Field(None, max_length=150)
    skills: Optional[List[str]] = None
    years_of_experience: Optional[float] = Field(None, ge=0, le=60)
    education_level: Optional[str] = Field(None, max_length=100)
    status: Optional[str] = Field(None, max_length=50)


class CandidateResponse(BaseModel):
    id: int
    anonymized_id: str
    first_name: Optional[str]
    last_name: Optional[str]
    email: str
    phone: Optional[str]
    location: Optional[str]
    skills: Optional[List[str]]
    years_of_experience: Optional[float]
    education_level: Optional[str]
    status: str
    created_at: Optional[datetime]
    updated_at: Optional[datetime]
    model_config = {"from_attributes": True}


class CandidateListResponse(BaseModel):
    items: List[CandidateResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
