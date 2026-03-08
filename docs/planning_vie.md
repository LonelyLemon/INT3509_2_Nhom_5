# Kế Hoạch & Tiến Độ Dự Án

**Dự án**: Ứng dụng Web phân tích thị trường tài chính dựa trên trí tuệ nhân tạo đa tác tử  
**Thời gian**: 09/03/2026 – 24/05/2026 (11 tuần, 55 ngày làm việc)

---

## Nhân sự

| Mã | Vai trò | Phạm vi trách nhiệm |
|----|---------|----------------------|
| **FE** | Lập trình viên Frontend | React, TailwindCSS, Lightweight Charts, Zustand, UI/UX |
| **BE1** | Lập trình viên Backend-AI 1 | Điều phối AI, tích hợp LLM, RAG, pydantic-ai, đánh giá AI |
| **BE2** | Lập trình viên Backend-AI 2 | FastAPI APIs, cơ sở dữ liệu, hạ tầng, DevOps, bảo mật |

---

## Giai đoạn 1: Nền tảng & Khởi tạo (Tuần 1–2)

### Tuần 1 — 09/03–13/03: Khởi tạo dự án & Xác thực người dùng

| Ngày | Ngày tháng | Người phụ trách | Công việc | Tiêu chí hoàn thành |
|------|------------|-----------------|-----------|----------------------|
| T2 | 09/03 | **ALL** | Khởi động dự án: thống nhất chiến lược Git branching, cấu trúc repo, quy ước code | Repo được khởi tạo với cấu trúc thư mục đã thống nhất và `README.md` |
| T2 | 09/03 | **BE2** | Thiết lập Docker Compose: các container PostgreSQL, Qdrant, Redis | `docker compose up` khởi chạy tất cả dịch vụ; health check pass |
| T2 | 09/03 | **BE1** | Khung dự án FastAPI: cấu trúc thư mục, config, quản lý `.env` | FastAPI server khởi chạy với endpoint `/health` trả về `200 OK` |
| T2 | 09/03 | **FE** | Khung dự án React + Vite, cài đặt TailwindCSS, ESLint/Prettier | `npm run dev` khởi chạy ứng dụng với trang placeholder đã được style |
| T3 | 10/03 | **BE2** | Thiết kế schema CSDL: bảng users, articles, watchlist, alerts, conversations | Sơ đồ ERD hoặc file migration được review và commit |
| T3 | 10/03 | **BE1** | Thiết lập SQLAlchemy models + Alembic migration cho tất cả bảng chính | Migration chạy thành công; các bảng được tạo trong PostgreSQL |
| T3 | 10/03 | **FE** | Hệ thống thiết kế: bảng màu, typography (Google Fonts), biến CSS cho dark/light mode | Design tokens được định nghĩa; nút chuyển dark/light chuyển đúng tất cả màu sắc |
| T4 | 11/03 | **BE2** | Pipeline CI/CD bằng GitHub Actions: lint, test, build khi tạo PR | PR thử nghiệm kích hoạt pipeline thành công |
| T4 | 11/03 | **BE1** | API Xác thực: endpoints `/register`, `/login`, `/refresh-token` với JWT + bcrypt | Endpoints trả JWT token chính xác; mật khẩu được lưu dạng bcrypt hash |
| T4 | 11/03 | **FE** | Giao diện trang Đăng nhập / Đăng ký với validation | Cả hai trang hiển thị chính xác với phản hồi validation phía client |
| T5 | 12/03 | **BE2** | Middleware RBAC (vai trò Admin/User), decorator phân quyền | Endpoint được bảo vệ trả về `403` cho vai trò không được phép |
| T5 | 12/03 | **BE1** | Hoàn thiện xác thực: đăng xuất, đổi mật khẩu, xác minh email | Tất cả endpoint xác thực được test và ghi nhận trên Swagger |
| T5 | 12/03 | **FE** | Tích hợp xác thực: kết nối trang Đăng nhập/Đăng ký với API backend, lưu token | Người dùng có thể đăng ký, đăng nhập và xem nội dung được bảo vệ |
| T6 | 13/03 | **BE2** | Tích hợp Redis: middleware giới hạn tần suất (`X requests/phút/user`) | Endpoint bị giới hạn trả `429` khi vượt ngưỡng; giới hạn có thể cấu hình |
| T6 | 13/03 | **BE1** | API quản lý người dùng: lấy/cập nhật hồ sơ, cài đặt tài khoản | Endpoint hồ sơ trả về và cập nhật dữ liệu user chính xác |
| T6 | 13/03 | **FE** | Giao diện trang hồ sơ + kết nối với API quản lý người dùng | Trang hồ sơ hiển thị và chỉnh sửa thông tin user, lưu thay đổi thành công |

### Tuần 2 — 16/03–20/03: API Dữ liệu chính & Bố cục Dashboard

