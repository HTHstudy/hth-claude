# RSC + TanStack Query 패턴

> **App Router 전용.** Next.js App Router에서 Server Components와 TanStack Query를 함께 사용할 때의 규칙이다. Pages Router는 표준 SSR 패턴(`getStaticProps` / `getServerSideProps` + `dehydrate` + `HydrationBoundary`)을 그대로 사용하면 되므로 별도 가이드가 필요 없다.  
> **요구 버전:** Next.js 13+ App Router, TanStack Query v5+ (`environmentManager.isServer()` API 사용), React 18+

---

## 1. `'use client'` 경계

re-export되는 아키텍처 page는 Server Component일 수도, Client Component일 수도 있다. `'use client'`는 실제로 필요한 곳에 선언한다.

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

`queryOptions()`는 `useQuery`와 `prefetchQuery` 모두에서 사용할 수 있다. prefetch 로직은 아키텍처 page 안에서 소유하고, 루트 `app/`은 re-export 전용 원칙을 유지한다.

```typescript
// src/pages/products/index.tsx — Server Component (아키텍처 page)
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

```typescript
// src/pages/products/product-list-wrapper.tsx
'use client';

import { productQueries } from '@shared/query-factory/product-queries';

export function ProductListWrapper() {
  const { data } = useQuery(productQueries.list({ page: 1, size: 20 }));
  return <ProductList products={data} />;
}
```

```typescript
// app/products/page.tsx — re-export 유지
export { ProductsPage as default } from "@pages/products";
```

---

## 4. 규칙

- **키의 출처는 query-factory 하나다.** 서버(`prefetchQuery`)와 클라이언트(`useQuery`)가 같은 팩토리에서 키를 받으므로 키 불일치가 발생하지 않는다. 런타임 분리 도메인에서는 `queryFn`만 교체한다 (→ §5).
- prefetch/dehydrate 패턴 사용 시에도 루트 `app/page.tsx`는 re-export만 수행한다. prefetch 로직은 `src/pages/` 안에 둔다.
- `staleTime`을 설정하여 SSR 직후 불필요한 refetch를 방지한다.
- Server Component에서도 `shared/api`의 `[DOMAIN]_API`를 직접 호출할 수 있다. **단 런타임 분리 도메인은 `[domain]/server` entrypoint를 쓴다 (→ §5).**

---

## 5. 런타임 분리 도메인에서의 prefetch

같은 백엔드를 브라우저와 서버에서 각각 부르는 도메인(→ [shared-api-runtime-split.md](../layers/shared-api-runtime-split.md))은 전송이 둘이다. `queryOptions` 하나의 `queryFn`이 어느 런타임을 부를지 정해야 한다.

**`queryFn`을 가진 모듈은 런타임을 하나만 가질 수 있다.** `server-only`는 그 모듈을 import하는 모든 모듈로 전염되는데, `[resource]-queries.ts`는 클라이언트 컴포넌트가 `useQuery`로 import하는 파일이기 때문이다.

### 5.1 판별 — 서버가 받은 값을 클라이언트 캐시에 심어도 되는가

| 응답 | |
|---|---|
| **유저 상태를 나르지 않는다** (무인증 진열 등) | `prefetchQuery` + **`queryFn` 교체** (§5.2) |
| **유저별 값을 나른다** (잔여 수량·잔액 등) | **캐시에 심지 않는다.** 서버 호출은 `generateMetadata`·판정 등에만 쓰고 화면 데이터는 클라이언트가 받는다 |

서버 전송이 세션 쿠키를 싣지 않으면 비로그인 값을 받는다. 그 값을 캐시에 심으면 하이드레이션 직후 잘못된 값이 노출된다 — 예컨대 이미 못 사는 수량의 결제 버튼이 잠깐 열린다.

### 5.2 `queryFn` 교체

```typescript
// src/pages/products/index.tsx — Server Component
export async function ProductsPage({ region }: { region: RequestContext }) {
  const queryClient = new QueryClient();
  await queryClient.prefetchQuery({
    ...productQueries.list(region),                                 // 키는 팩토리에서
    queryFn: () => PRODUCT_SERVER_API.getProductsOnServer(region),  // 전송만 교체
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ProductListWrapper />
    </HydrationBoundary>
  );
}
```

**키를 여기서 다시 조립하지 않는다.** 팩토리 하나가 양쪽 키의 출처다 — 다시 조립하면 클라이언트와 갈릴 여지가 생긴다. 바꾸는 것은 `queryFn` 하나뿐이다.

`[resource]-queries.ts`는 그대로 브라우저 entrypoint를 import한다. query-factory의 구조 규칙(→ [shared-query-factory.md](../layers/shared-query-factory.md))은 바뀌지 않는다.

### 5.3 교체를 빠뜨리면

서버에서 브라우저 transport가 돈다. 상대 `baseURL`이라 요청이 실패하는데 **`prefetchQuery`는 에러를 삼키므로**(`fetchQuery`와 다르다) 페이지는 그대로 뜨고 SSR 데이터만 빈다. **화면으로는 티가 나지 않고 SEO만 조용히 죽는다.**

서버 endpoint 함수명에 런타임 접미사(`...OnServer`)를 붙이는 이유가 이것이다 — 교체 누락이 diff에서 보인다.
