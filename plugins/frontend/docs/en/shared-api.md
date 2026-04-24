# Shared API

This document covers the internals of the `shared/api` Segment. Why the API layer is centralized in shared, what layers it splits into, and how domains are divided — that is the scope.

---

## Why Centralize API

API call code is needed everywhere in a project — in pages, in features, in query-factory, in server components. If every call site builds its own client, handles errors, and defines types, code for the same endpoint ends up scattered across many places. When a response schema changes, it is hard to track what to update, and cross-cutting concerns like authentication and error handling may be applied differently at each site.

This architecture gathers all API definitions into one place, `shared/api`, and enforces a **three-layer structure**.

1. **http-client** — the transport layer. Axios instances, interceptors, default settings, error normalization.
2. **endpoints** — per-endpoint function and request/response types. No transformations.
3. **public interface (`index.ts`)** — the only access point the domain exposes externally.

This stratification keeps each layer to a single responsibility. The http-client handles transport details, endpoints own the schema, and the public interface controls external exposure.

**Entities do not own APIs.** Entities own domain representation (domain UI, display logic). All API definitions live in `shared/api`, and entities import the types they need from there.

---

## Defining a Domain

`shared/api` is organized as per-domain folders. Here, **a domain is not a business entity; it is a transport area**. A domain in `shared/api` corresponds to one http-client instance, and that instance's **baseURL + common processing (interceptors, error handling)** is the domain's boundary.

Split by at least one of the following.

- **baseURL differs** — different servers, or different path prefixes on the same server
- **That group needs its own common processing** — interceptors, error handling, or headers that apply across all sub-resources of the group

Number of resources is not a criterion. If common processing is the same, organize under one domain using `endpoints/` sub-folders. Do not split a domain just because it has many resources.

---

## Full Structure

```txt
shared/api/
├─ base/                               # Common infrastructure (no direct external import)
│  ├─ base-http-client.ts              # project-portable base class
│  ├─ authenticated-http-client.ts     # intermediate class (optional)
│  ├─ errors.ts                        # HttpError, error logging
│  └─ types.ts                         # common response types
│
├─ main/                               # baseURL: 'https://api.example.com'
│  ├─ index.ts                         # public interface
│  ├─ model.ts                         # shared domain types (optional)
│  ├─ errors.ts                        # domain errors (optional)
│  ├─ main-http-client.ts              # domain HTTP client
│  └─ endpoints/
│     ├─ get-product-list.ts
│     └─ get-user.ts
│
└─ order/                              # same server but different common processing
   ├─ index.ts                         #   (baseURL: 'https://api.example.com/order')
   ├─ order-http-client.ts
   └─ endpoints/
      ├─ get-order.ts
      └─ pay-order.ts
```

---

## base — Common Infrastructure

`base/` holds transport-layer code shared by all domains. **External code (`@shared/api/base/*`) does not import it directly.** Common types that need external exposure (such as `HttpError`) are re-exposed by each domain through `extend`-and-re-export.

`base/` can contain two kinds of files.

**BaseHttpClient** is the base class for all domain HTTP clients. Keep it **project-portable** — do not put project-specific logic (auth, session, redirects) in it. This way the same BaseHttpClient works across projects.

BaseHttpClient's responsibilities:

- Apply defaults (timeout, headers). Constructor config can override.
- Expose four interceptor hooks (`onRequest`, `onRequestError`, `onResponse`, `onResponseError`) as `protected`. Subclasses override only the hooks they need.
- HTTP wrapper methods (get, post, put, patch, delete) unwrap `response.data` and return it. Endpoints do not unwrap manually.
- The default `onResponseError` normalizes `AxiosError` to `HttpError`. Errors from any domain are processed as a consistent type.

### Why this shape

**Why a class.** It binds configuration and interceptors into a single instance and lets domain clients extend by inheritance. A function factory could achieve something similar, but an inheritance hierarchy is the natural fit when several domains share an intermediate class (shared auth, shared monitoring, etc.).

