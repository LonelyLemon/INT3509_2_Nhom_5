# Architecture Design

**Project**: _"Research and design a web application for financial market analysis based on multi-agent artificial intelligence"_

---

## 1. High-Level System Architecture

The system is organized into **five distinct layers**. Each layer has a clear responsibility and communicates with adjacent layers through well-defined interfaces.

```mermaid
graph TB
    subgraph PRESENTATION["🖥️ Presentation Layer (Frontend)"]
        direction LR
        UI_DASH["Financial Dashboard"]
        UI_CHAT["AI Chat Interface"]
        UI_NEWS["News & Calendar"]
        UI_FORUM["Forum & Blog"]
        UI_PORT["Portfolio & Alerts"]
    end

    subgraph AI_ORCH["🤖 AI Orchestration Layer"]
        direction LR
        INTENT["Intent Classifier"]
        CONV["Conversation Manager"]
        MCP["MCP Server & Tools"]
        GUARD["Guardrails & Security"]
        RAG["RAG Engine"]
        EVAL["Evaluation Pipeline"]
    end

    subgraph BACKEND["⚙️ Backend / API Layer"]
        direction LR
        API["FastAPI Router"]
        AUTH["Auth & RBAC"]
        WS["WebSocket / SSE"]
        NEWS_AGG["News Aggregator"]
        PDF["PDF Pipeline"]
        ALERT_SVC["Alert Service"]
    end

    subgraph DATA_PROC["📊 Data Processing Layer"]
        direction LR
        VALID["Schema & Domain Validation"]
        CELERY["Task Queue (Celery)"]
        SENTI["Sentiment Analysis"]
        SYNC["DB Sync Engine"]
    end

    subgraph DATA_STORE["🗄️ Data & Storage Layer"]
        direction LR
        PG["PostgreSQL"]
        QD["Qdrant (Vector DB)"]
        REDIS["Redis (Cache / Broker)"]
    end

    PRESENTATION -->|"REST / WebSocket / SSE"| BACKEND
    PRESENTATION -->|"SSE (AI streaming)"| AI_ORCH

    AI_ORCH -->|"Tool calls & queries"| BACKEND
    AI_ORCH -->|"Embeddings & retrieval"| DATA_STORE
    AI_ORCH -->|"LLM API calls"| LLM["☁️ External LLMs (GPT-4, Claude)"]

    BACKEND -->|"Validated data"| DATA_PROC
    BACKEND -->|"CRUD operations"| DATA_STORE
    BACKEND -->|"Real-time prices"| EXT_DATA["☁️ External Data APIs (Alpha Vantage, Yahoo Finance, Finnhub)"]

    DATA_PROC -->|"Processed results"| DATA_STORE
    DATA_PROC -->|"Background tasks"| DATA_STORE

    style PRESENTATION fill:#1a1a2e,stroke:#e94560,color:#fff
    style AI_ORCH fill:#16213e,stroke:#0f3460,color:#fff
    style BACKEND fill:#0f3460,stroke:#533483,color:#fff
    style DATA_PROC fill:#533483,stroke:#e94560,color:#fff
    style DATA_STORE fill:#2d2d44,stroke:#e94560,color:#fff
    style LLM fill:#0d1b2a,stroke:#778da9,color:#e0e1dd
    style EXT_DATA fill:#0d1b2a,stroke:#778da9,color:#e0e1dd
```

---

## 2. Detailed Layer Breakdown

### 2.1 Presentation Layer (Frontend)

| Entity | Technology | Responsibility |
|---|---|---|
| **Financial Dashboard** | React, Lightweight Charts, Zustand | Real-time price charts, flexible drag-and-drop layout |
| **AI Chat Interface** | React, SSE consumer | Streaming AI responses, quick action buttons, multi-format output (text, table, chart) |
| **News & Economic Calendar** | React, TailwindCSS | Chronological news feed, economic calendar table |
| **Forum & Blog** | React, Rich Text Editor | User-authored articles with embedded live charts, comments, ratings, PDF import |
| **Portfolio & Alerts** | React, WebSocket consumer | Watchlist management, alert configuration UI |

