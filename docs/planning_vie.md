# Kế Hoạch & Tiến Độ Dự Án

**Dự án**: Ứng dụng Web phân tích thị trường tài chính dựa trên trí tuệ nhân tạo đa tác tử  
**Thời gian**: 09/03/2026 – 24/05/2026 (11 tuần, 55 ngày làm việc)

---

## Tham chiếu Loại Công việc

Mỗi công việc được gắn nhãn **Loại** theo định dạng `Domain<Category>` để phân loại bản chất công việc.

| Loại | Mô tả |
|------|-------|
| `Backend<Code>` | Logic nghiệp vụ, API, AI Agents, Models, Migrations, RAG logic. |
| `Backend<Config>` | Cấu trúc project, thiết lập biến môi trường, Pydantic schemas, thiết lập DB/Redis. |
| `Fronteend<Code>` | Phát triển Components, Pages, tích hợp API, xử lý logic UI. |
| `Frontend<Config>` | Thiết lập project (Vite/Tailwind), i18n framework, cấu hình build/lint. |
| `Docs` | Tài liệu dự án, hướng dẫn sử dụng, tài liệu API. |
| `Ops` | Docker, CI/CD, Deployment, Monitoring/Logging, bảo mật hạ tầng. |

---

## Giai đoạn 1: Nền tảng & Khởi tạo (Tuần 1–2)

### Tuần 1 — 09/03–13/03: Khởi tạo dự án & Xác thực

| Ngày | Ngày tháng | Loại | Công việc | Tiêu chí hoàn thành |
|------|------------|------|-----------|----------------------|
| T2 | 09/03 | `Ops` | Khởi động dự án: thống nhất chiến lược Git branching, cấu trúc repo, quy ước code | Repo được khởi tạo với cấu trúc thư mục đã thống nhất và `README.md` |
| T2 | 09/03 | `Backend<Config>` | Khung dự án FastAPI: cấu trúc thư mục, config, quản lý `.env` | FastAPI server khởi chạy và phản hồi health check |
| T2 | 09/03 | `Ops` | Thiết lập Docker Compose: các container PostgreSQL, Qdrant, Redis | `docker compose up` khởi chạy tất cả dịch vụ; health check pass |
| T2 | 09/03 | `Frontend<Config>` | Khung dự án React + Vite, cài đặt TailwindCSS, ESLint/Prettier | `npm run dev` khởi chạy ứng dụng với trang placeholder đã style |
| T3 | 10/03 | `Backend<Code>` | SQLAlchemy models + Alembic migration cho tất cả thực thể chính | Migration chạy thành công; các bảng được tạo trong PostgreSQL |
| T3 | 10/03 | `Ops` | Pipeline CI/CD bằng GitHub Actions: lint, test, build khi tạo PR | PR thử nghiệm kích hoạt pipeline thành công |
| T3 | 10/03 | `Frontend<Code>` | Hệ thống thiết kế: bảng màu, typography (Google Fonts), biến CSS cho dark/light mode | Design tokens được định nghĩa; chuyển dark/light hoạt động đúng |
| T4 | 11/03 | `Backend<Code>` | Tích hợp nhà cung cấp dữ liệu: kết nối API dữ liệu tài chính để lấy dữ liệu giá | Lấy dữ liệu giá thời gian thực và lịch sử thành công |
| T4 | 11/03 | `Backend<Code>` | Xác thực: đăng ký, đăng nhập và làm mới token (JWT + bcrypt) | API xác thực trả JWT token chính xác; mật khẩu lưu dạng bcrypt hash |
| T4 | 11/03 | `Frontend<Code>` | Giao diện trang Đăng nhập / Đăng ký với validation phía client | Cả hai trang hiển thị chính xác với phản hồi validation |
| T5 | 12/03 | `Backend<Code>` | API dữ liệu giá: báo giá thời gian thực, dữ liệu OHLCV lịch sử, truy vấn hàng loạt | API trả dữ liệu giá có cấu trúc với khoảng thời gian chính xác |
| T5 | 12/03 | `Backend<Code>` | Hoàn thiện xác thực: RBAC middleware, đăng xuất, đổi mật khẩu, xác minh email | Tất cả tính năng xác thực đã test; RBAC trả `403` cho vai trò không hợp lệ |
| T5 | 12/03 | `Frontend<Code>` | Tích hợp xác thực: kết nối trang với backend, lưu và làm mới token | Người dùng đăng ký, đăng nhập và xem nội dung được bảo vệ |
| T6 | 13/03 | `Backend<Code>` | API chỉ báo kỹ thuật + caching dữ liệu giá với Redis (dựa trên TTL) | Chỉ báo tính toán chính xác; cache hit/miss hoạt động đúng |
| T6 | 13/03 | `Backend<Code>` | API hồ sơ/tài khoản + middleware giới hạn tần suất Redis | Cập nhật hồ sơ hoạt động; request bị giới hạn trả `429` |
| T6 | 13/03 | `Frontend<Code>` | Giao diện trang hồ sơ + kết nối với API hồ sơ | Trang hồ sơ hiển thị và chỉnh sửa thông tin user, lưu thay đổi thành công |

