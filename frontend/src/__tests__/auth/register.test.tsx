import { describe, it, expect, beforeEach } from 'vitest'
import { screen, waitFor, act, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse, delay } from 'msw'
import { SignUp } from '../../pages/Auth/SignUp'
import { renderWithRouter } from '../utils/render'
import { server } from '../mocks/server'

const VALID = { name: 'John Doe', email: 'new@example.com', password: 'ValidPass1' }

async function fillAndSubmit(
  user: ReturnType<typeof userEvent.setup>,
  overrides: Partial<typeof VALID & { confirm: string }> = {}
) {
  const name = overrides.name ?? VALID.name
  const email = overrides.email ?? VALID.email
  const password = overrides.password ?? VALID.password
  const confirm = overrides.confirm ?? password

  await user.type(screen.getByPlaceholderText('John Doe'), name)
  await user.type(screen.getByPlaceholderText('name@example.com'), email)
  const [pwInput, confirmInput] = screen.getAllByPlaceholderText('••••••••')
  await user.type(pwInput, password)
  await user.type(confirmInput, confirm)
  await user.click(screen.getByRole('button', { name: /auth.signup/i }))
}

describe('Register (1.x)', () => {
  let user: ReturnType<typeof userEvent.setup>

  beforeEach(() => {
    user = userEvent.setup()
    renderWithRouter(<SignUp />, {
      routes: [{ path: '/check-email', element: <div>Check Email Page</div> }],
    })
  })

  it('1.1 — full name < 2 chars shows client error', async () => {
    await fillAndSubmit(user, { name: 'A' })
    expect(screen.getByText(/Full name must be at least 2 characters/i)).toBeInTheDocument()
  })

  it('1.2 — invalid email format shows client error', async () => {
    await fillAndSubmit(user, { email: 'not-an-email' })
    expect(screen.getByText(/valid email/i)).toBeInTheDocument()
  })

  it('1.3 — password shorter than 8 chars shows client error', async () => {
    await fillAndSubmit(user, { password: 'Ab1', confirm: 'Ab1' })
    expect(screen.getByText(/Password must be at least 8 characters/i)).toBeInTheDocument()
  })

  it('1.4 — password with no uppercase shows client error', async () => {
    await fillAndSubmit(user, { password: 'nouppercase1', confirm: 'nouppercase1' })
    expect(screen.getByText(/Password must contain at least one uppercase letter/i)).toBeInTheDocument()
  })

  it('1.5 — password with no digit shows client error', async () => {
    await fillAndSubmit(user, { password: 'NoDigitHere', confirm: 'NoDigitHere' })
    expect(screen.getByText(/Password must contain at least one digit/i)).toBeInTheDocument()
  })

  it('1.6 — confirm password mismatch shows client error', async () => {
    await fillAndSubmit(user, { confirm: 'DifferentPass1' })
    expect(screen.getByText(/Passwords do not match/i)).toBeInTheDocument()
  })

  it('1.7 — valid registration navigates to /check-email', async () => {
    await fillAndSubmit(user)
    await waitFor(() => {
      expect(screen.getByText('Check Email Page')).toBeInTheDocument()
    })
  })

  it('1.8 — duplicate email shows 409 error from server', async () => {
    await fillAndSubmit(user, { email: 'existing@example.com' })
    await waitFor(() => {
      expect(screen.getByText(/already exist/i)).toBeInTheDocument()
    })
  })

  it('1.9 — submit button shows spinner while loading', async () => {
    await user.type(screen.getByPlaceholderText('John Doe'), VALID.name)
    await user.type(screen.getByPlaceholderText('name@example.com'), VALID.email)
    const [pwInput, confirmInput] = screen.getAllByPlaceholderText('••••••••')
    await user.type(pwInput, VALID.password)
    await user.type(confirmInput, VALID.password)
    const button = screen.getByRole('button', { name: /auth.signup/i })
    act(() => { fireEvent.submit(button.closest('form')!) })
    expect(button).toBeDisabled()
  })
})
