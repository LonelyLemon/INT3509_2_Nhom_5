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
| T2 | 09/03 | **BE1** | Khung dự án FastAPI: cấu trúc thư mục, config, quản lý `.env` | FastAPI server khởi chạy và phản hồi thành công yêu cầu health check cơ bản |
| T2 | 09/03 | **FE** | Khung dự án React + Vite, cài đặt TailwindCSS, ESLint/Prettier | `npm run dev` khởi chạy ứng dụng với trang placeholder đã được style |
| T3 | 10/03 | **BE2** | Thiết kế schema CSDL: định nghĩa tất cả các thực thể chính và quan hệ | Sơ đồ ERD hoặc file migration được review và commit |
| T3 | 10/03 | **BE1** | Thiết lập SQLAlchemy models + Alembic migration cho các thực thể chính | Migration chạy thành công; các bảng được tạo trong PostgreSQL |
| T3 | 10/03 | **FE** | Hệ thống thiết kế: bảng màu, typography (Google Fonts), biến CSS cho dark/light mode | Design tokens được định nghĩa; nút chuyển dark/light chuyển đúng tất cả màu sắc |
| T4 | 11/03 | **BE2** | Pipeline CI/CD bằng GitHub Actions: lint, test, build khi tạo PR | PR thử nghiệm kích hoạt pipeline thành công |
| T4 | 11/03 | **BE1** | Triển khai xác thực: đăng ký, đăng nhập và làm mới token (JWT + bcrypt) | API xác thực trả JWT token chính xác; mật khẩu được lưu dạng bcrypt hash |
| T4 | 11/03 | **FE** | Giao diện trang Đăng nhập / Đăng ký với validation phía client | Cả hai trang hiển thị chính xác với phản hồi validation |
| T5 | 12/03 | **BE2** | Middleware RBAC: phân quyền dựa trên vai trò Admin/User | Tài nguyên được bảo vệ trả về `403` cho vai trò không được phép |
| T5 | 12/03 | **BE1** | Hoàn thiện xác thực: đăng xuất, đổi mật khẩu, xác minh email | Tất cả tính năng xác thực được test và ghi nhận trên Swagger |
| T5 | 12/03 | **FE** | Tích hợp xác thực: kết nối trang Đăng nhập/Đăng ký với backend, lưu và làm mới token | Người dùng có thể đăng ký, đăng nhập và xem nội dung được bảo vệ |
| T6 | 13/03 | **BE2** | Tích hợp Redis: middleware giới hạn tần suất (cấu hình được theo user) | Request bị giới hạn trả `429` khi vượt ngưỡng |
| T6 | 13/03 | **BE1** | Triển khai API hồ sơ người dùng và cài đặt tài khoản | Truy xuất và cập nhật hồ sơ user hoạt động chính xác |
| T6 | 13/03 | **FE** | Giao diện trang hồ sơ + kết nối với API hồ sơ người dùng | Trang hồ sơ hiển thị và chỉnh sửa thông tin user, lưu thay đổi thành công |

### Tuần 2 — 16/03–20/03: API Dữ liệu chính & Bố cục Dashboard

