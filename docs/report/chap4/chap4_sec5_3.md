# 4.5.3 Thu Thập Tin Tức và Phân Tích Tâm Lý

## Pipeline tổng quan

```
[Celery Beat] → ingest_assets_news
                        ↓
               yfinance.Ticker.news() (per ticker)
                        ↓
               URL deduplication (bulk query DB)
                        ↓
               parse_yfinance_news_item() + analyze_sentiment()
                        ↓
               INSERT INTO news_articles
```

## Thu thập từ yfinance

```python
NEWS_PER_TICKER = 10

async def _ingest_assets_news():
    async with TaskSessionLocal() as db:
        # Lấy danh sách ticker đang active
        result = await db.execute(select(Asset).where(Asset.is_active == True))
        assets = result.scalars().all()
        
        # Blocking HTTP call → chạy trong thread
        raw_pairs = await asyncio.to_thread(get_tickers_news, tickers, NEWS_PER_TICKER)
```

`get_tickers_news()` gọi `yf.Ticker(ticker).news` cho từng ticker với delay 0.3 giây giữa các request — tránh bị Yahoo Finance rate limit. Cross-ticker dedup theo URL xảy ra tại đây: cùng một bài báo xuất hiện trong kết quả của nhiều ticker chỉ được xử lý một lần.

## Parse hai định dạng yfinance

yfinance thay đổi format response qua các phiên bản:

```python
def _extract_url(item: dict) -> str | None:
    # v1.x: item["content"]["canonicalUrl"]["url"]
    content = item.get("content", {})
    if content:
        canonical = content.get("canonicalUrl") or {}
        url = canonical.get("url") or content.get("url")
        if url:
            return url
    # v0.2.x: item["link"]
    return item.get("link")
```

Hàm extract được viết defensive để xử lý cả hai format — không bị lỗi khi yfinance cập nhật library.

## Dedup theo URL trong DB

```python
# Kiểm tra một lần — không N queries
candidate_urls = [url for _, item in raw_pairs if (url := _url(item))]
existing_result = await db.execute(
    select(NewsArticle.url).where(NewsArticle.url.in_(candidate_urls))
)
existing_urls: set[str] = set(existing_result.scalars().all())

new_articles = []
for source_ticker, item in raw_pairs:
    url = _url(item)
    if not url or url in existing_urls:
        continue
    article = parse_yfinance_news_item(item, source_ticker, category=category)
    if article:
        new_articles.append(article)
        existing_urls.add(url)  # ngăn intra-batch duplicate
```

Tất cả URL candidate được kiểm tra trong **một** `SELECT ... WHERE url IN (...)` thay vì N query riêng lẻ — giảm DB roundtrip đáng kể khi batch có hàng chục bài. `existing_urls.add(url)` trong vòng lặp ngăn duplicate trong cùng một batch (cùng URL xuất hiện trong kết quả của hai ticker khác nhau).

## Phân tích sentiment: VADER + Loughran-McDonald

```python
def analyze_sentiment(title: str, summary: str | None = None) -> tuple[str, float]:
    text = f"{title}. {summary}" if summary else title
    compound = _get_analyzer().polarity_scores(text)["compound"]
    
    if compound >= 0.05:
        label = "BULLISH"
    elif compound <= -0.05:
        label = "BEARISH"
    else:
        label = "NEUTRAL"
    
    return label, round(compound, 4)
```

**Tại sao kết hợp VADER và LM:**

VADER là công cụ phân tích sentiment dựa trên quy tắc, được tối ưu cho mạng xã hội. Vấn đề: từ vựng tài chính có phân cực khác — "yield" (thu suất) là tốt, "liability" (nợ phải trả) là xấu, nhưng VADER mặc định cho cả hai điểm gần 0.

Loughran-McDonald (LM) Master Dictionary là từ điển 2,700+ từ tài chính được phân loại từ nghiên cứu hồ sơ SEC, xuất bản từ 1993–2025. Mỗi từ có nhãn: Negative, Positive, Uncertainty, Litigious, Constraining.

Hệ thống convert nhãn LM thành điểm số VADER-compatible và nạp vào VADER lexicon:

```python
_LM_SCORE_MAP = {
    "Negative":    -2.0,
    "Positive":    +2.0,
    "Uncertainty": -0.75,
    "Litigious":   -1.0,
    "Constraining":-0.5,
}
```

**Manual overrides** tinh chỉnh thêm các từ high-signal:

```python
_MANUAL_OVERRIDES = {
    "bankruptcy": -3.5,
    "fraud":      -3.5,
    "default":    -3.0,
    "beat":       +2.5,   # "beat expectations"
    "upgrade":    +2.5,
    "dividend":   +1.5,
    ...
}
```

Analyzer là singleton — khởi tạo một lần khi worker start, tái sử dụng cho mọi bài báo. LM CSV (~2700 dòng) được đọc một lần, không đọc lại cho từng bài.

## Kết quả lưu vào DB

Mỗi `NewsArticle` lưu: `ticker`, `title`, `summary`, `url`, `published_at`, `source_name`, `category`, `sentiment` (BULLISH/BEARISH/NEUTRAL), `sentiment_score` (float). Dữ liệu này được AI tools dùng để trả lời câu hỏi tin tức và phân tích sentiment cho agent.
