# Functional Requirements

**Project**: _"Research and design a web application for financial market analysis based on multi-agent artificial intelligence"_

> **Note**: This document reflects the **actual implemented scope** as of the current codebase. Features that were originally planned but not implemented are marked with ~~strikethrough~~ and noted explicitly.

---

## FR-1: Authentication & Account Management

### FR-1.1: User Registration
- Users can sign up using a personal email address, username, and password.
- The system validates that the email is not already registered; if it is, an error message is displayed.
- The password must meet minimum security requirements (minimum 8 characters, at least one uppercase letter, one lowercase letter, one digit, and one special character).
- Upon successful registration, the system sends a verification email to the provided email address.
- The user account is created with `is_verified = false` and `role = user` by default.

### FR-1.2: Email Verification
- Users receive a verification email containing a unique, time-limited verification link.
- Clicking the link marks the account as verified (`is_verified = true`).
- If the link has expired, the user can request a new verification email from the login page.
- Unverified users are restricted from using the AI chat and forum posting features.

### FR-1.3: User Login
- Users can log in using their email and password.
- Upon successful authentication, the system issues a JWT access token and a refresh token.
- If the credentials are incorrect, a generic error message is shown (to prevent email enumeration).
- Users who have not verified their email are informed and prompted to verify.

### FR-1.4: Token Management
- The access token has a short expiry (30 minutes); the refresh token has a longer expiry (7 days).
- The frontend automatically refreshes the access token using the refresh token before it expires.
- Users can log out, which invalidates the current session by blacklisting the token in Redis.

### FR-1.5: Password Management
- Users can request a password reset by entering their registered email.
- The system sends a password reset email with a unique, time-limited OTP code.
- Users can set a new password using the OTP; the old password is no longer valid.
- Logged-in users can change their password from the account settings page by providing their current password and a new password.

### FR-1.6: Profile Management
- Users can view and edit their profile information: display name, avatar, and bio.
- Users can upload a profile picture (avatar); the system validates file type (JPEG, PNG) and size (max 2 MB).
- Profile changes are saved immediately and reflected across the application.
- Any user can view another user's public profile (display name, avatar, bio).

### FR-1.7: Account Settings
- Users can delete their account permanently, with a confirmation prompt and password re-entry.
- Account deletion cascades to remove associated data (articles, comments, conversations, portfolios).

---

## FR-2: Financial Data Dashboard

### FR-2.1: Real-Time Price Display
- Users can view price data for supported asset types: stocks, ETFs, and crypto.
- Price data includes current price, change amount, change percentage, and last-updated timestamp.
- The dashboard fetches the latest price via REST API on load and on user-triggered refresh; prices are not pushed via WebSocket.

### FR-2.2: Interactive Charting
- Users can view OHLCV candlestick charts for any supported asset.
- Users can switch between time intervals: 1 minute, 5 minutes, 15 minutes, 30 minutes, 1 hour, 4 hours, and 1 day.
  - 1m, 5m, 15m, 30m, 1h data are stored directly; 4h and 1d are derived on-the-fly via TimescaleDB `time_bucket()` aggregation.
- Charts support zoom, pan, and crosshair interactions.
- Users can overlay technical indicators (RSI, MACD, SMA, EMA, Bollinger Bands) on charts, with user-customizable periods.
- Chart data is loaded from historical price records stored in the database and refreshed by background ingestion tasks.

### FR-2.3: Asset Search
- Users can search for assets by symbol or name using a search bar.
- The search supports filtering by asset type (STOCK, ETF, CRYPTO).
- Selecting a search result navigates to that asset's chart and detail view.

### FR-2.4: Flexible Dashboard Layout
- The dashboard is divided into functional panels (chart panel, watchlist panel, AI chat panel, news panel).
- Users can rearrange panels by dragging and dropping.
- Layout configuration is stored on the client side only; server-side layout persistence is not implemented.

### FR-2.5: Asset Detail View
- For each asset, users can view a detail page showing: full chart with technical indicators, key price statistics, and latest news related to that asset.

---

## FR-3: AI Chat Interface

### FR-3.1: Conversational AI Interaction
- Verified users can type natural-language messages to request market analyses, news summaries, or investment insights.
- The AI responds in real-time via Server-Sent Events (SSE) streaming, displaying tokens incrementally as they are generated.
- A loading indicator is shown while the AI is processing the request.
- The system supports both Vietnamese and English input, with intent detection determining the response language.

### FR-3.2: Multi-Turn Conversations
- The system maintains conversation context across multiple turns within the same session by persisting message history to the database.
- Users can view the full conversation history within a chat session.
- Users can create new conversation sessions at any time.
- Users can view a list of their past conversations.
- Users can rename or delete existing conversations.

### FR-3.3: Multi-Format Responses
- The AI can respond with: plain text, markdown-formatted text (rendered in the UI), and data tables (e.g., price comparison tables rendered as HTML tables).

### FR-3.4: Quick Action Buttons
- The chat interface displays pre-suggested quick action buttons (e.g., "Analyze AAPL stock", "Summarize today's news").
- Users can click a quick action button to immediately send that query without typing.

