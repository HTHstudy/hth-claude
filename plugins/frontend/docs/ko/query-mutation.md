# Query & Mutation Factory

이 문서는 TanStack Query를 사용하는 프로젝트의 `shared/query-factory`와 `shared/mutation-factory` Segment를 다룬다. TanStack Query를 쓰지 않으면 이 문서는 건너뛰어도 된다.

---

## 왜 팩토리인가

TanStack Query는 queryKey와 mutationKey로 캐시 엔트리를 식별한다. 같은 데이터에 대해 호출하는 쪽과 무효화하는 쪽이 **완전히 동일한 키**를 써야 예상대로 동작한다. 키를 여러 곳에서 문자열 배열로 작성하면 같은 데이터에 대해 미묘하게 다른 키가 생기거나, 스키마 변경 시 일부 호출처만 갱신되는 문제가 생긴다.

팩토리 패턴은 **키와 옵션을 한 곳에서 생성**한다. 호출도 무효화도 같은 팩토리 함수를 거치므로 키가 자연스럽게 일치하고, 도메인별 옵션(staleTime, retry 등)을 한 곳에서 관리할 수 있다. [shared-api](shared-api.md)의 `[DOMAIN]_API` 객체와 자연스럽게 연결되어, API 정의부터 쿼리 키까지 도메인 단위의 경계가 유지된다.

---

## 구조

query-factory와 mutation-factory는 동일한 파일 구성을 따른다.

```txt
shared/[query-factory | mutation-factory]/
├─ default-[query|mutation]-keys.ts    # 도메인별 기본 키
├─ product-[queries|mutations].ts      # 도메인별 팩토리
└─ order-[queries|mutations].ts
```

각 파일의 역할은 다음과 같다.

**`default-*-keys.ts`**는 도메인별 기본 키의 루트 값을 한 곳에서 관리한다. 도메인 간 키가 겹치는 것을 방지하고, 어떤 도메인이 존재하는지 한눈에 파악하기 위함이다.

**`[domain]-*.ts`**는 도메인별로 파일을 분리해, 해당 도메인의 모든 키와 옵션을 한 파일에 모은다. product 팩토리를 수정할 때 order 팩토리에 영향을 주지 않는다.

**barrel(`index.ts`)은 쓰지 않는다.** 외부에서 필요한 파일을 직접 import한다 (`@shared/query-factory/product-queries`). barrel은 의존 그래프를 부풀리고 트리 쉐이킹을 방해하며, 이 Segment에서는 이득이 없다.

---

## Query Factory

### 기본 키와 팩토리

도메인별 기본 키는 하나의 상수 객체로 정의한다.

```ts
// default-query-keys.ts
export const DEFAULT_QUERY_KEYS = {
  product: 'product',
  order: 'order',
} as const;
```

도메인별 팩토리는 키 함수들과 쿼리 옵션 함수들로 구성된다.

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

### 키 계층

키는 계층적으로 조립된다.

```txt
allKeys()    → ['product']                    # 도메인 전체 무효화
listKeys()   → ['product', 'list']             # 목록 그룹 무효화
detailKeys() → ['product', 'detail']           # 상세 그룹 무효화
list(params) → ['product', 'list', params]     # 개별 쿼리
detail(id)   → ['product', 'detail', id]       # 개별 쿼리
```

`allKeys()`는 필수다 — 도메인 전체 무효화에 쓰인다. 중간 키(`listKeys()` 등)는 그룹 무효화가 필요할 때만 추가한다. 모든 키 배열에는 `as const`를 붙여 타입을 정확히 추론하게 한다.

### 무효화

같은 팩토리를 호출과 무효화 양쪽에서 쓴다.

```ts
const { data } = useQuery(productQueries.list({ page: 1, size: 20 }));

queryClient.invalidateQueries({ queryKey: productQueries.allKeys() });   // 전체
queryClient.invalidateQueries({ queryKey: productQueries.listKeys() });  // 목록만
```

### 팩토리의 경계

팩토리 함수는 **옵션 객체만 반환**한다. `useQuery`를 팩토리 내부에서 호출하지 않는다. 옵션을 받아 `useQuery`에 넘기는 것은 호출부의 책임이다.

