# Shared API

`shared/api` is the API layer responsible for backend communication. All API definitions are managed centrally.

---

## Structure

```
shared/api/
├─ base/                       # Common infrastructure
│  ├─ base-http-client.ts      # Axios wrapper, interceptors
│  ├─ errors.ts                # Error mapping
│  └─ types.ts                 # Common response types (pagination, etc.)
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

## Key Rules

### 1. Endpoints don't transform

Endpoint files contain the API function and its request/response types together. The only allowed transformation is unwrapping `response.data`.

Field renaming, data sorting, default injection, and type conversion are all forbidden. Response types are defined exactly as the backend returns them.

When data transformation is needed, **the API consumer handles it**.

### 2. model.ts defines the backend contract only

Only domain entities and state types shared by 2+ endpoints go here. Frontend display concerns (label mapping, transformation, derived rules) belong in the upper layer consuming the API.

If there is no shared domain concept, don't create model.ts.

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