### FR-3.5: AI Tool Execution Transparency
- When the AI calls tools (e.g., fetching stock prices, running technical analysis, managing portfolio), the user sees which tools were called as a summary appended at the end of the response.
- Tool call summaries are streamed via SSE `tool` events in real-time.

### FR-3.6: Conversation Feedback
- Users can rate a conversation as helpful (like) or unhelpful (dislike) after the session.
- Users can optionally provide a free-text feedback message alongside the rating.
- Feedback is stored and accessible to admins for AI performance monitoring.

### FR-3.7: Rate Limiting & Guardrails
- Each user is limited to 20 AI queries per 60 seconds; exceeding this limit returns a user-friendly error message.
- The AI includes guardrails that detect and refuse prompt injection, jailbreak attempts, SQL injection probes, and requests to reveal internal system prompts.
- Off-topic or harmful requests receive a polite refusal response.

> **Not implemented**: ~~FR-3.x: Chat Sharing~~ — shareable public links for conversations are not implemented.
> **Not implemented**: ~~FR-3.x: PDF Import in Chat~~ — file upload, text extraction, chunking, and vectorization pipeline are not implemented.

---

## FR-4: News Page

### FR-4.1: News Feed
- Users can browse a chronological feed of financial news articles aggregated from Yahoo Finance.
- Each news item shows: headline, source name, publication time, category tag (STOCK/ETF/CRYPTO), and sentiment badge (BULLISH / BEARISH / NEUTRAL).
- Users can filter news by category (STOCK, ETF, CRYPTO).
- Users can filter news by sentiment (BULLISH, BEARISH, NEUTRAL).
- Users can filter news by date range (from_date, to_date).
- Users can filter news by specific ticker symbol.
- Users can filter news by source domain.

### FR-4.2: News Detail View
- Users can click a news item to view: headline, full summary, source name, a link to the original article, publication date, and the sentiment label with score.

### FR-4.3: News Search
- Users can search for news articles by keyword (matched against title and summary).
- Results can be sorted by publication date (ascending or descending).

### FR-4.4: Automated News Ingestion
- The system automatically fetches news for all active tickers via a Celery background task.
- Sentiment analysis is performed automatically at ingestion time using the Loughran-McDonald financial lexicon, producing a sentiment label (BULLISH/BEARISH/NEUTRAL) and a numeric score in the range [-1, +1].
- Articles are deduplicated by URL across all tickers.

---

## FR-5: Community Forum & Blog

### FR-5.1: Article Creation
- Verified users can create analysis articles with a title and free-form text content.
- Users can delete their own published articles.

### FR-5.2: Article Browsing
- Users can browse published articles in a feed sorted by creation date (most recent first).
- Each article card shows: title, author name and avatar, excerpt, and publication date.

### FR-5.3: Article Detail View
- Users can read the full article including author details.

### FR-5.4: Comments
- Authenticated users can post comments on articles.
- Comments support one level of threading (replies to top-level comments via `parent_id`).
- Users can delete their own comments.

> **Not implemented**: ~~FR-5.x: Article Drafts~~ — all created articles are immediately published; draft saving is not supported.
> **Not implemented**: ~~FR-5.x: Article Editing~~ — users cannot edit a published article; they must delete and recreate.
> **Not implemented**: ~~FR-5.x: Ratings~~ — article star-rating system is not implemented.
> **Not implemented**: ~~FR-5.x: Tags~~ — tag creation, filtering, and tag-based browsing are not implemented.
> **Not implemented**: ~~FR-5.x: View Count~~ — view count tracking is not implemented.
> **Not implemented**: ~~FR-5.x: PDF Import in Articles~~ — PDF text extraction into article content is not implemented.

---

## FR-6: Portfolio Management

### FR-6.1: Portfolio CRUD
- Users can create multiple named portfolios with an optional description.
- One portfolio is marked as the default.
- Users can rename, update the description of, or delete a portfolio.
- Deleting a portfolio removes all associated holdings; the system automatically promotes the next oldest portfolio to default.

### FR-6.2: Holdings Management
- Within a portfolio, users can add holdings by selecting an asset, entering a quantity, and optional notes.
- Users can edit the quantity or notes of an existing holding.
- Users can remove a holding from a portfolio.
- Each asset can appear at most once per portfolio (unique constraint enforced).

### FR-6.3: Portfolio Summary
- Users can view a portfolio summary showing: current market value per holding, allocation percentage per holding, and total portfolio value.
- Current value is calculated in real-time as `quantity × latest_close_price`.

> **Not implemented**: ~~FR-6.x: Cost Basis & P&L~~ — average buy price, total cost, profit/loss amount, and profit/loss percentage are not tracked or displayed. The system stores quantity only.

---

## FR-7: Watchlist

### FR-7.1: Watchlist Management
- Users can add any active asset to their personal watchlist.
- Users can remove assets from their watchlist.
- Users can reorder watchlist items via drag-and-drop; the order is persisted to the database via a `position` field.
- Adding a duplicate asset to the watchlist is silently ignored.

