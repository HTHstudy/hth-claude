# Shared Mutation Factory Segment

> `shared/mutation-factory`의 내부 구조와 컨벤션 규약이다.  
> **요구 버전:** TanStack Query v5+ (`mutationOptions`, `MutationCache` API 사용)

---

## 1. 목적

`shared/mutation-factory`는 TanStack Query의 mutationKey와 mutationOptions를 factory 패턴으로 중앙 관리한다.

- mutation 호출 시 mutationKey 일관성을 보장한다.
- 도메인별로 mutation 옵션을 한 곳에서 관리한다.
- `shared/api`의 `[DOMAIN]_API` 객체를 mutationFn으로 연결한다.

---

## 2. 구조

```txt
shared/mutation-factory/
├─ default-mutation-keys.ts      # 도메인별 기본 mutation 키
├─ product-mutations.ts          # 도메인별 mutation 팩토리
└─ order-mutations.ts
```

barrel(`index.ts`)은 사용하지 않는다. 외부에서 필요한 파일을 직접 import한다.

---

## 3. default-mutation-keys.ts

도메인별 기본 mutation 키를 하나의 상수 객체로 정의한다.

```ts
export const DEFAULT_MUTATION_KEYS = {
  product: "product",
  order: "order",
} as const;
```

- 새 도메인 추가 시 이 객체에 키를 추가한다.
- 값은 도메인 이름과 동일한 문자열을 사용한다.

---

## 4. [domain]-mutations.ts

### 4.1 기본 구조

```ts
import { mutationOptions } from "@tanstack/react-query";
import { DEFAULT_MUTATION_KEYS } from "./default-mutation-keys";
import { PRODUCT_API } from "@shared/api/product";
import type { CreateProductReq } from "@shared/api/product";

export const productMutations = {
  // 키 구조
  allKeys: () => [DEFAULT_MUTATION_KEYS.product] as const,

  // mutation 옵션 팩토리
  create: () =>
    mutationOptions({
      mutationKey: [...productMutations.allKeys(), "create"] as const,
      mutationFn: (data: CreateProductReq) => PRODUCT_API.createProduct(data),
    }),

  update: () =>
    mutationOptions({
      mutationKey: [...productMutations.allKeys(), "update"] as const,
      mutationFn: ({ id, data }: { id: string; data: UpdateProductReq }) => PRODUCT_API.updateProduct(id, data),
    }),

  delete: () =>
    mutationOptions({
      mutationKey: [...productMutations.allKeys(), "delete"] as const,
      mutationFn: (id: string) => PRODUCT_API.deleteProduct(id),
    }),
};
```

### 4.2 키 계층 구조

```txt
allKeys() → [DEFAULT_MUTATION_KEYS.domain]           # 도메인 전체
create()  → [...allKeys(), 'create']                  # 개별 mutation
update()  → [...allKeys(), 'update']
delete()  → [...allKeys(), 'delete']
```

- `allKeys()`는 필수다.
- 모든 키 배열에 `as const`를 붙인다.

### 4.3 복잡한 트랜잭션 처리

여러 mutation을 순차 실행하는 복합 흐름은 팩토리에 넣지 않는다. 팩토리에는 개별 mutation만 정의하고, 조합 로직은 커스텀 훅에서 처리한다.

```ts
// shared/mutation-factory/order-mutations.ts — 개별 mutation만 정의
export const orderMutations = {
  allKeys: () => [DEFAULT_MUTATION_KEYS.order] as const,

  create: () =>
    mutationOptions({
      mutationKey: [...orderMutations.allKeys(), "create"] as const,
      mutationFn: (params: CreateOrderReq) => ORDER_API.createOrder(params),
    }),

  pay: () =>
    mutationOptions({
      mutationKey: [...orderMutations.allKeys(), "pay"] as const,
      mutationFn: (orderId: string) => ORDER_API.payOrder(orderId),
    }),
};
```

