# Query & Mutation Factory

This document covers the `shared/query-factory` and `shared/mutation-factory` Segments for projects using TanStack Query. If the project does not use TanStack Query, this document can be skipped.

---

## Why a Factory

TanStack Query identifies cache entries by queryKey and mutationKey. For the same data, the caller and the invalidator **must use exactly the same key** for things to work as intended. When keys are written as string arrays across many places, subtly different keys emerge for the same data, and schema changes fail to refresh some call sites.

The factory pattern **creates keys and options in a single place**. Both the call and the invalidation go through the same factory function, so keys align naturally, and per-domain options (staleTime, retry, etc.) live in one spot. It connects naturally with [shared-api](shared-api.md)'s `[DOMAIN]_API` objects, keeping the domain boundary consistent from API definition to query key.

---

## Structure

query-factory and mutation-factory share the same file layout.

```txt
shared/[query-factory | mutation-factory]/
├─ default-[query|mutation]-keys.ts    # default keys per domain
├─ product-[queries|mutations].ts      # factory per domain
└─ order-[queries|mutations].ts
```

Each file's role:

**`default-*-keys.ts`** manages the root value of each domain's keys in one place. This prevents key collisions between domains and gives a bird's-eye view of which domains exist.

**`[domain]-*.ts`** separates per-domain factory files, so all keys and options for a domain live in one file. Changing the product factory does not touch the order factory.

**No barrel (`index.ts`).** External code imports files directly (`@shared/query-factory/product-queries`). A barrel inflates the dependency graph and blocks tree-shaking without adding value in this Segment.

---

## Query Factory

### Default keys and factory

Default keys per domain are defined as a single constant object.

```ts
// default-query-keys.ts
export const DEFAULT_QUERY_KEYS = {
  product: 'product',
  order: 'order',
} as const;
```

Per-domain factories consist of key functions and query-option functions.

```ts
// product-queries.ts
export const productQueries = {
  allKeys: () => [DEFAULT_QUERY_KEYS.product] as const,
  listKeys: () => [...productQueries.allKeys(), 'list'] as const,
  detailKeys: () => [...productQueries.allKeys(), 'detail'] as const,

  list: (params: GetProductListReq) =>
    queryOptions({
      queryKey: [...productQueries.listKeys(), params] as const,
      queryFn: () => PRODUCT_API.getProductList(params),
    }),

  detail: (id: string) =>
    queryOptions({
      queryKey: [...productQueries.detailKeys(), id] as const,
      queryFn: () => PRODUCT_API.getProductDetail(id),
    }),
};
```

### Key hierarchy

Keys are assembled hierarchically.

```txt
allKeys()    → ['product']                    # invalidate entire domain
listKeys()   → ['product', 'list']             # invalidate list group
detailKeys() → ['product', 'detail']           # invalidate detail group
list(params) → ['product', 'list', params]     # individual query
detail(id)   → ['product', 'detail', id]       # individual query
```

`allKeys()` is required — used for domain-wide invalidation. Intermediate keys (`listKeys()`, etc.) are added only when group invalidation is needed. Every key array uses `as const` for precise type inference.

### Invalidation

The same factory is used for both calling and invalidating.

```ts
const { data } = useQuery(productQueries.list({ page: 1, size: 20 }));

queryClient.invalidateQueries({ queryKey: productQueries.allKeys() });   // entire domain
queryClient.invalidateQueries({ queryKey: productQueries.listKeys() });  // list group
```

### Factory boundaries

Factory functions **return options objects only**. They do not call `useQuery` internally. Passing the options to `useQuery` is the caller's responsibility.

No business logic in the factory. When data transformation is needed, specify `select` at the call site. The queryFn calls through `shared/api`'s `[DOMAIN]_API` object — it does not call the API directly.

---

## Mutation Factory

### Basic structure

The structure matches query-factory.

```ts
// default-mutation-keys.ts
export const DEFAULT_MUTATION_KEYS = {
  product: 'product',
  order: 'order',
} as const;
```

```ts
// product-mutations.ts
export const productMutations = {
  allKeys: () => [DEFAULT_MUTATION_KEYS.product] as const,

  create: () =>
    mutationOptions({
      mutationKey: [...productMutations.allKeys(), 'create'] as const,
      mutationFn: (data: CreateProductReq) => PRODUCT_API.createProduct(data),
    }),

  update: () =>
    mutationOptions({
      mutationKey: [...productMutations.allKeys(), 'update'] as const,
      mutationFn: ({ id, data }: UpdateProductArgs) =>
        PRODUCT_API.updateProduct(id, data),
    }),
};
```

---

## Handler Scope

Mutations carry more side effects than queries. Invalidation on success, notification on failure, loading indicators on start — where these handlers live matters. This architecture **places handlers differently by scope**.

Three scopes:

**Mutation default handler** — per-mutation default behavior. Applied everywhere that mutation is used, with call-site override or addition.

**Domain-common handler** — handler shared across multiple mutations of one domain. Two techniques, chosen by whether overriding is allowed.

**Global handler** — handler applied to all mutations regardless of domain.

### Mutation default handler

Define the default behavior of an individual mutation inside the factory's `mutationOptions`.

```ts
create: () =>
  mutationOptions({
    mutationKey: [...productMutations.allKeys(), 'create'] as const,
    mutationFn: (data: CreateProductReq) => PRODUCT_API.createProduct(data),
    onSuccess: () => {
      // create default handling
    },
  }),
```

Call sites extend in one of two ways.

**Default + per-call addition** — pass handlers to `mutate()`. The factory default (first) and per-call (later) **both run**.

```ts
const { mutate } = useMutation(productMutations.create());
mutate(data, {
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: productQueries.allKeys() });
  },
});
```

