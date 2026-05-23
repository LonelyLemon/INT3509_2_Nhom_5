# 3.7.1 Luồng Đăng Ký và Xác Thực

MarketMind triển khai xác thực dựa trên **JWT stateless** với ba loại token: access token (ngắn hạn), refresh token (dài hạn), và verify token (xác thực email). Phiên đăng nhập không được lưu trong server — toàn bộ trạng thái xác thực được mang trong token hoặc Redis.

## Luồng đăng ký tài khoản

```mermaid
sequenceDiagram
    participant U as Người dùng
    participant FE as Frontend
    participant API as FastAPI
    participant DB as PostgreSQL
    participant EMAIL as Email Service

    U->>FE: Điền form đăng ký (username, email, password)
    FE->>API: POST /auth/register
    API->>DB: SELECT users WHERE email = ?
    DB-->>API: Không tồn tại

    API->>API: bcrypt.hash(password)
    API->>DB: INSERT users (is_verified=False)
    DB-->>API: User record

    API->>API: JWT encode (type=verification, sub=email, exp=24h)
    API-->>FE: 200 UserResponse
    API-)EMAIL: send_mail(verification_link) [BackgroundTask]

    U->>EMAIL: Nhấn link xác thực
    U->>API: GET /auth/verify-email?token=...
    API->>API: JWT decode → kiểm tra type=verification
    API->>DB: UPDATE users SET is_verified=True
    DB-->>API: OK
    API-->>U: "Email Verified Successfully"
```

**Email gửi bất đồng bộ:** `send_mail` được đưa vào `BackgroundTasks` của FastAPI — API trả về ngay lập tức mà không chờ email gửi xong, tránh làm tăng latency đăng ký.

**Verify token:** JWT riêng với `type: "verification"` và TTL 24 giờ. Khi người dùng click link, token được decode và kiểm tra `type` trước khi cập nhật `is_verified`.

---

## Luồng đăng nhập và cấp token

```mermaid
sequenceDiagram
    participant U as Người dùng
    participant FE as Frontend
    participant API as FastAPI
    participant DB as PostgreSQL

    U->>FE: Nhập email + password
    FE->>API: POST /auth/login (OAuth2PasswordRequestForm)
    API->>DB: SELECT users WHERE email = ?
    DB-->>API: User record

    API->>API: bcrypt.verify(password, hash)
    API->>API: Kiểm tra is_verified, is_banned

    API->>API: create_access_token(sub=email, type=access, exp=30m)
    API->>API: create_refresh_token(sub=email, type=refresh, exp=7d)
    API-->>FE: {access_token, refresh_token}

    Note over FE: Lưu access_token trong memory<br/>refresh_token trong httpOnly cookie (hoặc localStorage)
```

**Kiểm tra trước khi cấp token:** Ba điều kiện theo thứ tự — (1) email tồn tại, (2) password đúng (`bcrypt.verify`), (3) tài khoản đã xác thực email (`is_verified=True`), (4) tài khoản không bị ban (`is_banned=False`). Lỗi ở bước nào trả về HTTP exception ngay tại bước đó.

---

## Luồng làm mới token và đăng xuất

```mermaid
sequenceDiagram
    participant FE as Frontend
    participant API as FastAPI
    participant REDIS as Redis

    Note over FE,API: Access token hết hạn (30 phút)
    FE->>API: POST /auth/refresh {refresh_token}
    API->>API: JWT decode → kiểm tra type=refresh
    API->>API: Kiểm tra is_banned
    API-->>FE: {access_token mới}

    Note over FE,API: Đăng xuất
    FE->>API: POST /auth/logout [Bearer access_token]
    API->>API: JWT decode → lấy exp
    API->>REDIS: SETEX token_blacklist:{token} <remaining_ttl> "1"
    REDIS-->>API: OK
    API-->>FE: "Logged out successfully"
```

**Blacklist access token:** Khi logout, access token bị đưa vào Redis blacklist với TTL bằng thời gian còn lại trước khi token hết hạn. Middleware xác thực (`get_current_user`) kiểm tra blacklist với mỗi request — nếu token có trong blacklist, từ chối dù token chưa hết hạn về mặt kỹ thuật.

**Refresh token không có blacklist:** Refresh token không được thu hồi khi logout — đây là trade-off được chấp nhận. Token có TTL 7 ngày và chỉ dùng để lấy access token mới, không trực tiếp truy cập tài nguyên. Trong ngữ cảnh ứng dụng tài chính đọc/ghi dữ liệu cá nhân, rủi ro này được coi là chấp nhận được.

---

## Luồng quên mật khẩu (OTP)

```mermaid
sequenceDiagram
    participant U as Người dùng
    participant API as FastAPI
    participant REDIS as Redis
    participant EMAIL as Email

    U->>API: POST /auth/forget-password {email}
    API->>API: generate_reset_otp() → 6 chữ số
    API->>REDIS: SETEX otp:{email} 900 <otp>
    API-)EMAIL: Gửi OTP qua email [BackgroundTask]
    API-->>U: "OTP sent"

    U->>API: POST /auth/reset-password {email, otp, new_password}
    API->>REDIS: GET otp:{email}
    REDIS-->>API: OTP stored
    API->>API: Compare OTP
    API->>API: bcrypt.hash(new_password)
    API->>DB: UPDATE users SET password_hash=?
    API->>REDIS: DEL otp:{email}
    API-->>U: "Password reset successfully"
```

OTP 6 chữ số được lưu trong Redis với TTL 900 giây (15 phút). Sau khi reset thành công, key OTP bị xóa ngay để không thể tái sử dụng.
