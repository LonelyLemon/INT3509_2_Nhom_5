# Project Plan & Timeline

**Project**: Web Application for Financial Market Analysis Based on Multi-Agent AI  
**Duration**: 09/03/2026 – 24/05/2026 (11 weeks, 55 working days)

---

## Task Type Reference

Each task is labeled with a **Type** using the format `Domain<Category>` to classify the nature of the work.

| Type | Description |
|------|-------------|
| `Backend<Scaffold>` | Project structure, config, base models, migrations |
| `Backend<API>` | REST API endpoint development |
| `Backend<Auth>` | Authentication, authorization, RBAC |
| `Backend<Database>` | Schema design, optimization, indexing |
| `Backend<Data Integration>` | Third-party API connections, data fetching |
| `Backend<Validation>` | Pydantic schemas, input/output validation |

---

## Phase 1: Foundation & Setup (Week 1–2)

### Week 1 — Mar 9–13: Project Scaffolding & Auth

| Day | Date | Type | Task | Completion Criteria |
|-----|------|------|------|---------------------|
| Mon | 09/03 | `Fullstack<Setup>` | Project kickoff: finalize Git branching strategy, set up repo structure, agree on coding conventions | Repo initialized with agreed folder structure and `README.md` |
| Mon | 09/03 | `Backend<Scaffold>` | FastAPI project scaffold: folder structure, config, `.env` management | FastAPI server starts and responds to health check |
| Mon | 09/03 | `DevOps<Infrastructure>` | Docker Compose setup: PostgreSQL, Qdrant, Redis containers | `docker compose up` launches all services; health checks pass |
| Mon | 09/03 | `Frontend<Scaffold>` | React + Vite scaffold, TailwindCSS setup, ESLint/Prettier config | `npm run dev` launches the app with a styled placeholder page |
| Tue | 10/03 | `Backend<Scaffold>` | SQLAlchemy models + Alembic migration setup for all core entities | Migrations run successfully; tables created in PostgreSQL |
| Tue | 10/03 | `DevOps<Infrastructure>` | GitHub Actions CI/CD pipeline: lint, test, build on PR | A test PR triggers the pipeline successfully |
| Tue | 10/03 | `Frontend<Design System>` | Design system: color palette, typography (Google Fonts), CSS variables for dark/light mode | Design tokens defined; dark/light toggle works correctly |
| Wed | 11/03 | `Backend<Data Integration>` | Third-party data provider integration: connect to financial data APIs for price data | Real-time and historical price data fetched successfully |
| Wed | 11/03 | `Backend<Auth>` | Auth: registration, login, and token refresh (JWT + bcrypt) | Auth APIs return correct JWT tokens; passwords stored as bcrypt hashes |
| Wed | 11/03 | `Frontend<Page>` | Auth pages UI: Login and Register forms with client-side validation | Both pages render correctly with validation feedback |
| Thu | 12/03 | `Backend<API>` | Price data APIs: real-time quotes, historical OHLCV data, batch queries | APIs return structured price data with correct time ranges |
| Thu | 12/03 | `Backend<Auth>` | Auth completion: RBAC middleware, logout, password change, email verification | All auth features tested; RBAC returns `403` for unauthorized roles |
| Thu | 12/03 | `Frontend<Integration>` | Auth integration: connect Login/Register pages to backend, token storage and refresh | User can register, log in, and see protected content |
| Fri | 13/03 | `Backend<API>` | Technical indicators API + price data caching with Redis (TTL-based) | Indicators calculated correctly; cache hit/miss works as expected |
| Fri | 13/03 | `Backend<API>` | User profile/account APIs + Redis rate limiting middleware | Profile updates work; rate-limited requests return `429` |
| Fri | 13/03 | `Frontend<Integration>` | User profile page UI + connect to user profile APIs | Profile page displays and edits user info, persists changes |

### Week 2 — Mar 16–20: Data Integration & Dashboard Layout