### Tuần 2 — 16/03–20/03: Tích hợp Dữ liệu & Bố cục Dashboard

| Ngày | Ngày tháng | Loại | Công việc | Tiêu chí hoàn thành |
|------|------------|------|-----------|----------------------|
| T2 | 16/03 | `Backend<Code>` | Xử lý lỗi API giá và trường hợp biên (thị trường đóng cửa, symbol không hợp lệ) | Tất cả trường hợp biên trả phản hồi lỗi phù hợp; bộ test pass |
| T2 | 16/03 | `Backend<Code>` | Thiết lập WebSocket server cho truyền tải giá thời gian thực | Client WebSocket kết nối và nhận được tin nhắn giá |
| T2 | 16/03 | `Frontend<Code>` | Bố cục dashboard chính: header, sidebar, khối nội dung linh hoạt | Dashboard hiển thị với các khối layout kéo/thay đổi kích thước được |
| T3 | 17/03 | `Backend<Config>` | Xác thực dữ liệu cho request liên quan đến giá (Pydantic schemas) | Input không hợp lệ trả lỗi validation rõ ràng với thông báo theo trường |
| T3 | 17/03 | `Backend<Code>` | WebSocket streaming giá: đăng ký/hủy đăng ký symbol, phát sóng tick thời gian thực | Nhiều client nhận cập nhật giá cho các symbol đã đăng ký |
| T3 | 17/03 | `Frontend<Code>` | Tích hợp Lightweight Charts: component biểu đồ nến với zoom/pan | Biểu đồ hiển thị dữ liệu nến thực với điều khiển tương tác |
| T4 | 18/03 | `Backend<Code>` | Kiểm thử tích hợp dữ liệu giá: bao phủ toàn bộ bề mặt API | Bộ test hoàn chỉnh cho module dữ liệu giá pass |
| T4 | 18/03 | `Backend<Code>` | Tích hợp nguồn tin tức: kết nối API tin tức tài chính | Dữ liệu tin tức thô được lấy về và cấu trúc hóa thành model nội bộ |
| T4 | 18/03 | `Frontend<Code>` | Component tìm kiếm mã + chuyển đổi biểu đồ | Người dùng tìm mã cổ phiếu và chuyển view biểu đồ động |
| T5 | 19/03 | `Backend<Config>` | Nền tảng MCP server: thiết lập server và framework đăng ký tool | MCP server khởi chạy; tools có thể đăng ký và liệt kê |
| T5 | 19/03 | `Backend<Code>` | Tích hợp dữ liệu lịch kinh tế từ nguồn bên ngoài | Sự kiện lịch được lấy với ngày, quốc gia, mức ảnh hưởng, giá trị |
| T5 | 19/03 | `Frontend<Code>` | Component sidebar danh sách theo dõi (thêm/xóa symbol, hiển thị giá mini live) | Sidebar hiển thị các symbol của user với chỉ báo giá live |
| T6 | 20/03 | `Backend<Code>` | MCP tools: triển khai tools truy xuất dữ liệu giá và phân tích kỹ thuật | Tools trả dữ liệu live chính xác khi gọi qua giao thức MCP |
| T6 | 20/03 | `Backend<Config>` | Xác thực dữ liệu cho endpoint tin tức và lịch | Input không hợp lệ trả thông báo lỗi rõ ràng |
| T6 | 20/03 | `Frontend<Code>` | Hoàn thiện layout responsive cho Dashboard + chốt chuyển đổi Light/Dark mode | Dashboard sử dụng được trên tablet & desktop; nút chuyển mode lưu tùy chọn |

---

## Giai đoạn 2: AI Cốt lõi & Chat (Tuần 3–4)

### Tuần 3 — 23/03–27/03: Thiết lập AI Agent & Giao diện Chat