| Ngày | Ngày tháng | Người phụ trách | Công việc | Tiêu chí hoàn thành |
|------|------------|-----------------|-----------|----------------------|
| T2 | 16/03 | **BE1** | Tích hợp nhà cung cấp dữ liệu: kết nối Alpha Vantage / Yahoo Finance / Finnhub lấy dữ liệu giá | Lấy dữ liệu giá thời gian thực và lịch sử trả về JSON hợp lệ |
| T2 | 16/03 | **BE2** | Thiết lập WebSocket server (FastAPI WebSocket endpoint) cho truyền tải giá thời gian thực | Client WebSocket kết nối và nhận được tin nhắn giá thử nghiệm |
| T2 | 16/03 | **FE** | Bố cục dashboard chính: header, sidebar, khối nội dung linh hoạt (panels có thể thay đổi kích thước) | Dashboard hiển thị với các khối layout có thể kéo/thay đổi kích thước |
| T3 | 17/03 | **BE1** | Endpoint dữ liệu giá: `/prices/{symbol}`, `/prices/{symbol}/history`, `/prices/batch` | Endpoint trả dữ liệu giá có cấu trúc với khoảng thời gian chính xác |
| T3 | 17/03 | **BE2** | WebSocket streaming giá: đăng ký/hủy đăng ký theo symbol, phát sóng tick thời gian thực | Nhiều client nhận được cập nhật giá cho các symbol đã đăng ký |
| T3 | 17/03 | **FE** | Tích hợp Lightweight Charts: component biểu đồ nến với zoom/pan | Biểu đồ hiển thị dữ liệu nến thực với điều khiển tương tác |
| T4 | 18/03 | **BE1** | Endpoint chỉ báo kỹ thuật: SMA, EMA, RSI, MACD | Chỉ báo trả giá trị tính toán chính xác cho symbol/khung thời gian cho trước |
| T4 | 18/03 | **BE2** | Middleware xác thực dữ liệu: Pydantic schema cho Symbol, Time-range, request giá | Input không hợp lệ trả lỗi `422` rõ ràng với thông báo theo trường |
| T4 | 18/03 | **FE** | Component tìm kiếm/chọn mã + chuyển đổi biểu đồ | Người dùng có thể tìm mã cổ phiếu và chuyển đổi view biểu đồ động |
| T5 | 19/03 | **BE1** | Caching dữ liệu giá với Redis (dựa trên TTL, vô hiệu hóa khi có biến động lớn) | Các request lặp lại được phục vụ từ cache; cache miss lấy dữ liệu mới |
| T5 | 19/03 | **BE2** | Tích hợp nguồn tin tức: kết nối API tin tức tài chính (Finnhub News, v.v.) | Dữ liệu tin tức thô được lấy về và cấu trúc hóa thành model nội bộ |
| T5 | 19/03 | **FE** | Component sidebar danh sách theo dõi (thêm/xóa symbol, hiển thị giá mini live) | Sidebar hiển thị các symbol của user với chỉ báo giá live |
| T6 | 20/03 | **BE1** | Kiểm thử API giá, xử lý lỗi, trường hợp biên (thị trường đóng cửa, symbol không hợp lệ) | Tất cả trường hợp biên trả phản hồi lỗi phù hợp; bộ test pass |
| T6 | 20/03 | **BE2** | Tích hợp dữ liệu lịch kinh tế (Finnhub/scraper Investing.com) | Sự kiện lịch được lấy với ngày, quốc gia, mức độ ảnh hưởng, giá trị thực tế/dự báo |
| T6 | 20/03 | **FE** | Hoàn thiện layout responsive cho Dashboard + chốt chuyển đổi Light/Dark mode | Dashboard sử dụng được trên tablet & desktop; nút chuyển mode lưu tùy chọn |

---

## Giai đoạn 2: AI Cốt lõi & Chat (Tuần 3–4)

### Tuần 3 — 23/03–27/03: Thiết lập AI Agent & Giao diện Chat