| Ngày | Ngày tháng | Người phụ trách | Công việc | Tiêu chí hoàn thành |
|------|------------|-----------------|-----------|----------------------|
| T2 | 16/03 | **BE1** | Tích hợp nhà cung cấp dữ liệu: kết nối API dữ liệu tài chính để lấy dữ liệu giá | Lấy dữ liệu giá thời gian thực và lịch sử thành công |
| T2 | 16/03 | **BE2** | Thiết lập WebSocket server cho truyền tải giá thời gian thực | Client WebSocket kết nối và nhận được tin nhắn giá thử nghiệm |
| T2 | 16/03 | **FE** | Bố cục dashboard chính: header, sidebar, khối nội dung linh hoạt (panels có thể thay đổi kích thước) | Dashboard hiển thị với các khối layout có thể kéo/thay đổi kích thước |
| T3 | 17/03 | **BE1** | Triển khai API dữ liệu giá: báo giá thời gian thực, dữ liệu lịch sử, truy vấn hàng loạt | API trả dữ liệu giá có cấu trúc với khoảng thời gian chính xác |
| T3 | 17/03 | **BE2** | WebSocket streaming giá: đăng ký/hủy đăng ký theo symbol, phát sóng tick thời gian thực | Nhiều client nhận được cập nhật giá cho các symbol đã đăng ký |
| T3 | 17/03 | **FE** | Tích hợp Lightweight Charts: component biểu đồ nến với zoom/pan | Biểu đồ hiển thị dữ liệu nến thực với điều khiển tương tác |
| T4 | 18/03 | **BE1** | API chỉ báo kỹ thuật: tính toán các chỉ báo phổ biến (SMA, EMA, RSI, MACD) | API trả giá trị tính toán chính xác cho symbol/khung thời gian cho trước |
| T4 | 18/03 | **BE2** | Tầng xác thực dữ liệu: Pydantic schema cho tất cả request liên quan đến giá | Input không hợp lệ trả lỗi validation rõ ràng với thông báo theo trường |
| T4 | 18/03 | **FE** | Component tìm kiếm mã + chuyển đổi biểu đồ | Người dùng có thể tìm mã cổ phiếu và chuyển đổi view biểu đồ động |
| T5 | 19/03 | **BE1** | Caching dữ liệu giá với Redis (dựa trên TTL, vô hiệu hóa khi có biến động lớn) | Các request lặp lại được phục vụ từ cache; cache miss lấy dữ liệu mới |
| T5 | 19/03 | **BE2** | Tích hợp nguồn tin tức: kết nối API tin tức tài chính | Dữ liệu tin tức thô được lấy về và cấu trúc hóa thành model nội bộ |
| T5 | 19/03 | **FE** | Component sidebar danh sách theo dõi (thêm/xóa symbol, hiển thị giá mini live) | Sidebar hiển thị các symbol của user với chỉ báo giá live |
| T6 | 20/03 | **BE1** | Xử lý lỗi API giá và trường hợp biên (thị trường đóng cửa, symbol không hợp lệ) | Tất cả trường hợp biên trả phản hồi lỗi phù hợp; bộ test pass |
| T6 | 20/03 | **BE2** | Tích hợp dữ liệu lịch kinh tế từ nguồn bên ngoài | Sự kiện lịch được lấy với ngày, quốc gia, mức độ ảnh hưởng, giá trị |
| T6 | 20/03 | **FE** | Hoàn thiện layout responsive cho Dashboard + chốt chuyển đổi Light/Dark mode | Dashboard sử dụng được trên tablet & desktop; nút chuyển mode lưu tùy chọn |

---

## Giai đoạn 2: AI Cốt lõi & Chat (Tuần 3–4)

### Tuần 3 — 23/03–27/03: Thiết lập AI Agent & Giao diện Chat

| Ngày | Ngày tháng | Người phụ trách | Công việc | Tiêu chí hoàn thành |
|------|------------|-----------------|-----------|----------------------|
| T2 | 23/03 | **BE1** | Khung pydantic-ai agent: cấu hình kết nối LLM và logic chọn model | Agent khởi tạo và trả phản hồi cơ bản từ mỗi nhà cung cấp LLM |
| T2 | 23/03 | **BE2** | Thiết lập MCP server: framework đăng ký tool | MCP server khởi chạy; các tool có thể đăng ký và liệt kê |
| T2 | 23/03 | **FE** | Bố cục giao diện AI Chat: danh sách tin nhắn, hộp nhập, nút gửi, drawer hội thoại | UI Chat hiển thị với lịch sử tin nhắn cuộn được và vùng nhập liệu |
| T3 | 24/03 | **BE1** | Cơ chế fallback LLM: tự động chuyển khi lỗi/timeout, chuỗi ưu tiên | Khi LLM chính lỗi, agent chuyển sang LLM phụ một cách liền mạch |
| T3 | 24/03 | **BE2** | MCP tools: triển khai công cụ lấy dữ liệu giá và phân tích kỹ thuật | Tools gọi được qua giao thức MCP; trả dữ liệu live chính xác |
| T3 | 24/03 | **FE** | Renderer tin nhắn chat: text với markdown, bảng dữ liệu, component biểu đồ inline | Tin nhắn hiển thị đúng ở cả 3 format |
| T4 | 25/03 | **BE1** | Quản lý hội thoại: theo dõi trạng thái đa bước, lưu trữ ngữ cảnh user | Lịch sử hội thoại lưu trữ xuyên phiên; context window được quản lý |
| T4 | 25/03 | **BE2** | MCP tools: triển khai công cụ truy xuất lịch kinh tế và tin tức | Tất cả MCP tools trả dữ liệu chính xác, đã format |
| T4 | 25/03 | **FE** | Nút thao tác nhanh: câu hỏi phổ biến có sẵn | Nhấn nút điền input và gửi truy vấn |
| T5 | 26/03 | **BE1** | Phân loại ý định: định tuyến truy vấn user đến agent/tool phù hợp | Phân loại đúng các ý định: biểu đồ, tin tức, phân tích, chung |
| T5 | 26/03 | **BE2** | Streaming dựa trên SSE cho phản hồi AI theo từng từ | SSE stream gửi token khi được sinh ra; client nhận text tăng dần |
| T5 | 26/03 | **FE** | Tích hợp SSE: hiển thị phản hồi AI thời gian thực (streaming từng từ) | Chat hiển thị phản hồi AI khi đang stream, có chỉ báo đang gõ |
| T6 | 27/03 | **BE1** | API chat: gửi tin nhắn, truy xuất lịch sử, liệt kê hội thoại | API chat hoạt động end-to-end: gửi tin → nhận phản hồi AI stream |
| T6 | 27/03 | **BE2** | Lưu trữ hội thoại: lưu/truy xuất toàn bộ thread chat từ CSDL | Lịch sử chat tải lại khi refresh trang; hội thoại cũ có thể duyệt |
| T6 | 27/03 | **FE** | Drawer lịch sử chat: liệt kê hội thoại cũ, tải hội thoại đã chọn | Người dùng có thể duyệt và tiếp tục các phiên chat cũ |