| Ngày | Ngày tháng | Loại | Công việc | Tiêu chí hoàn thành |
|------|------------|------|-----------|----------------------|
| T2 | 23/03 | `Backend<Code>` | Khung pydantic-ai agent: cấu hình kết nối LLM và logic chọn model | Agent khởi tạo và trả phản hồi cơ bản từ mỗi nhà cung cấp LLM |
| T2 | 23/03 | `Backend<Code>` | Thiết lập Celery + Redis/RabbitMQ: hạ tầng background worker | Celery worker khởi chạy; task thử nghiệm thực thi bất đồng bộ |
| T2 | 23/03 | `Frontend<Code>` | Bố cục giao diện AI Chat: danh sách tin nhắn, hộp nhập, nút gửi, drawer hội thoại | UI Chat hiển thị với lịch sử tin nhắn cuộn được và vùng nhập liệu |
| T3 | 24/03 | `Backend<Code>` | Cơ chế fallback LLM + MCP tools cho lịch kinh tế và truy xuất tin tức | Fallback hoạt động khi lỗi; tất cả MCP tools trả dữ liệu chính xác |
| T3 | 24/03 | `Backend<Code>` | Task thu thập tin tức nền: crawl định kỳ từ nhiều nguồn | Celery beat lên lịch crawl; tin tức tự động lưu vào DB |
| T3 | 24/03 | `Frontend<Code>` | Renderer tin nhắn chat: text với markdown, bảng dữ liệu, component biểu đồ inline | Tin nhắn hiển thị đúng ở cả 3 format |
| T4 | 25/03 | `Backend<Code>` | Quản lý hội thoại: theo dõi trạng thái đa bước, lưu trữ ngữ cảnh user | Lịch sử hội thoại lưu trữ xuyên phiên; context window được quản lý |
| T4 | 25/03 | `Backend<Code>` | Pipeline phân tích cảm xúc tin tức (dựa trên LLM, background job) | Mỗi bài tin được gán điểm cảm xúc lưu trong DB |
| T4 | 25/03 | `Frontend<Code>` | Nút thao tác nhanh: câu hỏi phổ biến có sẵn | Nhấn nút điền input và gửi truy vấn |
| T5 | 26/03 | `Backend<Code>` | Phân loại ý định + streaming SSE cho phản hồi AI theo từng từ | Phân loại ý định chính xác; SSE stream token tăng dần |
| T5 | 26/03 | `Backend<Code>` | API tin tức: liệt kê, lọc (theo ngày/cảm xúc/nguồn), truy xuất bài đơn lẻ | API trả tin tức phân trang với bộ lọc chính xác |
| T5 | 26/03 | `Frontend<Code>` | Tích hợp SSE: hiển thị phản hồi AI thời gian thực (streaming từng từ) | Chat hiển thị phản hồi AI khi đang stream, có chỉ báo đang gõ |
| T6 | 27/03 | `Backend<Code>` | API chat: gửi tin nhắn, truy xuất lịch sử, hội thoại + lưu trữ hội thoại | API chat hoạt động end-to-end: gửi tin → nhận phản hồi AI stream |
| T6 | 27/03 | `Backend<Code>` | API lịch kinh tế: liệt kê và lọc sự kiện | API lịch trả sự kiện có cấu trúc với bộ lọc chính xác |
| T6 | 27/03 | `Frontend<Code>` | Drawer lịch sử chat: liệt kê hội thoại cũ, tải hội thoại đã chọn | Người dùng duyệt và tiếp tục phiên chat cũ |

### Tuần 4 — 30/03–03/04: An toàn AI & Portfolio/Watchlist

| Ngày | Ngày tháng | Loại | Công việc | Tiêu chí hoàn thành |
|------|------------|------|-----------|----------------------|
| T2 | 30/03 | `Backend<Code>` | Cơ chế guardrail: lọc chủ đề, kiểm tra an toàn phản hồi, quy tắc anti-abuse | Truy vấn lạc đề hoặc lạm dụng nhận tin nhắn từ chối phù hợp |
| T2 | 30/03 | `Backend<Code>` | Thiết kế API Portfolio/Watchlist và data models | API spec được ghi nhận trong Swagger với tất cả CRUD operations |
| T2 | 30/03 | `Frontend<Code>` | Bố cục trang tin tức: dạng dòng thời gian, bộ lọc chuyên mục, thanh tìm kiếm | Trang tin tức hiển thị với dữ liệu placeholder dạng timeline |
| T3 | 31/03 | `Backend<Code>` | Bảo vệ prompt injection: lọc input, cô lập system prompt, quy tắc phát hiện | Các nỗ lực prompt injection bị chặn; system prompt không bao giờ bị lộ |
| T3 | 31/03 | `Backend<Code>` | API CRUD Portfolio: thêm, sửa, xóa holdings với số lượng và giá | Tất cả CRUD hoạt động; giá trị portfolio tính từ giá live |
| T3 | 31/03 | `Frontend<Code>` | Card tin tức: tiêu đề, nguồn, nhãn cảm xúc, thời gian, đoạn xem trước | Card hiển thị tất cả trường; nhấn vào mở chế độ xem toàn bộ |
| T4 | 01/04 | `Backend<Code>` | Quản lý context window: đếm token, cắt tỉa hội thoại, tóm tắt tự động | Hội thoại dài được tóm tắt tự động để nằm trong giới hạn token |
| T4 | 01/04 | `Backend<Code>` | API CRUD Watchlist: thêm/xóa symbol, sắp xếp lại | API Watchlist đã test; symbol lưu trữ theo tài khoản user |
| T4 | 01/04 | `Frontend<Code>` | Trang lịch kinh tế: bảng với chi tiết sự kiện, quốc gia, mức ảnh hưởng, giá trị | Lịch hiển thị dữ liệu thực với bộ lọc theo ngày và quốc gia |
| T5 | 02/04 | `Backend<Code>` | Tích hợp giám sát Logfire: trace các lời gọi AI agent, log token usage, độ trễ | Dashboard Logfire hiển thị request trace và tỷ lệ lỗi |
| T5 | 02/04 | `Backend<Code>` | Xác thực dữ liệu Portfolio/Watchlist + trường hợp biên | Input không hợp lệ bị từ chối với thông báo lỗi rõ ràng |
| T5 | 02/04 | `Frontend<Code>` | Controls lọc lịch: theo quốc gia, mức quan trọng, khoảng ngày | Bộ lọc thu hẹp đúng sự kiện hiển thị; lọc kết hợp hoạt động |
| T6 | 03/04 | `Backend<Code>` | Kiểm thử end-to-end AI agent: xác minh tất cả đường ý định với truy vấn mẫu | Bộ test bao phủ truy vấn đại diện; tất cả trả phản hồi hợp lệ |
| T6 | 03/04 | `Backend<Code>` | Kiểm thử tích hợp Portfolio/Watchlist | Test end-to-end pass cho tất cả luồng portfolio và watchlist |
| T6 | 03/04 | `Frontend<Code>` | Hoàn thiện UI trang Tin tức + Lịch: trạng thái loading, trống, xử lý lỗi | Trang xử lý mọi trạng thái một cách mượt mà |

