# Hướng dẫn sử dụng ứng dụng FinAI

## Tổng quan

FinAI là nền tảng phân tích đầu tư thông minh, cung cấp dữ liệu thị trường thời gian thực, quản lý danh mục đầu tư, tin tức tài chính, và trợ lý AI phân tích chuyên sâu. Ứng dụng hỗ trợ các loại tài sản: cổ phiếu (stocks), ETF, crypto, và các chỉ số thị trường.

**Lưu ý quan trọng:** FinAI là công cụ theo dõi và phân tích, **không hỗ trợ mua/bán trực tiếp**. Ứng dụng không lưu giá mua hay lịch sử giao dịch, nên không tính được lãi/lỗ (P&L).

---

## Các trang chính

### 1. Dashboard (`/dashboard`)

Trang chính của ứng dụng, hiển thị:

**Bảng giá & Biểu đồ (giữa màn hình):**
- Biểu đồ nến (candlestick) thời gian thực cho ticker đang chọn
- Chuyển đổi khung thời gian: 1m, 5m, 15m, 30m, 1h, 4h, 1d
- Hiển thị giá hiện tại, thay đổi giá (+/-), volume
- Biểu đồ tự động refresh mỗi 60 giây

**Watchlist (bên phải):**
- Danh sách các mã chứng khoán đang theo dõi
- Giá hiện tại và % thay đổi cho từng mã
- Click vào mã để xem biểu đồ chi tiết
- Tự động refresh giá mỗi 30 giây

**Cách thêm mã vào Watchlist:**
1. Vào trang Dashboard
2. Tìm ô tìm kiếm hoặc nút "+" trong phần Watchlist
3. Nhập tên hoặc mã ticker (VD: VNM, BTC, SSI)
4. Chọn mã muốn thêm và xác nhận

**Cách xóa mã khỏi Watchlist:**
- Hover lên mã cần xóa → click biểu tượng xóa (thùng rác)
- Hoặc dùng nút quản lý Watchlist để xóa nhiều mã cùng lúc

---

### 2. Portfolio (`/portfolio`)

Quản lý danh mục đầu tư cá nhân:

**Thông tin hiển thị:**
- Tổng giá trị danh mục (theo giá thị trường thời gian thực)
- Danh sách holdings: mã ticker, số lượng nắm giữ, giá hiện tại, giá trị hiện tại
- Phân bổ tỷ trọng (allocation %) theo từng tài sản và loại tài sản
- Biểu đồ phân bổ danh mục (pie chart)

**Cách thêm holding vào Portfolio:**
1. Vào trang Portfolio (`/portfolio`)
2. Click nút "Thêm tài sản" hoặc "Add Holding"
3. Chọn mã ticker, nhập số lượng nắm giữ
4. Lưu lại

**Cách xóa holding:**
- Click vào holding muốn xóa → chọn "Xóa"
- Hoặc dùng menu quản lý danh mục

**Lưu ý:** Ứng dụng không yêu cầu nhập giá mua, nên chỉ theo dõi giá trị hiện tại, không tính được lãi/lỗ thực tế.

---

### 3. News & Calendar (`/news`)

Tin tức thị trường tài chính:

**Tính năng:**
- Tin tức mới nhất từ các nguồn tài chính uy tín
- Lọc tin tức theo ticker, danh mục (stocks, crypto, macro), sentiment (bullish/bearish/neutral)
- Lịch sự kiện tài chính sắp diễn ra
- Điểm sentiment tự động (AI phân tích tone của bài)

---

### 4. Community / Forum (`/community`)

Cộng đồng thảo luận về đầu tư:
- Đăng bài, bình luận về các chủ đề thị trường
- Chia sẻ phân tích và quan điểm đầu tư

---

### 5. Profile (`/profile`)

Quản lý tài khoản người dùng:
- Cập nhật thông tin cá nhân (display name, avatar, bio)
- Thay đổi email, mật khẩu
- Xem lịch sử hoạt động

---

## Trợ lý AI (FinAI Chat)

Biểu tượng chat nổi ở góc dưới bên phải màn hình, có thể truy cập từ bất kỳ trang nào trong dashboard.

### Trợ lý AI có thể làm gì?

1. **Hướng dẫn sử dụng ứng dụng** — giải thích các tính năng, cách thêm watchlist, portfolio...
2. **Tra cứu dữ liệu thị trường** — giá hiện tại, lịch sử giá, tin tức theo mã
3. **Phân tích kỹ thuật chuyên sâu** — RSI, MACD, Bollinger Bands, SMA, xu hướng
4. **So sánh tài sản** — so sánh nhiều mã cổ phiếu cùng lúc
5. **Phân tích danh mục** — xem tổng quan portfolio, phân bổ tài sản
6. **Tổng hợp sentiment tin tức** — đánh giá tâm lý thị trường theo mã

### Ví dụ câu hỏi

- "Giá VNM hiện tại là bao nhiêu?"
- "Phân tích kỹ thuật cổ phiếu SSI"
- "So sánh SSI và HCM"
- "Tin tức mới nhất về BTC"
- "Portfolio của tôi đang đầu tư vào những gì?"
- "Danh sách watchlist của tôi?"
- "Thị trường crypto hôm nay như thế nào?"
- "Cách thêm cổ phiếu vào watchlist?"

### Lịch sử hội thoại

- Mỗi cuộc trò chuyện được lưu tự động
- Click biểu tượng lịch sử (☰) để xem các cuộc hội thoại cũ
- Có thể đổi tên hoặc xóa từng cuộc hội thoại
- Click vào hội thoại cũ để tiếp tục

---

## Danh sách tài sản hỗ trợ

Ứng dụng hiện hỗ trợ 17 tickers bao gồm:
- **Cổ phiếu VN:** VNM, SSI, HCM, VIC, VHM, HPG, MSN, VCB, TCB, MBB
- **ETF:** E1VFVN30
- **Crypto:** BTC, ETH
- **Quốc tế / Index:** AAPL, GOOGL, TSLA, SPY

---

## Câu hỏi thường gặp

**Q: Tại sao không thấy giá mua trong portfolio?**
A: FinAI không lưu thông tin giao dịch (giá mua, ngày mua). Portfolio chỉ theo dõi số lượng nắm giữ và giá trị theo giá thị trường hiện tại.

**Q: Dữ liệu giá có realtime không?**
A: Giá được cập nhật định kỳ (1 phút/lần cho timeframe 1m). Dashboard tự refresh mỗi 30-60 giây.

**Q: AI có đưa ra lời khuyên mua/bán không?**
A: AI cung cấp phân tích kỹ thuật và thông tin thị trường, nhưng không đưa ra lời khuyên cụ thể về thời điểm hoặc số lượng mua/bán. Quyết định đầu tư là của người dùng.

**Q: Có thể dùng ứng dụng trên điện thoại không?**
A: Ứng dụng được thiết kế responsive, có thể dùng trên mobile nhưng trải nghiệm tốt nhất trên desktop.
