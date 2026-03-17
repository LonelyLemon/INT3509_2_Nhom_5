import redis.asyncio as redis
from loguru import logger

from src.core.config import settings

_redis_client: redis.Redis | None = None


async def init_redis() -> redis.Redis:
    """Initialize the Redis client. Call during app startup."""
    global _redis_client
    _redis_client = redis.from_url(
        settings.REDIS_URL,
        decode_responses=True,
    )
    try:
        await _redis_client.ping()
        logger.info("Redis connection established")
    except redis.ConnectionError:
        logger.warning("Redis is not available — rate limiting will be disabled")
        _redis_client = None
    return _redis_client


async def close_redis() -> None:
    """Close the Redis client. Call during app shutdown."""
    global _redis_client
    if _redis_client:
        await _redis_client.close()
        logger.info("Redis connection closed")
        _redis_client = None


def get_redis() -> redis.Redis | None:
    """Return the current Redis client, or None if unavailable."""
    return _redis_client