**Why `protected` interceptor hooks.** The hooks become extension points that subclasses can override but outside callers cannot invoke. `public` would let any caller invoke them and break predictability; `private` would forbid overriding altogether.

**Why HTTP wrapper methods.** They keep axios's transport-layer details (the `AxiosResponse` envelope) from leaking into endpoints. Endpoints only know the shape the server returned; they do not know that the payload arrives wrapped in `res.data`. With this boundary in place, replacing the transport library would require changes only in BaseHttpClient.

```ts
// shared/api/base/base-http-client.ts
export class BaseHttpClient {
  protected axiosInstance: AxiosInstance;

  constructor(config?: AxiosRequestConfig) {
    this.axiosInstance = axios.create({ timeout: 60_000, ...config });
    // constructor registers interceptors (calls onRequest/onResponse hooks)
  }

  // Interceptor hooks — override in subclasses
  protected onRequest(config: HttpConfig): HttpConfig { return config; }
  protected onResponseError(error: AxiosError): Promise<never> {
    return Promise.reject(new HttpError(error));
  }
  // onRequestError, onResponse follow the same protected pattern

  // HTTP wrapper — unwraps response.data
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const res = await this.axiosInstance.get<T>(url, config);
    return res.data;
  }
  // post, put, patch, delete follow the same pattern
}
```

`HttpError` exposes only the necessary `AxiosError` fields in a stable shape.

```ts
// shared/api/base/errors.ts
export class HttpError extends Error {
  readonly status: number;
  readonly errorData: unknown;

  constructor(error: AxiosError) {
    super(error.message);
    this.name = 'HttpError';
    this.status = error.response?.status ?? 0;
    this.errorData = error.response?.data;
  }
}
```

**Intermediate classes** are optional files centralizing interceptors shared by multiple domains (auth, monitoring, etc.). Create only when needed. Name them by **role** — `authenticated-http-client.ts` for shared auth, `monitored-http-client.ts` for shared monitoring, `app-http-client.ts` when combining multiple concerns.

**Even when every domain uses the same auth, do not put auth into BaseHttpClient.** Separate auth into an intermediate class kept in base, and keep BaseHttpClient project-portable. Violating this rule makes BaseHttpClient unusable for the next project.

---

## Domain HTTP Client

Each domain folder has a `[domain]-http-client.ts`. It is an instance that extends BaseHttpClient (or an intermediate class) with domain-specific settings.

Three responsibilities:

- **baseURL setup** — specifies the server address the domain targets.
- **Interceptor override** — overrides when domain-specific pre/post processing is needed.
- **Transport encapsulation** — endpoints send requests through http-client methods without knowing the baseURL or auth mechanism.

Export one instance per domain as `export const`. File name format: `[domain]-http-client.ts`.

### Patterns

**When only baseURL differs**, instantiate BaseHttpClient directly with `new`. No interceptor override needed.

```ts
// shared/api/main/main-http-client.ts
export const mainHttpClient = new BaseHttpClient({ baseURL: ENV.API_URL });
```

**When the domain needs its own interceptor**, define a subclass in the domain folder that extends BaseHttpClient and overrides the hooks.

```ts
// shared/api/external/external-http-client.ts
class ExternalHttpClient extends BaseHttpClient {
  protected onRequest(config: HttpConfig): HttpConfig {
    config.headers['X-Api-Key'] = ENV.EXTERNAL_API_KEY;
    return config;
  }
}

export const externalHttpClient = new ExternalHttpClient({ baseURL: ENV.EXTERNAL_URL });
```

**When several domains share the same interceptor**, define an intermediate class in base. If every authenticated domain shares the same token-injection logic, place `AuthenticatedHttpClient` in base and have each domain client extend it.

```ts
// shared/api/base/authenticated-http-client.ts
export class AuthenticatedHttpClient extends BaseHttpClient {
  protected onRequest(config: HttpConfig): HttpConfig {
    const token = getAccessToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  }
}

// shared/api/main/main-http-client.ts — each domain only extends
export const mainHttpClient = new AuthenticatedHttpClient({ baseURL: ENV.API_URL });
```

