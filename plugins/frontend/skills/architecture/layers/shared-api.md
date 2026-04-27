# Shared API Segment

> `shared/api`의 내부 구조와 컨벤션 규약이다.

문서에서 `[domain]`은 실제 폴더명으로 치환하는 placeholder이다.

---

## 1. 목적

`shared/api`는 백엔드와의 연결을 담당하는 API 레이어이다.

- 각 도메인은 동일한 3계층 구조를 따른다: **(1) http-client / (2) endpoints / (3) public interface(`index.ts`)**
- 외부는 반드시 `index.ts` entrypoint만 통해 접근한다.
- Transport 레이어는 서버 응답을 가공하지 않는다.

**도메인 = `[domain]-http-client` 인스턴스 단위 = 공통 처리 그룹 단위.** 분리 기준은 §4.1 참조.

---

## 2. 전체 구조

```txt
shared/api/
├─ base/                       # 공통 인프라 (외부 import 금지)
│  ├─ base-http-client.ts
│  ├─ authenticated-http-client.ts  # 중간 클래스 (선택)
│  ├─ errors.ts
│  └─ types.ts
│
├─ main/                       # 메인 BE (baseURL: 'https://api.example.com')
│  ├─ index.ts
│  ├─ model.ts
│  ├─ main-http-client.ts
│  └─ endpoints/
│     ├─ get-product-list.ts
│     └─ get-user.ts
│
├─ order/                      # main과 같은 서버, 결제 공통 에러 처리 분리
│  │                           #   (baseURL: 'https://api.example.com/order')
│  ├─ index.ts
│  ├─ errors.ts                # OrderHttpError (외부 분기용)
│  ├─ order-http-client.ts
│  └─ endpoints/
│     ├─ get-order.ts
│     └─ pay-order.ts
│
└─ external/                   # 서드파티 API (baseURL: 'https://api.thirdparty.com')
   ├─ index.ts
   ├─ external-http-client.ts
   └─ endpoints/
```

---

## 3. base — 공통 인프라

`base/`는 모든 도메인이 공유하는 전송 계층 기반 코드를 둔다. **외부(`@shared/api/base/*`)에서 직접 import하지 않는다.** ESLint `@shared/api/*/*` 패턴으로 자동 차단되며, 외부에 공개가 필요한 공통 타입(`HttpError` 등)은 각 도메인에서 extend하여 re-export한다 (→ §4.4).

```txt
shared/api/base/
├─ base-http-client.ts              # BaseHttpClient 클래스 (프로젝트 포터블)
├─ authenticated-http-client.ts     # 중간 클래스 예 (선택 — 인증 공통 인터셉터 공유)
├─ errors.ts                        # HttpError 클래스, 에러 로깅
└─ types.ts                         # 공통 응답 타입 (DefaultResponse 등)
```

| 파일 | 역할 |
|------|------|
| `base-http-client.ts` | 모든 도메인 HTTP 클라이언트의 기반 클래스. 기본 설정, 인터셉터 훅(`protected` — 하위 클래스에서 override), `res.data` 언래핑 HTTP 래퍼 메서드를 제공한다. 프로젝트 종속 로직을 포함하지 않는다. |
| 중간 클래스 (선택) | 여러 도메인이 공유하는 인터셉터(인증, 모니터링 등)를 중앙화한다. 필요할 때만 생성하며, 파일명은 **역할 기반**으로 짓는다 — 인증 공통이면 `authenticated-http-client.ts`, 모니터링 공통이면 `monitored-http-client.ts`, 여러 관심사 조합이면 `app-http-client.ts` 등. |
| `errors.ts` | `AxiosError` → `HttpError` 변환. 모든 도메인의 에러를 표준화한다. |
| `types.ts` | `DefaultResponse<T>` 등 백엔드 공통 응답 래퍼 타입. 프로젝트에 맞게 조정한다. |

**BaseHttpClient에 두는 것:** 프로젝트 포터블 로직 (기본 설정, 에러 정규화, 응답 타입)
**BaseHttpClient에 두지 않는 것:** 프로젝트 종속 로직 (인증, 세션, 리다이렉트) → 중간 클래스 또는 도메인 http-client에서 override

템플릿, 설계 원칙, 확장 패턴 → [http-client.md](../rules/http-client.md)

---

## 4. 도메인별 구조

### 4.1 분리 기준

`[domain]-http-client.ts`는 baseURL 하나와 그 그룹의 공통 인터셉터/에러 처리를 소유한다.

