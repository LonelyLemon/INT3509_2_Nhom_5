# 3.3.4 Tối Ưu Dữ Liệu Chuỗi Thời Gian với TimescaleDB

## Vấn đề với bảng PostgreSQL thông thường

Bảng `price_data` tích lũy dữ liệu nhanh: 18 ticker × 1 nến/phút × 60 phút × 24 giờ = **25.920 bản ghi/ngày** chỉ với timeframe 1m. Sau một năm thu thập, bảng vượt 9 triệu bản ghi. Với bảng PostgreSQL thông thường:

- Truy vấn `WHERE asset_id = X AND timestamp > NOW() - INTERVAL '7 days'` phải scan toàn bộ B-tree index — chậm khi bảng lớn.
- `DELETE WHERE timestamp < cutoff` phải xóa từng row — lock lâu, tốn I/O.
- Index toàn bảng tốn nhiều RAM khi kích thước dữ liệu tăng lên.

## Hypertable: Phân mảnh tự động theo thời gian

TimescaleDB chuyển `price_data` thành **hypertable** — bảng được phân mảnh tự động thành các **chunk** theo trục thời gian. Mỗi chunk là một bảng PostgreSQL thông thường ở tầng dưới; hypertable là abstraction ở tầng trên.

```sql
-- Migration 9fab416bdb1b: kích hoạt và tạo hypertable
CREATE EXTENSION IF NOT EXISTS timescaledb;
SELECT create_hypertable('price_data', 'timestamp', migrate_data => true);

-- Migration a1b2c3d4e5f6: thu hẹp chunk interval xuống 1 ngày
SELECT set_chunk_time_interval('price_data', INTERVAL '1 day');
```

Chunk interval mặc định của TimescaleDB là 7 ngày — quá thô cho dữ liệu 1 phút. Sau khi tối ưu, mỗi chunk chứa đúng 1 ngày dữ liệu (≈ 25.920 bản ghi) thay vì 7 ngày (≈ 181.440 bản ghi).

**Lợi ích của chunk nhỏ:**

| Thao tác | PostgreSQL thường | TimescaleDB (chunk 1 ngày) |
|---------|------------------|--------------------------|
| Query `WHERE timestamp > NOW() - 7d` | Scan index toàn bảng | Chỉ scan 7 chunk gần nhất |
| Xóa dữ liệu cũ hơn N ngày | `DELETE` từng row — O(n) | Drop chunk — O(1) |
| Index trong RAM | Index toàn bộ bảng | Index chỉ trên chunk active |
| VACUUM/maintenance | Toàn bảng | Từng chunk độc lập |

## Tổng hợp đa timeframe với `time_bucket()`

Thay vì lưu nhiều bản sao dữ liệu cho từng timeframe (1m, 5m, 15m, 30m, 4h), hệ thống chỉ lưu 3 timeframe gốc (`1m`, `1h`, `1d`) và tổng hợp các timeframe còn lại on-the-fly trong truy vấn.

### Bảng định tuyến timeframe

| Timeframe yêu cầu | Lấy từ | Interval tổng hợp |
|------------------|--------|------------------|
| `1m` | Truy vấn trực tiếp `price_data` (timeframe=1m) | — |
| `5m` | `price_data` (timeframe=1m) | `5 minutes` |
| `15m` | `price_data` (timeframe=1m) | `15 minutes` |
| `30m` | `price_data` (timeframe=1m) | `30 minutes` |
| `1h` | Truy vấn trực tiếp `price_data` (timeframe=1h) | — |
| `4h` | `price_data` (timeframe=1h) | `4 hours` |
| `1d` | Truy vấn trực tiếp `price_data` (timeframe=1d) | — |

### Câu truy vấn tổng hợp

```sql
SELECT
    time_bucket(INTERVAL '4 hours', timestamp) AS timestamp,
    first(open,  timestamp) AS open,    -- Giá mở nến đầu tiên trong bucket
    max(high)               AS high,    -- Giá cao nhất
    min(low)                AS low,     -- Giá thấp nhất
    last(close,  timestamp) AS close,   -- Giá đóng nến cuối cùng
    sum(volume)             AS volume   -- Tổng khối lượng
FROM price_data
WHERE
    asset_id  = :asset_id
    AND timeframe = '1h'
    AND timestamp >= :start
    AND timestamp <= :end
GROUP BY time_bucket(INTERVAL '4 hours', timestamp)
ORDER BY timestamp DESC
LIMIT :limit;
```

Hàm `first()` và `last()` là hàm aggregate đặc trưng của TimescaleDB — trả về giá trị của cột khác tại thời điểm `timestamp` nhỏ nhất/lớn nhất trong bucket, phù hợp chính xác với định nghĩa nến OHLCV.

### Hiệu quả lưu trữ

```
Không dùng time_bucket (lưu tất cả timeframe):
  1m: 25.920 bản ghi/ngày
  5m:  5.184 bản ghi/ngày
  15m: 1.728 bản ghi/ngày
  30m:   864 bản ghi/ngày
  1h:    432 bản ghi/ngày
  4h:    108 bản ghi/ngày
  1d:     18 bản ghi/ngày
  ─────────────────────────
  Tổng: ~34.254 bản ghi/ngày/18 ticker

Dùng time_bucket (chỉ lưu 1m + 1h + 1d):
  1m: 25.920 bản ghi/ngày
  1h:    432 bản ghi/ngày
  1d:     18 bản ghi/ngày
  ─────────────────────────
  Tổng: ~26.370 bản ghi/ngày/18 ticker  (giảm ~23% lưu trữ)
```

Tiết kiệm lưu trữ là phụ — lợi ích chính là **không cần pipeline đồng bộ** để giữ 5m/15m/30m/4h nhất quán với 1m/1h. Dữ liệu tổng hợp luôn chính xác vì tính trực tiếp từ nguồn gốc tại thời điểm đọc.

## Tích hợp với Redis Cache

Kết quả truy vấn lịch sử giá (cả trực tiếp lẫn time_bucket) được cache trong Redis với key `price:history:{ticker}:{timeframe}:{limit}:{start}:{end}`. TTL của cache được điều chỉnh theo timeframe — timeframe nhỏ (1m) có TTL ngắn hơn vì dữ liệu thay đổi thường xuyên; timeframe lớn (1d) có TTL dài hơn. Điều này đảm bảo truy vấn `time_bucket()` tốn kém chỉ chạy một lần cho cùng tham số trong khoảng TTL.
