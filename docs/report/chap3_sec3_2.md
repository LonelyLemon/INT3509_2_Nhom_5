# 3.3.2 Mô Tả Các Bảng Chính và Quan Hệ

## `users` — Tài khoản người dùng

Bảng trung tâm của hệ thống, được tham chiếu bởi hầu hết bảng còn lại.

| Cột | Kiểu | Ràng buộc | Mô tả |
|-----|------|-----------|-------|
| `id` | UUID | PK | Sinh bởi `uuid4()` |
| `username` | VARCHAR(100) | NOT NULL | Tên hiển thị |
| `email` | VARCHAR(50) | UNIQUE, NOT NULL | Dùng làm định danh đăng nhập (`sub` trong JWT) |
| `password_hash` | VARCHAR(512) | NOT NULL | bcrypt hash, không bao giờ lưu plaintext |
| `is_verified` | BOOLEAN | DEFAULT false | Xác minh email bắt buộc cho AI chat và đăng bài |
| `role` | VARCHAR(20) | DEFAULT "user" | `"user"` hoặc `"admin"` |
| `display_name` | VARCHAR(100) | NULLABLE | Tên thay thế username |
| `avatar_url` | TEXT | NULLABLE | URL ảnh đại diện |
| `bio` | TEXT | NULLABLE | Giới thiệu bản thân |
| `is_banned` | BOOLEAN | DEFAULT false | Bị cấm không thể đăng nhập |

**Quan hệ:** Một user có nhiều portfolio, watchlist item, conversation, post, comment, và một bản cài đặt indicator duy nhất (one-to-one với `user_indicator_settings`).

---

## `assets` — Tài sản tài chính

Danh mục 18 tài sản được seed khi khởi động hệ thống lần đầu.

| Cột | Kiểu | Ràng buộc | Mô tả |
|-----|------|-----------|-------|
| `id` | UUID | PK | — |
| `ticker` | VARCHAR(20) | UNIQUE, INDEX | Mã ticker (AAPL, BTC-USD, ...) |
| `name` | VARCHAR(256) | NULLABLE | Tên đầy đủ |
| `asset_type` | ENUM | NOT NULL | `STOCK`, `ETF`, `CRYPTO` |
| `is_active` | BOOLEAN | DEFAULT true | Có đang thu thập dữ liệu không |

**Quan hệ:** Một asset có nhiều price_data (one-to-many, cascade delete), nhiều holding và watchlist_item.

---

## `price_data` — Dữ liệu giá OHLCV

Bảng lớn nhất và duy nhất được chuyển thành TimescaleDB hypertable. Lưu nến OHLCV theo nhiều timeframe.

| Cột | Kiểu | Ràng buộc | Mô tả |
|-----|------|-----------|-------|
| `id` | UUID | PK | — |
| `asset_id` | UUID | FK → assets, INDEX | — |
| `timestamp` | TIMESTAMP WITH TZ | NOT NULL | Thời điểm mở nến |
| `timeframe` | VARCHAR(10) | NOT NULL | `1m`, `1h`, `1d` |
| `open` | FLOAT | NOT NULL | Giá mở |
| `high` | FLOAT | NOT NULL | Giá cao nhất |
| `low` | FLOAT | NOT NULL | Giá thấp nhất |
| `close` | FLOAT | NOT NULL | Giá đóng |
| `adj_close` | FLOAT | NULLABLE | Giá đóng điều chỉnh (cổ phiếu) |
| `volume` | FLOAT | NOT NULL | Khối lượng giao dịch |

**Ràng buộc bổ sung:** `UNIQUE(asset_id, timestamp, timeframe)` — đảm bảo không có nến trùng lặp; cho phép `ON CONFLICT DO UPDATE` và `ON CONFLICT DO NOTHING` hoạt động đúng.

**Lưu ý timeframe:** Chỉ `1m`, `1h`, `1d` được lưu vật lý. Các timeframe `5m`, `15m`, `30m`, `4h` được tổng hợp on-the-fly từ dữ liệu 1m và 1h qua `time_bucket()` khi truy vấn.

---

## `portfolios` và `holdings` — Danh mục đầu tư

**`portfolios`** là container danh mục, thuộc về một user. Một user có thể có nhiều portfolio (flag `is_default` đánh dấu danh mục mặc định).

