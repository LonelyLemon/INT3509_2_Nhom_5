import { describe, it, expect, beforeEach } from 'vitest'
import { screen, waitFor, act, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse, delay } from 'msw'
import { Login } from '../../pages/Auth/Login'
import { renderWithRouter } from '../utils/render'
import { server } from '../mocks/server'

async function submitLogin(
  user: ReturnType<typeof userEvent.setup>,
  email: string,
  password: string
) {
  await user.type(screen.getByPlaceholderText('name@example.com'), email)
  await user.type(screen.getByPlaceholderText('••••••••'), password)
  await user.click(screen.getByRole('button', { name: /auth.login/i }))
}

describe('Login (3.x)', () => {
  let user: ReturnType<typeof userEvent.setup>

  beforeEach(() => {
    user = userEvent.setup()
    localStorage.clear()
    renderWithRouter(<Login />, {
      routes: [{ path: '/dashboard', element: <div>Dashboard Page</div> }],
    })
  })

  it('3.1 — invalid email format shows client error', async () => {
    await submitLogin(user, 'not-valid', 'ValidPass1')
    expect(screen.getByText(/valid email/i)).toBeInTheDocument()
  })

  it('3.2 — email not found shows server error', async () => {
    await submitLogin(user, 'notfound@example.com', 'ValidPass1')
    await waitFor(() => {
      expect(screen.getByText(/User not found/i)).toBeInTheDocument()
    })
  })

  it('3.3 — wrong password shows server error', async () => {
    await submitLogin(user, 'test@example.com', 'WrongPass9')
    await waitFor(() => {
      expect(screen.getByText(/Invalid Password/i)).toBeInTheDocument()
    })
  })

  it('3.4 — unverified account shows 403 error', async () => {
    await submitLogin(user, 'unverified@example.com', 'ValidPass1')
    await waitFor(() => {
      expect(screen.getByText(/Unverified Email/i)).toBeInTheDocument()
    })
  })

  it('3.5 — banned account shows specific banned message', async () => {
    await submitLogin(user, 'banned@example.com', 'ValidPass1')
    await waitFor(() => {
      expect(screen.getByText(/banned/i)).toBeInTheDocument()
    })
  })

  it('3.6 — valid login stores tokens in localStorage and navigates to dashboard', async () => {
    await submitLogin(user, 'test@example.com', 'ValidPass1')
    await waitFor(() => {
      expect(localStorage.getItem('access_token')).toBe('mock-access-token')
      expect(localStorage.getItem('refresh_token')).toBe('mock-refresh-token')
    })
    await waitFor(() => {
      expect(screen.getByText('Dashboard Page')).toBeInTheDocument()
    })
  })

  it('3.7 — button is disabled while request is in flight', async () => {
    await user.type(screen.getByPlaceholderText('name@example.com'), 'test@example.com')
    await user.type(screen.getByPlaceholderText('••••••••'), 'ValidPass1')
    const button = screen.getByRole('button', { name: /auth.login/i })
    act(() => { fireEvent.submit(button.closest('form')!) })
    expect(button).toBeDisabled()
  })
})