| Ngày | Ngày tháng | Người phụ trách | Công việc | Tiêu chí hoàn thành |
|------|------------|-----------------|-----------|----------------------|
| T2 | 23/03 | **BE1** | Khung pydantic-ai agent: cấu hình kết nối LLM (GPT-4, Claude), logic chọn model | Agent khởi tạo và trả phản hồi cơ bản từ mỗi nhà cung cấp LLM |
| T2 | 23/03 | **BE2** | Thiết lập MCP server: MCP server dựa trên FastAPI với framework đăng ký tool | MCP server khởi chạy; các tool có thể đăng ký và liệt kê qua API |
| T2 | 23/03 | **FE** | Bố cục giao diện AI Chat: panel danh sách tin nhắn, hộp nhập, nút gửi, drawer hội thoại | UI Chat hiển thị với lịch sử tin nhắn cuộn được và vùng nhập liệu |
| T3 | 24/03 | **BE1** | Cơ chế fallback LLM: tự động chuyển khi lỗi/timeout, cấu hình chuỗi ưu tiên | Khi LLM chính lỗi, agent chuyển sang LLM phụ một cách liền mạch |
| T3 | 24/03 | **BE2** | Triển khai MCP tools: `get_stock_price`, `analyze_technical_indicators` | Tools gọi được qua giao thức MCP; trả dữ liệu live chính xác |
| T3 | 24/03 | **FE** | Renderer tin nhắn chat: text với markdown, bảng dữ liệu, component biểu đồ inline | Tin nhắn hiển thị đúng ở cả 3 format (text, bảng, biểu đồ) |
| T4 | 25/03 | **BE1** | Quản lý hội thoại: theo dõi trạng thái đa bước, lưu trữ ngữ cảnh user trong DB | Lịch sử hội thoại lưu trữ xuyên phiên; context window được quản lý |
| T4 | 25/03 | **BE2** | Triển khai MCP tools: `get_economic_calendar`, `get_news_summary` | Tất cả MCP tools trả dữ liệu chính xác, đã format |
| T4 | 25/03 | **FE** | Nút thao tác nhanh: câu hỏi FAQ có sẵn ("Phân tích VNM", "Tóm tắt tin tức hôm nay") | Nhấn nút điền input và gửi truy vấn |
| T5 | 26/03 | **BE1** | Phân loại ý định: định tuyến truy vấn user đến agent/tool phù hợp | Phân loại đúng các ý định: biểu đồ, tin tức, phân tích, chung |
| T5 | 26/03 | **BE2** | Endpoint SSE cho streaming phản hồi AI theo từng từ | SSE stream gửi token khi được sinh ra; client nhận text tăng dần |
| T5 | 26/03 | **FE** | Tích hợp SSE: hiển thị phản hồi AI thời gian thực (streaming từng từ) | Chat hiển thị phản hồi AI khi đang stream, có chỉ báo đang gõ |
| T6 | 27/03 | **BE1** | API Chat: endpoints `/chat/send`, `/chat/history`, `/chat/conversations` | Endpoint chat hoạt động end-to-end: gửi tin → nhận phản hồi AI stream |
| T6 | 27/03 | **BE2** | Lưu trữ lịch sử hội thoại: lưu/truy xuất toàn bộ thread chat từ DB | Lịch sử chat tải lại khi refresh trang; hội thoại cũ có thể duyệt |
| T6 | 27/03 | **FE** | Drawer lịch sử chat: liệt kê hội thoại cũ, tải hội thoại đã chọn | Người dùng có thể duyệt và tiếp tục các phiên chat cũ |

### Tuần 4 — 30/03–03/04: An toàn AI, Hệ thống Tin tức & Xử lý nền

| Ngày | Ngày tháng | Người phụ trách | Công việc | Tiêu chí hoàn thành |
|------|------------|-----------------|-----------|----------------------|
| T2 | 30/03 | **BE1** | Cơ chế guardrail: lọc chủ đề, kiểm tra an toàn phản hồi, quy tắc anti-abuse | Truy vấn lạc đề hoặc lạm dụng nhận tin nhắn từ chối phù hợp |
| T2 | 30/03 | **BE2** | Thiết lập Celery + Redis/RabbitMQ: hạ tầng background worker | Celery worker khởi chạy; task thử nghiệm thực thi bất đồng bộ và ghi log |
| T2 | 30/03 | **FE** | Bố cục trang tin tức: dạng dòng thời gian, bộ lọc chuyên mục, thanh tìm kiếm | Trang tin tức hiển thị với dữ liệu placeholder dạng timeline |
| T3 | 31/03 | **BE1** | Bảo vệ prompt injection: lọc input, cô lập system prompt, quy tắc phát hiện | Các nỗ lực prompt injection bị chặn; system prompt không bao giờ bị lộ |
| T3 | 31/03 | **BE2** | Task thu thập tin tức nền: crawl định kỳ từ nhiều nguồn | Celery beat lên lịch crawl; tin tức tự động lưu vào DB mỗi N phút |
| T3 | 31/03 | **FE** | Card bài tin tức: tiêu đề, nguồn, nhãn cảm xúc, thời gian, đoạn xem trước | Card hiển thị tất cả trường; nhấn vào mở chế độ xem toàn bộ bài |
| T4 | 01/04 | **BE1** | Quản lý context window: đếm token, cắt tỉa hội thoại, tóm tắt tự động | Hội thoại dài được tóm tắt tự động để nằm trong giới hạn token |
| T4 | 01/04 | **BE2** | Pipeline phân tích cảm xúc tin tức (dựa trên LLM, chạy như background job) | Mỗi bài tin được gán điểm cảm xúc (tích cực/trung lập/tiêu cực) lưu trong DB |
| T4 | 01/04 | **FE** | Trang lịch kinh tế: bảng với ngày/giờ, sự kiện, cờ quốc gia, mức ảnh hưởng, thực tế/dự báo | Lịch hiển thị dữ liệu thực với bộ lọc theo khoảng ngày và quốc gia |
| T5 | 02/04 | **BE1** | Tích hợp giám sát Logfire: trace các lời gọi AI agent, log token usage, độ trễ | Dashboard Logfire hiển thị request trace, tiêu thụ token và tỷ lệ lỗi |
| T5 | 02/04 | **BE2** | Endpoint API tin tức: `/news` (liệt kê, lọc theo ngày/cảm xúc/nguồn), `/news/{id}` | Endpoint trả tin tức phân trang với bộ lọc; bài đơn lẻ theo ID hoạt động |
| T5 | 02/04 | **FE** | Controls lọc lịch: theo quốc gia, mức độ quan trọng, chọn khoảng ngày | Bộ lọc thu hẹp đúng sự kiện hiển thị; lọc kết hợp hoạt động |
| T6 | 03/04 | **BE1** | Kiểm thử end-to-end AI agent: test tất cả đường ý định với truy vấn mẫu | Bộ test bao phủ ≥ 10 truy vấn đại diện; tất cả trả phản hồi hợp lệ |
| T6 | 03/04 | **BE2** | API lịch kinh tế: `/calendar` (liệt kê, lọc theo ngày/quốc gia/mức quan trọng) | Endpoint lịch trả sự kiện có cấu trúc với bộ lọc chính xác |
| T6 | 03/04 | **FE** | Hoàn thiện UI trang Tin tức + Lịch: trạng thái loading, trạng thái trống, xử lý lỗi | Trang xử lý mọi trạng thái (spinner loading, "không có kết quả", lỗi API) |

