# 4.2.1 Cấu Trúc Module Hóa Theo Router

FastAPI tổ chức toàn bộ API theo mô hình **module-per-domain**: mỗi lĩnh vực nghiệp vụ là một package Python độc lập với router, schema, model, exception và logic riêng. Cách tổ chức này đảm bảo mỗi module có thể phát triển và test độc lập mà không ảnh hưởng đến phần còn lại.

## Cấu trúc thư mục

```
backend/src/
├── main.py              ← entry point, mount tất cả routers
├── models.py            ← Base model SQLAlchemy dùng chung
├── core/
│   ├── config.py        ← Settings (Pydantic BaseSettings, đọc từ .env)
│   ├── database.py      ← engine, SessionLocal, TaskSessionLocal (NullPool)
│   ├── redis.py         ← init/close/get Redis client
│   ├── celery.py        ← Celery app + Beat schedule
│   └── rate_limiter.py  ← RateLimiterMiddleware
├── auth/                ← FR-1: xác thực, user management
├── price/               ← FR-2: tickers, OHLCV, backfill
├── ai/                  ← FR-3: chat, conversations, agents
├── news/                ← FR-4: tin tức, sentiment
├── blog/                ← FR-5: bài viết cộng đồng
├── portfolio/           ← FR-6: portfolio, holdings
├── watchlist/           ← FR-7: watchlist
└── indicators/          ← cài đặt chỉ báo kỹ thuật per-user
```

Mỗi domain package có cấu trúc nhất quán:

```
<domain>/
├── router.py      ← FastAPI APIRouter, khai báo endpoints
├── models.py      ← SQLAlchemy ORM models
├── schemas.py     ← Pydantic request/response schemas
├── exceptions.py  ← HTTP exceptions của domain
├── dependencies.py (nếu cần) ← reusable Depends()
└── tasks.py (nếu cần) ← Celery tasks của domain
```

## Mount router trong main.py

```python
from src.auth.router     import auth_route
from src.news.router     import news_route
from src.price.router    import price_route
from src.blog.router     import blog_route
from src.portfolio.router import portfolio_route
from src.watchlist.router import watchlist_route
from src.ai.router       import ai_route
from src.indicators.router import indicators_router

app.include_router(news_route)
app.include_router(auth_route)
app.include_router(price_route)
app.include_router(blog_route)
app.include_router(portfolio_route)
app.include_router(watchlist_route)
app.include_router(ai_route)
app.include_router(indicators_router)
```

Mỗi router được khởi tạo với `prefix` và `tags` riêng:

```python
# Ví dụ: auth/router.py
auth_route = APIRouter(prefix="/auth", tags=["Authentication"])

# Ví dụ: ai/router.py
ai_route = APIRouter(prefix="/ai", tags=["AI"])
```

`prefix` tự động thêm vào tất cả endpoint trong router — `auth_route` khai báo `/register` trở thành `/auth/register` khi mount. `tags` nhóm endpoint trong OpenAPI docs tại `/docs`.

## Lợi ích thực tế

**Tránh xung đột route:** FastAPI match route theo thứ tự khai báo. Trong module `price`, các static path (`/price/tickers`, `/price/fetch`) được khai báo **trước** dynamic path (`/price/{ticker}`) để tránh FastAPI nhầm "tickers" là ticker symbol. Với module hóa, thứ tự này được kiểm soát hoàn toàn trong từng file `router.py` độc lập.

**HTTP exception nhất quán:** Mỗi module định nghĩa exception riêng kế thừa `HTTPException`. Ví dụ `AssetNotFound` (404) trong `price/exceptions.py`, `ConversationNotFound` (404) trong `ai/exceptions.py`. Handler toàn cục trong `main.py` xử lý `RequestValidationError` trả về format thống nhất `{"msg": "..."}`.

**Lifecycle management:** `main.py` định nghĩa `lifespan` context manager khởi tạo/đóng Redis, seed dữ liệu mặc định (admin user, tickers) khi server start, và dọn dẹp khi shutdown — tách biệt hoàn toàn với logic nghiệp vụ trong các module.
