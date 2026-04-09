# Shared Mutation Factory Segment

> `shared/mutation-factory`의 내부 구조와 컨벤션 규약이다.

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
└─ auth-mutations.ts
```

barrel(`index.ts`)은 사용하지 않는다. 외부에서 필요한 파일을 직접 import한다.

---

## 3. default-mutation-keys.ts

도메인별 기본 mutation 키를 하나의 상수 객체로 정의한다.

```ts
export const DEFAULT_MUTATION_KEYS = {
  product: 'product',
  auth: 'auth',
} as const;
```

- 새 도메인 추가 시 이 객체에 키를 추가한다.
- 값은 도메인 이름과 동일한 문자열을 사용한다.

---

## 4. [domain]-mutations.ts

### 4.1 기본 구조

```ts
import { mutationOptions } from '@tanstack/react-query';
import { DEFAULT_MUTATION_KEYS } from './default-mutation-keys';
import { PRODUCT_API } from '@shared/api/product';
import type { CreateProductReq } from '@shared/api/product';

export const productMutations = {
  // 키 구조
  allKeys: () => [DEFAULT_MUTATION_KEYS.product] as const,

  // mutation 옵션 팩토리
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

  delete: () =>
    mutationOptions({
      mutationKey: [...productMutations.allKeys(), 'delete'] as const,
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

### 4.3 공통 핸들러

onSuccess, onError 등 도메인 공통 핸들러를 팩토리에서 제공할 수 있다.

- 공통 핸들러는 팩토리에 둘 수 있다.
- 사용처에서 추가 핸들러를 지정하면 양쪽 모두 실행된다. (TanStack Query의 기본 동작)

### 4.4 복잡한 트랜잭션 처리

여러 mutation을 순차 실행하는 복합 흐름은 팩토리에 넣지 않는다. 팩토리에는 개별 mutation만 정의하고, 조합 로직은 커스텀 훅에서 처리한다.

```ts
// shared/mutation-factory/order-mutations.ts — 개별 mutation만 정의
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
// 커스텀 훅에서 조합
import { orderMutations } from '@shared/mutation-factory/order-mutations';

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

### 4.5 네이밍

- 파일명: `[domain]-mutations.ts` (kebab-case)
- 팩토리 객체명: `[domain]Mutations` (camelCase)
- mutation 함수명: 동사 형태 (`create`, `update`, `delete`)

---

## 5. 사용 예시

```ts
import { productMutations } from '@shared/mutation-factory/product-mutations';

// 기본 사용
const { mutate } = useMutation(productMutations.create());
mutate({ name: 'New Product', price: 1000 });

// 사용처에서 추가 핸들러
const { mutate } = useMutation({
  ...productMutations.create(),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: productQueries.allKeys() });
  },
});
```

---

## 6. import 규칙

### segment 간 import 규칙

| import 가능 | import 금지 |
|-------------|-------------|
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

## 7. 새 도메인 추가 체크리스트

1. `default-mutation-keys.ts`에 도메인 키를 추가한다.
2. `[domain]-mutations.ts`를 생성한다. `allKeys()` 필수.

---

## 8. Do / Don't

### Do

- 모든 키 배열에 `as const`를 붙인다.
- `[DOMAIN]_API`를 통해 API를 호출한다.
- `mutationOptions()`를 반환한다.
- 도메인별로 팩토리 파일을 분리한다.
- 복합 트랜잭션 로직은 커스텀 훅에서 조합한다.
- 도메인 공통 핸들러는 팩토리에 둘 수 있다.

### Don't

- 팩토리에서 `useMutation`을 호출하지 않는다. 팩토리는 옵션 객체만 반환한다.
- 복합 트랜잭션 흐름을 팩토리에 넣지 않는다.
- mutationKey를 팩토리 밖에서 문자열로 직접 작성하지 않는다.
- 비즈니스 로직을 팩토리에 두지 않는다.
