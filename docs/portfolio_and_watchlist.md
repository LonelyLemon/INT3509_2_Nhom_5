# Báo cáo Kỹ thuật: Module Portfolio & Watchlist

> **Dự án:** MarketMind  
> **Phạm vi tài liệu:** `backend/src/portfolio/` và `backend/src/watchlist/`

---

## Mục lục

1. [Tổng quát](#1-tổng-quát)
2. [Module Portfolio](#2-module-portfolio)
   - [Cấu trúc & Data Model](#21-cấu-trúc--data-model)
   - [Tính toán P&L](#22-tính-toán-pl)
   - [Sơ đồ luồng](#23-sơ-đồ-luồng)
   - [Hệ thống API](#24-hệ-thống-api)
3. [Module Watchlist](#3-module-watchlist)
   - [Cấu trúc & Data Model](#31-cấu-trúc--data-model)
   - [Sơ đồ luồng](#32-sơ-đồ-luồng)
   - [Hệ thống API](#33-hệ-thống-api)
4. [So sánh Portfolio vs Watchlist](#4-so-sánh-portfolio-vs-watchlist)

---

## 1. Tổng quát

Hai module này là phần **cá nhân hóa** của MarketMind, cho phép người dùng theo dõi danh mục đầu tư và danh sách quan tâm của mình.

**Portfolio** — Quản lý danh mục đầu tư:
- Mỗi user có thể tạo nhiều danh mục (portfolio), trong đó một danh mục là `default`
- Mỗi danh mục chứa nhiều vị thế (holding) — thông tin về số lượng và giá mua trung bình của từng tài sản
- Tự động tính **P&L (Profit & Loss)** và **allocation** dựa trên giá thực tế mới nhất từ `price_data`

**Watchlist** — Danh sách theo dõi:
- Một danh sách phẳng per-user, theo dõi nhiều tài sản
- Hiển thị giá hiện tại và thay đổi trong ngày (% change vs ngày trước)
- Hỗ trợ sắp xếp thứ tự tùy chỉnh (drag-and-drop)

---

## 2. Module Portfolio

### 2.1 Cấu trúc & Data Model

```
backend/src/portfolio/
├── __init__.py
├── models.py      # ORM: Portfolio, Holding
├── schemas.py     # Pydantic schemas
├── exceptions.py  # HTTP exceptions
└── router.py      # API endpoints
```

**ERD:**

```
┌──────────────────────────────────────────────────┐
│                   Portfolio                      │
├──────────────────────────────────────────────────┤
│ id          : UUID (PK)                          │
│ user_id     : UUID (FK → users.id, CASCADE)     │
│              index=True                          │
│ name        : String(256), not null              │
│ description : Text, nullable                     │
│ is_default  : Boolean, default=False             │
│ created_at  : datetime                           │
│ updated_at  : datetime                           │
│                                                  │
│ holdings    : relationship → Holding[]           │
│              (cascade=all, lazy=selectin)        │
└──────────────────────────────────────────────────┘
                        │ 1:N
┌──────────────────────────────────────────────────┐
│                    Holding                       │
├──────────────────────────────────────────────────┤
│ id            : UUID (PK)                        │
│ portfolio_id  : UUID (FK → portfolios.id,        │
│                CASCADE), index=True              │
│ asset_id      : UUID (FK → assets.id, CASCADE)  │
│ quantity      : Float, not null                  │
│ avg_buy_price : Float, not null                  │
│ notes         : Text, nullable                   │
│ created_at    : datetime                         │
│ updated_at    : datetime                         │
│                                                  │
│ UNIQUE(portfolio_id, asset_id)                   │
│   └─ uq_holding_portfolio_asset                  │
│                                                  │
│ portfolio : relationship → Portfolio             │
│ asset     : relationship → Asset (lazy=selectin) │
└──────────────────────────────────────────────────┘
```

**Schemas:**

| Schema | Dùng cho | Trường chính |
|---|---|---|
| `PortfolioCreate` | Tạo portfolio | `name` (1–256), `description?`, `is_default=false` |
| `PortfolioUpdate` | Cập nhật | `name?`, `description?`, `is_default?` |
| `PortfolioResponse` | Danh sách portfolio | `id`, `name`, `description`, `is_default`, timestamps |
| `PortfolioDetailResponse` | Chi tiết + P&L | `PortfolioResponse` + `holdings[]` + `summary` |
| `HoldingCreate` | Thêm vị thế | `asset_id`, `quantity (>0)`, `avg_buy_price (>0)`, `notes?` |
| `HoldingUpdate` | Cập nhật vị thế | `quantity?`, `avg_buy_price?`, `notes?` |
| `HoldingResponse` | Vị thế + P&L | Holding data + giá thực tế + P&L + allocation |
| `PortfolioSummary` | Tổng hợp portfolio | `total_value`, `total_cost`, `total_pl_amount`, `total_pl_percentage` |
| `AssetBrief` | Thông tin tài sản | `id`, `ticker`, `name`, `asset_type` |

---

### 2.2 Tính toán P&L

Khi lấy chi tiết portfolio, backend tự động tính toán các chỉ số tài chính:

**Truy vấn giá mới nhất:**
```python
# Dùng DISTINCT ON thông qua window function
SELECT asset_id, close
FROM (
    SELECT asset_id, close,
           ROW_NUMBER() OVER (PARTITION BY asset_id ORDER BY timestamp DESC) as rn
    FROM price_data
    WHERE asset_id IN (...) AND timeframe = '1d'
) WHERE rn = 1
```

**Công thức tính cho từng holding:**

```
cost_basis     = quantity × avg_buy_price
current_value  = quantity × current_price        (None nếu không có giá)
pl_amount      = current_value - cost_basis       (None nếu không có giá)
pl_percentage  = (pl_amount / cost_basis) × 100   (None nếu cost_basis=0)
allocation     = (current_value / total_value) × 100  (None nếu không có giá)
```

**Công thức tổng hợp portfolio:**
```
total_value       = Σ (quantity_i × current_price_i)
total_cost        = Σ (quantity_i × avg_buy_price_i)
total_pl_amount   = total_value - total_cost
total_pl_pct      = (total_pl_amount / total_cost) × 100
```

**Ví dụ response HoldingResponse:**
```json
{
  "id": "uuid",
  "asset": {"id": "uuid", "ticker": "AAPL", "name": "Apple Inc.", "asset_type": "STOCK"},
  "quantity": 10.0,
  "avg_buy_price": 175.00,
  "notes": "Long-term hold",
  "created_at": "...",
  "updated_at": "...",
  "current_price": 185.10,
  "current_value": 1851.00,
  "cost_basis": 1750.00,
  "pl_amount": 101.00,
  "pl_percentage": 5.7714,
  "allocation": 35.2
}
```

**Cơ chế `is_default`:**
- Khi tạo portfolio với `is_default=true` → tất cả portfolio khác của user bị set `is_default=false` trước
- Khi xóa portfolio mặc định → portfolio cũ nhất còn lại tự động được set làm mặc định

---

### 2.3 Sơ đồ luồng

#### Luồng GET /portfolio/{id} — tính P&L

```
GET /portfolio/{portfolio_id}
    │
    ▼
_get_portfolio_or_404(portfolio_id, user_id)
  └─ SELECT portfolio WHERE id=... AND user_id=...
    │
    ▼
holdings = portfolio.holdings  (lazy=selectin, tự load)
asset_ids = [h.asset_id for h in holdings]
    │
    ▼
_latest_prices(asset_ids)
  └─ ROW_NUMBER() window query → {asset_id: latest_close}
    │
    ▼
total_value = sum(q * price for each holding)
    │
    ▼
[for each holding]
  _build_holding_response(holding, prices, total_value)
  └─ Tính: current_value, pl_amount, pl_pct, allocation
    │
    ▼
total_cost    = sum(q * avg_buy_price)
total_pl_amt  = total_value - total_cost
total_pl_pct  = total_pl_amt / total_cost * 100
    │
    ▼
Return PortfolioDetailResponse {
    ...portfolio_fields,
    holdings: [...HoldingResponse],
    summary: PortfolioSummary
}
```

---

### 2.4 Hệ thống API

Tất cả endpoints có prefix `/portfolio`. Tất cả đều yêu cầu `Bearer token`.

---

#### `GET /portfolio`

Lấy danh sách tất cả portfolios của user hiện tại (không có P&L).

**Response `200 OK`:**
```json
[
  {
    "id": "uuid",
    "name": "Main Portfolio",
    "description": "Long-term investments",
    "is_default": true,
    "created_at": "...",
    "updated_at": "..."
  }
]
```

---

#### `POST /portfolio`

Tạo portfolio mới.

**Request Body:**
```json
{
  "name": "Tech Portfolio",
  "description": "High-growth tech stocks",
  "is_default": false
}
```

**Response `201 Created`:** `PortfolioResponse`

---

#### `GET /portfolio/{portfolio_id}`

Lấy chi tiết portfolio với **đầy đủ P&L và allocation** của từng vị thế.

**Response `200 OK`:** `PortfolioDetailResponse` (xem ví dụ ở phần 2.2)

**Lỗi:** `404 Not Found` — Portfolio không tồn tại hoặc không thuộc về user

---

#### `PATCH /portfolio/{portfolio_id}`

Cập nhật thông tin portfolio. Nếu `is_default=true`, các portfolio khác bị unset.

**Request Body:** `PortfolioUpdate` (tất cả optional)

**Response `200 OK`:** `PortfolioResponse`

---

#### `DELETE /portfolio/{portfolio_id}`

Xóa portfolio và toàn bộ holdings (cascade). Nếu là portfolio mặc định, portfolio cũ nhất còn lại trở thành mặc định.

**Response:** `204 No Content`

---

#### `POST /portfolio/{portfolio_id}/holdings`

Thêm vị thế mới vào portfolio.

**Request Body:**
```json
{
  "asset_id": "uuid-of-aapl-asset",
  "quantity": 10.0,
  "avg_buy_price": 175.00,
  "notes": "Bought during dip"
}
```

**Response `201 Created`:** `HoldingResponse` với P&L ngay lập tức

**Lỗi:**
- `404 Not Found` — Portfolio hoặc Asset không tồn tại
- `409 Conflict` — Tài sản đã có trong portfolio này

---

#### `PATCH /portfolio/{portfolio_id}/holdings/{holding_id}`

Cập nhật vị thế (số lượng, giá mua trung bình, ghi chú).

**Request Body:** `HoldingUpdate` (tất cả optional)

**Response `200 OK`:** `HoldingResponse` với P&L cập nhật

---

#### `DELETE /portfolio/{portfolio_id}/holdings/{holding_id}`

Xóa vị thế khỏi portfolio.

**Response:** `204 No Content`

---

**Bảng tóm tắt API Portfolio:**

| Method | Endpoint | Auth | Mô tả |
|---|---|---|---|
| `GET` | `/portfolio` | Bearer token | Danh sách portfolios |
| `POST` | `/portfolio` | Bearer token | Tạo portfolio |
| `GET` | `/portfolio/{id}` | Bearer token | Chi tiết + P&L |
| `PATCH` | `/portfolio/{id}` | Bearer token | Cập nhật portfolio |
| `DELETE` | `/portfolio/{id}` | Bearer token | Xóa portfolio |
| `POST` | `/portfolio/{id}/holdings` | Bearer token | Thêm vị thế |
| `PATCH` | `/portfolio/{id}/holdings/{hid}` | Bearer token | Cập nhật vị thế |
| `DELETE` | `/portfolio/{id}/holdings/{hid}` | Bearer token | Xóa vị thế |

---

## 3. Module Watchlist

### 3.1 Cấu trúc & Data Model

```
backend/src/watchlist/
├── __init__.py
├── models.py      # ORM: WatchlistItem
├── schemas.py     # Pydantic schemas
├── exceptions.py  # HTTP exceptions
└── router.py      # API endpoints
```

**Data Model:**

```
┌──────────────────────────────────────────────────┐
│                  WatchlistItem                   │
├──────────────────────────────────────────────────┤
│ id        : UUID (PK)                            │
│ user_id   : UUID (FK → users.id, CASCADE),      │
│             index=True                           │
│ asset_id  : UUID (FK → assets.id, CASCADE)      │
│ position  : Integer, default=0                   │
│ created_at: datetime                             │
│ updated_at: datetime                             │
│                                                  │
│ UNIQUE(user_id, asset_id)                        │
│   └─ uq_watchlist_user_asset                     │
│                                                  │
│ asset : relationship → Asset (lazy=selectin)     │
└──────────────────────────────────────────────────┘
```

**Thiết kế đơn giản hơn Portfolio:**
- Không có bảng "Watchlist" riêng — danh sách theo dõi là một collection phẳng các `WatchlistItem` per-user
- Mỗi item chỉ lưu `asset_id` và `position` (thứ tự hiển thị)
- Không lưu giá mua, số lượng (đó là chức năng của Portfolio)

**Schemas:**

| Schema | Dùng cho |
|---|---|
| `WatchlistItemCreate` | Thêm tài sản: `{asset_id: UUID}` |
| `WatchlistReorderEntry` | Một entry trong reorder: `{asset_id, position}` |
| `WatchlistReorder` | Batch reorder: `{items: [WatchlistReorderEntry]}` |
| `WatchlistItemResponse` | Item với giá: `{id, asset, position, created_at, current_price, change_amount, change_percentage}` |
| `WatchlistResponse` | Danh sách: `{items: [], total: int}` |

---

### 3.2 Sơ đồ luồng

#### Luồng GET /watchlist — lấy danh sách với giá

```
GET /watchlist
    │
    ▼
SELECT watchlist_items
WHERE user_id = current_user.id
ORDER BY position ASC, created_at ASC
    │
    ▼
asset_ids = [item.asset_id for item in items]
    │
    ▼
_latest_two_prices(asset_ids)
  └─ ROW_NUMBER() window query (rn <= 2)
  └─ Return: {asset_id: (latest_close, prev_close)}
    │
    ▼
[for each item]
  _build_item_response(item, prices)
  └─ latest = prices[asset_id][0]
     prev   = prices[asset_id][1]
     change_amount = latest - prev
     change_pct    = change_amount / prev * 100
    │
    ▼
Return WatchlistResponse {
    items: [...WatchlistItemResponse],
    total: N
}
```

#### Luồng PATCH /watchlist/reorder — sắp xếp lại thứ tự

```
PATCH /watchlist/reorder
Body: {
  "items": [
    {"asset_id": "uuid-aapl", "position": 0},
    {"asset_id": "uuid-tsla", "position": 1},
    {"asset_id": "uuid-btc",  "position": 2}
  ]
}
    │
    ▼
[for each entry]
  SELECT ... FOR UPDATE  ← lock row
  UPDATE watchlist_items
  SET position = entry.position
  WHERE user_id = ... AND asset_id = ...
  
  (unknown asset_ids silently ignored)
    │
    ▼
db.commit()
Return {"message": "Watchlist reordered."}
```

#### Luồng POST /watchlist — thêm tài sản (idempotent)

```
POST /watchlist
Body: {"asset_id": "uuid-aapl"}
    │
    ▼
SELECT asset WHERE id = asset_id  → 404 nếu không tồn tại
    │
    ▼
next_pos = MAX(position) + 1 (hoặc 0 nếu watchlist rỗng)
    │
    ▼
INSERT INTO watchlist_items (user_id, asset_id, position=next_pos)
ON CONFLICT (user_id, asset_id) DO NOTHING
RETURNING id
    │
    ├─ new_id có giá trị → vừa insert thành công
    └─ new_id = None     → đã tồn tại, fetch row hiện có
    │
    ▼
Fetch WatchlistItem + _latest_two_prices
Return WatchlistItemResponse
```

> **Idempotent:** Thêm tài sản đã có trong watchlist không raise lỗi, trả về item hiện tại.

---

### 3.3 Hệ thống API

Tất cả endpoints có prefix `/watchlist`. Tất cả đều yêu cầu `Bearer token`.

---

#### `GET /watchlist`

Lấy toàn bộ watchlist của user, bao gồm giá mới nhất và thay đổi trong ngày.

**Response `200 OK`:**
```json
{
  "items": [
    {
      "id": "uuid",
      "asset": {
        "id": "uuid",
        "ticker": "AAPL",
        "name": "Apple Inc.",
        "asset_type": "STOCK"
      },
      "position": 0,
      "created_at": "2025-01-15T10:30:00Z",
      "current_price": 185.10,
      "change_amount": 2.30,
      "change_percentage": 1.2581
    },
    {
      "id": "uuid",
      "asset": {"ticker": "BTC-USD", "asset_type": "CRYPTO", ...},
      "position": 1,
      "current_price": 98450.00,
      "change_amount": -1200.00,
      "change_percentage": -1.2034
    }
  ],
  "total": 2
}
```

Sắp xếp theo `position ASC, created_at ASC`. Giá `None` nếu không có dữ liệu.

---

#### `POST /watchlist`

Thêm tài sản vào watchlist. **Idempotent** — không lỗi nếu đã có.

**Request Body:**
```json
{ "asset_id": "uuid-of-asset" }
```

**Response `201 Created`:** `WatchlistItemResponse`

**Lỗi:** `404 Not Found` — Asset không tồn tại

---

#### `DELETE /watchlist/{asset_id}`

Xóa tài sản khỏi watchlist theo `asset_id` (không phải watchlist item id).

**Path Parameters:** `asset_id` (UUID của tài sản)

**Response:** `204 No Content`

**Lỗi:** `404 Not Found` — Item không có trong watchlist

---

#### `PATCH /watchlist/reorder`

Sắp xếp lại thứ tự hiển thị của watchlist (batch update positions). Dùng khi user kéo thả để sắp xếp.

**Request Body:**
```json
{
  "items": [
    {"asset_id": "uuid-btc",  "position": 0},
    {"asset_id": "uuid-aapl", "position": 1},
    {"asset_id": "uuid-tsla", "position": 2}
  ]
}
```

**Response `200 OK`:**
```json
{ "message": "Watchlist reordered." }
```

> Asset IDs không tồn tại trong watchlist của user bị **bỏ qua** (silent ignore).

---

**Bảng tóm tắt API Watchlist:**

| Method | Endpoint | Auth | Mô tả |
|---|---|---|---|
| `GET` | `/watchlist` | Bearer token | Xem watchlist với giá mới nhất |
| `POST` | `/watchlist` | Bearer token | Thêm tài sản (idempotent) |
| `DELETE` | `/watchlist/{asset_id}` | Bearer token | Xóa tài sản |
| `PATCH` | `/watchlist/reorder` | Bearer token | Sắp xếp lại thứ tự |

---

## 4. So sánh Portfolio vs Watchlist

| Đặc điểm | Portfolio | Watchlist |
|---|---|---|
| Mục đích | Theo dõi đầu tư thực tế | Theo dõi tài sản quan tâm |
| Cấu trúc | Nhiều portfolio/user, nhiều holding/portfolio | Một list phẳng/user |
| Dữ liệu lưu trữ | `quantity`, `avg_buy_price`, `notes` | Chỉ `position` |
| Tính toán | P&L, allocation, tổng giá trị | Giá hiện tại, % thay đổi ngày |
| Nguồn giá | Timeframe `1d` (daily close) | Timeframe `1d` (daily close) |
| Số lượng | Nhiều portfolio | Một watchlist |
| Unique constraint | `(portfolio_id, asset_id)` | `(user_id, asset_id)` |
| Xử lý duplicate | Raise `HoldingAlreadyExists` | Idempotent (ON CONFLICT DO NOTHING) |
| Sắp xếp | Theo `created_at` | Theo `position` (tùy chỉnh) |
| Cascade delete | Portfolio → Holdings | User → WatchlistItems |

**Quan hệ giữa hai module:**
- Cả hai đều dùng `AssetBrief` schema từ `portfolio/schemas.py` (watchlist import từ portfolio)
- Cả hai query giá mới nhất bằng cùng window function pattern (`ROW_NUMBER() OVER PARTITION BY asset_id ORDER BY timestamp DESC`)
- Cả hai đều join với bảng `assets` và `price_data` của module Price