**분리 기준 (다음 중 하나 이상):**
1. **baseURL이 다름** — 서버 주소 또는 경로 prefix가 다른 요청군
2. **그 그룹만의 공통 처리 필요** — 인터셉터, 에러 처리, 헤더가 하위 리소스 전반에 공통 적용되어야 함

**리소스 수는 분리 기준이 아니다.** 공통 처리가 동일하면 하나의 도메인 아래 `endpoints/` 서브폴더로 조직할 수 있다.

**점진적 분리 예시:**

```txt
# 초기 — main 하나에서 모두 처리
shared/api/main/
├─ main-http-client.ts          # 공통 인증/에러
└─ endpoints/
   ├─ get-product-list.ts
   ├─ get-user.ts
   └─ get-order.ts

# 확장 — order에 결제 공통 에러 처리가 필요해져 분리
shared/api/
├─ main/                        # baseURL: api.example.com
│  └─ endpoints/
│     ├─ get-product-list.ts
│     └─ get-user.ts
└─ order/                       # baseURL: api.example.com/order
   ├─ order-http-client.ts      # 결제 에러 공통 처리 override
   ├─ errors.ts                 # OrderHttpError (외부 분기용)
   └─ endpoints/
      ├─ get-order.ts
      └─ pay-order.ts
```

---

도메인 폴더 내부는 아래 구조를 따른다.

```txt
[domain]/
├─ index.ts                    # 공개 인터페이스
├─ model.ts                    # 도메인 엔티티 (조건부)
├─ errors.ts                   # 도메인 에러 (선택 — 외부 분기용)
├─ [domain]-http-client.ts     # HTTP 클라이언트
└─ endpoints/                  # Transport 레이어
   └─ *.ts                     # 엔드포인트별 파일
```

### 4.2 [domain]-http-client.ts — 도메인 HTTP 클라이언트

BaseHttpClient(또는 중간 클래스)를 상속한 도메인별 인스턴스. 파일명은 `[domain]-http-client.ts`.

역할, 설계 원칙, 확장 패턴 → [http-client.md](../rules/http-client.md)

### 4.3 model.ts — 도메인 모델

`model.ts`는 여러 endpoint에서 공유되는 도메인 엔티티, 도메인 상태 타입, 도메인 상수를 정의한다.

**model.ts에 두는 것:**
- 둘 이상의 endpoint 또는 외부 consumer가 공유하는 도메인 엔티티
- 도메인 상태 타입 및 상수

`model.ts`는 백엔드 계약만 정의한다. 프론트엔드 표현 관심사는 API를 소비하는 상위 레이어에 둔다.
endpoint 전용 요청/응답 타입은 `model.ts`가 아닌 해당 `endpoints/*.ts`에 둔다.

둘 이상의 endpoint 또는 외부 consumer가 공유하는 도메인 타입이 없으면 `model.ts`를 생성하지 않는다.

```ts
// model.ts
export const PRODUCT_STATUS = {
  ACTIVE: 'ACTIVE',
  SOLD_OUT: 'SOLD_OUT',
  HIDDEN: 'HIDDEN',
} as const;

export type ProductStatus = (typeof PRODUCT_STATUS)[keyof typeof PRODUCT_STATUS];

export type ProductItem = {
  id: string;
  name: string;
  price: number;
  status: ProductStatus;
};
```

### 4.4 errors.ts — 도메인 에러 (선택)

외부(page/feature 등)에서 해당 도메인 에러 타입을 참조해 분기 처리할 때만 생성한다. 공통 처리(도메인 http-client의 `onResponseError`, 전역 Error Boundary)로 커버되면 만들지 않는다.

- `base/errors.ts`의 `HttpError`를 extend
- `name` 필드에 도메인 이름 포함 (`'ProductHttpError'` 등) — `instanceof` 분기와 로깅 구분용
- 도메인 http-client의 `onResponseError`에서 도메인 에러로 래핑해 throw
- `index.ts`에서 re-export

`base/errors.ts`의 `HttpError`는 외부에서 직접 import하지 않는다. 필요하면 도메인에서 extend하여 노출한다.

