# Shared API

이 문서는 `shared/api` Segment의 내부 구조를 다룬다. API 레이어가 왜 shared에 중앙화되는지, 어떤 계층으로 나뉘는지, 도메인은 어떤 기준으로 분리되는지가 이 문서의 범위다.

---

## 왜 API를 중앙화하는가

API 호출 코드는 프로젝트 어디에서든 필요해진다. page에서, feature에서, query-factory에서, 서버 컴포넌트에서 호출된다. 각 호출처마다 별도로 클라이언트를 만들고 에러를 처리하고 타입을 정의하면, 같은 엔드포인트에 대한 코드가 프로젝트 여러 곳에 흩어지게 된다. 한 곳의 응답 스키마가 바뀔 때 어디를 고쳐야 하는지 추적할 수 없고, 인증·에러 처리 같은 횡단 관심사가 호출처마다 달리 적용될 위험이 생긴다.

이 아키텍처는 모든 API 정의를 `shared/api` 한 곳에 모으고, **3계층 구조**를 강제한다.

1. **http-client** — 전송 계층. Axios 인스턴스, 인터셉터, 기본 설정, 에러 정규화.
2. **endpoints** — 각 엔드포인트의 함수와 요청/응답 타입. 변환은 하지 않는다.
3. **public interface (`index.ts`)** — 도메인 외부에 공개되는 유일한 접근점.

이 계층화는 각 층이 하나의 책임만 가지게 한다. 전송 세부사항은 http-client가, 스키마는 endpoints가, 외부 노출은 public interface가 담당한다.

**entities는 API를 소유하지 않는다.** entity는 도메인 표현(도메인 UI, 표시 로직)만 담당한다. API 정의는 전부 `shared/api`에 있고, entity는 필요한 타입을 shared/api에서 import해서 사용한다.

---

## 도메인의 정의

`shared/api`는 도메인별 폴더로 구성된다. 여기서 **도메인은 비즈니스 엔티티가 아니라 전송 영역**이다. `shared/api`의 도메인은 하나의 http-client 인스턴스에 대응하며, 그 인스턴스가 담당하는 **baseURL + 공통 처리(인터셉터·에러 처리) 묶음**이 도메인의 경계다.

분리 기준은 다음 중 하나 이상이다.

- **baseURL이 다르다** — 다른 서버, 또는 같은 서버라도 경로 prefix가 다른 요청군
- **그 그룹만의 공통 처리가 필요하다** — 인터셉터·에러 처리·헤더가 하위 리소스 전반에 공통 적용되어야 함

리소스 수는 분리 기준이 아니다. 공통 처리가 같으면 하나의 도메인 안에서 `endpoints/` 서브폴더로 조직해도 된다. 리소스가 많다는 이유만으로 도메인을 쪼개지 않는다.

---

## 전체 구조

```txt
shared/api/
├─ base/                               # 공통 인프라 (외부에서 직접 import 금지)
│  ├─ base-http-client.ts              # 프로젝트 포터블 기반 클래스
│  ├─ authenticated-http-client.ts     # 중간 클래스 (선택)
│  ├─ errors.ts                        # HttpError, 에러 로깅
│  └─ types.ts                         # 공통 응답 타입
│
├─ main/                               # baseURL: 'https://api.example.com'
│  ├─ index.ts                         # 공개 인터페이스
│  ├─ model.ts                         # 공유 도메인 타입 (선택)
│  ├─ errors.ts                        # 도메인 에러 (선택)
│  ├─ main-http-client.ts              # 도메인 HTTP 클라이언트
│  └─ endpoints/
│     ├─ get-product-list.ts
│     └─ get-user.ts
│
└─ order/                              # 같은 서버지만 결제 공통 처리가 다름
   ├─ index.ts                         #   (baseURL: 'https://api.example.com/order')
   ├─ order-http-client.ts
   └─ endpoints/
      ├─ get-order.ts
      └─ pay-order.ts
```

---

## base — 공통 인프라

`base/`는 모든 도메인이 공유하는 전송 계층 기반 코드를 담는 폴더다. **외부(`@shared/api/base/*`)에서 직접 import하지 않는다.** 외부에 공개가 필요한 공통 타입(`HttpError` 등)은 각 도메인이 extend하여 re-export하는 방식으로 노출한다.

base에는 두 종류의 파일이 존재할 수 있다.

