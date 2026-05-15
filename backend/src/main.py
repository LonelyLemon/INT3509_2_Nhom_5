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
from src.price.models import Asset
from src.price.constants import AssetType

from src.auth.router import auth_route
from src.news.router import news_route
from src.price.router import price_route
from src.blog.router import blog_route
from src.portfolio.router import portfolio_route
from src.watchlist.router import watchlist_route
from src.ai.router import ai_route
from src.indicators.router import indicators_router
from src.evaluation.router import eval_route

THIS_DIR = Path(__file__).parent

_SEED_TICKERS: list[tuple[str, str, AssetType]] = [
    # (ticker, name, asset_type)
    # US Stocks
    ("AAPL",  "Apple Inc.",               AssetType.STOCK),
    ("MSFT",  "Microsoft Corporation",    AssetType.STOCK),
    ("GOOGL", "Alphabet Inc.",            AssetType.STOCK),
    ("AMZN",  "Amazon.com Inc.",          AssetType.STOCK),
    ("NVDA",  "NVIDIA Corporation",       AssetType.STOCK),
    ("TSLA",  "Tesla Inc.",               AssetType.STOCK),
    ("META",  "Meta Platforms Inc.",      AssetType.STOCK),
    ("NFLX",  "Netflix Inc.",             AssetType.STOCK),
    ("JPM",   "JPMorgan Chase & Co.",     AssetType.STOCK),
    ("V",     "Visa Inc.",                AssetType.STOCK),
    # ETFs
    ("SPY",   "SPDR S&P 500 ETF",         AssetType.ETF),
    ("QQQ",   "Invesco QQQ Trust",        AssetType.ETF),
    ("IWM",   "iShares Russell 2000 ETF", AssetType.ETF),
    ("GLD",   "SPDR Gold Shares",         AssetType.ETF),
    ("VNM",   "VanEck Vietnam ETF",       AssetType.ETF),
    # Crypto
    ("BTC-USD", "Bitcoin",  AssetType.CRYPTO),
    ("ETH-USD", "Ethereum", AssetType.CRYPTO),
    ("BNB-USD", "BNB",      AssetType.CRYPTO),
]


async def seed_tickers():
    async with SessionLocal() as session:
        existing = set(
            (await session.execute(select(Asset.ticker))).scalars().all()
        )
        new_assets = [
            Asset(ticker=ticker, name=name, asset_type=asset_type)
            for ticker, name, asset_type in _SEED_TICKERS
            if ticker not in existing
        ]
        if new_assets:
            session.add_all(new_assets)
            await session.commit()
            logger.info(f"Seeded {len(new_assets)} tickers: {[a.ticker for a in new_assets]}")
        else:
            logger.info("All seed tickers already present, skipping.")


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
    await seed_tickers()

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
app.include_router(blog_route)
app.include_router(portfolio_route)
app.include_router(watchlist_route)
app.include_router(ai_route)
app.include_router(indicators_router)
app.include_router(eval_route)
