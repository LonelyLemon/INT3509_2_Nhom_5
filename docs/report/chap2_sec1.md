# 2.1 Yêu cầu nghiệp vụ

## Bối cảnh nghiệp vụ

MarketMind được xây dựng để đáp ứng nhu cầu của nhà đầu tư cá nhân trong việc tiếp cận dữ liệu thị trường tài chính, phân tích kỹ thuật và nhận tư vấn đầu tư có hỗ trợ từ trí tuệ nhân tạo — tất cả trong một nền tảng duy nhất. Hệ thống phải đảm bảo rằng các dữ liệu được cung cấp là kịp thời, các phân tích từ AI có căn cứ từ dữ liệu thực, và trải nghiệm người dùng đủ trực quan để không đòi hỏi kiến thức kỹ thuật chuyên sâu.

## Các yêu cầu nghiệp vụ cốt lõi

### YN-1: Cung cấp dữ liệu thị trường tài chính theo thời gian thực

Hệ thống phải tự động thu thập, lưu trữ và cập nhật dữ liệu giá OHLCV (Open, High, Low, Close, Volume) cho các tài sản thuộc ba nhóm: cổ phiếu (stocks), quỹ hoán đổi danh mục (ETF) và tiền mã hóa (crypto). Dữ liệu giá phải được cập nhật tối thiểu mỗi phút trong giờ giao dịch và phải sẵn sàng phục vụ người dùng theo nhiều khung thời gian khác nhau (từ 1 phút đến 1 ngày). Hệ thống cần có cơ chế tự phục hồi khi nguồn dữ liệu bên ngoài tạm thời không khả dụng bằng cách phục vụ dữ liệu đã được cache.

### YN-2: Hỗ trợ phân tích thị trường thông qua AI đa tác nhân

Người dùng phải có khả năng đặt câu hỏi bằng ngôn ngữ tự nhiên (tiếng Việt hoặc tiếng Anh) và nhận phản hồi phân tích tài chính có chiều sâu từ hệ thống AI. Hệ thống AI phải có khả năng tự động phân loại ý định người dùng và điều phối đến tác nhân phù hợp — hướng dẫn sử dụng, tra cứu dữ liệu giá, phân tích kỹ thuật, hoặc tư vấn đầu tư. Phản hồi phải được trả về theo thời gian thực (streaming) và phải có khả năng thực thi các công cụ tìm nạp dữ liệu thực tế thay vì chỉ dựa vào kiến thức tĩnh của mô hình. Hệ thống phải ngăn chặn các yêu cầu không phù hợp hoặc có ý định tấn công.

### YN-3: Tổng hợp và phân tích tin tức tài chính tự động

Hệ thống phải tự động thu thập tin tức tài chính liên quan đến các tài sản được theo dõi và phân tích tâm lý (BULLISH/BEARISH/NEUTRAL) của từng bài viết dựa trên nội dung. Tin tức phải được cập nhật định kỳ và có thể lọc theo nhiều tiêu chí (loại tài sản, tâm lý, thời gian, từ khóa). Người dùng không cần tự đánh giá tông điệu của tin tức mà hệ thống đã cung cấp nhãn tâm lý sẵn.

### YN-4: Quản lý danh mục và danh sách theo dõi cá nhân

Mỗi người dùng phải có thể tạo và quản lý nhiều danh mục đầu tư (portfolio) với các tài sản nắm giữ khác nhau, xem giá trị thị trường hiện tại và tỷ lệ phân bổ tài sản. Ngoài ra, người dùng cần có một danh sách theo dõi (watchlist) cá nhân để theo dõi nhanh giá các tài sản quan tâm. Thứ tự trong watchlist phải được lưu lại theo sắp xếp của người dùng.

### YN-5: Xây dựng cộng đồng chia sẻ phân tích

Hệ thống phải cung cấp một nền tảng để người dùng đã xác thực tài khoản có thể đăng tải bài viết phân tích thị trường, bình luận và trao đổi với nhau. Các bài viết phải được tổ chức và dễ tìm kiếm. Nội dung cộng đồng phải chịu sự kiểm duyệt của quản trị viên để đảm bảo chất lượng.

### YN-6: Bảo mật tài khoản và dữ liệu người dùng

Hệ thống phải đảm bảo rằng chỉ người dùng đã xác thực mới có thể truy cập dữ liệu cá nhân và sử dụng các tính năng nhạy cảm như AI chat hay đăng bài. Mật khẩu phải được mã hóa một chiều, phiên đăng nhập phải có thời hạn và có thể vô hiệu hóa chủ động, và hệ thống phải có cơ chế đặt lại mật khẩu an toàn qua email.

### YN-7: Quản trị và vận hành hệ thống

Quản trị viên phải có khả năng quản lý người dùng (khoá tài khoản, phân quyền), quản lý nội dung (xoá bài viết, bình luận vi phạm), quản lý danh sách tài sản và dữ liệu giá, kiểm soát luồng tin tức, và theo dõi chất lượng phản hồi của hệ thống AI thông qua phản hồi người dùng. Các tác vụ nền (thu thập dữ liệu, phân tích tin tức) phải có thể được kích hoạt thủ công bởi quản trị viên khi cần.

## Bảng tổng hợp yêu cầu nghiệp vụ

| Mã | Yêu cầu nghiệp vụ | Mức độ ưu tiên |
|----|-------------------|----------------|
| YN-1 | Dữ liệu thị trường thời gian thực | Cao |
| YN-2 | Phân tích AI đa tác nhân | Cao |
| YN-3 | Tin tức tài chính tự động với phân tích tâm lý | Cao |
| YN-4 | Quản lý danh mục và watchlist cá nhân | Cao |
| YN-5 | Cộng đồng chia sẻ phân tích | Trung bình |
| YN-6 | Bảo mật tài khoản và dữ liệu | Cao |
| YN-7 | Quản trị và vận hành hệ thống | Trung bình |
