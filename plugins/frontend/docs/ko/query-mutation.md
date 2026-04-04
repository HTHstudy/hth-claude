# Query & Mutation Factory

TanStack Query의 queryKey/queryOptions와 mutationKey/mutationOptions를 factory 패턴으로 중앙 관리합니다.

---

## 왜 Factory 패턴인가

- **키 일관성**: 쿼리/뮤테이션 호출과 무효화 시 같은 키를 사용하도록 보장합니다.
- **중앙 관리**: 도메인별 옵션을 한 곳에서 관리합니다.
- **타입 안전성**: `as const`로 정확한 키 타입을 추론합니다.

---

## 공통 구조

query-factory와 mutation-factory는 동일한 파일 구성을 따릅니다.

```
shared/[query-factory | mutation-factory]/
├─ default-[query|mutation]-keys.ts # 도메인별 기본 키
├─ product-[queries|mutations].ts   # 도메인별 팩토리
└─ auth-[queries|mutations].ts
```

barrel(`index.ts`)은 사용하지 않습니다. 외부에서 필요한 파일을 직접 import합니다.

**각 파일의 역할:**

- **`default-*-keys.ts`** — 도메인별 키의 루트 값을 한 곳에서 관리합니다. 도메인 간 키가 겹치는 것을 방지하고, 어떤 도메인이 존재하는지 한눈에 파악할 수 있습니다.
- **`[domain]-*.ts`** — 도메인별로 파일을 분리하여, 해당 도메인의 모든 키와 옵션을 한 곳에서 관리합니다. product를 수정할 때 auth에 영향을 주지 않습니다.

---

## Query Factory

### 기본 쿼리 키와 도메인별 팩토리

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

### 키 계층 구조

```
allKeys()    → ['product']                    # 도메인 전체 무효화
listKeys()   → ['product', 'list']            # 목록 그룹 무효화
detailKeys() → ['product', 'detail']          # 상세 그룹 무효화
list(params) → ['product', 'list', params]    # 개별 쿼리
detail(id)   → ['product', 'detail', id]      # 개별 쿼리
```

- `allKeys()`는 필수. 도메인 전체 무효화에 사용합니다.
- 중간 키(`listKeys()` 등)는 그룹 무효화가 필요할 때 추가합니다.
- 모든 키 배열에 `as const`를 붙입니다.

### 사용

```ts
import { productQueries } from '@shared/query-factory/product-queries';

// 쿼리 사용
const { data } = useQuery(productQueries.list({ page: 1, size: 20 }));

// 무효화
queryClient.invalidateQueries({ queryKey: productQueries.allKeys() });
queryClient.invalidateQueries({ queryKey: productQueries.listKeys() });
```

---

## Mutation Factory

### 도메인별 팩토리

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

### 공통 핸들러

onSuccess, onError 등 도메인 공통 핸들러를 팩토리에서 제공할 수 있습니다. 사용처에서 추가 핸들러를 지정하면 양쪽 모두 실행됩니다.

### 복잡한 트랜잭션

여러 mutation을 순차 실행하는 복합 흐름은 팩토리에 넣지 않습니다. 팩토리에는 개별 mutation만 정의하고, 조합 로직은 커스텀 훅에서 처리합니다.

```ts
// 팩토리: 개별 mutation만
export const orderMutations = {
  create: () => mutationOptions({ ... }),
  pay: () => mutationOptions({ ... }),
};

// 커스텀 훅: 조합 로직
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

## 핵심 규칙

- 팩토리는 `queryOptions()` / `mutationOptions()`를 반환합니다. `useQuery` / `useMutation`을 내부에서 호출하지 않습니다.
- queryFn / mutationFn은 `[DOMAIN]_API` 객체를 통해 호출합니다.
- queryKey / mutationKey를 팩토리 밖에서 문자열로 직접 작성하지 않습니다.
- 비즈니스 로직을 팩토리에 두지 않습니다.

---

## Do / Don't

### Do

- 모든 키 배열에 `as const`를 붙인다.
- `[DOMAIN]_API`를 통해 API를 호출한다.
- `queryOptions()` / `mutationOptions()`를 반환한다.
- 도메인별로 팩토리 파일을 분리한다.
- queryKey / mutationKey를 팩토리를 통해서만 생성한다.
- 복합 트랜잭션 로직은 커스텀 훅에서 조합한다.

### Don't

- 팩토리에서 `useQuery` / `useMutation`을 호출하지 않는다. 팩토리는 옵션 객체만 반환한다.
- 팩토리에서 응답 데이터를 변환하지 않는다.
- queryKey / mutationKey를 팩토리 밖에서 문자열로 직접 작성하지 않는다.
- 복합 트랜잭션 흐름을 팩토리에 넣지 않는다.
- 비즈니스 로직을 팩토리에 두지 않는다.

---

## 새 도메인 추가 순서

1. `default-query-keys.ts` / `default-mutation-keys.ts`에 키 추가
2. `[domain]-queries.ts` / `[domain]-mutations.ts` 생성