### Tuần 4 — 30/03–03/04: An toàn AI, Hệ thống Tin tức & Xử lý nền

| Ngày | Ngày tháng | Người phụ trách | Công việc | Tiêu chí hoàn thành |
|------|------------|-----------------|-----------|----------------------|
| T2 | 30/03 | **BE1** | Cơ chế guardrail: lọc chủ đề, kiểm tra an toàn phản hồi, quy tắc anti-abuse | Truy vấn lạc đề hoặc lạm dụng nhận tin nhắn từ chối phù hợp |
| T2 | 30/03 | **BE2** | Thiết lập Celery + Redis/RabbitMQ: hạ tầng background worker | Celery worker khởi chạy; task thử nghiệm thực thi bất đồng bộ |
| T2 | 30/03 | **FE** | Bố cục trang tin tức: dạng dòng thời gian, bộ lọc chuyên mục, thanh tìm kiếm | Trang tin tức hiển thị với dữ liệu placeholder dạng timeline |
| T3 | 31/03 | **BE1** | Bảo vệ prompt injection: lọc input, cô lập system prompt, quy tắc phát hiện | Các nỗ lực prompt injection bị chặn; system prompt không bao giờ bị lộ |
| T3 | 31/03 | **BE2** | Task thu thập tin tức nền: crawl định kỳ từ nhiều nguồn | Celery beat lên lịch crawl; tin tức tự động lưu vào DB |
| T3 | 31/03 | **FE** | Card bài tin tức: tiêu đề, nguồn, nhãn cảm xúc, thời gian, đoạn xem trước | Card hiển thị tất cả trường; nhấn vào mở chế độ xem toàn bộ bài |
| T4 | 01/04 | **BE1** | Quản lý context window: đếm token, cắt tỉa hội thoại, tóm tắt tự động | Hội thoại dài được tóm tắt tự động để nằm trong giới hạn token |
| T4 | 01/04 | **BE2** | Pipeline phân tích cảm xúc tin tức (dựa trên LLM, background job) | Mỗi bài tin được gán điểm cảm xúc lưu trong DB |
| T4 | 01/04 | **FE** | Trang lịch kinh tế: bảng với chi tiết sự kiện, quốc gia, mức ảnh hưởng, giá trị | Lịch hiển thị dữ liệu thực với bộ lọc theo ngày và quốc gia |
| T5 | 02/04 | **BE1** | Tích hợp giám sát Logfire: trace các lời gọi AI agent, log token usage, độ trễ | Dashboard Logfire hiển thị request trace và tỷ lệ lỗi |
| T5 | 02/04 | **BE2** | API tin tức: liệt kê, lọc (theo ngày/cảm xúc/nguồn), truy xuất bài đơn lẻ | API trả tin tức phân trang với bộ lọc chính xác |
| T5 | 02/04 | **FE** | Controls lọc lịch: theo quốc gia, mức độ quan trọng, khoảng ngày | Bộ lọc thu hẹp đúng sự kiện hiển thị; lọc kết hợp hoạt động |
| T6 | 03/04 | **BE1** | Kiểm thử end-to-end AI agent: xác minh tất cả đường ý định với truy vấn mẫu | Bộ test bao phủ các truy vấn đại diện; tất cả trả phản hồi hợp lệ |
| T6 | 03/04 | **BE2** | API lịch kinh tế: liệt kê và lọc sự kiện | API lịch trả sự kiện có cấu trúc với bộ lọc chính xác |
| T6 | 03/04 | **FE** | Hoàn thiện UI trang Tin tức + Lịch: trạng thái loading, trạng thái trống, xử lý lỗi | Trang xử lý mọi trạng thái một cách mượt mà |

