# 3.4.1 Cấu Trúc RESTful Endpoint Theo Module

## Nguyên tắc tổ chức

API được tổ chức thành **8 router module**, mỗi module có prefix riêng tương ứng với nhóm chức năng. Không có global API prefix (ví dụ `/api/v1`) — các endpoint được mount trực tiếp tại root. Mỗi endpoint tuân thủ ngữ nghĩa HTTP: `GET` đọc, `POST` tạo, `PATCH` cập nhật một phần, `PUT` thay thế hoàn toàn, `DELETE` xóa. Status code phản ánh chính xác kết quả: `201 Created` khi tạo thành công, `204 No Content` khi xóa thành công, `202 Accepted` khi task được enqueue (không xử lý ngay).

---

## Module `/auth` — Xác thực & Tài khoản

| Method | Endpoint | Quyền | Mô tả |
|--------|----------|-------|-------|
| POST | `/auth/register` | Public | Đăng ký tài khoản, gửi email xác minh |
| GET | `/auth/verify-email?token=` | Public | Xác minh email qua token trong link |
| POST | `/auth/resend-verification` | Public | Gửi lại email xác minh |
| POST | `/auth/login` | Public | Đăng nhập (form OAuth2), trả về access + refresh token |
| POST | `/auth/refresh` | Public | Đổi refresh token lấy access token mới |
| POST | `/auth/logout` | Auth | Đưa access token vào blacklist Redis |
| GET | `/auth/me` | Auth | Xem thông tin tài khoản |
| PATCH | `/auth/me` | Auth | Cập nhật thông tin (display_name, avatar, bio, password) |
| POST | `/auth/forget-password` | Public | Gửi OTP đặt lại mật khẩu qua email |
| POST | `/auth/reset-password` | Public | Xác nhận OTP + đặt mật khẩu mới |
| GET | `/auth/users/{user_id}` | Public | Xem hồ sơ công khai của user |
| GET | `/auth/admin/users` | Admin | Danh sách user (search, filter, pagination) |
| PATCH | `/auth/users/{user_id}/ban` | Admin | Bật/tắt trạng thái ban |
| PATCH | `/auth/users/{user_id}/role` | Admin | Thay đổi role (user ↔ admin) |

---

## Module `/price` — Dữ liệu giá & Tài sản

| Method | Endpoint | Quyền | Mô tả |
|--------|----------|-------|-------|
| GET | `/price/tickers` | Public | Danh sách tài sản đang theo dõi |
| POST | `/price/tickers` | Admin | Thêm ticker mới |
| GET | `/price/tickers/{ticker}` | Public | Thông tin một tài sản |
| PATCH | `/price/tickers/{ticker}` | Admin | Cập nhật thông tin tài sản |
| DELETE | `/price/tickers/{ticker}` | Admin | Xóa tài sản |
| GET | `/price/{ticker}?timeframe=&limit=&start=&end=` | Public | Lịch sử giá OHLCV (có cache Redis) |
| GET | `/price/{ticker}/latest` | Public | Giá gần nhất |
| POST | `/price/fetch` | Auth | Trigger thu thập giá 1m ngay lập tức (202) |
| POST | `/price/backfill` | Admin | Trigger backfill lịch sử (202) |

---

## Module `/portfolio` — Danh mục đầu tư

| Method | Endpoint | Quyền | Mô tả |
|--------|----------|-------|-------|
| GET | `/portfolio` | Auth | Danh sách portfolio của user đang đăng nhập |
| POST | `/portfolio` | Auth | Tạo portfolio mới |
| GET | `/portfolio/{portfolio_id}` | Auth | Chi tiết portfolio (kèm holdings + giá hiện tại) |
| PATCH | `/portfolio/{portfolio_id}` | Auth | Đổi tên / mô tả |
| DELETE | `/portfolio/{portfolio_id}` | Auth | Xóa portfolio (cascade xóa holdings) |
| POST | `/portfolio/{portfolio_id}/holdings` | Auth | Thêm tài sản vào portfolio |
| PATCH | `/portfolio/{portfolio_id}/holdings/{holding_id}` | Auth | Cập nhật số lượng / ghi chú |
| DELETE | `/portfolio/{portfolio_id}/holdings/{holding_id}` | Auth | Xóa tài sản khỏi portfolio |

