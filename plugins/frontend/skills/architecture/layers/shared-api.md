# Shared API Segment

> `shared/api`의 내부 구조와 컨벤션 규약이다.

문서에서 `[domain]`은 실제 폴더명으로 치환하는 placeholder이다.
**도메인은 baseURL 단위로 구분한다.** 같은 서버(같은 baseURL)의 리소스는 하나의 도메인에 속한다. 예: `internal`(API route), `auth`(인증 서버), `main`(메인 백엔드)

---

## 1. 목적

`shared/api`는 백엔드와의 연결을 담당하는 API 레이어이다.

- 모든 도메인은 동일한 3계층 구조를 따른다.
- 외부는 반드시 `index.ts` entrypoint만 통해 접근한다.
- Transport 레이어는 서버 응답을 가공하지 않는다.

---

## 2. 전체 구조

```txt
shared/api/
├─ base/                       # 공통 인프라
│  ├─ base-http-client.ts
│  ├─ errors.ts
│  └─ types.ts
│
├─ main/                       # 메인 BE (baseURL: 'https://api.example.com')
│  ├─ index.ts
│  ├─ model.ts
│  ├─ main-http-client.ts
│  └─ endpoints/
│     ├─ get-product-list.ts
│     ├─ create-product.ts
│     └─ get-order.ts
│
└─ auth/                       # 인증 서버 (baseURL: 'https://auth.example.com')
   ├─ index.ts
   ├─ auth-http-client.ts
   └─ endpoints/
```

---

## 3. base — 공통 인프라

`base/`는 모든 도메인이 공유하는 전송 계층 기반 코드를 둔다.

- `base-http-client.ts` — Axios 래퍼, 인터셉터, 인증 토큰 주입
- `errors.ts` — 에러 매핑, 공통 에러 클래스
- `types.ts` — 공통 pagination 응답 등 모든 도메인이 공유하는 인프라 타입

---

## 4. 도메인별 구조

모든 도메인은 반드시 아래 구조를 따른다.

```txt
[domain]/
├─ index.ts                    # 공개 인터페이스
├─ model.ts                    # 도메인 엔티티 (조건부 생성)
├─ [domain]-http-client.ts     # HTTP 클라이언트
└─ endpoints/                  # Transport 레이어
   └─ *.ts                     # 엔드포인트별 파일
```

### 4.1 model.ts — 도메인 모델

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

### 4.2 endpoints/*.ts — Transport 레이어

엔드포인트별로 API 함수와 요청/응답 타입을 **반드시 한 파일에** 둔다.

**허용되는 변환:**
- Axios 응답 객체에서 `response.data`를 꺼내 반환하는 것
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
  const response = await productHttpClient.get<GetProductListRes>(
    '/products',
    { params },
  );
  return response.data;
};
```

### 4.3 index.ts — 공개 인터페이스

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
- `base-http-client.ts`를 확장하여 도메인별 설정을 적용한다.
- **도메인별 http-client는 baseURL 단위로 구분한다.** 같은 서버의 도메인은 같은 baseURL을 사용하고, 다른 서버(외부 BE, API route 등)는 다른 baseURL을 설정한다.

---

## 7. 새 도메인 추가 체크리스트

1. `shared/api/[domain]/` 폴더를 생성한다.
2. `[domain]-http-client.ts` — `base-http-client.ts`를 확장한 HTTP 클라이언트를 작성한다.
3. `endpoints/` — 엔드포인트별 파일을 작성한다. 함수와 req/res 타입을 한 파일에 둔다.
4. `model.ts` — 둘 이상의 endpoint 또는 외부 consumer가 공유하는 도메인 타입이 있을 때만 생성한다.
5. `index.ts` — `[DOMAIN]_API` 객체를 export하고, 외부 필요 타입만 re-export한다.
6. ESLint `no-restricted-imports`에 해당 도메인 패턴을 추가한다.

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
  const response = await [domain]HttpClient.get<Get[Resource]Res>(
    '/endpoint',
    { params },
  );
  return response.data;
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
- `endpoints/*.ts`는 `response.data`만 꺼내서 반환한다.
- 타입은 반드시 `type` import로 가져온다. (`import { type Foo }`)
- 새 도메인은 기존 도메인과 동일한 구조로 생성한다.
- `model.ts`에는 둘 이상의 endpoint 또는 외부 consumer가 공유하는 도메인 엔티티, 상태 타입, 상수를 둔다.
- `index.ts`에서 endpoint 전용 타입과 domain model을 구분해서 re-export한다.

### Don't

- `endpoints/*.ts`에서 응답을 가공하지 않는다. (필드명 변경, 정렬, 기본값 주입, 타입 변환 등)
- 외부에서 `endpoints/*`, `model.ts`, `*-http-client.ts`를 직접 import하지 않는다.
- `index.ts`에서 API 함수를 개별 named export로 내보내지 않는다.
- `index.ts`에서 `export *`를 사용하지 않는다.
- endpoint 전용 req/res 타입을 `model.ts`에 두지 않는다. 해당 `endpoints/*.ts`에 둔다.
- 둘 이상의 endpoint 또는 외부 consumer가 공유하는 도메인 타입이 없는데 `model.ts`를 생성하지 않는다.