구현 템플릿 → [http-client.md §5.5 도메인 에러 확장](../rules/http-client.md#55-도메인-에러-확장)

### 4.5 endpoints/*.ts — Transport 레이어

엔드포인트별로 API 함수와 요청/응답 타입을 **반드시 한 파일에** 둔다.

**허용되는 변환:**
- 백엔드 공통 응답 래퍼(예: `{ data: T, success: boolean }`)에서 실제 데이터(`T`)까지 꺼내 반환하는 것. 단, 공통 응답 타입이 `base/types.ts`에 정의되어 있어야 한다.

**금지되는 변환:**
- 필드명 변경 (snake_case → camelCase 포함)
- 데이터 정렬/필터링
- 기본값 주입
- 파생 필드 생성
- UI 표현용 구조 재조합
- 문자열을 Date 등 다른 타입으로 변환

응답 타입은 백엔드가 주는 형태 그대로 정의한다. 데이터 변환이 필요하면 API를 소비하는 쪽에서 처리한다.

도메인 내부에서는 상대경로로 import한다. `base/`의 공통 타입이나 같은 도메인의 `model.ts`를 참조할 때도 상대경로를 사용한다.

```ts
// endpoints/get-product-list.ts
import { productHttpClient } from '../product-http-client';
import { type DefaultResponse } from '../../base/types';
import { type ProductItem } from '../model';

type GetProductListReq = {
  category?: string;
  page: number;
  size: number;
};

type GetProductListRes = DefaultResponse<{
  items: ProductItem[];
  totalCount: number;
}>;

export const getProductList = async (params: GetProductListReq) => {
  return productHttpClient.get<GetProductListRes>('/products', { params });
};
```

### 4.6 index.ts — 공개 인터페이스

`index.ts`는 도메인 외부에 공개되는 **유일한 entrypoint**이다.

- API 함수는 개별 export하지 않고 `[DOMAIN]_API` 객체로 묶어 export한다.
- 외부에 공개할 타입과 상수는 `index.ts`에서 명시적으로만 re-export한다.
- `export *`는 사용하지 않는다.
- endpoint 전용 req/res 타입과 domain model은 구분해서 관리한다.
- endpoint 전용 req/res 타입은 외부에서 실제로 필요한 것만 re-export한다.
- 필요 시 가독성을 위해 섹션 주석(`// --- Public API ---` 등)으로 나눌 수 있다.

```ts
// index.ts

// --- Public API ---
import { getProductList } from './endpoints/get-product-list';
import { createProduct } from './endpoints/create-product';
import { getProductDetail } from './endpoints/get-product-detail';

export const PRODUCT_API = {
  getProductList,
  createProduct,
  getProductDetail,
};

// --- Public endpoint types ---
export type { GetProductListReq } from './endpoints/get-product-list';
export type { CreateProductReq } from './endpoints/create-product';

// --- Public domain model ---
export type { ProductItem, ProductStatus } from './model';
export { PRODUCT_STATUS } from './model';
```

---

## 5. import 규칙

### 도메인 내부: 상대경로를 사용한다

도메인 내부 파일 간, 그리고 `base/`를 참조할 때는 반드시 상대경로로 import한다.

```ts
// 도메인 내부에서의 올바른 import
import { productHttpClient } from '../product-http-client';
import { type DefaultResponse } from '../../base/types';
import { type ProductItem } from '../model';
```

### 도메인 외부: entrypoint(`index.ts`)만 통해 접근한다

도메인 밖의 모든 코드는 `@shared/api/[domain]`만 import한다.

```ts
// 올바른 사용: index.ts를 통한 접근
import { PRODUCT_API } from '@shared/api/product';
import type { ProductItem } from '@shared/api/product';
```

```ts
// 금지: 외부에서 내부 모듈 직접 import
import { getProductList } from '@shared/api/product/endpoints/get-product-list';
import type { ProductItem } from '@shared/api/product/model';
import { productHttpClient } from '@shared/api/product/product-http-client';
```

### ESLint로 강제

`@shared/api/*/*` 패턴으로 내부 모듈 직접 접근을 차단한다.

`@shared/api/product` → 허용 (index.ts entrypoint)
`@shared/api/product/endpoints/*`, `@shared/api/product/model` 등 → 차단

프로젝트에 ESLint `no-restricted-imports` 규칙이 아직 없으면, [eslint-config.md](../rules/eslint-config.md)를 참조하여 추가한다.

---

## 6. 파일/코드 컨벤션

### 파일명

- kebab-case, URL/기능 기준으로 작성한다.
- 예: `get-product-list.ts`, `create-order.ts`, `update-user-profile.ts`

### 타입명

- PascalCase + 접미사를 사용한다.
  - 요청 타입: `*Req` (예: `GetProductListReq`, `CreateOrderReq`)
  - 응답 타입: `*Res` (예: `GetProductListRes`, `CreateOrderRes`)

### API 함수명

- camelCase, 동사+명사 형태를 사용한다.
- 예: `getProductList`, `createOrder`, `updateUserProfile`

### HTTP 클라이언트

- 파일명은 `[domain]-http-client.ts` 형태를 사용한다.
- 역할, 설계 원칙, 확장 패턴 → [http-client.md](../rules/http-client.md)

---

## 7. 새 도메인 추가 체크리스트

1. **분리 기준 확인** — baseURL 다름 또는 그룹 공통 처리 필요 (§4.1 참조). 리소스 수로 분리하지 않음.
2. `shared/api/[domain]/` 폴더를 생성한다.
3. `[domain]-http-client.ts` — `base-http-client.ts`(또는 중간 클래스)를 확장한 HTTP 클라이언트를 작성한다.
4. `endpoints/` — 엔드포인트별 파일을 작성한다. 함수와 req/res 타입을 한 파일에 둔다.
5. `model.ts` — 둘 이상의 endpoint 또는 외부 consumer가 공유하는 도메인 타입이 있을 때만 생성한다.
6. `errors.ts` — 외부에서 해당 도메인 에러 타입을 참조해 분기해야 할 때만 생성한다. `HttpError` extend + `name` 필드에 도메인 이름 포함.
7. `index.ts` — `[DOMAIN]_API` 객체를 export하고, 외부 필요 타입/에러만 re-export한다.

ESLint는 공통 패턴(`@shared/api/*/*`)이 내부 직접 접근을 자동 차단하므로 도메인별 추가 설정은 불필요하다.

### 최소 템플릿

```ts
// shared/api/[domain]/[domain]-http-client.ts
import { BaseHttpClient } from '../base/base-http-client';

export const [domain]HttpClient = new BaseHttpClient({
  baseURL: '...',
});
```

```ts
// shared/api/[domain]/endpoints/get-[resource].ts
import { [domain]HttpClient } from '../[domain]-http-client';
import { type DefaultResponse } from '../../base/types';
import { type [DomainEntity] } from '../model';

type Get[Resource]Req = { /* ... */ };
type Get[Resource]Res = DefaultResponse<{ /* ... */ }>;

export const get[Resource] = async (params: Get[Resource]Req) => {
  return [domain]HttpClient.get<Get[Resource]Res>('/endpoint', { params });
};
```

```ts
// shared/api/[domain]/index.ts
import { get[Resource] } from './endpoints/get-[resource]';

// --- Public API ---
export const [DOMAIN]_API = {
  get[Resource],
};

// --- Public endpoint types ---
export type { Get[Resource]Req } from './endpoints/get-[resource]';

// --- Public domain model ---
export type { [DomainEntity] } from './model';
```

---

## 8. Do / Don't

### Do

- `endpoints/*.ts`에 endpoint 전용 req/res 타입을 함께 둔다.
- `index.ts`에서 `[DOMAIN]_API` 객체 하나를 export한다.
- 외부 코드는 `@shared/api/[domain]`만 import한다.
- 도메인 내부에서는 상대경로로 import한다.
- `endpoints/*.ts`는 도메인 http-client의 HTTP 래퍼 메서드를 통해 호출한다.
- 타입은 반드시 `type` import로 가져온다. (`import { type Foo }`)
- 새 도메인은 기존 도메인과 동일한 구조로 생성한다.
- `model.ts`에는 둘 이상의 endpoint 또는 외부 consumer가 공유하는 도메인 엔티티, 상태 타입, 상수를 둔다.
- `index.ts`에서 endpoint 전용 타입과 domain model을 구분해서 re-export한다.
- 외부에서 해당 도메인 에러 타입을 분기 처리해야 하면 `errors.ts`에 `HttpError` extend + `name` 필드에 도메인 이름 포함 후 `index.ts`에서 re-export한다.

### Don't

- `endpoints/*.ts`에서 응답을 가공하지 않는다. (필드명 변경, 정렬, 기본값 주입, 타입 변환 등)
- 외부에서 `endpoints/*`, `model.ts`, `*-http-client.ts`를 직접 import하지 않는다.
- `index.ts`에서 API 함수를 개별 named export로 내보내지 않는다.
- `index.ts`에서 `export *`를 사용하지 않는다.
- endpoint 전용 req/res 타입을 `model.ts`에 두지 않는다. 해당 `endpoints/*.ts`에 둔다.
- 둘 이상의 endpoint 또는 외부 consumer가 공유하는 도메인 타입이 없는데 `model.ts`를 생성하지 않는다.
- `base/`의 `HttpError` 등 공통 타입을 외부에서 직접 import하지 않는다. 필요하면 도메인에서 extend하여 re-export한다.
- 단순히 리소스 수가 많다는 이유로 도메인을 분리하지 않는다. 공통 처리가 같으면 `endpoints/` 서브폴더로 조직한다.