| Day | Date | Type | Task | Completion Criteria |
|-----|------|------|------|---------------------|
| Mon | 16/03 | `Backend<Testing>` | Price API error handling and edge cases (market closed, invalid symbols) | All edge cases return appropriate error responses; test suite passes |
| Mon | 16/03 | `Backend<WebSocket>` | WebSocket server setup for real-time price streaming | WebSocket client can connect and receive price messages |
| Mon | 16/03 | `Frontend<Page>` | Main dashboard layout: header, sidebar, flexible content blocks (resizable panels) | Dashboard renders with draggable/resizable layout blocks |
| Tue | 17/03 | `Backend<Validation>` | Data validation for price-related requests and responses (Pydantic schemas) | Invalid inputs return clear validation errors with field-level messages |
| Tue | 17/03 | `Backend<WebSocket>` | WebSocket price streaming: subscribe/unsubscribe to symbols, broadcast real-time ticks | Multiple clients receive price updates for subscribed symbols |
| Tue | 17/03 | `Frontend<Component>` | Lightweight Charts integration: candlestick chart component with zoom/pan | Chart renders real candlestick data with interactive controls |
| Wed | 18/03 | `Backend<Testing>` | Price data integration testing: full API surface coverage | Complete test suite for price data module passes |
| Wed | 18/03 | `Backend<Data Integration>` | News data source integration: connect to financial news APIs | Raw news data fetched and structured into internal model |
| Wed | 18/03 | `Frontend<Component>` | Symbol search component + chart switching | User can search symbols and switch the chart view dynamically |
| Thu | 19/03 | `Backend<MCP>` | MCP server foundation: server setup and tool registration framework | MCP server starts; tools can be registered and listed |
| Thu | 19/03 | `Backend<Data Integration>` | Economic calendar data integration from external sources | Calendar events fetched with date, country, impact level, values |
| Thu | 19/03 | `Frontend<Component>` | Watchlist sidebar component (add/remove symbols, show live mini-prices) | Sidebar displays user's symbols with live price indicators |
| Fri | 20/03 | `Backend<MCP>` | MCP tools: implement price data retrieval and technical analysis tools | Tools return correct live data when called via MCP protocol |
| Fri | 20/03 | `Backend<Validation>` | Data validation for news and calendar endpoints | Invalid inputs return clear error messages |
| Fri | 20/03 | `Frontend<Page>` | Dashboard responsive layout polish + Light/Dark mode toggle finalization | Dashboard is usable on tablet & desktop; mode toggle persists preference |

---

## Phase 2: AI Core & Chat (Week 3–4)

### Week 3 — Mar 23–27: AI Agent Setup & Chat Interface

| Day | Date | Type | Task | Completion Criteria |
|-----|------|------|------|---------------------|
| Mon | 23/03 | `Backend<AI Agent>` | pydantic-ai agent scaffold: configure LLM connections and model selection logic | Agent initializes and returns a basic response from each LLM provider |
| Mon | 23/03 | `Backend<Background Job>` | Celery + Redis/RabbitMQ setup: background worker infrastructure | Celery worker starts; a test task executes asynchronously |
| Mon | 23/03 | `Frontend<Page>` | AI Chat interface layout: message list, input box, send button, conversation drawer | Chat UI renders with scrollable message history and input area |
| Tue | 24/03 | `Backend<AI Agent>` | LLM fallback mechanism + MCP tools for economic calendar and news retrieval | Fallback works on failure; all MCP tools return accurate data |
| Tue | 24/03 | `Backend<Background Job>` | News aggregator background task: periodic crawling from multiple sources | Celery beat schedules crawling; news stored in DB automatically |
| Tue | 24/03 | `Frontend<Component>` | Chat message renderers: text with markdown, data table, and inline chart components | Messages display correctly in all 3 formats |
| Wed | 25/03 | `Backend<AI Agent>` | Conversation management: multi-turn state tracking, user context storage | Conversation history persists across sessions; context window managed |
| Wed | 25/03 | `Backend<Background Job>` | News sentiment analysis pipeline (LLM-based background job) | Each news article gets a sentiment score stored in DB |
| Wed | 25/03 | `Frontend<Component>` | Quick action buttons: pre-built prompts for common queries | Clicking a button populates the input and sends the query |
| Thu | 26/03 | `Backend<AI Agent>` | Intent classification + SSE-based streaming for AI responses word-by-word | Classification identifies intents correctly; SSE streams tokens incrementally |
| Thu | 26/03 | `Backend<API>` | News APIs: listing, filtering (by date/sentiment/source), single article retrieval | APIs return paginated news with correct filtering |
| Thu | 26/03 | `Frontend<Integration>` | SSE integration: real-time AI response rendering (word-by-word streaming) | Chat displays AI response as it streams in, with typing indicator |
| Fri | 27/03 | `Backend<API>` | Chat APIs: send messages, retrieve history, list conversations + conversation storage | Chat APIs work end-to-end: send message → get streamed AI response |
| Fri | 27/03 | `Backend<API>` | Economic calendar APIs: listing and filtering events | Calendar APIs return structured events with correct filtering |
| Fri | 27/03 | `Frontend<Component>` | Chat history drawer: list past conversations, load selected conversation | User can browse and resume past chat sessions |

