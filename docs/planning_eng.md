# Project Plan & Timeline

**Project**: Web Application for Financial Market Analysis Based on Multi-Agent AI  
**Duration**: 09/03/2026 – 24/05/2026 (11 weeks, 55 working days)

---

## Team

| Code | Role | Responsibilities |
|------|------|------------------|
| **FE** | Frontend Developer | React, TailwindCSS, Lightweight Charts, Zustand, UI/UX |
| **BE1** | Backend-AI Developer 1 | AI orchestration, LLM integration, RAG, pydantic-ai, evaluation |
| **BE2** | Backend-AI Developer 2 | FastAPI APIs, database, infrastructure, DevOps, security |

---

## Phase 1: Foundation & Setup (Week 1–2)

### Week 1 — Mar 9–13: Project Scaffolding & Auth

| Day | Date | Assignee | Task | Completion Criteria |
|-----|------|----------|------|---------------------|
| Mon | 09/03 | **ALL** | Project kickoff: finalize Git branching strategy, set up repo structure, agree on coding conventions | Repo initialized with agreed folder structure and `README.md` |
| Mon | 09/03 | **BE2** | Docker Compose setup: PostgreSQL, Qdrant, Redis containers | `docker compose up` launches all services; health checks pass |
| Mon | 09/03 | **BE1** | FastAPI project scaffold: folder structure, config, `.env` management | FastAPI server starts and responds to a basic health check request |
| Mon | 09/03 | **FE** | React + Vite scaffold, TailwindCSS setup, ESLint/Prettier config | `npm run dev` launches the app with a styled placeholder page |
| Tue | 10/03 | **BE2** | Database schema design: define all core entities and relationships for the application | ERD diagram or migration files reviewed and committed |
| Tue | 10/03 | **BE1** | SQLAlchemy models + Alembic migration setup for all core entities | Migrations run successfully; tables created in PostgreSQL |
| Tue | 10/03 | **FE** | Design system: color palette, typography (Google Fonts), CSS variables for dark/light mode | Design tokens defined; dark/light toggle switches all colors correctly |
| Wed | 11/03 | **BE2** | GitHub Actions CI/CD pipeline: lint, test, build on PR | A test PR triggers the pipeline successfully |
| Wed | 11/03 | **BE1** | Implement authentication APIs for registering, login, and token refresh with JWT + bcrypt | Auth APIs return correct JWT tokens; passwords stored as bcrypt hashes |
| Wed | 11/03 | **FE** | Auth pages UI: Login and Register forms with validation | Both pages render correctly with client-side validation feedback |
| Thu | 12/03 | **BE2** | RBAC middleware (Admin/User roles), permission decorators | Protected resources return `403` for unauthorized roles |
| Thu | 12/03 | **BE1** | Auth completion: implement logout, password change, and email verification features | All auth features tested and documented in Swagger |
| Thu | 12/03 | **FE** | Auth integration: connect Login/Register pages to backend API, token storage | User can register, log in, and see protected content |
| Fri | 13/03 | **BE2** | Redis integration: rate limiting middleware (configurable requests/min/user) | Rate-limited requests return `429` after threshold; limits configurable |
| Fri | 13/03 | **BE1** | Implement user management APIs for retrieving/updating profile and account settings | User management APIs return and update user data correctly |
| Fri | 13/03 | **FE** | User profile page UI + connection to user management API | Profile page displays and edits user info, persists changes |

### Week 2 — Mar 16–20: Core Data APIs & Dashboard Layout

