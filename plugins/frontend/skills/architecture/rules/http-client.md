# Shared API — HTTP Client

> `shared/api/base/`와 도메인별 HTTP 클라이언트의 구조, 템플릿, 확장 패턴이다.

---

## 1. 개요

HTTP 클라이언트는 2계층으로 구성한다.

```txt
base/                              # 공통 인프라 (외부 import 금지)
├─ base-http-client.ts             # BaseHttpClient 클래스 (프로젝트 포터블)
├─ authenticated-http-client.ts    # 중간 클래스 예 (선택 — 여러 도메인 공유 인터셉터)
├─ errors.ts                       # 에러 클래스
└─ types.ts                        # 공통 응답 타입

[domain]/
└─ [domain]-http-client.ts         # 도메인별 인스턴스 — 상속 또는 그대로 사용
```

`base/` 폴더에는 두 종류의 파일이 존재할 수 있다:
- **BaseHttpClient** — 프로젝트를 바꿔도 그대로 쓸 수 있는 포터블 기반 클래스
- **중간 클래스** — 여러 도메인이 공유하는 프로젝트별 인터셉터 (인증, 모니터링 등). 선택 사항. 파일명은 **역할 기반**으로 짓는다 (`authenticated-http-client.ts`, `monitored-http-client.ts`, `app-http-client.ts` 등).

---

## 2. BaseHttpClient

모든 도메인 HTTP 클라이언트의 기반 클래스다. 프로젝트 종속 로직을 포함하지 않는다.

**역할:**
- 프로젝트 공통 기본 설정 (timeout, headers) 적용
- 인터셉터 훅 제공 — 하위 클래스에서 `protected` 메서드 override로 확장
- `res.data` 언래핑 HTTP 래퍼 메서드 — endpoints에서 `AxiosResponse` 언래핑 불필요
- 공통 에러 변환 (`AxiosError` → `HttpError`)

**설계 원칙:**
- `axiosInstance`는 `protected` — 외부에서 직접 접근하지 않고, HTTP 래퍼 메서드를 통해 사용한다.
- 인터셉터 훅 4개는 `protected`로 선언하여 상속 시 override 가능하게 한다.
- HTTP 래퍼 메서드(get/post/put/patch/delete)는 `response.data`를 반환한다. endpoints가 직접 언래핑할 필요 없다.
- **BaseHttpClient에는 프로젝트 종속 로직(인증, 세션, 리다이렉트)을 넣지 않는다.** 이런 로직은 중간 클래스 또는 도메인 http-client에서 override한다.

**인터셉터 훅 용도:**

| 훅 | 용도 예시 |
|------|----------|
| `onRequest` | 인증 토큰 주입, 플랫폼 헤더 추가, 요청 ID 생성, locale 헤더, 요청 로깅 |
| `onRequestError` | 요청 실패 로깅, 모니터링 전송 |
| `onResponse` | 응답 로깅, 세션 만료 감지, 서버 점검 감지, 응답 코드별 핸들링 |
| `onResponseError` | 에러 정규화, 401/403 핸들링, 리트라이 로직, 에러 모니터링 전송 |

**기본 템플릿:**

아래는 안전한 기본값을 포함한 템플릿이다. 모든 설정은 프로젝트에 맞게 확장·변경 가능하다.

- **constructor 기본값** (timeout, headers): 안전한 기본값이며, 생성자 `config` 파라미터로 override 가능하다.
- **에러 래핑** (`onResponseError`): 모든 도메인의 에러를 `HttpError`로 정규화한다. base의 핵심 가치이며, `HttpError` 클래스 자체는 프로젝트에 맞게 확장한다.
- **HTTP 래퍼 메서드**: 필요한 메서드만 정의해도 된다. 한 줄짜리이므로 전부 포함해도 비용이 없다.