### Week 4 — Mar 30 – Apr 3: AI Safety & Portfolio/Watchlist

| Day | Date | Type | Task | Completion Criteria |
|-----|------|------|------|---------------------|
| Mon | 30/03 | `Backend<AI Safety>` | Guardrail mechanism: topic filtering, response safety checks, anti-abuse rules | Off-topic or abusive queries get appropriate rejection messages |
| Mon | 30/03 | `Backend<API>` | Portfolio/Watchlist API design and data models | API spec documented in Swagger with all CRUD operations |
| Mon | 30/03 | `Frontend<Page>` | News page layout: timeline view, category filters, search bar | News page renders with placeholder data in timeline format |
| Tue | 31/03 | `Backend<AI Safety>` | Prompt injection protection: input sanitization, system prompt isolation, detection rules | Known prompt injection attempts are blocked; system prompt never leaked |
| Tue | 31/03 | `Backend<API>` | Portfolio CRUD APIs: add, edit, remove holdings with quantity and price | All CRUD operations work; portfolio value calculated from live prices |
| Tue | 31/03 | `Frontend<Component>` | News article cards: title, source, sentiment badge, timestamp, preview text | News cards display all fields; clicking opens full article view |
| Wed | 01/04 | `Backend<AI Agent>` | Context window management: token counting, conversation pruning, summarization | Long conversations are automatically summarized to stay within token limits |
| Wed | 01/04 | `Backend<API>` | Watchlist CRUD APIs: add/remove symbols, reorder | Watchlist APIs tested; symbols persist per user account |
| Wed | 01/04 | `Frontend<Page>` | Economic calendar page: table with event details, country, impact, values | Calendar renders real data with filtering by date and country |
| Thu | 02/04 | `Backend<Monitoring>` | Logfire monitoring integration: trace AI agent calls, log token usage, latency | Logfire dashboard shows request traces and error rates |
| Thu | 02/04 | `Backend<Validation>` | Portfolio/Watchlist data validation + edge cases | Invalid inputs rejected with clear error messages |
| Thu | 02/04 | `Frontend<Component>` | Calendar filtering controls: by country, importance level, date range | Filters correctly narrow displayed events; combined filters work |
| Fri | 03/04 | `Backend<Testing>` | AI agent end-to-end testing: verify all intent paths with sample queries | Test suite covers representative queries; all return valid responses |
| Fri | 03/04 | `Backend<Testing>` | Portfolio/Watchlist integration testing | End-to-end tests pass for all portfolio and watchlist flows |
| Fri | 03/04 | `Frontend<Page>` | News + Calendar page UI polish: loading states, empty states, error handling | Pages handle all states gracefully |

---

## Phase 3: RAG & Alerts (Week 5–6)

### Week 5 — Apr 6–10: RAG Integration & Alert System