| Day | Date | Assignee | Task | Completion Criteria |
|-----|------|----------|------|---------------------|
| Mon | 16/03 | **BE1** | Third-party data provider integration: connect to Alpha Vantage / Yahoo Finance / Finnhub for price data | Fetching real-time and historical price data returns valid JSON |
| Mon | 16/03 | **BE2** | WebSocket server setup (FastAPI WebSocket endpoint) for real-time price streaming | WebSocket client can connect and receive test price messages |
| Mon | 16/03 | **FE** | Main dashboard layout: header, sidebar, flexible content blocks (resizable panels) | Dashboard renders with draggable/resizable layout blocks |
| Tue | 17/03 | **BE1** | Implement price data APIs for retrieving real-time quotes, historical data, and batch queries | APIs return structured price data with correct time ranges |
| Tue | 17/03 | **BE2** | WebSocket price streaming: subscribe/unsubscribe to symbols, broadcast real-time ticks | Multiple clients receive price updates for subscribed symbols |
| Tue | 17/03 | **FE** | Lightweight Charts integration: candlestick chart component with zoom/pan | Chart renders real candlestick data with interactive controls |
| Wed | 18/03 | **BE1** | Implement technical indicators API: SMA, EMA, RSI, MACD calculations | APIs return correct calculated values for given symbol/timeframe |
| Wed | 18/03 | **BE2** | Data validation middleware: Pydantic schemas for Symbol, Time-range, price requests | Invalid inputs return clear `422` errors with field-level messages |
| Wed | 18/03 | **FE** | Symbol selector/search component + chart switching | User can search symbols and switch the chart view dynamically |
| Thu | 19/03 | **BE1** | Price data caching with Redis (TTL-based, invalidate on significant changes) | Repeated requests served from cache; cache miss fetches fresh data |
| Thu | 19/03 | **BE2** | News data source integration: connect to financial news APIs (Finnhub News, etc.) | Raw news data fetched and structured into internal news model |
| Thu | 19/03 | **FE** | Watchlist sidebar component (add/remove symbols, show live mini-prices) | Sidebar displays user's symbols with live price indicators |
| Fri | 20/03 | **BE1** | Price API testing, error handling, edge cases (market closed, invalid symbols) | All edge cases return appropriate error responses; test suite passes |
| Fri | 20/03 | **BE2** | Economic calendar data integration (Finnhub/Investing.com scraper) | Calendar events fetched with date, country, impact level, actual/forecast values |
| Fri | 20/03 | **FE** | Dashboard responsive layout polish + Light/Dark mode toggle finalization | Dashboard is usable on tablet & desktop; mode toggle persists preference |

---

## Phase 2: AI Core & Chat (Week 3–4)

### Week 3 — Mar 23–27: AI Agent Setup & Chat Interface

| Day | Date | Assignee | Task | Completion Criteria |
|-----|------|----------|------|---------------------|
| Mon | 23/03 | **BE1** | pydantic-ai agent scaffold: configure LLM connections (GPT-4, Claude), model selection logic | Agent initializes and returns a basic response from each LLM provider |
| Mon | 23/03 | **BE2** | MCP server setup: FastAPI-based MCP server with tool registration framework | MCP server starts; tools can be registered and listed via API |
| Mon | 23/03 | **FE** | AI Chat interface layout: message list panel, input box, send button, conversation drawer | Chat UI renders with scrollable message history and input area |
| Tue | 24/03 | **BE1** | LLM fallback mechanism: auto-switch on failure/timeout, priority chain configuration | When primary LLM fails, agent seamlessly falls back to secondary |
| Tue | 24/03 | **BE2** | MCP tools implementation: tools for fetching stock prices and analyzing technical indicators | Tools callable via MCP protocol; return correct live data |
| Tue | 24/03 | **FE** | Chat message renderers: text with markdown, data table, inline chart components | Messages display correctly in all 3 formats (text, table, chart) |
| Wed | 25/03 | **BE1** | Conversation management: multi-turn state tracking, user context storage in DB | Conversation history persists across sessions; context window managed |
| Wed | 25/03 | **BE2** | MCP tools implementation: tools for retrieving economic calendar events and summarizing news | All MCP tools return accurate, formatted data |
| Wed | 25/03 | **FE** | Quick action buttons: pre-built FAQ prompts ("Analyze VNM", "Summarize today's news") | Clicking a button populates the input and sends the query |
| Thu | 26/03 | **BE1** | Intent classification: route user queries to correct agent/tool | Classification correctly identifies chart, news, analysis, and general intents |
| Thu | 26/03 | **BE2** | Implement SSE-based streaming for AI responses word-by-word | SSE stream sends tokens as they are generated; client receives incremental text |
| Thu | 26/03 | **FE** | SSE integration: real-time AI response rendering (word-by-word streaming) | Chat displays AI response as it streams in, with typing indicator |
| Fri | 27/03 | **BE1** | Implement chat APIs for sending messages, retrieving chat history, and listing conversations | Chat APIs work end-to-end: send message → get streamed AI response |
| Fri | 27/03 | **BE2** | Conversation history storage: save/retrieve full chat threads from DB | Chat history loaded on page refresh; old conversations browsable |
| Fri | 27/03 | **FE** | Chat history drawer: list past conversations, load selected conversation | User can browse and resume past chat sessions |

