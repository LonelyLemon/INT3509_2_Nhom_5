# Authentication — Full Flow Documentation

> **Audience:** Backend & frontend developers, QA testers.  
> **Stack:** FastAPI (BE) · React + Zustand (FE) · JWT (HS256) · bcrypt · Redis · PostgreSQL

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Token Lifecycle](#2-token-lifecycle)
3. [API Endpoints](#3-api-endpoints)
4. [Detailed Flows](#4-detailed-flows)
   - 4.1 Register
   - 4.2 Login
   - 4.3 Refresh Token
   - 4.4 Logout
   - 4.5 Email Verification
   - 4.6 Forgot / Reset Password
   - 4.7 Update Profile
   - 4.8 Ban / Unban User (Admin)
5. [Frontend Integration](#5-frontend-integration)
6. [Error Reference](#6-error-reference)
7. [Testing Guide](#7-testing-guide)

---

## 1. Architecture Overview

```
Browser
  │
  │  HTTPS
  ▼
Nginx (prod) / Vite dev server (dev)   ← port 5173
  │
  │  REST / JSON
  ▼
FastAPI  ────────────────────┐
  │                          │
  │  SQLAlchemy (asyncpg)    │  Redis
  ▼                          │  ├── token_blacklist:{token}  (logout)
PostgreSQL (users table)     │  └── reset_otp:{email}        (password reset)
                             └──────────────────────────────────
```

**Authentication method:** Bearer token (JWT HS256)  
**Token storage (FE):** `localStorage` — `access_token`, `refresh_token`  
**Password hashing:** bcrypt (cost factor via `bcrypt.gensalt()`)

---

## 2. Token Lifecycle

| Token | `type` claim | Expiry | Usage |
|---|---|---|---|
| Access | `"access"` | `ACCESS_TOKEN_EXPIRE_MINUTES` (env) | Sent in `Authorization: Bearer` on every protected request |
| Refresh | `"refresh"` | `REFRESH_TOKEN_EXPIRES` days (env) | Used once to obtain a new access token |
| Verification | `"verification"` | `VERIFY_TOKEN_EXPIRES` hours (env) | Email confirmation link |

### Token Refresh Flow

```
Request → 401 Unauthorized
  │
  ├─ isRefreshing=true
  │   POST /auth/refresh { refresh_token }
  │       ├── success → update access_token in localStorage, retry original request
  │       └── fail    → clear tokens, redirect → /login
  │
  └─ (concurrent requests) → queued until refresh completes, then replayed
```

### Token Blacklisting (Logout)

On `POST /auth/logout`, the current access token is stored in Redis with TTL = remaining expiry seconds:

```
Redis key:   token_blacklist:{raw_jwt_string}
Redis value: "1"
TTL:         remaining seconds until token expiry
```

`get_current_user` dependency checks this key on every protected request.

---

## 3. API Endpoints

Base prefix: `/auth`

| Method | Path | Auth Required | Description |
|---|---|---|---|
| `POST` | `/auth/register` | — | Register new account |
| `GET` | `/auth/verify-email?token=` | — | Verify email via JWT link |
| `POST` | `/auth/resend-verification` | — | Resend verification email |
| `POST` | `/auth/login` | — | Login → access + refresh tokens |
| `POST` | `/auth/refresh` | — | Exchange refresh token for new access token |
| `POST` | `/auth/logout` | ✅ Access | Blacklist current access token |
| `GET` | `/auth/me` | ✅ Access | Get current user info |
| `PATCH` | `/auth/me` | ✅ Access | Update profile / change password |
| `POST` | `/auth/forget-password` | — | Send OTP reset code to email |
| `POST` | `/auth/reset-password` | — | Reset password using OTP |
| `GET` | `/auth/users/{user_id}` | — | Public profile |
| `PATCH` | `/auth/users/{user_id}/ban` | ✅ Admin | Toggle ban/unban user |

---

## 4. Detailed Flows

### 4.1 Register

```
POST /auth/register
Body: { username, email, password }

Validations (BE):
  - email must be unique
  - password: ≥ 8 chars, ≥ 1 uppercase, ≥ 1 digit

Steps:
  1. Normalize email (strip + lowercase)
  2. Check email uniqueness → 409 if exists
  3. bcrypt hash password
  4. Insert User (is_verified=False)
  5. Generate verification JWT (type="verification", exp=VERIFY_TOKEN_EXPIRES hours)
  6. Send verification email (background task)
  7. Return UserResponse (201)

Response: UserResponse
```

### 4.2 Login

```
POST /auth/login
Body: application/x-www-form-urlencoded
  username=<email>&password=<password>

Steps:
  1. Find user by email → 404 if not found
  2. bcrypt verify password → 400 if mismatch
  3. Check is_verified → 403 if false
  4. Check is_banned → 403 if true
  5. Issue access_token + refresh_token
  6. Return { access_token, refresh_token }
```

### 4.3 Refresh Token

```
POST /auth/refresh
Body: { refresh_token: "<jwt>" }

Steps:
  1. Decode & validate JWT (type must be "refresh")
  2. Find user by email claim → 404 if not found
  3. Check is_banned → 403 if true
  4. Issue new access_token
  5. Return { access_token }
```

### 4.4 Logout

```
POST /auth/logout
Headers: Authorization: Bearer <access_token>

Steps:
  1. Authenticate via get_current_user dependency
  2. Extract raw token from Authorization header
  3. Decode token → read exp claim
  4. Store token in Redis: SET token_blacklist:{token} 1 EX <remaining_ttl>
  5. Return { message: "Logged out successfully" }
```

### 4.5 Email Verification

```
GET /auth/verify-email?token=<jwt>

Steps:
  1. Decode JWT (type must be "verification")
  2. Extract email from "sub" claim
  3. Find user → 404 if not found
  4. If already verified → return info message (idempotent)
  5. Set is_verified=True, commit
  6. Return success message

Resend:
POST /auth/resend-verification
Body: { email }
  → Generates new verification JWT, sends email (background task)
```

### 4.6 Forgot / Reset Password

**Step 1 — Request OTP:**
```
POST /auth/forget-password
Body: { email }

Steps:
  1. Find user by email
  2. Always return the same response (prevents email enumeration)
  3. If user exists:
     a. Generate 6-digit OTP (secrets.randbelow)
     b. Store in Redis: SET reset_otp:{email} <otp> EX 900  (15 minutes)
     c. Send OTP via email (background task)

Response: { message: "If this email is registered, you will receive a reset code shortly." }
```

**Step 2 — Reset Password:**
```
POST /auth/reset-password
Body: { email, otp, new_password }

Steps:
  1. Fetch stored OTP from Redis: GET reset_otp:{email}
  2. Compare → 400 if mismatch or missing (expired)
  3. Find user → 404 if not found
  4. bcrypt hash new_password, save to user
  5. Delete OTP from Redis (one-time use)
  6. Return success

Validations: new_password ≥ 8 chars, ≥ 1 uppercase, ≥ 1 digit
```

### 4.7 Update Profile

```
PATCH /auth/me
Headers: Authorization: Bearer <access_token>
Body (all optional): { username, password, display_name, avatar_url, bio }

Notes:
  - "password" field → automatically hashed before save
  - Only provided fields are updated (exclude_unset=True)
  - password validation: ≥ 8 chars, ≥ 1 uppercase, ≥ 1 digit
```

### 4.8 Ban / Unban User (Admin only)

```
PATCH /auth/users/{user_id}/ban
Headers: Authorization: Bearer <admin_access_token>

Steps:
  1. Verify admin role via get_admin_user dependency
  2. Guard: admin cannot ban themselves → 400
  3. Toggle is_banned on target user
  4. Return { message, is_banned }

Effect: Banned users are rejected at login (403) and at get_current_user (403).
```

---

## 5. Frontend Integration

### Files

| File | Role |
|---|---|
| [src/lib/api.ts](../frontend/src/lib/api.ts) | Axios instance, request interceptor (attach token), response interceptor (auto-refresh on 401) |
| [src/store/useAuthStore.ts](../frontend/src/store/useAuthStore.ts) | Zustand store — user state, checkAuth, logout |
| [src/pages/Auth/Login.tsx](../frontend/src/pages/Auth/Login.tsx) | Login form |
| [src/pages/Auth/SignUp.tsx](../frontend/src/pages/Auth/SignUp.tsx) | Register form |
| [src/pages/Auth/VerifyEmail.tsx](../frontend/src/pages/Auth/VerifyEmail.tsx) | Token verification page (reads `?token=` from URL) |
| [src/pages/Auth/ForgotPassword.tsx](../frontend/src/pages/Auth/ForgotPassword.tsx) | Email input → navigates to ResetPassword with email in state |
| [src/pages/Auth/ResetPassword.tsx](../frontend/src/pages/Auth/ResetPassword.tsx) | OTP + new password form |
| [src/pages/Auth/Profile.tsx](../frontend/src/pages/Auth/Profile.tsx) | Profile edit + password change + logout |

### App Startup Auth Check

```typescript
// App.tsx — runs once on mount
useEffect(() => { checkAuth(); }, [checkAuth]);

// checkAuth():
//   1. Read access_token from localStorage
//   2. GET /auth/me → set user + isAuthenticated=true
//   3. On error → clear tokens, isAuthenticated=false
```

### Protected Routes

```tsx
<ProtectedRoute>          // checks isAuthenticated
  <DashboardLayout />     // isLoading → spinner, not authenticated → /login
</ProtectedRoute>
```

### Password Requirements (Client + Server)

- Minimum **8 characters**
- At least **1 uppercase letter** (A–Z)
- At least **1 digit** (0–9)

---

## 6. Error Reference

| HTTP Code | When |
|---|---|
| `400` | Invalid password / invalid or expired OTP |
| `401` | Missing or invalid Bearer token |
| `403` | Unverified email / banned account / insufficient permissions |
| `404` | User not found |
| `409` | Email already registered |
| `429` | Rate limit exceeded (100 req / 60s per IP, via Redis) |
| `503` | Redis unavailable (reset-password only) |

---

## 7. Testing Guide

### Prerequisites

```bash
make dev          # starts api, db, redis, frontend
# API:      http://localhost:8000
# Docs:     http://localhost:8000/docs
# Frontend: http://localhost:5173
```

### 7.1 Register & Verify Email

1. `POST /auth/register` with valid payload → expect `201`
2. Check backend logs for verification link (DEV MODE log)
3. Open the link or call `GET /auth/verify-email?token=<token>` → expect `{ message: "Email Verified Successfully" }`
4. Register same email again → expect `409`

**Password validation test cases:**

| Password | Expected |
|---|---|
| `abc` | 400 — too short |
| `abcdefgh` | 400 — no uppercase, no digit |
| `Abcdefgh` | 400 — no digit |
| `Abcdefg1` | 201 — valid |

### 7.2 Login

```bash
curl -X POST http://localhost:8000/auth/login \
  -d "username=user@example.com&password=Abcdefg1" \
  -H "Content-Type: application/x-www-form-urlencoded"
```

- Unverified email → `403 Unverified Email`
- Wrong password → `400 Invalid Password`
- Banned account → `403 This account has been banned`
- Success → `{ access_token, refresh_token }`

### 7.3 Refresh Token

```bash
curl -X POST http://localhost:8000/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{ "refresh_token": "<refresh_jwt>" }'
```

- Valid → `{ access_token: "<new_jwt>" }`
- Expired / invalid → `401`

### 7.4 Logout & Token Blacklist

```bash
# 1. Logout
curl -X POST http://localhost:8000/auth/logout \
  -H "Authorization: Bearer <access_token>"

# 2. Verify token is blacklisted
curl http://localhost:8000/auth/me \
  -H "Authorization: Bearer <same_access_token>"
# → 401 Invalid Token
```

### 7.5 Forgot / Reset Password

```bash
# Step 1 — request OTP
curl -X POST http://localhost:8000/auth/forget-password \
  -H "Content-Type: application/json" \
  -d '{ "email": "user@example.com" }'
# Backend logs print the OTP in DEV MODE

# Step 2 — reset
curl -X POST http://localhost:8000/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{ "email": "user@example.com", "otp": "123456", "new_password": "NewPass1" }'
```

- Wrong OTP → `400 Invalid or expired OTP`
- Expired OTP (after 15 min) → `400`
- OTP reuse after success → `400` (deleted from Redis after first use)

### 7.6 Ban / Unban

```bash
# Login as admin first, get admin_token

curl -X PATCH http://localhost:8000/auth/users/<user_uuid>/ban \
  -H "Authorization: Bearer <admin_token>"
# → { "is_banned": true }

# Banned user tries to login → 403

# Unban (toggle)
curl -X PATCH http://localhost:8000/auth/users/<user_uuid>/ban \
  -H "Authorization: Bearer <admin_token>"
# → { "is_banned": false }

# Admin bans themselves → 400
```

### 7.7 Environment Variables Checklist

```env
SECRET_KEY=<openssl rand -hex 32>
SECURITY_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRES=7          # days
VERIFY_TOKEN_EXPIRES=24          # hours
REDIS_URL=redis://redis:6379/0
```