---

## Module `/watchlist` — Danh sách theo dõi

| Method | Endpoint | Quyền | Mô tả |
|--------|----------|-------|-------|
| GET | `/watchlist` | Auth | Toàn bộ watchlist (kèm giá hiện tại + % thay đổi) |
| POST | `/watchlist` | Auth | Thêm ticker vào watchlist |
| DELETE | `/watchlist/{asset_id}` | Auth | Xóa ticker khỏi watchlist |
| PATCH | `/watchlist/reorder` | Auth | Cập nhật thứ tự hiển thị |

---

## Module `/news` — Tin tức tài chính

| Method | Endpoint | Quyền | Mô tả |
|--------|----------|-------|-------|
| GET | `/news?page=&limit=&category=&ticker=&sentiment=&source=&search=` | Public | Danh sách tin tức (filter + pagination) |
| POST | `/news` | Admin | Tạo thủ công bài báo |
| PUT | `/news/{news_id}` | Admin | Cập nhật bài báo |
| DELETE | `/news/{news_id}` | Admin | Xóa bài báo |
| POST | `/news/fetch` | Admin | Trigger thu thập tin tức từ Massive API ngay lập tức |

---

## Module `/blog` — Blog & Diễn đàn

| Method | Endpoint | Quyền | Mô tả |
|--------|----------|-------|-------|
| GET | `/blog/posts` | Public | Danh sách bài viết |
| POST | `/blog/posts` | Verified | Đăng bài mới |
| GET | `/blog/posts/{post_id}` | Public | Nội dung bài viết |
| DELETE | `/blog/posts/{post_id}` | Owner/Admin | Xóa bài viết |
| GET | `/blog/posts/{post_id}/comments` | Public | Danh sách bình luận |
| POST | `/blog/posts/{post_id}/comments` | Auth | Đăng bình luận (hỗ trợ reply qua `parent_id`) |
| DELETE | `/blog/posts/{post_id}/comments/{comment_id}` | Owner/Admin | Xóa bình luận |

---

## Module `/ai` — AI Chat

| Method | Endpoint | Quyền | Mô tả |
|--------|----------|-------|-------|
| POST | `/ai/chat` | Verified | Gửi tin nhắn, nhận phản hồi qua SSE stream |
| GET | `/ai/conversations` | Auth | Danh sách hội thoại (sắp xếp theo `updated_at` desc) |
| GET | `/ai/conversations/{conversation_id}` | Auth | Nội dung hội thoại + toàn bộ tin nhắn |
| PATCH | `/ai/conversations/{conversation_id}` | Auth | Đổi tên hội thoại |
| DELETE | `/ai/conversations/{conversation_id}` | Auth | Xóa hội thoại |
| POST | `/ai/conversations/{conversation_id}/feedback` | Auth | Đánh giá like/dislike + feedback text |
| GET | `/ai/admin/stats` | Admin | Thống kê tổng hợp feedback AI |

---

## Module `/indicators` — Chỉ báo kỹ thuật

| Method | Endpoint | Quyền | Mô tả |
|--------|----------|-------|-------|
| GET | `/indicators/settings` | Auth | Cấu hình chỉ báo của user (RSI, MACD, SMA, EMA) |
| PUT | `/indicators/settings` | Auth | Lưu cấu hình chỉ báo (JSONB) |
| GET | `/indicators/compute?ticker=&timeframe=&start=&end=` | Auth | Tính toán và trả về giá trị chỉ báo |

---

## Quy ước phân quyền

| Ký hiệu | Điều kiện |
|---------|-----------|
| Public | Không cần token |
| Auth | JWT access token hợp lệ, chưa bị blacklist |
| Verified | Auth + `user.is_verified = true` |
| Admin | Auth + `user.role = "admin"` |
| Owner/Admin | Auth + (là tác giả tài nguyên hoặc `role = "admin"`) |