### Week 4 — Mar 30 – Apr 3: AI Safety, News System & Background Jobs

| Day | Date | Assignee | Task | Completion Criteria |
|-----|------|----------|------|---------------------|
| Mon | 30/03 | **BE1** | Guardrail mechanism: topic filtering, response safety checks, anti-abuse rules | Off-topic or abusive queries get appropriate rejection messages |
| Mon | 30/03 | **BE2** | Celery + Redis/RabbitMQ setup: background worker infrastructure | Celery worker starts; a test task executes asynchronously and logs result |
| Mon | 30/03 | **FE** | News page layout: timeline view, category filters, search bar | News page renders with placeholder data in timeline format |
| Tue | 31/03 | **BE1** | Prompt injection protection: input sanitization, system prompt isolation, detection rules | Known prompt injection attempts are blocked; system prompt never leaked |
| Tue | 31/03 | **BE2** | News aggregator background task: periodic crawling from multiple sources | Celery beat schedules crawling; news stored in DB automatically every N minutes |
| Tue | 31/03 | **FE** | News article cards: title, source, sentiment badge, timestamp, preview text | News cards display all fields; clicking opens full article view |
| Wed | 01/04 | **BE1** | Context window management: token counting, conversation pruning, summarization | Long conversations are automatically summarized to stay within token limits |
| Wed | 01/04 | **BE2** | News sentiment analysis pipeline (LLM-based, runs as background job) | Each news article gets a sentiment score (positive/neutral/negative) stored in DB |
| Wed | 01/04 | **FE** | Economic calendar page: table with date/time, event, country flag, impact, actual/forecast | Calendar renders real data with filtering by date range and country |
| Thu | 02/04 | **BE1** | Logfire monitoring integration: trace AI agent calls, log token usage, latency | Logfire dashboard shows request traces, token consumption, and error rates |
| Thu | 02/04 | **BE2** | Implement news APIs for listing, filtering (by date/sentiment/source), and retrieving single articles | APIs return paginated news with filtering; single article retrieval works |
| Thu | 02/04 | **FE** | Calendar filtering controls: by country, importance level, date range picker | Filters correctly narrow displayed events; combined filters work |
| Fri | 03/04 | **BE1** | AI agent end-to-end testing: test all intent paths with sample queries | Test suite covers ≥ 10 representative queries; all return valid responses |
| Fri | 03/04 | **BE2** | Implement economic calendar APIs for listing and filtering events by date, country, and importance | Calendar APIs return structured events with correct filtering |
| Fri | 03/04 | **FE** | News + Calendar page UI polish: loading states, empty states, error handling | Pages handle all states gracefully (loading spinner, "no results", API error) |

---

## Phase 3: RAG, Portfolio & Alerts (Week 5–6)

### Week 5 — Apr 6–10: RAG Integration & Portfolio Management