---

## Giai đoạn 3: RAG & Cảnh báo (Tuần 5–6)

### Tuần 5 — 06/04–10/04: Tích hợp RAG & Hệ thống Cảnh báo

| Ngày | Ngày tháng | Loại | Công việc | Tiêu chí hoàn thành |
|------|------------|------|-----------|----------------------|
| T2 | 06/04 | `Backend<Code>` | Thiết lập Qdrant vector store: schema collection, chọn embedding model | Collection Qdrant được tạo; tài liệu test embed và truy xuất thành công |
| T2 | 06/04 | `Backend<Code>` | Hệ thống cảnh báo: data models, điều kiện kích hoạt, thiết kế API | API spec được ghi nhận; alert models được định nghĩa |
| T2 | 06/04 | `Frontend<Code>` | Bố cục trang quản lý danh mục: bảng holdings, form thêm tài sản, thẻ tóm tắt | Trang hiển thị với cấu trúc bảng và modal thêm tài sản |
| T3 | 07/04 | `Backend<Code>` | Pipeline nhúng tài liệu: chunk báo cáo tài chính → embed → lưu Qdrant | Tài liệu mẫu được chunk và lưu; tìm kiếm tương đồng trả chunk liên quan |
| T3 | 07/04 | `Backend<Code>` | API CRUD cảnh báo: tạo, đọc, cập nhật, xóa, liệt kê cảnh báo theo user | Tất cả CRUD cảnh báo hoạt động chính xác |
| T3 | 07/04 | `Frontend<Code>` | UI Portfolio: thêm/sửa/xóa tài sản, input số lượng & giá, dialog xác nhận | Người dùng quản lý được các mục portfolio; thay đổi lưu sau refresh |
| T4 | 08/04 | `Backend<Code>` | RAG retrieval chain: tích hợp tìm kiếm vector vào pipeline lập luận AI agent | AI agent truy vấn Qdrant lấy ngữ cảnh trước khi sinh phản hồi |
| T4 | 08/04 | `Backend<Code>` | Giám sát cảnh báo giá: task nền kiểm tra ngưỡng giá định kỳ | Cảnh báo giá kích hoạt trong thời gian dự kiến khi vượt ngưỡng |
| T4 | 08/04 | `Frontend<Code>` | Quản lý watchlist: kéo để sắp xếp, thêm nhanh từ biểu đồ, xóa bằng vuốt | Watchlist tương tác đầy đủ; thay đổi đồng bộ với backend |
| T5 | 09/04 | `Backend<Code>` | Kiểm thử chất lượng RAG: đo mức liên quan truy xuất trên truy vấn tài chính | Precision truy xuất ≥ 70% trên bộ test |
| T5 | 09/04 | `Backend<Code>` | Phân phối thông báo cảnh báo: WebSocket push, trung tâm thông báo in-app | Thông báo xuất hiện thời gian thực trên panel thông báo |
| T5 | 09/04 | `Frontend<Code>` | Widget dashboard Portfolio: biểu đồ phân bổ, tổng giá trị, thẻ tóm tắt P&L | Widget hiển thị dữ liệu portfolio tổng hợp chính xác |
| T6 | 10/04 | `Backend<Code>` | Tối ưu RAG: điều chỉnh kích thước chunk, so sánh embedding model, re-ranking | Chất lượng phản hồi cải thiện; độ trễ trong phạm vi chấp nhận |
| T6 | 10/04 | `Backend<Code>` | Kiểm thử tích hợp hệ thống cảnh báo | Test end-to-end pass cho tất cả luồng cảnh báo |
| T6 | 10/04 | `Frontend<Code>` | Tích hợp WebSocket: cập nhật giá live trên watchlist & giá trị portfolio | Giá cập nhật thời gian thực không cần refresh trang |

### Tuần 6 — 13/04–17/04: Diễn đàn/Blog & Cải tiến AI