**BaseHttpClient**는 모든 도메인 HTTP 클라이언트의 기반 클래스다. **프로젝트 포터블**하게 유지한다 — 프로젝트를 바꿔도 그대로 쓸 수 있도록, 특정 프로젝트의 인증·세션·리다이렉트 같은 종속 로직을 여기에 넣지 않는다.

BaseHttpClient의 역할은 다음과 같다.

- 기본 설정(timeout, headers)을 적용한다. 생성자 config로 override 가능하다.
- 인터셉터 훅 4개(`onRequest`, `onRequestError`, `onResponse`, `onResponseError`)를 `protected`로 제공한다. 하위 클래스가 필요한 훅만 override한다.
- HTTP 래퍼 메서드(get, post, put, patch, delete)에서 `response.data`를 언래핑해 반환한다. endpoints가 직접 언래핑할 필요가 없다.
- 기본 `onResponseError`에서 `AxiosError`를 `HttpError`로 정규화한다. 에러가 어느 도메인에서 나오든 일관된 타입으로 처리된다.

### 왜 이 구조인가

**클래스로 만드는 이유**는 설정과 인터셉터를 한 인스턴스에 묶고, 도메인 클라이언트가 상속으로 확장하게 하기 위해서다. 함수 팩토리로도 비슷한 효과를 낼 수 있지만, 여러 도메인이 공유하는 중간 클래스(인증 공통, 모니터링 공통 등)를 표현할 때 상속 계층이 자연스럽다.

**인터셉터 훅을 `protected`로 두는 이유**는 외부 호출은 막고 하위 클래스의 override만 허용하는 확장점으로 삼기 위해서다. `public`이면 호출부에서 임의로 호출할 수 있어 예측 가능성이 깨지고, `private`이면 override 자체가 불가능해진다.

**HTTP 래퍼 메서드를 두는 이유**는 axios의 전송 계층 세부사항(`AxiosResponse` 래핑)이 endpoints로 새지 않게 하기 위해서다. endpoints는 서버가 돌려준 데이터 형태만 알고, 그 데이터가 `res.data`에 담겨 있다는 사실은 모른다. 이 경계가 유지되면 전송 라이브러리를 교체할 때도 수정 지점이 BaseHttpClient에 국한된다.

```ts
// shared/api/base/base-http-client.ts
export class BaseHttpClient {
  protected axiosInstance: AxiosInstance;

  constructor(config?: AxiosRequestConfig) {
    this.axiosInstance = axios.create({ timeout: 60_000, ...config });
    // 생성자에서 인터셉터 등록 (onRequest/onResponse 등 훅 호출)
  }

  // 인터셉터 훅 — 하위 클래스에서 override
  protected onRequest(config: HttpConfig): HttpConfig { return config; }
  protected onResponseError(error: AxiosError): Promise<never> {
    return Promise.reject(new HttpError(error));
  }
  // onRequestError, onResponse도 같은 방식으로 protected 제공

  // HTTP 래퍼 — response.data 언래핑
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const res = await this.axiosInstance.get<T>(url, config);
    return res.data;
  }
  // post, put, patch, delete도 같은 패턴
}
```

`HttpError`는 `AxiosError`의 필요한 필드만 안정적인 형태로 노출한다.

```ts
// shared/api/base/errors.ts
export class HttpError extends Error {
  readonly status: number;
  readonly errorData: unknown;

  constructor(error: AxiosError) {
    super(error.message);
    this.name = 'HttpError';
    this.status = error.response?.status ?? 0;
    this.errorData = error.response?.data;
  }
}
```

**중간 클래스**는 여러 도메인이 공유하는 프로젝트별 인터셉터(인증, 모니터링 등)를 중앙화하는 선택적 파일이다. 필요할 때만 만든다. 파일명은 **역할 기반**으로 짓는다 — 인증 공통이면 `authenticated-http-client.ts`, 모니터링 공통이면 `monitored-http-client.ts`, 여러 관심사를 조합하면 `app-http-client.ts`처럼 조합된 역할을 나타낸다.

모든 도메인이 동일한 인증을 쓰더라도 **BaseHttpClient에 직접 인증을 넣지 않는다**. 인증 로직은 중간 클래스로 분리해서 base에 두고, BaseHttpClient는 프로젝트 포터블로 유지한다. 이 원칙이 깨지면 다음 프로젝트에서 BaseHttpClient를 재사용할 수 없게 된다.

---

## 도메인 HTTP 클라이언트