```ts
// 커스텀 훅에서 조합
import { orderMutations } from "@shared/mutation-factory/order-mutations";

export function useCreateAndPayOrder() {
  const createMutation = useMutation(orderMutations.create());
  const payMutation = useMutation(orderMutations.pay());

  const handleOrder = async (params: CreateOrderReq) => {
    const { orderId } = await createMutation.mutateAsync(params);
    await payMutation.mutateAsync(orderId);
  };

  return { handleOrder };
}
```

### 4.4 네이밍

- 파일명: `[domain]-mutations.ts` (kebab-case)
- 팩토리 객체명: `[domain]Mutations` (camelCase)
- mutation 함수명: 동사 형태 (`create`, `update`, `delete`)

---

## 5. 사용 예시

```ts
import { productMutations } from "@shared/mutation-factory/product-mutations";

const { mutate } = useMutation(productMutations.create());
mutate({ name: "New Product", price: 1000 });
```

핸들러 scope별 상세는 §6 참조.

---

## 6. 핸들러

TanStack Query 핸들러는 scope에 따라 정의 위치와 동작이 다르다.

| Scope             | 정의 위치                              | 적용 범위                  | 덮어쓰기 |
| ----------------- | -------------------------------------- | -------------------------- | -------- |
| **mutation 기본** | 팩토리 `mutationOptions.onSuccess`     | 해당 mutation 사용 모든 곳 | ✓        |
| **도메인 공통**   | 팩토리 helper 재사용                   | 도메인 내 일부/전체 자유   | ✓        |
|                   | `MutationCache` + mutationKey 필터링   | 도메인 전체                | ✗        |
| **전역**          | `MutationCache` (필터 없음)            | 모든 mutation              | ✗        |
|                   | `QueryClient.defaultOptions.mutations` | 모든 mutation              | ✓        |

### 6.1 mutation 기본 핸들러 — 단일 mutation

각 mutation의 기본 onSuccess, onError 등을 팩토리의 `mutationOptions`에 미리 정의한다. 해당 mutation을 사용하는 모든 곳에 기본으로 적용된다.

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

호출부에서 두 가지 패턴으로 확장한다.

**기본 + 호출 단위 추가** — `mutate()`에 핸들러 전달. 기본(먼저) + 호출 단위(나중) **둘 다 실행**.

```ts
const { mutate } = useMutation(productMutations.create());
mutate(data, {
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: productQueries.allKeys() });
  },
});
```

**기본 무시 + 덮어쓰기** — `useMutation` options에 spread + 새 핸들러. 기본은 실행되지 않음. 기본 동작을 건너뛰어야 할 때 사용.

```ts
const { mutate } = useMutation({
  ...productMutations.create(),
  onSuccess: () => {
    // 기본 무시, 이 핸들러만 실행
  },
});
```

### 6.2 도메인 공통 핸들러 — 한 도메인의 여러 mutation

두 가지 방법. **적용 범위**와 **덮어쓰기 허용 여부**로 선택한다.

#### 팩토리 helper 함수 재사용 — 덮어쓰기 가능

도메인 내 일부 또는 전체 mutation에 자유롭게 적용.

```ts
const onProductSuccess = () => {
  queryClient.invalidateQueries({ queryKey: productQueries.allKeys() });
};

export const productMutations = {
  // 고유 처리 + helper 조합
  create: () =>
    mutationOptions({
      mutationKey: [...productMutations.allKeys(), "create"] as const,
      mutationFn: (data: CreateProductReq) => PRODUCT_API.createProduct(data),
      onSuccess: () => {
        // create 고유 처리
        onProductSuccess();
      },
    }),
  // helper만 재사용
  update: () =>
    mutationOptions({
      mutationKey: [...productMutations.allKeys(), "update"] as const,
      mutationFn: ({ id, data }) => PRODUCT_API.updateProduct(id, data),
      onSuccess: onProductSuccess,
    }),
};
```

mutation 고유 처리가 필요하면 inline 콜백에서 helper를 호출하고, 도메인 공통 처리만으로 충분하면 helper를 그대로 참조한다. 기본이지만 호출에 따라 생략 가능해야 할 때(자동 토스트, 선택적 redirect)에 적합.

