# 5.2.1 Kiểm Thử Đơn Vị — Backend

Kiểm thử đơn vị backend tập trung vào ba module chứa logic nghiệp vụ thuần túy: xử lý bảo mật xác thực, tính toán chỉ báo kỹ thuật, và phân tích cảm xúc tin tức. Tất cả 32 test được thực thi với `pytest` + `pytest-asyncio` (asyncio_mode=auto) và không phụ thuộc vào bất kỳ kết nối cơ sở hạ tầng nào.

## Cấu hình môi trường

File `pyproject.toml` trong `/test/backend/` cấu hình pytest để tìm test trong thư mục hiện tại và thêm `../../backend` vào `PYTHONPATH`:

```toml
[tool.pytest.ini_options]
asyncio_mode = "auto"
pythonpath = ["../../backend"]
testpaths = ["."]
```

Vì `pydantic-settings` đọc biến môi trường khi import `src.main`, một file `.env` với giá trị stub được đặt cùng thư mục để validation không thất bại — toàn bộ kết nối thực không được thiết lập.

## Module 1: Bảo mật xác thực (`test_auth_security.py`)

Module `src.auth.security` cung cấp ba hàm cốt lõi cho toàn bộ hệ thống xác thực: `hash_password`, `verify_pw`, và `generate_reset_otp`.

| Test | Mô tả | Kết quả |
|------|-------|---------|
| `test_hash_password_returns_bcrypt_hash` | Output bắt đầu bằng `$2b$` — đúng prefix bcrypt | ✓ |
| `test_verify_pw_correct_password` | `verify_pw(pw, hash_password(pw))` → `True` | ✓ |
| `test_verify_pw_wrong_password` | Sai mật khẩu → `False` | ✓ |
| `test_verify_pw_handles_legacy_format` | Hash lưu dạng `b'$2b$...'` (bytes-as-string) vẫn verify đúng | ✓ |
| `test_generate_reset_otp_is_6_digits` | Regex `^\d{6}$`, chạy 10 lần liên tiếp | ✓ |

Test `test_verify_pw_handles_legacy_format` kiểm tra trường hợp đặc biệt khi một số bản ghi cũ trong database lưu bcrypt hash dưới dạng biểu diễn chuỗi của bytes Python (ví dụ `"b'$2b$12$...'"` thay vì `"$2b$12$..."`). Hàm `verify_pw` xử lý cả hai dạng.

## Module 2: Chỉ báo kỹ thuật (`test_indicators_math.py`)

Module `src.indicators.service` tính toán các chỉ báo kỹ thuật thông dụng. Các hàm private (`_sma`, `_ema`, `_rsi`, `_macd`, `_round`, `_interpret_*`) được import trực tiếp để kiểm thử đơn vị mà không qua HTTP layer.

### Nhóm SMA (Simple Moving Average)

| Test | Đầu vào | Kỳ vọng |
|------|---------|---------|
| `test_sma_basic` | `[1,2,3,4,5]`, period=3 | `4.0` (trung bình 3 giá cuối) |
| `test_sma_insufficient_data` | period > len(closes) | `None` |
| `test_sma_exact_window` | period == len(closes) | Trung bình toàn bộ |

### Nhóm EMA (Exponential Moving Average)

| Test | Kiểm tra |
|------|---------|
| `test_ema_length_equals_input` | `len(_ema(closes, period)) == len(closes)` |
| `test_ema_converges` | EMA cuối lớn hơn trung bình đầu khi giá tăng dần |

### Nhóm RSI (Relative Strength Index)

RSI được kiểm tra tại các biên cực:

| Test | Đầu vào | Kỳ vọng |
|------|---------|---------|
| `test_rsi_all_gains_returns_100` | Giá tăng đơn điệu liên tục | `100.0` |
| `test_rsi_all_losses_returns_0` | Giá giảm đơn điệu liên tục | `0.0` |
| `test_rsi_neutral_range` | Giá dao động đều | `30 < RSI < 70` |
| `test_rsi_insufficient_data` | `len < period + 1` | `None` |

### Nhóm MACD

| Test | Kiểm tra |
|------|---------|
| `test_macd_returns_three_floats` | Output là `(float, float, float)`, không None |
| `test_macd_insufficient_data` | `len < slow + signal` → `(None, None, None)` |
| `test_macd_histogram_equals_line_minus_signal` | Histogram = MACD line − Signal line |

### Nhóm hàm diễn giải

| Test | Kiểm tra |
|------|---------|
| `test_interpret_rsi_overbought` | RSI = 75 → chuỗi chứa "Overbought" |
| `test_interpret_rsi_oversold` | RSI = 25 → chuỗi chứa "Oversold" |
| `test_interpret_sma_price_above_is_bullish` | price > sma → chứa "Bullish" |

## Module 3: Phân tích cảm xúc tin tức (`test_news_sentiment.py`)

Module `src.news.sentiment` sử dụng kết hợp VADER và từ điển Loughran-McDonald để phân loại tiêu đề tin tức tài chính thành ba nhãn: `BULLISH`, `BEARISH`, `NEUTRAL`. Ngưỡng phân loại là ±0.05 trên thang điểm composite score.

| Test | Đầu vào | Kỳ vọng |
|------|---------|---------|
| `test_bullish_headline` | "Apple surges to record profits" | `BULLISH` |
| `test_bearish_headline` | "Company files for bankruptcy" | `BEARISH` |
| `test_neutral_headline` | "Company announces quarterly results" | Nhãn hợp lệ |
| `test_score_in_valid_range` | Bất kỳ tiêu đề | score ∈ [-1.0, 1.0] |
| `test_label_is_valid` | Bất kỳ tiêu đề | label ∈ {"BULLISH", "BEARISH", "NEUTRAL"} |
| `test_summary_combined_with_title` | Summary âm tính + title trung lập | Kết quả thay đổi nhãn |

## Kết quả chạy

```
test/backend/unit/test_auth_security.py       5 passed
test/backend/unit/test_indicators_math.py    16 passed
test/backend/unit/test_news_sentiment.py      6 passed
─────────────────────────────────────────────────────
TỔNG CỘNG                                    32 passed
```
