# Next.js RSC + TanStack Query

This document covers patterns for using Server Components with TanStack Query in Next.js App Router. When both technologies coexist, **a boundary forms between client and server**, and structural choices depend on how that boundary is crossed.

It applies only to projects using both Next.js App Router and TanStack Query v5+.

---

## Why a Separate Document

Server Components render on the server and return HTML; they cannot use hooks or browser APIs. TanStack Query uses hooks like `useQuery` and requires a context-based `QueryClientProvider`. When the two meet, two questions arise.

- Which code is a Client Component and which is a Server Component?
- How do you connect data fetched by a Server Component into a Client Component's query cache?

This document answers both. Most answers come from one fact — **`shared/query-factory`'s `queryOptions()` produces the same key on both server and client**.

---

## The 'use client' Boundary

In App Router, components are Server Components by default. An architecture page that is re-exported may be either a Server Component or a Client Component. **Declare `'use client'` only where it is actually needed.**

- **If the entire page uses hooks**, declare `'use client'` at the top of the page
- **If only parts of the page need client features**, declare on those components only and keep the page as a Server Component

Making a whole page a Client Component unconditionally loses the benefits of server rendering. Keeping the page as a Server Component while placing Client components inside allows static parts to render on the server and interactive parts on the client.

---

## Provider Setup

`QueryClientProvider` uses context, so it must be a Client Component. Declare `'use client'` in the architecture `app` layer's `providers.tsx`.

`QueryClient` management differs between server and client. **Create a new `QueryClient` per request on the server**, and **reuse a singleton on the browser**. Reusing on the server would allow caches to bleed across requests, potentially exposing one user's query result to another.

```ts
// src/app/providers.tsx
'use client';

import { environmentManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: 60 * 1000 },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

function getQueryClient() {
  if (environmentManager.isServer()) return makeQueryClient();
  if (!browserQueryClient) browserQueryClient = makeQueryClient();
  return browserQueryClient;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
```

Even when `layout.tsx` wraps children in this Providers, **Server Components passed as children remain Server Components**. The Providers being a Client Component does not turn the entire page subtree into Client.

Setting `staleTime` prevents an unnecessary immediate refetch on the client right after SSR.

---

## Prefetch / Dehydrate Pattern

The pattern where a Server Component fetches data in advance, and a Client Component uses it immediately. The key is that **the same `queryOptions()` is shared between server and client**.

### Structure

Keep the page itself a Server Component, and render a Client wrapper inside.

```ts
// src/pages/products/index.tsx — Server Component
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { productQueries } from '@shared/query-factory/product-queries';
import { ProductListWrapper } from './product-list-wrapper';

export async function ProductsPage() {
  const queryClient = new QueryClient();
  await queryClient.prefetchQuery(productQueries.list({ page: 1, size: 20 }));

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ProductListWrapper />
    </HydrationBoundary>
  );
}
```

```ts
// src/pages/products/product-list-wrapper.tsx — Client Component
'use client';

import { useQuery } from '@tanstack/react-query';
import { productQueries } from '@shared/query-factory/product-queries';

export function ProductListWrapper() {
  const { data } = useQuery(productQueries.list({ page: 1, size: 20 }));
  return <ProductList products={data} />;
}
```

```ts
// app/products/page.tsx — re-export preserved
export { ProductsPage as default } from '@pages/products';
```

### Why this works

Server's `prefetchQuery` and client's `useQuery` both call the same `productQueries.list(params)`, so **queryKey matches**. The cache filled on the server is carried to the client by `HydrationBoundary`, and the Client wrapper receives a cache hit the moment it mounts, rendering data without an extra network call.

Since the key is defined only once in the factory, the mistake of producing different keys on server and client is structurally prevented. This is the benefit of query-factory's **shareability**.

### Where to put prefetch

prefetch logic stays in `src/pages/`. The root `app/products/page.tsx` remains re-export only. When the root routing file owns prefetch logic directly, the "root is re-export only" rule breaks.

The `generateMetadata` exception (direct `@shared/api` import) does not apply here. That exception exists because Next.js forces `generateMetadata` to be exported from `page.tsx`; prefetch has no such constraint.

---

## Direct API Calls from Server Components

Server Components can also call [shared-api](shared-api.md)'s `[DOMAIN]_API` directly. The axios-based client works in the server environment, enabling a simpler pattern where the server fetches data and passes it as props without prefetching.

```ts
// src/pages/about.tsx — Server Component
import { PRODUCT_API } from '@shared/api/product';

export async function AboutPage() {
  const featured = await PRODUCT_API.getFeaturedProduct();
  return <FeaturedProductView product={featured} />;
}
```

This pattern fits when **the data does not need to enter a client cache**. Use it for static display areas without user interaction, or when the page is entirely a Server Component. When the same data needs client reuse or invalidation, use the prefetch + Hydrate pattern.

---

## Summary

- Pages are Server Components by default. Declare `'use client'` only where hooks are needed.
- Create `QueryClient` per request on the server; reuse as a singleton on the browser.
- The same `queryOptions()` is shared between server (prefetch) and client (useQuery), guaranteeing key alignment.
- prefetch logic lives in `src/pages/`. Root routing files stay re-export only.
- Server Components may call `[DOMAIN]_API` directly — a simple pattern when client reuse is not needed.