| Day | Date | Type | Task | Completion Criteria |
|-----|------|------|------|---------------------|
| Mon | 06/04 | `Backend<RAG>` | Qdrant vector store setup: collection schemas, embedding model selection | Qdrant collections created; test document embedded and retrieved |
| Mon | 06/04 | `Backend<API>` | Alert system: data models, trigger conditions, API design | API spec documented; alert models defined |
| Mon | 06/04 | `Frontend<Page>` | Portfolio management page layout: holdings table, add asset form, summary cards | Page renders with table structure and add-asset modal |
| Tue | 07/04 | `Backend<RAG>` | Document embedding pipeline: chunk financial reports → embed → store in Qdrant | Sample documents chunked and stored; similarity search returns relevant chunks |
| Tue | 07/04 | `Backend<API>` | Alert CRUD APIs: create, read, update, delete, list active alerts per user | All alert CRUD operations work correctly |
| Tue | 07/04 | `Frontend<Integration>` | Portfolio UI: add/edit/delete assets, quantity & price inputs, confirmation dialogs | User can manage portfolio entries; changes persist after refresh |
| Wed | 08/04 | `Backend<RAG>` | RAG retrieval chain: integrate vector search into AI agent's reasoning pipeline | AI agent queries Qdrant for context before generating responses |
| Wed | 08/04 | `Backend<Background Job>` | Alert price monitoring: background task checking price thresholds periodically | Price alerts trigger within expected time of threshold breach |
| Wed | 08/04 | `Frontend<Component>` | Watchlist management: drag-to-reorder, quick-add from chart, remove with swipe | Watchlist fully interactive; changes sync with backend |
| Thu | 09/04 | `Backend<Testing>` | RAG quality testing: measure retrieval relevance on financial queries | Retrieval precision ≥ 70% on test query set |
| Thu | 09/04 | `Backend<WebSocket>` | Alert notification delivery: WebSocket push, in-app notification center | Notifications appear in real-time in the notification panel |
| Thu | 09/04 | `Frontend<Component>` | Portfolio dashboard widgets: allocation chart, total value, P&L summary | Widgets display correct aggregated portfolio data |
| Fri | 10/04 | `Backend<RAG>` | RAG optimization: chunk size tuning, embedding model comparison, re-ranking | Response quality improved; latency within acceptable range |
| Fri | 10/04 | `Backend<Testing>` | Alert system integration testing | End-to-end tests pass for all alert flows |
| Fri | 10/04 | `Frontend<Integration>` | WebSocket integration: live price updates on watchlist & portfolio values | Prices update in real-time without page refresh |

### Week 6 — Apr 13–17: Forum/Blog & AI Refinement

| Day | Date | Type | Task | Completion Criteria |
|-----|------|------|------|---------------------|
| Mon | 13/04 | `Backend<AI Agent>` | AI-driven sentiment alert: detect negative sentiment from news analysis | Sentiment alert fires when aggregated sentiment drops below threshold |
| Mon | 13/04 | `Backend<API>` | Article/post CRUD APIs: content, author info, tags, timestamps | Articles created, listed, updated, deleted via API |
| Mon | 13/04 | `Frontend<Page>` | Forum/Blog page layout: post list, create post button, category sidebar | Forum page renders with post cards and navigation |
| Tue | 14/04 | `Backend<Caching>` | AI analysis caching: store and reuse recent analysis results (Redis, TTL) | Identical queries within TTL return cached response |
| Tue | 14/04 | `Backend<API>` | Comment APIs: add, list, threading via parent comment | Comment threads work correctly |
| Tue | 14/04 | `Frontend<Component>` | Rich text editor integration for blog post creation | Editor supports formatting, code blocks, and images |
| Wed | 15/04 | `Backend<Database>` | Hybrid DB sync: PostgreSQL ↔ Qdrant synchronization mechanism | RAG retrieval results match the latest data in PostgreSQL |
| Wed | 15/04 | `Backend<API>` | Rating APIs: submit, update, average calculation | Rating averages update correctly on new submissions |
| Wed | 15/04 | `Frontend<Component>` | Live chart embedding in blog posts: insert interactive charts into editor | Charts in posts are interactive, not static images |
| Thu | 16/04 | `Backend<Testing>` | Alert system end-to-end testing (price + sentiment alerts) | All alert types tested; false positive rate acceptable |
| Thu | 16/04 | `Backend<API>` | Tag system APIs for article categorization | Tags can be created, listed, and associated with articles |
| Thu | 16/04 | `Frontend<Component>` | Comment section & star rating UI (1–5 stars) under each post | Users can comment and rate; average rating displayed |
| Fri | 17/04 | `Backend<AI Agent>` | AI quality improvements based on end-to-end testing results | Agent response quality measurably improved |
| Fri | 17/04 | `Backend<Testing>` | Forum/Blog API integration testing | All forum features work end-to-end |
| Fri | 17/04 | `Frontend<Page>` | Forum list + detail page: pagination, sorting, author profile link | Forum is browsable with sorting/pagination; post detail shows full content |

---

## Phase 4: PDF Processing, Security & Admin (Week 7)

