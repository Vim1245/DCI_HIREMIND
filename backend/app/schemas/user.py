"""
User Pydantic Schemas - DCI HireMind
Response schemas for the User profile API.
"""

from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class UserProfileResponse(BaseModel):
    id: int
    email: str
    full_name: Optional[str]
    phone_number: Optional[str]
    role: str
    is_active: bool
    created_at: Optional[datetime]
    model_config = {"from_attributes": True}