---

## Giai đoạn 3: RAG, Danh mục & Cảnh báo (Tuần 5–6)

### Tuần 5 — 06/04–10/04: Tích hợp RAG & Quản lý Danh mục Đầu tư

| Ngày | Ngày tháng | Người phụ trách | Công việc | Tiêu chí hoàn thành |
|------|------------|-----------------|-----------|----------------------|
| T2 | 06/04 | **BE1** | Thiết lập Qdrant vector store: schema collection, chọn embedding model | Collection Qdrant được tạo; tài liệu test được embed và truy xuất thành công |
| T2 | 06/04 | **BE2** | Thiết kế API Portfolio/Watchlist và data models | API spec được ghi nhận trong Swagger với tất cả CRUD operations |
| T2 | 06/04 | **FE** | Bố cục trang quản lý danh mục: bảng holdings, form thêm tài sản, thẻ tóm tắt | Trang hiển thị với cấu trúc bảng và modal thêm tài sản |
| T3 | 07/04 | **BE1** | Pipeline nhúng tài liệu: chunk báo cáo tài chính → embed → lưu Qdrant | Tài liệu mẫu được chunk và lưu; tìm kiếm tương đồng trả chunk liên quan |
| T3 | 07/04 | **BE2** | API CRUD Portfolio: thêm, sửa, xóa holdings với số lượng và giá | Tất cả CRUD hoạt động; giá trị portfolio tính từ giá live |
| T3 | 07/04 | **FE** | UI Portfolio: thêm/sửa/xóa tài sản, input số lượng & giá, dialog xác nhận | Người dùng quản lý được các mục portfolio; thay đổi lưu sau refresh |
| T4 | 08/04 | **BE1** | RAG retrieval chain: tích hợp tìm kiếm vector vào pipeline lập luận của AI agent | AI agent truy vấn Qdrant lấy ngữ cảnh trước khi sinh phản hồi |
| T4 | 08/04 | **BE2** | API CRUD Watchlist: thêm/xóa symbol, sắp xếp lại | API Watchlist đã test; symbol lưu trữ theo tài khoản user |
| T4 | 08/04 | **FE** | Quản lý watchlist: kéo để sắp xếp, thêm nhanh từ biểu đồ, xóa bằng vuốt | Watchlist tương tác đầy đủ; thay đổi đồng bộ với backend |
| T5 | 09/04 | **BE1** | Kiểm thử chất lượng RAG: đo mức liên quan truy xuất trên truy vấn tài chính | Precision truy xuất ≥ 70% trên bộ test |
| T5 | 09/04 | **BE2** | Xác thực dữ liệu Portfolio và Watchlist + trường hợp biên | Input không hợp lệ bị từ chối với thông báo lỗi rõ ràng |
| T5 | 09/04 | **FE** | Widget dashboard Portfolio: biểu đồ phân bổ, tổng giá trị, thẻ tóm tắt P&L | Widget hiển thị dữ liệu portfolio tổng hợp chính xác |
| T6 | 10/04 | **BE1** | Tối ưu RAG: điều chỉnh kích thước chunk, so sánh embedding model, re-ranking | Chất lượng phản hồi cải thiện; độ trễ trong phạm vi chấp nhận |
| T6 | 10/04 | **BE2** | Kiểm thử tích hợp API Portfolio/Watchlist | Test end-to-end pass cho tất cả luồng portfolio và watchlist |
| T6 | 10/04 | **FE** | Tích hợp WebSocket: cập nhật giá live trên watchlist & giá trị portfolio | Giá cập nhật thời gian thực không cần refresh trang |

### Tuần 6 — 13/04–17/04: Hệ thống Cảnh báo & Diễn đàn Cộng đồng