**When multiple auth schemes exist**, split intermediate classes by role. `UserAuthHttpClient` (user Bearer token), `AdminAuthHttpClient` (admin API Key) — place each in base, and the domains using each auth scheme extend the appropriate one.

```txt
BaseHttpClient
├─ UserAuthHttpClient       ← user auth (Bearer)
│  ├─ productHttpClient
│  └─ orderHttpClient
└─ AdminAuthHttpClient      ← admin auth (API Key)
   ├─ auditHttpClient
   └─ cmsHttpClient
```

**When combining multiple concerns**, pick one of three strategies. If the concerns always travel together, merge them into one intermediate class. If the combination differs by domain group, stack concerns via inheritance chains. If the combination grows to three or more concerns, factor each interceptor into a utility function and call them from the hook of each class.

---

## Domain Folder Composition

A domain folder contains the following files.

| File | Required? | Role |
|------|-----------|------|
| `[domain]-http-client.ts` | Yes | Domain HTTP client instance |
| `endpoints/*.ts` | Yes | Per-endpoint function + request/response types |
| `index.ts` | Yes | Public interface |
| `model.ts` | Conditional | Domain types shared by 2+ endpoints or external consumers |
| `errors.ts` | Conditional | Domain errors branched on by external callers |

Conditional files are created **only when real need arises**. If no shared domain types exist, do not create `model.ts`. If external callers do not branch on the domain error type, do not create `errors.ts`. Do not create empty files or pre-built shells.

### endpoints

Create one file per endpoint. Keep the API function and its request/response types **in the same file**.

Only two transformations are allowed. Extracting `response.data` (the HTTP wrapper already does this), and unwrapping a backend common response wrapper (`{ data: T, success: boolean }` or similar) to the actual data `T`. The latter is only allowed if the common response type is defined in `base/types.ts`.

Forbidden transformations:
- Renaming fields (including snake_case → camelCase)
- Sorting/filtering data
- Injecting defaults
- Deriving fields
- Restructuring for UI representation
- Converting a string to `Date` or another type

Response types are defined **exactly as the backend returns them**. When transformation is needed, the API consumer (page, feature, entity) handles it.

The reason for this constraint is to **keep endpoints as the Transport layer**. The moment transformations enter endpoints, backend schema and frontend representation mix in one file. Schema changes start destroying frontend representations, and when one endpoint needs multiple representations, transformation logic begins growing in the oddest places.

```ts
// shared/api/product/endpoints/get-product-list.ts
type GetProductListReq = { category?: string; page: number; size: number };
type GetProductListRes = DefaultResponse<{ items: ProductItem[]; totalCount: number }>;

export const getProductList = (params: GetProductListReq) =>
  productHttpClient.get<GetProductListRes>('/products', { params });
```

### model.ts

`model.ts` defines **domain entities, state types, and constants shared by 2+ endpoints or external consumers**. It contains the backend contract only. Frontend representation concerns (display mapping, transformations, derived rules) belong in the upper layer consuming the API.

Do not place endpoint-specific request/response types in `model.ts`. Place them in the relevant `endpoints/*.ts`. If no shared domain types exist, do not create `model.ts`.

```ts
// shared/api/product/model.ts
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

### errors.ts

Create a `errors.ts` in the domain folder only when external callers (page, feature, etc.) need to branch on the domain's error type. If common processing (the domain http-client's `onResponseError`, a global error boundary) covers it, do not create it.

Domain errors follow these conventions.

- Extend `HttpError` from `base/errors.ts`.
- Include the domain name in the `name` field (`'ProductHttpError'`, `'OrderHttpError'`, etc.). Used for `instanceof` branching and log separation.
- Wrap into the domain error and throw from the domain http-client's `onResponseError`.
- Re-export from `index.ts`.

`HttpError` in `base/errors.ts` is not imported externally. If external exposure is needed, a domain extends it and re-exports from its `index.ts`. This rule preserves both base's external-isolation and the domain boundary.

```ts
// shared/api/order/errors.ts
import { HttpError } from '../base/errors';

