import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    css: false,
    clearMocks: true,
    restoreMocks: true,
    env: {
      VITE_API_URL: 'http://localhost:8000',
    },
  },
})
