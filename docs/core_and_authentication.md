# Báo cáo Kỹ thuật: Module Core & Authentication

> **Dự án:** MarketMind — Ứng dụng phân tích thị trường tài chính hỗ trợ AI  
> **Backend:** FastAPI + PostgreSQL (async) + Redis + Celery  
> **Phạm vi tài liệu:** `backend/src/core/` và `backend/src/auth/`

---

## Mục lục

1. [Tổng quan dự án](#1-tổng-quan-dự-án)
2. [Module Core](#2-module-core)
   - [Tổng quát](#21-tổng-quát)
   - [Cấu trúc & thành phần](#22-cấu-trúc--thành-phần)
   - [Sơ đồ luồng](#23-sơ-đồ-luồng)
3. [Module Authentication](#3-module-authentication)
   - [Tổng quát](#31-tổng-quát)
   - [Cấu trúc & thành phần](#32-cấu-trúc--thành-phần)
   - [Sơ đồ luồng](#33-sơ-đồ-luồng)
   - [Hệ thống API](#34-hệ-thống-api)
4. [Tích hợp tại main.py](#4-tích-hợp-tại-mainpy)
5. [Bảo mật](#5-bảo-mật)
6. [Các hạn chế hiện tại](#6-các-hạn-chế-hiện-tại)

---

## 1. Tổng quan dự án

**MarketMind** là nền tảng phân tích thị trường tài chính kết hợp AI đa tác tử, cho phép người dùng theo dõi giá cổ phiếu, đọc tin tức tài chính, quản lý danh mục đầu tư và nhận tư vấn từ AI.

**Công nghệ backend:**

| Thành phần | Công nghệ |
|---|---|
| Web Framework | FastAPI |
| Database | PostgreSQL (asyncpg) + TimescaleDB |
| Cache / Broker | Redis |
| Task Queue | Celery + Celery Beat |
| ORM | SQLAlchemy (async) |
| Auth | JWT (python-jose) + bcrypt |
| Email | FastMail (SMTP/STARTTLS) |
| AI / LLM | OpenAI GPT-4o-mini, Google Gemini 2.0 Flash |

**Cấu trúc thư mục `backend/src/`:**

```
backend/src/
├── main.py              # Entry point FastAPI
├── models.py            # Import tất cả models (dùng cho Alembic)
├── core/                # Hạ tầng toàn cục
├── auth/                # Xác thực & phân quyền
├── news/                # Tin tức thị trường
├── price/               # Dữ liệu giá
├── portfolio/           # Danh mục đầu tư
├── watchlist/           # Danh sách theo dõi
├── ai/                  # AI agents
└── utils/               # Tiện ích dùng chung
```

---

## 2. Module Core

### 2.1 Tổng quát

Module `core` là **nền tảng hạ tầng** của toàn bộ ứng dụng. Nó không xử lý logic nghiệp vụ mà cung cấp các dịch vụ cơ sở mà mọi module khác đều phụ thuộc vào:

- **Cấu hình môi trường** — đọc và phân phối toàn bộ biến môi trường
- **Kết nối database** — quản lý connection pool đến PostgreSQL
- **Kết nối Redis** — cache, rate limiting, message broker
- **Rate Limiting** — bảo vệ API khỏi bị lạm dụng
- **Base Model** — định nghĩa các trường chung (id, timestamps) cho tất cả entities
- **Celery** — cấu hình hệ thống xử lý task bất đồng bộ và lịch định kỳ

### 2.2 Cấu trúc & thành phần

```
backend/src/core/
├── __init__.py
├── config.py        # Cấu hình ứng dụng (Pydantic Settings)
├── database.py      # SQLAlchemy engines & session
├── base_model.py    # SQLAlchemy Base class
├── redis.py         # Redis client lifecycle
├── rate_limiter.py  # Rate limiting middleware
├── celery.py        # Celery app & beat schedule
└── constants.py     # Hằng số DB naming + Environment enum
```

---

#### `config.py` — Cấu hình ứng dụng

Sử dụng **Pydantic Settings** để load cấu hình từ file `.env`. Tất cả module import singleton `settings` từ đây.

```python
class Settings(CustomBaseSettings):
    # Database
    POSTGRES_USER, POSTGRES_DB, POSTGRES_PASSWORD, POSTGRES_HOST, POSTGRES_PORT
    DATABASE_POOL_SIZE: int = 16
    DATABASE_POOL_TTL: int = 1200  # 20 phút
    DATABASE_POOL_PRE_PING: bool = True

    # CORS
    CORS_ORIGINS: list[str] = ["*"]
    FRONTEND_URL: str = "http://localhost:5173"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # Rate Limiting
    RATE_LIMIT_REQUESTS: int = 100   # request tối đa
    RATE_LIMIT_WINDOW: int = 60      # mỗi 60 giây

    # Authentication
    SECRET_KEY: str
    SECURITY_ALGORITHM: str          # HS256
    ACCESS_TOKEN_EXPIRE_MINUTES: int
    REFRESH_TOKEN_EXPIRES: int
    VERIFY_TOKEN_EXPIRES: int        # giờ

    # Email, AI APIs, External APIs, Admin account...

    @computed_field
    def ASYNC_DATABASE_URI(self) -> PostgresDsn:
        # Tự động tạo URI: postgresql+asyncpg://user:pass@host:port/db

settings = Settings()  # Singleton — dùng toàn ứng dụng
```

---

#### `database.py` — Kết nối Database

Tạo hai SQLAlchemy async engines với mục đích khác nhau:

```
┌─────────────────────────────────────────────────────────────┐
│                      database.py                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  engine (HTTP requests)            _task_engine (Celery)    │
│  ├─ pool_size = 16                 ├─ NullPool              │
│  ├─ pool_recycle = 20 min          │  (không tái dùng conn) │
│  └─ pool_pre_ping = True           └─ Mỗi task: open/close  │
│                                                             │
│  SessionLocal ──→ get_session()    TaskSessionLocal         │
│                   └─ SessionDep    └─ Dùng trong tasks      │
└─────────────────────────────────────────────────────────────┘
```

> **Lý do dùng NullPool cho Celery:** asyncpg connections bị ràng buộc với event loop tạo ra chúng. Celery mỗi task gọi `asyncio.run()` tạo event loop mới, nên pool cũ bị vô hiệu. `NullPool` tránh điều này bằng cách luôn tạo kết nối mới và đóng ngay sau khi dùng.

**Dependency injection:**
```python
SessionDep = Annotated[AsyncSession, Depends(get_session)]
# Dùng trong route handlers: async def my_route(db: SessionDep)
```

---

#### `base_model.py` — Base Model

Tất cả ORM entities kế thừa từ `Base`, tự động có:

| Trường | Kiểu | Mô tả |
|---|---|---|
| `id` | `UUID` | Primary key, tự động tạo `uuid4` |
| `created_at` | `datetime (timezone)` | Thời điểm tạo |
| `updated_at` | `datetime (timezone)` | Thời điểm cập nhật lần cuối |

```python
class Base(DeclarativeBase):
    __abstract__ = True
    
    @declared_attr
    def __tablename__(cls) -> str:
        return cls.__name__.lower()  # User → "user", NewsArticle → "newsarticle"
    
    def to_dict(self) -> dict: ...  # Chuyển sang dictionary
```

---

#### `redis.py` — Redis Client

Quản lý vòng đời của Redis client duy nhất toàn ứng dụng:

```
App Startup → init_redis()
  ├─ Kết nối thành công → _redis_client được set
  └─ Kết nối thất bại → _redis_client = None (graceful degradation)
                         → Rate limiting tự động tắt

App Shutdown → close_redis()
  └─ Đóng kết nối, giải phóng tài nguyên

get_redis() → Trả về client hoặc None
```

---

#### `rate_limiter.py` — Rate Limiting Middleware

Middleware Starlette chạy trước mọi request, giới hạn số lượng request theo IP:

```
Mỗi request đến:
  1. Bỏ qua nếu path trong {/health, /docs, /openapi.json, /redoc}
  2. Nếu Redis không có → cho qua (degradation)
  3. Lấy IP client → key = "rate_limit:{ip}"
  4. Redis INCR key
     ├─ Nếu count == 1 → SET EXPIRE (window = 60s)
     └─ Nếu count > limit (100) → 429 Too Many Requests
  5. Gắn headers vào response:
     ├─ X-RateLimit-Limit: 100
     ├─ X-RateLimit-Remaining: còn lại
     └─ X-RateLimit-Reset: TTL (giây)
```

**Response khi vượt giới hạn:**
```json
HTTP 429 Too Many Requests
{
  "detail": "Too many requests. Please try again later."
}
Headers:
  Retry-After: <ttl>
  X-RateLimit-Limit: 100
  X-RateLimit-Remaining: 0
  X-RateLimit-Reset: <ttl>
```

---

#### `celery.py` — Celery & Scheduled Tasks

Cấu hình Celery dùng Redis làm cả broker lẫn result backend:

```python
celery_app = Celery(
    "marketmind",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["src.price.tasks", "src.news.tasks"],
)
```

**Lịch định kỳ (Beat Schedule) — múi giờ Asia/Ho_Chi_Minh:**

| Task | Lịch | Mô tả |
|---|---|---|
| `price.ingest_1m_price_data` | Mỗi phút | Lấy dữ liệu giá 1 phút |
| `news.ingest_assets_news` | Mỗi 3 giờ (phút 0) | Cập nhật tin tức định kỳ |
| `news.ingest_assets_news` | 20:30 HCM hàng ngày | NYSE mở cửa (9:30 ET mùa hè) |
| `news.ingest_assets_news` | 03:00 HCM hàng ngày | NYSE đóng cửa (16:00 ET mùa hè) |

---

#### `constants.py` — Hằng số

```python
DB_NAMING_CONVENTION = {
    "ix": "%(column_0_label)s_idx",     # Index
    "uq": "%(table_name)s_%(column_0_name)s_key",  # Unique
    "fk": "%(table_name)s_%(column_0_name)s_fkey", # Foreign key
    "pk": "%(table_name)s_pkey",        # Primary key
}

class Environment(StrEnum):
    LOCAL | DEV | STAGING | PRODUCTION
    
    .is_debug   → True nếu LOCAL / DEV / STAGING
    .is_testing → True nếu LOCAL
    .is_deployed → True nếu STAGING / PRODUCTION
```

---

### 2.3 Sơ đồ luồng

```
                     ┌────────────────────────────────────┐
                     │          FastAPI App Startup        │
                     └──────────────┬─────────────────────┘
                                    │
              ┌─────────────────────┼──────────────────────┐
              ▼                     ▼                      ▼
       init_redis()          create_admin_user()      [Middleware stack]
       ├─ Ping Redis          ├─ Check ADMIN_EMAIL     ├─ RateLimiterMiddleware
       ├─ OK → client set     └─ Create nếu chưa có   ├─ CORSMiddleware
       └─ Fail → None                                  └─ SecurityHeadersMiddleware
                                    │
              ┌─────────────────────┼──────────────────────┐
              ▼                     ▼                      ▼
       [config.py]          [database.py]           [celery.py]
       Settings singleton    engine (pool=16)        Celery Beat
       Load từ .env          _task_engine (NullPool)  └─ tasks mỗi phút/giờ
                             SessionDep

                     ┌────────────────────────────────────┐
                     │          Incoming Request           │
                     └──────────────┬─────────────────────┘
                                    │
                     ┌──────────────▼─────────────────────┐
                     │    RateLimiterMiddleware             │
                     │  Redis INCR rate_limit:{ip}         │
                     │  > 100/60s → 429 Too Many Requests  │
                     └──────────────┬─────────────────────┘
                                    │
                     ┌──────────────▼─────────────────────┐
                     │      Route Handler                  │
                     │  Depends(get_session) → SessionDep  │
                     └──────────────┬─────────────────────┘
                                    │
                     ┌──────────────▼─────────────────────┐
                     │    PostgreSQL (asyncpg)             │
                     └────────────────────────────────────┘
```

---

## 3. Module Authentication

### 3.1 Tổng quát

Module `auth` cung cấp toàn bộ hệ thống xác thực và quản lý người dùng của MarketMind:

- **Đăng ký tài khoản** với xác minh email bắt buộc
- **Đăng nhập** bằng JWT (access token + refresh token)
- **Quản lý hồ sơ** — xem và cập nhật thông tin cá nhân
- **Quên mật khẩu** — gửi OTP qua email
- **Phân quyền** — hai role: `user` và `admin`
- **Hệ thống ban** — admin có thể khóa/mở khóa tài khoản

### 3.2 Cấu trúc & thành phần

```
backend/src/auth/
├── __init__.py
├── models.py          # ORM model User
├── schemas.py         # Pydantic schemas (request/response)
├── security.py        # Hàm mã hóa: bcrypt, OTP
├── utils.py           # JWT: tạo và giải mã token
├── email_service.py   # Gửi email qua FastMail/SMTP
├── exceptions.py      # HTTP exceptions
├── dependencies.py    # FastAPI dependency: get_current_user
└── router.py          # API endpoints
```

---

#### `models.py` — User Model

```python
class User(Base):
    __tablename__ = 'users'

    username:      str   (String 100, not null)
    email:         str   (String 50, unique, not null)   ← login identifier
    password_hash: str   (String 512, not null)
    is_verified:   bool  (default=False)                 ← bắt buộc verify trước login
    role:          str   (String 20, default="user")     ← "user" | "admin"
    display_name:  str?  (String 100, nullable)
    avatar_url:    str?  (String 512, nullable)
    bio:           str?  (Text, nullable)
    is_banned:     bool  (default=False)

    # Kế thừa từ Base:
    id:         UUID     (primary key, uuid4)
    created_at: datetime (timezone-aware)
    updated_at: datetime (timezone-aware, auto-update)
```

---

#### `schemas.py` — Pydantic Schemas

| Schema | Dùng cho | Các trường |
|---|---|---|
| `UserCreate` | Đăng ký | `username`, `email`, `password` |
| `UserResponse` | Response sau login/me | Tất cả trừ `password_hash` |
| `UserUpdate` | Cập nhật profile | `username?`, `password?`, `display_name?`, `avatar_url?`, `bio?` |
| `UserPublicProfile` | Xem profile người khác | `id`, `username`, `display_name`, `avatar_url`, `bio`, `created_at` |
| `ForgetPasswordRequest` | Quên mật khẩu | `email` |
| `ResendVerificationRequest` | Gửi lại email verify | `email` |

---

#### `security.py` — Mã hóa & OTP

```python
hash_password(password: str) → str
  # bcrypt.hashpw() với auto-generated salt
  # Input: "plaintext" → Output: "$2b$12$..."

verify_pw(password: str, hashed_password: str) → bool
  # bcrypt.checkpw()
  # Xử lý backward-compat: hash cũ dạng "b'...'"

generate_reset_otp() → str
  # secrets.randbelow(1_000_000) → 6-digit string "042137"
```

---

#### `utils.py` — JWT Token Management

Sử dụng thư viện `python-jose` với thuật toán HS256:

| Hàm | Token Type | Expiry | Payload |
|---|---|---|---|
| `create_access_token(data)` | `"access"` | `ACCESS_TOKEN_EXPIRE_MINUTES` | `{sub, exp, type}` |
| `create_refresh_token(data)` | `"refresh"` | `ACCESS_TOKEN_EXPIRE_MINUTES` (¹) | `{sub, exp, type}` |
| `create_verify_token(email)` | `"verification"` | `VERIFY_TOKEN_EXPIRES` giờ | `{sub=email, exp, type}` |
| `decode_token(token)` | — | — | Trả payload dict hoặc raise `UserNotAuthenticated` |

> ¹ **Bug:** `create_refresh_token` đang dùng nhầm `ACCESS_TOKEN_EXPIRE_MINUTES` thay vì `REFRESH_TOKEN_EXPIRES`.

---

#### `email_service.py` — Email Service

```python
class EmailService:
    async def send_mail(self, message: MessageSchema):
        # Dùng FastMail (wrapper của aiosmtplib)
        # Config: SMTP host/port, STARTTLS, xác thực credentials
        # Lỗi được log nhưng không raise (silent failure)

email_service_basic = EmailService()  # Singleton
```

**Cấu hình SMTP:**
- `MAIL_STARTTLS = True`, `MAIL_SSL_TLS = False`
- `USE_CREDENTIALS = True`, `VALIDATE_CERTS = True`

---

#### `exceptions.py` — HTTP Exceptions

| Exception | HTTP Status | Message |
|---|---|---|
| `InvalidToken` | 401 Unauthorized | "Invalid Token" |
| `UserNotAuthenticated` | 401 Unauthorized | "User not authenticated." |
| `InvalidPassword` | 400 Bad Request | "Invalid Password" |
| `UserNotVerified` | 403 Forbidden | "Unverified Email. Please check your email again." |
| `UserBanned` | 403 Forbidden | "This account has been banned." |
| `InsufficientPermissions` | 403 Forbidden | "You do not have permission to perform this action." |
| `UserNotFound` | 404 Not Found | "User not found." |
| `UserEmailExist` | 409 Conflict | "User email already exist." |

---

#### `dependencies.py` — Auth Dependency

FastAPI dependency dùng cho tất cả protected endpoints:

```
get_current_user(db, cred):
  1. Kiểm tra Authorization header có scheme "Bearer"
     └─ Không có → raise UserNotAuthenticated (401)
  2. decode_token(token)
     └─ JWTError → raise UserNotAuthenticated (401)
  3. Kiểm tra payload["type"] == "access"
     └─ Không phải → raise InvalidToken (401)
  4. Lấy email từ payload["sub"]
     └─ Không có → raise InvalidToken (401)
  5. Query User WHERE email = ...
     └─ Không tìm thấy → raise UserNotFound (404)
  6. Trả về User object
```

---

### 3.3 Sơ đồ luồng

#### Luồng đăng ký & xác minh email

```
Client                    Backend                         Email
  │                          │                              │
  │── POST /auth/register ──▶│                              │
  │   {username,email,pwd}   │                              │
  │                          ├─ Check email tồn tại?        │
  │                          │  └─ Có → 409 Conflict        │
  │                          ├─ bcrypt.hash(password)       │
  │                          ├─ INSERT User (is_verified=F) │
  │                          ├─ create_verify_token(email)  │
  │◀── 200 UserResponse ─────┤  (JWT, 24h, type=verif.)     │
  │                          ├─ [background] send_mail ────▶│
  │                          │                              │
  │                          │                    ──────────┤
  │◀──────────── Email: "Click to verify" ─────────────────▶│
  │                          │                              │
  │── GET /auth/verify-email?token=... ──▶│                 │
  │                          ├─ decode_token()              │
  │                          ├─ Kiểm tra type="verification"│
  │                          ├─ UPDATE User SET is_verified=True
  │◀── 200 {message: "Email Verified Successfully"} ────────│
```

#### Luồng đăng nhập

```
Client                    Backend
  │                          │
  │── POST /auth/login ─────▶│
  │   {username=email, pwd}  │
  │   (OAuth2PasswordForm)   │
  │                          ├─ Query User by email
  │                          ├─ Không tìm thấy → 404
  │                          ├─ bcrypt.verify(pwd, hash)
  │                          ├─ Sai mật khẩu → 400
  │                          ├─ is_verified == False → 403
  │                          ├─ create_access_token({sub: email})
  │                          └─ create_refresh_token({sub: email})
  │◀── 200 {access_token, refresh_token} ───────────────────│
```

#### Luồng truy cập endpoint được bảo vệ

```
Client                    Backend
  │                          │
  │── GET /auth/me ─────────▶│
  │   Authorization: Bearer  │
  │   <access_token>         │
  │                          ├─ [dependency] get_current_user()
  │                          │   ├─ HTTPBearer → extract token
  │                          │   ├─ decode_token(token)
  │                          │   ├─ Verify type == "access"
  │                          │   └─ Query User by email
  │◀── 200 UserResponse ─────│
  │                          │
  │  (Token hết hạn)         │
  │── GET /auth/me ─────────▶│
  │                          ├─ decode_token → JWTError
  │◀── 401 Unauthorized ─────│
```

---

### 3.4 Hệ thống API

Tất cả endpoints có prefix `/auth`.

---

#### `POST /auth/register`

Đăng ký tài khoản mới. Gửi email xác minh sau khi tạo thành công.

**Request Body:**
```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "securepass123"
}
```

**Response `200 OK`:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "username": "john_doe",
  "email": "john@example.com",
  "is_verified": false,
  "role": "user",
  "display_name": null,
  "avatar_url": null,
  "bio": null,
  "created_at": "2025-01-15T10:30:00Z",
  "updated_at": "2025-01-15T10:30:00Z"
}
```

**Lỗi có thể xảy ra:**
- `409 Conflict` — Email đã tồn tại
- `400 Bad Request` — Dữ liệu không hợp lệ

---

#### `GET /auth/verify-email?token={token}`

Xác minh email thông qua token trong link gửi qua email.

**Query Parameters:**
- `token` (string, required) — JWT verification token từ email

**Response `200 OK`:**
```json
{ "message": "Email Verified Successfully" }
```
hoặc nếu đã xác minh:
```json
{ "message": "This email has already been verified" }
```

**Lỗi:**
- `401 Unauthorized` — Token không hợp lệ hoặc đã hết hạn

---

#### `POST /auth/resend-verification`

Gửi lại email xác minh.

**Request Body:**
```json
{ "email": "john@example.com" }
```

**Response `200 OK`:**
```json
{ "message": "Verification Email have been sent. Check your mail box." }
```

**Lỗi:**
- `404 Not Found` — Email không tồn tại trong hệ thống

---

#### `POST /auth/login`

Đăng nhập, nhận JWT tokens. Sử dụng format `OAuth2PasswordRequestForm` (form-data, không phải JSON).

**Request Body** (`application/x-www-form-urlencoded`):
```
username=john@example.com
password=securepass123
```

> **Lưu ý:** Field `username` chứa địa chỉ email (convention của OAuth2).

**Response `200 OK`:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Lỗi:**
- `404 Not Found` — Email không tồn tại
- `400 Bad Request` — Sai mật khẩu
- `403 Forbidden` — Tài khoản chưa xác minh email

---

#### `GET /auth/me`

Lấy thông tin tài khoản hiện tại. Yêu cầu xác thực.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response `200 OK`:** `UserResponse` (xem trên)

**Lỗi:**
- `401 Unauthorized` — Token không hợp lệ / hết hạn
- `404 Not Found` — User không tìm thấy

---

#### `PATCH /auth/me`

Cập nhật thông tin cá nhân. Tất cả trường là tùy chọn.

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**
```json
{
  "username": "new_username",
  "password": "new_password",
  "display_name": "John Doe",
  "avatar_url": "https://example.com/avatar.jpg",
  "bio": "Stock market enthusiast"
}
```

**Response `200 OK`:** User object đã cập nhật

---

#### `POST /auth/forget-password`

Gửi email chứa link reset mật khẩu.

**Request Body:**
```json
{ "email": "john@example.com" }
```

**Response `200 OK`:**
```json
{ "message": "Check your email for password reset link" }
```

**Lỗi:**
- `404 Not Found` — Email không tồn tại

> **Lưu ý:** Flow reset mật khẩu hiện tại chưa hoàn chỉnh (xem phần [Hạn chế](#6-các-hạn-chế-hiện-tại)).

---

#### `GET /auth/users/{user_id}`

Xem hồ sơ công khai của người dùng bất kỳ.

**Path Parameters:**
- `user_id` (UUID, required)

**Response `200 OK`:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "username": "john_doe",
  "display_name": "John Doe",
  "avatar_url": "https://...",
  "bio": "...",
  "created_at": "2025-01-15T10:30:00Z"
}
```

---

#### `PATCH /auth/users/{user_id}/ban`

Khóa hoặc mở khóa tài khoản người dùng (toggle). Chỉ admin.

**Headers:** `Authorization: Bearer <access_token>` (phải là admin)

**Path Parameters:**
- `user_id` (UUID, required)

**Response `200 OK`:**
```json
{
  "message": "User john_doe has been banned.",
  "is_banned": true
}
```

**Lỗi:**
- `403 Forbidden` — Không phải admin
- `404 Not Found` — User không tồn tại

---

**Bảng tóm tắt API:**

| Method | Endpoint | Auth | Mô tả |
|---|---|---|---|
| `POST` | `/auth/register` | Không | Đăng ký tài khoản |
| `GET` | `/auth/verify-email` | Không (token qua query) | Xác minh email |
| `POST` | `/auth/resend-verification` | Không | Gửi lại email xác minh |
| `POST` | `/auth/login` | Không | Đăng nhập, nhận tokens |
| `GET` | `/auth/me` | Bearer token | Xem thông tin tài khoản |
| `PATCH` | `/auth/me` | Bearer token | Cập nhật thông tin |
| `POST` | `/auth/forget-password` | Không | Yêu cầu reset mật khẩu |
| `GET` | `/auth/users/{user_id}` | Không | Xem hồ sơ công khai |
| `PATCH` | `/auth/users/{user_id}/ban` | Bearer token (admin) | Khóa/mở khóa tài khoản |

---

## 4. Tích hợp tại `main.py`

```python
# Lifecycle
@asynccontextmanager
async def lifespan(app):
    # STARTUP
    await init_redis()           # [core/redis.py]
    await create_admin_user()    # Tạo admin nếu chưa có

    yield

    # SHUTDOWN
    await close_redis()

app = FastAPI(title="MarketMind", version="1.0", lifespan=lifespan)
```

**Thứ tự middleware (từ ngoài vào trong):**

```
Request
  │
  ▼
[1] SecurityHeadersMiddleware   (custom @app.middleware)
    └─ Thêm: X-Frame-Options, X-Content-Type-Options, HSTS, ...
    └─ Cache-Control: no-store cho /api/* và /auth/*
  │
  ▼
[2] CORSMiddleware               (starlette)
    └─ Allow-Origins, Allow-Methods, Allow-Headers, Allow-Credentials
  │
  ▼
[3] RateLimiterMiddleware        (core/rate_limiter.py)
    └─ 100 req / 60s per IP, via Redis
  │
  ▼
[4] Route Handler
    └─ FastAPI routing → auth_route / news_route / ...
```

**Exception Handler toàn cục:**
```python
@app.exception_handler(RequestValidationError)
# → 400 Bad Request với message từ lỗi validation đầu tiên
```

**Health Check:**
```
GET /health → {"status": "ok", "version": "1.0"}
```

---

## 5. Bảo mật

### Các cơ chế đang hoạt động

| Cơ chế | Triển khai | Chi tiết |
|---|---|---|
| Password hashing | bcrypt | Auto-salted, cost factor mặc định (~12) |
| JWT signing | HS256 | Signed với `SECRET_KEY` từ env |
| Email verification | Bắt buộc | Không thể login trước khi verify |
| Role-based access | `role` field | `admin` / `user` |
| User banning | `is_banned` field | Admin toggle |
| Rate limiting | Per-IP, Redis | 100 req / 60s |
| Security headers | Middleware | X-Frame-Options, HSTS, CSP, ... |
| CORS | Configurable | Default `["*"]`, nên restrict khi production |
| Input validation | Pydantic | Schema validation trên mọi request |
| No-cache headers | Middleware | Áp dụng cho `/auth/*` và `/api/*` |

### Phân quyền

```
Không có token      →  Chỉ dùng được public endpoints
Bearer token (user) →  Các endpoint yêu cầu đăng nhập
Bearer token (admin)→  Thêm: ban/unban user
```

---

## 6. Các hạn chế hiện tại

| # | Vấn đề | Mô tả |
|---|---|---|
| 1 | **Bug: Refresh token expiry** | `create_refresh_token()` dùng `ACCESS_TOKEN_EXPIRE_MINUTES` thay vì `REFRESH_TOKEN_EXPIRES` — refresh token có cùng thời hạn với access token |
| 2 | **Thiếu endpoint refresh token** | `create_refresh_token()` được gọi nhưng không có endpoint `POST /auth/refresh` để dùng nó |
| 3 | **Password reset chưa hoàn chỉnh** | `generate_reset_otp()` tạo OTP nhưng OTP không được lưu vào DB, không có endpoint xác minh OTP và đổi mật khẩu |
| 4 | **Không có token invalidation** | Không có cơ chế logout hay blacklist token — token luôn hợp lệ cho đến khi hết hạn |
| 5 | **Email service silent failure** | Lỗi gửi email chỉ được log, không retry, không có fallback |
| 6 | **`is_banned` chưa được check khi login** | User bị ban vẫn có thể đăng nhập thành công (`is_banned` không được kiểm tra trong `login()`) |