export class OrderHttpError extends HttpError {
  name = 'OrderHttpError';
}

// shared/api/order/order-http-client.ts
class OrderHttpClient extends AuthenticatedHttpClient {
  protected onResponseError(error: AxiosError): Promise<never> {
    return Promise.reject(new OrderHttpError(error));
  }
}
```

```ts
// external call site — branching on the domain error
try {
  await ORDER_API.payOrder({ orderId });
} catch (e) {
  if (e instanceof OrderHttpError && e.status === 409) {
    // handle payment conflict
  }
}
```

### index.ts

`index.ts` is the **single entrypoint** the domain exposes externally.

- API functions are not individually exported. They are grouped as a `[DOMAIN]_API` object.
- Types and constants exposed externally are **explicitly** re-exported. `export *` is not used.
- Endpoint-specific request/response types and domain model are re-exported separately. Use section comments if helpful.
- Endpoint-specific types are exposed **only when external code actually needs them**.

The reason for grouping API functions as an object is to make the domain visible with one import. `PRODUCT_API.getProductList(...)` makes the domain obvious in the reader's mind.

```ts
// shared/api/product/index.ts

// --- Public API ---
import { getProductList } from './endpoints/get-product-list';
import { createProduct } from './endpoints/create-product';

export const PRODUCT_API = {
  getProductList,
  createProduct,
};

// --- Public endpoint types ---
export type { GetProductListReq } from './endpoints/get-product-list';
export type { CreateProductReq } from './endpoints/create-product';

// --- Public domain model ---
export type { ProductItem, ProductStatus } from './model';
export { PRODUCT_STATUS } from './model';
```

---

## Accessing from Outside a Domain

Code outside a domain imports only `@shared/api/[domain]`. Internal files are not accessed directly.

```txt
✅ @shared/api/product                       # index.ts entrypoint
❌ @shared/api/product/endpoints/...         # direct internal access forbidden
❌ @shared/api/product/model                 # direct internal access forbidden
❌ @shared/api/product/product-http-client   # direct internal access forbidden
```

This constraint can be enforced statically (`no-restricted-imports` with the `@shared/api/*/*` pattern).

Inside a domain, use relative paths. Even when referencing shared types in `base/` or the same domain's `model.ts`, use relative paths.

---

## Adding a New Domain

1. Create the `shared/api/[domain]/` folder.
2. `[domain]-http-client.ts` — extend base-http-client (or an intermediate class).
3. `endpoints/` — create per-endpoint files (function + request/response types).
4. `model.ts` — only when shared domain types exist.
5. `errors.ts` — only when external callers branch on the domain error.
6. `index.ts` — export the `[DOMAIN]_API` object and explicitly re-export needed types and errors.

The `@shared/api/*/*` static-analysis pattern, once configured, needs no per-domain adjustment.

---

## Naming Summary

| Item | Rule | Example |
|------|------|---------|
| File name | kebab-case by URL/function | `get-product-list.ts`, `update-user-profile.ts` |
| Request type | PascalCase + `Req` | `GetProductListReq`, `CreateOrderReq` |
| Response type | PascalCase + `Res` | `GetProductListRes`, `CreateOrderRes` |
| API function | camelCase, verb+noun | `getProductList`, `createOrder` |
| HTTP client | `[domain]-http-client.ts` | `main-http-client.ts`, `order-http-client.ts` |
| API object | `[DOMAIN]_API` | `PRODUCT_API`, `ORDER_API` |

---

## Summary

- APIs are centralized in `shared/api` with a forced three-layer structure (http-client / endpoints / public interface).
- A domain is divided by transport area (baseURL + common processing), not business. Resource count is not a criterion.
- `base/` is not imported externally. When external exposure is needed, a domain extends and re-exports.
- BaseHttpClient is project-portable. Auth and session go into an intermediate class or domain http-client.
- Endpoints do not transform. Response types match the backend's shape exactly.
- `model.ts` and `errors.ts` are created only when real need arises.
- `index.ts` defines the public interface via the `[DOMAIN]_API` object and explicit re-exports.
