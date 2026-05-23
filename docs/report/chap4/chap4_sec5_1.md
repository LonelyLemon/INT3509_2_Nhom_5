# 4.5.1 Cấu Hình Celery Beat và Các Scheduled Task

## Kiến trúc Celery trong hệ thống

Celery trong MarketMind gồm hai tiến trình độc lập:
- **Celery Beat**: Scheduler — đọc lịch cron và ghi task vào Redis queue đúng giờ
- **Celery Worker**: Executor — nhận task từ queue, thực thi, ghi kết quả về Redis

```python
# core/celery.py
celery_app = Celery(
    "marketmind",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=[
        "src.price.tasks",
        "src.news.tasks",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Ho_Chi_Minh",
    enable_utc=True,
)
```

Redis đóng vai trò cả **message broker** (hàng đợi task) và **result backend** (lưu kết quả task). Timezone `Asia/Ho_Chi_Minh` (UTC+7) để lịch cron trong Beat schedule khớp với giờ địa phương.

## Beat schedule — 5 task định kỳ

```python
celery_app.conf.beat_schedule = {
    # 1. Thu thập giá 1 phút — mỗi phút
    "fetch-1m-price-data": {
        "task": "src.price.tasks.ingest_1m_price_data",
        "schedule": crontab(minute="*"),
    },

    # 2. Refresh lịch sử giá — 06:00 HCM mỗi ngày
    "refresh-historical-price-data": {
        "task": "src.price.tasks.ingest_historical_price_data",
        "schedule": crontab(hour=6, minute=0),
    },

    # 3. Tin tức định kỳ — mỗi 3 giờ
    "fetch-assets-news-periodic": {
        "task": "src.news.tasks.ingest_assets_news",
        "schedule": crontab(minute=0, hour="*/3"),
    },

    # 4. Tin tức khi NYSE mở cửa — 20:30 HCM (≈ 09:30 ET, hè)
    "fetch-assets-news-market-open": {
        "task": "src.news.tasks.ingest_assets_news",
        "schedule": crontab(hour=20, minute=30),
    },

    # 5. Tin tức khi NYSE đóng cửa — 03:00 HCM (≈ 16:00 ET, hè)
    "fetch-assets-news-market-close": {
        "task": "src.news.tasks.ingest_assets_news",
        "schedule": crontab(hour=3, minute=0),
    },
}
```

## Thiết kế lịch tin tức theo phiên giao dịch

Tin tức được thu thập theo ba thời điểm chiến lược thay vì chỉ mỗi 3 giờ:
- **Định kỳ (*/3h)**: Cập nhật liên tục trong ngày, tổng 8 lần/ngày
- **NYSE mở cửa (20:30 HCM)**: Bắt kịp tin tức buổi sáng thị trường Mỹ — thời điểm quan trọng nhất với volume giao dịch cao nhất
- **NYSE đóng cửa (03:00 HCM)**: Thu thập tin tức tổng kết phiên, earnings report, after-hours news

Lịch 3 giờ đảm bảo không quá tải Yahoo Finance API, đồng thời đảm bảo dữ liệu không bao giờ cũ hơn 3 tiếng trong khi thị trường mở.

## Idempotency

Cả hai task đều được thiết kế idempotent — có thể chạy lại nhiều lần mà không gây ra dữ liệu trùng lặp hay side effects ngoài ý muốn:
- **Price task**: Dùng `ON CONFLICT DO UPDATE` (1m) hoặc `ON CONFLICT DO NOTHING` (historical) — chi tiết ở mục 4.6.4
- **News task**: Kiểm tra URL đã tồn tại trong DB trước khi insert — bỏ qua bài đã có

Idempotency quan trọng vì Beat có thể re-send task khi worker restart, và task historical refresh chạy lại mỗi ngày trên data đã được fetch trước đó.

## Celery file: `celerybeat-schedule`

Beat lưu trạng thái schedule (lần chạy cuối của từng task) vào file `celerybeat-schedule` trong working directory. File này cần được persist (volume mount hoặc host filesystem) để Beat không "quên" và re-run tất cả task khi restart. Trong `docker-compose.prod.yml`, Beat container mount volume riêng cho file này.
