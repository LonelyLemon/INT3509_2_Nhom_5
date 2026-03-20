from pydantic import (EmailStr, PostgresDsn, 
                      computed_field)
from pydantic_core import MultiHostUrl
from pydantic_settings import BaseSettings, SettingsConfigDict

class CustomBaseSettings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

class Settings(CustomBaseSettings):
    # Database
    DATABASE_POOL_SIZE: int = 16
    DATABASE_POOL_TTL: int = 60 * 20  # 20 minutes
    DATABASE_POOL_PRE_PING: bool = True
    
    CORS_ORIGINS: list[str] = ["*"]
    CORS_ORIGINS_REGEX: str | None = None
    CORS_HEADERS: list[str] = ["*"]
    FRONTEND_URL: str = "http://localhost:5173"
    
    POSTGRES_USER: str
    POSTGRES_DB: str
    POSTGRES_PASSWORD: str
    POSTGRES_PORT: int
    POSTGRES_HOST: str
    SQLALCHEMY_DATABASE_URL: str

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # Rate Limiting
    RATE_LIMIT_REQUESTS: int = 100  # max requests per window
    RATE_LIMIT_WINDOW: int = 60    # window size in seconds

    # Authentication
    SECRET_KEY: str
    SECURITY_ALGORITHM: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int
    REFRESH_TOKEN_EXPIRES: int
    VERIFY_TOKEN_EXPIRES: int

    # Email Service
    MAIL_USER: str
    MAIL_PASSWORD: str
    MAIL_FROM: EmailStr
    MAIL_PORT: str
    MAIL_HOST: str
    MAIL_FROM_NAME: str

    # AI / LLM
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"

    # Massive API Key
    MASSIVE_API_KEY: str

    # Alpha Vantage API Key
    ALPHA_VANTAGE_API_KEY: str

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