#### MutationCache + mutationKey 필터링 — 덮어쓰기 불가

도메인 **전체** 매칭. 항상 실행.

```ts
// src/app/providers.tsx
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

도메인 전체에 반드시 실행돼야 하는 처리(캐시 invalidation, 로깅, 분석)에 적합. **특정 mutation만 매칭하는 세부 필터링은 쓰지 않는다** — 그 경우엔 helper 재사용 또는 6.1 기본 핸들러 사용.

### 6.3 전역 핸들러 — 모든 mutation

도메인/mutation 구분 없이 모든 mutation에 적용. **`MutationCache` 사용을 권장**한다. `QueryClient.defaultOptions.mutations`는 설정값(`retry`, `gcTime` 등) 용도로만 사용하고, 콜백(`onSuccess`/`onError`/`onSettled`)은 "덮어쓰기 가능한 전역 기본값"이 꼭 필요한 드문 경우에만 사용한다.

#### MutationCache (필터 없음) — 덮어쓰기 불가 (권장)

```ts
new QueryClient({
  mutationCache: new MutationCache({
    onError: (error, variables, context, mutation) => {
      // 모든 mutation 에러에서 항상 실행
    },
  }),
});
```

cache 수준 핸들러라 덮어쓰기 불가. 전역 로깅·분석에 적합.

#### QueryClient.defaultOptions.mutations — 덮어쓰기 가능

```ts
new QueryClient({
  defaultOptions: {
    mutations: {
      retry: 3, // 설정값 — 정당한 용도
      gcTime: 60_000,
      onError: (error) => {
        // 콜백 — 드문 경우에만 (개별 mutation에서 덮어쓸 수 있음)
      },
    },
  },
});
```

각 mutation의 options가 default를 덮어쓸 수 있다. 설정값 용도로는 계속 사용. 콜백은 "덮어쓰기 가능한 전역 기본값"이 꼭 필요한 드문 경우에만.

---

## 7. import 규칙

### segment 간 import 규칙

| import 가능     | import 금지                    |
| --------------- | ------------------------------ |
| `api`, `config` | `ui`, `hooks`, `query-factory` |

`mutation-factory`와 `query-factory`는 서로 import하지 않는다.

### 팩토리 내부

- `default-mutation-keys.ts`는 상대경로로 import한다.
- `shared/api`는 entrypoint(`@shared/api/[domain]`)로 import한다.
- 타입은 반드시 `type` import로 가져온다.

### 팩토리 외부

- 필요한 파일을 직접 import한다: `@shared/mutation-factory/product-mutations`
- barrel(`index.ts`)은 사용하지 않는다.

---

## 8. 새 도메인 추가 체크리스트

1. `default-mutation-keys.ts`에 도메인 키를 추가한다.
2. `[domain]-mutations.ts`를 생성한다. `allKeys()` 필수.

---

## 9. Do / Don't

### Do

- 모든 키 배열에 `as const`를 붙인다.
- `[DOMAIN]_API`를 통해 API를 호출한다.
- `mutationOptions()`를 반환한다.
- 도메인별로 팩토리 파일을 분리한다.
- 복합 트랜잭션 로직은 커스텀 훅에서 조합한다.
- 핸들러는 scope별로 적절한 위치에 둔다 — §6 참조.

### Don't

- 팩토리에서 `useMutation`을 호출하지 않는다. 팩토리는 옵션 객체만 반환한다.
- 복합 트랜잭션 흐름을 팩토리에 넣지 않는다.
- mutationKey를 팩토리 밖에서 문자열로 직접 작성하지 않는다.
- 비즈니스 로직을 팩토리에 두지 않는다.

### 단일 사용 뮤테이션도 팩토리를 거쳐야 하나?

**권장한다.** API를 한 곳에서만 사용하더라도 팩토리를 거치면 mutationKey 일관성과 캐시 무효화 편의가 보장된다. 단, 강제는 아니다 — 프로토타이핑이나 일회성 호출에서는 직접 `useMutation`을 사용할 수 있다.
