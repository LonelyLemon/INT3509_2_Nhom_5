# 4.3.3 Triển Khai Từng Specialized Agent và Tập Công Cụ

Hệ thống có bốn specialized agent, mỗi agent có system prompt và bộ tool riêng phù hợp với phạm vi nhiệm vụ.

## Guide Agent

**Nhiệm vụ:** Trả lời câu hỏi về cách sử dụng ứng dụng và xử lý câu hỏi chung.

**Đặc điểm kỹ thuật:** Guide Agent là agent duy nhất **không có tools**. Toàn bộ tri thức của nó đến từ file `app_guide.md` được đọc lúc khởi tạo và nhúng vào system prompt:

```python
def _load_guide_content() -> str:
    guide_path = Path(__file__).parent.parent.parent.parent / "app_guide.md"
    if guide_path.exists():
        return guide_path.read_text(encoding="utf-8")
    return "Tài liệu hướng dẫn ứng dụng chưa được cấu hình."

@lru_cache(maxsize=1)
def get_guide_agent() -> Agent:
    guide_content = _load_guide_content()
    return Agent(model=model, system_prompt=f"...{guide_content}...")
```

Tài liệu hướng dẫn được đọc một lần khi server khởi động, không cần query DB hay gọi API — latency thấp nhất trong tất cả agent. Khi `app_guide.md` được cập nhật, chỉ cần restart server.

---

## Data Agent — 5 tools

**Nhiệm vụ:** Tra cứu dữ liệu thị trường thực — giá hiện tại, lịch sử giá, tin tức.

| Tool | Hàm backend | Mô tả |
|------|-------------|-------|
| `tool_get_latest_price` | `get_latest_price(db, ticker)` | Giá hiện tại, OHLCV, change% |
| `tool_get_price_history` | `get_price_history(db, ticker, timeframe, limit)` | Lịch sử nến OHLCV, 7 timeframe |
| `tool_get_news` | `get_news_for_ticker(db, ticker, days_back)` | Tin tức theo mã, sentiment |
| `tool_list_assets` | `list_assets(db)` | Danh sách tickers có trong hệ thống |
| `tool_get_general_news` | `get_general_news(db, days_back, limit, category, sentiment)` | Tin tức thị trường chung |

System prompt chỉ thị agent "luôn dùng tools để lấy dữ liệu thực — không bịa số liệu" và giữ phạm vi hẹp: không phân tích sâu hay tư vấn (đó là nhiệm vụ của Analysis và Advisor).

---

## Analysis Agent — 13 tools

**Nhiệm vụ:** Phân tích kỹ thuật chuyên sâu, quản lý portfolio/watchlist theo yêu cầu người dùng.

Analysis Agent có tập tool lớn nhất vì đảm nhận cả read và write:

**Read tools (7):**

| Tool | Mô tả |
|------|-------|
| `tool_get_latest_price` | Giá hiện tại |
| `tool_get_price_history` | Lịch sử OHLCV |
| `tool_calculate_technical_indicators` | RSI, MACD, SMA, EMA với cài đặt của user |
| `tool_get_news` | Tin tức theo ticker |
| `tool_compare_assets` | So sánh nhiều ticker cùng lúc |
| `tool_get_portfolio_summary` | Danh mục đầu tư và giá trị hiện tại |
| `tool_get_watchlist` | Danh sách theo dõi |
| `tool_get_market_sentiment` | Phân bổ sentiment tin tức theo thời gian |

**Write tools (5):**

| Tool | Mô tả |
|------|-------|
| `tool_create_portfolio` | Tạo portfolio mới |
| `tool_add_holding` | Thêm/tăng số lượng holding |
| `tool_update_holding` | Cập nhật số lượng |
| `tool_remove_holding` | Xóa holding khỏi portfolio |
| `tool_add_to_watchlist` | Thêm ticker vào watchlist |
| `tool_remove_from_watchlist` | Xóa ticker khỏi watchlist |

System prompt quy định rõ: khi user hỏi về portfolio/watchlist, **bắt buộc** gọi tool ngay lập tức và trả về dữ liệu thực — không được hướng dẫn user điều hướng đến trang Portfolio hay Watchlist trong UI.

---

## Advisor Agent — 7 tools (read-only)

**Nhiệm vụ:** Tư vấn đầu tư có căn cứ dữ liệu, không thao tác dữ liệu của user.

Advisor Agent có cùng read tools như Analysis Agent nhưng **không có write tools** — phù hợp với vai trò tư vấn thuần túy. System prompt bắt buộc quy trình 4 bước: lấy giá → chỉ báo kỹ thuật → tin tức → sentiment, trước khi đưa ra bất kỳ nhận định nào.

Agent luôn kết thúc response bằng disclaimer pháp lý: *"Thông tin trên chỉ mang tính tham khảo, không phải lời khuyên đầu tư chính thức."*

---

## Tổng hợp tools toàn hệ thống

| Module tool | File | Tools |
|-------------|------|-------|
| `price_tools` | `tools/price_tools.py` | `get_latest_price`, `get_price_history` |
| `indicator_tools` | `tools/indicator_tools.py` | `calculate_technical_indicators` |
| `news_tools` | `tools/news_tools.py` | `get_news_for_ticker` |
| `market_tools` | `tools/market_tools.py` | `list_assets`, `get_general_news`, `compare_assets`, `get_market_sentiment` |
| `portfolio_tools` | `tools/portfolio_tools.py` | `get_portfolio_summary` |
| `portfolio_write_tools` | `tools/portfolio_write_tools.py` | `create_portfolio`, `add_holding`, `update_holding`, `remove_holding` |
| `watchlist_tools` | `tools/watchlist_tools.py` | `get_watchlist` |
| `watchlist_write_tools` | `tools/watchlist_write_tools.py` | `add_to_watchlist`, `remove_from_watchlist` |

Tổng cộng **21 tools** phân bổ trên 8 file, chia sẻ giữa các agent theo nguyên tắc ít đặc quyền nhất (principle of least privilege): Advisor không nhận write tools, Guide không nhận tools nào.