```ts
// shared/api/base/base-http-client.ts
import type {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  AxiosError,
  InternalAxiosRequestConfig,
} from 'axios';
import axios from 'axios';
import { HttpError, logError } from './errors';

/** 인터셉터 내부에서 사용하는 설정 타입 */
export type HttpConfig = InternalAxiosRequestConfig;

export class BaseHttpClient {
  protected axiosInstance: AxiosInstance;

  constructor(config?: AxiosRequestConfig) {
    this.axiosInstance = axios.create({
      timeout: 60 * 1000,
      headers: { 'Content-Type': 'application/json' },
      ...config,
    });
    this.setupInterceptors();
  }

  // ── 인터셉터 훅 (protected — 하위 클래스에서 override) ──

  protected onRequest(config: HttpConfig): HttpConfig {
    return config;
  }

  protected onRequestError(error: AxiosError): Promise<never> {
    return Promise.reject(error);
  }

  protected onResponse<T = unknown>(response: AxiosResponse<T>): AxiosResponse<T> {
    return response;
  }

  protected onResponseError(error: AxiosError): Promise<never> {
    const httpError = new HttpError(error);
    logError(httpError);
    return Promise.reject(httpError);
  }

  // ── 인터셉터 등록 (private — 생성자에서 1회 호출) ──

  private setupInterceptors(): void {
    this.axiosInstance.interceptors.request.use(
      (cfg: HttpConfig) => this.onRequest(cfg),
      (err: AxiosError) => this.onRequestError(err),
    );
    this.axiosInstance.interceptors.response.use(
      (res: AxiosResponse) => this.onResponse(res),
      (err: AxiosError) => this.onResponseError(err),
    );
  }

  // ── HTTP 래퍼 메서드 (response.data 언래핑) ──

  async get<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const res = await this.axiosInstance.get<T>(url, config);
    return res.data;
  }

  async post<T = unknown, B = unknown>(url: string, body?: B, config?: AxiosRequestConfig): Promise<T> {
    const res = await this.axiosInstance.post<T>(url, body, config);
    return res.data;
  }

  async put<T = unknown, B = unknown>(url: string, body?: B, config?: AxiosRequestConfig): Promise<T> {
    const res = await this.axiosInstance.put<T>(url, body, config);
    return res.data;
  }

  async patch<T = unknown, B = unknown>(url: string, body?: B, config?: AxiosRequestConfig): Promise<T> {
    const res = await this.axiosInstance.patch<T>(url, body, config);
    return res.data;
  }

  async delete<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const res = await this.axiosInstance.delete<T>(url, config);
    return res.data;
  }
}
```

---

## 3. errors.ts

```ts
// shared/api/base/errors.ts
import type { AxiosError } from 'axios';

export class HttpError extends Error {
  readonly status: number;
  readonly statusText: string;
  readonly errorData: unknown;
  readonly originalError: AxiosError;

  constructor(error: AxiosError) {
    super(error.message);
    this.name = 'HttpError';
    this.status = error.response?.status ?? 0;
    this.statusText = error.response?.statusText ?? '';
    this.errorData = error.response?.data;
    this.originalError = error;
  }
}

export function logError(error: HttpError): void {
  console.error(`[API ${error.status}] ${error.message}`, error.errorData);
}
```

---

## 4. types.ts

```ts
// shared/api/base/types.ts
export type DefaultResponse<T> = {
  data: T;
};
```

> `DefaultResponse`는 백엔드가 공통 응답 래퍼를 사용할 때만 정의한다. 프로젝트마다 구조가 다르므로 필요 시 조정한다.

---

## 5. 도메인 HTTP 클라이언트

BaseHttpClient(또는 중간 클래스)를 상속하여 도메인별 설정을 적용한다.

**역할:**
- baseURL 설정 — 도메인이 가리키는 서버 주소 지정
- 인터셉터 override — 도메인 전용 전처리·후처리

**존재 이유:**
- **baseURL 단위 분리** — 같은 서버의 리소스는 하나의 http-client를 공유하고, 다른 서버(외부 BE, API route 등)는 별도 http-client를 사용한다.
- **인터셉터 격리** — 도메인별로 다른 전처리·후처리를 분리한다.
- **전송 세부사항 캡슐화** — endpoints는 baseURL이나 인증 방식을 알 필요 없이 http-client를 통해 요청한다.

**설계 원칙:**
- 도메인당 하나의 인스턴스를 `export const`로 내보낸다.
- baseURL이 같은 도메인은 같은 http-client를 공유할 수 있다.
- 파일명은 `[domain]-http-client.ts` 형태를 사용한다.