---

## Giai đoạn 3: RAG, Danh mục & Cảnh báo (Tuần 5–6)

### Tuần 5 — 06/04–10/04: Tích hợp RAG & Quản lý Danh mục Đầu tư

| Ngày | Ngày tháng | Người phụ trách | Công việc | Tiêu chí hoàn thành |
|------|------------|-----------------|-----------|----------------------|
| T2 | 06/04 | **BE1** | Thiết lập Qdrant vector store: schema collection, chọn embedding model | Collection Qdrant được tạo; tài liệu test được embed và truy xuất thành công |
| T2 | 06/04 | **BE2** | Thiết kế API Portfolio/Watchlist: data models, đặc tả endpoint | API spec được ghi nhận trong Swagger với tất cả CRUD operations |
| T2 | 06/04 | **FE** | Bố cục trang quản lý danh mục: bảng holdings, form thêm tài sản, thẻ tóm tắt | Trang hiển thị với cấu trúc bảng và modal thêm tài sản |
| T3 | 07/04 | **BE1** | Pipeline nhúng tài liệu: chunk báo cáo tài chính → embed → lưu Qdrant | Tài liệu tài chính mẫu được chunk và lưu; tìm kiếm tương đồng trả chunk liên quan |
| T3 | 07/04 | **BE2** | Endpoint CRUD Portfolio: thêm/xóa/sửa holdings với số lượng, giá mua, ngày | Tất cả CRUD hoạt động; giá trị portfolio tính từ giá live |
| T3 | 07/04 | **FE** | UI Portfolio: thêm/sửa/xóa tài sản, input số lượng & giá, dialog xác nhận | Người dùng quản lý được các mục portfolio; thay đổi lưu sau refresh |
| T4 | 08/04 | **BE1** | RAG retrieval chain: tích hợp tìm kiếm vector vào pipeline lập luận của AI agent | AI agent truy vấn Qdrant lấy ngữ cảnh trước khi sinh phản hồi phân tích tài chính |
| T4 | 08/04 | **BE2** | Endpoint CRUD Watchlist: thêm/xóa symbol, sắp xếp lại, cài đặt tùy chọn | API Watchlist đã test; symbol lưu trữ theo tài khoản user |
| T4 | 08/04 | **FE** | Quản lý watchlist: kéo để sắp xếp, thêm nhanh từ biểu đồ, xóa bằng vuốt | Watchlist tương tác đầy đủ; thay đổi đồng bộ với backend |
| T5 | 09/04 | **BE1** | Kiểm thử chất lượng RAG: đo mức liên quan truy xuất trên truy vấn tài chính | Precision truy xuất ≥ 70% trên bộ test; chunk không liên quan bị lọc |
| T5 | 09/04 | **BE2** | Xác thực dữ liệu Portfolio + trường hợp biên (symbol trùng, số lượng âm) | Input không hợp lệ bị từ chối với thông báo lỗi rõ ràng |
| T5 | 09/04 | **FE** | Widget dashboard Portfolio: biểu đồ tròn (phân bổ), tổng giá trị, thẻ tóm tắt P&L | Widget hiển thị dữ liệu portfolio tổng hợp chính xác |
| T6 | 10/04 | **BE1** | Tối ưu RAG: điều chỉnh kích thước chunk, so sánh embedding model, re-ranking | Chất lượng phản hồi cải thiện; độ trễ trong phạm vi chấp nhận (< 3s) |
| T6 | 10/04 | **BE2** | Kiểm thử tích hợp API Portfolio/Watchlist | Test end-to-end pass cho tất cả luồng portfolio và watchlist |
| T6 | 10/04 | **FE** | Tích hợp WebSocket: cập nhật giá live trên watchlist & giá trị portfolio | Giá cập nhật thời gian thực không cần refresh trang |

### Tuần 6 — 13/04–17/04: Hệ thống Cảnh báo & Diễn đàn Cộng đồng