팩토리에는 비즈니스 로직을 두지 않는다. 데이터 변환이 필요하면 호출부에서 `select` 옵션으로 지정한다. queryFn은 `shared/api`의 `[DOMAIN]_API` 객체를 통해 호출한다 — API를 직접 호출하지 않는다.

---

## Mutation Factory

### 기본 구조

구조는 query-factory와 같다.

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

## 핸들러 scope

뮤테이션은 쿼리보다 부수효과가 많다. 성공 시 캐시 무효화, 실패 시 알림, 시작 시 로딩 표시 — 이런 핸들러를 어디에 두느냐가 중요한 결정이 된다. 이 아키텍처는 **scope에 따라 정의 위치를 다르게 한다.**

scope는 세 가지다.

**mutation 기본 핸들러** — 개별 mutation의 기본 동작. 해당 mutation을 쓰는 모든 곳에 기본으로 적용되며, 호출부에서 덮어쓰거나 추가할 수 있다.

**도메인 공통 핸들러** — 한 도메인의 여러 mutation에 적용되는 핸들러. 두 가지 방식이 있고, 덮어쓰기 허용 여부로 선택이 달라진다.

**전역 핸들러** — 도메인 구분 없이 모든 mutation에 적용되는 핸들러.

### mutation 기본 핸들러

개별 mutation의 기본 동작을 팩토리의 `mutationOptions`에 미리 정의한다.

```ts
create: () =>
  mutationOptions({
    mutationKey: [...productMutations.allKeys(), 'create'] as const,
    mutationFn: (data: CreateProductReq) => PRODUCT_API.createProduct(data),
    onSuccess: () => {
      // create 기본 처리
    },
  }),
```

호출부에서 두 방식으로 확장한다.

**기본 + 호출 단위 추가** — `mutate()`에 핸들러를 전달한다. 팩토리의 기본(먼저)과 호출 단위(나중)가 **둘 다 실행**된다.

```ts
const { mutate } = useMutation(productMutations.create());
mutate(data, {
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: productQueries.allKeys() });
  },
});
```

**기본 무시 + 덮어쓰기** — `useMutation` options에 spread하고 새 핸들러를 지정한다. 팩토리의 기본은 실행되지 않는다. 기본 동작을 건너뛰어야 하는 특수한 상황에서만 사용한다.

```ts
const { mutate } = useMutation({
  ...productMutations.create(),
  onSuccess: () => {
    // 기본 무시, 이 핸들러만 실행
  },
});
```

### 도메인 공통 핸들러

한 도메인의 여러 mutation이 공유해야 하는 핸들러는 두 방식 중 하나로 정의한다.

**팩토리 helper 함수 재사용 — 덮어쓰기 가능.** 도메인 내 일부 또는 전체 mutation에 자유롭게 적용한다. 자동 토스트, 선택적 redirect처럼 "기본이지만 필요하면 생략 가능해야 하는" 처리에 적합하다.

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
        // mutation 고유 처리
        onProductSuccess();
      },
    }),
  update: () =>
    mutationOptions({
      mutationKey: [...productMutations.allKeys(), 'update'] as const,
      mutationFn: ({ id, data }) => PRODUCT_API.updateProduct(id, data),
      onSuccess: onProductSuccess,  // helper만 재사용
    }),
};
```

**`MutationCache` + mutationKey 필터링 — 덮어쓰기 불가.** 도메인 전체에 반드시 실행되어야 하는 처리(캐시 무효화, 로깅, 분석)에 적합하다. mutationKey의 루트(도메인)로 필터링한다.

```ts
new QueryClient({
  mutationCache: new MutationCache({
    onSuccess: (data, variables, context, mutation) => {
      const [domain] = (mutation.options.mutationKey as string[]) ?? [];
      if (domain === DEFAULT_MUTATION_KEYS.product) {
        // product 도메인 전체 공통 처리 (항상 실행)
      }
    },
  }),
});
```

특정 mutation만 매칭하는 세부 필터링은 이 방식으로 하지 않는다. 그런 경우엔 helper 재사용이나 mutation 기본 핸들러를 쓴다.

### 전역 핸들러

도메인 구분 없이 모든 mutation에 적용되는 핸들러는 **`MutationCache` 사용을 권장**한다.

```ts
new QueryClient({
  mutationCache: new MutationCache({
    onError: (error, variables, context, mutation) => {
      // 모든 mutation 에러에서 항상 실행
    },
  }),
});
```

`QueryClient.defaultOptions.mutations`는 설정값(`retry`, `gcTime` 등) 용도로 쓰고, 콜백(`onSuccess`/`onError`/`onSettled`)은 "덮어쓰기 가능한 전역 기본값"이 꼭 필요한 드문 경우에만 사용한다.

### scope 요약

| Scope | 정의 위치 | 적용 범위 | 덮어쓰기 |
|-------|----------|----------|---------|
| mutation 기본 | 팩토리 `mutationOptions.onSuccess` | 해당 mutation 사용 모든 곳 | 가능 |
| 도메인 공통 | 팩토리 helper 재사용 | 도메인 내 선택적 | 가능 |
| 도메인 공통 | `MutationCache` + mutationKey 필터 | 도메인 전체 | 불가 |
| 전역 | `MutationCache` (필터 없음) | 모든 mutation | 불가 |
| 전역 | `QueryClient.defaultOptions.mutations` | 모든 mutation | 가능 |

---

## 복합 트랜잭션

여러 mutation을 순차 실행하는 복합 흐름은 **팩토리에 넣지 않는다**. 팩토리에는 개별 mutation만 정의하고, 조합 로직은 커스텀 훅에서 처리한다.

```ts
// 팩토리 — 개별 mutation만
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
// 커스텀 훅 — 조합 로직
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

