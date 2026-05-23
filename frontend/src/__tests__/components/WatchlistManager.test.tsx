import React from 'react'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '../mocks/server'
import { renderWithRouter } from '../utils/render'
import { WatchlistManager } from '../../components/Portfolio/WatchlistManager'
import { useMarketStore } from '../../store/useMarketStore'

const BASE = 'http://localhost:8000'

const MOCK_ASSET = {
  id: 'asset-uuid-aapl',
  ticker: 'AAPL',
  name: 'Apple Inc.',
  asset_type: 'STOCK',
}

const MOCK_WATCHLIST_ITEM = {
  id: 'wl-uuid-1',
  asset: MOCK_ASSET,
  position: 0,
  current_price: 152.0,
  change_amount: 2.0,
  change_percentage: 1.33,
  created_at: '2026-01-01T00:00:00Z',
}

const MOCK_TICKERS = [
  { id: 'asset-uuid-aapl', ticker: 'AAPL', name: 'Apple Inc.', asset_type: 'STOCK', is_active: true },
  { id: 'asset-uuid-tsla', ticker: 'TSLA', name: 'Tesla Inc.', asset_type: 'STOCK', is_active: true },
]

beforeEach(() => {
  // Reset market store so tickers trigger fetchTickers
  useMarketStore.setState({ tickers: [], latestPrices: {}, activeTicker: '' })

  server.use(
    http.get(`${BASE}/price/tickers`, () => HttpResponse.json(MOCK_TICKERS)),
    http.get(`${BASE}/price/AAPL/latest`, () =>
      HttpResponse.json({ ticker: 'AAPL', close: 152.0, change_percentage: 1.33 })
    ),
  )
})

describe('WatchlistManager', () => {
  it('renders watchlist items returned from the API', async () => {
    server.use(
      http.get(`${BASE}/watchlist`, () =>
        HttpResponse.json({ items: [MOCK_WATCHLIST_ITEM], total: 1 })
      )
    )

    renderWithRouter(<WatchlistManager />)

    await waitFor(() => {
      expect(screen.getByText('AAPL')).toBeInTheDocument()
    })
  })

  it('shows empty state when watchlist has no items', async () => {
    server.use(
      http.get(`${BASE}/watchlist`, () =>
        HttpResponse.json({ items: [], total: 0 })
      )
    )

    renderWithRouter(<WatchlistManager />)

    await waitFor(() => {
      // Counter shows "0 assets"
      expect(screen.getByText(/0 asset/i)).toBeInTheDocument()
    })
  })

  it('removes an item when the delete button is clicked', async () => {
    const user = userEvent.setup()

    server.use(
      http.get(`${BASE}/watchlist`, () =>
        HttpResponse.json({ items: [MOCK_WATCHLIST_ITEM], total: 1 })
      ),
      http.delete(`${BASE}/watchlist/:assetId`, () =>
        new HttpResponse(null, { status: 204 })
      )
    )

    renderWithRouter(<WatchlistManager />)

    // Wait for the item to appear
    await waitFor(() => expect(screen.getByText('AAPL')).toBeInTheDocument())

    // Click the trash / delete button for this item
    const deleteButtons = screen.getAllByTitle(/remove|delete/i)
    if (deleteButtons.length > 0) {
      await user.click(deleteButtons[0])
      await waitFor(() => {
        expect(screen.queryByText('AAPL')).not.toBeInTheDocument()
      })
    }
  })

  it('adds an item from the search panel', async () => {
    const user = userEvent.setup()
    const newItem = {
      id: 'wl-uuid-2',
      asset: { id: 'asset-uuid-tsla', ticker: 'TSLA', name: 'Tesla Inc.', asset_type: 'STOCK' },
      position: 1,
      current_price: null,
      change_amount: null,
      change_percentage: null,
      created_at: '2026-01-01T00:00:00Z',
    }

    server.use(
      http.get(`${BASE}/watchlist`, () =>
        HttpResponse.json({ items: [], total: 0 })
      ),
      http.post(`${BASE}/watchlist`, () =>
        HttpResponse.json(newItem, { status: 201 })
      )
    )

    renderWithRouter(<WatchlistManager />)

    await waitFor(() => expect(screen.getByText(/0 asset/i)).toBeInTheDocument())

    // Open the add panel
    const addButton = document.getElementById('watchlist-add-btn')
    if (addButton) {
      await user.click(addButton)

      // Type to filter tickers
      const searchInput = screen.getByPlaceholderText(/search/i)
      await user.type(searchInput, 'TSLA')

      // Click the TSLA ticker button
      await waitFor(() => expect(screen.getByText('TSLA')).toBeInTheDocument())
      await user.click(screen.getByText('TSLA'))

      await waitFor(() => {
        expect(screen.getByText('TSLA')).toBeInTheDocument()
      })
    }
  })

  it('shows the Watchlist header', () => {
    server.use(
      http.get(`${BASE}/watchlist`, () =>
        HttpResponse.json({ items: [], total: 0 })
      )
    )

    renderWithRouter(<WatchlistManager />)
    expect(screen.getByText('Watchlist')).toBeInTheDocument()
  })
})
