# 2.2.9 FR-9: Xử Lý Lỗi và Dự Phòng

## Tổng quan

Nhóm chức năng FR-9 mô tả cách hệ thống phản ứng khi xảy ra sự cố từ phía nguồn dữ liệu bên ngoài, dịch vụ AI, hoặc lỗi đầu vào từ phía người dùng. Mục tiêu là duy trì trải nghiệm người dùng ổn định và cung cấp phản hồi lỗi rõ ràng, có hành động gợi ý.

---

## FR-9.1: Dự phòng khi nguồn dữ liệu không khả dụng

Khi yfinance hoặc các API bên ngoài không phản hồi trong quá trình thu thập dữ liệu giá, Celery task sẽ tự động thử lại theo chiến lược **exponential backoff** (lần 1 sau 2 giây, lần 2 sau 4 giây, lần 3 sau 8 giây). Trong thời gian này, các yêu cầu xem biểu đồ của người dùng vẫn được phục vụ từ cache Redis nếu có. Cache price data có TTL được thiết lập tương ứng với độ tươi mới của từng khung thời gian:

| Khung thời gian | TTL Cache Redis |
|----------------|----------------|
| 1m | 45 giây |
| 5m | 5 phút |
| 15m | 15 phút |
| 30m | 30 phút |
| 1h | 1 giờ |
| 4h | 4 giờ |
| 1d | 23 giờ |

## FR-9.2: Xử lý lỗi dịch vụ AI

Khi Gemini API không khả dụng hoặc xảy ra ngoại lệ trong quá trình sinh phản hồi, hệ thống phát sự kiện SSE loại `error` với thông báo mô tả lỗi. Luồng SSE được đóng lại ngay lập tức. Phiên cơ sở dữ liệu bị rollback để đảm bảo không lưu tin nhắn không hoàn chỉnh. Giao diện người dùng hiển thị thông báo lỗi và cho phép gửi lại yêu cầu.

## FR-9.3: Kiểm tra và phản hồi đầu vào không hợp lệ

Tất cả dữ liệu đầu vào từ người dùng đều được kiểm tra bởi Pydantic trước khi xử lý. Khi dữ liệu không hợp lệ, API trả về HTTP 422 Unprocessable Entity với danh sách lỗi cụ thể theo từng trường (field-level errors). Các trường hợp được kiểm tra bao gồm:

- Định dạng email không hợp lệ
- Mật khẩu không đạt yêu cầu độ phức tạp
- Mã tài sản không tồn tại trong hệ thống
- Định dạng hoặc kích thước file avatar không hợp lệ
- Số lượng tài sản nắm giữ không hợp lệ (âm hoặc bằng 0)

## FR-9.4: Trang lỗi HTTP

Hệ thống trả về response lỗi có cấu trúc JSON cho các tình huống:

| HTTP Status | Tình huống |
|------------|-----------|
| 400 Bad Request | Dữ liệu đầu vào sai định dạng |
| 401 Unauthorized | Token không hợp lệ hoặc đã hết hạn |
| 403 Forbidden | Không đủ quyền truy cập tài nguyên |
| 404 Not Found | Tài nguyên không tồn tại |
| 422 Unprocessable Entity | Vi phạm ràng buộc dữ liệu (Pydantic) |
| 429 Too Many Requests | Vượt giới hạn tần suất AI (20 req/60s) |
| 500 Internal Server Error | Lỗi không mong đợi phía server |

---

> **Ngoài phạm vi triển khai:** Hệ thống cảnh báo giá (price alert), lịch kinh tế (economic calendar), và tính năng chia sẻ công khai (social sharing) không được triển khai trong phiên bản hiện tại.
