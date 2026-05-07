import { describe, it, expect, beforeEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../mocks/server'
import { useAuthStore } from '../../store/useAuthStore'

const MOCK_USER = {
  id: '1',
  username: 'testuser',
  email: 'test@example.com',
  role: 'user',
  is_verified: true,
}

describe('Logout (5.x)', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: MOCK_USER, isAuthenticated: true, isLoading: false })
    localStorage.setItem('access_token', 'mock-access-token')
    localStorage.setItem('refresh_token', 'mock-refresh-token')
  })

  it('5.1 — logout calls POST /auth/logout on the server', async () => {
    let logoutCalled = false
    server.use(
      http.post('http://localhost:8000/auth/logout', () => {
        logoutCalled = true
        return HttpResponse.json({ message: 'Logged out successfully' })
      })
    )

    await useAuthStore.getState().logout()
    expect(logoutCalled).toBe(true)
  })

  it('5.2 — logout clears access_token and refresh_token from localStorage', async () => {
    await useAuthStore.getState().logout()
    expect(localStorage.getItem('access_token')).toBeNull()
    expect(localStorage.getItem('refresh_token')).toBeNull()
  })

  it('5.3 — store resets to unauthenticated after logout', async () => {
    await useAuthStore.getState().logout()
    const { user, isAuthenticated } = useAuthStore.getState()
    expect(user).toBeNull()
    expect(isAuthenticated).toBe(false)
  })

  it('5.4 — localStorage still cleared even when server logout call fails', async () => {
    server.use(
      http.post('http://localhost:8000/auth/logout', () =>
        HttpResponse.json({ detail: 'Server error' }, { status: 500 })
      )
    )

    await useAuthStore.getState().logout()
    expect(localStorage.getItem('access_token')).toBeNull()
    expect(localStorage.getItem('refresh_token')).toBeNull()
    expect(useAuthStore.getState().isAuthenticated).toBe(false)
  })
})
