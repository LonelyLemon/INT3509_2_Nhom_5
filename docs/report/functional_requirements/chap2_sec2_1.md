# 2.2.1 FR-1: Xác thực và Quản lý Tài khoản

## Tổng quan

Nhóm chức năng FR-1 bao gồm toàn bộ luồng quản lý vòng đời tài khoản người dùng: từ đăng ký, xác minh email, đăng nhập, quản lý phiên làm việc, cho đến cập nhật hồ sơ và xoá tài khoản. Đây là nền tảng bảo mật của toàn hệ thống, vì nhiều tính năng quan trọng (AI chat, đăng bài) chỉ được phép truy cập khi người dùng đã đăng nhập và xác minh email.

---

## FR-1.1: Đăng ký tài khoản

Người dùng đăng ký bằng địa chỉ email, tên người dùng (username) và mật khẩu. Hệ thống kiểm tra xem email đã tồn tại trong cơ sở dữ liệu hay chưa; nếu đã tồn tại, thông báo lỗi được trả về. Mật khẩu phải đáp ứng yêu cầu độ phức tạp tối thiểu: ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường, chữ số và ký tự đặc biệt. Sau khi đăng ký thành công, hệ thống tạo tài khoản với trạng thái `is_verified = false` và `role = user`, đồng thời gửi email chứa đường dẫn xác minh duy nhất đến địa chỉ email đã đăng ký.

## FR-1.2: Xác minh email

Người dùng nhận được email chứa đường dẫn xác minh có thời hạn. Khi nhấn vào đường dẫn, hệ thống cập nhật trạng thái tài khoản thành `is_verified = true`. Nếu đường dẫn đã hết hạn, người dùng có thể yêu cầu gửi lại email xác minh. Tài khoản chưa xác minh bị giới hạn quyền truy cập vào tính năng AI chat và đăng bài trên diễn đàn.

## FR-1.3: Đăng nhập

Người dùng đăng nhập bằng email và mật khẩu. Khi xác thực thành công, hệ thống cấp một **access token** (thời hạn 30 phút) và một **refresh token** (thời hạn 7 ngày) theo chuẩn JWT. Nếu thông tin đăng nhập sai, hệ thống trả về thông báo lỗi chung mà không tiết lộ email nào đang tồn tại trong hệ thống (ngăn chặn email enumeration). Tài khoản chưa xác minh được thông báo rõ và hướng dẫn gửi lại email xác minh.

## FR-1.4: Quản lý phiên làm việc (Token Management)

| Loại token | Thời hạn | Cơ chế |
|-----------|---------|--------|
| Access token | 30 phút | Gửi kèm mọi request qua header `Authorization: Bearer` |
| Refresh token | 7 ngày | Dùng để lấy access token mới khi hết hạn |

Khi người dùng đăng xuất, access token hiện tại bị đưa vào danh sách đen (blacklist) lưu trong Redis với TTL bằng thời gian còn lại của token, đảm bảo token không thể tái sử dụng dù chưa hết hạn.

## FR-1.5: Quản lý mật khẩu

Người dùng quên mật khẩu có thể yêu cầu đặt lại bằng cách nhập email đã đăng ký. Hệ thống gửi email chứa mã OTP (One-Time Password) có thời hạn. Người dùng sử dụng OTP này để đặt mật khẩu mới thông qua endpoint chuyên biệt. Người dùng đã đăng nhập cũng có thể đổi mật khẩu trực tiếp từ trang cài đặt tài khoản bằng cách cung cấp mật khẩu hiện tại và mật khẩu mới.

## FR-1.6: Quản lý hồ sơ cá nhân

Người dùng có thể xem và chỉnh sửa thông tin hồ sơ bao gồm tên hiển thị (display name), ảnh đại diện (avatar) và tiểu sử (bio). Avatar được tải lên dưới dạng file ảnh (JPEG hoặc PNG, tối đa 2 MB); hệ thống kiểm tra định dạng và kích thước trước khi lưu. Hồ sơ của bất kỳ người dùng nào cũng có thể được xem công khai ở mức thông tin cơ bản (tên hiển thị, avatar, bio) thông qua endpoint riêng biệt.

## FR-1.7: Xoá tài khoản

Người dùng có thể xoá tài khoản của mình vĩnh viễn. Thao tác này yêu cầu xác nhận lại mật khẩu. Khi tài khoản bị xoá, toàn bộ dữ liệu liên quan — bao gồm bài viết, bình luận, lịch sử hội thoại AI, danh mục đầu tư và watchlist — cũng bị xoá theo cơ chế cascade.

## FR-1.8: Quản lý người dùng (Admin)

Quản trị viên có quyền truy cập danh sách toàn bộ người dùng với phân trang, tìm kiếm theo từ khóa, và lọc theo vai trò (admin/user) hoặc trạng thái khoá. Quản trị viên có thể thay đổi vai trò người dùng (promote/demote) và khoá hoặc mở khoá tài khoản (ban/unban).

---

## Sơ đồ luồng xác thực

```
Đăng ký → Gửi email xác minh → Xác minh link
                                      ↓
                              is_verified = true
                                      ↓
Đăng nhập → Xác thực credentials → Cấp JWT (access + refresh)
                                      ↓
                    Mỗi request → Kiểm tra access token
                                      ↓
                    Token hết hạn → Dùng refresh token lấy token mới
                                      ↓
                    Đăng xuất → Blacklist token trong Redis
```
