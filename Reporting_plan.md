# Kế hoạch cấu trúc báo cáo — MarketMind

---

## Trang bìa & Phần mở đầu

- Trang bìa
- Tóm tắt (Abstract)
- Mục lục
- Danh sách hình ảnh
- Danh sách bảng biểu

---

## Chương 1: Giới thiệu

- 1.1 Đặt vấn đề và động lực nghiên cứu
- 1.2 Mục tiêu đề tài
- 1.3 Phạm vi và giới hạn của hệ thống
- 1.4 Tổng quan cấu trúc báo cáo

---

## Chương 2: Phân tích yêu cầu hệ thống

- 2.1 Yêu cầu nghiệp vụ
- 2.2 Yêu cầu chức năng
  - 2.2.1 FR-1: Xác thực và quản lý tài khoản
  - 2.2.2 FR-2: Bảng điều khiển dữ liệu tài chính
  - 2.2.3 FR-3: Giao diện AI Chat
  - 2.2.4 FR-4: Trang tin tức
  - 2.2.5 FR-5: Diễn đàn & Blog cộng đồng
  - 2.2.6 FR-6: Quản lý danh mục đầu tư (Portfolio)
  - 2.2.7 FR-7: Danh sách theo dõi (Watchlist)
  - 2.2.8 FR-8: Tùy chỉnh người dùng
  - 2.2.9 FR-9: Xử lý lỗi và dự phòng
  - 2.2.10 FR-10: Quản trị hệ thống (Admin)
- 2.3 Yêu cầu phi chức năng
  - 2.3.1 Hiệu năng và thời gian phản hồi
  - 2.3.2 Bảo mật
  - 2.3.3 Khả năng mở rộng
  - 2.3.4 Độ tin cậy và khả năng phục hồi
- 2.4 Sơ đồ Use Case tổng quan
- 2.5 Sơ đồ Use Case chi tiết theo nhóm chức năng

---

## Chương 3: Thiết kế hệ thống

- 3.1 Kiến trúc tổng thể
  - 3.1.1 Phân lớp hệ thống (Frontend / Backend API / AI Layer / Data Layer)
  - 3.1.2 Sơ đồ triển khai tổng quan
- 3.2 Lựa chọn công nghệ và lý do
  - 3.2.1 Frontend: React 19, Vite, TypeScript, Tailwind CSS, Zustand
  - 3.2.2 Backend: Python 3.13, FastAPI, SQLAlchemy, Pydantic-AI
  - 3.2.3 Cơ sở hạ tầng: PostgreSQL, TimescaleDB, Redis, Celery, Docker
- 3.3 Thiết kế cơ sở dữ liệu
  - 3.3.1 Sơ đồ ERD tổng thể
  - 3.3.2 Mô tả các bảng chính và quan hệ
  - 3.3.3 Chiến lược index và tối ưu truy vấn
  - 3.3.4 Tối ưu dữ liệu chuỗi thời gian với TimescaleDB
- 3.4 Thiết kế API
  - 3.4.1 Cấu trúc RESTful endpoint theo module
  - 3.4.2 Cơ chế xác thực JWT (access token + refresh token + blacklist)
  - 3.4.3 SSE Streaming cho AI Chat
- 3.5 Thiết kế hệ thống AI đa tác nhân
  - 3.5.1 Tổng quan kiến trúc multi-agent
  - 3.5.2 Intent Agent và cơ chế phân loại yêu cầu
  - 3.5.3 Các specialized agents (Guide, Data, Analysis, Advisor)
  - 3.5.4 Hệ thống công cụ (Tool System) — 21 tools
  - 3.5.5 Guardrails và cơ chế từ chối nội dung không phù hợp
- 3.6 Thiết kế luồng dữ liệu thời gian thực
  - 3.6.1 Pipeline thu thập giá (Celery Beat + yfinance)
  - 3.6.2 Pipeline thu thập và phân tích tin tức
  - 3.6.3 Chiến lược cache với Redis
- 3.7 Sơ đồ tuần tự các luồng nghiệp vụ chính
  - 3.7.1 Luồng đăng ký và xác thực
  - 3.7.2 Luồng AI Chat (SSE streaming + tool execution)
  - 3.7.3 Luồng xem biểu đồ và chỉ báo kỹ thuật

