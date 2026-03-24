from datetime import datetime

from fastapi import APIRouter
from src.news.get_news import get_news, get_global_news
from src.core.database import SessionDep


news_route = APIRouter(
    prefix="/news",
    tags=["Authentication"]
)

#----------------------
#      GET NEWS
#----------------------

@news_route.get("")
async def get_news(db: SessionDep):
    return