# 2.2.6 FR-6: Quản Lý Danh Mục Đầu Tư (Portfolio)

## Tổng quan

Nhóm chức năng FR-6 cho phép người dùng tổ chức và theo dõi các tài sản họ nắm giữ theo từng danh mục đầu tư riêng biệt. Hệ thống tính toán giá trị thị trường hiện tại và tỷ lệ phân bổ tài sản theo thời gian thực dựa trên giá đóng cửa mới nhất trong cơ sở dữ liệu.

---

## FR-6.1: Quản lý danh mục (Portfolio CRUD)

Mỗi người dùng có thể tạo nhiều danh mục đầu tư, mỗi danh mục có tên và mô tả tuỳ chỉnh. Một danh mục được đánh dấu là **mặc định** (default) và hiển thị nổi bật trên bảng điều khiển. Khi người dùng xoá danh mục đang là mặc định, hệ thống tự động chọn danh mục cũ nhất còn lại làm mặc định mới.

| Thao tác | Mô tả |
|---------|-------|
| Tạo danh mục | Nhập tên, mô tả; tuỳ chọn đặt làm mặc định |
| Sửa danh mục | Cập nhật tên, mô tả, trạng thái mặc định |
| Xoá danh mục | Xoá kèm toàn bộ tài sản nắm giữ bên trong |
| Xem danh sách | Trả về tất cả danh mục của người dùng |

## FR-6.2: Quản lý tài sản nắm giữ (Holdings)

Trong mỗi danh mục, người dùng thêm các tài sản nắm giữ bằng cách chọn mã tài sản và nhập số lượng. Mỗi tài sản chỉ được xuất hiện một lần trong cùng một danh mục (ràng buộc unique trên cơ sở dữ liệu). Nếu người dùng thêm một mã tài sản đã tồn tại, hệ thống báo lỗi.

| Trường dữ liệu | Bắt buộc | Mô tả |
|---------------|---------|-------|
| asset (ticker) | Có | Mã tài sản được chọn |
| quantity | Có | Số lượng đang nắm giữ |
| notes | Không | Ghi chú tuỳ chỉnh |

Người dùng có thể cập nhật số lượng hoặc ghi chú của tài sản đã thêm, và xoá tài sản khỏi danh mục.

## FR-6.3: Tóm tắt danh mục và tính toán giá trị

Khi xem chi tiết một danh mục, hệ thống trả về thông tin tổng hợp được tính toán theo thời gian thực:

```
Giá trị hiện tại (holding) = quantity × giá đóng cửa mới nhất
Tỷ lệ phân bổ (%)         = (giá trị holding / tổng giá trị danh mục) × 100
Tổng giá trị danh mục     = Σ (giá trị từng holding)
```

Giá đóng cửa mới nhất được lấy từ bản ghi `price_data` có timestamp gần nhất, không phụ thuộc vào khung thời gian cụ thể.

> **Giới hạn quan trọng:** Hệ thống không lưu trữ giá mua bình quân (average buy price), do đó không thể tính toán lợi nhuận/thua lỗ (P&L). Người dùng chỉ xem được giá trị thị trường hiện tại và tỷ lệ phân bổ.

## FR-6.4: Tích hợp với AI Chat

Analysis Agent có khả năng thực hiện toàn bộ các thao tác quản lý portfolio qua hội thoại ngôn ngữ tự nhiên — bao gồm tạo danh mục mới, thêm tài sản, cập nhật số lượng, xoá tài sản, và xem tóm tắt — thông qua hệ thống công cụ (tool system) được tích hợp sẵn.
