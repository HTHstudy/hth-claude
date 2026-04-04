# RSC + TanStack Query

Patterns for using TanStack Query with Server Components in the Next.js App Router.

---

## `'use client'` Boundary

In the App Router, components are Server Components by default. Re-exported FSD pages can be either Server Components or Client Components. Declare `'use client'` where it's actually needed.

```tsx
// src/pages/products.tsx — uses hooks, so the entire page is a Client Component
'use client';

export function ProductsPage() {
  const { data } = useQuery(productQueries.list({ page: 1 }));
  return <ProductList products={data} />;
}
```

```tsx
// src/pages/about.tsx — static page, stays as Server Component (no declaration needed)
export function AboutPage() {
  return <div>About page</div>;
}
```

If only part of a page needs client features, declare `'use client'` on that component only, keeping the page itself as a Server Component.

---

## Provider Setup

`QueryClientProvider` uses context, so it must be a Client Component. Create a new `QueryClient` per request on the server, and reuse it in the browser.

```tsx
// src/app/providers.tsx
'use client';

import { isServer, QueryClient, QueryClientProvider } from '@tanstack/react-query';

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: 60 * 1000 },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

function getQueryClient() {
  if (isServer) return makeQueryClient();
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

Even when `layout.tsx` wraps children with this Providers component, children passed as props **remain Server Components.** Providers being a Client Component does not turn all child pages into Client Components.

---

## Prefetch / Dehydrate Pattern

`query-factory`'s `queryOptions()` works with both `useQuery` and `prefetchQuery`. This enables prefetching data in Server Components for instant use in Client Components:

```tsx
// src/pages/products/index.tsx — Server Component (FSD page)
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { productQueries } from '@shared/query-factory/product-queries';
import { ProductsClient } from './products-client';

export async function ProductsPage() {
  const queryClient = new QueryClient();
  await queryClient.prefetchQuery(productQueries.list({ page: 1, size: 20 }));

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ProductsClient />
    </HydrationBoundary>
  );
}
```

```tsx
// src/pages/products/products-client.tsx — Client Component
'use client';

import { productQueries } from '@shared/query-factory/product-queries';

export function ProductsClient() {
  // Prefetched data is used instantly, no additional network request
  const { data } = useQuery(productQueries.list({ page: 1, size: 20 }));
  return <ProductList products={data} />;
}
```

```tsx
// app/products/page.tsx — re-export preserved
export { ProductsPage as default } from '@pages/products';
```

### Key Points

- The same `productQueries.list()` is shared between server (prefetch) and client (useQuery), so key mismatches never occur.
- Prefetch logic lives inside the FSD page. Root `app/` maintains its re-export-only principle.
- `staleTime` prevents unnecessary refetch immediately after SSR (see Provider setup).
