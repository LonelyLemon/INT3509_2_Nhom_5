from fastapi import Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.future import select

from src.core.database import SessionDep
from src.core.redis import get_redis
from src.auth.models import User
from src.auth.exceptions import UserNotFound, UserNotAuthenticated, UserBanned, InsufficientPermissions
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

    redis_client = get_redis()
    if redis_client and await redis_client.exists(f"token_blacklist:{token}"):
        raise InvalidToken()

    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if not user:
        raise UserNotFound()

    if user.is_banned:
        raise UserBanned()

    return user


async def get_admin_user(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise InsufficientPermissions()
    return current_user