**Default ignored + override** — spread into `useMutation` options and replace the handler. The factory default does not run. Use only for special situations where the default behavior must be skipped.

```ts
const { mutate } = useMutation({
  ...productMutations.create(),
  onSuccess: () => {
    // default ignored, this handler only
  },
});
```

### Domain-common handler

Choose one of two techniques for handlers shared across multiple mutations of a domain.

**Reuse a factory helper — overridable.** Apply selectively or across all mutations in the domain. Good fit for "default but skippable" behaviors like automatic toasts or optional redirects.

```ts
const onProductSuccess = () => {
  queryClient.invalidateQueries({ queryKey: productQueries.allKeys() });
};

export const productMutations = {
  create: () =>
    mutationOptions({
      mutationKey: [...productMutations.allKeys(), 'create'] as const,
      mutationFn: (data: CreateProductReq) => PRODUCT_API.createProduct(data),
      onSuccess: () => {
        // mutation-specific handling
        onProductSuccess();
      },
    }),
  update: () =>
    mutationOptions({
      mutationKey: [...productMutations.allKeys(), 'update'] as const,
      mutationFn: ({ id, data }) => PRODUCT_API.updateProduct(id, data),
      onSuccess: onProductSuccess,  // helper only
    }),
};
```

**`MutationCache` + mutationKey filtering — not overridable.** Good fit for processing that must run across an entire domain (cache invalidation, logging, analytics). Filter by the mutationKey's root (the domain).

```ts
new QueryClient({
  mutationCache: new MutationCache({
    onSuccess: (data, variables, context, mutation) => {
      const [domain] = (mutation.options.mutationKey as string[]) ?? [];
      if (domain === DEFAULT_MUTATION_KEYS.product) {
        // product-wide common handling (always runs)
      }
    },
  }),
});
```

Do not use this technique for fine-grained filtering that matches only specific mutations — that case calls for helper reuse or the default handler.

### Global handler

For handlers applied to all mutations regardless of domain, **prefer `MutationCache`**.

```ts
new QueryClient({
  mutationCache: new MutationCache({
    onError: (error, variables, context, mutation) => {
      // always runs for any mutation error
    },
  }),
});
```

Use `QueryClient.defaultOptions.mutations` for configuration values (`retry`, `gcTime`, etc.). Use callback forms (`onSuccess`/`onError`/`onSettled`) only in the rare case where an overridable global default is truly needed.

### Scope summary

| Scope | Definition site | Applies to | Overridable |
|-------|----------------|-----------|-------------|
| Mutation default | factory `mutationOptions.onSuccess` | everywhere that mutation is used | yes |
| Domain common | factory helper reuse | selectively within the domain | yes |
| Domain common | `MutationCache` + mutationKey filter | entire domain | no |
| Global | `MutationCache` (no filter) | all mutations | no |
| Global | `QueryClient.defaultOptions.mutations` | all mutations | yes |

---

## Complex Transactions

Composite flows that run multiple mutations sequentially **do not belong in the factory**. Define only individual mutations in the factory; compose them in a custom hook.

```ts
// factory — only individual mutations
export const orderMutations = {
  allKeys: () => [DEFAULT_MUTATION_KEYS.order] as const,

  create: () =>
    mutationOptions({
      mutationKey: [...orderMutations.allKeys(), 'create'] as const,
      mutationFn: (params: CreateOrderReq) => ORDER_API.createOrder(params),
    }),

  pay: () =>
    mutationOptions({
      mutationKey: [...orderMutations.allKeys(), 'pay'] as const,
      mutationFn: (orderId: string) => ORDER_API.payOrder(orderId),
    }),
};
```

```ts
// custom hook — composition logic
export function useCreateAndPayOrder() {
  const create = useMutation(orderMutations.create());
  const pay = useMutation(orderMutations.pay());

  const handleOrder = async (params: CreateOrderReq) => {
    const { orderId } = await create.mutateAsync(params);
    await pay.mutateAsync(orderId);
  };

  return { handleOrder };
}
```

Keeping factories at the per-mutation level keeps each mutation independently reusable, and composite flows become visibly composed.

---

## Dependency Between Segments

query-factory and mutation-factory are limited in what they can import within `shared`.

| Segment | May import | Forbidden |
|---------|------------|-----------|
| `query-factory` | `api`, `config` | `ui`, `hooks`, `mutation-factory` |
| `mutation-factory` | `api`, `config` | `ui`, `hooks`, `query-factory` |

query-factory and mutation-factory **do not import each other**. The two are independent concerns, and once they reference each other, invalidation dependencies become bidirectional and quickly unmanageable.

---

## Naming

- File: `[domain]-queries.ts`, `[domain]-mutations.ts` (kebab-case)
- Factory object: `[domain]Queries`, `[domain]Mutations` (camelCase)
- Key functions: `allKeys`, `listKeys`, `detailKeys`, etc. with the `*Keys` suffix
- Mutation function name: verb form (`create`, `update`, `delete`)

---

## Single-Use Queries/Mutations Too?

**Recommended.** Even with a single call site, going through a factory guarantees key consistency and invalidation convenience. When a second call site appears, adding a call is enough — no new factory needed.

Not enforced, though. For prototyping or one-off calls, direct `useQuery`/`useMutation` is acceptable. Even then, go through `[DOMAIN]_API`.

---

## Summary

- A factory secures queryKey/mutationKey consistency. Calls and invalidation go through the same factory.
- Per-domain files for both query-factory and mutation-factory. No barrel.
- Key hierarchy: `allKeys` → `listKeys`/`detailKeys` → individual queries. All keys with `as const`.
- Factories return options objects only. Hook calls and business logic live outside.
- Mutation handlers vary by scope — mutation default / domain common / global.
- Compose complex transactions in a custom hook.
- query-factory and mutation-factory do not import each other.
