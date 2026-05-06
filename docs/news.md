# Báo cáo Kỹ thuật: Module News

> **Dự án:** MarketMind  
> **Phạm vi tài liệu:** `backend/src/news/`

---

## Mục lục

1. [Tổng quát](#1-tổng-quát)
2. [Cấu trúc & thành phần](#2-cấu-trúc--thành-phần)
3. [Data Model](#3-data-model)
4. [Pipeline thu thập tin tức](#4-pipeline-thu-thập-tin-tức)
5. [Phân tích cảm xúc (Sentiment)](#5-phân-tích-cảm-xúc-sentiment)
6. [Sơ đồ luồng](#6-sơ-đồ-luồng)
7. [Hệ thống API](#7-hệ-thống-api)

---

## 1. Tổng quát

Module `news` quản lý toàn bộ vòng đời của tin tức thị trường tài chính trong MarketMind:

- **Thu thập tự động** từ Yahoo Finance (yfinance) qua Celery Beat, cứ mỗi 3 giờ và thêm 2 lần lúc NYSE mở/đóng cửa
- **Phân tích cảm xúc tự động** (BULLISH/BEARISH/NEUTRAL) bằng VADER + Loughran-McDonald lexicon
- **Lọc trùng lặp** theo URL trước khi lưu vào database
- **Phân loại** tin tức theo loại tài sản (STOCK, CRYPTO, FOREX, ETF, INDEX)
- **API tìm kiếm và lọc** đa tiêu chí với phân trang
- **Admin CRUD** để tạo/sửa/xóa bài viết thủ công

**Nguồn dữ liệu:** Yahoo Finance (qua thư viện `yfinance`)

---

## 2. Cấu trúc & thành phần

```
backend/src/news/
├── __init__.py
├── models.py       # ORM: NewsArticle, NewsArticleTicker
├── schemas.py      # Pydantic schemas
├── constants.py    # Enum: NewsCategory, SentimentLabel
├── exceptions.py   # HTTP exceptions
├── get_news.py     # Fetch + parse từ yfinance
├── sentiment.py    # VADER + LM lexicon sentiment analysis
├── tasks.py        # Celery task: ingest_assets_news
├── scheduler.py    # (Legacy — logic đã chuyển sang Celery)
└── utils.py        # Tiện ích
```

---

## 3. Data Model

```
┌─────────────────────────────────────────────────────────────────┐
│                       NewsArticle                               │
├─────────────────────────────────────────────────────────────────┤
│ id              : UUID (PK)                                     │
│ title           : String(512), not null                         │
│ summary         : Text, nullable                                │
│ published_at    : TIMESTAMP(tz), not null                       │
│ authors         : ARRAY(String), nullable                       │
│ url             : String(1024), unique, not null   ← dedup key  │
│ source          : String(256), nullable    ← tên nguồn          │
│ source_domain   : String(256), nullable    ← domain URL         │
│ category        : String(20), nullable     ← NewsCategory enum  │
│ sentiment_label : String(10), nullable     ← BULLISH/BEARISH/NEUTRAL │
│ sentiment_score : Float, nullable          ← VADER compound [-1,1] │
│ created_at      : datetime                                      │
│ updated_at      : datetime                                      │
│                                                                 │
│ tickers         : relationship → NewsArticleTicker[]            │
│                   (cascade=all, lazy=selectin)                  │
└─────────────────────────────────────────────────────────────────┘
                              │ 1:N
┌─────────────────────────────────────────────────────────────────┐
│                    NewsArticleTicker                            │
├─────────────────────────────────────────────────────────────────┤
│ id              : UUID (PK)                                     │
│ article_id      : UUID (FK → news_articles.id, CASCADE)        │
│ ticker          : String(20)                                    │
│ relevance_score : Float, nullable                               │
│                                                                 │
│ UNIQUE(article_id, ticker)  ← uq_article_ticker                 │
└─────────────────────────────────────────────────────────────────┘
```

**Indexes trên `news_articles`:**
- `ix_news_articles_category` — tăng tốc filter theo category
- `ix_news_articles_sentiment_label` — tăng tốc filter theo sentiment

**Enums:**

| Enum | Giá trị |
|---|---|
| `NewsCategory` | STOCK, CRYPTO, FOREX, ETF, INDEX, MACRO |
| `SentimentLabel` | BULLISH, BEARISH, NEUTRAL |

---

## 4. Pipeline thu thập tin tức

### 4.1 Kiến trúc tổng quan

```
Celery Beat (định kỳ)
  └─ ingest_assets_news()     [tasks.py]
      ├─ asyncio.run()
      └─ _ingest_assets_news()
          ├─ Query active assets từ DB
          ├─ get_tickers_news()   [get_news.py] → blocking I/O (thread)
          ├─ Bulk URL dedup check
          ├─ parse_yfinance_news_item() × N
          │   └─ analyze_sentiment()  [sentiment.py]
          └─ db.add_all() + commit

Manual trigger (API)
  └─ POST /news/fetch?ticker=AAPL  [router.py]
      ├─ get_ticker_news()         (hoặc dispatch Celery task)
      └─ Tương tự pipeline trên
```

### 4.2 `get_news.py` — Fetch & Parse yfinance

**yfinance trả về 2 format tùy version:**
- **v1.x (nested):** `item["content"]["title"]`, `item["content"]["canonicalUrl"]["url"]`
- **v0.2.x (flat):** `item["title"]`, `item["link"]`, `item["providerPublishTime"]`

Code xử lý cả hai format thông qua các hàm extract riêng:

```python
_extract_url(item)          → canonical URL (bất kể format)
_extract_title(item)        → tiêu đề bài viết
_extract_summary(item)      → tóm tắt (có thể rỗng)
_extract_published_at(item) → datetime (ISO string hoặc Unix timestamp)
_extract_source(item)       → (source_name, source_domain)
_extract_related_tickers(item) → ["AAPL", "MSFT", ...]
```

**Deduplication:** `get_tickers_news()` dùng `seen_urls: set[str]` để loại bỏ URL trùng **trong cùng một batch** (giữa nhiều tickers). URL đã có trong DB được loại bỏ bằng bulk query `WHERE url IN (...)`.

**Rate limiting với Yahoo Finance:**
```python
_REQUEST_DELAY = 0.3  # 300ms giữa mỗi ticker
```

### 4.3 `tasks.py` — Celery Task

```python
@celery_app.task(name="src.news.tasks.ingest_assets_news")
def ingest_assets_news():
    asyncio.run(_ingest_assets_news())
```

**Các bước trong `_ingest_assets_news()`:**

```
1. Query tất cả active assets từ DB
   → Lấy {ticker: category} mapping
   
2. asyncio.to_thread(get_tickers_news, tickers, 10)
   → Chạy blocking HTTP calls trong thread riêng
   → Trả về [(source_ticker, raw_item), ...]
   
3. Bulk check URLs đã tồn tại trong DB
   → SELECT url FROM news_articles WHERE url IN (candidate_urls)
   
4. Với mỗi item mới:
   → parse_yfinance_news_item() → NewsArticle object
   → analyze_sentiment(title, summary) → (label, score)
   
5. db.add_all(new_articles)
   → db.commit()
```

---

## 5. Phân tích cảm xúc (Sentiment)

### Kiến trúc

```
analyze_sentiment(title, summary)
    │
    ▼
text = "{title}. {summary}"
    │
    ▼
SentimentIntensityAnalyzer (VADER)
  + LM Financial Lexicon overrides
    │
    ▼
compound score ∈ [-1.0, 1.0]
    │
    ├─ score ≥ 0.05  → "BULLISH"
    ├─ score ≤ -0.05 → "BEARISH"
    └─ otherwise     → "NEUTRAL"
```

### Tại sao kết hợp VADER + Loughran-McDonald?

| Vấn đề | Giải pháp |
|---|---|
| VADER được train trên social media, thiếu từ tài chính | Thêm LM lexicon với 80+ từ chuyên ngành |
| "liability" trung tính trong VADER, nhưng tiêu cực trong finance | LM lexicon sửa lại |
| VADER xử lý tốt negation ("not profitable") | Giữ nguyên VADER base |

**Singleton pattern:**
```python
_analyzer: SentimentIntensityAnalyzer | None = None

def _get_analyzer():
    global _analyzer
    if _analyzer is None:
        _analyzer = SentimentIntensityAnalyzer()
        _analyzer.lexicon.update(_LM_LEXICON)  # merge lexicons
    return _analyzer
```

**Một số từ trong LM Lexicon:**

| Từ | Score | Loại |
|---|---|---|
| "bankruptcy", "fraud" | -3.5 | Strong negative |
| "default", "collapse" | -3.0 | Strong negative |
| "layoffs", "downgrade" | -2.5 | Negative |
| "beat", "exceeded", "upgraded" | +2.5 | Strong positive |
| "surge", "soared", "record" | +2.0 | Positive |
| "dividend", "profit", "recovery" | +1.5 | Positive |

---

## 6. Sơ đồ luồng

### Luồng Celery Ingestion (định kỳ)

```
Celery Beat (Asia/Ho_Chi_Minh)
  │
  ├─ Mỗi phút 0 của giờ chia hết 3 (e.g., 3:00, 6:00, 9:00...)
  ├─ 20:30 HCM = NYSE open
  └─ 03:00 HCM = NYSE close
  │
  ▼
ingest_assets_news.delay()
  │
  ▼
SELECT * FROM assets WHERE is_active = TRUE
  → [AAPL, TSLA, BTC-USD, VNM, ...]
  │
  ▼
[Thread] get_tickers_news(tickers, 10)
  ├─ yf.Ticker("AAPL").news[:10]  →  sleep 300ms
  ├─ yf.Ticker("TSLA").news[:10]  →  sleep 300ms
  └─ ... (URL dedup trong memory)
  │
  ▼
SELECT url FROM news_articles WHERE url IN (...)
  → existing_urls = {"https://...", ...}
  │
  ▼
For each new item:
  parse_yfinance_news_item(item, source_ticker, category)
    ├─ Extract: title, url, summary, published_at, source
    ├─ Extract related tickers
    └─ analyze_sentiment(title, summary)
        └─ VADER + LM → (label, score)
  │
  ▼
db.add_all([NewsArticle(...), ...])
db.commit()
```

### Luồng GET /news (query với filters)

```
GET /news?ticker=AAPL&sentiment=BULLISH&from_date=...&limit=20

  ├─ Validate: from_date < to_date
  │
  ├─ Xây dựng query:
  │   IF ticker:
  │     SELECT DISTINCT news_articles.*
  │     JOIN news_article_tickers ON article_id = id
  │     WHERE ticker = "AAPL"
  │   ELSE:
  │     SELECT * FROM news_articles
  │   
  │   AND sentiment_label = "BULLISH"
  │   AND published_at >= from_date
  │   ORDER BY published_at DESC
  │   LIMIT 20 OFFSET 0
  │
  └─ Return NewsArticleListResponse {items, total, skip, limit}
```

---

## 7. Hệ thống API

Tất cả endpoints có prefix `/news`.

---

### `GET /news`

Lấy danh sách tin tức với bộ lọc đa tiêu chí.

**Query Parameters:**

| Tham số | Kiểu | Default | Mô tả |
|---|---|---|---|
| `q` | string | — | Tìm kiếm từ khóa trong title và summary (ILIKE) |
| `ticker` | string | — | Lọc theo mã cổ phiếu (VD: `AAPL`) |
| `category` | NewsCategory | — | Lọc theo loại tài sản |
| `sentiment` | SentimentLabel | — | Lọc theo cảm xúc (BULLISH/BEARISH/NEUTRAL) |
| `from_date` | datetime (ISO 8601) | — | Tin tức từ ngày này |
| `to_date` | datetime (ISO 8601) | — | Tin tức đến ngày này |
| `source` | string | — | Lọc theo source domain (ILIKE) |
| `sort_by` | `published_at`\|`created_at` | `published_at` | Trường sắp xếp |
| `order` | `asc`\|`desc` | `desc` | Chiều sắp xếp |
| `skip` | int (≥0) | 0 | Phân trang: bỏ qua N bài |
| `limit` | int (1–100) | 20 | Phân trang: tối đa N bài |

**Response `200 OK`:**
```json
{
  "items": [
    {
      "id": "uuid",
      "title": "Apple Beats Q4 Earnings Estimates",
      "summary": "Apple Inc. reported...",
      "published_at": "2025-01-15T21:00:00Z",
      "authors": ["John Smith"],
      "url": "https://finance.yahoo.com/...",
      "source": "Reuters",
      "source_domain": "reuters.com",
      "category": "STOCK",
      "sentiment_label": "BULLISH",
      "sentiment_score": 0.7263,
      "tickers": [
        {"ticker": "AAPL", "relevance_score": null}
      ],
      "created_at": "...",
      "updated_at": "..."
    }
  ],
  "total": 142,
  "skip": 0,
  "limit": 20
}
```

**Lỗi:**
- `400 Bad Request` — `from_date` > `to_date`

---

### `GET /news/{news_id}`

Lấy chi tiết một bài viết.

**Response `200 OK`:** `NewsArticleResponse`

**Lỗi:** `404 Not Found`

---

### `POST /news` *(Admin only)*

Tạo bài viết thủ công.

**Headers:** `Authorization: Bearer <admin_token>`

**Request Body:**
```json
{
  "title": "VNM Reports Strong Q3 Results",
  "summary": "Vinamilk's net profit surged 15% YoY...",
  "published_at": "2025-01-15T10:00:00Z",
  "authors": ["Analyst"],
  "url": "https://example.com/article/vnm-q3",
  "source": "MarketMind Internal",
  "source_domain": "marketmind.app",
  "category": "STOCK",
  "tickers": ["VNM", "HOSE"]
}
```

Sentiment tự động được tính khi tạo bài viết.

**Response `201 Created`:** `NewsArticleResponse`

**Lỗi:**
- `403 Forbidden` — Không phải admin
- `409 Conflict` — URL đã tồn tại

---

### `POST /news/fetch`

Kích hoạt thu thập tin tức.

**Query Parameters:**
- `ticker` (string, optional) — nếu có: fetch ngay cho ticker đó
- `limit` (int, 1–50, default=20) — số bài tối đa mỗi ticker

**Behavior:**
- `ticker` có → fetch ngay, trả kết quả synchronously
- `ticker` không có → dispatch Celery task cho tất cả active assets

**Response (có ticker) `200 OK`:**
```json
{
  "message": "Successfully fetched and saved news.",
  "fetched_count": 15,
  "inserted_count": 8
}
```

**Response (không có ticker) `200 OK`:**
```json
{
  "message": "News ingestion task dispatched for all active assets.",
  "status": "queued"
}
```

---

### `PUT /news/{news_id}` *(Admin only)*

Cập nhật bài viết. Nếu `tickers` được cung cấp, toàn bộ tickers cũ sẽ bị thay thế.

**Request Body:** `NewsArticleUpdate` (tất cả trường optional)

**Response `200 OK`:** `NewsArticleResponse`

---

### `DELETE /news/{news_id}` *(Admin only)*

Xóa bài viết (cascade xóa cả `NewsArticleTicker`).

**Response:** `204 No Content`

---

**Bảng tóm tắt API:**

| Method | Endpoint | Auth | Mô tả |
|---|---|---|---|
| `GET` | `/news` | Không | Danh sách tin tức với filters |
| `GET` | `/news/{id}` | Không | Chi tiết bài viết |
| `POST` | `/news` | Admin | Tạo bài viết thủ công |
| `POST` | `/news/fetch` | Không | Trigger fetch tin tức |
| `PUT` | `/news/{id}` | Admin | Cập nhật bài viết |
| `DELETE` | `/news/{id}` | Admin | Xóa bài viết |
