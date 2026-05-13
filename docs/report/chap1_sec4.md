# 1.4 Tổng quan cấu trúc báo cáo

Báo cáo được tổ chức thành sáu chương nội dung chính, mỗi chương đảm nhiệm một vai trò riêng biệt trong việc trình bày toàn bộ quá trình nghiên cứu và phát triển hệ thống MarketMind.

Chương 1 — Giới thiệu — là chương hiện tại, đặt nền móng cho toàn bộ báo cáo bằng cách trình bày bối cảnh và động lực dẫn đến đề tài, xác định mục tiêu cụ thể cần đạt được, làm rõ phạm vi và các giới hạn đã được xác định từ đầu, và cung cấp tổng quan về cách nội dung được tổ chức xuyên suốt báo cáo.

Chương 2 — Phân tích yêu cầu hệ thống — trình bày kết quả phân tích yêu cầu nghiệp vụ và yêu cầu kỹ thuật của hệ thống. Chương này mô tả chi tiết các yêu cầu chức năng (từ FR-1 đến FR-10) và yêu cầu phi chức năng bao gồm hiệu năng, bảo mật và khả năng mở rộng. Sơ đồ use case tổng quan và chi tiết theo từng nhóm chức năng cũng được trình bày trong chương này.

Chương 3 — Thiết kế hệ thống — đi sâu vào các quyết định kiến trúc và thiết kế. Chương này bao gồm kiến trúc tổng thể phân theo lớp, lý do lựa chọn công nghệ cho từng thành phần, thiết kế cơ sở dữ liệu với sơ đồ ERD và chiến lược tối ưu, thiết kế API RESTful và cơ chế SSE streaming, thiết kế hệ thống AI đa tác nhân từ cơ chế routing đến hệ thống công cụ, và thiết kế pipeline dữ liệu thời gian thực.

Chương 4 — Triển khai hệ thống — trình bày chi tiết quá trình hiện thực hóa các thiết kế từ Chương 3 thành code thực tế. Đây là chương tập trung nhiều nhất vào chiều sâu kỹ thuật, bao gồm cách triển khai từng module backend, từng tác nhân AI và tập công cụ, các thành phần frontend quan trọng, pipeline dữ liệu nền với Celery, và đặc biệt là các bài toán kỹ thuật phát sinh trong quá trình phát triển cùng với giải pháp đã được áp dụng.

Chương 5 — Kiểm thử và Đánh giá chất lượng — trình bày chiến lược kiểm thử toàn diện được áp dụng cho hệ thống, bao gồm kiểm thử đơn vị phía backend và frontend, kiểm thử tích hợp API, kiểm thử hệ thống AI theo các kịch bản thực tế, kiểm thử hiệu năng và bảo mật. Kết quả kiểm thử được tổng hợp và nhận xét khách quan về chất lượng của hệ thống.

Chương 6 — So sánh và Thảo luận — đặt MarketMind trong bức tranh rộng hơn của thị trường bằng cách so sánh có hệ thống với các sản phẩm tương tự như TradingView, CafeF và VNDirect. Chương này phân tích ưu điểm nổi bật, thẳng thắn nhìn nhận các hạn chế còn tồn tại, và đề xuất định hướng phát triển tiếp theo nếu đề tài được mở rộng quy mô.

Phần Kết luận tổng kết các đóng góp chính của đề tài, đánh giá mức độ đạt được mục tiêu đề ra, và nêu những bài học kinh nghiệm rút ra từ quá trình nghiên cứu và phát triển. Phần Tài liệu tham khảo liệt kê toàn bộ nguồn tài liệu được trích dẫn. Phần Phụ lục bổ sung các thông tin kỹ thuật chi tiết như danh sách endpoint API đầy đủ, kịch bản kiểm thử AI, và cấu hình triển khai.
