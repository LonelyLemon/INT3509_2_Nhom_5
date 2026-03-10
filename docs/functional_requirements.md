# Functional Requirements

**Project**: _"Research and design a web application for financial market analysis based on multi-agent artificial intelligence"_

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
- Unverified users are restricted from using AI chat and forum posting features.

### FR-1.3: User Login
- Users can log in using their email and password.
- Upon successful authentication, the system issues a JWT access token and a refresh token.
- If the credentials are incorrect, a generic error message is shown (to prevent email enumeration).
- Users who have not verified their email are informed and prompted to verify.

### FR-1.4: Token Management
- The access token has a short expiry (e.g., 30 minutes); the refresh token has a longer expiry (e.g., 7 days).
- The frontend automatically refreshes the access token using the refresh token before it expires.
- Users can log out, which invalidates the current session and clears stored tokens.

### FR-1.5: Password Management
- Users can request a password reset by entering their registered email.
- The system sends a password reset email with a unique, time-limited reset link.
- Users can set a new password using the reset link; the old password is no longer valid.
- Logged-in users can change their password from the account settings page by providing their current password and a new password.

### FR-1.6: Profile Management
- Users can view and edit their profile information: display name, avatar, and bio.
- Users can upload a profile picture (avatar); the system validates file type (JPEG, PNG) and size (max 2 MB).
- Profile changes are saved immediately and reflected across the application.

### FR-1.7: Account Settings
- Users can delete their account permanently, with a confirmation prompt and password re-entry.
- Account deletion cascades to remove associated data (articles, comments, conversations, portfolios, alerts).

---

## FR-2: Financial Data Dashboard

### FR-2.1: Real-Time Price Display
- Users can view real-time price data for supported asset types: stocks, forex, commodities, crypto, and indices.
- Price data includes current price, change amount, change percentage, and last-updated timestamp.
- Prices are streamed via WebSocket so the dashboard updates automatically without page refresh.

### FR-2.2: Interactive Charting
- Users can view OHLCV candlestick charts for any supported asset.
- Users can switch between time intervals: 1 minute, 5 minutes, 1 hour, 1 day, 1 week, 1 month.
- Charts support zoom, pan, and crosshair interactions.
- Users can overlay technical indicators (e.g., RSI, MACD, Moving Averages, Bollinger Bands) on charts.
- Chart data is loaded from historical price records and updated in real-time.

### FR-2.3: Asset Search
- Users can search for assets by symbol or name using a search bar.
- The search provides autocomplete suggestions as the user types.
- Selecting a search result navigates to that asset's chart and detail view.

### FR-2.4: Flexible Dashboard Layout
- The dashboard is divided into functional blocks (chart panel, watchlist panel, AI chat panel, news panel).
- Users can rearrange panels by dragging and dropping.
- The layout configuration is saved to the user's preferences and restored on next login.

### FR-2.5: Asset Detail View
- For each asset, users can view a detail page showing: full chart, key statistics, latest news related to that asset, and recent AI analyses.

---

## FR-3: AI Chat Interface

### FR-3.1: Conversational AI Interaction
- Users can type natural-language messages to request market analyses, news summaries, or investment insights.
- The AI responds in real-time via streaming (SSE), displaying tokens word-by-word as they are generated.
- A loading indicator is shown while the AI is processing the request.

### FR-3.2: Multi-Turn Conversations
- The system maintains conversation context across multiple turns within the same session.
- Users can view the full conversation history within a chat session.
- Users can create new conversation sessions at any time.
- Users can view a list of their past conversations, with auto-generated titles.
- Users can rename or delete existing conversations.

### FR-3.3: Multi-Format Responses
- The AI can respond with: plain text, markdown-formatted text, data tables (e.g., price comparison tables), and inline charts.
- Tables and charts are rendered interactively within the chat interface.

### FR-3.4: Quick Action Buttons
- The chat interface displays pre-suggested quick action buttons (e.g., "Analyze VNM stock", "Summarize today's news", "Compare VNM vs FPT").
- Users can click a quick action button to immediately send that query without typing.
- Quick actions are context-aware and may update based on the user's recent activity or watchlist.

### FR-3.5: AI Tool Execution Transparency
- When the AI calls tools (e.g., fetching stock prices, running technical analysis), the user sees a summary of which tools were called and their results.
- Tool execution status is displayed in real-time (e.g., "Fetching VNM price…", "Analyzing technical indicators…").

### FR-3.6: Chat Sharing
- Users can generate a shareable link for a specific conversation or individual AI analysis response.
- The shared link is publicly accessible (read-only) and displays the conversation content.

