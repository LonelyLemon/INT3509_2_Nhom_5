# 2.5 Sơ Đồ Use Case Chi Tiết

Phần này trình bày sơ đồ use case chi tiết cho từng nhóm chức năng, thể hiện đầy đủ các ca sử dụng đã được triển khai trong hệ thống.

---

## 2.5.1 FR-1: Xác thực và Quản lý Tài khoản

```plantuml
@startuml FR1_Auth
left to right direction
skinparam actorStyle awesome

actor "Khách" as Guest
actor "Người dùng" as User
actor "Quản trị viên" as Admin

User --|> Guest
Admin --|> User

rectangle "FR-1: Xác thực & Quản lý Tài khoản" {

  package "Đăng ký & Xác minh" {
    (Đăng ký tài khoản) as UC_Register
    (Xác minh email qua link) as UC_Verify
    (Gửi lại email xác minh) as UC_Resend
  }

  package "Đăng nhập & Phiên làm việc" {
    (Đăng nhập bằng email/mật khẩu) as UC_Login
    (Làm mới access token) as UC_Refresh
    (Đăng xuất) as UC_Logout
  }

  package "Quản lý mật khẩu" {
    (Yêu cầu đặt lại mật khẩu) as UC_ForgotPwd
    (Đặt lại mật khẩu bằng OTP) as UC_ResetPwd
    (Đổi mật khẩu khi đăng nhập) as UC_ChangePwd
  }

  package "Hồ sơ & Tài khoản" {
    (Xem hồ sơ cá nhân) as UC_ViewProfile
    (Cập nhật hồ sơ) as UC_UpdateProfile
    (Tải ảnh đại diện) as UC_UploadAvatar
    (Xoá tài khoản) as UC_DeleteAcc
    (Xem hồ sơ công khai người khác) as UC_PublicProfile
  }

  package "Quản trị người dùng" {
    (Xem danh sách người dùng) as UC_ListUsers
    (Tìm kiếm / lọc người dùng) as UC_FilterUsers
    (Thay đổi vai trò người dùng) as UC_ChangeRole
    (Khoá / mở khoá tài khoản) as UC_BanUser
  }
}

Guest --> UC_Register
Guest --> UC_Verify
Guest --> UC_Resend
Guest --> UC_Login
Guest --> UC_ForgotPwd
Guest --> UC_ResetPwd
Guest --> UC_PublicProfile

User --> UC_Refresh
User --> UC_Logout
User --> UC_ChangePwd
User --> UC_ViewProfile
User --> UC_UpdateProfile
User --> UC_UploadAvatar
User --> UC_DeleteAcc

UC_UpdateProfile ..> UC_UploadAvatar : <<include>>

Admin --> UC_ListUsers
Admin --> UC_FilterUsers
Admin --> UC_ChangeRole
Admin --> UC_BanUser

@enduml
```

---

## 2.5.2 FR-2: Bảng Điều Khiển Dữ Liệu Tài Chính

```plantuml
@startuml FR2_Dashboard
left to right direction
skinparam actorStyle awesome

actor "Khách" as Guest
actor "Người dùng" as User

User --|> Guest

rectangle "FR-2: Bảng Điều Khiển Dữ Liệu Tài Chính" {

  package "Khám phá tài sản" {
    (Tìm kiếm tài sản theo mã/tên) as UC_Search
    (Lọc theo loại tài sản) as UC_FilterType
    (Xem trang chi tiết tài sản) as UC_AssetDetail
  }

  package "Biểu đồ & Giá" {
    (Xem giá hiện tại) as UC_Price
    (Xem biểu đồ nến OHLCV) as UC_Chart
    (Chuyển đổi khung thời gian) as UC_Timeframe
    (Phóng to / thu nhỏ biểu đồ) as UC_Zoom
  }

  package "Chỉ báo kỹ thuật" {
    (Bật / tắt chỉ báo kỹ thuật) as UC_ToggleIndicator
    (Xem RSI trên biểu đồ) as UC_RSI
    (Xem MACD trên biểu đồ) as UC_MACD
    (Xem SMA / EMA trên biểu đồ) as UC_MA
    (Xem Bollinger Bands trên biểu đồ) as UC_BB
  }

  package "Bố cục bảng điều khiển" {
    (Sắp xếp lại các panel) as UC_Layout
  }
}

Guest --> UC_Search
Guest --> UC_FilterType
Guest --> UC_AssetDetail
Guest --> UC_Price
Guest --> UC_Chart
Guest --> UC_Timeframe
Guest --> UC_Zoom
Guest --> UC_ToggleIndicator
Guest --> UC_RSI
Guest --> UC_MACD
Guest --> UC_MA
Guest --> UC_BB

User --> UC_Layout

UC_Chart ..> UC_Timeframe : <<include>>
UC_ToggleIndicator ..> UC_RSI : <<extend>>
UC_ToggleIndicator ..> UC_MACD : <<extend>>
UC_ToggleIndicator ..> UC_MA : <<extend>>
UC_ToggleIndicator ..> UC_BB : <<extend>>
UC_AssetDetail ..> UC_Chart : <<include>>

@enduml
```

