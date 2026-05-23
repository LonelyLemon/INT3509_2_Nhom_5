# 4.3.4 SSE Streaming và Quản Lý Luồng Phản Hồi Bất Đồng Bộ

## Tại sao SSE thay vì WebSocket

Server-Sent Events (SSE) là giao thức HTTP một chiều — server đẩy dữ liệu xuống client liên tục qua một kết nối HTTP/1.1 mở. So với WebSocket, SSE đơn giản hơn đáng kể:
- Không cần upgrade protocol — chỉ cần `Content-Type: text/event-stream`
- Tự động reconnect phía client (trình duyệt tích hợp sẵn)
- Tương thích với proxy/load balancer HTTP chuẩn hơn

Cho use case AI chat một chiều (server gửi token về client), SSE là lựa chọn phù hợp và đủ.

## Cấu trúc SSE event

Mỗi SSE event có định dạng:
```
event: <type>\n
data: <json>\n
\n
```

Hệ thống phát bốn loại event trong một phiên chat:

| Event | Payload | Thời điểm |
|-------|---------|-----------|
| `routing` | `{intent, agent_name, tickers}` | Ngay sau khi phân loại intent |
| `token` | `{text: "<delta>"}` | Mỗi token từ Gemini |
| `tool` | `{name: "<tool_name>"}` | Khi agent gọi một tool (thông báo minh bạch) |
| `done` | `{conversation_id, tools_used, agent}` | Sau khi lưu DB xong |
| `error` | `{detail: "<message>"}` | Khi xảy ra lỗi bất kỳ |

## Triển khai FastAPI StreamingResponse

```python
@ai_route.post("/chat")
async def chat(payload: ChatRequest, db: SessionDep, ...):
    check_input_policy(payload.message)
    await _check_ai_rate_limit(current_user.id)
    ...
    
    async def event_stream():
        full_response = ""
        
        # Phase 1: Intent classification (không streaming)
        intent_result = await get_intent_agent().run(payload.message, ...)
        yield _sse("routing", {...})
        
        # Phase 2: Specialized agent streaming
        target_agent = _select_agent(intent_result.output.intent)
        async with target_agent.run_stream(payload.message, deps=deps, ...) as result:
            async for delta in result.stream_text(delta=True):
                full_response += delta
                yield _sse("token", {"text": delta})
        
        # Persist sau khi stream xong
        db.add(Message(role="user", content=payload.message, ...))
        db.add(Message(role="assistant", content=full_response, ...))
        await db.commit()
        
        yield _sse("done", {...})
    
    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
```

`StreamingResponse` nhận async generator, lấy từng chunk và gửi về client ngay lập tức — FastAPI không buffer toàn bộ response trước khi gửi. Header `X-Accel-Buffering: no` ngăn nginx (nếu có) buffer SSE stream.

## Quản lý lỗi trong stream

Lỗi phát sinh trong `event_stream()` được bắt và emit về client dưới dạng event `error` thay vì exception:

```python
async def event_stream():
    try:
        ...
    except AIRateLimitExceeded as e:
        await db.rollback()
        yield _sse("error", {"detail": e.detail})
    except pai_exceptions.AgentRunError as e:
        await db.rollback()
        yield _sse("error", {"detail": "AI service error. Please try again."})
    except Exception as e:
        await db.rollback()
        logger.exception(...)
        yield _sse("error", {"detail": "An unexpected error occurred."})
```

Thiết kế này đảm bảo client luôn nhận được kết thúc rõ ràng (hoặc `done` hoặc `error`) — tránh trường hợp kết nối bị treo. `db.rollback()` được gọi trong mọi exception path để không để lại transaction dở dang.

## Tích lũy response và persist

`full_response` tích lũy toàn bộ token trong memory suốt quá trình stream. Chỉ sau khi stream kết thúc mới ghi vào DB — đảm bảo message được lưu trọn vẹn, không bị cắt giữa chừng. Nếu stream bị ngắt (client ngắt kết nối), `event_stream()` raise `GeneratorExit` và FastAPI dọn dẹp — DB không bị ghi partial response.

## Message history cho multi-turn

Lịch sử hội thoại được load từ DB và truyền vào agent:

```python
message_history = _build_message_history(list(prior_messages))

async with target_agent.run_stream(
    payload.message,
    deps=deps,
    message_history=message_history,
) as result:
    ...
```

```python
def _build_message_history(messages: list[Message]) -> list:
    history = []
    for msg in messages:
        if msg.role == "user":
            history.append(ModelRequest(parts=[UserPromptPart(content=msg.content)]))
        elif msg.role == "assistant":
            history.append(ModelResponse(parts=[TextPart(content=msg.content)]))
    return history
```

Pydantic-AI nhận `message_history` dưới dạng `list[ModelRequest | ModelResponse]` — chuẩn nội bộ của framework. Hàm `_build_message_history` chuyển đổi từ DB model sang format này. Toàn bộ lịch sử được truyền vào model để duy trì ngữ cảnh hội thoại qua nhiều lượt.
