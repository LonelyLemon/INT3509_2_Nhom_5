from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from loguru import logger

from src.core.config import settings
from src.core.redis import get_redis

# Paths to exclude from rate limiting
EXCLUDED_PATHS = {"/health", "/docs", "/openapi.json", "/redoc"}


class RateLimiterMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.url.path in EXCLUDED_PATHS:
            return await call_next(request)

        redis_client = get_redis()

        if redis_client is None:
            return await call_next(request)

        client_ip = request.client.host if request.client else "unknown"
        key = f"rate_limit:{client_ip}"

        try:
            current_count = await redis_client.incr(key)

            if current_count == 1:
                await redis_client.expire(key, settings.RATE_LIMIT_WINDOW)
            ttl = await redis_client.ttl(key)
            remaining = max(0, settings.RATE_LIMIT_REQUESTS - current_count)

            if current_count > settings.RATE_LIMIT_REQUESTS:
                logger.warning(f"Rate limit exceeded for {client_ip}")
                return JSONResponse(
                    status_code=429,
                    content={"detail": "Too many requests. Please try again later."},
                    headers={
                        "Retry-After": str(ttl),
                        "X-RateLimit-Limit": str(settings.RATE_LIMIT_REQUESTS),
                        "X-RateLimit-Remaining": "0",
                        "X-RateLimit-Reset": str(ttl),
                    },
                )

            response = await call_next(request)
            response.headers["X-RateLimit-Limit"] = str(settings.RATE_LIMIT_REQUESTS)
            response.headers["X-RateLimit-Remaining"] = str(remaining)
            response.headers["X-RateLimit-Reset"] = str(ttl)
            return response

        except Exception as e:
            logger.error(f"Rate limiter error: {e}")
            return await call_next(request)
