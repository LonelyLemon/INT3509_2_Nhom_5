# 4.4.1 Quản Lý Trạng Thái Với Zustand

## Tại sao Zustand

MarketMind frontend có hai loại global state: trạng thái xác thực người dùng và dữ liệu thị trường đang xem. Cả hai cần chia sẻ giữa nhiều component không có quan hệ cha-con trực tiếp — không thể truyền qua props.

Zustand được chọn thay vì Redux Toolkit vì:
- **Zero boilerplate**: Không cần action creator, reducer, selector — chỉ cần `create()` với state và actions trong cùng một object
- **TypeScript native**: Store được typed đầy đủ không cần decorator hay generic phức tạp
- **Nhỏ gọn**: Bundle size ~1KB so với Redux Toolkit ~13KB
- **Không cần Provider**: Component đọc store trực tiếp qua hook — không bọc toàn bộ app trong `<Provider>`

## useAuthStore — trạng thái xác thực

```typescript
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setTokens: (access: string, refresh: string) => void;
  checkAuth: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  setTokens: (access, refresh) => {
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
  },

  checkAuth: async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      set({ user: null, isAuthenticated: false, isLoading: false });
      return;
    }
    try {
      const res = await api.get('/auth/me');
      set({ user: res.data, isAuthenticated: true, isLoading: false });
    } catch {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');  // Blacklist token trên server
    } catch {}
    finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      set({ user: null, isAuthenticated: false });
    }
  },
}));
```

`checkAuth()` được gọi một lần khi app mount — xác minh access token hiện tại với server để khôi phục phiên đăng nhập. Nếu server trả về lỗi (token hết hạn hoặc bị blacklist), store xóa token khỏi `localStorage` và chuyển sang trạng thái unauthenticated. Token JWT được lưu trong `localStorage` thay vì memory để tồn tại qua refresh trang.

`logout()` luôn dọn dẹp `localStorage` dù server call thất bại — đảm bảo user luôn được đăng xuất ngay cả khi server tạm thời không khả dụng.

## useMarketStore — dữ liệu thị trường

```typescript
interface MarketState {
  tickers: Ticker[];
  latestPrices: Record<string, LatestPrice>;
  activeTicker: string;
  activeTimeframe: string;
  candles: Candle[];
  candlesLoading: boolean;
  hasMoreHistory: boolean;
  loadingEarlier: boolean;
  
  fetchTickers: () => Promise<void>;
  fetchLatestPrice: (ticker: string) => Promise<void>;
  fetchCandles: (ticker: string, timeframe: string, silent?: boolean) => Promise<void>;
  loadEarlierCandles: (ticker: string, timeframe: string) => Promise<void>;
  setActiveTicker: (ticker: string) => void;
  setActiveTimeframe: (tf: string) => void;
}
```

`latestPrices` là `Record<string, LatestPrice>` — dictionary keyed by ticker — cho phép nhiều ticker card hiển thị giá đồng thời mà không cần fetch lại khi chuyển tab.

**Race condition prevention:** `fetchCandles()` sử dụng `AbortController` để cancel request đang chạy khi user chuyển ticker/timeframe nhanh:

```typescript
let candlesController: AbortController | null = null;

fetchCandles: async (ticker, timeframe, silent = false) => {
  candlesController?.abort();           // Cancel request cũ
  candlesController = new AbortController();
  const { signal } = candlesController;
  
  const res = await api.get(`/price/${ticker}`, { params: {...}, signal });
  ...
}
```

**Silent mode:** `fetchCandles(ticker, timeframe, silent=true)` được dùng cho background refresh (polling) — không hiển thị loading spinner, giữ nguyên chart cũ trong khi fetch, chỉ replace data khi thành công. `silent=false` (mặc định) reset state và hiển thị spinner — dùng khi user chủ động đổi ticker/timeframe.

**Infinite scroll history:** `loadEarlierCandles()` fetch candles cũ hơn khi user scroll trái, prepend vào mảng hiện tại và dedup theo timestamp. `hasMoreHistory=false` khi server trả về 0 row — ngăn tiếp tục fetch.

## Không dùng persist middleware

Khác với Redux thường kết hợp với `redux-persist`, `useAuthStore` và `useMarketStore` **không** dùng Zustand persist middleware. Lý do: token được lưu riêng trong `localStorage`, còn dữ liệu thị trường (giá, candles) stale nhanh — persist chúng sẽ hiển thị số liệu cũ cho đến khi fetch xong, tệ hơn là không có gì.
