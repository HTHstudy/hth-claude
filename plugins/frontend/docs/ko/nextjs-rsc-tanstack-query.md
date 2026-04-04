# RSC + TanStack Query

Next.js App Router의 Server Components 환경에서 TanStack Query를 사용할 때의 패턴을 설명합니다.

---

## `'use client'` 경계

App Router에서 컴포넌트는 기본적으로 Server Component입니다. re-export되는 FSD page는 Server Component일 수도, Client Component일 수도 있습니다. `'use client'`는 실제로 필요한 곳에 선언합니다.

```tsx
// src/pages/products.tsx — 훅을 사용하므로 전체가 Client Component
'use client';

export function ProductsPage() {
  const { data } = useQuery(productQueries.list({ page: 1 }));
  return <ProductList products={data} />;
}
```

```tsx
// src/pages/about.tsx — 정적 페이지이므로 Server Component (선언 불필요)
export function AboutPage() {
  return <div>소개 페이지</div>;
}
```

page 일부만 클라이언트 기능이 필요하면 해당 컴포넌트에만 `'use client'`를 선언하고, page 자체는 Server Component로 유지할 수 있습니다.

---

## Provider 설정

`QueryClientProvider`는 context를 사용하므로 Client Component여야 합니다. 서버에서는 요청마다 새 `QueryClient`를 생성하고, 브라우저에서는 재사용합니다.

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

`layout.tsx`에서 이 Providers로 children을 감싸도, children으로 전달된 Server Component는 **Server Component로 유지됩니다.** Providers가 Client Component라고 해서 하위 페이지 전체가 Client가 되는 것은 아닙니다.

---

## Prefetch / Dehydrate 패턴

`query-factory`의 `queryOptions()`는 `useQuery`와 `prefetchQuery` 모두에서 사용할 수 있습니다. Server Component에서 데이터를 미리 가져오고 Client Component에서 즉시 사용하는 패턴:

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
  // prefetch된 데이터가 즉시 사용됨, 추가 네트워크 요청 없음
  const { data } = useQuery(productQueries.list({ page: 1, size: 20 }));
  return <ProductList products={data} />;
}
```

```tsx
// app/products/page.tsx — re-export 유지
export { ProductsPage as default } from '@pages/products';
```

### 핵심 포인트

- 같은 `productQueries.list()`를 서버(prefetch)와 클라이언트(useQuery)에서 공유하므로 키 불일치가 발생하지 않습니다.
- prefetch 로직은 FSD page 안에서 소유합니다. 루트 `app/`은 re-export 전용 원칙을 유지합니다.
- `staleTime`을 설정하여 SSR 직후 불필요한 refetch를 방지합니다 (Provider 설정 참고).