### 5.1 기본 — base 그대로 사용

baseURL만 다르고 인터셉터 커스텀이 필요 없는 경우:

```ts
// shared/api/main/main-http-client.ts
import { BaseHttpClient } from '../base/base-http-client';
import { ENV } from '@shared/config/env';

export const mainHttpClient = new BaseHttpClient({
  baseURL: ENV.API_URL,
});
```

### 5.2 확장 — 도메인에서 직접 override

해당 도메인만 고유한 인터셉터가 필요한 경우:

```ts
// shared/api/external/external-http-client.ts
import { BaseHttpClient } from '../base/base-http-client';
import type { HttpConfig } from '../base/base-http-client';
import { ENV } from '@shared/config/env';

class ExternalHttpClient extends BaseHttpClient {
  protected onRequest(config: HttpConfig): HttpConfig {
    config.headers['X-Api-Key'] = ENV.EXTERNAL_API_KEY;
    return config;
  }
}

export const externalHttpClient = new ExternalHttpClient({
  baseURL: ENV.EXTERNAL_URL,
});
```

### 5.3 중간 클래스 — 여러 도메인이 같은 인터셉터를 공유

여러 도메인이 동일한 인증·모니터링·로깅 등의 인터셉터를 공유할 때, 중간 클래스를 `base/`에 만든다.

**모든 도메인이 동일한 인증을 사용하는 경우에도** BaseHttpClient에 직접 넣지 않고 중간 클래스를 만든다. BaseHttpClient는 프로젝트 포터블로 유지한다.

```txt
BaseHttpClient                       ← 프로젝트 포터블 (인증 없음)
└─ AuthenticatedHttpClient           ← 인증 로직 중앙화 (base/에 위치)
   ├─ domain1HttpClient              ← baseURL만 다름
   ├─ domain2HttpClient
   ├─ domain3HttpClient
   └─ domain4HttpClient
```

```ts
// shared/api/base/authenticated-http-client.ts
import { BaseHttpClient } from './base-http-client';
import type { HttpConfig } from './base-http-client';

export class AuthenticatedHttpClient extends BaseHttpClient {
  protected onRequest(config: HttpConfig): HttpConfig {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      config.headers['X-Platform'] = getPlatform();
    }
    return config;
  }

  protected onResponse<T = unknown>(response: AxiosResponse<T>): AxiosResponse<T> {
    // 세션 만료, 서버 점검 등 공통 응답 핸들링
    return response;
  }
}
```

```ts
// shared/api/main/main-http-client.ts
import { AuthenticatedHttpClient } from '../base/authenticated-http-client';
import { ENV } from '@shared/config/env';

export const mainHttpClient = new AuthenticatedHttpClient({
  baseURL: ENV.API_URL,
});
```

**인증 방식이 2개 이상일 때 (역할 기반 네이밍):**

```txt
BaseHttpClient
├─ UserAuthHttpClient           ← 사용자 인증 (Bearer 토큰)
│  ├─ productHttpClient
│  └─ orderHttpClient
└─ AdminAuthHttpClient          ← 관리자 인증 (API Key)
   ├─ auditHttpClient
   └─ cmsHttpClient
```

중간 클래스는 모두 `base/`에 위치한다. 여러 도메인이 공유하는 코드이므로 특정 도메인 폴더에 두지 않는다.

### 5.4 여러 관심사를 조합할 때

| 상황 | 방법 |
|------|------|
| 인증 + 모니터링 등 관심사가 항상 같이 다님 | 하나의 중간 클래스에 합친다 (`AppHttpClient` 등 역할 기반 네이밍) |
| 조합이 도메인 그룹별로 다름 (A: 인증+모니터링, B: 인증만) | 상속 체이닝으로 관심사를 쌓는다 |
| 조합이 3개 이상으로 복잡해짐 | 인터셉터 로직을 유틸 함수로 분리하고, 각 클래스의 훅에서 조합한다 |

### 5.5 패턴 선택 기준