**Cross-cutting**: i18n (EN/VI), Light/Dark mode, social sharing, fallback messages.

---

### 2.2 AI Orchestration Layer

This is the intelligence core. It receives user messages and orchestrates multi-agent workflows.

```mermaid
graph LR
    USER_MSG["User Message"] --> INTENT["Intent Classifier"]
    INTENT --> CONV_MGR["Conversation Manager"]
    CONV_MGR --> GUARD["Guardrails<br/>(Anti-abuse, Prompt Injection)"]
    GUARD --> AGENT_ROUTER{"Agent Router"}

    AGENT_ROUTER -->|"Market Query"| MKT_AGENT["Market Analysis Agent"]
    AGENT_ROUTER -->|"News Query"| NEWS_AGENT["News Sentiment Agent"]
    AGENT_ROUTER -->|"Portfolio Query"| PORT_AGENT["Portfolio Advisor Agent"]
    AGENT_ROUTER -->|"General Query"| GEN_AGENT["General Assistant Agent"]

    MKT_AGENT --> MCP_SRV["MCP Server"]
    NEWS_AGENT --> MCP_SRV
    PORT_AGENT --> MCP_SRV
    GEN_AGENT --> MCP_SRV

    MCP_SRV -->|"get_stock_price"| TOOL_1["Price Tool"]
    MCP_SRV -->|"analyze_technical_indicators"| TOOL_2["Technical Tool"]
    MCP_SRV -->|"get_economic_calendar"| TOOL_3["Calendar Tool"]
    MCP_SRV -->|"search_knowledge_base"| RAG_ENG["RAG Engine"]

    RAG_ENG --> QDRANT["Qdrant"]
    RAG_ENG --> LLM_API["LLM API"]

    MKT_AGENT --> LLM_API
    NEWS_AGENT --> LLM_API
    PORT_AGENT --> LLM_API
    GEN_AGENT --> LLM_API

    LLM_API --> RESPONSE["Streaming Response (SSE)"]
    RESPONSE --> LOGFIRE["Logfire (Monitoring)"]
    RESPONSE --> EVAL_PIPE["DeepEval (Evaluation)"]

    style INTENT fill:#264653,stroke:#2a9d8f,color:#fff
    style CONV_MGR fill:#264653,stroke:#2a9d8f,color:#fff
    style GUARD fill:#e76f51,stroke:#f4a261,color:#fff
    style AGENT_ROUTER fill:#2a9d8f,stroke:#e9c46a,color:#fff
    style MCP_SRV fill:#e9c46a,stroke:#264653,color:#000
    style RAG_ENG fill:#f4a261,stroke:#264653,color:#000
    style LLM_API fill:#0d1b2a,stroke:#778da9,color:#e0e1dd
```

| Entity | Tech | Description |
|---|---|---|
| **Intent Classifier** | pydantic-ai | Categorizes user intent (chart, news, analysis, general chat) |
| **Conversation Manager** | pydantic-ai, SQLAlchemy | Tracks multi-turn state, stores conversation history and user context |
| **Guardrails** | Custom middleware | Anti-abuse filter, prompt injection detection, content moderation |
| **Agent Router** | pydantic-ai | Dispatches to the correct specialized agent based on classified intent |
| **MCP Server & Tools** | MCP Protocol | Exposes callable tools (`get_stock_price`, `analyze_technical_indicators`, etc.) |
| **RAG Engine** | Qdrant + LLM | Retrieves relevant embeddings from vector DB and augments LLM context |
| **Monitoring** | Logfire | Traces agent execution, latency, token usage |
| **Evaluation** | DeepEval | LLM-as-a-Judge evaluation for response quality |
| **Caching** | Redis | Caches previous analysis results when market hasn't fluctuated |
| **Rate Limiter** | Redis | Restricts queries/minute per user to prevent budget depletion |

---

### 2.3 Backend / API Layer

