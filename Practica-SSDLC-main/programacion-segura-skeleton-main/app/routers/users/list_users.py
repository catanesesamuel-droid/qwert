from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import SQLModel, create_engine, Session, select
from pathlib import Path
from app.models.user import User
from app.core.database import get_session
from app.models.schemas import UserOut
from app.core.security import require_role, get_current_user
import os
import logging

logger = logging.getLogger(__name__)
router = APIRouter()
current_file = Path(__file__).resolve()
project_root = current_file.parent.parent.parent  
database_dir = project_root / "database"
database_path = database_dir / "data.db"
DATABASE_URL = f"sqlite:///{database_path}"
engine = create_engine(DATABASE_URL, echo=False)



@router.get("/", response_model=list[UserOut])
def list_users(
    skip: int = 0,
    limit: int = 100,
    user=Depends(require_role("admin"))
):
    """
    Lista usuarios con paginación (solo Admin).
    
    Seguridad:
    - Requiere rol de admin
    - Paginación para evitar DoS (OWASP API4 - Unrestricted Resource Consumption)
    - No expone contraseñas (UserOut no incluye hashed_password)
    """
    try:
        # Validación de parámetros de entrada
        if skip < 0 or limit < 1 or limit > 100:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid pagination parameters"
            )

        with get_session() as session:
            users = session.exec(
                select(User).offset(skip).limit(limit)
            ).all()
            
            logger.info(f"Admin {user['username']} listed users (skip={skip}, limit={limit})")
            return users
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing users: {str(e)}")
        # No exponer detalles del error al cliente (A09 - Security Logging)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while retrieving users"
        )