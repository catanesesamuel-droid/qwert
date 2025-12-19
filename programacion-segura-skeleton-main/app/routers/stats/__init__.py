from fastapi import APIRouter
from .list_vulnerabilities import router as list_router
from .create_vulnerability import router as create_router
from .delete_vulnerability import router as delete_router

router = APIRouter()

router.include_router(list_router)
router.include_router(create_router)
router.include_router(delete_router)
