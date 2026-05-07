import { describe, it, expect, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { VerifyEmail } from '../../pages/Auth/VerifyEmail'
import { renderWithRouter } from '../utils/render'

describe('Verify Email (2.x)', () => {
  let user: ReturnType<typeof userEvent.setup>

  beforeEach(() => {
    user = userEvent.setup()
  })

  it('2.1 — valid token shows "Verified!" and success icon', async () => {
    renderWithRouter(<VerifyEmail />, {
      routerProps: { initialEntries: ['/verify-email?token=valid-token'] },
    })
    await waitFor(() => {
      expect(screen.getByText('Verified!')).toBeInTheDocument()
    })
    expect(screen.getByText(/Email Verified Successfully/i)).toBeInTheDocument()
  })

  it('2.2 — already-verified token shows info message', async () => {
    renderWithRouter(<VerifyEmail />, {
      routerProps: { initialEntries: ['/verify-email?token=already-verified'] },
    })
    await waitFor(() => {
      expect(screen.getByText(/already been verified/i)).toBeInTheDocument()
    })
  })

  it('2.3 — invalid/expired token shows error state', async () => {
    renderWithRouter(<VerifyEmail />, {
      routerProps: { initialEntries: ['/verify-email?token=bad-token'] },
    })
    await waitFor(() => {
      expect(screen.getByText('Verification Failed')).toBeInTheDocument()
    })
  })

  it('2.4 — missing token shows error immediately (no API call)', async () => {
    renderWithRouter(<VerifyEmail />, {
      routerProps: { initialEntries: ['/verify-email'] },
    })
    await waitFor(() => {
      expect(screen.getByText(/token is missing/i)).toBeInTheDocument()
    })
  })

  it('2.5 — "Go to Login" button navigates to /login', async () => {
    renderWithRouter(<VerifyEmail />, {
      routerProps: { initialEntries: ['/verify-email?token=bad-token'] },
      routes: [{ path: '/login', element: <div>Login Page</div> }],
    })
    await waitFor(() => screen.getByText('Verification Failed'))
    await user.click(screen.getByRole('button', { name: /go to login/i }))
    await waitFor(() => {
      expect(screen.getByText('Login Page')).toBeInTheDocument()
    })
  })
})