### Week 7 — Apr 20–24: PDF Pipeline, Security & Admin Features

| Day | Date | Type | Task | Completion Criteria |
|-----|------|------|------|---------------------|
| Mon | 20/04 | `Backend<PDF Pipeline>` | PDF text extraction pipeline: integration with document parsing library | Uploaded PDF returns extracted text with preserved structure |
| Mon | 20/04 | `Backend<Security>` | XSS protection: sanitize rich text inputs, configure CSP headers | Injected script tags in forum posts are stripped; CSP headers present |
| Mon | 20/04 | `Frontend<Component>` | PDF upload UI: drag-and-drop zone, progress bar, file type validation | User can upload PDF; non-PDF files rejected with message |
| Tue | 21/04 | `Backend<PDF Pipeline>` | PDF chunking pipeline: split extracted text into semantic chunks | PDF content split into meaningful chunks with metadata preserved |
| Tue | 21/04 | `Backend<Security>` | CSRF protection: token-based CSRF middleware for state-changing endpoints | Requests without valid CSRF token are rejected |
| Tue | 21/04 | `Frontend<Component>` | PDF preview component: display extracted content before confirming import | User sees a preview and can confirm or cancel import |
| Wed | 22/04 | `Backend<PDF Pipeline>` | PDF vectorization: embed chunks → store in Qdrant with source metadata | PDF chunks searchable in Qdrant with source file references |
| Wed | 22/04 | `Backend<Security>` | Security audit: review all endpoints for auth, input validation, error leakage | Audit report generated; all critical findings addressed |
| Wed | 22/04 | `Frontend<Page>` | Alert management page: create alert form, active alerts list, edit/delete | User can manage alerts through the UI |
| Thu | 23/04 | `Backend<RAG>` | PDF + RAG integration: AI agent uses imported PDFs as knowledge context | Questions about uploaded PDF content return accurate answers |
| Thu | 23/04 | `Backend<API>` | Admin APIs: user management (list, role change, ban/disable), content moderation | Admin can manage users and moderate content via API |
| Thu | 23/04 | `Frontend<Component>` | Alert notification display: toast notifications, notification bell with unread count | Real-time alerts appear as toasts; panel shows history |
| Fri | 24/04 | `Backend<Testing>` | PDF pipeline end-to-end testing: upload → extract → chunk → vectorize → query | Full pipeline tested with real PDF documents |
| Fri | 24/04 | `Backend<Testing>` | Security testing: automated tests for auth bypass, XSS, CSRF, injection | Security test suite passes; no critical vulnerabilities found |
| Fri | 24/04 | `Frontend<Component>` | Social sharing: generate shareable links for charts & AI chat logs | Share button generates a unique URL; shared view works correctly |

---

## Phase 5: i18n, Evaluation, Preferences & Integration (Week 8–9)

### Week 8 — Apr 27 – May 1: Internationalization, Evaluation & Preferences

| Day | Date | Type | Task | Completion Criteria |
|-----|------|------|------|---------------------|
| Mon | 27/04 | `Backend<AI Evaluation>` | DeepEval setup: evaluation framework for AI agent quality (LLM-as-a-Judge) | Evaluation pipeline runs; sample test cases scored |
| Mon | 27/04 | `Backend<Documentation>` | API documentation review: ensure all endpoints documented in OpenAPI/Swagger | Swagger UI shows all endpoints with schemas and examples |
| Mon | 27/04 | `Frontend<i18n>` | i18n framework setup: language context, translation file structure | Language switching infrastructure works with English placeholder strings |
| Tue | 28/04 | `Backend<AI Evaluation>` | Evaluation test cases: create single-turn and multi-turn test scenarios | Test case suite covers all major intents; results logged with scores |
| Tue | 28/04 | `Backend<i18n>` | Backend i18n: error messages and API responses support language header | API returns localized error messages based on `Accept-Language` |
| Tue | 28/04 | `Frontend<i18n>` | Vietnamese translations: translate all UI strings (nav, labels, messages, errors) | Full app renders correctly in Vietnamese with no missing translations |
| Wed | 29/04 | `Backend<AI Evaluation>` | AI quality metrics: measure response relevance, accuracy, helpfulness | Quality report generated; weak areas identified for improvement |
| Wed | 29/04 | `Backend<Database>` | Database optimization: add indexes, optimize slow queries, connection pooling | Slow queries optimized; database handles concurrent users efficiently |
| Wed | 29/04 | `Frontend<Component>` | Language switcher component: toggle in header, persist preference | User language preference persists across sessions |
| Thu | 30/04 | `Backend<AI Agent>` | AI agent improvements: refine prompts and tool usage based on evaluation | Evaluation scores improve on previously weak test cases |
| Thu | 30/04 | `Backend<API>` | User preferences APIs: theme, language, default filters, dashboard layout, notification settings | Preferences stored per user and applied on login |
| Thu | 30/04 | `Frontend<Integration>` | User preferences UI: theme toggle, language, notification settings page | Users can configure and save all preference options |
| Fri | 01/05 | `Backend<AI Evaluation>` | AI evaluation report finalization + prompt optimization documentation | Report and documentation completed |
| Fri | 01/05 | `Backend<Caching>` | Fallback data: prepare cached data for critical endpoints during API outages | When external APIs fail, system serves cached data with timestamp |
| Fri | 01/05 | `Frontend<Page>` | Fallback UI: error boundaries, API-down banners, offline mode indicators | Users see friendly fallback messages instead of broken pages |
| Fri | 01/05 | `Fullstack<Integration Test>` | Integration checkpoint: connect all remaining frontend pages to backend APIs | All pages fetch real data from backend; no hardcoded placeholder data |

