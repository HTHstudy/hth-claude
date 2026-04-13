# Shared API

`shared/api`는 백엔드와의 연결을 담당하는 API 레이어입니다. 모든 API 정의를 중앙에서 관리합니다.

---

## 구조

```
shared/api/
├─ base/                       # 공통 인프라
│  ├─ base-http-client.ts      # BaseHttpClient 클래스 (프로젝트 포터블)
│  ├─ [auth]-http-client.ts    # 중간 클래스 (선택 — 인증 그룹 공유 시)
│  ├─ errors.ts                # 에러 매핑
│  └─ types.ts                 # 공통 응답 타입
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

## base/ — 공통 인프라

`base/` 폴더에는 모든 도메인이 공유하는 전송 계층 기반 코드를 둡니다.

```
shared/api/base/
├─ base-http-client.ts      # BaseHttpClient 클래스 (프로젝트 포터블)
├─ [auth]-http-client.ts    # 중간 클래스 (선택 — 인증 그룹 공유 시)
├─ errors.ts                # 에러 매핑, 공통 에러 클래스
└─ types.ts                 # 공통 응답 타입
```

`base/` 폴더에는 두 종류의 파일이 존재할 수 있습니다:
- **BaseHttpClient** — 프로젝트를 바꿔도 그대로 쓸 수 있는 포터블 기반 클래스. 프로젝트 종속 로직(인증, 세션)을 포함하지 않습니다.
- **중간 클래스** — 여러 도메인이 공유하는 프로젝트별 인터셉터(인증, 모니터링 등). 필요할 때만 생성합니다.

### BaseHttpClient

모든 도메인 HTTP 클라이언트의 기반 클래스입니다. 기본 설정(timeout, headers)을 적용하고, 인터셉터 훅을 `protected`로 제공하여 도메인 HTTP 클라이언트에서 override할 수 있게 합니다.

- `onRequest` — 요청 전처리 (인증 토큰 주입 등)
- `onRequestError` — 요청 에러 핸들링
- `onResponse` — 응답 후처리 (세션 만료 감지 등)
- `onResponseError` — 응답 에러 핸들링 (기본: `HttpError`로 변환)

HTTP 래퍼 메서드(get, post, put, patch, delete)는 `response.data`를 언래핑하여 반환합니다. endpoints에서 직접 언래핑할 필요가 없습니다.

### base에 넣는 것 / 넣지 않는 것

| 넣는다 | 넣지 않는다 |
|--------|------------|
| Axios 생성, 기본 timeout/headers | 인증 토큰 주입 |
| `HttpError` 에러 클래스, 에러 로깅 | 세션 만료 핸들링 |
| `DefaultResponse` 공통 응답 타입 | 응답 코드별 리다이렉트 |
| `response.data` 언래핑 HTTP 래퍼 | |

판단 기준: **"모든 도메인이 공유하는가?"** — 공유하면 base, 아니면 도메인 HTTP 클라이언트에서 override합니다.

---

## 도메인 HTTP 클라이언트

각 도메인 폴더에는 `[domain]-http-client.ts`가 있습니다. BaseHttpClient에 도메인별 설정(baseURL, 인증 등)을 적용하는 어댑터입니다.

### 왜 분리하나?

- **baseURL 단위 분리** — 같은 서버의 리소스는 하나의 http-client를 공유하고, 다른 서버는 별도 http-client를 사용합니다.
- **인터셉터 격리** — 인증이 필요한 도메인과 public 도메인의 요청 전처리를 분리합니다.
- **전송 세부사항 캡슐화** — endpoints는 baseURL이나 인증 방식을 알 필요 없습니다.

### 두 가지 패턴

**기본 — baseURL만 다를 때:**

```ts
import { BaseHttpClient } from '../base/base-http-client';
import { ENV } from '@shared/config/env';

export const mainHttpClient = new BaseHttpClient({
  baseURL: ENV.API_URL,
});
```

**확장 — 인터셉터 override (인증 등):**

```ts
import { BaseHttpClient } from '../base/base-http-client';
import type { HttpConfig } from '../base/base-http-client';
import { ENV } from '@shared/config/env';

class MainHttpClient extends BaseHttpClient {
  protected onRequest(config: HttpConfig): HttpConfig {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  }
}

export const mainHttpClient = new MainHttpClient({
  baseURL: ENV.API_URL,
});
```

여러 도메인이 같은 인증 로직을 공유하면 중간 클래스를 만들어 상속할 수 있습니다. 도메인 http-client는 해당 중간 클래스를 상속합니다.

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
