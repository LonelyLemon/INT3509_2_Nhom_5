import { http, HttpResponse } from 'msw'
import { server } from '../mocks/server'
import { useMarketStore } from '../../store/useMarketStore'

const BASE = 'http://localhost:8000'

const MOCK_TICKERS = [
  { id: 'asset-uuid-1', ticker: 'AAPL', name: 'Apple Inc.', asset_type: 'STOCK', is_active: true },
  { id: 'asset-uuid-2', ticker: 'TSLA', name: 'Tesla Inc.', asset_type: 'STOCK', is_active: true },
]

const MOCK_LATEST_PRICE = {
  ticker: 'AAPL',
  timestamp: '2026-01-01T00:00:00Z',
  open: 150.0,
  high: 155.0,
  low: 149.0,
  close: 152.0,
  volume: 1000000,
  change_amount: 2.0,
  change_percentage: 1.33,
}

const MOCK_CANDLES = {
  ticker: 'AAPL',
  timeframe: '1h',
  data: [
    { timestamp: '2026-01-01T10:00:00Z', open: 150, high: 152, low: 149, close: 151, volume: 500000 },
    { timestamp: '2026-01-01T11:00:00Z', open: 151, high: 153, low: 150, close: 152, volume: 600000 },
  ],
}

beforeEach(() => {
  // Reset store to initial state before each test
  useMarketStore.setState({
    tickers: [],
    tickersLoading: false,
    latestPrices: {},
    activeTicker: '',
    activeTimeframe: '1h',
    candles: [],
    candlesLoading: false,
    candlesError: null,
    hasMoreHistory: true,
    loadingEarlier: false,
  })

  // Register price endpoint handlers
  server.use(
    http.get(`${BASE}/price/tickers`, () =>
      HttpResponse.json(MOCK_TICKERS)
    ),
    http.get(`${BASE}/price/AAPL/latest`, () =>
      HttpResponse.json(MOCK_LATEST_PRICE)
    ),
    http.get(`${BASE}/price/TSLA/latest`, () =>
      HttpResponse.json({ ...MOCK_LATEST_PRICE, ticker: 'TSLA' })
    ),
    http.get(`${BASE}/price/AAPL`, () =>
      HttpResponse.json(MOCK_CANDLES)
    ),
  )
})

describe('useMarketStore — fetchTickers', () => {
  it('populates tickers after successful fetch', async () => {
    await useMarketStore.getState().fetchTickers()
    const { tickers } = useMarketStore.getState()
    expect(tickers).toHaveLength(2)
    expect(tickers[0].ticker).toBe('AAPL')
  })

  it('sets tickersLoading to false after fetch completes', async () => {
    await useMarketStore.getState().fetchTickers()
    expect(useMarketStore.getState().tickersLoading).toBe(false)
  })

  it('sets activeTicker to first ticker when none selected', async () => {
    await useMarketStore.getState().fetchTickers()
    // fetchTickers sets activeTicker if not already set
    expect(useMarketStore.getState().activeTicker).toBe('AAPL')
  })
})

describe('useMarketStore — fetchLatestPrice', () => {
  it('populates latestPrices for the given ticker', async () => {
    await useMarketStore.getState().fetchLatestPrice('AAPL')
    const { latestPrices } = useMarketStore.getState()
    expect(latestPrices['AAPL']).toBeDefined()
    expect(latestPrices['AAPL'].close).toBe(152.0)
  })
})

describe('useMarketStore — fetchCandles', () => {
  it('populates candles after successful fetch', async () => {
    await useMarketStore.getState().fetchCandles('AAPL', '1h')
    const { candles } = useMarketStore.getState()
    expect(candles).toHaveLength(2)
    expect(candles[0].close).toBe(151)
  })

  it('sets candlesLoading to false after fetch completes', async () => {
    await useMarketStore.getState().fetchCandles('AAPL', '1h')
    expect(useMarketStore.getState().candlesLoading).toBe(false)
  })

  it('sets candlesError when server returns 500', async () => {
    server.use(
      http.get(`${BASE}/price/AAPL`, () =>
        HttpResponse.json({ detail: 'Server error' }, { status: 500 })
      )
    )
    await useMarketStore.getState().fetchCandles('AAPL', '1h')
    expect(useMarketStore.getState().candlesError).not.toBeNull()
    expect(useMarketStore.getState().candles).toHaveLength(0)
  })
})

describe('useMarketStore — setActiveTicker', () => {
  it('updates activeTicker in state', () => {
    useMarketStore.getState().setActiveTicker('TSLA')
    expect(useMarketStore.getState().activeTicker).toBe('TSLA')
  })
})
