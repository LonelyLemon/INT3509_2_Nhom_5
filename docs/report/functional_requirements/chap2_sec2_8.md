# 2.2.8 FR-8: Tuỳ Chỉnh Người Dùng

## Tổng quan

Nhóm chức năng FR-8 cho phép người dùng cá nhân hóa trải nghiệm sử dụng ứng dụng. Cài đặt giao diện (giao diện tối/sáng, ngôn ngữ) được quản lý ở phía client, trong khi cài đặt chỉ báo kỹ thuật được lưu bền vững trên server để đồng nhất giữa các thiết bị và phiên làm việc.

---

## FR-8.1: Giao diện tối / sáng (Theme)

Người dùng có thể chuyển đổi giữa Light Mode và Dark Mode. Lựa chọn này được lưu ở phía client (localStorage hoặc state management) và áp dụng ngay lập tức cho toàn bộ giao diện. Cài đặt được khôi phục tự động trong các phiên làm việc tiếp theo.

## FR-8.2: Ngôn ngữ hiển thị

Ứng dụng hỗ trợ hai ngôn ngữ: Tiếng Việt (vi) và Tiếng Anh (en). Người dùng chuyển đổi ngôn ngữ từ menu cài đặt; thay đổi được áp dụng toàn cục ngay lập tức thông qua thư viện i18next. Lựa chọn ngôn ngữ được lưu phía client.

## FR-8.3: Cài đặt chỉ báo kỹ thuật

Đây là cài đặt duy nhất trong nhóm FR-8 được lưu trữ phía server. Mỗi người dùng có một bộ cài đặt chỉ báo riêng trong bảng `user_indicator_settings` (kiểu dữ liệu JSONB). Nếu chưa có cài đặt, hệ thống trả về giá trị mặc định:

```json
{
  "RSI":  { "period": 14 },
  "MACD": { "fast": 12, "slow": 26, "signal": 9 },
  "SMA":  { "periods": [20, 50] },
  "EMA":  { "periods": [9, 21] }
}
```

Người dùng cập nhật một phần hoặc toàn bộ cài đặt thông qua `PUT /indicators/settings`. Cài đặt này được áp dụng khi:
- Hiển thị chỉ báo trên biểu đồ nến.
- AI gọi công cụ `calculate_technical_indicators` trong quá trình phân tích.

---

## Phạm vi không triển khai

| Tính năng dự kiến | Trạng thái |
|-------------------|-----------|
| Lưu loại tài sản mặc định (stocks/ETF/crypto) | Không triển khai |
| Lưu bố cục bảng điều khiển phía server | Không triển khai |
| Cài đặt kênh nhận thông báo | Không triển khai (không có hệ thống thông báo) |
