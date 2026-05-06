import { describe, it, expect, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { render } from '@testing-library/react'
import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '../../store/useAuthStore'

// Mirrors the ProtectedRoute logic from App.tsx
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuthStore()
  if (isLoading) return <div>Loading...</div>
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

function renderApp(initialPath = '/dashboard') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <div>Protected Dashboard</div>
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <div>Protected Profile</div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>
  )
}

describe('Protected Routes (8.x)', () => {
  it('8.1 — unauthenticated user visiting /dashboard is redirected to /login', () => {
    useAuthStore.setState({ user: null, isAuthenticated: false, isLoading: false })
    renderApp('/dashboard')
    expect(screen.getByText('Login Page')).toBeInTheDocument()
  })

  it('8.2 — authenticated user visiting /dashboard sees protected content', () => {
    useAuthStore.setState({
      user: { id: '1', username: 'u', email: 'e@e.com', role: 'user', is_verified: true },
      isAuthenticated: true,
      isLoading: false,
    })
    renderApp('/dashboard')
    expect(screen.getByText('Protected Dashboard')).toBeInTheDocument()
  })

  it('8.3 — isLoading=true shows spinner, not the redirect', () => {
    useAuthStore.setState({ user: null, isAuthenticated: false, isLoading: true })
    renderApp('/dashboard')
    expect(screen.getByText('Loading...')).toBeInTheDocument()
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument()
  })

  it('8.4 — unauthenticated user visiting /profile is also redirected to /login', () => {
    useAuthStore.setState({ user: null, isAuthenticated: false, isLoading: false })
    renderApp('/profile')
    expect(screen.getByText('Login Page')).toBeInTheDocument()
    expect(screen.queryByText('Protected Profile')).not.toBeInTheDocument()
  })
})