| Ngày | Ngày tháng | Người phụ trách | Công việc | Tiêu chí hoàn thành |
|------|------------|-----------------|-----------|----------------------|
| T2 | 13/04 | **BE1** | Lõi hệ thống cảnh báo: models cảnh báo (ngưỡng giá, dựa trên cảm xúc), logic kích hoạt | Trigger cảnh báo kích hoạt chính xác khi điều kiện được đáp ứng |
| T2 | 13/04 | **BE2** | Lưu trữ & phân phối cảnh báo: DB models, cơ chế đẩy thông báo qua WebSocket | Cảnh báo được kích hoạt lưu vào DB và đẩy tới client đang kết nối |
| T2 | 13/04 | **FE** | Bố cục trang Diễn đàn/Blog: danh sách bài viết, nút tạo bài, sidebar chuyên mục | Trang diễn đàn hiển thị với card bài viết và điều hướng |
| T3 | 14/04 | **BE1** | Giám sát cảnh báo giá: task nền kiểm tra ngưỡng giá định kỳ | Cảnh báo giá kích hoạt trong thời gian dự kiến khi vượt ngưỡng |
| T3 | 14/04 | **BE2** | API CRUD cảnh báo: tạo, đọc, cập nhật, xóa, liệt kê cảnh báo đang hoạt động theo user | Tất cả CRUD cảnh báo hoạt động chính xác |
| T3 | 14/04 | **FE** | Tích hợp trình soạn thảo rich text cho tạo bài blog | Editor hỗ trợ định dạng, code block, hình ảnh |
| T4 | 15/04 | **BE1** | Cảnh báo AI: phát hiện cảm xúc tiêu cực từ phân tích tin tức | Cảnh báo cảm xúc kích hoạt khi cảm xúc tổng hợp giảm dưới ngưỡng |
| T4 | 15/04 | **BE2** | Phân phối thông báo cảnh báo: trung tâm thông báo in-app + đẩy WebSocket | Thông báo xuất hiện thời gian thực trên panel thông báo |
| T4 | 15/04 | **FE** | Nhúng biểu đồ live trong bài blog: chèn biểu đồ tương tác vào editor | Biểu đồ trong bài viết tương tác được, không phải ảnh tĩnh |
| T5 | 16/04 | **BE1** | Caching phân tích AI: lưu và tái sử dụng kết quả phân tích gần đây (Redis, TTL) | Truy vấn giống nhau trong TTL trả phản hồi cached |
| T5 | 16/04 | **BE2** | API CRUD bài viết/post: nội dung, thông tin tác giả, tags, thời gian | Bài viết tạo, liệt kê, cập nhật, xóa qua API |
| T5 | 16/04 | **FE** | UI phần bình luận & đánh giá sao (1–5 sao) dưới mỗi bài viết | Người dùng có thể bình luận và đánh giá; điểm trung bình hiển thị |
| T6 | 17/04 | **BE1** | Kiểm thử end-to-end hệ thống cảnh báo (cảnh báo giá + cảm xúc) | Tất cả loại cảnh báo được test; tỷ lệ false positive chấp nhận được |
| T6 | 17/04 | **BE2** | API bình luận và đánh giá: thêm/liệt kê bình luận, gửi/cập nhật đánh giá | Thread bình luận và đánh giá trung bình hoạt động chính xác |
| T6 | 17/04 | **FE** | Danh sách bài + trang chi tiết: phân trang, sắp xếp, link hồ sơ tác giả | Diễn đàn duyệt được với sắp xếp/phân trang; trang chi tiết hiển thị đầy đủ |

---

## Giai đoạn 4: Xử lý PDF, Bảo mật & Quản trị (Tuần 7)

### Tuần 7 — 20/04–24/04: Pipeline PDF, Bảo mật & Tính năng Admin

