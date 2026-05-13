# 2.2.2 FR-2: Bảng Điều Khiển Dữ Liệu Tài Chính

## Tổng quan

Nhóm chức năng FR-2 cung cấp giao diện trung tâm để người dùng xem dữ liệu giá tài chính, phân tích biểu đồ nến tương tác và tra cứu thông tin tài sản. Dữ liệu được thu thập tự động theo lịch và phục vụ qua API, hỗ trợ nhiều khung thời gian và cho phép người dùng tuỳ chỉnh các chỉ báo kỹ thuật hiển thị trên biểu đồ.

---

## FR-2.1: Hiển thị dữ liệu giá

Hệ thống hiển thị dữ liệu giá cho ba loại tài sản: cổ phiếu (STOCK), quỹ hoán đổi danh mục (ETF) và tiền mã hóa (CRYPTO). Mỗi tài sản hiển thị giá hiện tại, mức thay đổi giá và tỷ lệ thay đổi so với phiên trước. Giá được lấy qua REST API và cập nhật khi người dùng tải lại trang hoặc chọn tài sản mới — hệ thống không sử dụng WebSocket để đẩy dữ liệu liên tục.

Tập tài sản được hỗ trợ bao gồm 18 mã được khởi tạo sẵn trong hệ thống:

| Loại | Mã tài sản |
|------|-----------|
| Cổ phiếu | AAPL, MSFT, GOOGL, AMZN, NVDA, TSLA, META, NFLX, JPM, V |
| ETF | SPY, QQQ, IWM, GLD |
| Crypto | BTC-USD, ETH-USD, BNB-USD |
| ETF VN | VNM |

Quản trị viên có thể bổ sung thêm mã tài sản mới thông qua giao diện quản trị.

## FR-2.2: Biểu đồ nến tương tác (OHLCV)

Người dùng xem biểu đồ nến (candlestick) thể hiện đầy đủ bốn giá Open, High, Low, Close và khối lượng giao dịch (Volume) cho bất kỳ tài sản nào. Biểu đồ hỗ trợ bảy khung thời gian:

| Khung thời gian | Nguồn dữ liệu | Chiều sâu tối đa |
|----------------|---------------|-----------------|
| 1 phút (1m) | Lưu trực tiếp | 7 ngày |
| 5 phút (5m) | Lưu trực tiếp | 60 ngày |
| 15 phút (15m) | Lưu trực tiếp | 60 ngày |
| 30 phút (30m) | Lưu trực tiếp | 60 ngày |
| 1 giờ (1h) | Lưu trực tiếp | 730 ngày |
| 4 giờ (4h) | Tổng hợp từ 1h qua `time_bucket()` | 730 ngày |
| 1 ngày (1d) | Tổng hợp từ 1h qua `time_bucket()` | 730 ngày |

Biểu đồ hỗ trợ thu phóng (zoom), kéo ngang (pan) và hiển thị crosshair để xem giá tại từng nến cụ thể. Dữ liệu biểu đồ được cache trong Redis với TTL tương ứng theo khung thời gian (45 giây cho 1m, lên đến 23 giờ cho 1d) để giảm tải truy vấn cơ sở dữ liệu.

## FR-2.3: Chỉ báo kỹ thuật (Technical Indicators)

Người dùng có thể bật/tắt và tuỳ chỉnh các chỉ báo kỹ thuật hiển thị chồng lên biểu đồ. Hệ thống hỗ trợ năm nhóm chỉ báo:

| Chỉ báo | Tham số mặc định | Mô tả |
|---------|-----------------|-------|
| RSI | period = 14 | Đo lường đà tăng/giảm, ngưỡng quá mua ≥ 70, quá bán ≤ 30 |
| MACD | fast=12, slow=26, signal=9 | Xác định xu hướng qua đường cắt |
| SMA | periods = [20, 50] | Đường trung bình động đơn giản |
| EMA | periods = [9, 21] | Đường trung bình động hàm mũ |
| Bollinger Bands | period=20, std=2 | Dải biến động giá |

Cấu hình tham số chỉ báo được lưu theo từng người dùng trong cơ sở dữ liệu và áp dụng đồng nhất cho cả biểu đồ lẫn phân tích từ AI.

## FR-2.4: Tìm kiếm tài sản

Người dùng tìm kiếm tài sản theo mã (ticker symbol) hoặc tên. Kết quả tìm kiếm có thể lọc thêm theo loại tài sản (STOCK, ETF, CRYPTO). Chọn một kết quả sẽ điều hướng đến trang biểu đồ và thông tin chi tiết của tài sản đó.

## FR-2.5: Trang thông tin chi tiết tài sản

Mỗi tài sản có trang chi tiết riêng hiển thị: biểu đồ nến đầy đủ với các chỉ báo kỹ thuật, thống kê giá chính (giá hiện tại, thay đổi, khối lượng), và các tin tức tài chính gần nhất liên quan đến mã tài sản đó.

## FR-2.6: Bố cục bảng điều khiển linh hoạt

Bảng điều khiển được chia thành các khối chức năng độc lập (biểu đồ, watchlist, AI chat, tin tức). Người dùng có thể kéo thả để sắp xếp lại các khối theo ý muốn. Cấu hình bố cục được lưu trên client; hệ thống không lưu cấu hình bố cục phía server.
