from fastapi import APIRouter

from src.auth.router import auth_route


router = APIRouter(
    prefix="/api/v1",
)

router.include_router(auth_route)