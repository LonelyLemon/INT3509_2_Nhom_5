# Coding Conventions

## Backend Folder Structure

### Overview

The backend follows a **modular, feature-based** architecture built on FastAPI. Each distinct feature (e.g. authentication, payments, chat) lives in its own package under `src/`, while shared infrastructure lives in dedicated shared packages.

```
backend/
├── main.py                  # Script-level entrypoint (not the app)
├── pyproject.toml            # Project metadata & dependencies (uv/pip)
├── alembic.ini               # Alembic configuration
├── alembic/                  # Database migrations
│   ├── env.py
│   ├── script.py.mako
│   └── versions/             # Auto-generated migration files
├── .env                      # Environment variables (DO NOT commit)
├── .env.example              # Template for .env
└── src/                      # All application source code
    ├── __init__.py
    ├── main.py               # FastAPI app factory, middleware, lifespan
    ├── router.py             # Root API router (aggregates feature routers)
    ├── models.py             # Central model registry for Alembic autogenerate
    ├── core/                 # Shared infrastructure & configuration
    │   ├── __init__.py
    │   ├── config.py         # App settings (pydantic-settings)
    │   ├── database.py       # Engine, session factory, DB helpers
    │   ├── base_model.py     # SQLAlchemy declarative base & common mixins
    │   └── constants.py      # App-wide constants & enums
    ├── utils/                # General-purpose utility functions
    │   ├── __init__.py
    │   ├── datetime_util.py
    │   └── generate_strings.py
    └── <feature>/            # One package per feature domain
        ├── __init__.py
        ├── router.py         # API endpoints (APIRouter)
        ├── models.py         # SQLAlchemy ORM models
        ├── schemas.py        # Pydantic request/response schemas
        ├── dependencies.py   # FastAPI dependencies (Depends)
        ├── exceptions.py     # Feature-specific exception classes
        ├── security.py       # Security helpers (hashing, tokens, etc.)
        ├── utils.py          # Feature-specific utility functions
        └── <service>.py      # Domain services (e.g. email_service.py)
```

---

### Rules & Guidelines

#### 1. Feature Packages

| Rule | Detail |
|------|--------|
| **One package per domain** | Every distinct feature (auth, chat, market, …) gets its own directory under `src/`. |
| **Naming** | Use **lowercase snake_case** for package names (e.g. `auth`, `market_data`). |
| **Self-contained** | A feature package should contain all of its own routers, models, schemas, dependencies, exceptions, and utilities. Avoid cross-importing between feature packages; use `core/` or `utils/` for shared logic. |
| **`__init__.py`** | Every package **must** have an `__init__.py` (can be empty). |

#### 2. Standard Files Inside a Feature Package

Not every feature needs every file — create them **only when needed**, but always use the canonical names below:

| File | Purpose | When to Create |
|------|---------|----------------|
| `router.py` | FastAPI `APIRouter` with all endpoints for this feature | **Always** — every feature exposes at least one endpoint |
| `models.py` | SQLAlchemy ORM models | When the feature owns database tables |
| `schemas.py` | Pydantic models for request/response validation | When endpoints accept or return structured data |
| `dependencies.py` | Reusable `Depends(...)` callables (e.g. `get_current_user`) | When the feature provides injectable dependencies |
| `exceptions.py` | Custom exception classes and handlers | When the feature raises domain-specific errors |
| `security.py` | Hashing, token generation, permission checks | When the feature involves authentication or authorization |
| `utils.py` | Helper functions scoped to this feature only | When you have logic that doesn't fit the other files |
| `<service>.py` | Domain service classes (e.g. `email_service.py`, `payment_service.py`) | When there is significant business logic or external integrations |

#### 3. Shared Packages

| Package | Purpose | Examples |
|---------|---------|----------|
| `src/core/` | Infrastructure that **every** feature may depend on | `config.py`, `database.py`, `base_model.py`, `constants.py` |
| `src/utils/` | Stateless, general-purpose helper functions | `datetime_util.py`, `generate_strings.py` |

> [!IMPORTANT]
> **`core/`** is for framework-level infrastructure (DB sessions, settings, base classes).
> **`utils/`** is for pure utility functions with no framework dependency.
> Do **not** put feature-specific logic in either of these packages.

#### 4. Routing Convention

- **Root router** (`src/router.py`) defines the global API prefix (`/api/v1`) and aggregates all feature routers via `router.include_router(...)`.
- **Feature routers** should define their own `prefix` and `tags`. Example:
  ```python
  # src/auth/router.py
  auth_route = APIRouter(prefix="/auth", tags=["auth"])
  ```
- When adding a new feature, **register its router** in `src/router.py`.

#### 5. Model Registry

- `src/models.py` serves as a **central import point** for all ORM models. Alembic's `env.py` reads from here to detect schema changes.
- When you add a new model, **import it** in `src/models.py`:
  ```python
  # src/models.py
  from src.auth.models import User
  from src.chat.models import Conversation, Message  # ← add new models here
  ```

#### 6. Database Migrations (`alembic/`)

- **Never** edit migration files by hand after they have been applied.
- Generate new migrations with:
  ```bash
  alembic revision --autogenerate -m "describe change"
  ```
- Keep migration messages short and descriptive (e.g. `"add_user_avatar_column"`).

#### 7. Adding a New Feature (Checklist)

1. Create `src/<feature>/` with `__init__.py`.
2. Add `router.py` with an `APIRouter`.
3. Add `models.py`, `schemas.py`, etc. as needed.
4. Import any new ORM models in `src/models.py`.
5. Register the feature router in `src/router.py`.
6. Generate & apply an Alembic migration if models were added.
