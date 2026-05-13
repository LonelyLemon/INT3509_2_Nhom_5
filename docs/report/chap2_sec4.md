# 2.4 Sơ Đồ Use Case Tổng Quan

## Các tác nhân (Actors)

Hệ thống MarketMind xác định bốn tác nhân chính, được tổ chức theo cấp độ quyền truy cập tăng dần:

| Tác nhân | Mô tả | Điều kiện |
|---------|-------|-----------|
| **Khách** (Guest) | Người dùng chưa đăng nhập | Truy cập tự do |
| **Người dùng** (User) | Đã đăng nhập, chưa xác minh email | Có tài khoản, chưa nhấn link xác minh |
| **Người dùng đã xác minh** (Verified User) | Đã đăng nhập và xác minh email | Mở khóa đầy đủ tính năng |
| **Quản trị viên** (Admin) | Người dùng có `role = admin` | Được cấp quyền bởi admin khác |

Quan hệ kế thừa giữa các tác nhân:

```
Khách
  └── Người dùng (kế thừa Khách)
        └── Người dùng đã xác minh (kế thừa Người dùng)
              └── Quản trị viên (kế thừa Người dùng đã xác minh)
```

---

## Sơ đồ Use Case tổng quan

```plantuml
@startuml MarketMind_Overall_UseCase
left to right direction
skinparam packageStyle rectangle
skinparam actorStyle awesome

actor "Khách" as Guest
actor "Người dùng" as User
actor "Người dùng\nđã xác minh" as VUser
actor "Quản trị viên" as Admin

User --|> Guest
VUser --|> User
Admin --|> VUser

rectangle "FR-1\nXác thực & Tài khoản" as FR1 {
  (Đăng ký)
  (Đăng nhập)
  (Xác minh email)
  (Đặt lại mật khẩu)
  (Quản lý hồ sơ)
  (Đăng xuất)
  (Xoá tài khoản)
}

rectangle "FR-2\nBảng điều khiển" as FR2 {
  (Xem dữ liệu giá)
  (Xem biểu đồ nến)
  (Xem chỉ báo kỹ thuật)
  (Tìm kiếm tài sản)
}

rectangle "FR-3\nAI Chat" as FR3 {
  (Gửi câu hỏi AI)
  (Xem lịch sử hội thoại)
  (Đánh giá hội thoại)
}

rectangle "FR-4\nTin tức" as FR4 {
  (Duyệt tin tức)
  (Lọc và tìm kiếm tin)
}

rectangle "FR-5\nBlog & Diễn đàn" as FR5 {
  (Đọc bài viết)
  (Đăng bài viết)
  (Bình luận)
}

rectangle "FR-6\nPortfolio" as FR6 {
  (Quản lý danh mục)
  (Quản lý tài sản nắm giữ)
}

rectangle "FR-7\nWatchlist" as FR7 {
  (Theo dõi tài sản)
  (Sắp xếp watchlist)
}

rectangle "FR-8\nTuỳ chỉnh" as FR8 {
  (Đổi giao diện)
  (Đổi ngôn ngữ)
  (Cài đặt chỉ báo)
}

rectangle "FR-10\nQuản trị" as FR10 {
  (Quản lý người dùng)
  (Kiểm duyệt nội dung)
  (Quản lý dữ liệu)
  (Theo dõi AI)
}

Guest --> (Đăng ký)
Guest --> (Đăng nhập)
Guest --> (Đặt lại mật khẩu)
Guest --> (Xem dữ liệu giá)
Guest --> (Xem biểu đồ nến)
Guest --> (Xem chỉ báo kỹ thuật)
Guest --> (Tìm kiếm tài sản)
Guest --> (Duyệt tin tức)
Guest --> (Lọc và tìm kiếm tin)
Guest --> (Đọc bài viết)

User --> (Xác minh email)
User --> (Quản lý hồ sơ)
User --> (Đăng xuất)
User --> (Xoá tài khoản)
User --> (Quản lý danh mục)
User --> (Quản lý tài sản nắm giữ)
User --> (Theo dõi tài sản)
User --> (Sắp xếp watchlist)
User --> (Đổi giao diện)
User --> (Đổi ngôn ngữ)
User --> (Cài đặt chỉ báo)

VUser --> (Gửi câu hỏi AI)
VUser --> (Xem lịch sử hội thoại)
VUser --> (Đánh giá hội thoại)
VUser --> (Đăng bài viết)
VUser --> (Bình luận)

Admin --> (Quản lý người dùng)
Admin --> (Kiểm duyệt nội dung)
Admin --> (Quản lý dữ liệu)
Admin --> (Theo dõi AI)

@enduml
```

---

## Ma trận tác nhân – nhóm chức năng

Bảng dưới đây tóm tắt nhóm chức năng nào được truy cập bởi tác nhân nào:

| Nhóm chức năng | Khách | Người dùng | Người dùng đã xác minh | Quản trị viên |
|----------------|:-----:|:----------:|:----------------------:|:-------------:|
| FR-1: Xác thực & Tài khoản | ✅ (một phần) | ✅ | ✅ | ✅ |
| FR-2: Bảng điều khiển & Biểu đồ | ✅ | ✅ | ✅ | ✅ |
| FR-3: AI Chat | — | — | ✅ | ✅ |
| FR-4: Tin tức tài chính | ✅ | ✅ | ✅ | ✅ |
| FR-5: Blog & Diễn đàn (đọc) | ✅ | ✅ | ✅ | ✅ |
| FR-5: Blog & Diễn đàn (viết) | — | — | ✅ | ✅ |
| FR-6: Portfolio | — | ✅ | ✅ | ✅ |
| FR-7: Watchlist | — | ✅ | ✅ | ✅ |
| FR-8: Tuỳ chỉnh cá nhân | — | ✅ | ✅ | ✅ |
| FR-10: Quản trị hệ thống | — | — | — | ✅ |