| Ngày | Ngày tháng | Loại | Công việc | Tiêu chí hoàn thành |
|------|------------|------|-----------|----------------------|
| T2 | 13/04 | `Backend<Code>` | Cảnh báo cảm xúc AI: phát hiện cảm xúc tiêu cực từ phân tích tin tức | Cảnh báo cảm xúc kích hoạt khi cảm xúc tổng hợp giảm dưới ngưỡng |
| T2 | 13/04 | `Backend<Code>` | API CRUD bài viết/post: nội dung, thông tin tác giả, tags, thời gian | Bài viết tạo, liệt kê, cập nhật, xóa qua API |
| T2 | 13/04 | `Frontend<Code>` | Bố cục trang Diễn đàn/Blog: danh sách bài viết, nút tạo bài, sidebar chuyên mục | Trang diễn đàn hiển thị với card bài viết và điều hướng |
| T3 | 14/04 | `Backend<Code>` | Caching phân tích AI: lưu và tái sử dụng kết quả phân tích (Redis, TTL) | Truy vấn giống nhau trong TTL trả phản hồi cached |
| T3 | 14/04 | `Backend<Code>` | API bình luận: thêm, liệt kê, phân luồng qua bình luận cha | Thread bình luận hoạt động chính xác |
| T3 | 14/04 | `Frontend<Code>` | Tích hợp trình soạn thảo rich text cho tạo bài blog | Editor hỗ trợ định dạng, code block, hình ảnh |
| T4 | 15/04 | `Backend<Code>` | Đồng bộ CSDL lai: cơ chế đồng bộ PostgreSQL ↔ Qdrant | Kết quả RAG retrieval khớp với dữ liệu mới nhất trong PostgreSQL |
| T4 | 15/04 | `Backend<Code>` | API đánh giá: gửi, cập nhật, tính trung bình | Trung bình đánh giá cập nhật đúng khi có đánh giá mới |
| T4 | 15/04 | `Frontend<Code>` | Nhúng biểu đồ live trong bài blog: chèn biểu đồ tương tác vào editor | Biểu đồ trong bài viết tương tác được, không phải ảnh tĩnh |
| T5 | 16/04 | `Backend<Code>` | Kiểm thử end-to-end hệ thống cảnh báo (cảnh báo giá + cảm xúc) | Tất cả loại cảnh báo được test; tỷ lệ false positive chấp nhận được |
| T5 | 16/04 | `Backend<Code>` | API hệ thống tag cho phân loại bài viết | Tags có thể tạo, liệt kê và liên kết với bài viết |
| T5 | 16/04 | `Frontend<Code>` | UI phần bình luận & đánh giá sao (1–5 sao) dưới mỗi bài viết | Người dùng bình luận và đánh giá; điểm trung bình hiển thị |
| T6 | 17/04 | `Backend<Code>` | Cải thiện chất lượng AI dựa trên kết quả kiểm thử end-to-end | Chất lượng phản hồi agent cải thiện đo lường được |
| T6 | 17/04 | `Backend<Code>` | Kiểm thử tích hợp API Diễn đàn/Blog | Tất cả tính năng diễn đàn hoạt động end-to-end |
| T6 | 17/04 | `Frontend<Code>` | Danh sách bài + trang chi tiết: phân trang, sắp xếp, link hồ sơ tác giả | Diễn đàn duyệt được với sắp xếp/phân trang; trang chi tiết đầy đủ |

---

## Giai đoạn 4: Xử lý PDF, Bảo mật & Quản trị (Tuần 7)

### Tuần 7 — 20/04–24/04: Pipeline PDF, Bảo mật & Tính năng Admin

