from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import SQLModel, create_engine, Session, select
from app.models.user import User
from app.models.schemas import UserOut
from app.core.security import require_role, get_current_user
from pathlib import Path
import os
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

# Configuración de base de datos
current_file = Path(__file__).resolve()
project_root = current_file.parent.parent.parent  # routers/users → routers → app → raíz
database_dir = project_root / "database"
database_path = database_dir / "data.db"
DATABASE_URL = f"sqlite:///{database_path}"
engine = create_engine(DATABASE_URL, echo=False)

@router.get("/{user_id}", response_model=UserOut)
def get_user(
    user_id: int,
    current_user=Depends(get_current_user)
):
    """
    Obtiene detalles de un usuario específico.
    
    Seguridad:
    - Admin puede ver cualquier usuario
    - Usuario normal solo puede ver su propio perfil (IDOR prevention)
    - Validación de ownership (OWASP API1 - Broken Object Level Authorization)
    """
    try:
        # Validación de entrada
        if user_id < 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid user ID"
            )
        
        with Session(engine) as session:
            # Obtener el usuario solicitado
            target_user = session.get(User, user_id)
            
            if not target_user:
                # Mismo mensaje para evitar enumeración de usuarios
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found"
                )
            
            # Obtener el usuario actual para verificar ownership
            db_current_user = session.exec(
                select(User).where(User.username == current_user["username"])
            ).first()
            
            # Control de acceso: Admin o propietario
            if current_user["role"] != "admin" and db_current_user.id != user_id:
                logger.warning(
                    f"User {current_user['username']} attempted unauthorized access to user {user_id}"
                )
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Insufficient privileges"
                )
            
            logger.info(f"User {current_user['username']} accessed user {user_id} details")
            return target_user
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving user {user_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while retrieving user"
        )