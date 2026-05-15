# 4.4.2 Render Biểu Đồ Candlestick Với Lightweight Charts

## Lựa chọn thư viện

`lightweight-charts` v5 (TradingView) là thư viện biểu đồ tài chính chuyên dụng, được thiết kế riêng cho candlestick và time-series. So sánh với Recharts hay Chart.js:

| Tiêu chí | lightweight-charts | recharts / chart.js |
|---------|-------------------|---------------------|
| Engine | Canvas (WebGL-ready) | SVG |
| Số nến tối đa mượt mà | 50,000+ | ~1,000 |
| Crosshair, zoom, pan | Tích hợp sẵn | Cần custom |
| Time scale tài chính | Native (gap logic) | Phải tự xử lý |
| API | Imperative DOM | React declarative |

Canvas-based rendering cho phép vẽ hàng chục nghìn nến mà không giật lag — quan trọng khi hiển thị lịch sử 1h/1d dài hàng trăm ngày.

## Tích hợp vào React lifecycle

`lightweight-charts` dùng API imperative (không phải React component), cần wrap trong `useEffect` + `useRef`:

```typescript
export const CandlestickChart: React.FC<Props> = ({ candles, onLoadMore, ... }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef     = useRef<IChartApi | null>(null);
  const seriesRef    = useRef<ISeriesApi<'Candlestick'> | null>(null);

  // Khởi tạo chart một lần khi component mount
  useEffect(() => {
    if (!containerRef.current) return;
    
    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height,
      ...themeOptions(),
    });
    const series = chart.addSeries(CandlestickSeries, {
      upColor: BULL, downColor: BEAR,
      wickUpColor: BULL, wickDownColor: BEAR,
      borderVisible: false,
    });
    
    chartRef.current  = chart;
    seriesRef.current = series;
    
    return () => { chart.remove(); };  // cleanup khi unmount
  }, []);
```

Chart chỉ được khởi tạo một lần trong `useEffect([], [])` (empty dependency array). Để cập nhật data mà không tạo lại chart, code sử dụng ref pattern — chart instance tồn tại giữa các render React.

## Chiến lược cập nhật dữ liệu

```typescript
// Khi candles thay đổi, cập nhật series thông minh
useEffect(() => {
  if (!seriesRef.current || lwData.length === 0) return;
  
  const lastTime = lastCandleTimeRef.current;
  const newLastTime = lwData[lwData.length - 1].time as number;
  
  if (lastTime === null) {
    // Lần đầu load: setData() toàn bộ + fitContent()
    seriesRef.current.setData(lwData);
    chartRef.current?.timeScale().fitContent();
  } else if (lwData[0].time < (firstCandleTimeRef.current ?? Infinity)) {
    // Prepend (infinite scroll): setData() + preserve viewport
    const visibleRange = chartRef.current?.timeScale().getVisibleLogicalRange();
    seriesRef.current.setData(lwData);
    if (visibleRange) {
      const shift = lwData.length - prevLength;
      chartRef.current?.timeScale().setVisibleLogicalRange({
        from: visibleRange.from + shift,
        to:   visibleRange.to  + shift,
      });
    }
  } else if (newLastTime > lastTime) {
    // Append (live tick): series.update() — không re-render toàn bộ
    seriesRef.current.update(lwData[lwData.length - 1]);
  }
}, [lwData]);
```

Ba trường hợp cập nhật khác nhau:
1. **Load lần đầu**: `setData()` toàn bộ + `fitContent()` để vừa khung hình
2. **Prepend (scroll trái lịch sử)**: `setData()` với data dài hơn, nhưng điều chỉnh `visibleLogicalRange` để giữ nguyên vị trí xem hiện tại (không nhảy về đầu)
3. **Append (candle mới đến)**: `series.update()` chỉ vẽ lại nến cuối — tránh re-render toàn bộ dataset mỗi phút

## Dark/Light theme tự động

```typescript
function isDark() {
  return document.documentElement.classList.contains('dark');
}

function themeOptions() {
  const dark = isDark();
  return {
    layout: {
      background: { type: ColorType.Solid, color: 'transparent' },
      textColor: dark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.50)',
    },
    grid: {
      vertLines: { color: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)' },
      horzLines: { color: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)' },
    },
    ...
  };
}
```

Background được set `transparent` thay vì màu cụ thể — chart hiển thị background của container div, tự động theo dark/light theme của ứng dụng mà không cần thay đổi chart option.

## Infinite scroll khi cuộn trái

```typescript
// Scroll listener đăng ký trong useEffect setup
chart.timeScale().subscribeVisibleLogicalRangeChange((range: LogicalRange | null) => {
  if (!range) return;
  if (range.from <= 10 && !loadingEarlierRef.current && hasMoreHistoryRef.current) {
    onLoadMoreRef.current?.();
  }
});
```

Khi `from <= 10` (user đang nhìn ≤ 10 nến từ đầu dữ liệu), component gọi `onLoadMore()` — store `loadEarlierCandles()` fetch 200 nến cũ hơn và prepend. Ref pattern (`onLoadMoreRef`, `loadingEarlierRef`) cho phép closure đọc giá trị mới nhất mà không cần đăng ký lại event listener.

## Chuyển đổi timestamp

Lightweight Charts yêu cầu timestamp theo `UTCTimestamp` (Unix seconds). Dữ liệu từ server là ISO string UTC. Thêm vào đó, thư viện dùng UTC+7 làm timezone hiển thị mặc định — offset 7 giờ được cộng vào để trục thời gian hiển thị đúng giờ Việt Nam:

```typescript
const UTC7_OFFSET = 7 * 3600;
return filtered.map((c) => ({
  time: ((new Date(c.timestamp).getTime() / 1000) + UTC7_OFFSET) as UTCTimestamp,
  ...
}));
```