| Ngày | Ngày tháng | Người phụ trách | Công việc | Tiêu chí hoàn thành |
|------|------------|-----------------|-----------|----------------------|
| T2 | 20/04 | **BE1** | Pipeline trích xuất văn bản PDF: tích hợp thư viện phân tích tài liệu | PDF upload trả văn bản trích xuất với cấu trúc được bảo toàn |
| T2 | 20/04 | **BE2** | Bảo vệ XSS: lọc input rich text, cấu hình CSP headers | Tag script chèn trong bài diễn đàn bị loại bỏ; CSP headers có trong responses |
| T2 | 20/04 | **FE** | UI upload PDF: vùng kéo-thả, thanh tiến trình, xác thực loại file | Người dùng upload được PDF; file không phải PDF bị từ chối |
| T3 | 21/04 | **BE1** | Pipeline chunking PDF: chia văn bản trích xuất thành chunk ngữ nghĩa | Nội dung PDF chia thành chunk có ý nghĩa với metadata được bảo toàn |
| T3 | 21/04 | **BE2** | Bảo vệ CSRF: middleware CSRF dựa trên token cho endpoint thay đổi trạng thái | Request không có CSRF token hợp lệ bị từ chối |
| T3 | 21/04 | **FE** | Component xem trước PDF: hiển thị nội dung trích xuất trước khi xác nhận import | Người dùng xem được bản xem trước và có thể xác nhận hoặc hủy |
| T4 | 22/04 | **BE1** | Vector hóa PDF: embed chunk → lưu vào Qdrant với metadata nguồn | Chunk PDF tìm kiếm được trong Qdrant kèm tham chiếu file nguồn |
| T4 | 22/04 | **BE2** | Kiểm tra bảo mật: rà soát tất cả endpoint về auth, xác thực input, rò rỉ thông tin lỗi | Báo cáo kiểm tra được tạo; tất cả phát hiện nghiêm trọng được xử lý |
| T4 | 22/04 | **FE** | Trang quản lý cảnh báo: form tạo cảnh báo, danh sách cảnh báo, sửa/xóa | Người dùng quản lý cảnh báo qua UI |
| T5 | 23/04 | **BE1** | Tích hợp PDF + RAG: AI agent sử dụng PDF đã import làm ngữ cảnh kiến thức | Hỏi về nội dung PDF đã upload trả câu trả lời chính xác |
| T5 | 23/04 | **BE2** | API Admin: quản lý user (liệt kê, đổi vai trò, cấm/vô hiệu hóa), kiểm duyệt nội dung | Admin quản lý user và kiểm duyệt nội dung qua API |
| T5 | 23/04 | **FE** | Hiển thị thông báo cảnh báo: toast notification, chuông thông báo với số chưa đọc | Cảnh báo thời gian thực xuất hiện dạng toast; panel hiển thị lịch sử |
| T6 | 24/04 | **BE1** | Kiểm thử end-to-end pipeline PDF: upload → trích xuất → chunk → vector hóa → truy vấn | Pipeline hoàn chỉnh test với tài liệu PDF thực |
| T6 | 24/04 | **BE2** | Kiểm thử bảo mật: test tự động cho bypass auth, XSS, CSRF, injection | Bộ test bảo mật pass; không phát hiện lỗ hổng nghiêm trọng |
| T6 | 24/04 | **FE** | Chia sẻ mạng xã hội: tạo link chia sẻ cho biểu đồ & nhật ký chat phân tích AI | Nút chia sẻ tạo URL duy nhất; view chia sẻ hoạt động chính xác |

---

## Giai đoạn 5: Đa ngôn ngữ, Đánh giá, Tùy chọn & Tích hợp (Tuần 8–9)

### Tuần 8 — 27/04–01/05: Đa ngôn ngữ, Đánh giá AI & Tùy chọn Người dùng

| Ngày | Ngày tháng | Người phụ trách | Công việc | Tiêu chí hoàn thành |
|------|------------|-----------------|-----------|----------------------|
| T2 | 27/04 | **BE1** | Thiết lập DeepEval: framework đánh giá chất lượng AI agent (LLM-as-a-Judge) | Pipeline đánh giá chạy được; test case mẫu được chấm |
| T2 | 27/04 | **BE2** | Rà soát tài liệu API: đảm bảo tất cả endpoint được ghi nhận trong OpenAPI/Swagger | Swagger UI hiển thị tất cả endpoint với schema và ví dụ |
| T2 | 27/04 | **FE** | Thiết lập framework i18n: language context, cấu trúc file dịch | Cơ sở hạ tầng chuyển ngôn ngữ hoạt động với chuỗi placeholder tiếng Anh |
| T3 | 28/04 | **BE1** | Tạo test case đánh giá: kịch bản test đơn lượt và đa lượt | Bộ test case bao phủ tất cả ý định chính; kết quả được ghi log kèm điểm |
| T3 | 28/04 | **BE2** | Backend i18n: thông báo lỗi và phản hồi API hỗ trợ header ngôn ngữ | API trả thông báo lỗi bản địa hóa dựa trên `Accept-Language` |
| T3 | 28/04 | **FE** | Bản dịch tiếng Việt: dịch tất cả chuỗi UI (nav, nhãn, thông báo, lỗi) | Toàn bộ ứng dụng hiển thị đúng bằng tiếng Việt không thiếu bản dịch |
| T4 | 29/04 | **BE1** | Metrics chất lượng AI: đo mức liên quan, độ chính xác, hữu ích của phản hồi | Báo cáo chất lượng được tạo; điểm yếu được xác định để cải thiện |
| T4 | 29/04 | **BE2** | Tối ưu CSDL: thêm index, tối ưu truy vấn chậm, connection pooling | Truy vấn chậm được tối ưu; CSDL xử lý tốt nhiều user đồng thời |
| T4 | 29/04 | **FE** | Component chuyển ngôn ngữ: toggle trên header, lưu tùy chọn | Tùy chọn ngôn ngữ được lưu xuyên phiên |
| T5 | 30/04 | **BE1** | Cải thiện AI agent: tinh chỉnh prompt và cách sử dụng tool dựa trên feedback đánh giá | Điểm đánh giá cải thiện trên các test case trước đó yếu |
| T5 | 30/04 | **BE2** | API tùy chọn người dùng: giao diện, ngôn ngữ, bộ lọc mặc định, bố cục dashboard, cài đặt thông báo | Tùy chọn được lưu theo user và áp dụng khi đăng nhập |
| T5 | 30/04 | **FE** | UI tùy chọn người dùng: chuyển giao diện, ngôn ngữ, trang cài đặt thông báo | Người dùng cấu hình và lưu được tất cả tùy chọn |
| T6 | 01/05 | **BE2** | Dữ liệu fallback: chuẩn bị dữ liệu cached cho endpoint quan trọng khi API ngoài gián đoạn | Khi API bên ngoài lỗi, hệ thống phục vụ dữ liệu cached kèm timestamp |
| T6 | 01/05 | **FE** | UI Fallback: error boundary, banner API-down, chỉ báo chế độ offline | Người dùng thấy thông báo fallback thân thiện thay vì trang bị hỏng |
| T6 | 01/05 | **ALL** | Checkpoint tích hợp: kết nối tất cả trang frontend còn lại với API backend | Tất cả trang lấy dữ liệu thực từ backend; không còn dữ liệu placeholder |

