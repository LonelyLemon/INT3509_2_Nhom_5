# 📈 TheMarketPulse — AI-Powered Financial Market Analysis

A web application for financial market analysis powered by a **multi-agent AI system**. Provides real-time price streaming, AI-driven insights via conversational chat, news aggregation with sentiment analysis, and community-driven content — all in one platform.

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

## 📂 Project Structure

```
├── backend/          # FastAPI server, AI agents, background workers
├── frontend/         # React SPA
├── docs/             # Project documentation (see below)
├── test/             # Test suites
└── docker-compose.yml
```

---

## 📚 Documentation Guide

All documentation lives in the [`docs/`](docs/) directory. Use the table below to find the right document for your purpose.

| I want to… | Read this |
|------------|-----------|
| Understand the **project scope and goals** | [proposal_eng.md](docs/proposal_eng.md) · [proposal_vie.md](docs/proposal_vie.md) |
| See the **system architecture** and how layers interact | [architecture_design.md](docs/architecture_design.md) |
| Explore the **database schema**, tables, and data flows | [database_design.md](docs/database_design.md) |
| Review **what the app should do** (feature-by-feature) | [functional_requirements.md](docs/functional_requirements.md) |
| Check the **project timeline** and weekly task breakdown | [planning_eng.md](docs/planning_eng.md) · [planning_vie.md](docs/planning_vie.md) |
| Follow **coding conventions** and folder structure rules | [coding_conventions.md](docs/coding_conventions.md) |
| Understand the **Git branching strategy** | [git_branching_strat.md](docs/git_branching_strat.md) |

> **Note**: Documents suffixed with `_eng` and `_vie` are English and Vietnamese versions of the same content.

---

## 🚀 Getting Started

```bash
# 1. Clone the repository
git clone <repo-url> && cd INT3509_2_Nhom_5

# 2. Start infrastructure services
docker compose up -d

# 3. Run the backend
cd backend
cp .env.example .env        # configure your environment variables
pip install -r requirements.txt
alembic upgrade head         # run database migrations
uvicorn src.main:app --reload

# 4. Run the frontend
cd frontend
npm install
npm run dev
```

---

## 👥 Team — Group 5

| Member | Role |
|--------|------|
| Member 1 | Frontend Developer |
| Member 2 | Backend & AI Developer |
| Member 3 | Backend & AI Developer |
