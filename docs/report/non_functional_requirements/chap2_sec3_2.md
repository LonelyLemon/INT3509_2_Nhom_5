# 2.3.2 Yêu Cầu Bảo Mật

## Tổng quan

Hệ thống MarketMind xử lý thông tin tài khoản cá nhân, dữ liệu danh mục đầu tư và lịch sử hội thoại AI của người dùng. Yêu cầu bảo mật được thiết kế để bảo vệ dữ liệu người dùng ở mọi tầng — từ xác thực, truyền tải, lưu trữ đến kiểm soát truy cập — và ngăn chặn các hình thức tấn công phổ biến nhắm vào ứng dụng web.

---

## Xác thực và quản lý phiên

Hệ thống sử dụng cặp token JWT theo chuẩn HS256. Access token có thời hạn ngắn (30 phút) để giảm thiểu rủi ro khi bị đánh cắp; refresh token có thời hạn dài hơn (7 ngày) và chỉ được sử dụng để cấp access token mới. Khi người dùng đăng xuất, access token hiện tại bị đưa vào **danh sách đen (blacklist)** lưu trong Redis với TTL bằng đúng thời gian còn lại của token — đảm bảo token không thể tái sử dụng ngay cả khi chưa hết hạn theo chữ ký JWT.

```
Mật khẩu người dùng → bcrypt hash (adaptive salt) → Lưu database
                                                         ↓
                                                 Không bao giờ lưu plaintext
```

Mật khẩu được băm (hash) bằng thư viện bcrypt với salt ngẫu nhiên trước khi lưu vào cơ sở dữ liệu. Khi so sánh mật khẩu đăng nhập, hệ thống luôn so sánh hash, không bao giờ lưu hoặc log mật khẩu gốc.

## Kiểm soát truy cập

Hệ thống phân quyền theo hai mức: người dùng thông thường (`role = user`) và quản trị viên (`role = admin`). Một số tính năng bị giới hạn thêm theo trạng thái xác minh email (`is_verified`):

| Nhóm tính năng | Yêu cầu |
|---------------|---------|
| Xem dữ liệu giá, tin tức | Truy cập tự do |
| Quản lý portfolio, watchlist | Đăng nhập |
| AI Chat, đăng bài | Đăng nhập + xác minh email |
| Endpoint Admin | Đăng nhập + role = admin |

## Bảo vệ đầu vào người dùng

Toàn bộ dữ liệu đầu vào từ client được kiểm tra chặt chẽ qua hai tầng:

- **Pydantic (tầng API):** Kiểm tra kiểu dữ liệu, định dạng (email, URL), giá trị hợp lệ (range, enum), và ràng buộc nghiệp vụ (độ phức tạp mật khẩu). Dữ liệu không hợp lệ bị từ chối với HTTP 422 trước khi chạm vào tầng logic.
- **SQLAlchemy ORM:** Tất cả câu lệnh cơ sở dữ liệu đều sử dụng tham số hoá (parameterized queries), loại trừ hoàn toàn nguy cơ SQL Injection.

## Bảo vệ giao tiếp

Tất cả giao tiếp HTTP được thiết kế để chạy qua HTTPS trong môi trường production. Header bảo mật được thêm tự động bởi middleware cho mọi phản hồi:

| HTTP Header | Giá trị | Mục đích |
|------------|---------|---------|
| `X-Content-Type-Options` | `nosniff` | Ngăn MIME sniffing |
| `X-Frame-Options` | `DENY` | Ngăn Clickjacking |
| `X-XSS-Protection` | `1; mode=block` | Kích hoạt bộ lọc XSS trình duyệt |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Giới hạn thông tin referrer |
| `Strict-Transport-Security` | `max-age=31536000` | Bắt buộc HTTPS trong 1 năm |
| `Cache-Control` | `no-store` | Ngăn cache API response nhạy cảm |

CORS (Cross-Origin Resource Sharing) được cấu hình để chỉ chấp nhận yêu cầu từ các domain được phép, ngăn chặn các trang web bên thứ ba thực hiện request thay mặt người dùng.

## Guardrails cho AI

Tầng AI bổ sung thêm một lớp bảo mật nội dung riêng. Trước khi yêu cầu người dùng được chuyển đến tác nhân AI, hệ thống kiểm tra bằng regex để phát hiện các mẫu tấn công:

| Loại tấn công | Ví dụ mẫu phát hiện |
|--------------|-------------------|
| Prompt injection | "ignore previous instructions", "disregard your rules" |
| Jailbreak | "pretend you are", "you are now DAN" |
| SQL injection | `DROP TABLE`, `UNION SELECT` trong nội dung chat |
| Khai thác system prompt | "reveal your system prompt", "show me your instructions" |

Yêu cầu bị phát hiện là tấn công sẽ nhận phản hồi từ chối lịch sự mà không được chuyển đến tầng LLM.

## Bảo mật đặt lại mật khẩu

Quá trình đặt lại mật khẩu sử dụng OTP (One-Time Password) được gửi qua email, có thời hạn sử dụng. OTP được lưu trong Redis với TTL tương ứng. Sau khi sử dụng thành công, OTP bị vô hiệu hóa ngay lập tức để ngăn tái sử dụng.