```mermaid
graph TB
    CLIENT["Client (Browser)"] -->|"HTTP / WS / SSE"| FASTAPI["FastAPI Application"]

    subgraph FASTAPI_INTERNAL["FastAPI Internals"]
        direction TB
        MIDDLEWARE["Middleware Stack<br/>(CORS, CSRF, XSS, Rate Limit)"]
        AUTH_MOD["Auth Module<br/>(JWT, bcrypt, RBAC)"]
        
        subgraph ROUTERS["API Routers"]
            direction LR
            R_MARKET["Market Data Router"]
            R_USER["User Management Router"]
            R_NEWS["News Router"]
            R_FORUM["Forum / Blog Router"]
            R_PORT["Portfolio Router"]
            R_ALERT["Alert Router"]
            R_AI["AI Chat Router"]
        end
    end

    FASTAPI --> MIDDLEWARE --> AUTH_MOD --> ROUTERS

    R_MARKET -->|"Fetch prices"| EXT_API["External Data APIs"]
    R_NEWS -->|"Crawl news"| NEWS_SRC["News Sources"]
    R_AI -->|"Forward to AI"| AI_LAYER["AI Orchestration Layer"]

    ROUTERS -->|"DB operations"| PG["PostgreSQL"]
    ROUTERS -->|"Cache / Pub-Sub"| REDIS["Redis"]
    ROUTERS -->|"Background jobs"| CELERY_Q["Celery Task Queue"]

    WS_HANDLER["WebSocket Handler"] -->|"Real-time prices"| CLIENT
    SSE_HANDLER["SSE Handler"] -->|"AI stream"| CLIENT

    style FASTAPI fill:#0f3460,stroke:#533483,color:#fff
    style MIDDLEWARE fill:#533483,stroke:#e94560,color:#fff
    style AUTH_MOD fill:#533483,stroke:#e94560,color:#fff
    style ROUTERS fill:#16213e,stroke:#0f3460,color:#fff
```

| Entity | Tech | Description |
|---|---|---|
| **FastAPI Application** | FastAPI (Python 3.13) | Central HTTP server, routes all API requests |
| **Auth Module** | JWT, bcrypt | User authentication, password hashing, token issuance/verification |
| **RBAC** | Custom middleware | Role-based access control (Admin / User) |
| **Security Middleware** | FastAPI middleware | CORS, CSRF protection, XSS sanitization |
| **Market Data Router** | REST endpoints | Proxies and caches real-time price data from external providers |
| **News Aggregator** | Background worker | Crawls international financial news sources, deduplicates, stores |
| **PDF Pipeline** | PyMuPDF / pdfplumber, LangChain | Text extraction → chunking → vectorization for RAG |
| **WebSocket Handler** | FastAPI WebSockets + Redis Pub/Sub | Streams real-time price updates to connected clients |
| **SSE Handler** | FastAPI StreamingResponse | Streams AI-generated tokens word-by-word to client |
| **Alert Service** | Celery + Redis | Monitors price thresholds and news triggers, notifies users |

---

### 2.4 Data Processing Layer

```mermaid
graph LR
    subgraph INPUT["Incoming Data"]
        API_REQ["API Requests"]
        NEWS_RAW["Raw News Data"]
        PDF_RAW["Raw PDF Files"]
        PRICE_RAW["Raw Price Data"]
    end

    subgraph VALIDATION["Validation"]
        PYDANTIC["Pydantic Schema Validation"]
        DOMAIN_V["Domain Validators<br/>(Symbol, Time-range, PDF format)"]
        SPAM_F["Spam / Duplicate Filter"]
    end

    subgraph PROCESSING["Background Processing"]
        CELERY_W["Celery Workers"]
        SENTIMENT["Sentiment Analyzer"]
        PDF_PROC["PDF Processor<br/>(Extract → Chunk → Vectorize)"]
        PRICE_PROC["Price Data Normalizer"]
    end

    subgraph SYNC_ENGINE["Synchronization"]
        DB_SYNC["PostgreSQL ↔ Qdrant Sync"]
        ALEMBIC["Alembic Migrations"]
    end

    INPUT --> VALIDATION --> PROCESSING --> SYNC_ENGINE

    CELERY_W --> RABBIT["RabbitMQ / Redis<br/>(Message Broker)"]

    style INPUT fill:#264653,stroke:#2a9d8f,color:#fff
    style VALIDATION fill:#2a9d8f,stroke:#e9c46a,color:#fff
    style PROCESSING fill:#e9c46a,stroke:#e76f51,color:#000
    style SYNC_ENGINE fill:#e76f51,stroke:#264653,color:#fff
```

