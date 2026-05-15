# 4.6.4 Xung Đột Dữ Liệu Giá Thời Gian Thực (`ON CONFLICT DO UPDATE` vs `DO NOTHING`)

## Hai loại dữ liệu giá có xử lý xung đột khác nhau

Hệ thống có hai loại INSERT vào bảng `price_data`, mỗi loại cần chiến lược conflict resolution khác nhau:

| Task | Data type | Conflict strategy | Lý do |
|------|-----------|------------------|-------|
| `ingest_1m_price_data` | Dữ liệu thời gian thực (rolling 7d) | `ON CONFLICT DO UPDATE` | Candle đang hình thành cần cập nhật |
| `ingest_historical_price_data` | Backfill lịch sử đã hoàn chỉnh | `ON CONFLICT DO NOTHING` | Không bao giờ ghi đè lịch sử đã có |

## Bài toán candle đang hình thành (live candle)

Task 1m chạy mỗi phút với `period="7d"`. Xét nến **1m hiện tại** (đang trong phút đang chạy):

- **Phút 14:30:00**: Nến 14:30 bắt đầu hình thành. Task fetch lúc 14:30:45 — nến 14:30 chưa đóng, `close=150.20`
- **Phút 14:31:00**: Task fetch lần tiếp, nến 14:30 đã đóng, `close=150.35` (giá đóng thực)

Nếu dùng `DO NOTHING`: Lần insert đầu tiên ghi `close=150.20`, lần thứ hai bị bỏ qua → chart hiển thị giá đóng sai cho mãi.

Nếu dùng `DO UPDATE`: Lần insert thứ hai cập nhật `close=150.35` → chart luôn hiển thị giá mới nhất.

```python
stmt = stmt.on_conflict_do_update(
    index_elements=["asset_id", "timestamp", "timeframe"],
    set_={
        "open":      stmt.excluded.open,
        "high":      stmt.excluded.high,
        "low":       stmt.excluded.low,
        "close":     stmt.excluded.close,
        "adj_close": stmt.excluded.adj_close,
        "volume":    stmt.excluded.volume,
    },
)
```

`stmt.excluded.close` là giá trị mới từ INSERT attempt bị conflict — không phải giá trị đang có trong DB. Toàn bộ OHLCV được cập nhật, không chỉ `close` — vì `high` và `low` trong phiên cũng thay đổi.

## Backfill lịch sử: DO NOTHING là đúng

Task historical backfill (`ingest_historical_price_data`) chạy mỗi ngày lúc 06:00 để refresh lịch sử 1h và làm mới 730 ngày data. Dữ liệu lịch sử đã hoàn chỉnh — nến tháng trước đã đóng, giá không thay đổi.

Nếu dùng `DO UPDATE` cho backfill: mỗi ngày re-ghi toàn bộ 730 × 24 = 17,520 rows/ticker — tốn I/O không cần thiết và tạo write amplification trong TimescaleDB.

Với `DO NOTHING`:
```python
stmt = stmt.on_conflict_do_nothing(
    index_elements=["asset_id", "timestamp", "timeframe"]
)
```

Chỉ insert row thực sự mới (ví dụ 24 nến 1h mới nhất của ngày hôm qua). Toàn bộ lịch sử cũ được bỏ qua không ghi. Idempotent và hiệu quả.

## Unique constraint đảm bảo tính toàn vẹn

Cả hai chiến lược đều yêu cầu `UNIQUE` constraint hoặc index trên `(asset_id, timestamp, timeframe)`:

```sql
-- Trong Alembic migration
CREATE UNIQUE INDEX uix_price_data_asset_ts_tf
    ON price_data (asset_id, timestamp, timeframe);
```

Unique constraint là điều kiện tiên quyết cho `ON CONFLICT` syntax. TimescaleDB hypertable tự động phân mảnh theo `timestamp` — unique index cũng được phân mảnh theo chunk, đảm bảo kiểm tra constraint nhanh trong từng partition.

## Tác động đến hiển thị real-time

Với `DO UPDATE` cho 1m task và Redis cache TTL 45 giây: người dùng xem chart sẽ thấy giá close của nến hiện tại được cập nhật mỗi ~1 phút (khi cache expire và request mới được phục vụ từ DB). Đây là độ trễ chấp nhận được cho ứng dụng phân tích — không phải hệ thống trading HFT.
