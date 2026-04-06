# RSC + TanStack Query 패턴

> Next.js App Router에서 Server Components와 TanStack Query를 함께 사용할 때의 규칙이다.

---

## 1. `'use client'` 경계

re-export되는 FSD page는 Server Component일 수도, Client Component일 수도 있다. `'use client'`는 실제로 필요한 곳에 선언한다.

- page 전체가 훅을 사용하면 page 최상단에 `'use client'` 선언
- page 일부만 클라이언트 기능이 필요하면 해당 컴포넌트에만 선언하고 page는 Server Component로 유지

---

## 2. Provider 설정

`QueryClientProvider`는 context를 사용하므로 Client Component여야 한다. `src/app/providers.tsx`에 `'use client'`를 선언한다. 서버에서는 요청마다 새 `QueryClient`를 생성하고, 브라우저에서는 재사용한다.

```typescript
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

`layout.tsx`에서 이 Providers로 children을 감싸도, children으로 전달된 Server Component는 Server Component로 유지된다.

---

## 3. Prefetch / Dehydrate 패턴

`queryOptions()`는 `useQuery`와 `prefetchQuery` 모두에서 사용할 수 있다. prefetch 로직은 FSD page 안에서 소유하고, 루트 `app/`은 re-export 전용 원칙을 유지한다.

```typescript
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

```typescript
// src/pages/products/products-client.tsx
'use client';

import { productQueries } from '@shared/query-factory/product-queries';

export function ProductsClient() {
  const { data } = useQuery(productQueries.list({ page: 1, size: 20 }));
  return <ProductList products={data} />;
}
```

```typescript
// app/products/page.tsx — re-export 유지
export { ProductsPage as default } from '@pages/products';
```

---

## 4. 규칙

- 같은 query-factory를 서버(prefetchQuery)와 클라이언트(useQuery)에서 공유한다. 키 불일치가 발생하지 않는다.
- prefetch/dehydrate 패턴 사용 시에도 루트 `app/page.tsx`는 re-export만 수행한다. prefetch 로직은 `src/pages/` 안에 둔다.
- `staleTime`을 설정하여 SSR 직후 불필요한 refetch를 방지한다.
- Server Component에서도 `shared/api`의 `[DOMAIN]_API`를 직접 호출할 수 있다.
