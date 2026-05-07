import { describe, it, expect, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ResetPassword } from '../../pages/Auth/ResetPassword'
import { renderWithRouter } from '../utils/render'

const EMAIL = 'user@example.com'
const VALID_OTP = '123456'
const VALID_PW = 'NewValidPass1'

async function fillReset(
  u: ReturnType<typeof userEvent.setup>,
  opts: { email?: string; otp?: string; pw?: string; confirm?: string } = {}
) {
  const { email = EMAIL, otp = VALID_OTP, pw = VALID_PW, confirm = pw } = opts

  const emailInput = screen.getByPlaceholderText('name@example.com')
  const otpInput = screen.getByPlaceholderText('000000')
  const [pwInput, confirmInput] = screen.getAllByPlaceholderText('••••••••')

  if (email) { await u.clear(emailInput); await u.type(emailInput, email) }
  await u.type(otpInput, otp)
  await u.type(pwInput, pw)
  await u.type(confirmInput, confirm)
  await u.click(screen.getByRole('button', { name: /reset password/i }))
}

describe('Reset Password (6.5–6.11)', () => {
  let user: ReturnType<typeof userEvent.setup>

  beforeEach(() => {
    user = userEvent.setup()
  })

  it('6.5 — email field is pre-filled from router state', () => {
    renderWithRouter(<ResetPassword />, {
      routerProps: { initialEntries: [{ pathname: '/reset-password', state: { email: EMAIL } }] },
    })
    expect(screen.getByPlaceholderText('name@example.com')).toHaveValue(EMAIL)
  })

  it('6.6 — correct OTP and valid password shows success state', async () => {
    renderWithRouter(<ResetPassword />, {
      routerProps: { initialEntries: [{ pathname: '/reset-password', state: { email: EMAIL } }] },
      routes: [{ path: '/login', element: <div>Login Page</div> }],
    })
    await fillReset(user)
    await waitFor(() => {
      expect(screen.getByText(/Password Reset Successful/i)).toBeInTheDocument()
    })
  })

  it('6.7 — wrong OTP shows "Invalid or expired OTP" error', async () => {
    renderWithRouter(<ResetPassword />, {
      routerProps: { initialEntries: [{ pathname: '/reset-password', state: { email: EMAIL } }] },
    })
    await fillReset(user, { otp: '000000' })
    await waitFor(() => {
      expect(screen.getByText(/Invalid or expired OTP/i)).toBeInTheDocument()
    })
  })

  it('6.8 — new password too short shows client-side error', async () => {
    renderWithRouter(<ResetPassword />, {
      routerProps: { initialEntries: [{ pathname: '/reset-password', state: { email: EMAIL } }] },
    })
    await fillReset(user, { pw: 'Short1', confirm: 'Short1' })
    expect(screen.getByText(/Password must be at least 8 characters/i)).toBeInTheDocument()
  })

  it('6.9 — new password without uppercase shows client-side error', async () => {
    renderWithRouter(<ResetPassword />, {
      routerProps: { initialEntries: [{ pathname: '/reset-password', state: { email: EMAIL } }] },
    })
    await fillReset(user, { pw: 'nouppercase1', confirm: 'nouppercase1' })
    expect(screen.getByText(/Password must contain at least one uppercase letter/i)).toBeInTheDocument()
  })

  it('6.10 — confirm password mismatch shows client-side error', async () => {
    renderWithRouter(<ResetPassword />, {
      routerProps: { initialEntries: [{ pathname: '/reset-password', state: { email: EMAIL } }] },
    })
    await fillReset(user, { confirm: 'DifferentPass9' })
    expect(screen.getByText(/Passwords do not match/i)).toBeInTheDocument()
  })

  it('6.11 — "Send again" link navigates back to /forgot-password', async () => {
    renderWithRouter(<ResetPassword />, {
      routerProps: { initialEntries: [{ pathname: '/reset-password', state: { email: EMAIL } }] },
      routes: [{ path: '/forgot-password', element: <div>Forgot Password Page</div> }],
    })
    await user.click(screen.getByRole('link', { name: /send again/i }))
    await waitFor(() => {
      expect(screen.getByText('Forgot Password Page')).toBeInTheDocument()
    })
  })
})