각 도메인 폴더에는 `[domain]-http-client.ts`가 있다. BaseHttpClient(또는 중간 클래스)를 상속해 도메인별 설정을 적용한 인스턴스다.

도메인 HTTP 클라이언트의 역할은 세 가지다.

- **baseURL 설정** — 도메인이 가리키는 서버 주소를 지정한다.
- **인터셉터 override** — 해당 도메인만의 전처리·후처리가 필요하면 override한다.
- **전송 세부사항 캡슐화** — endpoints가 baseURL이나 인증 방식을 알 필요 없이 http-client 메서드를 통해 요청한다.

도메인당 하나의 인스턴스를 `export const`로 내보낸다. 파일명은 `[domain]-http-client.ts` 형태를 쓴다.

### 패턴

**baseURL만 다른 경우**는 BaseHttpClient를 그대로 new로 생성한다. 인터셉터를 override할 필요가 없다.

```ts
// shared/api/main/main-http-client.ts
export const mainHttpClient = new BaseHttpClient({ baseURL: ENV.API_URL });
```

**해당 도메인만의 고유 인터셉터가 필요한 경우**는 도메인 폴더 안에서 BaseHttpClient를 extend한 클래스를 만들어 훅을 override한다.

```ts
// shared/api/external/external-http-client.ts
class ExternalHttpClient extends BaseHttpClient {
  protected onRequest(config: HttpConfig): HttpConfig {
    config.headers['X-Api-Key'] = ENV.EXTERNAL_API_KEY;
    return config;
  }
}

export const externalHttpClient = new ExternalHttpClient({ baseURL: ENV.EXTERNAL_URL });
```

**여러 도메인이 같은 인터셉터를 공유하는 경우**는 중간 클래스를 base에 만든다. 인증이 필요한 모든 도메인이 같은 토큰 주입 로직을 쓰면, `AuthenticatedHttpClient`를 base에 두고 각 도메인 클라이언트가 이 클래스를 상속한다.

```ts
// shared/api/base/authenticated-http-client.ts
export class AuthenticatedHttpClient extends BaseHttpClient {
  protected onRequest(config: HttpConfig): HttpConfig {
    const token = getAccessToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  }
}

// shared/api/main/main-http-client.ts — 각 도메인은 상속만
export const mainHttpClient = new AuthenticatedHttpClient({ baseURL: ENV.API_URL });
```

**인증 방식이 여러 개인 경우**는 역할 기반 네이밍으로 중간 클래스를 분리한다. `UserAuthHttpClient`(사용자 Bearer 토큰), `AdminAuthHttpClient`(관리자 API Key) 같은 식으로 각각 base에 두고, 해당 인증을 쓰는 도메인들이 각자 상속한다.

```txt
BaseHttpClient
├─ UserAuthHttpClient       ← 사용자 인증 (Bearer)
│  ├─ productHttpClient
│  └─ orderHttpClient
└─ AdminAuthHttpClient      ← 관리자 인증 (API Key)
   ├─ auditHttpClient
   └─ cmsHttpClient
```

**여러 관심사를 조합해야 할 때**는 세 가지 전략이 있다. 관심사가 항상 함께 다니면 하나의 중간 클래스에 합친다. 조합이 도메인 그룹별로 다르면 상속 체이닝으로 관심사를 쌓는다. 조합이 3개 이상으로 복잡해지면 인터셉터 로직을 유틸 함수로 분리하고 각 클래스의 훅에서 호출해 조합한다.

---

## 도메인 폴더의 구성

도메인 폴더에는 다음 파일이 온다.

| 파일 | 필수 여부 | 역할 |
|------|----------|------|
| `[domain]-http-client.ts` | 필수 | 도메인 HTTP 클라이언트 인스턴스 |
| `endpoints/*.ts` | 필수 | 엔드포인트별 함수 + 요청/응답 타입 |
| `index.ts` | 필수 | 공개 인터페이스 |
| `model.ts` | 조건부 | 둘 이상의 endpoint 또는 외부 consumer가 공유하는 도메인 타입 |
| `errors.ts` | 조건부 | 외부에서 타입으로 분기해야 하는 도메인 에러 |

조건부 파일은 **실제 필요가 발생했을 때만** 만든다. 공유할 도메인 타입이 없으면 `model.ts`를 만들지 않는다. 외부에서 도메인 에러 타입을 분기할 필요가 없으면 `errors.ts`를 만들지 않는다. 빈 파일이나 미리 준비된 껍데기를 두지 않는다.