### Tuần 9 — 04/05–08/05: Kiểm thử Tích hợp Toàn diện

| Ngày | Ngày tháng | Người phụ trách | Công việc | Tiêu chí hoàn thành |
|------|------------|-----------------|-----------|----------------------|
| T2 | 04/05 | **ALL** | Kiểm thử tích hợp: Luồng Auth — đăng ký → xác minh → đăng nhập → hồ sơ → RBAC | Toàn bộ hành trình auth hoạt động end-to-end trên cả FE và BE |
| T2 | 04/05 | **FE** | Sửa lỗi từ kiểm thử tích hợp auth | Tất cả lỗi UI liên quan auth được giải quyết |
| T3 | 05/05 | **ALL** | Kiểm thử tích hợp: Dashboard — dữ liệu giá, WebSocket streaming, biểu đồ, watchlist | Dashboard tải giá, stream cập nhật, biểu đồ hiển thị đúng |
| T3 | 05/05 | **FE** | Tối ưu hiệu năng: lazy loading routes, code splitting, tối ưu hình ảnh | Điểm Lighthouse performance ≥ 80; kích thước bundle ban đầu giảm |
| T4 | 06/05 | **ALL** | Kiểm thử tích hợp: AI Chat — gửi truy vấn → SSE streaming → phản hồi đa format → lịch sử | Toàn bộ luồng chat hoạt động: streaming, hiển thị, lưu trữ hội thoại |
| T4 | 06/05 | **BE1** | Kiểm tra nhanh chất lượng phản hồi AI: test thủ công truy vấn thực tế | ≥ 80% phản hồi được đánh giá đạt yêu cầu qua review thủ công |
| T5 | 07/05 | **ALL** | Kiểm thử tích hợp: Tin tức + Lịch + Hệ thống cảnh báo end-to-end | Tin tức tải, bộ lọc lịch hoạt động, cảnh báo kích hoạt và thông báo |
| T5 | 07/05 | **BE2** | Độ tin cậy background job: xác minh Celery task phục hồi và tính toàn vẹn dữ liệu | Task lỗi retry đúng; không có job mồ côi sau crash giả lập |
| T6 | 08/05 | **ALL** | Kiểm thử tích hợp: Diễn đàn (tạo/bình luận/đánh giá) + Import PDF + Portfolio + Panel Admin | Tất cả tính năng cộng đồng, portfolio và admin hoạt động end-to-end |
| T6 | 08/05 | **FE** | Kiểm thử responsive: xác minh tất cả trang trên các kích thước viewport phổ biến | Không bị vỡ layout trên bất kỳ viewport nào; hành vi cuộn đúng |

---

## Giai đoạn 6: Hoàn thiện, Tối ưu & Bàn giao (Tuần 10–11)

### Tuần 10 — 11/05–15/05: Sửa lỗi, Hiệu năng & Hoàn thiện