| Ngày | Ngày tháng | Người phụ trách | Công việc | Tiêu chí hoàn thành |
|------|------------|-----------------|-----------|----------------------|
| T2 | 13/04 | **BE1** | Lõi hệ thống cảnh báo: models cảnh báo (ngưỡng giá, dựa trên cảm xúc), logic kích hoạt | Trigger cảnh báo kích hoạt chính xác khi điều kiện được đáp ứng trong kịch bản test |
| T2 | 13/04 | **BE2** | Lưu trữ & phân phối cảnh báo: DB models, cơ chế đẩy thông báo qua WebSocket | Cảnh báo được kích hoạt lưu vào DB và đẩy tới client đang kết nối qua WebSocket |
| T2 | 13/04 | **FE** | Bố cục trang Diễn đàn/Blog: danh sách bài viết, nút tạo bài, sidebar chuyên mục | Trang diễn đàn hiển thị với card bài viết và điều hướng |
| T3 | 14/04 | **BE1** | Giám sát cảnh báo giá: task nền kiểm tra ngưỡng giá định kỳ | Cảnh báo giá kích hoạt trong vòng 1 phút khi vượt ngưỡng; thông báo được gửi |
| T3 | 14/04 | **BE2** | API CRUD cảnh báo: tạo/đọc/cập nhật/xóa cảnh báo, liệt kê cảnh báo đang hoạt động theo user | Tất cả endpoint CRUD cảnh báo hoạt động; user quản lý được cảnh báo của mình |
| T3 | 14/04 | **FE** | Tích hợp trình soạn thảo rich text (VD: TipTap/Slate) cho tạo bài blog | Editor hỗ trợ bold, italic, tiêu đề, danh sách, code block, hình ảnh |
| T4 | 15/04 | **BE1** | Cảnh báo AI: phát hiện cảm xúc tiêu cực bất thường từ phân tích tin tức | Cảnh báo cảm xúc kích hoạt khi cảm xúc tin tức tổng hợp giảm dưới ngưỡng |
| T4 | 15/04 | **BE2** | Phân phối thông báo cảnh báo: trung tâm thông báo in-app + đẩy WebSocket | Thông báo xuất hiện thời gian thực trên biểu tượng chuông/panel thông báo |
| T4 | 15/04 | **FE** | Nhúng biểu đồ live trong bài blog: chèn Lightweight Charts tương tác vào editor | Biểu đồ trong bài viết tương tác được (zoom/pan), không phải ảnh tĩnh |
| T5 | 16/04 | **BE1** | Caching phân tích AI: lưu và tái sử dụng kết quả phân tích gần đây (Redis, TTL cấu hình được) | Truy vấn giống nhau trong TTL trả phản hồi cached; cache vô hiệu khi thị trường thay đổi |
| T5 | 16/04 | **BE2** | API Bài viết/Post: CRUD cho bài viết, nội dung markdown/HTML, thông tin tác giả, thời gian | Bài viết tạo, liệt kê, cập nhật, xóa qua API; nội dung hiển thị đúng |
| T5 | 16/04 | **FE** | UI phần bình luận & đánh giá sao (1–5 sao) dưới mỗi bài viết | Người dùng có thể bình luận và đánh giá; điểm trung bình hiển thị trên card bài |
| T6 | 17/04 | **BE1** | Kiểm thử end-to-end hệ thống cảnh báo (cảnh báo giá + cảm xúc) | Tất cả loại cảnh báo được test; tỷ lệ false positive chấp nhận được |
| T6 | 17/04 | **BE2** | API Bình luận & Đánh giá: thêm/liệt kê bình luận, gửi/cập nhật đánh giá, tính trung bình | Thread bình luận hoạt động; đánh giá trung bình cập nhật đúng khi có submission mới |
| T6 | 17/04 | **FE** | Danh sách bài + trang chi tiết: phân trang, sắp xếp (mới nhất/đánh giá cao), link hồ sơ tác giả | Diễn đàn duyệt được với sắp xếp/phân trang; trang chi tiết hiển thị đầy đủ nội dung + bình luận |

---

## Giai đoạn 4: Xử lý PDF & Tăng cường Bảo mật (Tuần 7)

### Tuần 7 — 20/04–24/04: Pipeline PDF, Bảo mật & Chia sẻ Mạng xã hội