| 조건 | 패턴 |
|------|------|
| baseURL만 다름, 인터셉터 동일 | 5.1 — `new BaseHttpClient(config)` |
| 해당 도메인만 고유한 인터셉터 | 5.2 — 도메인에서 직접 override |
| 여러 도메인이 같은 인터셉터 공유 (인증 포함) | 5.3 — 중간 클래스 (`base/`에 위치) |

### 5.6 도메인 에러 확장

외부(page/feature 등)에서 해당 도메인 에러를 타입으로 참조해 분기해야 할 때 적용하는 패턴.

- `base/errors.ts`의 `HttpError`를 extend
- `name` 필드에 도메인 이름 포함 — `instanceof` 분기와 로깅 구분용
- 도메인 http-client의 `onResponseError`에서 도메인 에러로 래핑해 throw
- `index.ts`에서 re-export

```ts
// shared/api/order/errors.ts
import { HttpError } from '../base/errors';

export class OrderHttpError extends HttpError {
  name = 'OrderHttpError';
}
```

```ts
// shared/api/order/order-http-client.ts
import type { AxiosError } from 'axios';
import { AuthenticatedHttpClient } from '../base/authenticated-http-client';
import { logError } from '../base/errors';
import { ENV } from '@shared/config/env';
import { OrderHttpError } from './errors';

class OrderHttpClient extends AuthenticatedHttpClient {
  protected onResponseError(error: AxiosError): Promise<never> {
    const orderError = new OrderHttpError(error);
    logError(orderError);
    return Promise.reject(orderError);
  }
}

export const orderHttpClient = new OrderHttpClient({
  baseURL: `${ENV.API_URL}/order`,
});
```

```ts
// shared/api/order/index.ts
export { OrderHttpError } from './errors';
// ...
```

외부 사용:

```ts
try {
  await ORDER_API.payOrder({ ... });
} catch (e) {
  if (e instanceof OrderHttpError && e.status === 409) {
    // 결제 충돌 처리
  }
}
```

외부 분기 처리가 필요 없으면 `errors.ts`를 만들지 않는다. `BaseHttpClient`(또는 도메인 http-client가 override한 `onResponseError`)가 공통 `HttpError`로 처리하고, 전역 Error Boundary/에러 핸들러가 받아 처리한다.

---

## 6. base에 두는 것 / 두지 않는 것

### BaseHttpClient 클래스

**둔다:**
- Axios 인스턴스 생성, 기본 timeout/headers
- 공통 에러 변환 (`AxiosError` → `HttpError`)
- `response.data` 언래핑 HTTP 래퍼 메서드

**두지 않는다:**
- 인증 토큰 주입, 세션 핸들링, 리다이렉트 등 프로젝트 종속 로직

### base/ 폴더

**둔다:**
- `BaseHttpClient` (포터블 기반)
- `errors.ts`, `types.ts` (공통 인프라)
- 중간 클래스 (`authenticated-http-client.ts` 등) — 여러 도메인이 공유하는 인터셉터

**두지 않는다:**
- 특정 도메인 전용 로직 → 해당 도메인 폴더에
- 외부에 공개하는 API — base는 외부에서 직접 import하지 않는다 (ESLint `@shared/api/*/*`로 자동 차단). 외부 공개가 필요한 공통 타입(`HttpError` 등)은 각 도메인에서 extend하여 re-export한다.

---

## 7. Do / Don't

### Do

- BaseHttpClient를 상속하여 도메인 http-client를 만든다.
- 기본 설정(timeout, headers)은 BaseHttpClient에서 관리한다.
- 도메인별 baseURL은 생성자 config으로 전달한다.
- 에러를 `HttpError`로 변환하여 일관된 에러 처리를 보장한다.
- 여러 도메인이 공유하는 인터셉터는 중간 클래스로 `base/`에 둔다.
- 모든 도메인이 동일한 인증을 사용하더라도 중간 클래스를 만든다 — BaseHttpClient는 포터블로 유지한다.

### Don't

- BaseHttpClient에 인증, 세션 관리 등 프로젝트 종속 로직을 두지 않는다.
- `axiosInstance`를 외부에 노출하지 않는다 (`protected` 유지).
- endpoints에서 `response.data`를 직접 언래핑하지 않는다 — HTTP 래퍼 메서드가 처리한다.
