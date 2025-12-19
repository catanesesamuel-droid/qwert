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

@router.put("/{user_id}", response_model=UserOut)
def update_user_role(
    user_id: int,
    new_role: str,
    admin_user=Depends(require_role("admin"))
):
    """
    Actualiza el rol de un usuario (solo Admin).
    
    Seguridad:
    - Solo admin puede cambiar roles (OWASP API5 - Broken Function Level Authorization)
    - Validación estricta del rol (whitelist)
    - Logging de cambios críticos
    """
    try:
        # Validación de entrada - whitelist de roles permitidos
        ALLOWED_ROLES = ["user", "admin"]
        if new_role not in ALLOWED_ROLES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid role. Allowed roles: {', '.join(ALLOWED_ROLES)}"
            )
        
        if user_id < 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid user ID"
            )
        
        with Session(engine) as session:
            user = session.get(User, user_id)
            
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found"
                )
            
            # Guardar rol anterior para logging
            old_role = user.role
            
            # Actualizar rol
            user.role = new_role
            session.add(user)
            session.commit()
            session.refresh(user)
            
            # Logging de operación crítica
            logger.warning(
                f"Admin {admin_user['username']} changed role of user {user.username} "
                f"from {old_role} to {new_role}"
            )
            
            return user
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating user {user_id} role: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while updating user"
        )