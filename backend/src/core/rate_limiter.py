from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from jose import jwt as jose_jwt, JWTError
from loguru import logger

from src.core.config import settings
from src.core.redis import get_redis

# Paths to exclude from rate limiting
EXCLUDED_PATHS = {"/health", "/docs", "/openapi.json", "/redoc"}

# Authenticated users get a higher per-user rate limit.
# This avoids the Docker bridge IP problem where all browser clients appear
# as the same IP (172.18.0.x gateway) and share a single rate limit bucket.
_AUTHED_LIMIT_MULTIPLIER = 5


def _extract_user_sub(request: Request) -> str | None:
    """
    Extract the 'sub' claim from a JWT bearer token without raising.
    Used only for rate-limit key selection — full validation still happens
    inside route dependencies.
    """
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None
    token = auth[7:]
    try:
        payload = jose_jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.SECURITY_ALGORITHM]
        )
        sub = payload.get("sub")
        return str(sub) if sub else None
    except (JWTError, Exception):
        return None


class RateLimiterMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.url.path in EXCLUDED_PATHS:
            return await call_next(request)

        redis_client = get_redis()
        if redis_client is None:
            return await call_next(request)

        # For authenticated requests: bucket by user ID so every user gets
        # their own counter regardless of shared Docker/proxy IP.
        # For unauthenticated requests: bucket by client IP as before.
        user_sub = _extract_user_sub(request)
        if user_sub:
            key = f"rate_limit:user:{user_sub}"
            limit = settings.RATE_LIMIT_REQUESTS * _AUTHED_LIMIT_MULTIPLIER
        else:
            client_ip = request.client.host if request.client else "unknown"
            key = f"rate_limit:ip:{client_ip}"
            limit = settings.RATE_LIMIT_REQUESTS

        try:
            current_count = await redis_client.incr(key)

            if current_count == 1:
                await redis_client.expire(key, settings.RATE_LIMIT_WINDOW)
            ttl = await redis_client.ttl(key)
            remaining = max(0, limit - current_count)

            if current_count > limit:
                logger.warning(
                    f"Rate limit exceeded — key={key} count={current_count} limit={limit}"
                )
                return JSONResponse(
                    status_code=429,
                    content={"detail": "Too many requests. Please try again later."},
                    headers={
                        "Retry-After": str(ttl),
                        "X-RateLimit-Limit": str(limit),
                        "X-RateLimit-Remaining": "0",
                        "X-RateLimit-Reset": str(ttl),
                    },
                )

            response = await call_next(request)
            response.headers["X-RateLimit-Limit"] = str(limit)
            response.headers["X-RateLimit-Remaining"] = str(remaining)
            response.headers["X-RateLimit-Reset"] = str(ttl)
            return response

        except Exception as e:
            logger.error(f"Rate limiter error: {e}")
            return await call_next(request)
