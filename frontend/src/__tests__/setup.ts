import '@testing-library/jest-dom'
import { beforeAll, afterEach, afterAll, vi } from 'vitest'
import { server } from './mocks/server'

// ── i18n mock ──────────────────────────────────────────────────────────────
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { changeLanguage: vi.fn(), language: 'en' },
  }),
  initReactI18next: { type: '3rdParty', init: vi.fn() },
  Trans: ({ children }: { children: React.ReactNode }) => children,
}))

// ── MSW server lifecycle ───────────────────────────────────────────────────
beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }))
afterEach(() => {
  server.resetHandlers()
  localStorage.clear()
})
afterAll(() => server.close())