---

## 2.5.3 FR-3: Giao Diện AI Chat

```plantuml
@startuml FR3_AIChat
left to right direction
skinparam actorStyle awesome

actor "Người dùng\nđã xác minh" as VUser
actor "Quản trị viên" as Admin

Admin --|> VUser

rectangle "FR-3: Giao Diện AI Chat" {

  package "Tương tác hội thoại" {
    (Gửi câu hỏi bằng ngôn ngữ tự nhiên) as UC_Send
    (Nhận phản hồi streaming (SSE)) as UC_Stream
    (Sử dụng nút Quick Action) as UC_QuickAction
    (Xem trạng thái routing intent) as UC_Routing
    (Xem công cụ AI đang thực thi) as UC_ToolVis
  }

  package "Quản lý hội thoại" {
    (Tạo hội thoại mới) as UC_NewConv
    (Xem danh sách hội thoại) as UC_ListConv
    (Xem lịch sử tin nhắn) as UC_History
    (Đổi tên hội thoại) as UC_Rename
    (Xoá hội thoại) as UC_Delete
  }

  package "Phản hồi chất lượng" {
    (Đánh giá hội thoại Like/Dislike) as UC_Rate
    (Gửi nhận xét văn bản) as UC_Feedback
  }

  package "Quản trị AI" {
    (Xem thống kê phản hồi AI) as UC_AdminStats
  }
}

VUser --> UC_Send
VUser --> UC_Stream
VUser --> UC_QuickAction
VUser --> UC_Routing
VUser --> UC_ToolVis
VUser --> UC_NewConv
VUser --> UC_ListConv
VUser --> UC_History
VUser --> UC_Rename
VUser --> UC_Delete
VUser --> UC_Rate
VUser --> UC_Feedback

Admin --> UC_AdminStats

UC_Send ..> UC_Stream : <<include>>
UC_Send ..> UC_Routing : <<include>>
UC_Rate ..> UC_Feedback : <<extend>>

@enduml
```

---

## 2.5.4 FR-4: Trang Tin Tức Tài Chính

```plantuml
@startuml FR4_News
left to right direction
skinparam actorStyle awesome

actor "Khách" as Guest
actor "Quản trị viên" as Admin

rectangle "FR-4: Trang Tin Tức Tài Chính" {

  package "Đọc tin tức" {
    (Xem danh sách tin tức) as UC_Feed
    (Lọc theo loại tài sản) as UC_FilterCat
    (Lọc theo tâm lý) as UC_FilterSentiment
    (Lọc theo khoảng thời gian) as UC_FilterDate
    (Lọc theo mã tài sản) as UC_FilterTicker
    (Lọc theo nguồn phát hành) as UC_FilterSource
    (Tìm kiếm theo từ khóa) as UC_Search
    (Xem chi tiết bài viết) as UC_Detail
  }

  package "Quản trị tin tức" {
    (Tạo bài viết tin tức thủ công) as UC_Create
    (Cập nhật bài viết) as UC_Update
    (Xoá bài viết) as UC_DeleteNews
    (Kích hoạt thu thập tin tức) as UC_Trigger
  }
}

Guest --> UC_Feed
Guest --> UC_FilterCat
Guest --> UC_FilterSentiment
Guest --> UC_FilterDate
Guest --> UC_FilterTicker
Guest --> UC_FilterSource
Guest --> UC_Search
Guest --> UC_Detail

Admin --> UC_Create
Admin --> UC_Update
Admin --> UC_DeleteNews
Admin --> UC_Trigger

UC_Feed ..> UC_FilterCat : <<extend>>
UC_Feed ..> UC_FilterSentiment : <<extend>>
UC_Feed ..> UC_FilterDate : <<extend>>
UC_Feed ..> UC_Search : <<extend>>

@enduml
```

---

## 2.5.5 FR-5: Blog và Diễn Đàn Cộng Đồng

