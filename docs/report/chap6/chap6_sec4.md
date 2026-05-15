# 6.4 Định Hướng Phát Triển Tiếp Theo

Dựa trên những hạn chế đã xác định và phản hồi từ quá trình kiểm thử, nhóm đề xuất các hướng phát triển tiếp theo được phân loại theo mức độ ưu tiên và tính khả thi trong các giai đoạn triển khai tiếp.

## Ưu tiên cao — Hoàn thiện các tính năng cốt lõi

**Theo dõi lịch sử giao dịch và tính P&L.** Đây là hạn chế ảnh hưởng trực tiếp đến giá trị thực dụng của tính năng portfolio. Hướng triển khai: thêm bảng `transactions` (ticker, quantity, price, type, timestamp) vào schema, tính `average_cost` theo phương pháp FIFO hoặc bình quân gia quyền, và bổ sung các công cụ AI (`tool_get_portfolio_performance`, `tool_get_pnl_summary`) để agent có thể trình bày hiệu suất đầu tư theo yêu cầu người dùng.

**Hệ thống cảnh báo (alert).** Triển khai price alert và sentiment alert dưới dạng Celery task định kỳ: so sánh giá hiện tại với ngưỡng người dùng thiết lập, gửi thông báo qua email (SendGrid) hoặc in-app notification. Schema cần thêm bảng `alerts` và `notification_logs`; frontend cần thêm UI quản lý cảnh báo trong trang watchlist và dashboard.

**Bộ nhớ dài hạn cho AI.** Triển khai cơ chế tóm tắt tự động lịch sử hội thoại khi conversation vượt ngưỡng token: gọi Gemini để tóm tắt N tin nhắn cũ thành một đoạn văn ngắn, lưu tóm tắt vào `conversation_summary` trong database, và truyền tóm tắt này thay cho toàn bộ lịch sử vào context của agent. Cách tiếp cận này cho phép hội thoại dài tùy ý mà không bị mất ngữ cảnh quan trọng.

## Ưu tiên trung bình — Mở rộng năng lực phân tích

**Mở rộng chỉ báo kỹ thuật.** Bổ sung các chỉ báo phổ biến chưa có: Bollinger Bands, Stochastic Oscillator, ATR (Average True Range), Volume-Weighted Average Price (VWAP), và Ichimoku Cloud. Thư viện `pandas-ta` có thể tính toàn bộ các chỉ báo này từ dữ liệu OHLCV hiện có mà không cần nguồn dữ liệu mới.

**Backtesting cơ bản.** Thêm tính năng kiểm tra chiến lược giao dịch đơn giản trên dữ liệu lịch sử: ví dụ "Mua khi RSI < 30, bán khi RSI > 70" và tính return so với buy-and-hold. Agent có thể được trang bị tool `tool_run_backtest` để thực hiện và trình bày kết quả backtesting theo yêu cầu ngôn ngữ tự nhiên. Đây sẽ là bước tiến đáng kể giúp MarketMind tiệm cận nhóm Trading Agent học thuật về năng lực đánh giá chiến lược.

**Đa nguồn dữ liệu.** Tích hợp thêm nguồn dữ liệu thứ hai (Alpha Vantage, Polygon.io hoặc Twelve Data) làm fallback khi yfinance gặp sự cố, và để bổ sung dữ liệu fundamentals (P/E ratio, EPS, revenue) mà yfinance không cung cấp ổn định. Dữ liệu cơ bản này sẽ bổ sung thêm một chiều quan trọng vào năng lực phân tích của các agent.

**Guardrails thế hệ hai.** Thay thế hoặc bổ sung tầng regex hiện tại bằng LLM classifier nhẹ (distilled model) chạy cục bộ hoặc classifier chuyên dụng như LlamaGuard. Cách này phát hiện được các tấn công tinh vi hơn mà regex bỏ sót, với độ trễ thấp (~50ms) so với gọi Gemini đầy đủ.

## Ưu tiên dài hạn — Hạ tầng và mở rộng quy mô

**Tối ưu hóa hạ tầng cho production.** Triển khai CDN (Cloudflare) cho static assets, cấu hình Redis Cluster thay vì single-instance, và thêm health check với automatic failover cho Celery workers. Load testing với Locust hoặc k6 để xác định bottleneck thực sự trước khi scale.

**Tích hợp thị trường chứng khoán Việt Nam.** Thêm dữ liệu HOSE/HNX thông qua API của SSI, VPS, hoặc scraping được phép — đây là hướng mở rộng có giá trị cao với người dùng Việt Nam, giúp MarketMind lấp đầy khoảng trống giữa CafeF (tin tức VN) và TradingView (phân tích kỹ thuật toàn cầu).

**Phân tích tài liệu tài chính (PDF).** Cho phép người dùng upload báo cáo tài chính hoặc prospectus PDF vào cuộc hội thoại, agent sử dụng document parsing để trích xuất thông tin và trả lời câu hỏi về nội dung tài liệu. Tính năng này kết hợp RAG (Retrieval-Augmented Generation) cục bộ với per-session vector store, không yêu cầu lưu embedding dài hạn.

**Cá nhân hóa AI sâu hơn.** Xây dựng hồ sơ phong cách đầu tư của từng người dùng (risk tolerance, preferred assets, investment horizon) dựa trên lịch sử tương tác với AI và portfolio. Agent Advisor có thể đọc hồ sơ này để điều chỉnh khuyến nghị phù hợp với từng người thay vì phân tích chung chung.

---

Tổng thể, MarketMind có nền tảng kỹ thuật đủ vững để phát triển theo nhiều hướng mà không cần tái kiến trúc. Kiến trúc modular của backend (routers riêng biệt, agent system có thể mở rộng độc lập), schema database có khả năng extend, và tool system dễ thêm mới là những điều kiện thuận lợi để tiếp tục phát triển sản phẩm từ nền tảng hiện có.
