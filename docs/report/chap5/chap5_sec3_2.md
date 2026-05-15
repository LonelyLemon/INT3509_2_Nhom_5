# 5.3.2 Kiểm Thử Tích Hợp — Frontend

Kiểm thử tích hợp frontend xác nhận rằng component `WatchlistManager` tương tác đúng với API backend thông qua MSW mock và phản ánh chính xác trạng thái lên giao diện. Không giống unit test thuần túy, các test này render component đầy đủ trong DOM ảo (jsdom), tương tác như người dùng thật (click, nhập text), và xác nhận kết quả UI.

## Thiết lập môi trường

MSW được cấu hình ở cấp global trong `frontend/src/__tests__/setup.ts` — server MSW khởi động trước tất cả test và được reset giữa các suite. Từng test có thể bổ sung handler riêng qua `server.use(...)` để override response mặc định:

```ts
// Reset market store trước mỗi test
beforeEach(() => {
  useMarketStore.setState({
    tickers: [],
    latestPrices: {},
    candles: [],
    activeTicker: null,
    tickersLoading: false,
    candlesLoading: false,
    candlesError: null,
  })

  server.use(
    http.get('http://localhost:8000/price/tickers', () =>
      HttpResponse.json([{ symbol: 'AAPL', name: 'Apple Inc.' }])
    ),
    http.get('http://localhost:8000/watchlist', () =>
      HttpResponse.json([{ id: '1', symbol: 'AAPL', order_index: 0 }])
    )
  )
})
```

## Tích hợp với React Router

`WatchlistManager` sử dụng `useNavigate` từ React Router. Render trực tiếp trong jsdom mà không có Router context sẽ throw lỗi. Helper `renderWithRouter` (trong `frontend/src/__tests__/utils/render.tsx`) bọc component trong `MemoryRouter`:

```tsx
export function renderWithRouter(ui: React.ReactElement, { route = '/' } = {}) {
  return render(
    <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
  )
}
```

## Các test case tích hợp

### Test 1: Render danh sách watchlist

MSW trả về một item `AAPL`, test xác nhận symbol xuất hiện trong DOM sau khi component fetch và render:

```tsx
renderWithRouter(<WatchlistManager />)
const item = await screen.findByText('AAPL')
expect(item).toBeInTheDocument()
```

### Test 2: Trạng thái rỗng (empty state)

Khi MSW trả về mảng rỗng, component hiển thị thông báo "0 asset" thay vì danh sách:

```tsx
server.use(
  http.get('http://localhost:8000/watchlist', () => HttpResponse.json([]))
)
renderWithRouter(<WatchlistManager />)
expect(await screen.findByText(/0 asset/i)).toBeInTheDocument()
```

### Test 3: Xóa item

Click nút xóa phải gửi `DELETE /watchlist/{id}`. Test sử dụng MSW request interceptor để xác nhận request được gửi:

```tsx
let deleteCalled = false
server.use(
  http.delete('http://localhost:8000/watchlist/:id', () => {
    deleteCalled = true
    return new HttpResponse(null, { status: 204 })
  })
)
// ... click delete button
expect(deleteCalled).toBe(true)
```

### Test 4: Thêm item qua panel

Mở panel thêm, chọn ticker từ dropdown, submit form → `POST /watchlist` được gọi:

```tsx
await userEvent.click(screen.getByRole('button', { name: /add/i }))
// Chọn ticker từ select
await userEvent.click(screen.getByText('AAPL'))
await userEvent.click(screen.getByRole('button', { name: /confirm/i }))
expect(postCalled).toBe(true)
```

### Test 5: Header luôn hiển thị

Test đơn giản xác nhận text "Watchlist" xuất hiện — đây là kiểm tra smoke test cho render cơ bản:

```tsx
renderWithRouter(<WatchlistManager />)
expect(await screen.findByText('Watchlist')).toBeInTheDocument()
```

## Sự khác biệt so với unit test store

Trong khi unit test store (`useMarketStore.test.ts`) gọi action trực tiếp và kiểm tra state, integration test component render toàn bộ cây component, để component tự gọi store và API, sau đó kiểm tra kết quả trên giao diện. Đây là cách tiếp cận gần với hành vi thực tế của người dùng nhất có thể mà không cần browser thật.

## Kết quả chạy

```
frontend/src/__tests__/components/WatchlistManager.test.tsx   5 passed
```

Kết hợp với 8 test từ `useMarketStore.test.ts`, tổng cộng **13 frontend test mới** được thêm vào — tất cả passed mà không ảnh hưởng đến các test cũ.
