# 4.3.2 Cơ Chế Routing Qua Intent Agent

## Kiến trúc two-phase pipeline

Mỗi chat request đi qua hai giai đoạn nối tiếp nhau trong `event_stream()`:

```
Phase 1: Intent Classification  (~0.5–1s, không streaming)
Phase 2: Specialized Agent Run  (streaming, phát token ngay khi có)
```

Tách thành hai phase giải quyết vấn đề cốt lõi: không thể vừa phân loại intent vừa stream response vì cần biết intent trước để chọn agent đúng.

## Intent Agent — structured output

Intent Agent dùng `output_type=IntentResult` — Pydantic-AI đảm bảo response luôn có cấu trúc:

```python
class IntentResult(BaseModel):
    intent: Literal["app_guide", "market_data", "market_analysis",
                    "investment_advice", "general"]
    tickers: list[str]
    language: Literal["vi", "en"]
```

Khi model trả về JSON không hợp lệ, Pydantic-AI tự retry (mặc định 1 lần) với error message để model tự sửa. Điều này loại bỏ hoàn toàn code parse/validate thủ công.

## Năm loại intent và quy tắc phân loại

| Intent | Agent được chọn | Ví dụ query |
|--------|----------------|-------------|
| `app_guide` | Guide Agent | "Cách thêm vào watchlist?", "App có tính năng gì?" |
| `market_data` | Data Agent | "Giá BTC hiện tại", "Lịch sử giá VNM" |
| `market_analysis` | Analysis Agent | "Phân tích kỹ thuật AAPL", "Portfolio của tôi gồm gì?" |
| `investment_advice` | Advisor Agent | "Có nên mua VNM không?", "Tư vấn đầu tư ETH" |
| `general` | Guide Agent | "Xin chào", "Bạn là ai?" |

Quy tắc quan trọng được nhấn mạnh trong system prompt: thao tác thêm/sửa/xóa portfolio và watchlist **luôn** phân loại là `market_analysis` (không phải `app_guide`), vì những thao tác này cần Analysis Agent có công cụ write. Query hỏi "Portfolio của tôi gồm gì?" cũng là `market_analysis` — không phải `app_guide` — vì cần truy vấn dữ liệu thực của user.

## Context-aware classification cho follow-up

Intent Agent nhận lịch sử hội thoại gần nhất (4 tin nhắn cuối) để phân loại đúng các câu ngắn mơ hồ:

```python
classification_history = message_history[-4:] if message_history else None
intent_result = await get_intent_agent().run(
    payload.message,
    message_history=classification_history,
)
```

Câu "Xác nhận" hay "100 cổ" đứng một mình không có ngữ cảnh → Intent Agent không thể phân loại đúng. Nhưng khi có 4 tin nhắn trước (ví dụ agent đang hỏi "Bạn muốn thêm bao nhiêu cổ VNM?"), "100 cổ" được phân loại là `market_analysis` với tickers `["VNM"]`.

## Routing logic

```python
def _select_agent(intent: str):
    if intent == "market_analysis":
        return get_analysis_agent()
    if intent == "market_data":
        return get_data_agent()
    if intent == "investment_advice":
        return get_advisor_agent()
    return get_guide_agent()  # app_guide và general
```

`app_guide` và `general` đều dùng Guide Agent — hợp lý vì Guide Agent được thiết kế để trả lời câu hỏi chung về ứng dụng và xử lý gracefully khi không rõ ý định người dùng.

## SSE event `routing`

Ngay sau khi phân loại intent, server emit event `routing` về client trước khi bắt đầu stream response:

```python
yield _sse("routing", {
    "intent": intent.intent,
    "agent_name": _AGENT_LABELS.get(intent.intent, "Trợ lý AI"),
    "tickers": intent.tickers,
})
```

Client dùng thông tin này để hiển thị label agent đang xử lý (ví dụ "Trợ lý Phân tích thị trường") và danh sách tickers được nhận diện, tạo trải nghiệm minh bạch cho người dùng biết câu hỏi của họ được xử lý bởi agent nào.
