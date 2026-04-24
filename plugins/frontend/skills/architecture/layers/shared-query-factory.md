# Shared Query Factory Segment

> `shared/query-factory`의 내부 구조와 컨벤션 규약이다.

---

## 1. 목적

`shared/query-factory`는 TanStack Query의 queryKey와 queryOptions를 factory 패턴으로 중앙 관리한다.

- 쿼리 호출과 무효화 시 queryKey 일관성을 보장한다.
- 도메인별로 쿼리 옵션을 한 곳에서 관리한다.
- `shared/api`의 `[DOMAIN]_API` 객체를 queryFn으로 연결한다.

---

## 2. 구조

```txt
shared/query-factory/
├─ default-query-keys.ts       # 도메인별 기본 쿼리 키
├─ product-queries.ts          # 도메인별 쿼리 팩토리
└─ order-queries.ts
```

barrel(`index.ts`)은 사용하지 않는다. 외부에서 필요한 파일을 직접 import한다.

---

## 3. default-query-keys.ts

도메인별 기본 쿼리 키를 하나의 상수 객체로 정의한다.

```ts
export const DEFAULT_QUERY_KEYS = {
  product: 'product',
  order: 'order',
} as const;
```

- 새 도메인 추가 시 이 객체에 키를 추가한다.
- 값은 도메인 이름과 동일한 문자열을 사용한다.

---

## 4. [domain]-queries.ts

### 4.1 기본 구조

```ts
import { queryOptions } from '@tanstack/react-query';
import { DEFAULT_QUERY_KEYS } from './default-query-keys';
import { PRODUCT_API } from '@shared/api/product';
import type { GetProductListReq } from '@shared/api/product';

export const productQueries = {
  // 키 구조
  allKeys: () => [DEFAULT_QUERY_KEYS.product] as const,
  listKeys: () => [...productQueries.allKeys(), 'list'] as const,
  detailKeys: () => [...productQueries.allKeys(), 'detail'] as const,

  // 쿼리 옵션 팩토리
  list: (params: GetProductListReq) =>
    queryOptions({
      queryKey: [...productQueries.listKeys(), params] as const,
      queryFn: () => PRODUCT_API.getProductList(params),
    }),

  detail: (id: string) =>
    queryOptions({
      queryKey: [...productQueries.detailKeys(), id] as const,
      queryFn: () => PRODUCT_API.getProductDetail(id),
      staleTime: 5000,
    }),
};
```

### 4.2 키 계층 구조

```txt
allKeys()    → [DEFAULT_QUERY_KEYS.domain]           # 도메인 전체 무효화
listKeys()   → [...allKeys(), 'list']                 # 목록 그룹 무효화
detailKeys() → [...allKeys(), 'detail']               # 상세 그룹 무효화
list(params) → [...listKeys(), params]                # 개별 쿼리
detail(id)   → [...detailKeys(), id]                  # 개별 쿼리
```

- `allKeys()`는 필수다. 도메인 전체 쿼리 무효화에 사용한다.
- `listKeys()`, `detailKeys()` 등 중간 키는 선택이다. 그룹 무효화가 필요할 때 추가한다.
- 모든 키 배열에 `as const`를 붙인다. 타입 안전성과 정확한 타입 추론을 위해 필수다.

### 4.3 규칙

- queryFn은 `shared/api`의 `[DOMAIN]_API` 객체를 통해 호출한다. API를 직접 호출하지 않는다.
- 팩토리 함수는 `queryOptions()`를 반환한다. `useQuery`를 내부에서 호출하지 않는다.
- staleTime 등 쿼리 옵션의 기본값을 팩토리에서 설정할 수 있다.
- 비즈니스 로직을 팩토리에 두지 않는다. 데이터 변환이 필요하면 호출부에서 `select` 옵션으로 지정한다.
- 팩토리 객체명은 camelCase를 사용한다: `productQueries`, `authQueries`

### 4.4 네이밍

- 파일명: `[domain]-queries.ts` (kebab-case)
- 팩토리 객체명: `[domain]Queries` (camelCase)
- 키 함수: `allKeys`, `listKeys`, `detailKeys` 등 `*Keys` 접미사

---

## 5. 사용 예시

```ts
import { productQueries } from '@shared/query-factory/product-queries';

// 쿼리 사용
const { data: list } = useQuery(productQueries.list({ page: 1, size: 20 }));
const { data: detail } = useQuery(productQueries.detail('product-id'));

// 도메인 전체 무효화
queryClient.invalidateQueries({ queryKey: productQueries.allKeys() });

// 그룹 무효화
queryClient.invalidateQueries({ queryKey: productQueries.listKeys() });
```

---

## 6. import 규칙

### segment 간 import 규칙

| import 가능 | import 금지 |
|-------------|-------------|
| `api`, `config` | `ui`, `hooks`, `mutation-factory` |

`query-factory`와 `mutation-factory`는 서로 import하지 않는다.

### 팩토리 내부

- `default-query-keys.ts`는 상대경로로 import한다.
- `shared/api`는 entrypoint(`@shared/api/[domain]`)로 import한다.
- 타입은 반드시 `type` import로 가져온다.

### 팩토리 외부

- 필요한 파일을 직접 import한다: `@shared/query-factory/product-queries`
- barrel(`index.ts`)은 사용하지 않는다.

---

## 7. 새 도메인 추가 체크리스트

1. `default-query-keys.ts`에 도메인 키를 추가한다.
2. `[domain]-queries.ts`를 생성한다. `allKeys()` 필수, 나머지 키 함수는 필요 시 추가.

---

## 8. Do / Don't

### Do

- 모든 키 배열에 `as const`를 붙인다.
- `[DOMAIN]_API`를 통해 API를 호출한다.
- `queryOptions()`를 반환한다.
- 도메인별로 팩토리 파일을 분리한다.
- queryKey를 팩토리를 통해서만 생성한다.

### Don't

- 팩토리에서 `useQuery`를 호출하지 않는다. 팩토리는 옵션 객체만 반환한다.
- 팩토리에서 응답 데이터를 변환하지 않는다.
- queryKey를 팩토리 밖에서 문자열로 직접 작성하지 않는다.
- 비즈니스 로직을 팩토리에 두지 않는다.

### 단일 사용 쿼리도 팩토리를 거쳐야 하나?

**권장한다.** API를 한 곳에서만 사용하더라도 팩토리를 거치면 queryKey 일관성과 무효화 편의가 보장된다. 단, 강제는 아니다 — 프로토타이핑이나 일회성 호출에서는 직접 `useQuery`를 사용할 수 있다.
