from .database import AsyncSessionLocal
from src.auth.dependencies import get_current_user 

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session