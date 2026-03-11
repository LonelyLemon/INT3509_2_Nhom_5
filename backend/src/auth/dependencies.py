from fastapi import Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.future import select

from src.core.database import SessionDep
from src.auth.models import User
from src.auth.exceptions import UserNotFound, UserNotAuthenticated
from src.auth.utils import decode_token
from src.auth.exceptions import InvalidToken


bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(db: SessionDep,
                           cred: HTTPAuthorizationCredentials = Depends(bearer_scheme)):
    if not cred or cred.scheme.lower() != "bearer":
        raise UserNotAuthenticated()
    
    token = cred.credentials

    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        raise InvalidToken()
    
    email = payload.get("sub")
    if not email:
        raise InvalidToken()
    
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if not user:
        raise UserNotFound()
    
    return user
