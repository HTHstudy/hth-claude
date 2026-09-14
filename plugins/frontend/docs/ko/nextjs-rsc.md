# Next.js RSC + TanStack Query

이 문서는 Next.js App Router에서 Server Components와 TanStack Query를 함께 쓸 때의 패턴을 다룬다. 두 기술이 같은 프로젝트에 있으면 **클라이언트와 서버 사이에 경계가 생기고**, 그 경계를 어떻게 넘느냐에 따라 구조 선택이 달라진다.

이 문서는 Next.js App Router와 TanStack Query v5+를 함께 쓰는 프로젝트만 해당한다.

---

## 왜 별도 문서인가

Server Components는 서버에서 렌더링되어 HTML을 반환하고, 훅과 브라우저 API를 쓸 수 없다. TanStack Query는 `useQuery` 같은 훅을 쓰며, context 기반 `QueryClientProvider`가 필요하다. 두 기술이 만나면 두 가지 질문이 생긴다.

- 어떤 코드가 Client Component이고 어떤 코드가 Server Component인가
- Server Component에서 가져온 데이터를 Client Component의 쿼리 캐시에 어떻게 연결하는가

이 문서는 그 두 질문에 답한다. 대부분의 답은 **`shared/query-factory`의 `queryOptions()`가 서버와 클라이언트 양쪽에서 같은 키를 만든다**는 사실에서 나온다.

---

## 'use client' 경계

App Router에서 컴포넌트는 기본적으로 Server Component다. 아키텍처의 re-export되는 page는 Server Component일 수도, Client Component일 수도 있다. **`'use client'`는 실제로 필요한 곳에만 선언한다.**

- **page 전체가 훅을 사용**하면 page 최상단에 `'use client'` 선언
- **page 일부만 클라이언트 기능이 필요**하면 해당 컴포넌트에만 선언하고 page는 Server Component로 유지

page 전체를 무조건 Client로 만들면 서버 렌더링의 이점을 잃는다. 반대로 page를 Server로 유지하면서 부분적으로 Client 컴포넌트를 두면, 정적 부분은 서버에서, 인터랙티브 부분만 클라이언트에서 처리할 수 있다.

---

## Provider 설정

`QueryClientProvider`는 context를 사용하므로 Client Component여야 한다. 아키텍처 `app` 레이어의 `providers.tsx`에 `'use client'`를 선언한다.

서버와 클라이언트의 `QueryClient` 관리 방식이 다르다. 서버에서는 **요청마다 새 `QueryClient`를 생성**하고, 브라우저에서는 **싱글톤으로 재사용**한다. 서버에서 재사용하면 요청 간 캐시가 섞여 누군가의 쿼리 결과가 다른 사용자에게 보일 수 있다.

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

`layout.tsx`가 이 Providers로 children을 감싸도, children으로 전달된 Server Component는 **Server Component로 유지된다**. Providers가 Client Component라고 해서 하위 page 전체가 Client로 바뀌는 것은 아니다.

`staleTime`을 설정해 두면 SSR 직후 클라이언트가 즉시 refetch하는 불필요한 네트워크 호출을 막을 수 있다.

---

## Prefetch / Dehydrate 패턴

Server Component에서 데이터를 미리 가져오고, Client Component가 그 데이터를 즉시 사용하는 패턴이다. 핵심은 **같은 `queryOptions()`를 서버와 클라이언트 양쪽에서 공유**한다는 것이다.

### 구조

