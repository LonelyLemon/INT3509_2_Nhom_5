# 2.2.4 FR-4: Trang Tin Tức Tài Chính

## Tổng quan

Nhóm chức năng FR-4 cung cấp nguồn tin tức tài chính được tổng hợp tự động từ Yahoo Finance, kèm theo nhãn phân tích tâm lý (sentiment) được tính toán tự động tại thời điểm thu thập. Người dùng có thể lọc, tìm kiếm và đọc tin tức liên quan đến các tài sản họ quan tâm mà không cần rời khỏi nền tảng.

---

## FR-4.1: Thu thập tin tức tự động

Hệ thống tự động thu thập tin tức cho toàn bộ tài sản đang hoạt động thông qua Celery background task chạy định kỳ. Mỗi lần chạy, hệ thống lấy tối đa 10 bài viết gần nhất cho mỗi tài sản từ Yahoo Finance. Bài viết được nhận diện và lọc trùng lặp theo URL — mỗi bài chỉ lưu một lần dù xuất hiện trong nhiều tài sản khác nhau; quan hệ nhiều-nhiều giữa bài viết và tài sản được lưu trong bảng `news_article_tickers`.

Phân tích tâm lý được thực hiện tự động ngay tại bước thu thập bằng từ điển tài chính chuyên biệt Loughran-McDonald, trả về:
- **Nhãn tâm lý** (sentiment_label): BULLISH / BEARISH / NEUTRAL
- **Điểm tâm lý** (sentiment_score): giá trị thực trong khoảng [-1, +1]

## FR-4.2: Danh sách tin tức và bộ lọc

Người dùng xem danh sách tin tức với các tuỳ chọn lọc kết hợp:

| Bộ lọc | Giá trị hợp lệ | Mô tả |
|--------|----------------|-------|
| Loại tài sản (category) | STOCK, ETF, CRYPTO | Lọc theo loại tài sản liên quan |
| Tâm lý (sentiment) | BULLISH, BEARISH, NEUTRAL | Lọc theo nhãn tâm lý |
| Thời gian | from_date, to_date | Lọc theo khoảng ngày xuất bản |
| Mã tài sản | Bất kỳ ticker hợp lệ | Lọc tin tức liên quan đến một mã cụ thể |
| Nguồn phát hành | Tên miền nguồn (source_domain) | Lọc theo tổ chức phát hành |
| Từ khóa (q) | Chuỗi văn bản | Tìm kiếm trong tiêu đề và tóm tắt |

Kết quả có thể sắp xếp theo thời gian xuất bản (tăng dần hoặc giảm dần) và hỗ trợ phân trang.

## FR-4.3: Chi tiết bài viết tin tức

Mỗi bài viết hiển thị đầy đủ: tiêu đề, tóm tắt nội dung, tên nguồn phát hành, đường dẫn đến bài gốc, thời gian xuất bản, nhãn tâm lý và điểm tâm lý.

## FR-4.4: Quản lý tin tức (Admin)

Quản trị viên có quyền:
- **Tạo** bài viết tin tức thủ công (hệ thống tự tính điểm tâm lý).
- **Cập nhật** tiêu đề, tóm tắt, nhãn tâm lý hoặc danh sách mã tài sản liên quan của bất kỳ bài viết nào.
- **Xoá** bài viết không phù hợp.
- **Kích hoạt thủ công** tác vụ thu thập tin tức cho toàn bộ tài sản đang hoạt động thông qua API admin.

---

## Sơ đồ luồng xử lý tin tức

```
Celery Beat (định kỳ)
        ↓
Gọi yfinance API cho từng ticker đang hoạt động
        ↓
Lọc trùng lặp theo URL
        ↓
Phân tích tâm lý (Loughran-McDonald lexicon)
        ↓
Lưu NewsArticle + NewsArticleTicker vào PostgreSQL
        ↓
Người dùng truy vấn qua GET /news với bộ lọc
```
