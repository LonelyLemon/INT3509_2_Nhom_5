# 5.2.2 Kiểm Thử Đơn Vị — Frontend

Kiểm thử frontend sử dụng **Vitest 3.x** + **React Testing Library** + **MSW v2 (Mock Service Worker)**. Vitest tích hợp native vào Vite, cho phép dùng lại toàn bộ cấu hình alias và transform mà không cần cấu hình riêng. Hai nhóm test được bổ sung: kiểm thử Zustand store (`useMarketStore`) và kiểm thử component (`WatchlistManager`).

## Cơ chế mock API với MSW

MSW intercept các HTTP request tại tầng `fetch` trong môi trường test (jsdom) trước khi chúng ra mạng. Handler được định nghĩa trong `frontend/src/__tests__/mocks/handlers.ts` và được bổ sung trực tiếp trong từng test suite qua `server.use(...)`. Cách này cho phép mỗi test kiểm soát chính xác response mà component hay store sẽ nhận, kể cả trường hợp lỗi (HTTP 500, 409...).

```ts
// Thêm handler cho một test cụ thể
server.use(
  http.get('http://localhost:8000/price/tickers', () =>
    HttpResponse.json([{ symbol: 'AAPL', name: 'Apple Inc.' }])
  )
)
```

## Kiểm thử Zustand Store (`useMarketStore.test.ts`)

`useMarketStore` quản lý toàn bộ dữ liệu thị trường trên frontend: danh sách ticker, giá mới nhất, dữ liệu nến (OHLCV), và trạng thái loading/error. Store được reset trước mỗi test bằng `useMarketStore.setState({...})` để đảm bảo tính độc lập.

| Test | Hành vi kiểm tra | Kết quả |
|------|-----------------|---------|
| `fetchTickers populates tickers` | Gọi `fetchTickers()` → `state.tickers.length > 0` | ✓ |
| `fetchTickers sets loading to false` | Sau khi hoàn thành, `tickersLoading === false` | ✓ |
| `fetchTickers sets activeTicker` | `activeTicker` được gán ticker đầu tiên | ✓ |
| `fetchLatestPrice populates latestPrices` | `state.latestPrices["AAPL"]` được điền | ✓ |
| `fetchCandles populates candles` | `state.candles.length > 0` sau khi fetch | ✓ |
| `fetchCandles sets candlesLoading to false` | Loading trở về false sau fetch | ✓ |
| `fetchCandles sets error on HTTP 500` | MSW trả 500 → `candlesError` được set | ✓ |
| `setActiveTicker updates activeTicker` | Gọi `setActiveTicker("TSLA")` → state thay đổi | ✓ |

Test `fetchCandles sets error on HTTP 500` kiểm tra hành vi khi API thất bại: store không crash, chỉ set trường error và giữ nguyên dữ liệu cũ.

## Kiểm thử Component (`WatchlistManager.test.tsx`)

`WatchlistManager` là component phức tạp nhất trong tab Portfolio — nó fetch danh sách watchlist, hiển thị tickers từ store, và cho phép thêm/xóa item. Vì component dùng React Router (`useNavigate`) và market store, test dùng helper `renderWithRouter` và reset store trước mỗi case.

| Test | Kịch bản | Kết quả |
|------|---------|---------|
| `renders watchlist items` | MSW trả list có 1 item → xuất hiện trong DOM | ✓ |
| `shows empty state` | List rỗng → hiển thị "0 asset" | ✓ |
| `removes item on delete click` | Click xóa → DELETE request được gửi | ✓ |
| `adds item via add panel` | Mở panel, chọn ticker, submit → POST request | ✓ |
| `shows Watchlist header` | Header text "Watchlist" luôn hiện | ✓ |

## Kết quả chạy

```
frontend/src/__tests__/store/useMarketStore.test.ts      8 passed
frontend/src/__tests__/components/WatchlistManager.test.tsx  5 passed
────────────────────────────────────────────────────────────────────
TỔNG CỘNG                                               13 passed
```

Ngoài 13 test mới, bộ test frontend hiện có (token refresh, auth flow) vẫn tiếp tục pass, xác nhận không có regression nào được đưa vào.