| Day | Date | Assignee | Task | Completion Criteria |
|-----|------|----------|------|---------------------|
| Mon | 06/04 | **BE1** | Qdrant vector store setup: collection schemas, embedding model selection | Qdrant collections created; test document embedded and retrieved successfully |
| Mon | 06/04 | **BE2** | Portfolio/Watchlist API design: data models, endpoint specifications | API spec documented in Swagger with all CRUD operations defined |
| Mon | 06/04 | **FE** | Portfolio management page layout: holdings table, add asset form, summary cards | Page renders with table structure and add-asset modal |
| Tue | 07/04 | **BE1** | Document embedding pipeline: chunk financial reports → embed → store in Qdrant | Sample financial documents chunked and stored; similarity search returns relevant chunks |
| Tue | 07/04 | **BE2** | Implement portfolio CRUD APIs for adding, removing, and editing holdings with quantity, buy price, and date | All CRUD operations work; portfolio value calculated from live prices |
| Tue | 07/04 | **FE** | Portfolio UI: add/edit/delete assets, quantity & price inputs, confirmation dialogs | User can manage portfolio entries; changes persist after refresh |
| Wed | 08/04 | **BE1** | RAG retrieval chain: integrate vector search into AI agent's reasoning pipeline | AI agent queries Qdrant for context before generating financial analysis responses |
| Wed | 08/04 | **BE2** | Implement watchlist CRUD APIs for adding/removing symbols, reordering, and setting preferences | Watchlist APIs tested; symbols persist per user account |
| Wed | 08/04 | **FE** | Watchlist management: drag-to-reorder, quick-add from chart, remove with swipe | Watchlist fully interactive; changes sync with backend |
| Thu | 09/04 | **BE1** | RAG quality testing: measure retrieval relevance on financial queries | Retrieval precision ≥ 70% on test query set; irrelevant chunks filtered out |
| Thu | 09/04 | **BE2** | Portfolio data validation + edge cases (duplicate symbols, negative quantities) | Invalid inputs rejected with clear error messages |
| Thu | 09/04 | **FE** | Portfolio dashboard widgets: pie chart (allocation), total value, P&L summary card | Widgets display correct aggregated portfolio data |
| Fri | 10/04 | **BE1** | RAG optimization: chunk size tuning, embedding model comparison, re-ranking | Response quality improved; latency within acceptable range (< 3s) |
| Fri | 10/04 | **BE2** | Portfolio/Watchlist API integration testing | End-to-end tests pass for all portfolio and watchlist flows |
| Fri | 10/04 | **FE** | WebSocket integration: live price updates on watchlist & portfolio values | Prices update in real-time without page refresh |

### Week 6 — Apr 13–17: Alert System & Community Forum

| Day | Date | Assignee | Task | Completion Criteria |
|-----|------|----------|------|---------------------|
| Mon | 13/04 | **BE1** | Alert system core: alert models (price threshold, sentiment-based), trigger logic | Alert triggers fire correctly when conditions are met in test scenarios |
| Mon | 13/04 | **BE2** | Alert storage & delivery: DB models, WebSocket notification push mechanism | Triggered alerts saved to DB and pushed to connected clients via WebSocket |
| Mon | 13/04 | **FE** | Forum/Blog page layout: post list, create post button, category sidebar | Forum page renders with post cards and navigation |
| Tue | 14/04 | **BE1** | Price alert monitor: background task checking price thresholds periodically | Price alerts trigger within 1 minute of threshold breach; notification sent |
| Tue | 14/04 | **BE2** | Implement alert CRUD APIs for creating, reading, updating, deleting, and listing active alerts per user | All alert CRUD APIs work; user can manage their alerts |
| Tue | 14/04 | **FE** | Rich text editor integration (e.g., TipTap/Slate) for blog post creation | Editor supports bold, italic, headings, lists, code blocks, images |
| Wed | 15/04 | **BE1** | AI-driven alert: detect extremely negative sentiment from news analysis | Sentiment alert fires when aggregated news sentiment drops below threshold |
| Wed | 15/04 | **BE2** | Alert notification delivery: in-app notification center + WebSocket push | Notifications appear in real-time in the notification bell/panel |
| Wed | 15/04 | **FE** | Live chart embedding in blog posts: insert interactive Lightweight Charts into editor | Charts in posts are interactive (zoom/pan), not static images |
| Thu | 16/04 | **BE1** | AI analysis caching: store and reuse recent analysis results (Redis, configurable TTL) | Identical queries within TTL return cached response; cache invalidated on market change |
| Thu | 16/04 | **BE2** | Implement article/post CRUD APIs supporting markdown/HTML content, author info, and timestamps | Posts created, listed, updated, deleted via APIs; content renders correctly |
| Thu | 16/04 | **FE** | Comment section & star rating UI (1–5 stars) under each post | Users can comment and rate; average rating displayed on post card |
| Fri | 17/04 | **BE1** | Alert system end-to-end testing (price + sentiment alerts) | All alert types tested; false positive rate acceptable |
| Fri | 17/04 | **BE2** | Implement comment and rating APIs for adding/listing comments and submitting/updating ratings with average calculation | Comment threads work; rating average updates correctly on new submissions |
| Fri | 17/04 | **FE** | Forum post list + detail page: pagination, sorting (newest/top-rated), author profile link | Forum is browsable with sorting/pagination; post detail shows full content + comments |

