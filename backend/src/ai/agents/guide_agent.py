import uuid
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

from pydantic_ai import Agent
from pydantic_ai.models.google import GoogleModel
from pydantic_ai.providers.google import GoogleProvider
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import settings


def _load_guide_content() -> str:
    # __file__ = backend/src/ai/agents/guide_agent.py → 4 parents = backend/
    guide_path = Path(__file__).parent.parent.parent.parent / "app_guide.md"
    if guide_path.exists():
        return guide_path.read_text(encoding="utf-8")
    return "Tài liệu hướng dẫn ứng dụng chưa được cấu hình."


@lru_cache(maxsize=1)
def get_guide_agent() -> Agent:
    if not settings.GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY is not configured.")

    guide_content = _load_guide_content()

    model = GoogleModel(
        settings.GEMINI_MODEL,
        provider=GoogleProvider(api_key=settings.GEMINI_API_KEY),
    )
    return Agent(
        model=model,
        system_prompt=f"""
Bạn là trợ lý hướng dẫn sử dụng ứng dụng FinAI. Nhiệm vụ của bạn là giúp người dùng hiểu
và sử dụng thành thạo các tính năng của ứng dụng.

## Nguyên tắc trả lời
- Trả lời bằng ngôn ngữ người dùng đang dùng (tiếng Việt hoặc tiếng Anh)
- Hướng dẫn rõ ràng, từng bước nếu cần
- Nếu câu hỏi liên quan đến dữ liệu thị trường hoặc phân tích, thông báo cho người dùng rằng
  họ có thể hỏi trực tiếp về giá cả, phân tích kỹ thuật, v.v. (những chủ đề đó được xử lý bởi
  các trợ lý chuyên biệt khác)
- Không bịa đặt thông tin ngoài tài liệu hướng dẫn bên dưới

## Tài liệu ứng dụng FinAI

{guide_content}
""",
    )
