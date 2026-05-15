# 3.3.3 Chiến Lược Index và Tối Ưu Truy Vấn

## Tổng quan

Index được định nghĩa trực tiếp trong SQLAlchemy model và Alembic migration, sau đó áp dụng tự động khi chạy `alembic upgrade head`. Chiến lược chung: index trên mọi foreign key (để hỗ trợ JOIN và cascade delete), index phức hợp cho các pattern truy vấn phổ biến nhất, và unique constraint cho các ràng buộc nghiệp vụ (đồng thời tạo index ngầm trong PostgreSQL).

---

## Danh sách index theo bảng

### `assets`

| Index | Cột | Loại | Mục đích |
|-------|-----|------|---------|
| PK (ngầm) | `id` | btree | Lookup theo ID |
| `ix_assets_id` | `id` | btree | Đã có trong Base (index=True) |
| `uq_assets_ticker` | `ticker` | unique btree | Lookup theo mã ticker (pattern phổ biến nhất) |

Truy vấn `WHERE ticker = 'AAPL'` — pattern phổ biến nhất trong hệ thống — được phục vụ bởi unique index trên `ticker` mà không cần full scan.

### `price_data`

Đây là bảng có index phức tạp nhất do tần suất truy vấn cao và kích thước lớn.

| Index | Cột | Loại | Mục đích |
|-------|-----|------|---------|
| PK (ngầm) | `id` | btree | — |
| `uq_asset_time_frame` | `(asset_id, timestamp, timeframe)` | unique btree | Ràng buộc không trùng lặp nến; hỗ trợ `ON CONFLICT DO UPDATE/NOTHING` |
| `ix_price_data_asset_time` | `(asset_id, timestamp)` | btree | Tăng tốc range query `WHERE asset_id = X AND timestamp BETWEEN a AND b` |

Composite index `(asset_id, timestamp)` là index quan trọng nhất — phù hợp chính xác với pattern truy vấn lịch sử giá: lọc theo ticker (→ `asset_id`) và khoảng thời gian. Cột `asset_id` đứng trước vì cardinality thấp hơn `timestamp`, giúp lọc hiệu quả hơn khi scan range.

**Lưu ý:** Vì `price_data` là TimescaleDB hypertable, PostgreSQL chỉ tạo index trên chunk hiện tại thay vì toàn bảng — giảm đáng kể thời gian tạo index và kích thước index trong memory.

### `portfolios` và `holdings`

| Index | Bảng | Cột | Mục đích |
|-------|------|-----|---------|
| FK index (ngầm từ `index=True`) | `portfolios` | `user_id` | `GET /portfolio` — list portfolios của user |
| FK index (ngầm từ `index=True`) | `holdings` | `portfolio_id` | `GET /portfolio/{id}` — load holdings |
| `uq_holding_portfolio_asset` | `holdings` | `(portfolio_id, asset_id)` | Ràng buộc mỗi asset chỉ xuất hiện một lần |

### `watchlist_items`

| Index | Cột | Mục đích |
|-------|-----|---------|
| FK index | `user_id` | `GET /watchlist` — lấy toàn bộ watchlist |
| `uq_watchlist_user_asset` | `(user_id, asset_id)` | Không trùng lặp asset trong watchlist |

### `conversations` và `messages`

| Index | Bảng | Cột | Mục đích |
|-------|------|-----|---------|
| `ix_conversations_user_id` | `conversations` | `user_id` | `GET /ai/conversations` — list conversations của user |
| `ix_messages_conversation_id` | `messages` | `conversation_id` | Load toàn bộ tin nhắn của một conversation |

### `news_articles` và `news_article_tickers`

| Index | Bảng | Cột | Mục đích |
|-------|------|-----|---------|
| `uq_news_articles_url` | `news_articles` | `url` | Dedup khi insert — tránh lưu bài trùng |
| `ix_news_articles_category` | `news_articles` | `category` | Filter `GET /news?category=STOCK` |
| `ix_news_articles_sentiment_label` | `news_articles` | `sentiment_label` | Filter `GET /news?sentiment=BULLISH` |
| `uq_article_ticker` | `news_article_tickers` | `(article_id, ticker)` | Không trùng lặp |
| `ix_news_article_tickers_ticker` | `news_article_tickers` | `ticker` | Filter `GET /news?ticker=AAPL` — join với news_articles |

### `user_indicator_settings`

| Index | Cột | Mục đích |
|-------|-----|---------|
| `uq_user_indicator_settings_user_id` | `user_id` | One-to-one: không có 2 bản ghi cùng user |
| `ix_user_indicator_settings_user_id` | `user_id` | `GET /indicators/settings` — lookup theo user |

---

## Chiến lược tối ưu truy vấn

### Eager loading với `selectin`

Một số relationship được cấu hình `lazy="selectin"` để tự động load dữ liệu liên quan bằng một câu IN query thay vì N+1 queries:

```python
# Holding tự động load asset khi cần:
asset: Mapped["Asset"] = relationship(lazy="selectin")

# Portfolio tự động load holdings:
holdings: Mapped[list["Holding"]] = relationship(lazy="selectin")
```

Pattern này được dùng khi biết chắc rằng mỗi lần load entity chính sẽ cần load entity liên quan (ví dụ: get portfolio → cần biết holdings; get holding → cần tên ticker của asset).

### Lazy loading với `noload`

Relationship được cấu hình `lazy="noload"` khi chủ động không muốn load:

```python
# price_data của asset KHÔNG tự động load (quá lớn):
price_data: Mapped[list["PriceData"]] = relationship(lazy="noload")

# messages của conversation KHÔNG tự động load (chỉ load khi xem chi tiết):
messages: Mapped[list["Message"]] = relationship(lazy="noload")
```

`noload` tránh vô tình load hàng nghìn bản ghi price_data mỗi khi một asset được fetch. Messages chỉ được load khi gọi endpoint `GET /ai/conversations/{id}` với `selectinload(Conversation.messages)` tường minh.

### Pagination cho danh sách lớn

Các endpoint trả về danh sách có thể lớn (danh sách user admin, danh sách tin tức) đều hỗ trợ pagination qua `limit` + `offset` và trả về tổng số bản ghi (`total`) qua `COUNT()` subquery — cho phép client hiển thị số trang mà không cần load toàn bộ.
