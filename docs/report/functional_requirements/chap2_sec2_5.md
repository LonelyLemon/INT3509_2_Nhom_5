# 2.2.5 FR-5: Diễn Đàn và Blog Cộng Đồng

## Tổng quan

Nhóm chức năng FR-5 cung cấp không gian để người dùng đã xác minh email có thể đăng tải và trao đổi các bài phân tích thị trường. Hệ thống hỗ trợ tạo bài viết, bình luận có phân cấp (threaded comments) và duyệt nội dung bởi quản trị viên.

---

## FR-5.1: Tạo bài viết

Người dùng đã xác minh email có thể tạo bài viết mới với tiêu đề và nội dung văn bản tự do. Tất cả bài viết được xuất bản ngay sau khi tạo (không có trạng thái nháp). Người dùng chỉ có thể xoá bài viết của chính mình; không có tính năng chỉnh sửa bài viết sau khi đăng.

## FR-5.2: Duyệt danh sách bài viết

Người dùng xem danh sách toàn bộ bài viết đã được xuất bản, sắp xếp theo thời gian tạo (mới nhất trước). Mỗi mục trong danh sách hiển thị: tiêu đề, thông tin tác giả (tên hiển thị và avatar), đoạn trích nội dung, và thời gian đăng.

## FR-5.3: Đọc chi tiết bài viết

Người dùng có thể đọc toàn bộ nội dung bài viết cùng thông tin tác giả.

## FR-5.4: Bình luận và phản hồi (Threaded Comments)

Người dùng đã đăng nhập có thể đăng bình luận trên bài viết. Hệ thống hỗ trợ một cấp phân nhánh: người dùng có thể trả lời một bình luận cấp cao nhất bằng cách cung cấp `parent_id` của bình luận đó. Hệ thống kiểm tra `parent_id` phải thuộc cùng bài viết trước khi cho phép. Người dùng chỉ có thể xoá bình luận của chính mình; không có tính năng chỉnh sửa bình luận.

```
Bài viết
├── Bình luận A (cấp 1)
│   ├── Trả lời A1 (cấp 2, parent_id = A)
│   └── Trả lời A2 (cấp 2, parent_id = A)
└── Bình luận B (cấp 1)
    └── Trả lời B1 (cấp 2, parent_id = B)
```

API trả về danh sách phẳng (flat list) kèm `parent_id`, phía client chịu trách nhiệm xây dựng cây phân cấp để hiển thị.

## FR-5.5: Kiểm duyệt nội dung (Admin)

Quản trị viên có quyền xoá bất kỳ bài viết hoặc bình luận nào trên toàn hệ thống, bất kể tác giả là ai.

---

## Phạm vi không triển khai

| Tính năng dự kiến | Trạng thái |
|-------------------|-----------|
| Lưu bài viết dưới dạng nháp | Không triển khai |
| Chỉnh sửa bài viết sau khi đăng | Không triển khai |
| Đánh giá sao (1–5) cho bài viết | Không triển khai |
| Gắn thẻ (tags) cho bài viết | Không triển khai |
| Đếm lượt xem bài viết | Không triển khai |
| Nhập nội dung từ file PDF | Không triển khai |
