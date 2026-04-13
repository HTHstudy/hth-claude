# Shared API

`shared/api` is the API layer responsible for backend communication. All API definitions are managed centrally.

---

## Structure

```
shared/api/
├─ base/                       # Common infrastructure
│  ├─ base-http-client.ts      # BaseHttpClient class (project-portable)
│  ├─ [auth]-http-client.ts    # Intermediate class (optional — shared auth groups)
│  ├─ errors.ts                # Error mapping
│  └─ types.ts                 # Common response types
│
├─ product/                    # Per-domain folder
│  ├─ index.ts                 # Public interface (only external access point)
│  ├─ model.ts                 # Shared domain types (conditionally created)
│  ├─ product-http-client.ts   # Domain HTTP client
│  └─ endpoints/               # Per-endpoint files
│     ├─ get-product-list.ts
│     └─ create-product.ts
│
└─ auth/                       # All domains follow the same pattern
   ├─ index.ts
   ├─ auth-http-client.ts
   └─ endpoints/
```

---

## base/ — Common Infrastructure

The `base/` folder contains transport-layer code shared by all domains.

```
shared/api/base/
├─ base-http-client.ts      # BaseHttpClient class (project-portable)
├─ [auth]-http-client.ts    # Intermediate class (optional — shared auth groups)
├─ errors.ts                # Error mapping, common error class
└─ types.ts                 # Common response types
```

The `base/` folder can contain two types of files:
- **BaseHttpClient** — A portable base class that works across projects. Contains no project-specific logic (auth, session).
- **Intermediate classes** — Project-specific interceptors shared by multiple domains (auth, monitoring, etc.). Created only when needed.

### BaseHttpClient

The base class for all domain HTTP clients. It applies default settings (timeout, headers) and exposes `protected` interceptor hooks that domain HTTP clients can override.

- `onRequest` — Request preprocessing (e.g., auth token injection)
- `onRequestError` — Request error handling
- `onResponse` — Response postprocessing (e.g., session expiry detection)
- `onResponseError` — Response error handling (default: converts to `HttpError`)

HTTP wrapper methods (get, post, put, patch, delete) unwrap `response.data` automatically. Endpoints don't need to unwrap manually.

### What goes in base / What doesn't

| Include | Exclude |
|---------|---------|
| Axios creation, default timeout/headers | Auth token injection |
| `HttpError` class, error logging | Session expiry handling |
| `DefaultResponse` common response type | Response code redirects |
| `response.data` unwrapping wrappers | |

Rule of thumb: **"Is this shared by all domains?"** — If yes, it belongs in base. If no, override it in the domain HTTP client.

---

## Domain HTTP Client

Each domain folder contains a `[domain]-http-client.ts`. It's an adapter that applies domain-specific settings (baseURL, auth, etc.) to BaseHttpClient.

### Why separate?

- **baseURL isolation** — Resources on the same server share one http-client; different servers get separate http-clients.
- **Interceptor isolation** — Separate request preprocessing for authenticated vs. public domains.
- **Transport encapsulation** — Endpoints don't need to know about baseURL or auth details.

### Two Patterns

**Basic — when only baseURL differs:**

```ts
import { BaseHttpClient } from '../base/base-http-client';
import { ENV } from '@shared/config/env';

export const mainHttpClient = new BaseHttpClient({
  baseURL: ENV.API_URL,
});
```

**Extended — interceptor override (auth, etc.):**

```ts
import { BaseHttpClient } from '../base/base-http-client';
import type { HttpConfig } from '../base/base-http-client';
import { ENV } from '@shared/config/env';

class MainHttpClient extends BaseHttpClient {
  protected onRequest(config: HttpConfig): HttpConfig {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  }
}

export const mainHttpClient = new MainHttpClient({
  baseURL: ENV.API_URL,
});
```

When multiple domains share the same auth logic, create an intermediate class and have domain clients inherit from it.

---

## Key Rules

### 1. Endpoints don't transform

Endpoint files contain the API function and its request/response types together. The allowed transformations are unwrapping `response.data` and extracting the actual data from a common backend response wrapper (e.g., `{ data: T }`). The common response type must be defined in `base/types.ts`.

Field renaming, data sorting, default injection, and type conversion are all forbidden. Response types are defined exactly as the backend returns them.

When data transformation is needed, **the API consumer handles it**.

### 2. model.ts defines the backend contract only

Only domain entities and state types shared by 2+ endpoints go here. Frontend display concerns (label mapping, transformation, derived rules) belong in the upper layer consuming the API.

If there is no shared domain type, don't create model.ts.

```ts
// model.ts — backend contract types only
export const PRODUCT_STATUS = {
  ACTIVE: 'ACTIVE',
  SOLD_OUT: 'SOLD_OUT',
  HIDDEN: 'HIDDEN',
} as const;

export type ProductStatus = (typeof PRODUCT_STATUS)[keyof typeof PRODUCT_STATUS];

export type ProductItem = {
  id: string;
  name: string;
  price: number;
  status: ProductStatus;
};
```

### 3. index.ts is the only external access point

API functions are grouped into a `[DOMAIN]_API` object for export. External code imports only from `@shared/api/[domain]`.

```ts
// index.ts
import { getProductList } from './endpoints/get-product-list';
import { createProduct } from './endpoints/create-product';

export const PRODUCT_API = {
  getProductList,
  createProduct,
};

// Re-export only types needed externally
export type { GetProductListReq } from './endpoints/get-product-list';
export type { ProductItem, ProductStatus } from './model';
export { PRODUCT_STATUS } from './model';
```

### 4. Enforce with ESLint

```
✅ @shared/api/product                       (index.ts entrypoint)
❌ @shared/api/product/endpoints/...         (direct internal access)
❌ @shared/api/product/model                 (direct internal access)
❌ @shared/api/product/product-http-client   (direct internal access)
```

```js
"no-restricted-imports": ["error", {
  patterns: [
    {
      group: ["@shared/api/*/*"],
      message: "Cannot import API internals directly. Use the entrypoint instead.",
    },
  ],
}]
```

---

## Adding a New Domain

1. Create `shared/api/[domain]/` folder
2. `[domain]-http-client.ts` — extend base-http-client
3. `endpoints/` — per-endpoint files (function + req/res types)
4. `model.ts` — only when shared domain types exist
5. `index.ts` — export `[DOMAIN]_API` object
6. ESLint rule already covers it via `@shared/api/*/*` pattern

---

## Conventions

- File names: kebab-case (`get-product-list.ts`)
- Type names: PascalCase + suffix (`GetProductListReq`, `GetProductListRes`)
- API function names: camelCase, verb+noun (`getProductList`)
- HTTP client: `[domain]-http-client.ts`
- Within domain: relative path imports
- Outside domain: `@shared/api/[domain]` entrypoint only