---

## Phase 4: PDF Processing & Security Hardening (Week 7)

### Week 7 — Apr 20–24: PDF Pipeline, Security & Social Sharing

| Day | Date | Assignee | Task | Completion Criteria |
|-----|------|----------|------|---------------------|
| Mon | 20/04 | **BE1** | PDF text extraction pipeline: PyMuPDF/pdfplumber integration, structured text output | Uploaded PDF returns extracted text with preserved structure (headings, paragraphs, tables) |
| Mon | 20/04 | **BE2** | XSS protection: sanitize rich text inputs (bleach/DOMPurify server-side), CSP headers | Injected `<script>` tags in forum posts are stripped; CSP headers present in responses |
| Mon | 20/04 | **FE** | PDF upload UI: drag-and-drop zone, progress bar, file type validation | User can upload PDF; progress shown; non-PDF files rejected with message |
| Tue | 21/04 | **BE1** | PDF chunking pipeline: split extracted text into semantic chunks for vectorization | PDF content split into meaningful chunks (by section/paragraph); chunk metadata preserved |
| Tue | 21/04 | **BE2** | CSRF protection: token-based CSRF middleware for all state-changing endpoints | State-changing requests without valid CSRF token return `403` |
| Tue | 21/04 | **FE** | PDF preview component: display extracted content before confirming import | User sees a preview of PDF text content and can confirm or cancel import |
| Wed | 22/04 | **BE1** | PDF vectorization: embed chunks → store in Qdrant with source metadata | PDF chunks searchable in Qdrant; retrieval returns chunks with source file reference |
| Wed | 22/04 | **BE2** | Security audit: review all endpoints for auth, input validation, error leakage | Audit report generated; all critical findings addressed |
| Wed | 22/04 | **FE** | Alert management page: create alert form (symbol, condition, threshold), active alerts list | User can create, view, edit, and delete alerts through the UI |
| Thu | 23/04 | **BE1** | PDF + RAG integration: AI agent uses imported PDFs as knowledge context | Asking questions about uploaded PDF content returns accurate answers from the document |
| Thu | 23/04 | **BE2** | Rate limiting fine-tuning: per-endpoint limits, premium vs free tier configuration | Different endpoints have appropriate rate limits; premium users get higher limits |
| Thu | 23/04 | **FE** | Alert notification display: toast notifications, notification bell with unread count | Real-time alerts appear as toasts; notification panel shows history with read/unread |
| Fri | 24/04 | **BE1** | PDF pipeline end-to-end testing: upload → extract → chunk → vectorize → query | Full pipeline tested with 5+ real PDF documents; retrieval accuracy acceptable |
| Fri | 24/04 | **BE2** | Security testing: automated tests for auth bypass, XSS, CSRF, SQL injection, prompt injection | Security test suite passes; no critical vulnerabilities found |
| Fri | 24/04 | **FE** | Social sharing: generate shareable links for charts & AI chat analysis logs | Share button generates a unique URL; opening it shows the shared chart/analysis |

---

## Phase 5: i18n, Evaluation & Integration (Week 8–9)

### Week 8 — Apr 27 – May 1: Internationalization, Evaluation & Fallbacks