| Ngày | Ngày tháng | Người phụ trách | Công việc | Tiêu chí hoàn thành |
|------|------------|-----------------|-----------|----------------------|
| T2 | 20/04 | **BE1** | Pipeline trích xuất văn bản PDF: tích hợp PyMuPDF/pdfplumber, output text có cấu trúc | PDF upload trả văn bản trích xuất với cấu trúc được bảo toàn (tiêu đề, đoạn, bảng) |
| T2 | 20/04 | **BE2** | Bảo vệ XSS: lọc input rich text (bleach/DOMPurify phía server), CSP headers | Tag `<script>` chèn trong bài diễn đàn bị loại bỏ; CSP headers có trong responses |
| T2 | 20/04 | **FE** | UI upload PDF: vùng kéo-thả, thanh tiến trình, xác thực loại file | Người dùng upload được PDF; tiến trình hiển thị; file không phải PDF bị từ chối |
| T3 | 21/04 | **BE1** | Pipeline chunking PDF: chia văn bản trích xuất thành chunk ngữ nghĩa để vector hóa | Nội dung PDF chia thành chunk có ý nghĩa (theo phần/đoạn); metadata chunk được bảo toàn |
| T3 | 21/04 | **BE2** | Bảo vệ CSRF: middleware CSRF dựa trên token cho tất cả endpoint thay đổi trạng thái | Request thay đổi trạng thái không có CSRF token hợp lệ trả `403` |
| T3 | 21/04 | **FE** | Component xem trước PDF: hiển thị nội dung trích xuất trước khi xác nhận import | Người dùng xem được bản xem trước nội dung PDF text và có thể xác nhận hoặc hủy |
| T4 | 22/04 | **BE1** | Vector hóa PDF: embed chunk → lưu vào Qdrant với metadata nguồn | Chunk PDF tìm kiếm được trong Qdrant; truy xuất trả chunk kèm tham chiếu file nguồn |
| T4 | 22/04 | **BE2** | Kiểm tra bảo mật: rà soát tất cả endpoint về auth, xác thực input, rò rỉ thông tin lỗi | Báo cáo kiểm tra được tạo; tất cả phát hiện nghiêm trọng được xử lý |
| T4 | 22/04 | **FE** | Trang quản lý cảnh báo: form tạo cảnh báo (symbol, điều kiện, ngưỡng), danh sách cảnh báo đang hoạt động | Người dùng tạo, xem, sửa, xóa cảnh báo qua UI |
| T5 | 23/04 | **BE1** | Tích hợp PDF + RAG: AI agent sử dụng PDF đã import làm ngữ cảnh kiến thức | Hỏi về nội dung PDF đã upload trả câu trả lời chính xác từ tài liệu |
| T5 | 23/04 | **BE2** | Tinh chỉnh rate limiting: giới hạn theo endpoint, cấu hình tier premium vs free | Các endpoint khác nhau có giới hạn phù hợp; user premium có giới hạn cao hơn |
| T5 | 23/04 | **FE** | Hiển thị thông báo cảnh báo: toast notification, chuông thông báo với số chưa đọc | Cảnh báo thời gian thực xuất hiện dạng toast; panel thông báo hiển thị lịch sử đã đọc/chưa đọc |
| T6 | 24/04 | **BE1** | Kiểm thử end-to-end pipeline PDF: upload → trích xuất → chunk → vector hóa → truy vấn | Pipeline hoàn chỉnh test với 5+ tài liệu PDF thực; độ chính xác truy xuất chấp nhận được |
| T6 | 24/04 | **BE2** | Kiểm thử bảo mật: test tự động cho bypass auth, XSS, CSRF, SQL injection, prompt injection | Bộ test bảo mật pass; không phát hiện lỗ hổng nghiêm trọng |
| T6 | 24/04 | **FE** | Chia sẻ mạng xã hội: tạo link chia sẻ cho biểu đồ & nhật ký chat phân tích AI | Nút chia sẻ tạo URL duy nhất; mở link hiển thị biểu đồ/phân tích đã chia sẻ |

---

## Giai đoạn 5: Đa ngôn ngữ, Đánh giá & Tích hợp (Tuần 8–9)

### Tuần 8 — 27/04–01/05: Đa ngôn ngữ, Đánh giá AI & Fallback

| Ngày | Ngày tháng | Người phụ trách | Công việc | Tiêu chí hoàn thành |
|------|------------|-----------------|-----------|----------------------|
| T2 | 27/04 | **BE1** | Thiết lập DeepEval: framework đánh giá chất lượng AI agent (LLM-as-a-Judge) | Pipeline đánh giá chạy được; test case mẫu được chấm bởi judge LLM |
| T2 | 27/04 | **BE2** | Rà soát tài liệu API: đảm bảo tất cả endpoint được ghi nhận trong OpenAPI/Swagger | Swagger UI hiển thị tất cả endpoint với schema request/response và ví dụ |
| T2 | 27/04 | **FE** | Thiết lập framework i18n: `react-i18next`, language context, cấu trúc file dịch | Cơ sở hạ tầng chuyển ngôn ngữ hoạt động với chuỗi placeholder tiếng Anh |
| T3 | 28/04 | **BE1** | Tạo test case đánh giá: kịch bản test đơn lượt và đa lượt (≥ 20 case) | Bộ test case bao phủ tất cả ý định chính; kết quả được ghi log kèm điểm |
| T3 | 28/04 | **BE2** | Backend i18n: thông báo lỗi và phản hồi API hỗ trợ header `Accept-Language` | API trả thông báo lỗi tiếng Việt hoặc tiếng Anh dựa trên header |
| T3 | 28/04 | **FE** | Bản dịch tiếng Việt: dịch tất cả chuỗi UI (nav, nhãn, thông báo, lỗi) | Toàn bộ ứng dụng hiển thị đúng bằng tiếng Việt không thiếu bản dịch |
| T4 | 29/04 | **BE1** | Metrics chất lượng AI: đo mức liên quan, độ chính xác, hữu ích của phản hồi; xác định điểm yếu | Báo cáo chất lượng được tạo; các lĩnh vực dưới ngưỡng được xác định để cải thiện |
| T4 | 29/04 | **BE2** | Tối ưu CSDL: thêm index, tối ưu truy vấn chậm, connection pooling | Truy vấn chậm (> 500ms) được tối ưu; CSDL xử lý tốt nhiều user đồng thời |
| T4 | 29/04 | **FE** | Component chuyển ngôn ngữ: toggle trên header, lưu tùy chọn trong localStorage | Tùy chọn ngôn ngữ được lưu xuyên phiên; tất cả nội dung chuyển đổi tức thì |
| T5 | 30/04 | **BE1** | Cải thiện AI agent: tinh chỉnh prompt và cách sử dụng tool dựa trên feedback đánh giá | Điểm đánh giá cải thiện ≥ 10% trên các test case trước đó yếu |
| T5 | 30/04 | **BE2** | Dữ liệu fallback: chuẩn bị dữ liệu nội bộ/cached cho endpoint quan trọng khi API ngoài gián đoạn | Khi API bên ngoài lỗi, hệ thống phục vụ dữ liệu cached kèm timestamp "cập nhật lần cuối" |
| T5 | 30/04 | **FE** | UI Fallback: error boundary, banner API-down, chỉ báo chế độ offline | Người dùng thấy thông báo fallback thân thiện thay vì trang bị hỏng khi gián đoạn |
| T6 | 01/05 | **ALL** | Checkpoint tích hợp: kết nối tất cả trang frontend còn lại với API backend | Tất cả trang lấy dữ liệu thực từ backend; không còn dữ liệu placeholder hardcoded |