팩토리를 개별 mutation 단위로 유지하면 각 mutation이 독립적으로 재사용 가능하고, 조합이 필요한 흐름은 조합 자체가 명시적으로 드러난다.

---

## Segment 간 의존

query-factory와 mutation-factory는 `shared` 안에서 import할 수 있는 범위가 제한된다.

| Segment | import 가능 | import 금지 |
|---------|-------------|-------------|
| `query-factory` | `api`, `config` | `ui`, `hooks`, `mutation-factory` |
| `mutation-factory` | `api`, `config` | `ui`, `hooks`, `query-factory` |

query-factory와 mutation-factory는 **서로 import하지 않는다**. 두 factory는 각각 독립된 관심사이며, 서로를 참조하기 시작하면 무효화 의존이 양방향으로 얽혀 관리가 급격히 어려워진다.

---

## 네이밍

- 파일명: `[domain]-queries.ts`, `[domain]-mutations.ts` (kebab-case)
- 팩토리 객체명: `[domain]Queries`, `[domain]Mutations` (camelCase)
- 키 함수: `allKeys`, `listKeys`, `detailKeys` 등 `*Keys` 접미사
- mutation 함수명: 동사 형태 (`create`, `update`, `delete`)

---

## 단일 사용 쿼리/뮤테이션도 팩토리를 거쳐야 하는가

**권장한다.** 한 곳에서만 쓰더라도 팩토리를 거치면 키 일관성과 캐시 무효화 편의가 보장된다. 두 번째 사용처가 생겼을 때 팩토리를 새로 만들 필요 없이 호출만 추가하면 된다.

단, 강제는 아니다. 프로토타이핑이나 일회성 호출에서는 직접 `useQuery`/`useMutation`을 쓸 수 있다. 이 경우에도 `[DOMAIN]_API`를 거쳐 호출한다.

---

## 정리

- 팩토리는 queryKey·mutationKey의 일관성을 확보하는 구조다. 호출과 무효화가 같은 팩토리를 거친다.
- query-factory와 mutation-factory는 도메인별 파일로 분리하고 barrel은 쓰지 않는다.
- 키 계층은 `allKeys` → `listKeys`/`detailKeys` → 개별 쿼리로 조립한다. 모든 키에 `as const`.
- 팩토리는 옵션 객체만 반환한다. 훅 호출과 비즈니스 로직은 팩토리 바깥에.
- mutation 핸들러는 scope에 따라 위치가 다르다 — mutation 기본 / 도메인 공통 / 전역.
- 복합 트랜잭션은 커스텀 훅에서 조합한다.
- query-factory와 mutation-factory는 서로 import하지 않는다.
