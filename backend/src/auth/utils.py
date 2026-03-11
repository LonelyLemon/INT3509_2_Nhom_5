from jose import jwt, JWTError
from datetime import datetime, timezone, timedelta

from src.core.config import settings
from src.auth.exceptions import UserNotAuthenticated

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({
        "exp": expire,
        "type": "access",
    })
    jwt_token_encoded = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.SECURITY_ALGORITHM)
    return jwt_token_encoded


def create_refresh_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({
        "exp": expire,
        "type": "refresh",
    })
    jwt_token_encoded = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.SECURITY_ALGORITHM)
    return jwt_token_encoded


def create_verify_token(email: str) -> str:
    expire=datetime.now(timezone.utc) + timedelta(hours=settings.VERIFY_TOKEN_EXPIRES)
    to_encode = {
        "sub": email,
        "exp": expire,
        "type": "verification"
    }
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.SECURITY_ALGORITHM)
    return encoded_jwt


def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=settings.SECURITY_ALGORITHM)
        return payload
    except JWTError:
        raise UserNotAuthenticated