### endpoints

엔드포인트별로 파일을 하나씩 만들고, API 함수와 요청/응답 타입을 **반드시 한 파일에** 둔다.

허용되는 변환은 두 가지뿐이다. `response.data`를 꺼내 반환하는 것(HTTP 래퍼가 이미 처리), 그리고 백엔드 공통 응답 래퍼(`{ data: T, success: boolean }` 같은 것)에서 실제 데이터(`T`)까지 꺼내 반환하는 것이다. 후자는 공통 응답 타입이 `base/types.ts`에 정의되어 있을 때만 인정된다.

금지되는 변환:
- 필드명 변경 (snake_case → camelCase 포함)
- 데이터 정렬·필터링
- 기본값 주입
- 파생 필드 생성
- UI 표현용 구조 재조합
- 문자열을 Date 등 다른 타입으로 변환

응답 타입은 **백엔드가 주는 형태 그대로** 정의한다. 데이터 변환이 필요하면 API를 소비하는 쪽(page, feature, entity)에서 처리한다.

이 제약의 이유는 **endpoints를 Transport 계층으로 유지**하기 위해서다. 변환이 endpoints에 들어가는 순간, 백엔드 스키마와 프론트엔드 표현이 같은 파일에 섞인다. 스키마 변경이 프론트엔드 표현 파괴를 동반하게 되고, 한 엔드포인트에 여러 표현이 필요한 상황에서 변환 로직이 가장 엉뚱한 곳에서 자라기 시작한다.

```ts
// shared/api/product/endpoints/get-product-list.ts
type GetProductListReq = { category?: string; page: number; size: number };
type GetProductListRes = DefaultResponse<{ items: ProductItem[]; totalCount: number }>;

export const getProductList = (params: GetProductListReq) =>
  productHttpClient.get<GetProductListRes>('/products', { params });
```

### model.ts

`model.ts`는 **둘 이상의 endpoint 또는 외부 consumer가 공유하는** 도메인 엔티티·상태 타입·상수를 정의한다. 백엔드 계약만 담는다. 프론트엔드 표현 관심사(표시 매핑, 변환, 파생 규칙)는 API를 소비하는 상위 레이어에 둔다.

endpoint 전용 요청/응답 타입은 `model.ts`에 두지 않는다. 해당 `endpoints/*.ts`에 둔다. 공유할 도메인 타입이 없으면 `model.ts`를 만들지 않는다.

```ts
// shared/api/product/model.ts
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

### errors.ts

외부(page, feature 등)에서 해당 도메인 에러 타입을 참조해 분기해야 할 때만 도메인 폴더에 `errors.ts`를 만든다. 공통 처리(도메인 http-client의 `onResponseError`, 전역 Error Boundary)로 커버되면 만들지 않는다.

도메인 에러는 다음 규약을 따른다.

- `base/errors.ts`의 `HttpError`를 extend한다.
- `name` 필드에 도메인 이름을 포함한다 (`'ProductHttpError'`, `'OrderHttpError'` 등). `instanceof` 분기와 로깅 구분에 쓰인다.
- 도메인 http-client의 `onResponseError`에서 도메인 에러로 래핑해 throw한다.
- `index.ts`에서 re-export한다.

`base/errors.ts`의 `HttpError`는 외부에서 직접 import하지 않는다. 필요하면 도메인에서 extend하여 노출한다. 이 규칙이 base의 외부 차단 원칙과 도메인 경계를 함께 유지한다.

```ts
// shared/api/order/errors.ts
import { HttpError } from '../base/errors';

export class OrderHttpError extends HttpError {
  name = 'OrderHttpError';
}

