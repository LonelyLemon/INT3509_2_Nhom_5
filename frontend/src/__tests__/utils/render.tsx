import React from 'react'
import { render, type RenderOptions } from '@testing-library/react'
import { MemoryRouter, type MemoryRouterProps, Routes, Route } from 'react-router-dom'

interface RenderWithRouterOptions extends Omit<RenderOptions, 'wrapper'> {
  routerProps?: MemoryRouterProps
  // Extra <Route> stubs so navigation can be verified by text on screen
  routes?: Array<{ path: string; element: React.ReactElement }>
}

export function renderWithRouter(
  ui: React.ReactElement,
  { routerProps, routes = [], ...options }: RenderWithRouterOptions = {}
) {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <MemoryRouter {...routerProps}>
      <Routes>
        <Route path="*" element={<>{children}</>} />
        {routes.map(({ path, element }) => (
          <Route key={path} path={path} element={element} />
        ))}
      </Routes>
    </MemoryRouter>
  )
  return render(ui, { wrapper: Wrapper, ...options })
}
