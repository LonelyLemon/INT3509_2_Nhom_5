# 6.1.4 Trading Agent (Alpha Vantage)

Trong những năm gần đây, nhiều dự án nghiên cứu học thuật đã đề xuất các "Trading Agent" — hệ thống AI tự động phân tích và ra quyết định giao dịch dựa trên LLM, thường kết hợp với API dữ liệu tài chính như Alpha Vantage. Các dự án tiêu biểu trong nhóm này bao gồm FinAgent, FinGPT, và các hệ thống multi-agent thử nghiệm trên nền tảng nghiên cứu như GitHub. So sánh với nhóm này giúp định vị MarketMind trong bối cảnh nghiên cứu AI tài chính học thuật.

## Đặc điểm của Trading Agent học thuật

Các Trading Agent học thuật điển hình được xây dựng như hệ thống thử nghiệm khép kín: nhận dữ liệu lịch sử từ Alpha Vantage hoặc yfinance, chạy pipeline phân tích qua LLM (GPT-4, Llama), và sinh ra tín hiệu giao dịch (buy/sell/hold). Một số hệ thống phức tạp hơn triển khai multi-agent với vai trò chuyên biệt (bull analyst, bear analyst, risk manager) và cho các agent tranh luận trước khi ra quyết định.

Điểm mạnh của nhóm này là tập trung vào **chất lượng ra quyết định giao dịch**: backtesting, đánh giá Sharpe ratio, so sánh với benchmark. Một số nghiên cứu chứng minh rằng hệ thống multi-agent vượt trội đáng kể so với single-agent trong bối cảnh mô phỏng giao dịch.

## Khác biệt cơ bản với MarketMind

| Tiêu chí | Trading Agent (Alpha Vantage) | MarketMind |
|---------|-------------------------------|------------|
| Mục tiêu chính | Tự động hóa quyết định giao dịch | Hỗ trợ phân tích, không ra lệnh giao dịch |
| Người dùng | Hệ thống tự động (không có UI) | Con người (giao diện web đầy đủ) |
| Tương tác | Pipeline batch / API call | Hội thoại đa lượt real-time (SSE) |
| Giao diện | Không có (code/notebook) | Web app hoàn chỉnh (React 19) |
| Dữ liệu hiển thị | Log/report văn bản | Biểu đồ nến tương tác, indicator overlay |
| Cộng đồng | Không | Blog, diễn đàn, watchlist chia sẻ |
| Guardrails | Thường không có | Có (regex-based + rate limiting) |
| Deployment | Script/notebook | Docker Compose (PostgreSQL, Redis, FastAPI) |
| Đa ngôn ngữ | Không | Tiếng Việt + Tiếng Anh |

## Nhận xét

MarketMind và các Trading Agent học thuật giải quyết hai bài toán khác nhau. Trading Agent tập trung vào **tự động hóa giao dịch** — thay thế quyết định của con người. MarketMind tập trung vào **tăng cường năng lực phân tích** — giúp con người hiểu thị trường tốt hơn để tự ra quyết định. Đây là sự khác biệt triết học quan trọng: MarketMind không cố gắng thay thế nhà đầu tư mà cung cấp cho họ công cụ AI như một "trợ lý phân tích cá nhân".

Về mặt kỹ thuật, MarketMind phức tạp hơn đáng kể về lớp sản phẩm (UI/UX, pipeline dữ liệu nền, authentication, cộng đồng) nhưng chưa triển khai backtesting hay đánh giá hiệu quả giao dịch — một hướng mở rộng tự nhiên trong tương lai.
