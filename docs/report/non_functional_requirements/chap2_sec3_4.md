# 2.3.4 Yêu Cầu Độ Tin Cậy và Khả Năng Phục Hồi

## Tổng quan

Độ tin cậy của MarketMind được xây dựng trên nguyên tắc **graceful degradation** — khi một thành phần gặp sự cố, các thành phần còn lại vẫn tiếp tục hoạt động ở mức tốt nhất có thể thay vì sập toàn bộ. Điều này đặc biệt quan trọng vì hệ thống phụ thuộc vào nguồn dữ liệu bên ngoài (Yahoo Finance, Gemini API) vốn không thể đảm bảo 100% uptime.

---

## Khả năng phục hồi của Celery Tasks

Tất cả Celery task liên quan đến gọi API bên ngoài (yfinance, Gemini) đều có cấu hình tự động thử lại khi gặp ngoại lệ, theo chiến lược **exponential backoff**:

```
Lần thử 1 (ngay lập tức)
    → Thất bại → Chờ 2 giây → Lần thử 2
    → Thất bại → Chờ 4 giây → Lần thử 3
    → Thất bại → Chờ 8 giây → Lần thử 4
    → Thất bại → Đánh dấu task thất bại, ghi log
```

Cơ chế này tránh tạo spike tải lên API bên ngoài khi dịch vụ đang phục hồi, đồng thời đảm bảo hầu hết lỗi tạm thời (network timeout, service restart) được xử lý tự động mà không cần can thiệp thủ công.

## Tính nhất quán dữ liệu khi ghi hàng loạt

Quá trình thu thập dữ liệu giá sử dụng hai chiến lược xung đột khác nhau tùy theo ngữ cảnh:

| Ngữ cảnh | Chiến lược | Lý do |
|---------|-----------|-------|
| Thu thập dữ liệu 1 phút | `ON CONFLICT DO UPDATE` | Nến đang hình thành cần được cập nhật khi chạy lại trong cùng phút |
| Backfill dữ liệu lịch sử | `ON CONFLICT DO NOTHING` | Dữ liệu lịch sử đã hoàn chỉnh, không cần ghi đè |

Cả hai chiến lược đều đảm bảo tác vụ Celery có tính **idempotent** — chạy nhiều lần cho cùng khoảng thời gian không tạo ra dữ liệu trùng lặp hay gây lỗi.

## Tính toàn vẹn kết nối cơ sở dữ liệu trong Celery

Celery workers chạy trong tiến trình riêng với event loop riêng. Việc chia sẻ connection pool của asyncpg (vốn gắn với một event loop cụ thể) giữa các tiến trình sẽ dẫn đến kết nối bị hỏng (stale connection). Hệ thống giải quyết vấn đề này bằng cách cấu hình riêng `TaskSessionLocal` sử dụng `NullPool` — mỗi Celery task tạo kết nối mới và đóng ngay sau khi hoàn thành, tránh hoàn toàn vấn đề chia sẻ connection pool.

## Tính toàn vẹn giao dịch trong AI Streaming

Phiên cơ sở dữ liệu trong luồng AI chat được quản lý theo cơ chế:

```
Bắt đầu SSE stream → Mở DB session
    ↓
AI xử lý → Gọi tools → Sinh token (stream)
    ↓
Hoàn thành → Lưu message vào DB → Commit
    ↓ (nếu xảy ra lỗi ở bất kỳ bước nào)
Exception → Rollback DB session → Phát SSE event "error"
```

Cơ chế này đảm bảo không có tin nhắn nửa vời hoặc trạng thái không nhất quán được lưu vào lịch sử hội thoại khi gặp sự cố trong quá trình streaming.

## Quản lý migration và tính ổn định schema

Mọi thay đổi schema cơ sở dữ liệu đều thực hiện qua Alembic migration scripts, được kiểm tra và đưa vào version control. Lệnh `alembic upgrade head` chạy tự động khi khởi động hệ thống, đảm bảo schema luôn đồng bộ với phiên bản code hiện tại. Mỗi migration có thể rollback về phiên bản trước nếu phát hiện vấn đề.

## Dự phòng dữ liệu cho người dùng

Khi giá mới nhất không có sẵn (ví dụ: ngoài giờ giao dịch hoặc API tạm thời ngừng hoạt động), hệ thống phục vụ dữ liệu cache Redis còn trong thời hạn TTL thay vì trả về lỗi. Điều này giúp giao diện người dùng luôn hiển thị dữ liệu — dù có thể không phải mới nhất — thay vì hiển thị trạng thái lỗi.

## Khởi tạo hệ thống an toàn

Khi ứng dụng khởi động, hệ thống tự động:
1. Kiểm tra và tạo tài khoản admin mặc định nếu chưa có.
2. Seed danh sách 18 mã tài sản ban đầu nếu bảng `assets` còn trống.
3. Áp dụng toàn bộ Alembic migrations còn pending.

Các bước này được thiết kế **idempotent** — chạy nhiều lần không gây ra dữ liệu trùng lặp hay lỗi.
