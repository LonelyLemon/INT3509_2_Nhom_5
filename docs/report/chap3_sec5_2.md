# 3.5.2 Intent Agent và Cơ Chế Phân Loại Yêu Cầu

Intent Agent là cổng phân loại đầu vào của toàn hệ thống AI. Nó nhận tin nhắn thô từ người dùng và trả về một đối tượng có cấu trúc xác định đích đến xử lý — không sinh văn bản tự do. Thiết kế này tách biệt hoàn toàn logic định tuyến khỏi logic trả lời, giúp hệ thống dễ mở rộng và kiểm soát.

## Kiểu đầu ra có cấu trúc

Intent Agent được khai báo với `output_type=IntentResult` — một Pydantic model với các ràng buộc kiểu chặt chẽ:

```python
class IntentResult(BaseModel):
    intent: Literal["app_guide", "market_data", "market_analysis",
                    "investment_advice", "general"]
    tickers: list[str]
    language: Literal["vi", "en"]
```

Pydantic-AI đảm bảo Gemini **luôn** trả về đúng cấu trúc này — không bao giờ sinh văn bản tự do. Nếu model trả về sai định dạng, Pydantic-AI sẽ yêu cầu model thử lại tự động cho đến khi hợp lệ.

## Năm loại intent và quy tắc phân loại

| Intent | Mô tả | Agent xử lý |
|--------|-------|-------------|
| `app_guide` | Hỏi cách dùng ứng dụng, tính năng, điều hướng | Guide Agent |
| `market_data` | Tra cứu giá, lịch sử, tin tức đơn giản cho một mã | Data Agent |
| `market_analysis` | Phân tích kỹ thuật, so sánh, xu hướng; quản lý portfolio/watchlist | Analysis Agent |
| `investment_advice` | Tư vấn mua/bán/giữ, đánh giá rủi ro, khuyến nghị đầu tư | Advisor Agent |
| `general` | Chào hỏi, không rõ chủ đề, ngoài phạm vi | Guide Agent |

### Các quyết định phân loại quan trọng

**Portfolio/Watchlist queries → `market_analysis`:** Bất kỳ câu hỏi nào về nội dung danh mục ("Portfolio của tôi gồm gì?", "Tôi đang theo dõi mã nào?") và các thao tác write ("Thêm AAPL vào watchlist", "Xóa HPG khỏi portfolio") đều được phân loại là `market_analysis`, không phải `app_guide`. Đây là quyết định thiết kế quan trọng: người dùng hỏi về *dữ liệu* của họ, không phải về cách *dùng* ứng dụng.

**Tư vấn ≠ Quản lý:** Intent `investment_advice` chỉ áp dụng khi người dùng hỏi nên mua/bán/giữ, đánh giá rủi ro — không phải khi họ muốn thực hiện thao tác thêm/sửa/xóa holdings (đó là `market_analysis`).

**Tin nhắn follow-up ngắn:** Khi người dùng trả lời "Xác nhận", "100 cổ", "OK thêm vào", intent agent nhận thêm 4 tin nhắn lịch sử gần nhất để phân loại đúng ngữ cảnh — ví dụ, "Xác nhận" trong luồng thêm holding sẽ được phân loại là `market_analysis` thay vì `general`.

## Trích xuất ticker

Cùng với phân loại intent, agent tự động trích xuất các ticker symbol được đề cập trong tin nhắn (dạng chữ hoa: VNM, BTC, AAPL) và trả về trong trường `tickers`. Thông tin này được gửi về frontend qua SSE event `routing` để hiển thị context (ví dụ: "Đang phân tích VNM, SSI...") — giúp người dùng biết system đã hiểu đúng yêu cầu.

## Nhận diện ngôn ngữ

Trường `language` giúp Specialized Agent biết ngôn ngữ nào người dùng đang dùng. Mặc dù các Specialized Agent đều có hướng dẫn tự nhận diện ngôn ngữ trong system prompt, việc truyền giá trị này từ Intent Agent tạo thêm một lớp kiểm soát — đặc biệt hữu ích khi tin nhắn quá ngắn để nhận diện tự động.
