# 2.3.1 Yêu Cầu Hiệu Năng và Thời Gian Phản Hồi

## Tổng quan

Yêu cầu hiệu năng của MarketMind xuất phát từ hai đặc thù của ứng dụng: (1) dữ liệu giá tài chính cần được cập nhật liên tục với độ trễ thấp, và (2) hệ thống AI cần xử lý các yêu cầu phân tích phức tạp mà không làm nghẽn luồng phục vụ người dùng khác. Kiến trúc hệ thống được thiết kế để đáp ứng cả hai yêu cầu này thông qua kết hợp caching đa tầng, xử lý bất đồng bộ và tách biệt các tác vụ nền.

---

## Hiệu năng API

Các endpoint REST phục vụ dữ liệu tĩnh hoặc có thể cache (danh sách tài sản, lịch sử giá, tin tức) được thiết kế để phản hồi trong vòng dưới 200ms trong điều kiện tải thông thường, nhờ vào lớp cache Redis đứng trước cơ sở dữ liệu. Các endpoint thực hiện truy vấn tổng hợp phức tạp (như xem chi tiết danh mục với nhiều tài sản) cho phép thời gian phản hồi lên đến 500ms.

## Chiến lược caching

Hệ thống sử dụng Redis làm tầng cache trung gian với chiến lược TTL (Time-To-Live) được hiệu chỉnh theo đặc tính của từng loại dữ liệu:

| Loại dữ liệu | TTL Cache | Lý do |
|-------------|----------|-------|
| Giá 1 phút (1m) | 45 giây | Dữ liệu cập nhật mỗi phút, cần gần real-time |
| Giá 5 phút (5m) | 5 phút | Độ mới tương đương chu kỳ nến |
| Giá 15 phút (15m) | 15 phút | Tương tự |
| Giá 30 phút (30m) | 30 phút | Tương tự |
| Giá 1 giờ (1h) | 1 giờ | Tương tự |
| Giá 4 giờ (4h) | 4 giờ | Aggregate từ 1h |
| Giá 1 ngày (1d) | 23 giờ | Chỉ thay đổi khi đóng cửa phiên giao dịch |
| Token blacklist (JWT) | TTL còn lại của token | Khớp với thời hạn token |
| Rate limit counter (AI) | 60 giây | Cửa sổ giới hạn tần suất |

Sau mỗi lần tác vụ Celery thu thập dữ liệu giá hoàn thành, cache tương ứng bị vô hiệu hóa (invalidated) để đảm bảo yêu cầu kế tiếp lấy dữ liệu mới từ cơ sở dữ liệu.

## Thu thập dữ liệu nền (Background Ingestion)

Tất cả tác vụ thu thập dữ liệu định kỳ được thực hiện bởi Celery workers chạy độc lập với tiến trình phục vụ API, đảm bảo quá trình thu thập không ảnh hưởng đến khả năng phản hồi của server:

| Tác vụ Celery | Lịch chạy | Mô tả |
|--------------|----------|-------|
| `ingest_1m_price_data` | Mỗi 1 phút | Thu thập nến 1 phút cho tất cả ticker đang hoạt động |
| `ingest_historical_price_data` | Hàng ngày lúc 06:00 (HCM) | Backfill dữ liệu lịch sử đa khung thời gian |
| `ingest_assets_news` | Định kỳ (cấu hình qua Celery Beat) | Thu thập và phân tích tâm lý tin tức |

Celery sử dụng chiến lược retry với exponential backoff khi gặp lỗi kết nối bên ngoài (lần 1: 2s, lần 2: 4s, lần 3: 8s).

## Hiệu năng thao tác cơ sở dữ liệu

Dữ liệu giá được chèn hàng loạt (bulk insert) với kích thước chunk tối đa 2000 bản ghi mỗi lần để tránh giới hạn tham số của asyncpg (thư viện driver PostgreSQL). Câu lệnh chèn sử dụng `ON CONFLICT DO UPDATE` cho dữ liệu 1 phút (làm mới nến đang hình thành) và `ON CONFLICT DO NOTHING` cho dữ liệu lịch sử (tránh ghi đè). Bảng `price_data` có index tổng hợp trên `(asset_id, timestamp)` để tối ưu các truy vấn theo khoảng thời gian.

## Xử lý bất đồng bộ

Toàn bộ tầng backend sử dụng SQLAlchemy async với driver asyncpg, cho phép FastAPI xử lý nhiều yêu cầu đồng thời mà không bị block bởi I/O cơ sở dữ liệu. Các Celery task sử dụng `NullPool` (không tái sử dụng connection) để tránh xung đột event loop giữa tiến trình Celery và tiến trình FastAPI chính.

## Giới hạn tần suất (Rate Limiting)

| Phạm vi | Giới hạn | Cơ chế |
|--------|---------|--------|
| AI Chat (per user) | 20 yêu cầu / 60 giây | Redis counter với TTL 60s |
| API tổng thể (per IP) | Cấu hình qua middleware | Middleware FastAPI |
