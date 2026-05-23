# 3.3.1 Sơ Đồ ERD Tổng Thể

Cơ sở dữ liệu MarketMind gồm **13 bảng** tổ chức thành 6 nhóm chức năng: xác thực, tài sản & giá, danh mục đầu tư, theo dõi, AI chat, và cộng đồng. Mọi bảng đều kế thừa ba trường từ `Base`: `id` (UUID, PK), `created_at`, `updated_at` (TIMESTAMP WITH TIME ZONE).

```mermaid
erDiagram
    users {
        uuid id PK
        string username
        string email UK
        string password_hash
        bool is_verified
        string role
        string display_name
        text avatar_url
        text bio
        bool is_banned
        timestamp created_at
        timestamp updated_at
    }

    assets {
        uuid id PK
        string ticker UK
        string name
        string asset_type
        bool is_active
        timestamp created_at
        timestamp updated_at
    }

    price_data {
        uuid id PK
        uuid asset_id FK
        timestamp timestamp
        string timeframe
        float open
        float high
        float low
        float close
        float adj_close
        float volume
        timestamp created_at
        timestamp updated_at
    }

    portfolios {
        uuid id PK
        uuid user_id FK
        string name
        text description
        bool is_default
        timestamp created_at
        timestamp updated_at
    }

    holdings {
        uuid id PK
        uuid portfolio_id FK
        uuid asset_id FK
        float quantity
        text notes
        timestamp created_at
        timestamp updated_at
    }

    watchlist_items {
        uuid id PK
        uuid user_id FK
        uuid asset_id FK
        int position
        timestamp created_at
        timestamp updated_at
    }

    conversations {
        uuid id PK
        uuid user_id FK
        string title
        string rating
        text feedback_text
        timestamp rated_at
        timestamp created_at
        timestamp updated_at
    }

    messages {
        uuid id PK
        uuid conversation_id FK
        string role
        text content
        timestamp created_at
        timestamp updated_at
    }

    posts {
        uuid id PK
        uuid author_id FK
        string title
        text content
        bool is_published
        timestamp created_at
        timestamp updated_at
    }

    comments {
        uuid id PK
        uuid post_id FK
        uuid author_id FK
        uuid parent_id FK
        text content
        timestamp created_at
        timestamp updated_at
    }

    news_articles {
        uuid id PK
        string title
        text summary
        timestamp published_at
        array authors
        string url UK
        string source
        string source_domain
        string category
        string sentiment_label
        float sentiment_score
        timestamp created_at
        timestamp updated_at
    }

    news_article_tickers {
        uuid id PK
        uuid article_id FK
        string ticker
        timestamp created_at
        timestamp updated_at
    }

    user_indicator_settings {
        uuid id PK
        uuid user_id FK UK
        jsonb settings
        timestamp created_at
        timestamp updated_at
    }

    users ||--o{ portfolios : "sở hữu"
    users ||--o{ watchlist_items : "theo dõi"
    users ||--o{ conversations : "có"
    users ||--o{ posts : "viết"
    users ||--o{ comments : "đăng"
    users ||--o| user_indicator_settings : "cấu hình"

    assets ||--o{ price_data : "có lịch sử giá"
    assets ||--o{ holdings : "được nắm giữ"
    assets ||--o{ watchlist_items : "xuất hiện trong"

    portfolios ||--o{ holdings : "chứa"

    conversations ||--o{ messages : "chứa"

    posts ||--o{ comments : "nhận"
    comments }o--o| comments : "parent (nullable)"

    news_articles ||--o{ news_article_tickers : "gắn ticker"
```

---

## Nhóm bảng theo chức năng

| Nhóm | Bảng |
|------|------|
| Xác thực & người dùng | `users`, `user_indicator_settings` |
| Tài sản & giá | `assets`, `price_data` |
| Danh mục đầu tư | `portfolios`, `holdings` |
| Theo dõi | `watchlist_items` |
| AI Chat | `conversations`, `messages` |
| Cộng đồng & tin tức | `posts`, `comments`, `news_articles`, `news_article_tickers` |

## Đặc điểm nổi bật của schema

**UUID làm primary key:** Tất cả bảng dùng `uuid.uuid4()` làm PK thay vì integer auto-increment — tránh collision khi merge dữ liệu, không lộ số lượng bản ghi qua ID, và an toàn hơn khi dùng trực tiếp trong URL.

**Soft reference cho tin tức:** Bảng `news_article_tickers` lưu `ticker` dưới dạng string (không FK đến `assets`) — cho phép lưu tin tức về bất kỳ ticker nào kể cả chưa có trong bảng `assets`, phù hợp với nguồn tin tức ngoài.

**JSONB cho cài đặt chỉ báo:** `user_indicator_settings.settings` dùng kiểu JSONB của PostgreSQL — lưu cấu trúc tham số indicator linh hoạt (RSI period, MACD fast/slow/signal, SMA/EMA periods) mà không cần schema cứng. PostgreSQL hỗ trợ query trực tiếp trên JSONB khi cần.

**Self-referential comment:** `comments.parent_id` trỏ về `comments.id` (nullable) — biểu diễn cây bình luận phân cấp mà không cần bảng trung gian riêng.
