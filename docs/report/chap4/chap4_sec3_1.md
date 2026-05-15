# 4.3.1 Tích Hợp Pydantic-AI và Google Gemini API

## Pydantic-AI là gì

Pydantic-AI là framework Python để xây dựng AI agent có kiểu dữ liệu chặt chẽ (type-safe). Thay vì gọi LLM API trực tiếp và tự parse response, Pydantic-AI cho phép khai báo `output_type` là một Pydantic model — framework tự động xử lý structured output, retry khi model trả về format sai, và tích hợp tool (function calling) theo chuẩn OpenAPI.

Lý do chọn Pydantic-AI thay vì LangChain hay LlamaIndex:
- **Kiểu dữ liệu chặt chẽ**: `output_type=IntentResult` đảm bảo response của Intent Agent luôn là struct có trường `intent`, `tickers`, `language` — không cần parse string thủ công.
- **Streaming native**: `agent.run_stream()` trả về async generator tương thích trực tiếp với SSE handler của FastAPI — không cần wrapper.
- **Dependency injection**: Agent nhận `deps_type=AgentDeps` chứa `db: AsyncSession` và `user_id: UUID` — tools có thể truy vấn database mà không cần global state.
- **Trọng lượng nhẹ**: Không kéo theo hàng trăm dependency như LangChain; phù hợp với ứng dụng production cần kiểm soát dependency rõ ràng.

## Kết nối Google Gemini

Tất cả agent đều dùng `gemini-2.0-flash` qua `GoogleProvider`:

```python
from pydantic_ai.models.google import GoogleModel
from pydantic_ai.providers.google import GoogleProvider
from src.core.config import settings

model = GoogleModel(
    settings.GEMINI_MODEL,   # "gemini-2.0-flash"
    provider=GoogleProvider(api_key=settings.GEMINI_API_KEY),
)
```

`settings.GEMINI_MODEL` và `settings.GEMINI_API_KEY` được đọc từ biến môi trường — không hardcode trong source code. Khi `GEMINI_API_KEY` rỗng, các hàm `get_*_agent()` raise `RuntimeError` ngay lập tức thay vì để lỗi xuất hiện lúc runtime.

`gemini-2.0-flash` được lựa chọn vì:
- Latency thấp hơn `gemini-2.0-pro` — quan trọng cho streaming chat (TTFT < 1s)
- Hỗ trợ function calling (tool use) và structured output đầy đủ
- Giới hạn token và rate limit phù hợp với quy mô dự án

## Singleton agent qua lru_cache

Mỗi agent được khởi tạo một lần và tái sử dụng cho mọi request:

```python
from functools import lru_cache

@lru_cache(maxsize=1)
def get_intent_agent() -> Agent:
    model = GoogleModel(...)
    return Agent(model=model, output_type=IntentResult, system_prompt=...)
```

`@lru_cache(maxsize=1)` đảm bảo `Agent` object chỉ được tạo một lần khi function đầu tiên được gọi. Các lần gọi sau trả về cùng object — tiết kiệm chi phí khởi tạo và giữ nguyên compiled system prompt. Đây là pattern phù hợp khi agent không có mutable state giữa các request — toàn bộ context được truyền vào qua `deps` và `message_history`.

## AgentDeps — dependency injection cho tools

```python
@dataclass
class AgentDeps:
    db: AsyncSession
    user_id: uuid.UUID
```

`AgentDeps` là "container" truyền context runtime vào tools mà không dùng global variable. Khi route handler gọi `agent.run_stream(message, deps=deps)`, Pydantic-AI inject `deps` vào `RunContext` và truyền vào từng tool call:

```python
@agent.tool
async def tool_get_portfolio_summary(ctx: RunContext[AgentDeps]) -> dict:
    return await get_portfolio_summary(ctx.deps.db, ctx.deps.user_id)
```

Tool biết DB session nào đang dùng và user nào đang hỏi — không cần global state, không cần thread-local. Thiết kế này an toàn trong môi trường async nơi nhiều request xử lý đồng thời.
