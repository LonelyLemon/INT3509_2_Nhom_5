from fastapi import APIRouter

from src.auth.router import auth_route
from src.news.router import news_route


router = APIRouter(
    prefix="/api/v1",
)

router.include_router(auth_route)
router.include_router(news_route)