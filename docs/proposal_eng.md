**TOPIC**: _"Research and design a web application for financial market analysis based on multi-agent artificial intelligence"_

**GENERAL PROJECT DESCRIPTION**

The project focuses on building an intelligent Web platform integrated with artificial intelligence that goes beyond a mere support chatbot, serving as a Multi-Agent system capable of autonomously researching, analyzing news sentiment, and supporting real-time investment decisions. The system combines traditional market data with the reasoning capabilities of LLMs to optimize the user experience.

Reference applications: [in.tradingview.com](https://in.tradingview.com); [forexfactory.com](https://forexfactory.com); [vn.investing.com](https://vn.investing.com) 

**WORK BREAKDOWN (WBS DESIGN)**

**EPIC 1: AI Orchestration Infrastructure**

*   LLM Integration: Establish connections with large language models (GPT-4, Claude Opus 4.6, Claude Sonnet 4.6, …) with fallback mechanisms.
    
*   Conversation Management: Track conversation states (Multi-step conversation handling) and store user context.
    
*   MCP (Model Context Protocol) System: Set up MCP server and design tools for AI agents to call when needed, for example: get\_stock\_price, analyze\_technical\_indicators, get\_economic\_calendar, …
    
*   Intent Classification: Clearly identify user intent (wanting to view charts, read news, …)
    
*   Cost Management and Optimization: Manage and optimize costs and token usage from large language models. (Manage related items such as Context Window, …)
    
*   RAG Integration: Implement RAG technique integration to support data retrieval during AI Agents operation.
    
*   Clear Guardrail Mechanism: Provide appropriate responses for behaviors such as anti-abuse, violations, …

*   AI Security (Prompt Injection): Beyond anti-abuse mechanisms (filtering inappropriate language), the system must prevent Prompt Injection attacks (which trick the AI into revealing system prompts or executing malicious instructions).

*   Caching & Rate Limiting: Implement a Caching mechanism (to store previous analysis results when the market has not fluctuated) and Rate Limiting (to restrict the number of queries/minute per user) to prevent system crashes or API budget depletion.
    

**EPIC 2: Backend Development & Data Processing**

*   API Design:
    + Build API endpoints for real-time price data collection (Stocks, Forex, Commodities, …). 
    + Build API endpoints to support user management (Login, registration, account management); manage articles, analysis, and discussions between users.
    
*   News Aggregator: A system for collecting news from international financial sources and economic calendar information.
    
*   Combining Relational Database with Vector Database: Store and retrieve historical data and financial reports as embeddings to support RAG.
    
*   Data Validation: Have a clear data validation process: 
    + Define clear schemas for all request/response. 
    + Validate the legitimacy of certain specific data types (Symbol, Time-range).
    
*   Security and Compliance: 
    + Integrate authentication codes and JWT mechanism for user authentication/verification. 
    + RBAC authorization mechanism: Admin/Users. 
    + Encrypt user passwords using bcrypt algorithm before storing in PostgreSQL. 
    + Cross-Site Scripting (XSS) protection, which is especially important for the forum/blog page where users input rich text. 
    + Cross-Site Request Forgery (CSRF) protection.

*   Real-time Communication: Use WebSockets for streaming real-time price data and SSE (Server-Sent Events) for streaming AI responses word-by-word (similar to ChatGPT).

*   Background Processing: Deploy a background worker system to continuously crawl news data, analyze news sentiment, and save to the database, operating independently from the main API flow.

*   PDF File Processing: Build a PDF file processing pipeline including text extraction, chunking, and vectorization to support the PDF import feature in EPIC 3.

*   Third-party Data Providers: Clearly define which APIs will provide price and financial news data, for example: Alpha Vantage, Yahoo Finance, Finnhub.

*   Portfolio/Watchlist Management API: Build API endpoints allowing users to add/remove/edit the financial assets they hold or are interested in tracking.

*   Alert System: Build an alert mechanism for users (e.g., "Alert me when VNM crosses 70,000" or "Alert me when AI detects extremely negative market news").
    

**EPIC 3: User Interface & Interactivity**

*   AI Chat Interface: 
    + Diversify response formats: text, table (e.g., price table), chart. 
    + Quick action buttons: Pre-suggest common questions or commands - FAQ (e.g., "Analyze VNM stock", "Summarize today's news") to help users interact quickly without needing to type much. 
    + Real-time processing status: Clearly display when AI is generating a response so users know the system is active.
    
*   Financial Data Dashboard: 
    + Flexible layout: The interface is divided into functional blocks that can be rearranged according to preferences (Chart in the center, watchlist on the right, AI chat on the left).
    
*   News Page and Economic Calendar: 
    + News page: Arrange news chronologically (Reference from [investing.com](http://investing.com)). 
    + Economic calendar page: Designed in table format, arranged chronologically, labeled with country of origin and news release time (Reference from investing.com).
    
*   Community Forum and Blog Page: 
    + Smart editing tools: Support users in creating professional analysis articles by directly inserting real charts into articles instead of using only static screenshots. 
    + Allow comments and ratings (1-5 stars). 
    + Allow importing .pdf files.
    
*   Fallback Message: Prepare appropriate messages with internal topics and data to display when the API is not operational.
    
*   Language: Support 2 languages, English and Vietnamese.
    
*   Support Light Mode / Dark Mode.

*   Portfolio/Watchlist Management: Interface allowing users to manage the financial assets they hold or are interested in tracking directly on the Dashboard.

*   Alert Interface: Interface allowing users to set up and manage alerts for price or market news.

*   Social Sharing: Feature to generate shareable links for charts or AI analysis chat logs outside the forum.
    

**TECHNICAL ARCHITECTURE (TECHNICAL STACK)**

**AI Orchestration Layer:**

*   Framework: pydantic-ai for agent orchestration
    
*   Monitoring & Observability: Logfire
    
*   Evaluation: A library supporting evaluation through the LLM-as-a-Judge mechanism (e.g., DeepEval)
    
*   ORM: sqlalchemy
    

**Backend:**

*   Primary Language: Python 3.13
    
*   Framework: FastAPI

*   Caching & In-memory Data Store: Redis (for Rate Limiting, session storage, and serving as a Message Broker for WebSockets)

*   Task Queue / Background Jobs: Celery + RabbitMQ (or use Redis) to run the news aggregation system independently from the main API flow

*   Document Parser Library: PyMuPDF or pdfplumber, combined with LangChain document loaders to support the PDF import feature
    

**Frontend:**

*   React
    
*   TailwindCSS

*   Charting Library: Lightweight Charts (by TradingView) or Recharts for drawing financial charts

*   State Management: Zustand or Redux Toolkit to manage complex application states of the Dashboard (e.g., keeping chat state intact when switching stock symbols)
    

**Database:**

*   PostgreSQL
    
*   Vector Database: Qdrant

**DevOps / Deployment:**

*   Docker: Unify the development environment for the 3-member team

*   GitHub Actions: Basic CI/CD
