# 4.4.4 Đa Ngôn Ngữ Với i18next (Tiếng Anh / Tiếng Việt)

## Cấu hình i18next

```typescript
// src/i18n.ts
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import enTranslation from "./locales/en/translation.json";
import viTranslation from "./locales/vi/translation.json";

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: enTranslation },
    vi: { translation: viTranslation },
  },
  lng: "vi",            // Ngôn ngữ mặc định: Tiếng Việt
  fallbackLng: "en",    // Fallback khi key thiếu trong vi
  interpolation: {
    escapeValue: false, // React tự xử lý XSS — không cần escape
  },
});
```

File locale JSON được import tĩnh tại build time — không cần dynamic import hay HTTP request để load translation. Bundle size tăng thêm kích thước file JSON nhưng loại bỏ hoàn toàn latency load ngôn ngữ khi chuyển đổi.

`fallbackLng: "en"` đảm bảo ứng dụng không bị vỡ khi thêm key mới vào tiếng Việt nhưng chưa thêm vào tiếng Anh — key thiếu tự động fall back sang tiếng Anh.

## Cấu trúc file locale

```
src/locales/
├── en/translation.json    ← Tiếng Anh
└── vi/translation.json    ← Tiếng Việt
```

Translation key được tổ chức theo namespace phân cấp:

```json
{
  "nav": {
    "dashboard": "Dashboard",
    "portfolio": "Portfolio",
    "watchlist": "Watchlist",
    "news": "News",
    "chat": "AI Chat"
  },
  "dashboard": {
    "price": "Price",
    "change": "Change",
    "volume": "Volume"
  },
  "auth": {
    "login": "Login",
    "register": "Register",
    "logout": "Logout"
  }
}
```

Namespace phân cấp ngăn xung đột key giữa các tính năng (ví dụ `auth.title` và `dashboard.title`) và giúp tìm kiếm key theo module khi phát triển.

## Sử dụng trong component

```typescript
import { useTranslation } from "react-i18next";

const MyComponent = () => {
  const { t } = useTranslation();
  
  return (
    <nav>
      <a>{t("nav.dashboard")}</a>
      <a>{t("nav.portfolio")}</a>
    </nav>
  );
};
```

`t()` là hàm tra cứu key trong locale hiện tại. Khi key không tồn tại trong ngôn ngữ hiện tại, i18next tự động thử `fallbackLng`. Toàn bộ chuỗi UI đều đi qua `t()` — không hardcode chuỗi hiển thị trong component.

## Chuyển ngôn ngữ tại runtime

```typescript
import i18n from "i18next";

// Chuyển sang tiếng Anh
i18n.changeLanguage("en");

// Chuyển sang tiếng Việt
i18n.changeLanguage("vi");
```

`changeLanguage()` trigger re-render tất cả component đang dùng `useTranslation()` — toàn bộ UI cập nhật ngôn ngữ tức thì mà không cần reload trang. Lựa chọn ngôn ngữ được persist vào `localStorage` qua custom hook — áp dụng lại khi user mở lại tab.

## Kết hợp với nội dung động từ server

AI agent trả về text bằng ngôn ngữ do Intent Agent phát hiện (`language: "vi" | "en"`) — hoàn toàn tách biệt với ngôn ngữ UI. User có thể chọn UI tiếng Việt nhưng hỏi AI bằng tiếng Anh và nhận response tiếng Anh. Không có conflict — i18next chỉ xử lý chuỗi UI tĩnh, còn nội dung AI là dynamic content không qua translation system.

## Phạm vi đa ngôn ngữ

Toàn bộ chuỗi UI được đa ngôn ngữ hóa: navigation, button label, form placeholder, error message, loading indicator, empty state. Nội dung do người dùng tạo (bài blog, comment, tin tức từ API) được hiển thị nguyên bản không qua dịch — đây là thiết kế có chủ ý vì dịch máy nội dung financial news có thể tạo thông tin sai lệch.