| Entity | Tech | Description |
|---|---|---|
| **Pydantic Validators** | Pydantic v2 | Strict schema validation for all request/response payloads |
| **Domain Validators** | Custom | Validates asset symbols, time ranges, file formats |
| **Spam Filter** | Custom | Removes duplicate/irrelevant news before sentiment analysis |
| **Celery Workers** | Celery + RabbitMQ/Redis | Execute heavy tasks asynchronously (PDF processing, historical data collection) |
| **Sentiment Analyzer** | LLM + custom pipeline | Analyzes news sentiment for market impact scoring |
| **PDF Processor** | PyMuPDF, LangChain | Extracts text → splits into chunks → generates embeddings |
| **DB Sync Engine** | Custom scheduled job | Keeps PostgreSQL and Qdrant in sync for consistent RAG results |
| **Alembic** | Alembic | Database migration management for PostgreSQL schema changes |

---

### 2.5 Data & Storage Layer

```mermaid
graph TB
    subgraph RELATIONAL["PostgreSQL (Relational)"]
        USERS_T["users"]
        ARTICLES_T["articles"]
        COMMENTS_T["comments"]
        PORTFOLIO_T["portfolios"]
        ALERTS_T["alerts"]
        CONVERSATIONS_T["conversations"]
        NEWS_T["news_articles"]
        PRICES_T["price_history"]
    end

    subgraph VECTOR["Qdrant (Vector DB)"]
        NEWS_EMB["News Embeddings"]
        PDF_EMB["PDF Document Embeddings"]
        MARKET_EMB["Market Report Embeddings"]
    end

    subgraph CACHE["Redis"]
        SESSION["Session Store"]
        RATE_LIM["Rate Limit Counters"]
        PRICE_CACHE["Price Cache"]
        AI_CACHE["AI Response Cache"]
        MSG_BROKER["Message Broker<br/>(WebSocket Pub/Sub, Celery)"]
    end

    style RELATIONAL fill:#1a1a2e,stroke:#e94560,color:#fff
    style VECTOR fill:#16213e,stroke:#0f3460,color:#fff
    style CACHE fill:#0f3460,stroke:#533483,color:#fff
```

| Store | Technology | Data Stored |
|---|---|---|
| **PostgreSQL** | PostgreSQL | Users, articles, comments, portfolios, alerts, conversations, news, price history |
| **Qdrant** | Qdrant | Vector embeddings for news, PDF documents, and market reports (used by RAG) |
| **Redis** | Redis | Session data, rate limit counters, cached prices, cached AI responses, message brokering |

---

## 3. End-to-End Request Flow

The following diagram traces a typical user interaction from the frontend through all layers and back.

```mermaid
sequenceDiagram
    actor User
    participant Frontend as 🖥️ Frontend (React)
    participant Backend as ⚙️ Backend (FastAPI)
    participant Auth as 🔐 Auth Module
    participant AI as 🤖 AI Orchestration
    participant MCP as 🔧 MCP Server
    participant LLM as ☁️ LLM API
    participant RAG as 📚 RAG Engine
    participant PG as 🗄️ PostgreSQL
    participant QD as 🔍 Qdrant
    participant Redis as ⚡ Redis

    User->>Frontend: Types "Analyze VNM stock"
    Frontend->>Backend: POST /api/chat (JWT in header)
    Backend->>Auth: Validate JWT + RBAC
    Auth-->>Backend: ✅ Authorized

    Backend->>Redis: Check rate limit
    Redis-->>Backend: ✅ Within limit

    Backend->>Redis: Check AI cache
    Redis-->>Backend: ❌ Cache miss

    Backend->>AI: Forward user message
    AI->>AI: Classify intent → "Market Analysis"
    AI->>AI: Load conversation context
    AI->>AI: Guardrail check (prompt injection, abuse)

    AI->>MCP: Call get_stock_price("VNM")
    MCP->>Backend: Fetch from external API
    Backend-->>MCP: Price data
    MCP-->>AI: VNM price = 68,500

    AI->>MCP: Call analyze_technical_indicators("VNM")
    MCP->>PG: Query historical prices
    PG-->>MCP: Historical data
    MCP-->>AI: RSI=45, MACD=bullish

    AI->>RAG: Search relevant context
    RAG->>QD: Vector similarity search
    QD-->>RAG: Related news & reports
    RAG-->>AI: Augmented context

    AI->>LLM: Generate analysis (with tools output + RAG context)
    LLM-->>AI: Streaming tokens

    AI-->>Backend: SSE stream
    Backend-->>Frontend: SSE stream (word-by-word)
    Frontend-->>User: Displays analysis progressively

    AI->>PG: Save conversation turn
    AI->>Redis: Cache analysis result
```

