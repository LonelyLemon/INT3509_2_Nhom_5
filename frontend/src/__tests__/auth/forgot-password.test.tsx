import { describe, it, expect, beforeEach } from 'vitest'
import { screen, waitFor, act, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse, delay } from 'msw'
import { ForgotPassword } from '../../pages/Auth/ForgotPassword'
import { renderWithRouter } from '../utils/render'
import { server } from '../mocks/server'

describe('Forgot Password (6.1–6.4)', () => {
  let user: ReturnType<typeof userEvent.setup>

  beforeEach(() => {
    user = userEvent.setup()
  })

  it('6.1 — valid known email navigates to /reset-password with email in state', async () => {
    renderWithRouter(<ForgotPassword />, {
      routes: [
        {
          path: '/reset-password',
          element: <div data-testid="reset-page">Reset Page</div>,
        },
      ],
    })
    await user.type(screen.getByPlaceholderText('name@example.com'), 'user@example.com')
    await user.click(screen.getByRole('button', { name: /send reset code/i }))
    await waitFor(() => {
      expect(screen.getByTestId('reset-page')).toBeInTheDocument()
    })
  })

  it('6.2 — unknown email still navigates (server never reveals existence)', async () => {
    renderWithRouter(<ForgotPassword />, {
      routes: [{ path: '/reset-password', element: <div>Reset Page</div> }],
    })
    await user.type(screen.getByPlaceholderText('name@example.com'), 'nobody@example.com')
    await user.click(screen.getByRole('button', { name: /send reset code/i }))
    await waitFor(() => {
      expect(screen.getByText('Reset Page')).toBeInTheDocument()
    })
  })

  it('6.3 — button is disabled while submitting', async () => {
    renderWithRouter(<ForgotPassword />)
    await user.type(screen.getByPlaceholderText('name@example.com'), 'user@example.com')
    const button = screen.getByRole('button', { name: /send reset code/i })
    act(() => { fireEvent.submit(button.closest('form')!) })
    expect(button).toBeDisabled()
  })

  it('6.4 — "Remembered your password?" link points to /login', () => {
    renderWithRouter(<ForgotPassword />)
    const loginLink = screen.getByRole('link', { name: /auth.login/i })
    expect(loginLink).toHaveAttribute('href', '/login')
  })
})
