# Query & Mutation Factory

Centrally manages TanStack Query's queryKey/queryOptions and mutationKey/mutationOptions using the factory pattern.

---

## Why the Factory Pattern

- **Key consistency**: Ensures the same key is used for query calls and invalidation.
- **Central management**: All query/mutation options for a domain live in one place.
- **Type safety**: `as const` enables precise key type inference.

---

## Common Structure

query-factory and mutation-factory follow the same file layout.

```
shared/[query-factory | mutation-factory]/
├─ index.ts                         # Public interface
├─ default-[query|mutation]-keys.ts # Per-domain root keys
├─ product-[queries|mutations].ts   # Per-domain factory
└─ auth-[queries|mutations].ts
```

**Role of each file:**

- **`default-*-keys.ts`** — Manages root key values for each domain in one place. Prevents key collisions between domains and provides a single overview of all existing domains.
- **`[domain]-*.ts`** — Separates each domain into its own file, keeping all keys and options for that domain together. Changing product doesn't affect auth.
- **`index.ts`** — The only entry point for external imports. Internal file structure changes don't affect consumers.

---

## Query Factory

### Root Keys and Domain Factory

```ts
// default-query-keys.ts
export const DEFAULT_QUERY_KEYS = {
  product: 'product',
  auth: 'auth',
} as const;
```

```ts
// product-queries.ts
import { queryOptions } from '@tanstack/react-query';
import { DEFAULT_QUERY_KEYS } from './default-query-keys';
import { PRODUCT_API } from '@shared/api/product';
import type { GetProductListReq } from '@shared/api/product';

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

### Key Hierarchy

```
allKeys()    → ['product']                    # Invalidate entire domain
listKeys()   → ['product', 'list']            # Invalidate list group
detailKeys() → ['product', 'detail']          # Invalidate detail group
list(params) → ['product', 'list', params]    # Individual query
detail(id)   → ['product', 'detail', id]      # Individual query
```

- `allKeys()` is required. Used for domain-wide invalidation.
- Intermediate keys (`listKeys()`, etc.) are added when group invalidation is needed.
- All key arrays use `as const`.

### Usage

```ts
import { productQueries } from '@shared/query-factory';

// Query
const { data } = useQuery(productQueries.list({ page: 1, size: 20 }));

// Invalidation
queryClient.invalidateQueries({ queryKey: productQueries.allKeys() });
queryClient.invalidateQueries({ queryKey: productQueries.listKeys() });
```

---

## Mutation Factory

### Domain Factory

```ts
// product-mutations.ts
import { mutationOptions } from '@tanstack/react-query';
import { DEFAULT_MUTATION_KEYS } from './default-mutation-keys';
import { PRODUCT_API } from '@shared/api/product';
import type { CreateProductReq } from '@shared/api/product';

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
      mutationFn: ({ id, data }: { id: string; data: UpdateProductReq }) =>
        PRODUCT_API.updateProduct(id, data),
    }),
};
```

### Common Handlers

onSuccess, onError, and other common handlers can be provided at the factory level. When the consumer specifies additional handlers, both execute (TanStack Query default behavior).

### Complex Transactions

Multi-step flows (e.g., create order → pay) are not placed in the factory. The factory defines individual mutations only. Composition logic goes in a custom hook.

```ts
// Factory: individual mutations only
export const orderMutations = {
  create: () => mutationOptions({ ... }),
  pay: () => mutationOptions({ ... }),
};

// Custom hook: composition logic
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

---

## Key Rules

- Factories return `queryOptions()` / `mutationOptions()`. They do not call `useQuery` / `useMutation` internally.
- queryFn / mutationFn calls go through the `[DOMAIN]_API` object.
- queryKey / mutationKey are not written as raw strings outside the factory.
- No business logic in factories.

---

## Adding a New Domain

1. Add key to `default-query-keys.ts` / `default-mutation-keys.ts`
2. Create `[domain]-queries.ts` / `[domain]-mutations.ts`
3. Add export to `index.ts`
