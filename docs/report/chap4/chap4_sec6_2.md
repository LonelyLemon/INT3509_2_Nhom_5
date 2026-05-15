# 4.6.2 Giới Hạn Tham Số asyncpg và Chiến Lược Bulk Insert (Chunk 2000 Rows)

## Giới hạn kỹ thuật của PostgreSQL/asyncpg

PostgreSQL wire protocol giới hạn tối đa **32,767 parameters** trong một `Prepared Statement`. Mỗi placeholder `$1`, `$2`, ... đếm là một parameter.

Khi dùng SQLAlchemy để bulk insert, mỗi cột trong mỗi row tạo ra một parameter riêng:

```
INSERT INTO price_data (asset_id, timestamp, timeframe, open, high, low, close, adj_close, volume)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9),    ← 9 params cho row 1
       ($10, $11, $12, ...)                        ← 9 params cho row 2
       ...
```

`PriceData` có **9 cột giá trị** → mỗi row = 9 parameters.

**Giới hạn tối đa rows trong một INSERT:**
```
⌊32767 / 9⌋ = 3640 rows
```

## Vấn đề thực tế

Task 1m download dữ liệu với `period="7d"`, `interval="1m"`. Số bản ghi điển hình cho 18 ticker:

```
18 tickers × 7 ngày × ~390 phút/ngày (NYSE) ≈ 49,140 records
```

49,140 rows × 9 params = 442,260 parameters — vượt xa giới hạn 32,767. asyncpg sẽ raise lỗi khi cố INSERT toàn bộ trong một statement.

## Giải pháp: chunk INSERT

```python
INSERT_CHUNK_SIZE = 2000  # an toàn xa dưới giới hạn: 2000 × 9 = 18,000 params

for i in range(0, len(records), INSERT_CHUNK_SIZE):
    chunk = records[i : i + INSERT_CHUNK_SIZE]
    stmt = insert(PriceData).values(chunk)
    stmt = stmt.on_conflict_do_update(
        index_elements=["asset_id", "timestamp", "timeframe"],
        set_={...},
    )
    result = await db.execute(stmt)
    inserted += result.rowcount

await db.commit()
```

`INSERT_CHUNK_SIZE = 2000` được chọn với biên an toàn lớn:
- `2000 × 9 = 18,000 params` — chỉ bằng 55% giới hạn
- Không cần lo về column count thay đổi trong tương lai (thêm cột mới vẫn an toàn)

Tất cả chunk được commit trong **một transaction duy nhất** (`await db.commit()` sau vòng lặp). Nếu chunk nào fail, rollback toàn bộ batch — tránh tình trạng data nửa vời.

## Kiểm chứng với task news

Task news không bị vấn đề này vì số lượng bài báo mới thường nhỏ (< 200 bài mỗi lần chạy), và schema `NewsArticle` có nhiều cột hơn nhưng số lượng record ít. Tuy nhiên code `db.add_all(new_articles)` đã dùng ORM insert (không bulk INSERT statement) nên SQLAlchemy tự xử lý.

## Lý do chọn 2000 thay vì giá trị khác

| Chunk size | Params/chunk | % giới hạn | Số round-trips (50k rows) |
|-----------|-------------|-----------|--------------------------|
| 3000 | 27,000 | 82% | 17 |
| **2000** | **18,000** | **55%** | **25** |
| 1000 | 9,000 | 27% | 50 |
| 500 | 4,500 | 14% | 100 |

2000 là điểm cân bằng giữa số round-trips (ít = nhanh) và biên an toàn khỏi giới hạn (nhiều = an toàn). 25 round-trips trong cùng một transaction vẫn rất nhanh vì không có network latency giữa các execute() — tất cả trong cùng một connection.
