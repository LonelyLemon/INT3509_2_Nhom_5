from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from loguru import logger
from starlette.middleware.cors import CORSMiddleware

from src.core.config import settings

from src.router import router

THIS_DIR = Path(__file__).parent

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Application startup")
    yield

# ── OpenAPI tags for docs grouping ──
tags_metadata = [
    {"name": "auth", "description": "Authentication & user management"},
]

app = FastAPI(
    title="MarketMind",
    description="MarketMind API Documentation",
    version="1.0",
    lifespan=lifespan,
    openapi_tags=tags_metadata,
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

app.include_router(router)