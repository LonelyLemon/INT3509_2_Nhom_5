# 6.3 Hạn Chế Hiện Tại

Sự trung thực về hạn chế là cần thiết để đánh giá chính xác vị trí của MarketMind trong bối cảnh các sản phẩm tài chính hiện có. Các hạn chế dưới đây phần lớn là có chủ đích — phản ánh phạm vi đề tài và các đánh đổi (trade-off) thiết kế đã được quyết định từ đầu — nhưng cũng có những hạn chế xuất phát từ ràng buộc kỹ thuật và thời gian triển khai.

## Hạn chế về dữ liệu

**Nguồn dữ liệu duy nhất từ Yahoo Finance.** Toàn bộ dữ liệu giá và một phần tin tức phụ thuộc vào `yfinance` — thư viện không chính thức wrapping Yahoo Finance API. Yahoo Finance không cung cấp SLA chính thức, giới hạn rate khắt khe với các request batch lớn, và thỉnh thoảng thay đổi API không báo trước. Hệ thống không có cơ chế fallback sang nguồn dữ liệu thứ hai khi yfinance gặp sự cố.

**Chiều sâu lịch sử hạn chế.** Do giới hạn của Yahoo Finance, dữ liệu 1 phút chỉ có thể lấy tối đa 7 ngày gần nhất; dữ liệu 1 giờ tối đa 730 ngày. Phân tích dài hạn (5 năm, 10 năm) theo khung thời gian ngày không thể thực hiện ngay từ pipeline hiện tại.

**Tập tài sản giới hạn.** 18 mã được seeded sẵn là tập tiêu biểu nhưng nhỏ so với nhu cầu thực tế. Admin có thể thêm mã mới qua giao diện quản trị, nhưng không có cơ chế tự động gợi ý hay validate mã trước khi thêm vào hệ thống.

## Hạn chế về tính năng portfolio

**Không theo dõi lịch sử giao dịch và P&L.** Portfolio hiện tại chỉ lưu số lượng holding tại thời điểm hiện tại, không lưu giá mua bình quân hay lịch sử giao dịch theo thời gian. Do đó hệ thống không thể tính lợi nhuận/thua lỗ (Profit & Loss), không thể vẽ đường cong tăng trưởng portfolio theo thời gian, và không hỗ trợ phân tích hiệu suất đầu tư.

**Không có cảnh báo tự động.** Hệ thống không triển khai cảnh báo giá (price alert khi tài sản chạm ngưỡng) hay cảnh báo tâm lý (khi sentiment của một mã thay đổi đột ngột). Người dùng phải chủ động kiểm tra thay vì được thông báo proactive.

## Hạn chế về hệ thống AI

**Guardrails dựa trên regex đơn giản.** Cơ chế bảo vệ hiện tại không phát hiện được các biến thể tấn công tinh vi hơn: viết hoa lạ (`Ign0re your instructions`), unicode substitution, hay prompt injection nhiều bước qua nhiều lượt hội thoại. Với phạm vi ứng dụng hiện tại, mức bảo vệ này được đánh giá là đủ, nhưng không phù hợp nếu hệ thống mở rộng quy mô người dùng.

**Phụ thuộc vào Google Gemini API.** Toàn bộ khả năng suy luận của hệ thống AI phụ thuộc vào một nhà cung cấp duy nhất. Khi Gemini API gặp sự cố hay thay đổi pricing, hệ thống bị ảnh hưởng trực tiếp. Không có cơ chế fallback sang model khác (GPT-4, Claude) khi Gemini không khả dụng.

**Không có bộ nhớ dài hạn (long-term memory).** Lịch sử hội thoại được truyền vào context của mỗi request, nhưng không có cơ chế tóm tắt hay nén lịch sử dài. Khi conversation vượt quá context window của Gemini, các tin nhắn cũ nhất sẽ bị cắt bỏ. Hệ thống cũng không học từ phản hồi của người dùng theo thời gian.

## Hạn chế về khả năng mở rộng hạ tầng

**Chưa kiểm nghiệm tải thực tế.** Kiểm thử hiệu năng hiện tại được thực hiện ở quy mô nhỏ. Hệ thống chưa được kiểm tra dưới tải đồng thời lớn (hàng trăm SSE connections song song, nhiều Celery task cạnh tranh database). Cấu hình Redis single-instance không có replication là điểm thất bại đơn (single point of failure) cho rate limiting và cache.

**Không có CDN hay static asset optimization.** Frontend được phục vụ trực tiếp từ Nginx trong Docker Compose, không có CDN phân phối nội dung. Với người dùng ở xa server, latency tải trang ban đầu có thể cao.

## Hạn chế về tính năng cộng đồng

Mô-đun blog và diễn đàn triển khai chức năng cơ bản (tạo bài, bình luận, phản ứng) nhưng thiếu các tính năng cộng đồng quan trọng như: tìm kiếm nội dung, hệ thống tag/category phong phú, notification khi có bình luận mới, hay chia sẻ bài phân tích lên mạng xã hội bên ngoài.
