from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from loguru import logger
from starlette.middleware.cors import CORSMiddleware

from sqlalchemy import select

from src.core.config import settings
from src.core.database import SessionLocal
from src.core.redis import init_redis, close_redis
from src.core.rate_limiter import RateLimiterMiddleware
from src.auth.models import User
from src.auth.security import hash_password

from src.auth.router import auth_route
from src.news.router import news_route
from src.price.router import price_route
from src.portfolio.router import portfolio_route
from src.watchlist.router import watchlist_route
from src.ai.router import ai_route

THIS_DIR = Path(__file__).parent

async def create_admin_user():
    async with SessionLocal() as session:
        result = await session.execute(
            select(User).where(User.email == settings.ADMIN_EMAIL)
        )
        if result.scalar_one_or_none() is None:
            admin = User(
                username="admin",
                email=settings.ADMIN_EMAIL,
                password_hash=hash_password(settings.ADMIN_PASSWORD),
                is_verified=True,
                role="admin",
            )
            session.add(admin)
            await session.commit()
            logger.info(f"Admin user created: {settings.ADMIN_EMAIL}")
        else:
            logger.info("Admin user already exists, skipping creation")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Application startup")
    await init_redis()
    await create_admin_user()

    yield

    await close_redis()


app = FastAPI(
    title="MarketMind",
    description="MarketMind API Documentation",
    version="1.0",
    lifespan=lifespan,
)


# ── Security Headers Middleware ──
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    # Prevent caching on API responses
    if request.url.path.startswith("/api/") or request.url.path.startswith("/auth/"):
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
    return response


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=settings.CORS_ORIGINS_REGEX,
    allow_credentials=True,
    allow_methods=("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"),
    allow_headers=settings.CORS_HEADERS,
)

# ── Rate Limiting Middleware ──
app.add_middleware(RateLimiterMiddleware)

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=400,
        content={"msg": exc.errors()[0]["msg"]},
    )

# ── Health Check ──
@app.get("/health", include_in_schema=False)
async def health_check():
    return {"status": "ok", "version": "1.0"}


# ── Router ──

app.include_router(news_route)
app.include_router(auth_route)
app.include_router(price_route)
app.include_router(portfolio_route)
app.include_router(watchlist_route)
app.include_router(ai_route)