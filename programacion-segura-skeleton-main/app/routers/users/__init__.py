from fastapi import APIRouter
from .list_users import router as list_users_router
from .get_user import router as get_user_router
from .update_user_role import router as update_user_role_router
from .delete_user import router as delete_user_router

__all__ = [
    "list_users_router",
    "get_user_router",
    "update_user_role_router",
    "delete_user_router"
]

router = APIRouter()
router.include_router(list_users_router)
router.include_router(get_user_router)
router.include_router(update_user_role_router)
router.include_router(delete_user_router)