import { describe, it, expect, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Profile } from '../../pages/Auth/Profile'
import { useAuthStore } from '../../store/useAuthStore'
import { renderWithRouter } from '../utils/render'
import { http, HttpResponse } from 'msw'
import { server } from '../mocks/server'

const MOCK_USER = {
  id: 'user-uuid-123',
  username: 'testuser',
  email: 'test@example.com',
  role: 'user',
  is_verified: true,
  display_name: 'Test User',
  avatar_url: null,
  bio: 'Hello world',
}

describe('Profile (7.x)', () => {
  let user: ReturnType<typeof userEvent.setup>

  beforeEach(() => {
    user = userEvent.setup()
    localStorage.setItem('access_token', 'mock-access-token')
    useAuthStore.setState({ user: MOCK_USER, isAuthenticated: true, isLoading: false })
    renderWithRouter(<Profile />, {
      routes: [{ path: '/login', element: <div>Login Page</div> }],
    })
  })

  it('7.1 — displays user info correctly', () => {
    expect(screen.getByText('@testuser')).toBeInTheDocument()
    expect(screen.getByText('test@example.com')).toBeInTheDocument()
    expect(screen.getByText('Test User')).toBeInTheDocument()
    expect(screen.getByText('Hello world')).toBeInTheDocument()
  })

  it('7.2 — clicking edit icon opens the edit form', async () => {
    await user.click(screen.getByTitle('Edit Profile'))
    expect(screen.getByPlaceholderText('johndoe')).toBeInTheDocument()
  })

  it('7.3 — clicking Cancel closes edit form without changes', async () => {
    await user.click(screen.getByTitle('Edit Profile'))
    await user.click(screen.getByRole('button', { name: /cancel/i }))
    expect(screen.queryByPlaceholderText('johndoe')).not.toBeInTheDocument()
  })

  it('7.4 — saving profile changes shows success message', async () => {
    await user.click(screen.getByTitle('Edit Profile'))
    const usernameInput = screen.getByPlaceholderText('johndoe')
    await user.clear(usernameInput)
    await user.type(usernameInput, 'newusername')
    await user.click(screen.getByRole('button', { name: /save changes/i }))
    await waitFor(() => {
      expect(screen.getByText(/Profile updated successfully/i)).toBeInTheDocument()
    })
  })

  it('7.5 — clicking "Change Password" opens the password form', async () => {
    await user.click(screen.getByRole('button', { name: /change password/i }))
    expect(screen.getByText('Change Password')).toBeInTheDocument()
  })

  it('7.6 — new passwords not matching shows error', async () => {
    await user.click(screen.getByRole('button', { name: /change password/i }))
    const [currentPw, newPw, confirmPw] = screen.getAllByPlaceholderText('••••••••')
    await user.type(currentPw, 'OldPass1')
    await user.type(newPw, 'NewValidPass1')
    await user.type(confirmPw, 'DifferentPass9')
    await user.click(screen.getByRole('button', { name: /update password/i }))
    expect(screen.getByText(/do not match/i)).toBeInTheDocument()
  })

  it('7.7 — wrong current password shows error from server', async () => {
    // Override login handler to reject wrong current password
    server.use(
      http.post('http://localhost:8000/auth/login', () =>
        HttpResponse.json({ detail: 'Invalid Password' }, { status: 400 })
      )
    )
    await user.click(screen.getByRole('button', { name: /change password/i }))
    const [currentPw, newPw, confirmPw] = screen.getAllByPlaceholderText('••••••••')
    await user.type(currentPw, 'WrongOldPass1')
    await user.type(newPw, 'NewValidPass1')
    await user.type(confirmPw, 'NewValidPass1')
    await user.click(screen.getByRole('button', { name: /update password/i }))
    await waitFor(() => {
      expect(screen.getByText(/Incorrect current password/i)).toBeInTheDocument()
    })
  })

  it('7.8 — successful password change shows success message', async () => {
    await user.click(screen.getByRole('button', { name: /change password/i }))
    const [currentPw, newPw, confirmPw] = screen.getAllByPlaceholderText('••••••••')
    await user.type(currentPw, 'ValidPass1')
    await user.type(newPw, 'NewValidPass1')
    await user.type(confirmPw, 'NewValidPass1')
    await user.click(screen.getByRole('button', { name: /update password/i }))
    await waitFor(() => {
      expect(screen.getByText(/Password updated successfully/i)).toBeInTheDocument()
    })
  })
})
