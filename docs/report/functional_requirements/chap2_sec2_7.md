# 2.2.7 FR-7: Danh Sách Theo Dõi (Watchlist)

## Tổng quan

Nhóm chức năng FR-7 cung cấp cho mỗi người dùng một danh sách theo dõi cá nhân để quan sát nhanh giá và biến động của các tài sản quan tâm. Thứ tự trong danh sách do người dùng tự sắp xếp và được lưu bền vững phía server.

---

## FR-7.1: Quản lý watchlist

Người dùng có thể thêm bất kỳ tài sản đang hoạt động nào vào watchlist bằng cách cung cấp mã tài sản. Nếu tài sản đã tồn tại trong watchlist, yêu cầu được xử lý im lặng (không báo lỗi, trả về bản ghi đã có). Mỗi tài sản chỉ xuất hiện một lần trong watchlist của một người dùng (ràng buộc unique trên cặp `user_id + asset_id`). Người dùng có thể xoá bất kỳ tài sản nào khỏi watchlist.

## FR-7.2: Sắp xếp thứ tự (Drag-and-drop)

Mỗi mục trong watchlist có trường `position` (số nguyên) xác định thứ tự hiển thị. Người dùng sắp xếp lại thứ tự thông qua thao tác kéo thả trên giao diện; vị trí mới được gửi đến backend và lưu vào cơ sở dữ liệu thông qua endpoint `PATCH /watchlist/reorder`. Thứ tự này được khôi phục khi người dùng đăng nhập lại.

## FR-7.3: Hiển thị thông tin giá

Mỗi tài sản trong watchlist hiển thị:

| Trường | Nguồn tính toán |
|-------|----------------|
| Mã tài sản (ticker) | Bảng `assets` |
| Tên đầy đủ (name) | Bảng `assets` |
| Giá hiện tại | Giá đóng cửa từ bản ghi 1d gần nhất |
| Mức thay đổi giá (±) | Hiệu giữa hai bản ghi 1d gần nhất |
| Tỷ lệ thay đổi (%) | (Mức thay đổi / Giá phiên trước) × 100 |

Dữ liệu giá được lấy theo khung thời gian 1 ngày (1d) để đảm bảo tính nhất quán khi hiển thị biến động hàng ngày.

## FR-7.4: Điều hướng từ watchlist

Nhấn vào một tài sản trong watchlist sẽ điều hướng đến trang biểu đồ chi tiết của tài sản đó trên bảng điều khiển.

## FR-7.5: Tích hợp với AI Chat

Analysis Agent có thể đọc danh sách watchlist hiện tại của người dùng thông qua công cụ `get_watchlist`, cũng như thêm (`add_to_watchlist`) hoặc xoá (`remove_from_watchlist`) tài sản khỏi watchlist theo yêu cầu trong hội thoại.
