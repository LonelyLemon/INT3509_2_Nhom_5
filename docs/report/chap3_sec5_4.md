# 3.5.4 Hệ Thống Công Cụ (Tool System) — 21 Tools

Toàn bộ hệ thống AI sử dụng **21 tools** được tổ chức thành 7 nhóm chức năng, phân phối giữa ba Specialized Agent có khả năng gọi database. Mỗi tool là một hàm async nhận `RunContext[AgentDeps]` làm tham số đầu tiên — cơ chế dependency injection của Pydantic-AI — cho phép truy cập database session và user_id mà không cần biến toàn cục.

## Danh sách 21 tools theo nhóm

### Nhóm 1: Giá hiện tại (2 tools)

| Tool | Agent sử dụng | Chức năng |
|------|---------------|-----------|
| `tool_get_latest_price` | Data, Analysis, Advisor | Trả về giá 1m gần nhất: OHLC, khối lượng, thay đổi so với nến trước (change_amount, change_pct) |
| `tool_get_price_history` | Data, Analysis, Advisor | Lịch sử OHLCV theo timeframe (1m/5m/15m/30m/1h/4h/1d), giới hạn số nến tùy chỉnh |

### Nhóm 2: Phân tích kỹ thuật (1 tool)

| Tool | Agent sử dụng | Chức năng |
|------|---------------|-----------|
| `tool_calculate_technical_indicators` | Analysis, Advisor | Tính RSI, MACD, SMA, EMA sử dụng cài đặt cá nhân hóa của người dùng (lưu trong `user_indicator_settings`) |

### Nhóm 3: Tin tức và sentiment (3 tools)

| Tool | Agent sử dụng | Chức năng |
|------|---------------|-----------|
| `tool_get_news` | Data, Analysis, Advisor | Tin tức gần đây cho một mã: tiêu đề, tóm tắt, sentiment label, thời gian đăng |
| `tool_get_general_news` | Data | Tin tức tổng hợp thị trường, lọc theo category (macro/stocks/crypto) và sentiment (BULLISH/BEARISH/NEUTRAL) |
| `tool_get_market_sentiment` | Analysis, Advisor | Tổng hợp sentiment tin tức cho một mã trong N ngày: phân phối bullish/bearish/neutral, điểm trung bình, xu hướng (improving/worsening/stable) |

### Nhóm 4: So sánh và danh sách (2 tools)

| Tool | Agent sử dụng | Chức năng |
|------|---------------|-----------|
| `tool_compare_assets` | Analysis, Advisor | So sánh đồng thời nhiều tài sản: giá hiện tại + chỉ báo kỹ thuật; gọi một lần thay vì nhiều lần riêng lẻ |
| `tool_list_assets` | Data | Danh sách toàn bộ tài sản đang theo dõi trong hệ thống, nhóm theo loại (stock, crypto, forex...) |

### Nhóm 5: Đọc portfolio và watchlist (2 tools)

| Tool | Agent sử dụng | Chức năng |
|------|---------------|-----------|
| `tool_get_portfolio_summary` | Analysis, Advisor | Holdings của người dùng với giá trị thị trường hiện tại và phần trăm phân bổ |
| `tool_get_watchlist` | Analysis, Advisor | Danh sách watchlist với giá hiện tại và thay đổi |

### Nhóm 6: Ghi portfolio (4 tools)

| Tool | Agent sử dụng | Chức năng |
|------|---------------|-----------|
| `tool_create_portfolio` | Analysis | Tạo portfolio mới với tên và mô tả tùy chọn |
| `tool_add_holding` | Analysis | Thêm hoặc tăng số lượng holding; nếu mã đã tồn tại thì cộng thêm vào số lượng hiện có |
| `tool_update_holding` | Analysis | Cập nhật số lượng holding (set giá trị mới, không cộng) |
| `tool_remove_holding` | Analysis | Xóa hoàn toàn một holding khỏi portfolio |

### Nhóm 7: Ghi watchlist (2 tools)

| Tool | Agent sử dụng | Chức năng |
|------|---------------|-----------|
| `tool_add_to_watchlist` | Analysis | Thêm mã vào watchlist người dùng; không lỗi nếu mã đã tồn tại (silent) |
| `tool_remove_from_watchlist` | Analysis | Xóa mã khỏi watchlist |

## Phân phối tools giữa các agent

```
Guide Agent:    0 tools
Data Agent:     5 tools  (get_latest_price, get_price_history, get_news, list_assets, get_general_news)
Analysis Agent: 14 tools (tất cả trừ get_general_news, thêm compare, sentiment, portfolio write/read, watchlist write/read)
Advisor Agent:  8 tools  (get_latest_price, get_price_history, calc_indicators, get_news, get_sentiment, compare, portfolio_summary, watchlist)
```

## Cơ chế tool execution trong Pydantic-AI

Khi Gemini quyết định gọi một tool, Pydantic-AI interceptor thực thi hàm async tương ứng trong event loop hiện tại của FastAPI — không tạo thread mới. Tool nhận `ctx.deps` (AgentDeps) để truy cập database, thực thi query, và trả về `dict`. Pydantic-AI chuyển kết quả thành tool response message gửi lại Gemini, và Gemini tiếp tục sinh văn bản dựa trên dữ liệu đó.

Trong quá trình streaming, khi agent đang thực thi tool, SSE stream tạm ngừng gửi token văn bản và gửi event `tool` về frontend (chứa tên tool đang chạy) để người dùng biết hệ thống đang tìm kiếm dữ liệu.
