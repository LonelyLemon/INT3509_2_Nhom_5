# 2.2.3 FR-3: Giao Diện AI Chat

## Tổng quan

Nhóm chức năng FR-3 là điểm khác biệt cốt lõi của MarketMind so với các nền tảng tài chính thông thường. Hệ thống AI đa tác nhân cho phép người dùng tương tác bằng ngôn ngữ tự nhiên (tiếng Việt hoặc tiếng Anh) để nhận phân tích thị trường, tra cứu dữ liệu và tư vấn đầu tư theo thời gian thực. Phản hồi được truyền tải theo cơ chế Server-Sent Events (SSE), hiển thị từng từ ngay khi mô hình AI sinh ra, tạo trải nghiệm tương tác gần với hội thoại thực.

---

## FR-3.1: Kiến trúc hệ thống đa tác nhân

Hệ thống AI gồm năm tác nhân chuyên biệt, mỗi tác nhân có vai trò và tập công cụ riêng:

| Tác nhân | Vai trò | Tập công cụ |
|---------|---------|-------------|
| Intent Agent | Phân loại ý định người dùng, điều phối đến tác nhân phù hợp | Không có (classification only) |
| Guide Agent | Hướng dẫn sử dụng ứng dụng | Không có (knowledge-based) |
| Data Agent | Tra cứu dữ liệu giá, tin tức cơ bản | get_latest_price, get_price_history, get_news, list_assets, get_general_news |
| Analysis Agent | Phân tích kỹ thuật, quản lý portfolio/watchlist | Tất cả công cụ đọc + công cụ ghi (portfolio/watchlist) |
| Advisor Agent | Tư vấn đầu tư, đánh giá rủi ro | Tất cả công cụ đọc (không ghi) |

**Intent Agent** phân loại mỗi yêu cầu vào một trong năm nhóm ý định:

```
app_guide      → Hướng dẫn sử dụng ứng dụng
market_data    → Tra cứu dữ liệu giá đơn giản
market_analysis → Phân tích kỹ thuật, quản lý portfolio/watchlist
investment_advice → Tư vấn mua/bán, đánh giá rủi ro
general        → Chào hỏi, câu hỏi ngoài lĩnh vực
```

Intent Agent cũng trích xuất mã tài sản (ticker) được đề cập trong câu hỏi và phát hiện ngôn ngữ (vi/en) để các tác nhân phía sau phản hồi bằng ngôn ngữ phù hợp.

## FR-3.2: Hệ thống công cụ (Tool System)

Analysis Agent và Advisor Agent có quyền truy cập 21 công cụ chia thành các nhóm:

| Nhóm | Công cụ |
|------|---------|
| Giá | get_latest_price, get_price_history |
| Chỉ báo kỹ thuật | calculate_technical_indicators |
| Tin tức & Tâm lý | get_news_for_ticker, get_general_news, get_market_sentiment |
| Thị trường | list_assets, compare_assets |
| Portfolio (đọc) | get_portfolio_summary |
| Portfolio (ghi) | create_portfolio, add_holding, update_holding, remove_holding |
| Watchlist (đọc) | get_watchlist |
| Watchlist (ghi) | add_to_watchlist, remove_from_watchlist |

Khi AI gọi một công cụ, sự kiện SSE loại `tool` được gửi đến client ngay lập tức, giúp người dùng nhìn thấy hệ thống đang tìm nạp dữ liệu gì trước khi nhận câu trả lời hoàn chỉnh.

## FR-3.3: Tương tác hội thoại đa lượt

Hệ thống lưu lịch sử hội thoại vào cơ sở dữ liệu sau mỗi lượt trao đổi. Mỗi lần Intent Agent phân loại yêu cầu mới, bốn tin nhắn gần nhất trong cuộc hội thoại được cung cấp làm ngữ cảnh để phân loại chính xác hơn. Người dùng có thể:

- Tạo phiên hội thoại mới bất kỳ lúc nào
- Xem danh sách toàn bộ hội thoại đã thực hiện
- Đổi tên hoặc xoá hội thoại
- Tiếp tục bất kỳ hội thoại cũ nào

## FR-3.4: Streaming SSE và các loại sự kiện

Mỗi yêu cầu AI chat tạo ra một luồng SSE với bốn loại sự kiện:

| Sự kiện SSE | Nội dung | Thời điểm |
|------------|---------|-----------|
| `routing` | Thông tin phân loại intent và ngôn ngữ | Ngay sau phân loại |
| `token` | Đoạn văn bản nhỏ (delta) từ mô hình | Liên tục trong lúc sinh |
| `tool` | Tên công cụ được gọi và kết quả tóm tắt | Khi AI thực thi tool |
| `done` | Kết thúc luồng | Cuối phản hồi |
| `error` | Thông báo lỗi | Khi có ngoại lệ |

## FR-3.5: Quick Action Buttons

Giao diện chat hiển thị các nút hành động nhanh được thiết kế sẵn (ví dụ: "Phân tích AAPL", "Tóm tắt tin tức hôm nay"). Người dùng nhấn vào để gửi câu hỏi tương ứng mà không cần gõ.

## FR-3.6: Phản hồi và đánh giá chất lượng hội thoại

Sau khi hoàn thành một hội thoại, người dùng có thể đánh giá chất lượng (like/dislike) và tuỳ chọn viết nhận xét văn bản. Dữ liệu phản hồi được lưu lại và tổng hợp để quản trị viên theo dõi chất lượng AI.

## FR-3.7: Giới hạn tần suất và Guardrails

Mỗi người dùng được giới hạn tối đa **20 yêu cầu mỗi 60 giây** thông qua bộ đếm Redis. Khi vượt giới hạn, hệ thống trả về thông báo thân thiện. Guardrails bao gồm phát hiện và từ chối các yêu cầu chứa dấu hiệu của: prompt injection, jailbreak, SQL injection, và yêu cầu để lộ system prompt nội bộ. Tất cả kiểm tra guardrails được thực hiện trước khi yêu cầu được chuyển đến tác nhân AI.

---

> **Ngoài phạm vi triển khai:** Tính năng tải lên PDF để AI phân tích tài liệu và tính năng tạo đường dẫn chia sẻ công khai cho hội thoại không được triển khai trong phiên bản hiện tại.