### Tuần 9 — 04/05–08/05: Kiểm thử Tích hợp Toàn diện

| Ngày | Ngày tháng | Người phụ trách | Công việc | Tiêu chí hoàn thành |
|------|------------|-----------------|-----------|----------------------|
| T2 | 04/05 | **ALL** | Kiểm thử tích hợp: Luồng Auth — đăng ký → đăng nhập → hồ sơ → phân quyền | Toàn bộ hành trình auth hoạt động end-to-end; RBAC thực thi trên cả FE và BE |
| T2 | 04/05 | **FE** | Sửa lỗi từ kiểm thử tích hợp auth | Tất cả lỗi UI liên quan auth được giải quyết |
| T3 | 05/05 | **ALL** | Kiểm thử tích hợp: Dashboard — dữ liệu giá, WebSocket streaming, tương tác biểu đồ, watchlist | Dashboard tải giá, stream cập nhật, biểu đồ hiển thị đúng, watchlist đồng bộ |
| T3 | 05/05 | **FE** | Tối ưu hiệu năng: lazy loading routes, code splitting, tối ưu hình ảnh | Điểm Lighthouse performance ≥ 80; kích thước bundle ban đầu giảm |
| T4 | 06/05 | **ALL** | Kiểm thử tích hợp: AI Chat — gửi truy vấn → SSE streaming → phản hồi đa format → lịch sử | Toàn bộ luồng chat hoạt động: streaming, hiển thị bảng/biểu đồ, lưu trữ hội thoại |
| T4 | 06/05 | **BE1** | Kiểm tra nhanh chất lượng phản hồi AI: test thủ công 20 truy vấn thực tế | ≥ 80% phản hồi được đánh giá đạt yêu cầu qua review thủ công |
| T5 | 07/05 | **ALL** | Kiểm thử tích hợp: Tin tức + Lịch + Hệ thống cảnh báo end-to-end | Trang tin tức tải dữ liệu tổng hợp; bộ lọc lịch hoạt động; cảnh báo kích hoạt và thông báo |
| T5 | 07/05 | **BE2** | Độ tin cậy background job: xác minh Celery task phục hồi từ lỗi, không mất dữ liệu | Task lỗi retry đúng; không có job mồ côi sau crash giả lập |
| T6 | 08/05 | **ALL** | Kiểm thử tích hợp: Diễn đàn (tạo/bình luận/đánh giá) + Import PDF + Quản lý Portfolio | Tất cả tính năng cộng đồng và portfolio hoạt động end-to-end |
| T6 | 08/05 | **FE** | Kiểm thử responsive: xác minh tất cả trang trên viewport 1024px, 1280px, 1920px | Không bị vỡ layout trên bất kỳ viewport nào; hành vi cuộn đúng |

---

## Giai đoạn 6: Hoàn thiện, Tối ưu & Bàn giao (Tuần 10–11)

### Tuần 10 — 11/05–15/05: Sửa lỗi, Hiệu năng & Hoàn thiện

| Ngày | Ngày tháng | Người phụ trách | Công việc | Tiêu chí hoàn thành |
|------|------------|-----------------|-----------|----------------------|
| T2 | 11/05 | **ALL** | Sprint sửa lỗi nghiêm trọng: xử lý tất cả bug P0/P1 từ kiểm thử tích hợp | Tất cả bug nghiêm trọng và ưu tiên cao được giải quyết và xác minh |
| T3 | 12/05 | **ALL** | Sửa lỗi ưu tiên trung bình/thấp: xử lý bug P2/P3 còn lại | Bug backlog giảm chỉ còn lỗi thẩm mỹ |
| T4 | 13/05 | **BE1** | Tinh chỉnh hiệu năng AI agent: giảm độ trễ phản hồi trung bình, tối ưu prompt | Thời gian phản hồi AI trung bình ≤ 5 giây; token usage được tối ưu |
| T4 | 13/05 | **BE2** | Profiling hiệu năng backend: xác định và sửa bottleneck (endpoint chậm, rò rỉ bộ nhớ) | Tất cả API endpoint phản hồi trong 500ms (ngoại trừ AI calls); không rò rỉ bộ nhớ |
| T4 | 13/05 | **FE** | Hoàn thiện UI/UX: micro-animation, transition, hiệu ứng hover, skeleton loading | UI mượt mà và chuyên nghiệp; không có transition giật hoặc layout shift |
| T5 | 14/05 | **BE1** | Dashboard giám sát Logfire: thiết lập metrics chính (độ trễ, lỗi, token usage, uptime) | Dashboard hiển thị sức khỏe hệ thống thời gian thực; cảnh báo cấu hình cho anomaly |
| T5 | 14/05 | **BE2** | Load testing: mô phỏng người dùng đồng thời với Locust hoặc công cụ tương tự | Hệ thống xử lý ≥ 50 người dùng đồng thời không suy giảm |
| T5 | 14/05 | **FE** | Rà soát khả năng truy cập: điều hướng bàn phím, nhãn ARIA, độ tương phản màu | Luồng chính điều hướng được bằng bàn phím; tỷ lệ tương phản đạt WCAG AA |
| T6 | 15/05 | **ALL** | Smoke test end-to-end: duyệt qua mọi tính năng chính với tư cách người dùng mới | Tất cả tính năng hoạt động trong hành trình user liên tục không có lỗi |