| Ngày | Ngày tháng | Loại | Công việc | Tiêu chí hoàn thành |
|------|------------|------|-----------|----------------------|
| T2 | 20/04 | `Backend<Code>` | Pipeline trích xuất văn bản PDF: tích hợp thư viện phân tích tài liệu | PDF upload trả văn bản trích xuất với cấu trúc được bảo toàn |
| T2 | 20/04 | `Backend<Code>` | Bảo vệ XSS: lọc input rich text, cấu hình CSP headers | Tag script chèn trong bài diễn đàn bị loại bỏ; CSP headers có |
| T2 | 20/04 | `Frontend<Code>` | UI upload PDF: vùng kéo-thả, thanh tiến trình, xác thực loại file | Người dùng upload được PDF; file không phải PDF bị từ chối |
| T3 | 21/04 | `Backend<Code>` | Pipeline chunking PDF: chia văn bản trích xuất thành chunk ngữ nghĩa | Nội dung PDF chia thành chunk có ý nghĩa với metadata được bảo toàn |
| T3 | 21/04 | `Backend<Code>` | Bảo vệ CSRF: middleware CSRF dựa trên token cho endpoint thay đổi trạng thái | Request không có CSRF token hợp lệ bị từ chối |
| T3 | 21/04 | `Frontend<Code>` | Component xem trước PDF: hiển thị nội dung trích xuất trước khi xác nhận | Người dùng xem xem trước và có thể xác nhận hoặc hủy |
| T4 | 22/04 | `Backend<Code>` | Vector hóa PDF: embed chunk → lưu vào Qdrant với metadata nguồn | Chunk PDF tìm kiếm được trong Qdrant kèm tham chiếu file nguồn |
| T4 | 22/04 | `Backend<Code>` | Kiểm tra bảo mật: rà soát tất cả endpoint về auth, xác thực input, rò rỉ lỗi | Báo cáo kiểm tra được tạo; tất cả phát hiện nghiêm trọng được xử lý |
| T4 | 22/04 | `Frontend<Code>` | Trang quản lý cảnh báo: form tạo cảnh báo, danh sách cảnh báo, sửa/xóa | Người dùng quản lý cảnh báo qua UI |
| T5 | 23/04 | `Backend<Code>` | Tích hợp PDF + RAG: AI agent sử dụng PDF đã import làm ngữ cảnh kiến thức | Hỏi về nội dung PDF đã upload trả câu trả lời chính xác |
| T5 | 23/04 | `Backend<Code>` | API Admin: quản lý user (liệt kê, đổi vai trò, cấm), kiểm duyệt nội dung | Admin quản lý user và kiểm duyệt nội dung qua API |
| T5 | 23/04 | `Frontend<Code>` | Hiển thị thông báo cảnh báo: toast notification, chuông với số chưa đọc | Cảnh báo thời gian thực xuất hiện dạng toast; panel hiển thị lịch sử |
| T6 | 24/04 | `Backend<Code>` | Kiểm thử end-to-end pipeline PDF: upload → trích xuất → chunk → vector hóa → truy vấn | Pipeline hoàn chỉnh test với tài liệu PDF thực |
| T6 | 24/04 | `Backend<Code>` | Kiểm thử bảo mật: test tự động cho bypass auth, XSS, CSRF, injection | Bộ test bảo mật pass; không phát hiện lỗ hổng nghiêm trọng |
| T6 | 24/04 | `Frontend<Code>` | Chia sẻ mạng xã hội: tạo link chia sẻ cho biểu đồ & nhật ký chat AI | Nút chia sẻ tạo URL duy nhất; view chia sẻ hoạt động chính xác |

---

## Giai đoạn 5: Đa ngôn ngữ, Đánh giá, Tùy chọn & Tích hợp (Tuần 8–9)

### Tuần 8 — 27/04–01/05: Đa ngôn ngữ, Đánh giá AI & Tùy chọn

| Ngày | Ngày tháng | Loại | Công việc | Tiêu chí hoàn thành |
|------|------------|------|-----------|----------------------|
| T2 | 27/04 | `Backend<Code>` | Thiết lập DeepEval: framework đánh giá chất lượng AI agent (LLM-as-a-Judge) | Pipeline đánh giá chạy được; test case mẫu được chấm |
| T2 | 27/04 | `Backend<Code>` | Rà soát tài liệu API: đảm bảo tất cả endpoint ghi nhận trong OpenAPI/Swagger | Swagger UI hiển thị tất cả endpoint với schema và ví dụ |
| T2 | 27/04 | `Frontend<Code>` | Thiết lập framework i18n: language context, cấu trúc file dịch | Cơ sở hạ tầng chuyển ngôn ngữ hoạt động với chuỗi placeholder tiếng Anh |
| T3 | 28/04 | `Backend<Code>` | Tạo test case đánh giá: kịch bản test đơn lượt và đa lượt | Bộ test case bao phủ tất cả ý định chính; kết quả log kèm điểm |
| T3 | 28/04 | `Backend<Code>` | Backend i18n: thông báo lỗi và phản hồi API hỗ trợ header ngôn ngữ | API trả thông báo lỗi bản địa hóa dựa trên `Accept-Language` |
| T3 | 28/04 | `Frontend<Code>` | Bản dịch tiếng Việt: dịch tất cả chuỗi UI (nav, nhãn, thông báo, lỗi) | Toàn bộ ứng dụng hiển thị đúng bằng tiếng Việt |
| T4 | 29/04 | `Backend<Code>` | Metrics chất lượng AI: đo mức liên quan, độ chính xác, hữu ích | Báo cáo chất lượng được tạo; điểm yếu được xác định |
| T4 | 29/04 | `Backend<Code>` | Tối ưu CSDL: thêm index, tối ưu truy vấn chậm, connection pooling | Truy vấn chậm được tối ưu; CSDL xử lý tốt nhiều user đồng thời |
| T4 | 29/04 | `Frontend<Code>` | Component chuyển ngôn ngữ: toggle trên header, lưu tùy chọn | Tùy chọn ngôn ngữ được lưu xuyên phiên |
| T5 | 30/04 | `Backend<Code>` | Cải thiện AI agent: tinh chỉnh prompt và tool dựa trên feedback đánh giá | Điểm đánh giá cải thiện trên các test case trước đó yếu |
| T5 | 30/04 | `Backend<Code>` | API tùy chọn người dùng: giao diện, ngôn ngữ, bộ lọc, bố cục, thông báo | Tùy chọn được lưu theo user và áp dụng khi đăng nhập |
| T5 | 30/04 | `Frontend<Code>` | UI tùy chọn người dùng: chuyển giao diện, ngôn ngữ, trang cài đặt thông báo | Người dùng cấu hình và lưu được tất cả tùy chọn |
| T6 | 01/05 | `Backend<Code>` | Hoàn thiện báo cáo đánh giá AI + tài liệu tối ưu prompt | Báo cáo và tài liệu hoàn thành |
| T6 | 01/05 | `Backend<Code>` | Dữ liệu fallback: chuẩn bị dữ liệu cached cho endpoint quan trọng khi API gián đoạn | Khi API bên ngoài lỗi, hệ thống phục vụ dữ liệu cached kèm timestamp |
| T6 | 01/05 | `Frontend<Code>` | UI Fallback: error boundary, banner API-down, chỉ báo chế độ offline | Người dùng thấy thông báo fallback thân thiện thay vì trang bị hỏng |
| T6 | 01/05 | `Fullstack<Code>` | Checkpoint tích hợp: kết nối tất cả trang frontend còn lại với API backend | Tất cả trang lấy dữ liệu thực từ backend; không còn placeholder |