### FR-3.7: PDF Import in Chat
- Users can upload a PDF file directly into the chat.
- The system processes the PDF (text extraction, chunking, vectorization) and makes its contents available to the AI for answering follow-up questions.
- The user sees a processing status indicator while the PDF is being indexed.

### FR-3.8: Rate Limiting & Guardrails
- Each user has a maximum number of AI queries per minute; exceeding this limit shows a user-friendly message with a countdown.
- The AI refuses to respond to abusive, off-topic, or harmful prompts and provides a polite refusal message.
- The system detects and blocks prompt injection attempts.

---

## FR-4: News Page

### FR-4.1: News Feed
- Users can browse a chronological feed of financial news articles aggregated from international sources.
- Each news card shows: headline, source name, publication time, category tag, and sentiment badge (positive / negative / neutral).
- Users can filter news by category (stocks, forex, commodities, macro).
- Users can filter news by sentiment (positive, negative, neutral).
- Users can filter news by time range (today, this week, this month).

### FR-4.2: News Detail View
- Users can click a news card to read the full article content.
- The detail view shows the full text, source attribution with a link to the original article, and the AI-generated sentiment analysis.

### FR-4.3: News Search
- Users can search for news articles by keyword.
- Search results are ranked by relevance and recency.

---

## FR-5: Economic Calendar

### FR-5.1: Calendar View
- Users can view upcoming and past economic events in a table format.
- Each event row shows: event name, country flag and code, impact level (low / medium / high), scheduled time, forecast value, previous value, and actual value (once released).
- Events are sorted chronologically by default.

### FR-5.2: Calendar Filtering
- Users can filter events by country (e.g., US, VN, EU).
- Users can filter events by impact level (low, medium, high).
- Users can filter events by date range.

### FR-5.3: Calendar Notifications
- High-impact events can optionally trigger in-app notifications to users who have enabled calendar alerts.

---

## FR-6: Community Forum & Blog

### FR-6.1: Article Creation
- Verified users can create analysis articles using a rich text editor.
- The editor supports: text formatting (bold, italic, headers, lists), image embedding, and direct insertion of live financial charts (not just screenshots).
- Users can save articles as drafts before publishing.
- Users can edit or delete their own published articles.

### FR-6.2: PDF Import in Articles
- Users can import `.pdf` files into an article; the system extracts text and inserts it as content.

### FR-6.3: Article Browsing
- Users can browse published articles in a feed sorted by recency or popularity (view count).
- Each article card shows: title, author name and avatar, excerpt, cover image, publication date, average rating, and tags.
- Users can filter articles by tags.

### FR-6.4: Article Detail View
- Users can read the full article, including embedded live charts.
- The view count is incremented on each visit.

### FR-6.5: Comments
- Authenticated users can post comments on articles.
- Comments support threading (replies to other comments via `parent_id`).
- Users can edit or delete their own comments.

### FR-6.6: Ratings
- Authenticated users can rate an article from 1 to 5 stars.
- Each user can only submit one rating per article; submitting again updates the existing rating.
- The average rating is displayed on the article card and detail view.

### FR-6.7: Tags
- Authors can add tags to their articles from a predefined tag list or create new tags.
- Users can click a tag to view all articles with that tag.

---

## FR-7: Portfolio Management

### FR-7.1: Portfolio CRUD
- Users can create multiple named portfolios (e.g., "Long-term holds", "Day trading").
- One portfolio is marked as the default and is displayed prominently on the dashboard.
- Users can rename, update the description of, or delete a portfolio.
- Deleting a portfolio removes all associated holdings.

### FR-7.2: Holdings Management
- Within a portfolio, users can add holdings by selecting an asset, entering a quantity, and an average buy price.
- Users can edit the quantity, average buy price, or notes of an existing holding.
- Users can remove a holding from a portfolio.
- The system displays: current market value, profit/loss amount, and profit/loss percentage for each holding based on real-time prices.

### FR-7.3: Portfolio Summary
- Users can view a portfolio summary showing: total value, total cost, total profit/loss, and allocation percentages per asset.

---

## FR-8: Watchlist

### FR-8.1: Watchlist Management
- Users can add any supported asset to their watchlist.
- Users can remove assets from their watchlist.
- Users can reorder watchlist items via drag-and-drop.
- Adding a duplicate asset to the watchlist is silently ignored (unique constraint per user).

### FR-8.2: Watchlist Display
- The watchlist panel shows each asset's: symbol, name, current price, price change, and change percentage.
- Prices in the watchlist update in real-time via WebSocket.
- Clicking an asset in the watchlist navigates to its chart view on the dashboard.

