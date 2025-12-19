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

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    admin_user=Depends(require_role("admin"))
):
    """
    Elimina un usuario (solo Admin).
    
    Seguridad:
    - Solo admin puede eliminar usuarios
    - Previene auto-eliminación del admin
    - Logging de operación crítica
    - Validación estricta de ID
    """
    try:
        # Validación de entrada
        if user_id < 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid user ID"
            )
        
        with Session(engine) as session:
            # Obtener usuario a eliminar
            user = session.get(User, user_id)
            
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found"
                )
            
            # Obtener el admin actual
            admin = session.exec(
                select(User).where(User.username == admin_user["username"])
            ).first()
            
            # Prevenir auto-eliminación
            if admin.id == user_id:
                logger.warning(f"Admin {admin_user['username']} attempted self-deletion")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot delete your own account"
                )
            
            # Guardar información para logging antes de eliminar
            deleted_username = user.username
            
            # Eliminar usuario
            session.delete(user)
            session.commit()
            
            # Logging de operación crítica
            logger.warning(
                f"Admin {admin_user['username']} deleted user {deleted_username} (ID: {user_id})"
            )
            
            return None
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting user {user_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while deleting user"
            )