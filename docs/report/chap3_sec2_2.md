# 3.2.2 Backend: Python 3.13, FastAPI, SQLAlchemy, Pydantic-AI

## Python 3.13

Python 3.13 là phiên bản mới nhất stable tại thời điểm phát triển dự án, mang lại cải thiện hiệu năng interpreter đáng kể (~5–10%) so với 3.11 nhờ các tối ưu trong CPython. Quan trọng hơn, Python là ngôn ngữ tự nhiên nhất cho domain AI/ML — toàn bộ hệ sinh thái AI (Pydantic-AI, LangChain, transformers) đều Python-native. Việc dùng cùng một ngôn ngữ cho cả business logic API và AI agent loại bỏ overhead chuyển ngữ giữa các tầng.

## FastAPI

FastAPI được chọn thay vì Django REST Framework (DRF) và Flask vì ba đặc điểm:

**Async-native:** FastAPI xây dựng trên Starlette — async ngay từ nền tảng, không phải thêm vào sau như DRF. Handler function có thể `await` trực tiếp mà không cần thread pool workaround.

**Tích hợp Pydantic:** FastAPI và Pydantic-AI dùng chung Pydantic v2 làm nền tảng — request validation, response serialization, và agent schema đều dùng cùng một type system. Dữ liệu không cần chuyển đổi giữa tầng API và tầng AI.

**SSE support tích hợp:** `StreamingResponse` của FastAPI trả về `text/event-stream` trực tiếp không cần thư viện thêm — quan trọng cho luồng AI chat streaming.

So sánh với các lựa chọn thay thế:

| Tiêu chí | Flask | Django REST | FastAPI |
|---------|-------|-------------|---------|
| Async native | Không | Một phần | Có |
| Auto validation | Không | Serializer thủ công | Pydantic tự động |
| OpenAPI docs | Thủ công | Thủ công | Tự sinh từ type hint |
| SSE streaming | Cần extension | Cần extension | Tích hợp sẵn |
| Phù hợp Pydantic-AI | Thấp | Thấp | Cao |

## SQLAlchemy 2 + asyncpg

SQLAlchemy 2.0 với `AsyncSession` cho phép toàn bộ I/O đến PostgreSQL là non-blocking — query, insert, update đều `await`-able trong FastAPI async handler mà không chặn event loop. Connection pool của asyncpg tái sử dụng kết nối đã thiết lập (pool size 16, TTL 20 phút), tránh chi phí TCP handshake + PostgreSQL authentication cho mỗi request.

Quyết định dùng SQLAlchemy ORM thay vì raw SQL có lý do cụ thể: Alembic migration (quản lý schema) tích hợp tự nhiên với SQLAlchemy model — thay đổi Python model → tự sinh migration script, không cần viết SQL DDL thủ công.

Trường hợp đặc biệt: Celery Worker không dùng `AsyncSession` mà dùng `NullPool` — chi tiết được trình bày trong mục 4.6.1.

## Pydantic-AI + Google Gemini 2.0-flash

**Pydantic-AI** là framework orchestration agent được chọn thay vì LangChain vì:
- API Python-native, không có YAML/DSL riêng — agent, tool, system prompt đều định nghĩa bằng Python decorator
- Tích hợp sâu với Pydantic v2 — tool parameter và response đều typed và validated tự động
- Hỗ trợ đổi provider (Gemini, OpenAI, Anthropic) chỉ bằng thay đổi config, không sửa agent logic
- `agent.run_stream()` trả về async generator — pipe trực tiếp vào SSE response của FastAPI

**Google Gemini 2.0-flash** được chọn làm LLM backend thay vì GPT-4o vì:

| Tiêu chí | GPT-4o | Gemini 2.0-flash |
|---------|--------|------------------|
| Tốc độ sinh token | Trung bình | Nhanh hơn đáng kể |
| Chi phí | Cao | Thấp hơn đáng kể |
| Context window | 128K token | 1M token |
| Chất lượng | Rất cao | Đủ tốt cho domain tài chính phổ thông |
| Tool use (function calling) | Có | Có |

Gemini 2.0-flash cân bằng tốt giữa tốc độ, chi phí và chất lượng cho use case trợ lý tài chính phổ thông — không đòi hỏi reasoning cực sâu như GPT-4o nhưng vẫn đủ năng lực phân tích xu hướng giá và trả lời câu hỏi tài chính cơ bản.

## Celery 5

Celery được chọn thay vì APScheduler vì tách biệt hoàn toàn tiến trình worker khỏi FastAPI. APScheduler chạy trong cùng tiến trình với FastAPI — nếu task nặng block event loop, API bị ảnh hưởng. Celery chạy trong tiến trình riêng: FastAPI chỉ enqueue task vào Redis broker rồi trả lời client ngay; worker thực thi bất đồng bộ ở phía sau.

Cấu hình production: `--concurrency=4` — 4 worker process song song xử lý task độc lập. Khi lượng tài sản cần theo dõi tăng, tăng concurrency hoặc thêm worker instance mà không thay đổi code.

**Celery Beat** (scheduler) được tách ra container riêng với Celery Worker — đảm bảo lịch lập lịch không bị gián đoạn kể cả khi Worker container bị restart. Beat ghi task vào Redis; Worker kéo ra và thực thi — Redis là điểm kết nối duy nhất giữa hai.