---

## FR-9: Alert System

### FR-9.1: Alert Creation
- Users can create price-based alerts by specifying: an asset, a condition (`price above`, `price below`, `price crosses`), and a target value.
- Users can create news-sentiment alerts (e.g., "Alert me when AI detects extremely negative news about VNM").
- Users can attach a custom message to any alert.

### FR-9.2: Alert Management
- Users can view a list of all their alerts with status badges (active, triggered, disabled).
- Users can edit the condition, target value, or message of an active alert.
- Users can disable or re-enable an alert without deleting it.
- Users can delete an alert permanently.

### FR-9.3: Alert Triggering
- When an alert condition is met, the system marks the alert as triggered and records the trigger timestamp.
- The user receives an in-app notification (and optionally a push notification or email based on their notification settings).
- Triggered alerts are moved to a "triggered" section and can be reset to active.

---

## FR-10: User Preferences & Settings

### FR-10.1: Theme
- Users can switch between Light Mode and Dark Mode.
- The selected theme is persisted and applied on all subsequent visits.

### FR-10.2: Language
- Users can switch the application language between English and Vietnamese.
- The selected language is persisted and applied globally.

### FR-10.3: Default Asset Type
- Users can set a default asset type filter (stocks, forex, commodities, etc.) that is applied when opening the dashboard.

### FR-10.4: Dashboard Layout Persistence
- The user's dashboard panel arrangement is automatically saved and restored across sessions.

### FR-10.5: Notification Preferences
- Users can configure which alert types trigger notifications and through which channels (in-app, email).

---

## FR-11: Social Sharing

### FR-11.1: Chart Sharing
- Users can generate a shareable image or link of a chart at its current state (asset, time range, indicators).
- The link can be shared externally (social media, messaging apps) and opens a read-only view.

### FR-11.2: AI Analysis Sharing
- Users can generate a shareable link for a specific AI analysis response or full conversation.
- The shared page renders the conversation in a readable format with chart and table outputs intact.

---

## FR-12: Fallback & Error Handling

### FR-12.1: API Downtime Fallback
- When external data APIs are unavailable, the dashboard displays the most recently cached data with a "Data may be delayed" banner.
- If the AI service is down, the chat interface displays a fallback message explaining the outage and suggesting internal resources (recent news, saved analyses).

### FR-12.2: Validation Feedback
- All user input forms display clear, field-specific validation error messages.
- Invalid asset symbols, unsupported file types, and out-of-range values are caught and communicated before submission.

### FR-12.3: Error Pages
- The application provides informative error pages for 404 (Not Found), 403 (Forbidden), and 500 (Server Error) scenarios.

---

## FR-13: Admin Features

### FR-13.1: User Management
- Admins can view a list of all registered users with search and filter capabilities.
- Admins can change a user's role (promote to admin or demote to user).
- Admins can disable or ban user accounts.
- Admins can manually verify user email addresses.

### FR-13.2: Content Moderation
- Admins can view, edit, or delete any article or comment across the platform.
- Admins can review flagged content (articles or comments reported by users).

### FR-13.3: System Monitoring
- Admins can view a dashboard showing: total users, active sessions, AI query volume, token cost usage, and error rates.
- Admins can view Logfire traces and DeepEval metrics to monitor AI agent performance.

### FR-13.4: News & Calendar Management
- Admins can manually add, edit, or remove news articles from the system.
- Admins can manually add or update economic calendar events.

---

## Appendix: Feature–EPIC Traceability Matrix

| Feature | EPIC 1 (AI Orchestration) | EPIC 2 (Backend) | EPIC 3 (UI) | EPIC 4 (Data Processing) |
|---|:---:|:---:|:---:|:---:|
| FR-1: Authentication | | ✅ | ✅ | |
| FR-2: Dashboard | | ✅ | ✅ | |
| FR-3: AI Chat | ✅ | ✅ | ✅ | ✅ |
| FR-4: News | | ✅ | ✅ | ✅ |
| FR-5: Economic Calendar | | ✅ | ✅ | |
| FR-6: Forum & Blog | | ✅ | ✅ | ✅ |
| FR-7: Portfolio | | ✅ | ✅ | |
| FR-8: Watchlist | | ✅ | ✅ | |
| FR-9: Alerts | ✅ | ✅ | ✅ | |
| FR-10: Preferences | | ✅ | ✅ | |
| FR-11: Social Sharing | | ✅ | ✅ | |
| FR-12: Fallback & Errors | ✅ | ✅ | ✅ | |
| FR-13: Admin | | ✅ | ✅ | |