// shared/api/order/order-http-client.ts
class OrderHttpClient extends AuthenticatedHttpClient {
  protected onResponseError(error: AxiosError): Promise<never> {
    return Promise.reject(new OrderHttpError(error));
  }
}
```

```ts
// 외부 사용처 — 도메인 에러로 분기
try {
  await ORDER_API.payOrder({ orderId });
} catch (e) {
  if (e instanceof OrderHttpError && e.status === 409) {
    // 결제 충돌 처리
  }
}
```

### index.ts

`index.ts`는 도메인 외부에 공개되는 **유일한 entrypoint**다.

- API 함수는 개별 export하지 않고 `[DOMAIN]_API` 객체로 묶어 export한다.
- 외부에 공개할 타입과 상수는 `index.ts`에서 **명시적으로** re-export한다. `export *`는 쓰지 않는다.
- endpoint 전용 요청/응답 타입과 domain model은 구분해서 re-export한다. 필요 시 section 주석으로 나눈다.
- endpoint 전용 타입은 **외부에서 실제로 필요한 것만** 노출한다.

API 함수를 객체로 묶는 이유는 외부에서 한 번의 import로 도메인 전체에 접근하게 하기 위해서다. `PRODUCT_API.getProductList(...)`처럼 호출하면 도메인이 드러나 코드를 읽을 때 맥락이 분명해진다.

```ts
// shared/api/product/index.ts

// --- Public API ---
import { getProductList } from './endpoints/get-product-list';
import { createProduct } from './endpoints/create-product';

export const PRODUCT_API = {
  getProductList,
  createProduct,
};

// --- Public endpoint types ---
export type { GetProductListReq } from './endpoints/get-product-list';
export type { CreateProductReq } from './endpoints/create-product';

// --- Public domain model ---
export type { ProductItem, ProductStatus } from './model';
export { PRODUCT_STATUS } from './model';
```

---

## 도메인 외부에서의 접근

도메인 밖의 모든 코드는 `@shared/api/[domain]`만 import한다. 내부 파일에 직접 접근하지 않는다.

```txt
✅ @shared/api/product                       # index.ts entrypoint
❌ @shared/api/product/endpoints/...         # 내부 파일 직접 접근 금지
❌ @shared/api/product/model                 # 내부 파일 직접 접근 금지
❌ @shared/api/product/product-http-client   # 내부 파일 직접 접근 금지
```

이 제약은 정적 분석(`no-restricted-imports`의 `@shared/api/*/*` 패턴)으로 자동 차단할 수 있다.

도메인 내부에서는 상대경로로 import한다. `base/`의 공통 타입이나 같은 도메인의 `model.ts`를 참조할 때도 상대경로를 쓴다.

---

## 새 도메인 추가 순서

1. `shared/api/[domain]/` 폴더를 만든다.
2. `[domain]-http-client.ts` — base-http-client(또는 중간 클래스)를 확장한다.
3. `endpoints/` — 엔드포인트별 파일(함수 + 요청/응답 타입)을 만든다.
4. `model.ts` — 둘 이상의 endpoint 또는 외부 consumer가 공유하는 타입이 있을 때만.
5. `errors.ts` — 외부에서 도메인 에러로 분기해야 할 때만.
6. `index.ts` — `[DOMAIN]_API` 객체와 필요한 타입·에러를 명시적으로 re-export한다.

정적 분석의 `@shared/api/*/*` 차단 패턴은 한 번 설정되면 새 도메인에 추가 설정이 필요 없다.

---

## 네이밍 요약

| 항목 | 규칙 | 예 |
|------|------|-----|
| 파일명 | kebab-case, URL/기능 기준 | `get-product-list.ts`, `update-user-profile.ts` |
| 요청 타입 | PascalCase + `Req` | `GetProductListReq`, `CreateOrderReq` |
| 응답 타입 | PascalCase + `Res` | `GetProductListRes`, `CreateOrderRes` |
| API 함수 | camelCase, 동사+명사 | `getProductList`, `createOrder` |
| HTTP 클라이언트 | `[domain]-http-client.ts` | `main-http-client.ts`, `order-http-client.ts` |
| API 객체 | `[DOMAIN]_API` | `PRODUCT_API`, `ORDER_API` |

---

## 정리

- API는 `shared/api`에 중앙화된다. 3계층 구조(http-client / endpoints / public interface)를 강제한다.
- 도메인은 비즈니스가 아니라 전송 영역(baseURL + 공통 처리)으로 분리한다. 리소스 수는 기준이 아니다.
- `base/`는 외부에서 직접 import하지 않는다. 외부 공개가 필요하면 도메인이 extend해서 노출한다.
- BaseHttpClient는 프로젝트 포터블. 인증·세션은 중간 클래스나 도메인 http-client에.
- endpoints는 변환하지 않는다. 응답 타입은 백엔드 형태 그대로.
- `model.ts`·`errors.ts`는 실제 필요가 생겼을 때만 만든다.
- `index.ts`는 `[DOMAIN]_API` 객체와 명시적 re-export로 공개 인터페이스를 정의한다.