page 자체는 Server Component로 두고, 내부에서 Client 래퍼를 렌더링한다.

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
// app/products/page.tsx — re-export 유지
export { ProductsPage as default } from '@pages/products';
```

### 왜 이 구조가 성립하는가

서버의 `prefetchQuery`와 클라이언트의 `useQuery`가 같은 `productQueries.list(params)`를 호출하므로 **queryKey가 동일**하다. 서버가 채운 캐시를 `HydrationBoundary`가 클라이언트로 전달하면, Client 래퍼는 마운트되자마자 캐시 적중을 받아 추가 네트워크 요청 없이 데이터를 렌더링한다.

키가 팩토리에서 한 번만 정의되기 때문에, 서버와 클라이언트가 의도치 않게 다른 키를 만드는 실수가 원천적으로 차단된다. 이것이 query-factory의 **공유 가능성**이 주는 이득이다.

### 어디에 prefetch를 두는가

prefetch 로직은 `src/pages/` 안에 둔다. 루트 `app/products/page.tsx`는 re-export만 유지한다. 루트 라우팅 파일이 prefetch 로직을 직접 소유하면 "루트는 re-export 전용"이라는 원칙이 깨진다.

`generateMetadata` 예외(`@shared/api` 직접 import)는 이 원칙에 포함되지 않는다. `generateMetadata`는 Next.js가 `page.tsx`에서만 export하도록 강제해서 생긴 예외이고, prefetch는 그런 강제가 없다.

### 런타임 분리 도메인의 prefetch

같은 백엔드를 브라우저와 서버 양쪽에서 부르는 도메인(→ [shared-api](shared-api.md))은 위 패턴이 그대로 통하지 않는다. 전송이 브라우저용·서버용으로 갈리기 때문에, `queryOptions()` 하나의 `queryFn`이 이번엔 어느 런타임을 부를지를 정해줘야 한다.

여기서 제약이 하나 생긴다. **`queryFn`을 가진 모듈은 런타임을 하나만 가질 수 있다.** `server-only` 표시는 그 모듈을 import하는 모든 모듈로 전염되는데, `[domain]-queries.ts`는 다름 아닌 Client Component가 `useQuery`로 import하는 파일이다. 여기에 `server-only`를 붙이면 클라이언트가 그 즉시 빌드 에러를 맞는다.

그래서 바꾸는 건 전송 하나, `queryFn`뿐이다. 키는 여전히 팩토리가 만든다.

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

교체해도 되는지는 응답이 유저 상태를 나르는지로 가른다. 무인증 진열처럼 **유저 상태를 나르지 않는** 응답이면 이렇게 `queryFn`을 교체해 캐시에 심어도 된다. 잔여 수량·잔액처럼 **유저별 값을 나르는** 응답이면 캐시에 심지 않는다 — 서버 호출은 `generateMetadata`나 리다이렉트 판정처럼 화면에 직접 보여주지 않는 용도로만 쓰고, 화면 데이터는 클라이언트가 직접 받는다. 이유는 간단하다. 서버 전송은 보통 세션 쿠키를 싣지 않으므로 비로그인 상태의 값을 받아오는데, 그 값을 그대로 캐시에 심으면 하이드레이션 직후 그 값이 화면에 잠깐 노출된다 — 이미 못 사는 수량인데 결제 버튼이 잠깐 열려 있는 식으로.

`queryFn` 교체를 빠뜨리면 더 조용히 틀린다. 서버 컴포넌트 안에서 브라우저용 transport가 그대로 돌면, 상대 `baseURL` 때문에 요청 자체가 실패한다. 그런데 `prefetchQuery`는 `fetchQuery`와 달리 **에러를 삼킨다.** 그래서 화면에는 아무 티도 안 나고, 그저 SSR로 채워졌어야 할 데이터가 비어 있을 뿐이다 — 눈에 보이는 장애가 아니라 SEO만 조용히 죽는다. 서버 endpoint 함수명에 `...OnServer`처럼 런타임 접미사를 붙이는 이유가 이것이다 — 교체를 빠뜨리면 diff에서 바로 드러난다.

---

## Server Component에서의 API 호출

Server Component에서도 [shared-api](shared-api.md)의 `[DOMAIN]_API`를 직접 호출할 수 있다. 서버 환경에서 axios 기반 클라이언트를 그대로 쓸 수 있으며, prefetch 없이 서버에서 데이터를 가져와 props로 내려주는 단순한 패턴도 가능하다. **단 이는 실행 환경이 하나뿐인 도메인 이야기다.** 같은 백엔드를 브라우저와 서버 양쪽에서 부르는 도메인은 전송이 갈리므로, 여기서도 브라우저용 `[DOMAIN]_API`가 아니라 [`[domain]/server` entrypoint](#런타임-분리-도메인의-prefetch)를 쓴다.

```ts
// src/pages/about.tsx — Server Component
import { PRODUCT_API } from '@shared/api/product';

export async function AboutPage() {
  const featured = await PRODUCT_API.getFeaturedProduct();
  return <FeaturedProductView product={featured} />;
}
```

이 패턴은 **데이터가 클라이언트 캐시에 들어갈 필요가 없을 때** 적합하다. 사용자 인터랙션이 없는 정적 표시 영역이나, page가 통째로 Server Component인 경우가 그렇다. 클라이언트에서 같은 데이터를 재사용하거나 무효화해야 하면 prefetch + Hydrate 패턴을 쓴다.

---

## 정리

- page는 기본 Server Component. 훅이 필요한 곳에만 `'use client'`.
- `QueryClient`는 서버에서 요청별 생성, 브라우저에서 싱글톤 재사용.
- 키의 출처는 query-factory 하나다. 서버(prefetch)와 클라이언트(useQuery)가 같은 곳에서 키를 받아 키 일치를 보장한다. 런타임 분리 도메인에서는 `queryFn`만 교체한다.
- prefetch 로직은 `src/pages/` 안에 둔다. 루트 라우팅 파일은 re-export 유지.
- Server Component에서 `[DOMAIN]_API`를 직접 호출할 수 있다. 클라이언트 재사용이 필요 없을 때 유용한 단순 패턴. 런타임 분리 도메인은 `[domain]/server` entrypoint를 쓴다.