---

## Chương 4: Triển khai hệ thống

- 4.1 Môi trường và công cụ phát triển
- 4.2 Triển khai Backend và API Layer
  - 4.2.1 Cấu trúc module hóa theo router
  - 4.2.2 Dependency Injection và quản lý phiên DB
  - 4.2.3 Middleware: CORS, security headers, rate limiting
- 4.3 Triển khai hệ thống AI đa tác nhân
  - 4.3.1 Tích hợp Pydantic-AI và Google Gemini API
  - 4.3.2 Cơ chế routing qua Intent Agent
  - 4.3.3 Triển khai từng specialized agent và tập công cụ
  - 4.3.4 SSE streaming và quản lý luồng phản hồi bất đồng bộ
  - 4.3.5 Triển khai guardrails (regex-based injection detection)
- 4.4 Triển khai Frontend
  - 4.4.1 Quản lý trạng thái với Zustand
  - 4.4.2 Render biểu đồ candlestick với Lightweight Charts
  - 4.4.3 Tích hợp SSE và hiển thị streaming token
  - 4.4.4 Đa ngôn ngữ với i18next (Tiếng Anh / Tiếng Việt)
- 4.5 Triển khai pipeline dữ liệu nền
  - 4.5.1 Cấu hình Celery Beat và các scheduled task
  - 4.5.2 Thu thập và lưu trữ dữ liệu giá 1 phút
  - 4.5.3 Thu thập tin tức và phân tích tâm lý (Loughran-McDonald lexicon)
- 4.6 Các bài toán kỹ thuật phát sinh và giải pháp
  - 4.6.1 Bài toán async database trong Celery task (NullPool)
  - 4.6.2 Giới hạn tham số asyncpg và chiến lược bulk insert (chunk 2000 rows)
  - 4.6.3 Aggregation đa timeframe không lưu dư thừa (TimescaleDB `time_bucket()`)
  - 4.6.4 Xung đột dữ liệu giá thời gian thực (`ON CONFLICT DO UPDATE` vs `DO NOTHING`)
  - 4.6.5 Rate limiting AI per-user qua Redis counter
- 4.7 Đóng gói và cấu hình triển khai
  - 4.7.1 Docker Compose (PostgreSQL, Redis, FastAPI)
  - 4.7.2 Quản lý migration với Alembic
  - 4.7.3 Quản lý biến môi trường và bí mật

---

## Chương 5: Kiểm thử và Đánh giá chất lượng

- 5.1 Chiến lược kiểm thử tổng quan
- 5.2 Kiểm thử đơn vị
  - 5.2.1 Backend: pytest + pytest-asyncio
  - 5.2.2 Frontend: Vitest + React Testing Library + MSW
- 5.3 Kiểm thử tích hợp API
  - 5.3.1 FastAPI TestClient với dependency injection override
  - 5.3.2 Mock external services (yfinance, Gemini API)
- 5.4 Kiểm thử hệ thống AI
  - 5.4.1 Độ chính xác phân loại intent theo kịch bản
  - 5.4.2 Đánh giá chất lượng phản hồi (Logfire / DeepEval)
  - 5.4.3 Kiểm thử guardrails (prompt injection, jailbreak)
- 5.5 Kiểm thử hiệu năng
  - 5.5.1 Thời gian phản hồi API dưới tải thông thường
  - 5.5.2 Kiểm tra rate limiting (20 queries/60s per user)
- 5.6 Kết quả kiểm thử và nhận xét

---

## Chương 6: So sánh và thảo luận

- 6.1 So sánh với một số sản phẩm tương tự trên thị trường
  - 6.1.1 TradingView
  - 6.1.2 CafeF / VNDirect
  - 6.1.3 Bloomberg Terminal
  - 6.1.4 Trading Agent (Alpha-vantage)
- 6.2 Ưu điểm của MarketMind
- 6.3 Hạn chế hiện tại
- 6.4 Định hướng phát triển tiếp theo

---

## Kết luận

---

## Tài liệu tham khảo

---

## Phụ lục *(tùy chọn)*

- Phụ lục A: Danh sách API endpoint đầy đủ
- Phụ lục B: Kịch bản kiểm thử AI chi tiết
- Phụ lục C: Cấu hình Docker Compose