### Week 9 — May 4–8: Full Integration Testing

| Day | Date | Type | Task | Completion Criteria |
|-----|------|------|------|---------------------|
| Mon | 04/05 | `Fullstack<Integration Test>` | Integration test: Auth flow — register → verify → login → profile → RBAC | Complete auth journey works end-to-end on both FE and BE |
| Mon | 04/05 | `Fullstack<Bug Fix>` | Bug fixes from auth integration testing | All auth-related UI bugs resolved |
| Tue | 05/05 | `Fullstack<Integration Test>` | Integration test: Dashboard — price data, WebSocket streaming, charts, watchlist | Dashboard loads prices, streams updates, charts render correctly |
| Tue | 05/05 | `Frontend<Performance>` | Performance optimization: lazy loading routes, code splitting, image optimization | Lighthouse performance score ≥ 80; initial bundle size reduced |
| Wed | 06/05 | `Fullstack<Integration Test>` | Integration test: AI Chat — send query → SSE streaming → multi-format response → history | Full chat flow works: streaming, rendering, conversation persistence |
| Wed | 06/05 | `Backend<AI Evaluation>` | AI response quality spot-check: manual test of real-world queries | ≥ 80% of responses rated satisfactory by manual review |
| Thu | 07/05 | `Fullstack<Integration Test>` | Integration test: News + Calendar + Alert system end-to-end | News loads, calendar filters work, alerts trigger and notify |
| Thu | 07/05 | `Backend<Testing>` | Background job reliability: verify Celery task recovery and data integrity | Failed tasks retry correctly; no orphaned jobs after simulated crashes |
| Fri | 08/05 | `Fullstack<Integration Test>` | Integration test: Forum (create/comment/rate) + PDF import + Portfolio + Admin panel | All community, portfolio, and admin features work end-to-end |
| Fri | 08/05 | `Frontend<Testing>` | Responsive design testing: verify all pages on common viewport sizes | No layout breaks on any tested viewport; scroll behavior correct |

---

## Phase 6: Polish, Optimization & Delivery (Week 10–11)

### Week 10 — May 11–15: Bug Fixes, Performance & Polish