---

## 4. DevOps & Deployment Architecture

```mermaid
graph TB
    DEV["👨‍💻 Developer"] -->|"git push"| GH["GitHub Repository"]
    GH -->|"trigger"| GHA["GitHub Actions CI/CD"]
    GHA -->|"build & test"| DOCKER_BUILD["Docker Build"]
    GHA -->|"lint & type-check"| CHECKS["Quality Checks"]

    DOCKER_BUILD --> REGISTRY["Container Registry"]

    subgraph DOCKER_ENV["Docker Compose Environment"]
        direction TB
        FE_CONT["Frontend Container<br/>(React, Nginx)"]
        BE_CONT["Backend Container<br/>(FastAPI, Uvicorn)"]
        AI_CONT["AI Orchestration Container<br/>(pydantic-ai, MCP)"]
        PG_CONT["PostgreSQL Container"]
        QD_CONT["Qdrant Container"]
        REDIS_CONT["Redis Container"]
        RABBIT_CONT["RabbitMQ Container"]
        CELERY_CONT["Celery Worker Container"]
    end

    REGISTRY --> DOCKER_ENV

    style GHA fill:#2a9d8f,stroke:#264653,color:#fff
    style DOCKER_ENV fill:#1a1a2e,stroke:#e94560,color:#fff
```

| Component | Container | Ports |
|---|---|---|
| Frontend | React + Nginx | 80/443 |
| Backend API | FastAPI + Uvicorn | 8000 |
| AI Orchestration | pydantic-ai + MCP Server | 8001 |
| PostgreSQL | postgres:16 | 5432 |
| Qdrant | qdrant/qdrant | 6333 |
| Redis | redis:7 | 6379 |
| RabbitMQ | rabbitmq:3 | 5672/15672 |
| Celery Workers | Custom Python image | — |

---

## 5. Cross-Cutting Concerns

```mermaid
graph LR
    subgraph SECURITY["🔒 Security"]
        JWT_SEC["JWT Authentication"]
        BCRYPT_SEC["bcrypt Password Hashing"]
        RBAC_SEC["RBAC (Admin/User)"]
        XSS_SEC["XSS Protection"]
        CSRF_SEC["CSRF Protection"]
        PROMPT_SEC["Prompt Injection Defense"]
    end

    subgraph PERF["⚡ Performance"]
        CACHE_P["Redis Caching"]
        RATE_P["Rate Limiting"]
        WS_P["WebSocket Streaming"]
        SSE_P["SSE Streaming"]
        BG_P["Background Workers"]
    end

    subgraph OBS["📈 Observability"]
        LOGFIRE_O["Logfire Tracing"]
        EVAL_O["DeepEval Metrics"]
        COST_O["Token Cost Tracking"]
    end

    subgraph DX["🛠️ Developer Experience"]
        DOCKER_D["Docker Compose"]
        CI_D["GitHub Actions"]
        ALEMBIC_D["Alembic Migrations"]
        PYDANTIC_D["Pydantic Schemas"]
    end

    style SECURITY fill:#e76f51,stroke:#264653,color:#fff
    style PERF fill:#2a9d8f,stroke:#264653,color:#fff
    style OBS fill:#e9c46a,stroke:#264653,color:#000
    style DX fill:#264653,stroke:#2a9d8f,color:#fff
```