| Day | Date | Assignee | Task | Completion Criteria |
|-----|------|----------|------|---------------------|
| Mon | 27/04 | **BE1** | DeepEval setup: evaluation framework for AI agent quality (LLM-as-a-Judge) | Evaluation pipeline runs; sample test cases scored by judge LLM |
| Mon | 27/04 | **BE2** | API documentation review: ensure all endpoints documented in OpenAPI/Swagger | Swagger UI shows all endpoints with request/response schemas and examples |
| Mon | 27/04 | **FE** | i18n framework setup: `react-i18next`, language context, translation file structure | Language switching infrastructure works with English placeholder strings |
| Tue | 28/04 | **BE1** | Evaluation test cases: create single-turn and multi-turn test scenarios (≥ 20 cases) | Test case suite covers all major intents; results logged with scores |
| Tue | 28/04 | **BE2** | Backend i18n: error messages and API responses support `Accept-Language` header | API returns Vietnamese or English error messages based on header |
| Tue | 28/04 | **FE** | Vietnamese translations: translate all UI strings (nav, labels, messages, errors) | Full app renders correctly in Vietnamese with no missing translations |
| Wed | 29/04 | **BE1** | AI quality metrics: measure response relevance, accuracy, helpfulness; identify weak areas | Quality report generated; areas below threshold identified for improvement |
| Wed | 29/04 | **BE2** | Database optimization: add indexes, optimize slow queries, connection pooling | Slow queries (> 500ms) optimized; database handles concurrent users efficiently |
| Wed | 29/04 | **FE** | Language switcher component: toggle in header, persist preference in localStorage | User language preference persists across sessions; all content switches instantly |
| Thu | 30/04 | **BE1** | AI agent improvements: refine prompts and tool usage based on evaluation feedback | Evaluation scores improve by ≥ 10% on previously weak test cases |
| Thu | 30/04 | **BE2** | Fallback data: prepare internal/cached data for critical endpoints during API outages | When external APIs fail, system serves cached data with "last updated" timestamp |
| Thu | 30/04 | **FE** | Fallback UI: error boundaries, API-down banners, offline mode indicators | Users see friendly fallback messages instead of broken pages during outages |
| Fri | 01/05 | **ALL** | Integration checkpoint: connect all remaining frontend pages to backend APIs | All pages fetch real data from backend; no hardcoded placeholder data remains |

### Week 9 — May 4–8: Full Integration Testing

| Day | Date | Assignee | Task | Completion Criteria |
|-----|------|----------|------|---------------------|
| Mon | 04/05 | **ALL** | Integration test: Auth flow — register → login → profile → role-based access | Complete auth journey works end-to-end; RBAC enforced on both FE and BE |
| Mon | 04/05 | **FE** | Bug fixes from auth integration testing | All auth-related UI bugs resolved |
| Tue | 05/05 | **ALL** | Integration test: Dashboard — price data, WebSocket streaming, chart interactions, watchlist | Dashboard loads prices, streams updates, charts render correctly, watchlist syncs |
| Tue | 05/05 | **FE** | Performance optimization: lazy loading routes, code splitting, image optimization | Lighthouse performance score ≥ 80; initial bundle size reduced |
| Wed | 06/05 | **ALL** | Integration test: AI Chat — send query → SSE streaming → multi-format response → history | Full chat flow works: streaming, table/chart rendering, conversation persistence |
| Wed | 06/05 | **BE1** | AI response quality spot-check: test 20 real-world queries manually | ≥ 80% of responses rated satisfactory by manual review |
| Thu | 07/05 | **ALL** | Integration test: News + Calendar + Alert system end-to-end | News page loads aggregated data; calendar filters work; alerts trigger and notify |
| Thu | 07/05 | **BE2** | Background job reliability: verify Celery tasks recover from failures, no data loss | Failed tasks retry correctly; no orphaned jobs after simulated crashes |
| Fri | 08/05 | **ALL** | Integration test: Forum (create/comment/rate) + PDF import + Portfolio management | All community and portfolio features work end-to-end |
| Fri | 08/05 | **FE** | Responsive design testing: verify all pages on 1024px, 1280px, 1920px viewports | No layout breaks on any tested viewport; scroll behavior correct |

---

## Phase 6: Polish, Optimization & Delivery (Week 10–11)

### Week 10 — May 11–15: Bug Fixes, Performance & Polish

