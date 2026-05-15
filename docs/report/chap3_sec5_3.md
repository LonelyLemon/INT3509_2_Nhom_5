# 3.5.3 Các Specialized Agents (Guide, Data, Analysis, Advisor)

Bốn Specialized Agent đảm nhận toàn bộ công việc trả lời thực sự sau khi Intent Agent định tuyến yêu cầu. Mỗi agent được tối ưu cho một miền cụ thể với system prompt riêng, tập công cụ riêng, và ràng buộc hành vi riêng.

---

## Guide Agent

**Phạm vi:** Trả lời câu hỏi về cách sử dụng ứng dụng và câu hỏi chung không thuộc miền tài chính.

**Cơ chế:** Guide Agent đọc file `app_guide.md` từ thư mục gốc backend khi khởi tạo và nhúng toàn bộ nội dung vào system prompt. File này chứa tài liệu hướng dẫn người dùng dạng Markdown. Agent không có công cụ nào — chỉ sử dụng kiến thức từ tài liệu được nhúng để trả lời.

**Đặc điểm quan trọng:** Agent được chỉ thị không bịa thông tin ngoài tài liệu. Khi câu hỏi liên quan đến dữ liệu thị trường, agent thông báo cho người dùng rằng các trợ lý chuyên biệt khác xử lý loại câu hỏi đó — tránh tình trạng nhầm agent trả lời sai phạm vi.

---

## Data Agent

**Phạm vi:** Tra cứu và trình bày dữ liệu thị trường thực tế — giá hiện tại, lịch sử giá, tin tức theo mã, danh sách tài sản, tin tức thị trường tổng hợp.

**Tập công cụ (5 tools):**

| Tool | Chức năng |
|------|-----------|
| `tool_get_latest_price` | Giá hiện tại, OHLC, khối lượng, thay đổi so với nến trước |
| `tool_get_price_history` | Lịch sử OHLCV theo timeframe (1m → 1d), số nến tùy chỉnh |
| `tool_get_news` | Tin tức gần đây cho một mã, kèm sentiment và thời gian đăng |
| `tool_list_assets` | Danh sách toàn bộ tài sản đang theo dõi trong hệ thống, nhóm theo loại |
| `tool_get_general_news` | Tin tức thị trường tổng hợp, lọc theo danh mục và sentiment |

**Nguyên tắc:** Agent được yêu cầu không bịa số liệu — luôn gọi tool để lấy dữ liệu thực trước khi trả lời. Khi ticker không tìm thấy, agent gợi ý dùng `tool_list_assets` để xem danh sách hỗ trợ.

---

## Analysis Agent

**Phạm vi:** Phân tích kỹ thuật chuyên sâu, so sánh đa mã, đánh giá sentiment, và **quản lý portfolio/watchlist** theo lệnh tự nhiên của người dùng.

**Tập công cụ (12 tools):**

| Nhóm | Tool | Chức năng |
|------|------|-----------|
| **Read** | `tool_get_latest_price` | Giá hiện tại |
| | `tool_get_price_history` | Lịch sử OHLCV |
| | `tool_calculate_technical_indicators` | RSI, MACD, SMA, EMA theo cài đặt của user |
| | `tool_get_news` | Tin tức theo mã |
| | `tool_compare_assets` | So sánh đồng thời nhiều tài sản: giá + chỉ báo |
| | `tool_get_portfolio_summary` | Tóm tắt portfolio với giá trị thị trường hiện tại |
| | `tool_get_watchlist` | Danh sách watchlist với giá và thay đổi |
| | `tool_get_market_sentiment` | Phân phối sentiment tin tức (bullish/bearish/neutral) |
| **Write** | `tool_create_portfolio` | Tạo portfolio mới |
| | `tool_add_holding` | Thêm hoặc tăng số lượng holding |
| | `tool_update_holding` | Cập nhật số lượng holding hiện có |
| | `tool_remove_holding` | Xóa holding khỏi portfolio |
| | `tool_add_to_watchlist` | Thêm mã vào watchlist |
| | `tool_remove_from_watchlist` | Xóa mã khỏi watchlist |

**Đặc điểm thiết kế quan trọng:** Analysis Agent là agent duy nhất có write tools. Khi người dùng nhắn "Thêm AAPL vào watchlist" hoặc "Xóa HPG khỏi portfolio", agent gọi đúng tool tương ứng và xác nhận kết quả. Nếu người dùng muốn thêm holding nhưng không nói số lượng, agent hỏi lại trước khi thực hiện. Agent không bao giờ hướng dẫn điều hướng trang — dữ liệu portfolio/watchlist phải được trả về trực tiếp trong chat.

**Cấu trúc phân tích kỹ thuật:** Khi phân tích một mã, agent tuân theo cấu trúc bốn bước: tổng quan giá → phân tích kỹ thuật (RSI, MACD, SMA, Bollinger Bands) → sentiment & tin tức → kết luận (bullish/bearish/neutral).

---

## Advisor Agent

**Phạm vi:** Tư vấn đầu tư có căn cứ dữ liệu: khuyến nghị mua/bán/giữ, đánh giá rủi ro ngắn và trung hạn, xác định vùng giá vào và stop-loss tham khảo.

**Tập công cụ (8 tools):** Giống Analysis Agent nhưng **không có write tools** (không quản lý portfolio/watchlist). Bao gồm: `tool_get_latest_price`, `tool_get_price_history`, `tool_calculate_technical_indicators`, `tool_get_news`, `tool_get_market_sentiment`, `tool_compare_assets`, `tool_get_portfolio_summary`, `tool_get_watchlist`.

**Quy trình tư vấn bắt buộc:** Khi tư vấn về một mã cụ thể, Advisor Agent phải gọi đủ bốn tool theo thứ tự: giá hiện tại → chỉ báo kỹ thuật → tin tức gần đây → sentiment thị trường. Chỉ sau khi có đủ bốn nhóm dữ liệu này, agent mới đưa ra phán đoán.

**Cấu trúc phản hồi bắt buộc:** Phản hồi gồm 5 phần theo thứ tự: (1) Tổng quan kỹ thuật, (2) Phân tích Sentiment, (3) Đánh giá rủi ro ngắn/trung hạn, (4) Outlook và điểm tham khảo, (5) Disclaimer bắt buộc — "Thông tin trên chỉ mang tính tham khảo, không phải lời khuyên đầu tư chính thức."

---

## So sánh các Specialized Agent

| Đặc điểm | Guide | Data | Analysis | Advisor |
|----------|-------|------|----------|---------|
| Số tools | 0 | 5 | 14 | 8 |
| Write tools | Không | Không | Có | Không |
| Lấy dữ liệu thực | Không | Có | Có | Có |
| Phân tích kỹ thuật | Không | Không | Có | Có |
| Tư vấn đầu tư | Không | Không | Hạn chế | Có |
| Disclaimer bắt buộc | Không | Không | Không | Có |
