# 4.7.3 Quản Lý Biến Môi Trường và Bí Mật

## Pydantic BaseSettings — validation từ .env

Backend dùng `pydantic-settings` để load và validate biến môi trường:

```python
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(CustomBaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"  # Bỏ qua biến không khai báo trong Settings
    )
    
    # Database
    POSTGRES_USER: str
    POSTGRES_DB: str
    POSTGRES_PASSWORD: str
    POSTGRES_PORT: int
    POSTGRES_HOST: str
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"  # Có default
    
    # Authentication
    SECRET_KEY: str          # Bắt buộc — không có default
    SECURITY_ALGORITHM: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int
    REFRESH_TOKEN_EXPIRES: int
    
    # AI
    GEMINI_API_KEY: str = ""  # Optional — empty string = AI disabled
    GEMINI_MODEL: str = "gemini-2.0-flash"
    
    # Admin
    ADMIN_EMAIL: str
    ADMIN_PASSWORD: str
    
    @computed_field
    @property
    def ASYNC_DATABASE_URI(self) -> PostgresDsn:
        return MultiHostUrl.build(
            scheme="postgresql+asyncpg",
            username=self.POSTGRES_USER,
            password=self.POSTGRES_PASSWORD,
            host=self.POSTGRES_HOST,
            port=self.POSTGRES_PORT,
            path=self.POSTGRES_DB,
        )

settings = Settings()
```

Khi `Settings()` được khởi tạo lúc import, Pydantic đọc file `.env` và validate ngay lập tức. Nếu biến bắt buộc thiếu (ví dụ `SECRET_KEY`), server fail fast với error rõ ràng thay vì crash khi runtime.

`ASYNC_DATABASE_URI` là `@computed_field` — tự động tổng hợp từ các biến riêng lẻ, đảm bảo URL luôn consistent và không cần khai báo URL đầy đủ trong `.env`.

## Phân loại biến môi trường

| Nhóm | Biến | Bắt buộc | Default |
|------|------|---------|---------|
| Database | POSTGRES_* | Có | — |
| Redis | REDIS_URL | Không | `redis://localhost:6379/0` |
| Auth | SECRET_KEY, *_EXPIRE* | Có | — |
| Email | MAIL_* | Có | — |
| AI | GEMINI_API_KEY | Không | `""` (disabled) |
| Admin | ADMIN_EMAIL, ADMIN_PASSWORD | Có | — |
| CORS | CORS_ORIGINS | Không | `["*"]` |
| Rate limit | RATE_LIMIT_REQUESTS, RATE_LIMIT_WINDOW | Không | 100, 60 |

Biến có giá trị mặc định an toàn cho development không cần khai báo trong `.env`. Biến không có default là bắt buộc — server không start nếu thiếu.

## .env.example — template công khai

Repository chứa file `.env.example` với tất cả key cần thiết và giá trị placeholder:

```bash
# .env.example
POSTGRES_USER=marketmind
POSTGRES_DB=marketminddb
POSTGRES_PASSWORD=your_secure_password_here
POSTGRES_PORT=5432
POSTGRES_HOST=db

REDIS_URL=redis://redis:6379/0

SECRET_KEY=generate_a_secure_random_key_here
SECURITY_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRES=86400
VERIFY_TOKEN_EXPIRES=86400

GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.0-flash

ADMIN_EMAIL=admin@marketmind.com
ADMIN_PASSWORD=secure_admin_password
```

`.env.example` được commit vào repository. `.env` thực sự được thêm vào `.gitignore` — không bao giờ commit secret.

## Secret generation

`SECRET_KEY` dùng để sign JWT — cần entropy đủ cao:

```bash
# Generate bằng openssl (khuyên dùng)
openssl rand -hex 32

# Hoặc bằng Python
python -c "import secrets; print(secrets.token_hex(32))"
```

## Inject vào Docker container

Docker Compose inject `.env` qua `env_file`:

```yaml
services:
  api:
    env_file:
      - .env
```

Tất cả biến trong `.env` trở thành environment variable trong container — Pydantic Settings đọc từ environment variable, không trực tiếp từ file khi chạy trong container. Thứ tự ưu tiên của Pydantic Settings: environment variable > `.env` file — cho phép override từng biến trong CI/CD mà không cần sửa file.

## Frontend — VITE_* prefix

Vite chỉ expose biến có prefix `VITE_` ra client bundle:

```bash
# .env (frontend)
VITE_API_URL=http://localhost:8000
```

```typescript
const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
```

Biến không có `VITE_` prefix sẽ không được bundle vào JavaScript — ngăn vô tình leak secret vào frontend. `VITE_API_URL` không phải secret (chỉ là URL backend) nên an toàn expose ra client.
