**CHỦ ĐỀ**: _"Nghiên cứu, thiết kế ứng dụng web phân tích thị trường tài chính dựa trên trí tuệ nhân tạo đa tác tử"_

**MÔ TẢ CHUNG VỀ DỰ ÁN**

Dự án tập trung xây dựng một nền tảng Web thông minh tích hợp trí tuệ nhân tạo không chỉ dừng lại ở mức chatbot hỗ trợ mà đóng vai trò là một hệ thống Multi-Agent (Đa tác tử) có khả năng tự chủ nghiên cứu, phân tích cảm xúc tin tức và hỗ trợ quyết định đầu tư thời gian thực. Hệ thống kết hợp giữa dữ liệu thị trường truyền thống và khả năng lập luận của LLM để tối ưu hóa trải nghiệm cho người dùng.

Ứng dụng tham khảo: [in.tradingview.com](https://in.tradingview.com); [forexfactory.com](https://forexfactory.com); [vn.investing.com](https://vn.investing.com) 

**PHÂN CHIA CÔNG VIỆC (THIẾT KẾ WBS)**

**EPIC 1: AI Orchestration Infrastructure (Hạ tầng điều phối AI)**

*   Tích hợp LLM: Thiết lập kết nối với các mô hình ngôn ngữ lớn (GPT-4, Claude Opus 4.6, Claude Sonnet 4.6, …) kèm cơ chế fallback.
    
*   Quản lý hội thoại: Theo dõi trạng thái hội thoại (Xử lý hội thoại đa bước) và lưu trữ ngữ cảnh người dùng.
    
*   Hệ thống MCP (Model Context Protocol): Thiết lập MCP server và thiết kế các công cụ để AI agents gọi tới khi cần, ví dụ: get\_stock\_price, analyze\_technical\_indicators,  get\_economic\_calender, …
    
*   Phân loại ý định: Xác định rõ ý định của người dùng (muốn xem biểu đồ, đọc tin tức, …)
    
*   Quản lý và tối ưu chi phí, lưu lượng token sử dụng từ các mô hình ngôn ngữ lớn. (Quản lý các mục liên quan như Context Window, …)
    
*   Tích hợp RAG: Thực hiện tích hợp kỹ thuật RAG để hỗ trợ truy xuất dữ liệu trong quá trình hoạt động của AI Agents.
    
*   Có cơ chế guardrail rõ ràng: Trả lời phù hợp đối với các hành vi như anti-abuse, violations, …

*   Bảo mật AI (Prompt Injection): Ngoài cơ chế anti-abuse (lọc ngôn ngữ không phù hợp), hệ thống phải ngăn chặn các cuộc tấn công Prompt Injection (đánh lừa AI tiết lộ system prompt hoặc thực thi các chỉ thị độc hại).

*   Caching & Rate Limiting: Triển khai cơ chế Caching (lưu trữ kết quả phân tích trước đó khi thị trường chưa có biến động) và Rate Limiting (giới hạn số lượng truy vấn/phút cho mỗi người dùng) để tránh sập hệ thống hoặc cạn kiệt ngân sách API.
    

**EPIC 2: Phát triển Backend & Xử lý dữ liệu**

*   API Design: 
    + Xây dựng các API endpoints thu thập dữ liệu giá theo thời gian thực (Cổ phiếu, Ngoại hối, Hàng hóa, …).
    + Xây dựng các API endpoints hỗ trợ quản lý người dùng (Đăng nhập, đăng ký, quản lý tài khoản); quản lý các bài viết, phân tích và trao đổi giữa các người dùng.
    
*   News Aggregator: Hệ thống thu thập tin tức từ các nguồn tài chính quốc tế và thông tin về lịch kinh tế.
    
*   Kết hợp cơ sở dữ liệu quan hệ với cơ sở dữ liệu vector: Lưu trữ và truy xuất dữ liệu lịch sử, báo cáo tài chính dưới dạng embeddings để hỗ trợ RAG.
    
*   Data validation: Có quy trình xác thực dữ liệu rõ ràng:
    + Định nghĩa schema rõ ràng cho mọi request/response.
    + Kiểm tra tính hợp lệ của một số loại dữ liệu đặc thù (Symbol, Time-range).
    
*   Bảo mật và tuân thủ:
    + Tích hợp mã xác thực và cơ chế JWT cho quá trình xác thực/xác minh người dùng.
    + Cơ chế phân quyền RBAC: Admin/Users.
    + Mã hóa mật khẩu người dùng bằng thuật toán bcrypt trước khi lưu trữ vào PostgreSQL.
    + Bảo vệ chống Cross-Site Scripting (XSS), đặc biệt quan trọng cho trang diễn đàn/blog nơi người dùng nhập rich text.
    + Bảo vệ chống Cross-Site Request Forgery (CSRF).

*   Giao tiếp thời gian thực: Sử dụng WebSockets để truyền tải dữ liệu giá theo thời gian thực và SSE (Server-Sent Events) để truyền tải phản hồi AI theo từng từ (tương tự ChatGPT).

*   Xử lý nền (Background Processing): Triển khai hệ thống background worker để liên tục thu thập dữ liệu tin tức, phân tích cảm xúc tin tức và lưu trữ vào cơ sở dữ liệu, hoạt động độc lập với luồng API chính.

*   Xử lý file PDF: Xây dựng quy trình xử lý file PDF bao gồm trích xuất văn bản (text extraction), chia nhỏ (chunking) và vector hóa (vectorization) để hỗ trợ tính năng import file .pdf ở EPIC 3.

*   Nhà cung cấp dữ liệu bên thứ ba: Xác định rõ các API cung cấp dữ liệu giá và tin tức tài chính, ví dụ: Alpha Vantage, Yahoo Finance, Finnhub.

*   API Quản lý danh mục đầu tư / Danh sách theo dõi (Portfolio/Watchlist): Xây dựng các API endpoints cho phép người dùng thêm/xóa/chỉnh sửa các tài sản tài chính mà họ đang nắm giữ hoặc quan tâm theo dõi.

*   Hệ thống cảnh báo (Alert System): Xây dựng cơ chế đặt cảnh báo cho người dùng (ví dụ: "Cảnh báo khi VNM vượt 70.000" hoặc "Cảnh báo khi AI phát hiện tin tức thị trường tiêu cực bất thường").
    

**EPIC 3: Giao diện người dùng & Tính tương tác**

*   Giao diện trò chuyện (AI Chat Interface):
    + Đa dạng hóa format câu phản hồi: dạng text, dạng bảng (ví dụ: bảng giá), dạng biểu đồ.
    + Nút thao tác nhanh: Gợi ý sẵn các câu hỏi hoặc lệnh phổ biến - FAQ (Ví dụ: "Phân tích mã VNM", "Tóm tắt tin tức hôm nay") giúp người dùng tương tác nhanh mà không cần gõ nhiều.+ Trạng thái xử lý thời gian thực: Hiển thị rõ ràng lúc AI đang trong quá trình sinh câu trả lời để người dùng biết rằng hệ thống đang hoạt động.
    
*   Bảng điều khiển dữ liệu tài chính (Financial Dashboard):
    + Bố cục linh hoạt: Giao diện được chia thành các khối chức năng có thể sắp xếp lại theo sở thích (Biểu đồ ở giữa, danh mục theo dõi bên phải, AI chat bên trái).
    
*   Trang tin tức và lịch kinh tế:
    + Trang tin tức: Sắp xếp tin tức theo dòng thời gian (Tham khảo từ [investing.com](http://investing.com))
    + Trang lịch kinh tế: Thiết kế dạng bảng, sắp xếp theo dòng thời gian, có gán nhãn quốc gia xuất xứ, thời gian ra tin (Tham khảo từ investing.com). 
    
*   Trang diễn đàn và blog cộng đồng:
    + Công cụ soạn thảo thông minh: Hỗ trợ người dùng tạo bài viết phân tích chuyên nghiệp bằng cách chèn trực tiếp các biểu đồ thực tế vào bài viết thay vì chỉ dùng ảnh chụp màn hình tĩnh.
    + Cho phép các phần bình luận, đánh giá (1-5 sao).
    + Cho phép import file .pdf
    
*   Fallback message: Chuẩn bị các tin nhắn phù hợp với các chủ đề và dữ liệu nội bộ để hiển thị khi API không hoạt động.
    
*   Ngôn ngữ: Hỗ trợ 2 ngôn ngữ Tiếng Anh và Tiếng Việt.
    
*   Hỗ trợ Light Mode / Dark Mode.

*   Quản lý danh mục đầu tư / Danh sách theo dõi (Portfolio/Watchlist): Giao diện cho phép người dùng quản lý các tài sản tài chính đang nắm giữ hoặc quan tâm theo dõi trực tiếp trên Dashboard.

*   Giao diện cảnh báo (Alert Interface): Giao diện cho phép người dùng thiết lập và quản lý các cảnh báo về giá hoặc tin tức thị trường.

*   Chia sẻ mạng xã hội (Social Sharing): Tính năng tạo liên kết chia sẻ cho biểu đồ hoặc nhật ký trò chuyện phân tích AI ra bên ngoài diễn đàn.
    

**KIẾN TRÚC KỸ THUẬT (TECHNICAL STACK)**

**AI Orchestration Layer:**

*   Framework: pydantic-ai cho agent orchestration
    
*   Monitoring & Observability: Logfire
    
*   Evaluation: Một thư viện hỗ trợ đánh giá thông qua cơ chế LLM-as-a-Judge (VD: DeepEval)
    
*   ORM: sqlalchemy
    

**Backend:**

*   Ngôn ngữ chính: Python 3.13
    
*   Framework: FastAPI

*   Caching & In-memory Data Store: Redis (hỗ trợ Rate Limiting, lưu trữ session, và đóng vai trò làm Message Broker cho WebSockets)

*   Task Queue / Background Jobs: Celery + RabbitMQ (hoặc sử dụng Redis) để chạy hệ thống thu thập tin tức độc lập với luồng API chính

*   Thư viện xử lý tài liệu (Document Parser): PyMuPDF hoặc pdfplumber, kết hợp với LangChain document loaders để hỗ trợ tính năng import file PDF
    

**Frontend:**

*   React
    
*   TailwindCSS

*   Thư viện biểu đồ (Charting Library): Lightweight Charts (của TradingView) hoặc Recharts để vẽ biểu đồ tài chính

*   Quản lý trạng thái (State Management): Zustand hoặc Redux Toolkit để quản lý các trạng thái phức tạp của ứng dụng Dashboard (ví dụ: giữ nguyên trạng thái chat khi chuyển đổi mã cổ phiếu)
    

**Database:**

*   PostgreSQL
    
*   Vector Database: Qdrant

**DevOps / Deployment:**

*   Docker: Đồng bộ môi trường phát triển cho nhóm 3 thành viên

*   GitHub Actions: CI/CD cơ bản