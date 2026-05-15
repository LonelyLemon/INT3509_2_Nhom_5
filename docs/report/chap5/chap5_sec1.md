# 5.1 Tổng Quan Chiến Lược Kiểm Thử

## Mục tiêu kiểm thử

Kiểm thử phần mềm trong dự án MarketMind hướng đến ba mục tiêu cốt lõi: đảm bảo tính đúng đắn của từng hàm logic riêng lẻ, xác nhận các thành phần hoạt động đúng khi kết hợp với nhau qua HTTP, và kiểm tra hệ thống chịu tải theo thiết kế dưới điều kiện giả lập cao. Báo cáo này trình bày kết quả kiểm thử theo bốn tầng: kiểm thử đơn vị, kiểm thử tích hợp API, và kiểm thử hiệu năng (phần kiểm thử hệ thống AI tạm thời bỏ qua do tính chất phi tất định của LLM).

## Chiến lược phân tầng

```
┌─────────────────────────────────────────────────────┐
│  Tầng 4 — Kiểm thử hiệu năng                        │
│  (Rate limiting, response headers, excluded paths)   │
├─────────────────────────────────────────────────────┤
│  Tầng 3 — Kiểm thử tích hợp Frontend               │
│  (Component + store với MSW mock API)                │
├─────────────────────────────────────────────────────┤
│  Tầng 2 — Kiểm thử tích hợp Backend                │
│  (FastAPI router qua ASGI, dependency injection)     │
├─────────────────────────────────────────────────────┤
│  Tầng 1 — Kiểm thử đơn vị                          │
│  (Hàm thuần túy: security, indicators, sentiment)   │
└─────────────────────────────────────────────────────┘
```

Chiến lược được thiết kế theo nguyên tắc **kiểm thử không phụ thuộc cơ sở hạ tầng thực**: toàn bộ kết nối PostgreSQL, Redis, SMTP, và các API bên ngoài đều được thay thế bằng mock object. Điều này cho phép toàn bộ bộ test chạy trong CI/CD mà không cần khởi động dịch vụ nào.

## Công cụ và framework

| Tầng | Công cụ | Ghi chú |
|------|---------|---------|
| Unit + Integration Backend | pytest 8.x + pytest-asyncio | `asyncio_mode = "auto"` cho coroutine test |
| HTTP simulation Backend | httpx `AsyncClient` + `ASGITransport` | Gọi FastAPI trực tiếp qua ASGI, không cần server |
| Dependency mocking | `unittest.mock` (`AsyncMock`, `MagicMock`) | Override `app.dependency_overrides` |
| Unit + Component Frontend | Vitest 3.x + React Testing Library | Cấu hình qua `vite.config.ts` |
| API mocking Frontend | MSW (Mock Service Worker) v2 | Handler-based, intercept fetch tại runtime |
| Store testing | Zustand `setState` | Reset state giữa các test |

## Cấu trúc thư mục test

Toàn bộ bộ test bổ sung cho báo cáo chương 5 được đặt trong thư mục `/test/` tại gốc repository, tách biệt hoàn toàn với test gốc trong `backend/tests/`. Frontend test nằm trong `frontend/src/__tests__/` theo yêu cầu của cấu hình Vitest.

```
/test/
├── backend/
│   ├── pyproject.toml          # asyncio_mode=auto, pythonpath=../../backend
│   ├── .env                    # stub values — tất cả DB call đều được mock
│   ├── unit/
│   │   ├── test_auth_security.py
│   │   ├── test_indicators_math.py
│   │   └── test_news_sentiment.py
│   └── integration/
│       ├── test_auth_router.py
│       ├── test_portfolio_router.py
│       ├── test_watchlist_router.py
│       └── test_blog_router.py
└── performance/
    ├── pyproject.toml
    ├── .env
    └── test_rate_limiting.py

frontend/src/__tests__/
├── store/
│   └── useMarketStore.test.ts
└── components/
    └── WatchlistManager.test.tsx
```

## Tổng hợp kết quả

| Nhóm test | Số lượng | Kết quả |
|-----------|----------|---------|
| Unit Backend — auth/security | 5 | Tất cả passed |
| Unit Backend — indicators/math | 16 | Tất cả passed |
| Unit Backend — news/sentiment | 6 | Tất cả passed |
| Unit Backend — tổng cộng | **32** | ✓ passed |
| Integration Backend — auth | 8 | Tất cả passed |
| Integration Backend — portfolio | 6 | Tất cả passed |
| Integration Backend — watchlist | 6 | Tất cả passed |
| Integration Backend — blog | 6 | Tất cả passed |
| Integration Backend — tổng cộng | **26** | ✓ passed |
| Performance — rate limiting | **4** | Tất cả passed |
| Frontend — Zustand store | 8 | Tất cả passed |
| Frontend — WatchlistManager | 5 | Tất cả passed |
| Frontend — tổng cộng | **13** | ✓ passed |
| **Tổng toàn bộ** | **75** | **✓ 75/75 passed** |