### FR-7.2: Watchlist Display
- The watchlist shows each asset's: symbol, name, current price, price change amount, and change percentage.
- Price change is calculated by comparing the two most recent daily close prices.
- Clicking an asset in the watchlist navigates to its chart view.

---

## FR-8: User Preferences & Settings

### FR-8.1: Theme
- Users can switch between Light Mode and Dark Mode.
- The selected theme is persisted client-side and applied on all subsequent visits.

### FR-8.2: Language
- Users can switch the application language between English and Vietnamese.
- The selected language is persisted client-side and applied globally (i18next).

### FR-8.3: Technical Indicator Settings
- Users can customize the parameters for each technical indicator (RSI period, MACD fast/slow/signal periods, SMA and EMA moving average lengths).
- Settings are saved per-user in the database and applied when computing indicators for charts and AI analysis.

> **Not implemented**: ~~FR-8.x: Notification Preferences~~ — alert notification channel configuration is not implemented (no alert system exists).
> **Not implemented**: ~~FR-8.x: Dashboard Layout Persistence~~ — server-side saving and restoring of panel arrangement is not implemented.
> **Not implemented**: ~~FR-8.x: Default Asset Type Setting~~ — per-user default asset type filter is not implemented.

---

## FR-9: Fallback & Error Handling

### FR-9.1: API Downtime Fallback
- When external data APIs are unavailable, the backend returns cached data from Redis where available; the frontend can display a stale-data indicator.
- If the AI service is unavailable, the SSE stream emits an `error` event and the chat interface displays a descriptive error message.

### FR-9.2: Validation Feedback
- All user input forms display clear, field-specific validation error messages (enforced via Pydantic on the backend and form validation on the frontend).
- Invalid asset symbols, unsupported file types, and out-of-range values are caught and communicated before submission.

### FR-9.3: Error Pages
- The application provides informative error responses for 404 (Not Found), 403 (Forbidden), and 500 (Server Error) scenarios.

> **Not implemented**: ~~FR-9.x: Alert System~~ — price-based alerts, news-sentiment alerts, alert management, and alert triggering are not implemented. No alert model or router exists in the backend.
> **Not implemented**: ~~FR-9.x: Economic Calendar~~ — economic event display, filtering, and notifications are not implemented. No calendar model or router exists.
> **Not implemented**: ~~FR-9.x: Social Sharing~~ — shareable public links for charts or AI conversations are not implemented.

---

## FR-10: Admin Features

### FR-10.1: User Management
- Admins can view a paginated, searchable list of all registered users, filterable by role and ban status.
- Admins can change a user's role (promote to admin or demote to user).
- Admins can ban or unban user accounts.

### FR-10.2: Content Moderation
- Admins can delete any blog post or comment across the platform.

### FR-10.3: Asset & Price Data Management
- Admins can add new asset tickers to the system.
- Admins can activate or deactivate existing tickers.
- Admins can delete a ticker and its associated price data.
- Admins can manually trigger the 1-minute price ingestion task.
- Admins can manually trigger the historical price backfill task.

### FR-10.4: News Management
- Admins can manually create news articles (with auto-calculated sentiment).
- Admins can update the title, summary, sentiment, or associated tickers of any article.
- Admins can delete any news article.
- Admins can manually trigger the news ingestion Celery task for all active tickers.

### FR-10.5: AI Performance Monitoring
- Admins can view aggregate feedback statistics: total rated conversations, like/dislike counts, like percentage, and a list of recent feedback entries with text.

> **Not implemented**: ~~FR-10.x: Email Verification Override~~ — admins cannot manually mark a user's email as verified.
> **Not implemented**: ~~FR-10.x: Content Flagging~~ — users cannot flag articles or comments; there is no moderation queue.
> **Not implemented**: ~~FR-10.x: System Monitoring Dashboard~~ — real-time metrics (active sessions, token cost, error rates) are not implemented beyond AI feedback stats.
> **Not implemented**: ~~FR-10.x: Economic Calendar Management~~ — no calendar model exists.

---

## Appendix: Feature–EPIC Traceability Matrix

| Feature | EPIC 1 (AI Orchestration) | EPIC 2 (Backend) | EPIC 3 (UI) | EPIC 4 (Data Processing) |
|---|:---:|:---:|:---:|:---:|
| FR-1: Authentication | | ✅ | ✅ | |
| FR-2: Dashboard | | ✅ | ✅ | |
| FR-3: AI Chat | ✅ | ✅ | ✅ | ✅ |
| FR-4: News | | ✅ | ✅ | ✅ |
| FR-5: Forum & Blog | | ✅ | ✅ | |
| FR-6: Portfolio | | ✅ | ✅ | |
| FR-7: Watchlist | | ✅ | ✅ | |
| FR-8: User Preferences | | ✅ | ✅ | |
| FR-9: Fallback & Errors | ✅ | ✅ | ✅ | |
| FR-10: Admin | | ✅ | ✅ | |
