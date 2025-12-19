from fastapi import APIRouter, Depends, Query
from sqlmodel import Session, select, func
from typing import Optional
import math
from app.models.vulnerability import Vulnerability
from app.core.database import get_session
from app.models.vuln_schemas import Severity, VulnerabilitiesListResponse

router = APIRouter()

@router.get("/", response_model=VulnerabilitiesListResponse)
async def list_vulnerabilities(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    severity: Optional[Severity] = None,
    session: Session = Depends(get_session)
):
    statement = select(Vulnerability).where(Vulnerability.status == "active")

    if severity:
        statement = statement.where(Vulnerability.severity == severity.value)

    count_statement = select(func.count()).select_from(Vulnerability).where(
        Vulnerability.status == "active"
    )

    if severity:
        count_statement = count_statement.where(
            Vulnerability.severity == severity.value
        )

    total = session.exec(count_statement).one()
    results = session.exec(
        statement.offset((page - 1) * limit).limit(limit)
    ).all()

    total_pages = math.ceil(total / limit) if total > 0 else 1

    return {
        "vulnerabilities": results,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": total_pages
    }