### Tuần 11 — 18/05–24/05: Tài liệu, Triển khai & Bàn giao

| Ngày | Ngày tháng | Người phụ trách | Công việc | Tiêu chí hoàn thành |
|------|------------|-----------------|-----------|----------------------|
| T2 | 18/05 | **ALL** | Sửa lỗi cuối cùng: giải quyết mọi vấn đề còn lại từ smoke testing | Không còn bug P0–P2 đã biết |
| T3 | 19/05 | **BE1** | Tài liệu kỹ thuật: kiến trúc AI, sơ đồ luồng agent, hướng dẫn prompt engineering | Tài liệu bao phủ tất cả thành phần AI; developer mới có thể hiểu hệ thống |
| T3 | 19/05 | **BE2** | Tài liệu API: hoàn thiện Swagger, viết hướng dẫn triển khai, tham chiếu biến môi trường | Tài liệu API đầy đủ kèm ví dụ; hướng dẫn triển khai được test bởi thành viên khác |
| T3 | 19/05 | **FE** | Tài liệu Frontend: hướng dẫn thư viện component, tài liệu design system, hướng dẫn build | Frontend có thể build và chạy chỉ bằng cách theo tài liệu |
| T4 | 20/05 | **BE2** | Docker Compose config production: build tối ưu, phân tách môi trường, health checks | `docker compose -f docker-compose.prod.yml up` khởi chạy stack production-ready |
| T4 | 20/05 | **BE1** | Chạy thử triển khai: deploy toàn bộ stack, xác minh tất cả dịch vụ giao tiếp đúng | Toàn bộ ứng dụng truy cập được qua URL production; mọi tính năng hoạt động |
| T4 | 20/05 | **FE** | Build production: tối ưu, xác minh không có console error, test ở chế độ production | `npm run build` thành công; ứng dụng production không có lỗi trong browser console |
| T5 | 21/05 | **ALL** | QA cuối cùng: kiểm thử toàn diện bản triển khai production | Checklist QA (tất cả tính năng chính) hoàn thành với ✅ trên mọi mục |
| T6 | 22/05 | **ALL** | Chuẩn bị demo: chuẩn bị slide thuyết trình, kịch bản demo, điểm nói | Bài thuyết trình sẵn sàng; demo được tập dượt và chạy mượt |
| T7–CN | 23–24/05 | **ALL** | **Dự phòng**: sửa lỗi phút chót, tập dượt cuối, nộp dự án | Dự án nộp đúng hạn với tất cả sản phẩm bàn giao |

---

## Tóm tắt Tiến độ

```
Tuần  1  (09/03–13/03) ██ Nền tảng: khởi tạo dự án, Docker, xác thực, CI/CD
Tuần  2  (16/03–20/03) ██ Dữ liệu chính: API giá, WebSocket, bố cục dashboard, biểu đồ
Tuần  3  (23/03–27/03) ██ AI Cốt lõi: LLM agents, MCP server, giao diện chat, SSE streaming
Tuần  4  (30/03–03/04) ██ An toàn AI: guardrails, prompt injection, hệ thống tin tức, xử lý nền
Tuần  5  (06/04–10/04) ██ RAG & Portfolio: tìm kiếm vector, API & UI portfolio/watchlist
Tuần  6  (13/04–17/04) ██ Cảnh báo & Diễn đàn: hệ thống cảnh báo, blog editor, bình luận, đánh giá
Tuần  7  (20/04–24/04) ██ PDF & Bảo mật: pipeline PDF, bảo vệ XSS/CSRF, chia sẻ mạng xã hội
Tuần  8  (27/04–01/05) ██ Đa ngôn ngữ & Đánh giá: bản dịch, đánh giá AI, fallback, tích hợp
Tuần  9  (04/05–08/05) ██ Kiểm thử tích hợp: kiểm thử end-to-end toàn bộ tính năng
Tuần 10  (11/05–15/05) ██ Hoàn thiện: sửa lỗi, tinh chỉnh hiệu năng, hoàn thiện UX, load testing
Tuần 11  (18/05–24/05) ██ Bàn giao: tài liệu, triển khai, QA, demo, nộp bài
```
