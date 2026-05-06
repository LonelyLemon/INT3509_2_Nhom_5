import { describe, it, expect, beforeEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../mocks/server'
import { api } from '../../lib/api'

const BASE = 'http://localhost:8000'

// Endpoint used as a probe in these tests
const PROBE = `${BASE}/auth/me`

describe('Token Refresh Interceptor (4.x)', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('4.1 — 401 with valid refresh token retries and succeeds', async () => {
    localStorage.setItem('access_token', 'expired-token')
    localStorage.setItem('refresh_token', 'valid-refresh-token')

    let requestCount = 0
    server.use(
      http.get(PROBE, ({ request }) => {
        requestCount++
        const auth = request.headers.get('Authorization') ?? ''
        if (auth === 'Bearer expired-token') {
          return HttpResponse.json({ detail: 'Invalid Token' }, { status: 401 })
        }
        return HttpResponse.json({ id: 'user-uuid-123', username: 'testuser' })
      })
    )

    const res = await api.get('/auth/me')
    expect(res.status).toBe(200)
    // Original expired request + retry with new token = 2 requests to /auth/me
    expect(requestCount).toBe(2)
    expect(localStorage.getItem('access_token')).toBe('new-access-token')
  })

  it('4.2 — 401 with no refresh token clears localStorage', async () => {
    localStorage.setItem('access_token', 'expired-token')
    // No refresh token stored

    server.use(
      http.get(PROBE, () =>
        HttpResponse.json({ detail: 'Invalid Token' }, { status: 401 })
      )
    )

    // Suppress the redirect error thrown by the interceptor
    await expect(api.get('/auth/me')).rejects.toThrow()
    expect(localStorage.getItem('access_token')).toBeNull()
    expect(localStorage.getItem('refresh_token')).toBeNull()
  })

  it('4.3 — concurrent 401 requests trigger only ONE refresh call', async () => {
    localStorage.setItem('access_token', 'expired-token')
    localStorage.setItem('refresh_token', 'valid-refresh-token')

    let refreshCalls = 0
    server.use(
      http.get(PROBE, ({ request }) => {
        const auth = request.headers.get('Authorization') ?? ''
        if (auth === 'Bearer expired-token') {
          return HttpResponse.json({ detail: 'Invalid Token' }, { status: 401 })
        }
        return HttpResponse.json({ id: 'user-uuid-123', username: 'testuser' })
      }),
      http.post(`${BASE}/auth/refresh`, () => {
        refreshCalls++
        return HttpResponse.json({ access_token: 'new-access-token' })
      })
    )

    const results = await Promise.all([
      api.get('/auth/me'),
      api.get('/auth/me'),
      api.get('/auth/me'),
    ])

    expect(refreshCalls).toBe(1)
    expect(results).toHaveLength(3)
    results.forEach((r) => expect(r.status).toBe(200))
  })

  it('4.4 — after successful refresh, new access token is saved in localStorage', async () => {
    localStorage.setItem('access_token', 'expired-token')
    localStorage.setItem('refresh_token', 'valid-refresh-token')

    server.use(
      http.get(PROBE, ({ request }) => {
        const auth = request.headers.get('Authorization') ?? ''
        if (auth === 'Bearer expired-token') {
          return HttpResponse.json({ detail: 'Invalid Token' }, { status: 401 })
        }
        return HttpResponse.json({ id: 'user-uuid-123' })
      })
    )

    await api.get('/auth/me')
    expect(localStorage.getItem('access_token')).toBe('new-access-token')
  })
})
