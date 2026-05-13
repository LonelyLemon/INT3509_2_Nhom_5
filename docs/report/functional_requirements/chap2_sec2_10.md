# 2.2.10 FR-10: Quản Trị Hệ Thống (Admin)

## Tổng quan

Nhóm chức năng FR-10 cung cấp các quyền và công cụ dành riêng cho quản trị viên để vận hành và kiểm soát toàn bộ hệ thống. Quản trị viên mặc định được khởi tạo tự động khi ứng dụng khởi động lần đầu dựa trên biến môi trường `ADMIN_EMAIL` và `ADMIN_PASSWORD`. Các endpoint admin được bảo vệ bởi middleware kiểm tra `role = admin`.

---

## FR-10.1: Quản lý người dùng

| Thao tác | Mô tả | Endpoint |
|---------|-------|---------|
| Xem danh sách | Phân trang, tìm kiếm theo từ khóa, lọc theo role/ban status | `GET /auth/admin/users` |
| Thay đổi vai trò | Promote lên admin hoặc demote về user | `PATCH /auth/users/{id}/role` |
| Khoá / mở khoá | Ban hoặc unban tài khoản | `PATCH /auth/users/{id}/ban` |

## FR-10.2: Kiểm duyệt nội dung cộng đồng

Quản trị viên có thể xoá bất kỳ bài viết hoặc bình luận nào trên toàn hệ thống thông qua các endpoint blog hiện có (xác định quyền admin ở tầng middleware).

## FR-10.3: Quản lý tài sản và dữ liệu giá

| Thao tác | Mô tả |
|---------|-------|
| Thêm ticker mới | Thêm mã tài sản với tên, loại (STOCK/ETF/CRYPTO) |
| Cập nhật ticker | Sửa thông tin, bật/tắt hoạt động (`is_active`) |
| Xoá ticker | Xoá tài sản và toàn bộ dữ liệu giá liên quan |
| Trigger thu thập giá 1m | Kích hoạt thủ công tác vụ Celery thu thập giá 1 phút |
| Trigger backfill lịch sử | Kích hoạt thủ công tác vụ thu thập dữ liệu lịch sử |

## FR-10.4: Quản lý tin tức

| Thao tác | Mô tả |
|---------|-------|
| Tạo bài viết tin tức | Nhập thủ công, hệ thống tự tính điểm tâm lý |
| Cập nhật bài viết | Sửa tiêu đề, tóm tắt, nhãn tâm lý, danh sách ticker liên quan |
| Xoá bài viết | Xoá bài không phù hợp |
| Trigger thu thập tin tức | Kích hoạt thủ công Celery task thu thập tin tức toàn bộ tài sản |

## FR-10.5: Theo dõi chất lượng AI

Quản trị viên xem tổng hợp phản hồi đánh giá chất lượng AI từ người dùng qua endpoint `GET /ai/admin/stats`, trả về:

```json
{
  "total_rated": 142,
  "like_count": 118,
  "dislike_count": 24,
  "like_percentage": 83.1,
  "recent_feedback": [
    {
      "conversation_id": "...",
      "rating": "like",
      "feedback_text": "Phân tích rất chi tiết và dễ hiểu",
      "rated_at": "2025-05-12T10:30:00Z"
    }
  ]
}
```

---

## Phạm vi không triển khai

| Tính năng dự kiến | Trạng thái |
|-------------------|-----------|
| Xác minh email thủ công cho người dùng | Không triển khai |
| Hệ thống báo cáo nội dung (flagging) | Không triển khai |
| Bảng theo dõi hệ thống thời gian thực (active sessions, token cost) | Không triển khai |
| Quản lý lịch kinh tế | Không triển khai (không có module calendar) |