**`holdings`** là tài sản trong danh mục. Ràng buộc `UNIQUE(portfolio_id, asset_id)` đảm bảo mỗi tài sản chỉ xuất hiện một lần trong mỗi portfolio — nếu thêm lần nữa thì tăng `quantity` thay vì tạo bản ghi mới.

| Cột (holdings) | Kiểu | Ràng buộc | Mô tả |
|---------------|------|-----------|-------|
| `portfolio_id` | UUID | FK → portfolios (CASCADE), INDEX | — |
| `asset_id` | UUID | FK → assets (CASCADE) | — |
| `quantity` | FLOAT | NOT NULL | Số lượng nắm giữ |
| `notes` | TEXT | NULLABLE | Ghi chú thêm của người dùng |

**Lưu ý:** Không lưu giá mua trung bình (`avg_buy_price`) hay P&L — giá trị hiện tại tính bằng `quantity × latest_price` lấy từ Redis/DB tại thời điểm đọc.

---

## `watchlist_items` — Danh sách theo dõi

Một bảng đơn giản liên kết user với asset, thêm trường `position` để người dùng sắp xếp thứ tự tùy ý.

| Cột | Kiểu | Ràng buộc | Mô tả |
|-----|------|-----------|-------|
| `user_id` | UUID | FK → users (CASCADE), INDEX | — |
| `asset_id` | UUID | FK → assets (CASCADE) | — |
| `position` | INTEGER | DEFAULT 0 | Vị trí hiển thị (người dùng kéo thả) |

**Ràng buộc:** `UNIQUE(user_id, asset_id)` — một tài sản không thể xuất hiện hai lần trong watchlist của cùng một user.

---

## `conversations` và `messages` — Lịch sử AI Chat

**`conversations`** là một phiên hội thoại. Ngoài `title`, bảng còn lưu phản hồi của người dùng về chất lượng hội thoại: `rating` (`"like"` / `"dislike"`), `feedback_text` (tùy chọn), và `rated_at`.

**`messages`** lưu từng lượt trao đổi trong conversation theo thứ tự `created_at`. Trường `role` nhận một trong hai giá trị: `"user"` (tin nhắn người dùng) hoặc `"assistant"` (phản hồi AI tổng hợp).

Khi build lại lịch sử hội thoại để truyền cho Pydantic-AI, các message được chuyển đổi sang `ModelRequest` / `ModelResponse` tương ứng với role.

---

## `posts` và `comments` — Blog & Diễn đàn

**`posts`** lưu bài viết blog. Flag `is_published` cho phép admin ẩn bài mà không xóa.

**`comments`** hỗ trợ phân cấp qua `parent_id` tự tham chiếu (nullable) — `parent_id = null` là bình luận gốc, `parent_id != null` là trả lời bình luận khác. Không giới hạn độ sâu cây bình luận ở tầng DB.

---

## `news_articles` và `news_article_tickers` — Tin tức tài chính

**`news_articles`** lưu bài báo thu thập từ Massive API. Trường phân tích tâm lý (`sentiment_label`, `sentiment_score`) được tính bằng thuật toán Loughran-McDonald lexicon tại thời điểm thu thập.

| Cột phân tích | Giá trị | Mô tả |
|--------------|---------|-------|
| `sentiment_label` | `BULLISH` / `BEARISH` / `NEUTRAL` | Nhãn tổng hợp |
| `sentiment_score` | -1.0 đến +1.0 | Điểm số liên tục |
| `category` | `STOCK` / `ETF` / `CRYPTO` / `GENERAL` | Phân loại nội dung |

**`news_article_tickers`** là bảng N-N giữa bài báo và ticker symbol. Lưu `ticker` dưới dạng string (không FK đến `assets`) để không bị ràng buộc vào danh sách 18 ticker cố định.

---

## `user_indicator_settings` — Cài đặt chỉ báo kỹ thuật

Bảng one-to-one với `users` (ràng buộc `UNIQUE(user_id)`). Trường `settings` là JSONB lưu tham số của 4 chỉ báo:

```json
{
  "RSI":  { "period": 14 },
  "MACD": { "fast": 12, "slow": 26, "signal": 9 },
  "SMA":  { "periods": [20, 50] },
  "EMA":  { "periods": [9, 21] }
}
```

Khi user chưa có bản ghi, API trả về giá trị mặc định hardcode mà không cần tạo bản ghi trước — bản ghi chỉ được tạo khi user lưu cài đặt tùy chỉnh lần đầu.