| Day | Date | Type | Task | Completion Criteria |
|-----|------|------|------|---------------------|
| Mon | 11/05 | `Fullstack<Bug Fix>` | Critical bug fix sprint: address all P0/P1 bugs from integration testing | All critical and high-priority bugs resolved and verified |
| Tue | 12/05 | `Fullstack<Bug Fix>` | Medium/low priority bug fixes: address remaining P2/P3 issues | Bug backlog reduced to cosmetic-only issues |
| Wed | 13/05 | `Backend<AI Agent>` | AI agent performance tuning: reduce response latency, optimize prompts | Average AI response time ≤ 5 seconds; token usage optimized |
| Wed | 13/05 | `Backend<Testing>` | Backend performance profiling: identify and fix bottlenecks | All API endpoints respond within 500ms (excluding AI calls) |
| Wed | 13/05 | `Frontend<Page>` | UI/UX polish: micro-animations, transitions, hover effects, loading skeletons | UI feels smooth and premium; no janky transitions |
| Thu | 14/05 | `Backend<Monitoring>` | Logfire monitoring dashboards: set up key metrics and alerting | Dashboard shows real-time system health; anomaly alerts configured |
| Thu | 14/05 | `Backend<Testing>` | Load testing: simulate concurrent users | System handles ≥ 50 concurrent users without degradation |
| Thu | 14/05 | `Frontend<Accessibility>` | Accessibility review: keyboard navigation, ARIA labels, color contrast | Core flows navigable by keyboard; contrast meets WCAG AA |
| Fri | 15/05 | `Fullstack<Integration Test>` | Admin panel UI integration + end-to-end admin flow testing | Admin can manage users and moderate content through the UI |
| Fri | 15/05 | `Fullstack<QA>` | End-to-end smoke test: walk through every major feature as a new user | All features work in a continuous user journey without errors |

### Week 11 — May 18–24: Documentation, Deployment & Delivery

| Day | Date | Type | Task | Completion Criteria |
|-----|------|------|------|---------------------|
| Mon | 18/05 | `Fullstack<Bug Fix>` | Final bug fixes: resolve any remaining issues from smoke testing | Zero known P0–P2 bugs |
| Tue | 19/05 | `Backend<Documentation>` | Technical documentation: AI architecture, agent flow diagrams, prompt engineering guide | Documentation covers all AI components; new developer can understand the system |
| Tue | 19/05 | `Backend<Documentation>` | API documentation: finalize Swagger, write deployment guide, environment variable reference | Complete API docs with examples; deployment guide tested by another team member |
| Tue | 19/05 | `Frontend<Documentation>` | Frontend documentation: component library guide, design system docs, build instructions | Frontend can be built and run by following the documentation alone |
| Wed | 20/05 | `DevOps<Infrastructure>` | Docker Compose production config: optimized builds, environment separation, health checks | Production compose launches full stack successfully |
| Wed | 20/05 | `Fullstack<Deployment>` | Deployment dry run: deploy full stack, verify all services communicate correctly | Full application accessible; all features functional |
| Wed | 20/05 | `Frontend<Performance>` | Production build: optimize, verify no console errors, test in production mode | `npm run build` succeeds; production app has no errors |
| Thu | 21/05 | `Fullstack<QA>` | Final QA: comprehensive testing of production deployment | QA checklist completed with ✅ on every item |
| Fri | 22/05 | `Fullstack<Demo>` | Demo preparation: prepare presentation slides, demo script, talking points | Presentation ready; demo rehearsed and runs smoothly |
| Sat–Sun | 23–24/05 | `Fullstack<Deployment>` | **Buffer**: last-minute fixes, final rehearsal, project submission | Project submitted on time with all deliverables |

---

## Summary Timeline

```
Week  1  (Mar 09–13) ██ Foundation: scaffold, Docker, auth, price data, CI/CD
Week  2  (Mar 16–20) ██ Data: price testing, WebSocket, news/calendar integration, MCP foundation
Week  3  (Mar 23–27) ██ AI Core: LLM agents, MCP tools, chat, SSE, news pipeline, calendar APIs
Week  4  (Mar 30–Apr 03) ██ AI Safety + Portfolio: guardrails, prompt injection, portfolio/watchlist APIs
Week  5  (Apr 06–10) ██ RAG & Alerts: vector search, embeddings, alert CRUD, monitoring, delivery
Week  6  (Apr 13–17) ██ Forum & AI Refinement: blog APIs, comments, ratings, AI caching, DB sync
Week  7  (Apr 20–24) ██ PDF, Security & Admin: PDF pipeline, XSS/CSRF, admin APIs, sharing
Week  8  (Apr 27–May 01) ██ i18n, Eval & Preferences: translations, AI eval, user prefs, fallbacks
Week  9  (May 04–08) ██ Integration Testing: full end-to-end testing of all features
Week 10  (May 11–15) ██ Polish: bug fixes, performance tuning, UX polish, admin UI, load testing
Week 11  (May 18–24) ██ Delivery: documentation, deployment, QA, demo, submission
```