| Day | Date | Assignee | Task | Completion Criteria |
|-----|------|----------|------|---------------------|
| Mon | 11/05 | **ALL** | Critical bug fix sprint: address all P0/P1 bugs from integration testing | All critical and high-priority bugs resolved and verified |
| Tue | 12/05 | **ALL** | Medium/low priority bug fixes: address remaining P2/P3 issues | Bug backlog reduced to cosmetic-only issues |
| Wed | 13/05 | **BE1** | AI agent performance tuning: reduce average response latency, optimize prompts | Average AI response time ≤ 5 seconds; token usage optimized |
| Wed | 13/05 | **BE2** | Backend performance profiling: identify and fix bottlenecks (slow endpoints, memory leaks) | All API endpoints respond within 500ms (excluding AI calls); no memory leaks |
| Wed | 13/05 | **FE** | UI/UX polish: micro-animations, transitions, hover effects, loading skeletons | UI feels smooth and premium; no janky transitions or layout shifts |
| Thu | 14/05 | **BE1** | Logfire monitoring dashboards: set up key metrics (latency, errors, token usage, uptime) | Dashboard shows real-time system health; alerting configured for anomalies |
| Thu | 14/05 | **BE2** | Load testing: simulate concurrent users with Locust or similar tool | System handles ≥ 50 concurrent users without degradation |
| Thu | 14/05 | **FE** | Accessibility review: keyboard navigation, ARIA labels, color contrast | Core flows navigable by keyboard; contrast ratios meet WCAG AA |
| Fri | 15/05 | **ALL** | End-to-end smoke test: walk through every major feature as a new user | All features work in a continuous user journey without errors |

### Week 11 — May 18–24: Documentation, Deployment & Delivery

| Day | Date | Assignee | Task | Completion Criteria |
|-----|------|----------|------|---------------------|
| Mon | 18/05 | **ALL** | Final bug fixes: resolve any remaining issues from smoke testing | Zero known P0–P2 bugs |
| Tue | 19/05 | **BE1** | Technical documentation: AI architecture, agent flow diagrams, prompt engineering guide | Documentation covers all AI components; new developer can understand the system |
| Tue | 19/05 | **BE2** | API documentation: finalize Swagger, write deployment guide, environment variable reference | Complete API docs with examples; deployment guide tested by another team member |
| Tue | 19/05 | **FE** | Frontend documentation: component library guide, design system docs, build instructions | Frontend can be built and run by following the documentation alone |
| Wed | 20/05 | **BE2** | Docker Compose production config: optimized builds, environment separation, health checks | `docker compose -f docker-compose.prod.yml up` launches production-ready stack |
| Wed | 20/05 | **BE1** | Deployment dry run: deploy full stack, verify all services communicate correctly | Full application accessible via production URL; all features functional |
| Wed | 20/05 | **FE** | Production build: optimize, verify no console errors, test in production mode | `npm run build` succeeds; production app has no errors in browser console |
| Thu | 21/05 | **ALL** | Final QA: comprehensive testing of production deployment | QA checklist (all major features) completed with ✅ on every item |
| Fri | 22/05 | **ALL** | Demo preparation: prepare presentation slides, demo script, talking points | Presentation ready; demo rehearsed and runs smoothly |
| Sat–Sun | 23–24/05 | **ALL** | **Buffer**: last-minute fixes, final rehearsal, project submission | Project submitted on time with all deliverables |

---

## Summary Timeline

```
Week  1  (Mar 09–13) ██ Foundation: scaffolding, Docker, auth, CI/CD
Week  2  (Mar 16–20) ██ Core Data: price APIs, WebSocket, dashboard layout, charts
Week  3  (Mar 23–27) ██ AI Core: LLM agents, MCP server, chat interface, SSE streaming
Week  4  (Mar 30–Apr 03) ██ AI Safety: guardrails, prompt injection, news system, background jobs
Week  5  (Apr 06–10) ██ RAG & Portfolio: vector search, portfolio/watchlist APIs & UI
Week  6  (Apr 13–17) ██ Alerts & Forum: alert system, blog editor, comments, ratings
Week  7  (Apr 20–24) ██ PDF & Security: PDF pipeline, XSS/CSRF protection, social sharing
Week  8  (Apr 27–May 01) ██ i18n & Eval: translations, AI evaluation, fallbacks, integration
Week  9  (May 04–08) ██ Integration Testing: full end-to-end testing of all features
Week 10  (May 11–15) ██ Polish: bug fixes, performance tuning, UX polish, load testing
Week 11  (May 18–24) ██ Delivery: documentation, deployment, QA, demo, submission
```
