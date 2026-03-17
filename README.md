# 📈 MarketMind — AI-Powered Financial Market Analysis

Một ứng dụng web phân tích thị trường tài chính được cung cấp bởi **hệ thống AI đa tác tử**. Cung cấp luồng giá thời gian thực, thông tin chi tiết do AI cung cấp thông qua trò chuyện hội thoại, tổng hợp tin tức với phân tích cảm xúc và nội dung do cộng đồng cung cấp — tất cả trong một nền tảng.

---

## 🛠 Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React, Vite, TailwindCSS, Lightweight Charts, Zustand |
| **Backend** | Python 3.13, FastAPI, SQLAlchemy, Pydantic, Celery |
| **AI** | pydantic-ai, MCP, Logfire, DeepEval, GPT-4 / Claude |
| **Database** | PostgreSQL, Qdrant (vector DB), Redis (cache & broker) |
| **DevOps** | Docker Compose, GitHub Actions CI/CD |

---

## 📂 Cấu trúc dự án

```
├── backend/          # FastAPI server, AI agents, background workers
├── frontend/         # React SPA
├── docs/             # Tài liệu dự án
├── test/             # Test suites
└── docker-compose.yml
```

---

## 📚 Hướng dẫn tài liệu

Tất cả tài liệu nằm trong thư mục [`docs/`](docs/). Sử dụng bảng dưới đây để tìm tài liệu phù hợp với mục đích của bạn.

| Tôi muốn… | Đọc tài liệu này |
|------------|-----------|
| Hiểu **phạm vi và mục tiêu của dự án** | [proposal_eng.md](docs/proposal_eng.md) · [proposal_vie.md](docs/proposal_vie.md) |
| Xem **kiến trúc hệ thống** và cách các lớp tương tác | [architecture_design.md](docs/architecture_design.md) |
| Khám phá **database schema**, bảng và luồng dữ liệu | [database_design.md](docs/database_design.md) |
| Xem **ứng dụng nên làm gì** (từng tính năng) | [functional_requirements.md](docs/functional_requirements.md) |
| Kiểm tra **tiến độ dự án** và phân công công việc hàng tuần | [planning_eng.md](docs/planning_eng.md) · [planning_vie.md](docs/planning_vie.md) |
| Tuân theo **quy ước mã hóa** và quy tắc cấu trúc thư mục | [coding_conventions.md](docs/coding_conventions.md) |
| Hiểu **chiến lược phân nhánh Git** | [git_branching_strat.md](docs/git_branching_strat.md) |

> **Lưu ý**: Các tài liệu có hậu tố `_eng` và `_vie` là phiên bản tiếng Anh và tiếng Việt của cùng một nội dung.

---

## 🚀 Hướng dẫn khởi động

```bash
# 1. Clone repository
git clone <repo-url> && cd INT3509_2_Nhom_5

# 2. Khởi chạy các dịch vụ cơ sở hạ tầng
docker compose up -d

# 3. Khởi chạy backend
cd backend
uv sync (Nếu sử dụng 'uv')
pip install -r requirements.txt (Nếu sử dụng 'pip')
alembic upgrade head         # run database migrations
uvicorn src.main:app --reload

# 4. Khởi chạy frontend
cd frontend
npm install
npm run dev
```

---
