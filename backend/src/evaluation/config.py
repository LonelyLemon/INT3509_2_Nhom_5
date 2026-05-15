from pydantic_settings import BaseSettings, SettingsConfigDict


class EvaluationSettings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    # Admin credentials reused for evaluation login (can be overridden)
    ADMIN_EMAIL: str = ""
    ADMIN_PASSWORD: str = ""

    EVAL_BASE_URL: str = "http://localhost:8000"
    EVAL_USER_EMAIL: str = ""
    EVAL_USER_PASSWORD: str = ""

    GSHEETS_CREDENTIALS_FILE: str = "service_account.json"
    GSHEETS_SPREADSHEET_ID: str = "1fcv7nlgyuy98daxvrJ2ih07qIhI7eh_h"
    GSHEETS_WORKSHEET_NAME: str = "Sheet1"

    DEEPEVAL_JUDGE_MODEL: str = "gpt-4o-mini"
    OPENAI_API_KEY: str = ""

    EVAL_COST_LOG_FILE: str = "evaluation_costs.jsonl"

    @property
    def eval_email(self) -> str:
        return self.EVAL_USER_EMAIL or self.ADMIN_EMAIL

    @property
    def eval_password(self) -> str:
        return self.EVAL_USER_PASSWORD or self.ADMIN_PASSWORD


eval_settings = EvaluationSettings()
