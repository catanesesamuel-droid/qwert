from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from enum import Enum

class Severity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class VulnerabilityBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: str = Field(..., min_length=10, max_length=500)
    severity: Severity

class VulnerabilityCreate(VulnerabilityBase):
    pass  # created_by will be taken from JWT token, not from request body

class VulnerabilityResponse(VulnerabilityBase):
    id: int
    created_by: int
    created_at: datetime
    status: str

    class Config:
        from_attributes = True

class VulnerabilitiesListResponse(BaseModel):
    vulnerabilities: List[VulnerabilityResponse]
    total: int
    page: int
    limit: int
    total_pages: int
