# Shared API — 런타임 분리

> 한 백엔드를 여러 실행 환경(브라우저 · 서버/RSC)에서 부를 때의 구조 규약이다.
> **먼저 §1 게이트를 확인한다.** 조건을 만족하지 않으면 [shared-api.md](shared-api.md) §4.1을 그대로 쓴다.

---

## 1. 적용 게이트

### 1.1 조건 — 셋을 모두 만족할 때만 적용한다

1. 같은 백엔드·같은 계약을 **두 실행 환경에서 이미 부르고 있다** (계획·예정이 아니다)
2. 브라우저 전송이 **브라우저 전제**를 갖고 있다 — 상대 `baseURL`(BFF), 또는 인터셉터가 모듈 전역을 읽고 쓴다
3. 계약(경로·응답 타입·오류)이 **실제로 겹친다**

하나라도 어긋나면 [shared-api.md §4.1](shared-api.md)의 기존 기준을 그대로 쓴다.

> **왜 ②가 결정적인가** — 전역 상태는 "탭 하나 = 사용자 하나" 위에서 맞다. 서버는 한
> 프로세스가 요청을 동시에 처리하므로 그 전제가 깨진다. 헤더가 전역이면 A가 `await`하는 사이
> B가 값을 덮어써 **한국 사용자가 미국 가격을 본다.** 크래시가 아니라 조용히 틀린다.

### 1.2 도메인 분리와의 판별

| 상황 | |
|---|---|
| 서버·리소스가 다르다 | **별도 도메인** ([shared-api.md](shared-api.md) §4.1 기준 그대로) |
| 같은 백엔드·같은 계약인데 실행 환경이 다르다 | **한 도메인 안에서 런타임 분리** |

판별 질문: *"나중에 진짜 다른 도메인(서드파티 API 등)이 생기면 그게 이 계약을 쓸까?"*
**안 쓰면 그건 한 도메인의 계약이다.**

계약을 `base/`로 올리지 않는다 — `base/`는 `authenticated-`·`monitored-`처럼 **관심사 이름**이
붙는 자리이지 도메인 이름이 붙는 자리가 아니다.

### 1.3 금지

- **예측 분리 금지.** "나중에 SSR 할 수도 있으니 미리 `browser/`·`server/`" — [SKILL.md](../SKILL.md) §6 "예측 추출 금지"와 같은 자리다. 두 번째 런타임이 실제로 생길 때 나눈다.
- 런타임이 하나인 도메인에 런타임 폴더를 만들지 않는다.

---

## 2. 구조

### 2.1 폴더

```txt
shared/api/[domain]/
├─ model.ts                          계약 — 공유 경로 상수 · 응답 타입 · 도메인 상수
├─ errors.ts                         오류 타입
├─ request-context.ts                헤더 규칙 (선택)
├─ [domain]-protocol-client.ts       프로토콜 판정 (상태·에러코드 → 오류 타입)
├─ browser/                          런타임 1
│  ├─ index.ts                       @shared/api/[domain]/browser
│  ├─ [domain]-http-client.ts        protocol 상속 + 전역 신호
│  └─ endpoints/
└─ server/                           런타임 2
   ├─ index.ts                       @shared/api/[domain]/server — import 'server-only'
   ├─ [domain]-server-http-client.ts protocol 상속, 신호 없음
   └─ endpoints/
```

**계약과 프로토콜 판정은 도메인 루트가 갖고, 전송만 런타임별로 가른다.**

### 2.2 도메인 루트에는 `index.ts`를 두지 않는다

공개 얼굴은 런타임 둘뿐이다. 루트 entrypoint가 있으면 호출부가 런타임을 고르지 않고 지나칠 수
있다. 없으면 `@shared/api/[domain]` import가 해석에 실패해 즉시 드러난다.

`model.ts`·`errors.ts`는 각 런타임 `index.ts`가 re-export해서 공개한다.

### 2.3 경로 상수 — 공유하는 것만 `model.ts`

```ts
// model.ts — 두 런타임이 함께 부르는 엔드포인트만
export const SHARED_PATHS = {
  products: '/products',
  product: (id: string) => `/products/${encodeURIComponent(id)}`,
} as const;
```