### Tuần 9 — 04/05–08/05: Kiểm thử Tích hợp Toàn diện

| Ngày | Ngày tháng | Loại | Công việc | Tiêu chí hoàn thành |
|------|------------|------|-----------|----------------------|
| T2 | 04/05 | `Fullstack<Code>` | Kiểm thử tích hợp: Luồng Auth — đăng ký → xác minh → đăng nhập → hồ sơ → RBAC | Toàn bộ hành trình auth hoạt động end-to-end |
| T2 | 04/05 | `Fullstack<Code>` | Sửa lỗi từ kiểm thử tích hợp auth | Tất cả lỗi UI liên quan auth được giải quyết |
| T3 | 05/05 | `Fullstack<Code>` | Kiểm thử tích hợp: Dashboard — dữ liệu giá, WebSocket, biểu đồ, watchlist | Dashboard tải giá, stream cập nhật, biểu đồ hiển thị đúng |
| T3 | 05/05 | `Frontend<Code>` | Tối ưu hiệu năng: lazy loading routes, code splitting, tối ưu hình ảnh | Điểm Lighthouse performance ≥ 80; kích thước bundle giảm |
| T4 | 06/05 | `Fullstack<Code>` | Kiểm thử tích hợp: AI Chat — gửi truy vấn → SSE → phản hồi đa format → lịch sử | Toàn bộ luồng chat hoạt động: streaming, hiển thị, lưu trữ |
| T4 | 06/05 | `Backend<Code>` | Kiểm tra nhanh chất lượng phản hồi AI: test thủ công truy vấn thực tế | ≥ 80% phản hồi đạt yêu cầu qua review thủ công |
| T5 | 07/05 | `Fullstack<Code>` | Kiểm thử tích hợp: Tin tức + Lịch + Hệ thống cảnh báo end-to-end | Tin tức tải, bộ lọc lịch hoạt động, cảnh báo kích hoạt và thông báo |
| T5 | 07/05 | `Backend<Code>` | Độ tin cậy background job: xác minh Celery task phục hồi và tính toàn vẹn dữ liệu | Task lỗi retry đúng; không có job mồ côi sau crash giả lập |
| T6 | 08/05 | `Fullstack<Code>` | Kiểm thử tích hợp: Diễn đàn + Import PDF + Portfolio + Admin | Tất cả tính năng cộng đồng, portfolio và admin hoạt động end-to-end |
| T6 | 08/05 | `Frontend<Code>` | Kiểm thử responsive: xác minh tất cả trang trên các kích thước viewport | Không bị vỡ layout trên bất kỳ viewport nào; hành vi cuộn đúng |

---

## Giai đoạn 6: Hoàn thiện, Tối ưu & Bàn giao (Tuần 10–11)

### Tuần 10 — 11/05–15/05: Sửa lỗi, Hiệu năng & Hoàn thiện

| Ngày | Ngày tháng | Loại | Công việc | Tiêu chí hoàn thành |
|------|------------|------|-----------|----------------------|
| T2 | 11/05 | `Fullstack<Code>` | Sprint sửa lỗi nghiêm trọng: xử lý tất cả bug P0/P1 | Tất cả bug nghiêm trọng và ưu tiên cao được giải quyết |
| T3 | 12/05 | `Fullstack<Code>` | Sửa lỗi ưu tiên trung bình/thấp: xử lý bug P2/P3 còn lại | Bug backlog giảm chỉ còn lỗi thẩm mỹ |
| T4 | 13/05 | `Backend<Code>` | Tinh chỉnh hiệu năng AI agent: giảm độ trễ phản hồi, tối ưu prompt | Thời gian phản hồi AI trung bình ≤ 5 giây; token usage tối ưu |
| T4 | 13/05 | `Backend<Code>` | Profiling hiệu năng backend: xác định và sửa bottleneck | Tất cả API endpoint phản hồi trong 500ms (ngoại trừ AI calls) |
| T4 | 13/05 | `Frontend<Code>` | Hoàn thiện UI/UX: micro-animation, transition, hover, skeleton loading | UI mượt mà và chuyên nghiệp; không có transition giật |
| T5 | 14/05 | `Backend<Code>` | Dashboard giám sát Logfire: thiết lập metrics chính và cảnh báo | Dashboard hiển thị sức khỏe hệ thống; cảnh báo anomaly |
| T5 | 14/05 | `Backend<Code>` | Load testing: mô phỏng người dùng đồng thời | Hệ thống xử lý ≥ 50 user đồng thời không suy giảm |
| T5 | 14/05 | `Frontend<Code>` | Rà soát khả năng truy cập: điều hướng bàn phím, nhãn ARIA, tương phản | Luồng chính điều hướng bàn phím; tỷ lệ tương phản đạt WCAG AA |
| T6 | 15/05 | `Fullstack<Code>` | Tích hợp UI panel Admin + kiểm thử end-to-end luồng admin | Admin quản lý user và kiểm duyệt nội dung qua giao diện |
| T6 | 15/05 | `Fullstack<Code>` | Smoke test end-to-end: duyệt mọi tính năng chính với tư cách người dùng mới | Tất cả tính năng hoạt động trong hành trình user liên tục |

