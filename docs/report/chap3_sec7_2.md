# 3.7.2 Luồng AI Chat (SSE Streaming + Tool Execution)

Luồng AI chat là nghiệp vụ phức tạp nhất trong MarketMind, kết hợp bốn thành phần: guardrails, Intent Agent, Specialized Agent với tool calls, và SSE streaming. Toàn bộ diễn ra trong một HTTP request duy nhất mở kết nối SSE.

## Tổng quan sơ đồ tuần tự

```mermaid
sequenceDiagram
    participant U as Người dùng
    participant FE as Frontend
    participant API as FastAPI
    participant GUARD as Guardrails
    participant REDIS as Redis
    participant INTENT as Intent Agent
    participant AGENT as Specialized Agent
    participant DB as PostgreSQL

    U->>FE: Nhập tin nhắn
    FE->>API: POST /ai/chat {message, conversation_id?}
    Note over API: Mở SSE stream

    API->>GUARD: check_input_policy(message)
    GUARD-->>API: OK (hoặc raise PolicyViolation)

    API->>REDIS: INCR ai_rate:{user_id}
    REDIS-->>API: count ≤ 20 (OK)

    API->>DB: Resolve/tạo Conversation
    API->>DB: Load message history

    rect rgb(240, 248, 255)
        Note over API,INTENT: Pha 1 - Phân loại (không stream)
        API->>INTENT: run(message, history[-4:])
        INTENT->>INTENT: Gemini classify
        INTENT-->>API: IntentResult{intent, tickers, language}
        API-->>FE: SSE event: routing{intent, agent_name, tickers}
    end

    rect rgb(240, 255, 240)
        Note over API,AGENT: Pha 2 - Xử lý & Streaming
        API->>AGENT: run_stream(message, deps, full_history)

        loop Tool calls (0..N lần)
            AGENT->>DB: tool_xxx(ctx.deps)
            DB-->>AGENT: data dict
            API-->>FE: SSE event: tool{name}
        end

        loop Text generation
            AGENT-->>API: delta text
            API-->>FE: SSE event: token{text}
        end
    end

    API->>DB: INSERT messages (user + assistant)
    API->>DB: COMMIT
    API-->>FE: SSE event: done{conversation_id, tools_used, agent}
    Note over FE,API: SSE stream đóng
```

## Chi tiết từng SSE event

| Event | Thời điểm | Payload |
|-------|-----------|---------|
| `routing` | Sau Intent Agent | `{intent, agent_name, tickers}` |
| `tool` | Mỗi khi agent gọi tool | `{name: "tool_get_latest_price"}` |
| `token` | Mỗi delta text từ Gemini | `{text: "..."}` |
| `done` | Sau khi stream kết thúc | `{conversation_id, tools_used, agent}` |
| `error` | Khi có lỗi bất kỳ | `{detail: "..."}` |

**Event `routing`** được gửi trước khi Specialized Agent bắt đầu, cho phép frontend hiển thị tên agent (ví dụ "Trợ lý Phân tích thị trường") và danh sách ticker được nhận diện ngay khi người dùng vừa gửi tin — trải nghiệm phản hồi tức thì dù Specialized Agent chưa sinh ra từ nào.

## Quản lý conversation và lịch sử

Mỗi chat session tương ứng với một `Conversation` record. Luồng xử lý:

- **Conversation mới (`conversation_id` = None):** Tạo Conversation mới với `title` = 60 ký tự đầu tin nhắn. `db.flush()` (không commit) để có ID ngay cho việc insert messages sau.
- **Conversation hiện có:** Load toàn bộ messages theo thứ tự `created_at`, convert sang `ModelMessage` list.

Lịch sử messages được chuyển thành định dạng Pydantic-AI:
- `role=user` → `ModelRequest(parts=[UserPromptPart(content=...)])`
- `role=assistant` → `ModelResponse(parts=[TextPart(content=...)])`

Intent Agent nhận **4 messages cuối** (2 cặp hỏi-đáp gần nhất) để phân loại follow-up messages chính xác. Specialized Agent nhận **toàn bộ lịch sử** để duy trì mạch hội thoại.

## Lưu trữ sau streaming

Sau khi stream kết thúc, cả hai messages (user và assistant) được persist:

```python
db.add(Message(conversation_id=..., role="user", content=payload.message))
db.add(Message(conversation_id=..., role="assistant", content=full_response))
await db.commit()
```

`full_response` được xây dựng bằng cách cộng dồn từng `delta` trong suốt quá trình streaming. Nếu có lỗi trong quá trình stream, `db.rollback()` được gọi — messages lỗi không được persist.

## Xử lý lỗi trong SSE stream

Vì SSE stream đã được mở, lỗi không thể trả về qua HTTP status code. Thay vào đó, mỗi loại lỗi được bắt và gửi về event `error`:

| Exception | Xử lý |
|-----------|-------|
| `AIRateLimitExceeded` | Rollback + SSE error với detail |
| `RuntimeError` | Rollback + log + SSE error |
| `pydantic_ai.UserError` | Rollback + log cấu hình sai + SSE error |
| `pydantic_ai.AgentRunError` | Rollback + log + SSE error chung |
| `Exception` (catch-all) | Rollback + log full stack trace + SSE error |

Sau khi gửi event `error`, generator function kết thúc và SSE connection đóng bình thường.