```plantuml
@startuml FR5_Blog
left to right direction
skinparam actorStyle awesome

actor "Khách" as Guest
actor "Người dùng\nđã xác minh" as VUser
actor "Quản trị viên" as Admin

VUser --|> Guest
Admin --|> VUser

rectangle "FR-5: Blog & Diễn Đàn Cộng Đồng" {

  package "Duyệt bài viết" {
    (Xem danh sách bài viết) as UC_List
    (Xem chi tiết bài viết) as UC_Read
  }

  package "Tạo nội dung" {
    (Đăng bài viết mới) as UC_Post
    (Xoá bài viết của mình) as UC_DeleteOwn
    (Bình luận bài viết) as UC_Comment
    (Trả lời bình luận khác) as UC_Reply
    (Xoá bình luận của mình) as UC_DeleteComment
  }

  package "Kiểm duyệt nội dung" {
    (Xoá bất kỳ bài viết) as UC_AdminDelPost
    (Xoá bất kỳ bình luận) as UC_AdminDelComment
  }
}

Guest --> UC_List
Guest --> UC_Read

VUser --> UC_Post
VUser --> UC_DeleteOwn
VUser --> UC_Comment
VUser --> UC_Reply
VUser --> UC_DeleteComment

Admin --> UC_AdminDelPost
Admin --> UC_AdminDelComment

UC_Reply ..> UC_Comment : <<extend>>

@enduml
```

---

## 2.5.6 FR-6: Quản Lý Danh Mục Đầu Tư (Portfolio)

```plantuml
@startuml FR6_Portfolio
left to right direction
skinparam actorStyle awesome

actor "Người dùng" as User

rectangle "FR-6: Quản Lý Danh Mục Đầu Tư" {

  package "Quản lý danh mục" {
    (Xem danh sách danh mục) as UC_ListPort
    (Tạo danh mục mới) as UC_CreatePort
    (Cập nhật tên / mô tả danh mục) as UC_EditPort
    (Đặt danh mục làm mặc định) as UC_SetDefault
    (Xoá danh mục) as UC_DeletePort
    (Xem tóm tắt và giá trị danh mục) as UC_Summary
  }

  package "Quản lý tài sản nắm giữ" {
    (Thêm tài sản vào danh mục) as UC_AddHolding
    (Cập nhật số lượng / ghi chú) as UC_EditHolding
    (Xoá tài sản khỏi danh mục) as UC_RemoveHolding
  }
}

User --> UC_ListPort
User --> UC_CreatePort
User --> UC_EditPort
User --> UC_SetDefault
User --> UC_DeletePort
User --> UC_Summary
User --> UC_AddHolding
User --> UC_EditHolding
User --> UC_RemoveHolding

UC_Summary ..> UC_AddHolding : <<include>>
UC_EditPort ..> UC_SetDefault : <<extend>>

@enduml
```

---

## 2.5.7 FR-7: Danh Sách Theo Dõi (Watchlist)

```plantuml
@startuml FR7_Watchlist
left to right direction
skinparam actorStyle awesome

actor "Người dùng" as User

rectangle "FR-7: Danh Sách Theo Dõi (Watchlist)" {

  (Xem watchlist với giá hiện tại) as UC_View
  (Thêm tài sản vào watchlist) as UC_Add
  (Xoá tài sản khỏi watchlist) as UC_Remove
  (Sắp xếp lại thứ tự watchlist) as UC_Reorder
  (Điều hướng đến biểu đồ tài sản) as UC_Navigate
}

User --> UC_View
User --> UC_Add
User --> UC_Remove
User --> UC_Reorder
User --> UC_Navigate

UC_View ..> UC_Navigate : <<extend>>

@enduml
```

---

## 2.5.8 FR-8: Tuỳ Chỉnh Người Dùng

```plantuml
@startuml FR8_Preferences
left to right direction
skinparam actorStyle awesome

actor "Người dùng" as User

rectangle "FR-8: Tuỳ Chỉnh Người Dùng" {

  package "Giao diện (Client-side)" {
    (Chuyển đổi giao diện tối/sáng) as UC_Theme
    (Chuyển đổi ngôn ngữ EN/VI) as UC_Lang
  }

  package "Chỉ báo kỹ thuật (Server-side)" {
    (Xem cài đặt chỉ báo hiện tại) as UC_GetSettings
    (Cập nhật chu kỳ RSI) as UC_RSI
    (Cập nhật tham số MACD) as UC_MACD
    (Cập nhật chu kỳ SMA) as UC_SMA
    (Cập nhật chu kỳ EMA) as UC_EMA
  }
}

User --> UC_Theme
User --> UC_Lang
User --> UC_GetSettings
User --> UC_RSI
User --> UC_MACD
User --> UC_SMA
User --> UC_EMA

UC_RSI ..> UC_GetSettings : <<include>>
UC_MACD ..> UC_GetSettings : <<include>>
UC_SMA ..> UC_GetSettings : <<include>>
UC_EMA ..> UC_GetSettings : <<include>>

@enduml
```

