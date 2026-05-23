# 3.2.1 Frontend: React 19, Vite, TypeScript, Tailwind CSS, Zustand

## React 19 + TypeScript 5.9

React 19 được chọn làm nền tảng UI vì ba lý do chính. Thứ nhất, Concurrent Features ổn định trong React 19 — `useTransition` và `Suspense` — giúp giao diện vẫn responsive trong khi dữ liệu tải bất đồng bộ, quan trọng khi hiển thị nhiều biểu đồ và ticker đồng thời. Thứ hai, component model của React phù hợp tự nhiên với domain tài chính — mỗi widget (candlestick chart, indicator panel, ticker card) là một component độc lập có thể tái sử dụng. Thứ ba, hệ sinh thái React trưởng thành cung cấp đầy đủ thư viện đặc thù như Lightweight Charts (TradingView) và Recharts đã được kiểm chứng trong production.

TypeScript 5.9 là bắt buộc trong dự án này vì dữ liệu tài chính có cấu trúc phức tạp — kiểu `OHLCVData`, `IndicatorConfig`, `PortfolioHolding`, `ChatMessage` — cần được enforce tại compile time. Type safety ngăn các lỗi runtime tinh vi như nhầm đơn vị (price vs. change percentage) và đảm bảo API response được typed đúng từ đầu.

## Vite 7

Vite được chọn thay vì Create React App (CRA) vì:

| Tiêu chí | CRA (webpack) | Vite 7 |
|---------|---------------|--------|
| Khởi động dev server | 15–30 giây (bundle toàn bộ) | < 1 giây (ESM native, lazy load) |
| Hot Module Replacement | Chậm khi module lớn | Tức thì (chỉ reload module thay đổi) |
| Build production | Webpack config phức tạp | Rollup tích hợp, zero-config |
| TypeScript | Babel transpile (không type check) | esbuild transpile + tsc riêng |

Vite 7 sử dụng ESM native của trình duyệt trong dev mode — không bundle, không transpile toàn bộ source — nên dev server khởi động gần như tức thì dù project có hàng trăm file.

## Tailwind CSS 4

Tailwind CSS 4 mang đến thay đổi kiến trúc quan trọng so với v3: không còn file `tailwind.config.js`, không cần PostCSS — toàn bộ cấu hình viết bằng CSS native (`@theme`, `@layer`). Tích hợp qua Vite plugin (`@tailwindcss/vite`) — chỉ cần một dòng trong `vite.config.ts`.

Utility-first approach của Tailwind phù hợp với component-based React: style được viết trực tiếp trong JSX cùng với logic, không có stylesheet riêng lẻ cần đồng bộ. Hai thư viện hỗ trợ đi kèm:
- `clsx`: Xây dựng className conditional (`clsx('base', { 'active': isActive })`)
- `tailwind-merge`: Giải quyết xung đột Tailwind class khi merge props (`twMerge('px-2 py-1', 'px-4')` → `'px-4 py-1'`)

## Zustand 5

Zustand được chọn thay vì Redux Toolkit vì API đơn giản hơn đáng kể — không cần boilerplate action/reducer/selector/dispatch. Toàn bộ global state của ứng dụng được quản lý trong hai store:

**`useAuthStore`** — Trạng thái xác thực người dùng:
```
{ user, accessToken, isAuthenticated, login(), logout(), refreshToken() }
```

**`useMarketStore`** — Dữ liệu thị trường đang xem:
```
{ selectedTicker, timeframe, priceData, indicators, setTicker(), setTimeframe() }
```

Zustand middleware `persist` đồng bộ state tùy chỉnh giao diện (theme, language) vào `localStorage` — áp dụng lại ngay khi load trang mà không cần request server, tránh flash of unstyled content.

## Lightweight Charts (TradingView) + Recharts

Hai thư viện chart được dùng cho hai mục đích khác nhau:

| Thư viện | Dùng cho | Lý do lựa chọn |
|---------|---------|----------------|
| `lightweight-charts` v5 (TradingView) | Biểu đồ nến (candlestick), biểu đồ đường giá, indicator overlay | Thư viện chuyên dụng cho tài chính, render canvas-based xử lý hàng nghìn nến mượt mà, hỗ trợ crosshair, zoom, pan, time scale gốc |
| `recharts` v3 | Biểu đồ phân bổ portfolio (pie chart), biểu đồ thống kê admin | Tích hợp tự nhiên với React component model (declarative API), phù hợp biểu đồ tổng hợp không yêu cầu hiệu năng time-series |

Lightweight Charts không được thiết kế theo React component model (dùng DOM API trực tiếp), nên được wrap trong `useEffect` + `useRef` để tích hợp vào React lifecycle mà không gây memory leak.

## i18next + react-i18next

Đa ngôn ngữ Tiếng Việt / Tiếng Anh được xử lý bằng i18next với file JSON locale riêng cho từng ngôn ngữ. Toàn bộ chuỗi UI được tham chiếu qua key (`t('dashboard.price')`) thay vì hardcode — thêm ngôn ngữ mới chỉ cần thêm file JSON tương ứng mà không cần thay đổi code component.

Ngôn ngữ được lưu vào `localStorage` và áp dụng ngay khi tải trang, tránh flash nội dung sai ngôn ngữ. `react-i18next` cung cấp hook `useTranslation()` và component `<Trans>` cho các chuỗi có biến nội suy, tích hợp tự nhiên với React component lifecycle.
