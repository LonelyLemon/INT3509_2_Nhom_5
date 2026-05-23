# 2.3.3 Yêu Cầu Khả Năng Mở Rộng

## Tổng quan

Khả năng mở rộng của MarketMind được thiết kế theo hướng **scale-out theo chiều ngang** (horizontal scaling) — thêm nhiều instance thay vì nâng cấp phần cứng. Kiến trúc không lưu trạng thái (stateless) ở tầng API và sử dụng Redis làm điểm chia sẻ trạng thái tập trung là nền tảng cho hướng tiếp cận này.

---

## Tầng API (FastAPI) — Stateless

FastAPI application không lưu bất kỳ trạng thái nào trong bộ nhớ tiến trình (in-process memory). Toàn bộ trạng thái phiên người dùng được mã hóa trong JWT hoặc lưu trong Redis/PostgreSQL. Điều này cho phép chạy nhiều instance FastAPI đồng thời phía sau một load balancer mà không cần session stickiness. Mỗi yêu cầu HTTP hoàn toàn tự chứa (self-contained) và có thể được phục vụ bởi bất kỳ instance nào.

## Tầng Workers (Celery) — Scale độc lập

Celery workers chạy độc lập với tiến trình FastAPI và có thể được nhân bản (scaled) riêng biệt tuỳ theo tải của các tác vụ nền. Khi lượng tài sản cần theo dõi tăng lên, có thể tăng số lượng worker mà không ảnh hưởng đến tầng API. Redis đóng vai trò là message broker dùng chung cho cả hai tầng.

## Tầng Dữ Liệu — Tối ưu cho Time-Series

Bảng `price_data` sử dụng **TimescaleDB** — extension mở rộng PostgreSQL cho dữ liệu chuỗi thời gian. TimescaleDB tự động phân mảnh dữ liệu theo thời gian (hypertable chunks), cho phép truy vấn và xoá dữ liệu cũ hiệu quả hơn nhiều so với bảng PostgreSQL thông thường khi dữ liệu tăng lên hàng chục triệu bản ghi. Hàm `time_bucket()` của TimescaleDB được dùng để tổng hợp dữ liệu 4h và 1d từ dữ liệu 1h, tránh lưu trữ dư thừa.

```
Dữ liệu lưu trữ thực tế: 1m, 5m, 15m, 30m, 1h
Dữ liệu tổng hợp on-the-fly: 4h, 1d  (qua time_bucket() — không lưu thêm)
```

## Tầng Cache (Redis) — Shared State

Redis đảm nhận ba vai trò trong kiến trúc:

| Vai trò | Mô tả |
|--------|-------|
| Cache dữ liệu giá | Giảm truy vấn lặp lại vào PostgreSQL cho cùng khung thời gian |
| Message broker (Celery) | Hàng đợi tác vụ nền giữa FastAPI và Celery workers |
| Shared state | Token blacklist, OTP, rate limit counters dùng chung giữa các API instance |

Redis là thành phần duy nhất có trạng thái chia sẻ giữa các API instance. Trong trường hợp tải tăng cao, Redis có thể được nâng cấp lên cluster mode hoặc sử dụng Redis Sentinel mà không cần thay đổi code ứng dụng.

## Quản lý kết nối cơ sở dữ liệu

FastAPI sử dụng connection pool của asyncpg để tái sử dụng kết nối PostgreSQL, tránh chi phí thiết lập kết nối mới cho mỗi request. Celery tasks sử dụng `NullPool` (mỗi task tạo và đóng kết nối riêng) để tránh xung đột event loop và không chiếm pool connection của tầng API.

## Khả năng mở rộng theo chiều dọc (Vertical Scaling)

Với cấu hình Docker Compose hiện tại, mỗi dịch vụ (PostgreSQL, Redis, FastAPI) chạy trên container độc lập và có thể được phân bổ tài nguyên (CPU, RAM) riêng biệt. Việc chuyển sang orchestration platform như Kubernetes trong tương lai không yêu cầu thay đổi kiến trúc cốt lõi.

## Quản lý schema với Alembic

Mọi thay đổi cấu trúc cơ sở dữ liệu đều thông qua migration script được quản lý bởi Alembic, đảm bảo quá trình nâng cấp schema có thể kiểm soát, kiểm tra trước và rollback nếu cần.