---

## 2.5.9 FR-9: Xử Lý Lỗi và Dự Phòng

Nhóm FR-9 chủ yếu là hành vi của hệ thống (system behavior) chứ không phải ca sử dụng tương tác trực tiếp của người dùng. Các tình huống dự phòng được kích hoạt tự động khi phát sinh sự cố:

| Tình huống | Hành vi hệ thống | Trải nghiệm người dùng |
|-----------|-----------------|----------------------|
| API giá bên ngoài không khả dụng | Phục vụ từ Redis cache | Xem dữ liệu cũ, không bị lỗi |
| Gemini API lỗi giữa chừng | Phát SSE event `error`, rollback DB | Hiển thị thông báo lỗi, có thể thử lại |
| Celery task thất bại | Retry với exponential backoff (3 lần) | Không ảnh hưởng trực tiếp |
| Đầu vào không hợp lệ (Pydantic) | Trả về HTTP 422 với chi tiết lỗi theo trường | Nhận thông báo lỗi cụ thể |
| Token hết hạn | Trả về HTTP 401 | Frontend tự động làm mới token |
| Vượt giới hạn AI (20 req/60s) | Trả về HTTP 429 | Thông báo giới hạn và thời gian chờ |

---

## 2.5.10 FR-10: Quản Trị Hệ Thống

```plantuml
@startuml FR10_Admin
left to right direction
skinparam actorStyle awesome

actor "Quản trị viên" as Admin

rectangle "FR-10: Quản Trị Hệ Thống" {

  package "Quản lý người dùng" {
    (Xem & tìm kiếm danh sách người dùng) as UC_Users
    (Thay đổi vai trò người dùng) as UC_Role
    (Khoá / mở khoá tài khoản) as UC_Ban
  }

  package "Kiểm duyệt nội dung" {
    (Xoá bài viết vi phạm) as UC_DelPost
    (Xoá bình luận vi phạm) as UC_DelComment
  }

  package "Quản lý tài sản & Dữ liệu giá" {
    (Thêm mã tài sản mới) as UC_AddTicker
    (Cập nhật thông tin tài sản) as UC_EditTicker
    (Xoá tài sản) as UC_DelTicker
    (Trigger thu thập giá 1 phút) as UC_Trigger1m
    (Trigger backfill dữ liệu lịch sử) as UC_TriggerHist
  }

  package "Quản lý tin tức" {
    (Tạo bài viết tin tức thủ công) as UC_CreateNews
    (Cập nhật bài viết tin tức) as UC_EditNews
    (Xoá bài viết tin tức) as UC_DelNews
    (Trigger thu thập tin tức) as UC_TriggerNews
  }

  package "Theo dõi chất lượng AI" {
    (Xem thống kê đánh giá AI) as UC_AIStats
    (Xem danh sách phản hồi gần đây) as UC_AIFeedback
  }
}

Admin --> UC_Users
Admin --> UC_Role
Admin --> UC_Ban

Admin --> UC_DelPost
Admin --> UC_DelComment

Admin --> UC_AddTicker
Admin --> UC_EditTicker
Admin --> UC_DelTicker
Admin --> UC_Trigger1m
Admin --> UC_TriggerHist

Admin --> UC_CreateNews
Admin --> UC_EditNews
Admin --> UC_DelNews
Admin --> UC_TriggerNews

Admin --> UC_AIStats
Admin --> UC_AIFeedback

UC_AIFeedback ..> UC_AIStats : <<include>>

@enduml
```

---

## Tổng hợp số lượng Use Case theo nhóm

| Nhóm chức năng | Số Use Case | Actors chính |
|----------------|:-----------:|-------------|
| FR-1: Xác thực & Tài khoản | 18 | Khách, Người dùng, Admin |
| FR-2: Bảng điều khiển | 11 | Khách, Người dùng |
| FR-3: AI Chat | 12 | Người dùng đã xác minh, Admin |
| FR-4: Tin tức | 8 | Khách, Admin |
| FR-5: Blog & Diễn đàn | 7 | Khách, Người dùng đã xác minh, Admin |
| FR-6: Portfolio | 9 | Người dùng |
| FR-7: Watchlist | 5 | Người dùng |
| FR-8: Tuỳ chỉnh | 7 | Người dùng |
| FR-9: Xử lý lỗi | Hành vi hệ thống | — |
| FR-10: Quản trị | 14 | Quản trị viên |
| **Tổng** | **91** | |