| Ngày | Ngày tháng | Người phụ trách | Công việc | Tiêu chí hoàn thành |
|------|------------|-----------------|-----------|----------------------|
| T2 | 11/05 | **ALL** | Sprint sửa lỗi nghiêm trọng: xử lý tất cả bug P0/P1 từ kiểm thử tích hợp | Tất cả bug nghiêm trọng và ưu tiên cao được giải quyết và xác minh |
| T3 | 12/05 | **ALL** | Sửa lỗi ưu tiên trung bình/thấp: xử lý bug P2/P3 còn lại | Bug backlog giảm chỉ còn lỗi thẩm mỹ |
| T4 | 13/05 | **BE1** | Tinh chỉnh hiệu năng AI agent: giảm độ trễ phản hồi, tối ưu prompt | Thời gian phản hồi AI trung bình ≤ 5 giây; token usage được tối ưu |
| T4 | 13/05 | **BE2** | Profiling hiệu năng backend: xác định và sửa bottleneck | Tất cả API endpoint phản hồi trong 500ms (ngoại trừ AI calls) |
| T4 | 13/05 | **FE** | Hoàn thiện UI/UX: micro-animation, transition, hiệu ứng hover, skeleton loading | UI mượt mà và chuyên nghiệp; không có transition giật |
| T5 | 14/05 | **BE1** | Dashboard giám sát Logfire: thiết lập metrics chính và cảnh báo | Dashboard hiển thị sức khỏe hệ thống thời gian thực; cảnh báo anomaly được cấu hình |
| T5 | 14/05 | **BE2** | Load testing: mô phỏng người dùng đồng thời | Hệ thống xử lý ≥ 50 người dùng đồng thời không suy giảm |
| T5 | 14/05 | **FE** | Rà soát khả năng truy cập: điều hướng bàn phím, nhãn ARIA, độ tương phản màu | Luồng chính điều hướng được bằng bàn phím; tỷ lệ tương phản đạt WCAG AA |
| T6 | 15/05 | **ALL** | Tích hợp UI panel Admin + kiểm thử end-to-end luồng admin | Admin quản lý user và kiểm duyệt nội dung qua giao diện |
| T6 | 15/05 | **ALL** | Smoke test end-to-end: duyệt qua mọi tính năng chính với tư cách người dùng mới | Tất cả tính năng hoạt động trong hành trình user liên tục không có lỗi |

### Tuần 11 — 18/05–24/05: Tài liệu, Triển khai & Bàn giao

| Ngày | Ngày tháng | Người phụ trách | Công việc | Tiêu chí hoàn thành |
|------|------------|-----------------|-----------|----------------------|
| T2 | 18/05 | **ALL** | Sửa lỗi cuối cùng: giải quyết mọi vấn đề còn lại từ smoke testing | Không còn bug P0–P2 đã biết |
| T3 | 19/05 | **BE1** | Tài liệu kỹ thuật: kiến trúc AI, sơ đồ luồng agent, hướng dẫn prompt engineering | Tài liệu bao phủ tất cả thành phần AI; developer mới có thể hiểu hệ thống |
| T3 | 19/05 | **BE2** | Tài liệu API: hoàn thiện Swagger, viết hướng dẫn triển khai, tham chiếu biến môi trường | Tài liệu API đầy đủ kèm ví dụ; hướng dẫn triển khai được test bởi thành viên khác |
| T3 | 19/05 | **FE** | Tài liệu Frontend: hướng dẫn thư viện component, tài liệu design system, hướng dẫn build | Frontend có thể build và chạy chỉ bằng cách theo tài liệu |
| T4 | 20/05 | **BE2** | Docker Compose config production: build tối ưu, phân tách môi trường, health checks | Production compose khởi chạy stack hoàn chỉnh thành công |
| T4 | 20/05 | **BE1** | Chạy thử triển khai: deploy toàn bộ stack, xác minh tất cả dịch vụ giao tiếp đúng | Toàn bộ ứng dụng truy cập được; mọi tính năng hoạt động |
| T4 | 20/05 | **FE** | Build production: tối ưu, xác minh không có console error, test ở chế độ production | `npm run build` thành công; ứng dụng production không có lỗi |
| T5 | 21/05 | **ALL** | QA cuối cùng: kiểm thử toàn diện bản triển khai production | Checklist QA hoàn thành với ✅ trên mọi mục |
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
Tuần  7  (20/04–24/04) ██ PDF, Bảo mật & Admin: pipeline PDF, bảo vệ XSS/CSRF, tính năng admin, chia sẻ
Tuần  8  (27/04–01/05) ██ Đa ngôn ngữ, Đánh giá & Tùy chọn: bản dịch, đánh giá AI, tùy chọn user, fallback
Tuần  9  (04/05–08/05) ██ Kiểm thử tích hợp: kiểm thử end-to-end toàn bộ tính năng
Tuần 10  (11/05–15/05) ██ Hoàn thiện: sửa lỗi, hiệu năng, UX, UI admin, load testing
Tuần 11  (18/05–24/05) ██ Bàn giao: tài liệu, triển khai, QA, demo, nộp bài
```
