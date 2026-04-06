# Shared API

`shared/api`는 백엔드와의 연결을 담당하는 API 레이어입니다. 모든 API 정의를 중앙에서 관리합니다.

---

## 구조

```
shared/api/
├─ base/                       # 공통 인프라
│  ├─ base-http-client.ts      # Axios 래퍼, 인터셉터
│  ├─ errors.ts                # 에러 매핑
│  └─ types.ts                 # 공통 응답 타입 (pagination 등)
│
├─ product/                    # 도메인별 폴더
│  ├─ index.ts                 # 공개 인터페이스 (유일한 외부 접근점)
│  ├─ model.ts                 # 공유 도메인 타입 (조건부 생성)
│  ├─ product-http-client.ts   # 도메인 HTTP 클라이언트
│  └─ endpoints/               # 엔드포인트별 파일
│     ├─ get-product-list.ts
│     └─ create-product.ts
│
└─ auth/                       # 모든 도메인은 같은 패턴
   ├─ index.ts
   ├─ auth-http-client.ts
   └─ endpoints/
```

---

## 핵심 규칙

### 1. endpoints는 변환하지 않는다

엔드포인트 파일은 API 함수와 요청/응답 타입을 함께 둡니다. 허용되는 변환은 `response.data`를 꺼내 반환하는 것과, 백엔드 공통 응답 래퍼(예: `{ data: T }`)에서 실제 데이터까지 꺼내 반환하는 것입니다. 단, 공통 응답 타입이 `base/types.ts`에 정의되어 있어야 합니다.

필드명 변경, 데이터 정렬, 기본값 주입, 타입 변환 등은 금지합니다. 응답 타입은 백엔드가 주는 형태 그대로 정의합니다.

데이터 변환이 필요하면 **API를 소비하는 쪽**에서 처리합니다.

### 2. model.ts는 백엔드 계약만 정의한다

둘 이상의 endpoint가 공유하는 도메인 엔티티와 상태 타입만 둡니다. 프론트엔드 표현 관심사(표시 매핑, 변환, 파생 규칙)는 API를 소비하는 상위 레이어에 둡니다.

공유할 도메인 타입이 없으면 model.ts를 생성하지 않습니다.

```ts
// model.ts — 백엔드 계약 타입만
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

### 3. index.ts가 유일한 외부 접근점이다

API 함수는 `[DOMAIN]_API` 객체로 묶어 export합니다. 외부에서는 `@shared/api/[domain]`만 import합니다.

```ts
// index.ts
import { getProductList } from './endpoints/get-product-list';
import { createProduct } from './endpoints/create-product';

export const PRODUCT_API = {
  getProductList,
  createProduct,
};

// 외부에 필요한 타입만 re-export
export type { GetProductListReq } from './endpoints/get-product-list';
export type { ProductItem, ProductStatus } from './model';
export { PRODUCT_STATUS } from './model';
```

### 4. ESLint로 내부 접근 차단

```
✅ @shared/api/product                       (index.ts entrypoint)
❌ @shared/api/product/endpoints/...         (내부 파일 직접 접근)
❌ @shared/api/product/model                 (내부 파일 직접 접근)
❌ @shared/api/product/product-http-client   (내부 파일 직접 접근)
```

```js
"no-restricted-imports": ["error", {
  patterns: [
    {
      group: ["@shared/api/*/*"],
      message: "API 내부 모듈은 직접 import 할 수 없습니다. entrypoint를 통해 접근하세요.",
    },
  ],
}]
```

---

## 새 도메인 추가 순서

1. `shared/api/[domain]/` 폴더 생성
2. `[domain]-http-client.ts` — base-http-client 확장
3. `endpoints/` — 엔드포인트별 파일 (함수 + req/res 타입)
4. `model.ts` — 공유 도메인 타입이 있을 때만
5. `index.ts` — `[DOMAIN]_API` 객체 export
6. ESLint 규칙은 `@shared/api/*/*` 패턴으로 이미 커버됨

---

## 컨벤션

- 파일명: kebab-case (`get-product-list.ts`)
- 타입명: PascalCase + 접미사 (`GetProductListReq`, `GetProductListRes`)
- API 함수명: camelCase, 동사+명사 (`getProductList`)
- HTTP 클라이언트: `[domain]-http-client.ts`
- 도메인 내부: 상대경로 import
- 도메인 외부: `@shared/api/[domain]` entrypoint만