상수의 일은 **이름이 아니라 동기화**다. 선언이 둘이면 갈릴 수 있고, 갈리면 한쪽만 404인데 서버
쪽은 실패를 삼키는 경로라 조용히 빈 화면이 된다.

**선언이 하나인 경로**(한 런타임만 부르는 것)는 어긋날 대상이 없으므로
[shared-api.md §4.5](shared-api.md)대로 endpoint 파일이 갖는다. 어떤 엔드포인트에 반대 런타임
쌍이 생기면 그때 `model.ts`로 옮긴다. 판단 기준은 "두 런타임이 함께 부르는가" 하나이고 도메인
의미가 아니다.

### 2.4 서버 endpoint 함수명에 런타임 접미사

`getProductsOnServer`, `getProductOnServer` 형태로 짓는다. §6의 `queryFn` 교체를 빠뜨린 코드가
diff에서 눈에 띄게 하려는 것이다.

### 2.5 두 entrypoint의 책임

| | `browser/index.ts` | `server/index.ts` |
|---|---|---|
| 전송 | 상대 `baseURL` (BFF) | 백엔드 origin 직결 |
| 전역 신호 | 얹는다 | 얹지 않는다 |
| 문맥 | 모듈 전역에서 읽어도 된다 | **호출별 인자로 받는다** |
| 가드 | — | `import 'server-only'` |

서버 entrypoint가 세션 쿠키를 싣지 않는다면 **유저별 값을 다루지 않는다.** 비로그인으로 받은
값이 클라이언트 캐시에 심기면 하이드레이션 직후 잘못된 값이 노출된다 (→ §6).

---

## 3. 프로토콜 클라이언트

계약 판정("어떤 응답이 어떤 오류인가")은 두 런타임이 공유한다. 중간 클래스로 풀되 `base/`가
아니라 **도메인 루트**에 둔다.

→ [http-client.md §5.3](../rules/http-client.md)

## 4. ESLint

런타임 entrypoint 둘만 예외로 연다. 내부 경로는 그대로 막힌다.

→ [eslint-config.md](../rules/eslint-config.md)

## 5. `server-only`

`server/` entrypoint를 `server-only`로 표시해 폴더 전체를 가린다. 클라이언트 컴포넌트가 import하면 빌드가 실패한다.

→ [nextjs.md](../integrations/nextjs.md)

## 6. query-factory / RSC

키의 출처는 query-factory 하나다. **`queryFn`만 서버 entrypoint로 교체한다.**

→ [nextjs-rsc-tanstack-query.md](../integrations/nextjs-rsc-tanstack-query.md)

---

## 7. 런타임 분리 체크리스트

1. **게이트 확인** — §1.1 조건 셋을 모두 만족하는가? 아니면 [shared-api.md](shared-api.md) §4.1로 돌아간다.
2. 계약(`model.ts`·`errors.ts`)과 프로토콜 클라이언트를 도메인 루트로 올린다.
3. `browser/`·`server/` 폴더를 만들고 각각 `index.ts`·http-client·`endpoints/`를 둔다.
4. 도메인 루트의 `index.ts`를 **지운다.**
5. 기존 `@shared/api/[domain]` 호출부를 각각 `/browser` 또는 `/server`로 바꾼다.
6. 두 런타임이 함께 부르는 경로만 `model.ts`의 `SHARED_PATHS`로 모은다.
7. `server/index.ts` 최상단에 `import 'server-only'`를 넣는다.
8. ESLint 패턴에 `browser`·`server` 예외를 추가한다.
9. query-factory를 쓰면 §6 판별식으로 prefetch 방식을 정한다.

---

## 8. Do / Don't

### Do

- 게이트 조건 셋을 모두 확인한 뒤에 나눈다.
- 계약·프로토콜 판정은 도메인 루트 한 벌로 둔다.
- 서버 endpoint 함수명에 런타임 접미사를 붙인다.
- 서버 전송은 문맥을 호출별 인자로 받는다.

### Don't

- 런타임이 하나인 도메인에 런타임 폴더를 만들지 않는다.
- "나중에 SSR 할 수도 있으니" 미리 나누지 않는다.
- 한 도메인의 계약을 `base/`로 올리지 않는다.
- 도메인 루트에 `index.ts`를 남기지 않는다.
- 서버 전송에서 모듈 전역을 읽거나 쓰지 않는다.
