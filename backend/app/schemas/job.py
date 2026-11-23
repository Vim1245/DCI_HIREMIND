"""
Job Pydantic Schemas - DCI HireMind
Request/response validation schemas for the Job CRUD API.
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class JobCreate(BaseModel):
    title: str = Field(..., min_length=2, max_length=255)
    department: Optional[str] = Field(None, max_length=100)
    location: Optional[str] = Field(None, max_length=150)
    employment_type: str = Field("Full-Time", max_length=50)
    description: str = Field(..., min_length=10)
    requirements: Optional[str] = None
    required_skills: Optional[List[str]] = None
    experience_level: Optional[str] = Field(None, max_length=50)
    salary_min: Optional[float] = Field(None, ge=0)
    salary_max: Optional[float] = Field(None, ge=0)


class JobUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=2, max_length=255)
    department: Optional[str] = Field(None, max_length=100)
    location: Optional[str] = Field(None, max_length=150)
    employment_type: Optional[str] = Field(None, max_length=50)
    description: Optional[str] = Field(None, min_length=10)
    requirements: Optional[str] = None
    required_skills: Optional[List[str]] = None
    experience_level: Optional[str] = Field(None, max_length=50)
    salary_min: Optional[float] = Field(None, ge=0)
    salary_max: Optional[float] = Field(None, ge=0)
    status: Optional[str] = Field(None, max_length=50)


class JobResponse(BaseModel):
    id: int
    title: str
    department: Optional[str]
    location: Optional[str]
    employment_type: str
    description: str
    requirements: Optional[str]
    required_skills: Optional[List[str]]
    experience_level: Optional[str]
    salary_min: Optional[float]
    salary_max: Optional[float]
    status: str
    created_by_id: Optional[int]
    created_at: Optional[datetime]
    updated_at: Optional[datetime]
    model_config = {"from_attributes": True}


class JobListResponse(BaseModel):
    items: List[JobResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