### Tuần 11 — 18/05–24/05: Tài liệu, Triển khai & Bàn giao

| Ngày | Ngày tháng | Loại | Công việc | Tiêu chí hoàn thành |
|------|------------|------|-----------|----------------------|
| T2 | 18/05 | `Fullstack<Code>` | Sửa lỗi cuối cùng: giải quyết mọi vấn đề còn lại từ smoke testing | Không còn bug P0–P2 đã biết |
| T3 | 19/05 | `Backend<Code>` | Tài liệu kỹ thuật: kiến trúc AI, sơ đồ luồng agent, hướng dẫn prompt engineering | Tài liệu bao phủ tất cả thành phần AI; dev mới có thể hiểu hệ thống |
| T3 | 19/05 | `Backend<Code>` | Tài liệu API: hoàn thiện Swagger, hướng dẫn triển khai, tham chiếu biến môi trường | Tài liệu API đầy đủ kèm ví dụ; hướng dẫn triển khai được test |
| T3 | 19/05 | `Frontend<Code>` | Tài liệu Frontend: hướng dẫn thư viện component, design system, hướng dẫn build | Frontend có thể build và chạy chỉ bằng cách theo tài liệu |
| T4 | 20/05 | `Fullstack<Code>` | Docker Compose config production: build tối ưu, phân tách môi trường, health checks | Production compose khởi chạy stack hoàn chỉnh thành công |
| T4 | 20/05 | `Fullstack<Code>` | Chạy thử triển khai: deploy toàn bộ stack, xác minh tất cả dịch vụ giao tiếp | Toàn bộ ứng dụng truy cập được; mọi tính năng hoạt động |
| T4 | 20/05 | `Frontend<Code>` | Build production: tối ưu, xác minh không console error, test chế độ production | `npm run build` thành công; ứng dụng production không có lỗi |
| T5 | 21/05 | `Fullstack<Code>` | QA cuối cùng: kiểm thử toàn diện bản triển khai production | Checklist QA hoàn thành với ✅ trên mọi mục |
| T6 | 22/05 | `Fullstack<Code>` | Chuẩn bị demo: slide thuyết trình, kịch bản demo, điểm nói | Bài thuyết trình sẵn sàng; demo được tập dượt và chạy mượt |
| T7–CN | 23–24/05 | `Fullstack<Code>` | **Dự phòng**: sửa lỗi phút chót, tập dượt cuối, nộp dự án | Dự án nộp đúng hạn với tất cả sản phẩm bàn giao |

---

## Tóm tắt Tiến độ

```
Tuần  1  (09/03–13/03) ██ Nền tảng: khung dự án, Docker, xác thực, dữ liệu giá, CI/CD
Tuần  2  (16/03–20/03) ██ Dữ liệu: test API giá, WebSocket, tích hợp tin tức/lịch, nền tảng MCP
Tuần  3  (23/03–27/03) ██ AI Lõi: LLM agents, MCP tools, chat, SSE, pipeline tin tức, API lịch
Tuần  4  (30/03–03/04) ██ An toàn AI + Portfolio: guardrails, prompt injection, API portfolio/watchlist
Tuần  5  (06/04–10/04) ██ RAG & Cảnh báo: tìm kiếm vector, embeddings, CRUD cảnh báo, giám sát
Tuần  6  (13/04–17/04) ██ Diễn đàn & Cải tiến AI: API blog, bình luận, đánh giá, AI caching, đồng bộ DB
Tuần  7  (20/04–24/04) ██ PDF, Bảo mật & Admin: pipeline PDF, XSS/CSRF, API admin, chia sẻ
Tuần  8  (27/04–01/05) ██ Đa ngôn ngữ, Đánh giá & Tùy chọn: bản dịch, đánh giá AI, tùy chọn, fallback
Tuần  9  (04/05–08/05) ██ Kiểm thử tích hợp: kiểm thử end-to-end toàn bộ tính năng
Tuần 10  (11/05–15/05) ██ Hoàn thiện: sửa lỗi, hiệu năng, UX, UI admin, load testing
Tuần 11  (18/05–24/05) ██ Bàn giao: tài liệu, triển khai, QA, demo, nộp bài
```
