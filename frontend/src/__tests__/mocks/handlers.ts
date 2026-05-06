import { http, HttpResponse } from 'msw'

const BASE = 'http://localhost:8000'

const MOCK_USER = {
  id: 'user-uuid-123',
  username: 'testuser',
  email: 'test@example.com',
  is_verified: true,
  role: 'user',
  display_name: 'Test User',
  avatar_url: null,
  bio: null,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
}

export const handlers = [

  // ── Register ──────────────────────────────────────────────────────────────
  http.post(`${BASE}/auth/register`, async ({ request }) => {
    const body = await request.json() as Record<string, string>
    if (body.email === 'existing@example.com') {
      return HttpResponse.json({ detail: 'User email already exist.' }, { status: 409 })
    }
    return HttpResponse.json({
      ...MOCK_USER,
      username: body.username,
      email: body.email,
      is_verified: false,
    }, { status: 201 })
  }),

  // ── Login ─────────────────────────────────────────────────────────────────
  http.post(`${BASE}/auth/login`, async ({ request }) => {
    const text = await request.text()
    const params = new URLSearchParams(text)
    const username = params.get('username') ?? ''
    const password = params.get('password') ?? ''

    if (username === 'banned@example.com') {
      return HttpResponse.json({ detail: 'This account has been banned.' }, { status: 403 })
    }
    if (username === 'unverified@example.com') {
      return HttpResponse.json({ detail: 'Unverified Email. Please check your email again.' }, { status: 403 })
    }
    if (username === 'notfound@example.com') {
      return HttpResponse.json({ detail: 'User not found.' }, { status: 404 })
    }
    if (password !== 'ValidPass1') {
      return HttpResponse.json({ detail: 'Invalid Password' }, { status: 400 })
    }
    return HttpResponse.json({ access_token: 'mock-access-token', refresh_token: 'mock-refresh-token' })
  }),

  // ── Refresh token ─────────────────────────────────────────────────────────
  http.post(`${BASE}/auth/refresh`, async ({ request }) => {
    const body = await request.json() as Record<string, string>
    if (body.refresh_token === 'valid-refresh-token') {
      return HttpResponse.json({ access_token: 'new-access-token' })
    }
    return HttpResponse.json({ detail: 'Invalid Token' }, { status: 401 })
  }),

  // ── Logout ────────────────────────────────────────────────────────────────
  http.post(`${BASE}/auth/logout`, () =>
    HttpResponse.json({ message: 'Logged out successfully' })
  ),

  // ── Get current user ──────────────────────────────────────────────────────
  http.get(`${BASE}/auth/me`, ({ request }) => {
    const auth = request.headers.get('Authorization') ?? ''
    if (!auth || auth === 'Bearer invalid-token' || auth === 'Bearer expired-token') {
      return HttpResponse.json({ detail: 'Invalid Token' }, { status: 401 })
    }
    return HttpResponse.json(MOCK_USER)
  }),

  // ── Verify email ──────────────────────────────────────────────────────────
  http.get(`${BASE}/auth/verify-email`, ({ request }) => {
    const token = new URL(request.url).searchParams.get('token')
    if (token === 'valid-token') {
      return HttpResponse.json({ message: 'Email Verified Successfully' })
    }
    if (token === 'already-verified') {
      return HttpResponse.json({ message: 'This email has already been verified' })
    }
    return HttpResponse.json({ detail: 'Invalid Token' }, { status: 401 })
  }),

  // ── Resend verification ───────────────────────────────────────────────────
  http.post(`${BASE}/auth/resend-verification`, async ({ request }) => {
    const body = await request.json() as Record<string, string>
    if (body.email === 'verified@example.com') {
      return HttpResponse.json({ message: 'This account have been verified.' })
    }
    if (body.email === 'ghost@example.com') {
      return HttpResponse.json({ detail: 'User not found.' }, { status: 404 })
    }
    return HttpResponse.json({ message: 'Verification Email have been sent. Check your mail box.' })
  }),

  // ── Forget password ───────────────────────────────────────────────────────
  http.post(`${BASE}/auth/forget-password`, () =>
    HttpResponse.json({ message: 'If this email is registered, you will receive a reset code shortly.' })
  ),

  // ── Reset password ────────────────────────────────────────────────────────
  http.post(`${BASE}/auth/reset-password`, async ({ request }) => {
    const body = await request.json() as Record<string, string>
    if (body.otp !== '123456') {
      return HttpResponse.json({ detail: 'Invalid or expired OTP.' }, { status: 400 })
    }
    return HttpResponse.json({ message: 'Password reset successfully.' })
  }),

  // ── Update profile ────────────────────────────────────────────────────────
  http.patch(`${BASE}/auth/me`, async ({ request }) => {
    const body = await request.json() as Record<string, string>
    return HttpResponse.json({
      ...MOCK_USER,
      username: body.username ?? MOCK_USER.username,
      display_name: body.display_name ?? MOCK_USER.display_name,
      bio: body.bio ?? MOCK_USER.bio,
    })
  }),
]
