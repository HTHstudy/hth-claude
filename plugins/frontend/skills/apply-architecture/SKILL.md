---
name: apply-architecture
description: 기존 프론트엔드 프로젝트에 레이어드 아키텍처를 적용한다. 폴더 재구조화, API 패턴, query/mutation 팩토리까지 단계별로 진행.
disable-model-invocation: true
---

# 기존 프로젝트에 레이어드 아키텍처 적용

현재 프로젝트 구조를 분석하고 레이어드 아키텍처로 전환한다.

## 사전 요구사항

이 스킬 실행 전 `/frontend:architecture` 스킬을 반드시 로드한다.

---

각 단계는 완료 후 빌드 가능한 상태를 유지한다. 중간에 중단되더라도 완료된 단계까지는 정상 동작한다.

## 실행 전 상태 확인

커맨드 실행 시 프로젝트의 현재 상태를 먼저 분석하여, 이미 적용된 항목을 판별한다:
- `app/`, `pages/`, `shared/` 구조가 존재하는가 → Phase 1 완료 여부
- `shared/api/base/`와 도메인별 3계층 구조가 존재하는가 → Phase 2 완료 여부
- `shared/query-factory/`, `shared/mutation-factory/`가 존재하는가 → Phase 3 완료 여부
- path alias, ESLint 규칙이 설정되어 있는가

분석 결과를 사용자에게 보고하고, 미완료 Phase부터 진행한다.

---

## Phase 1: 구조 전환

### 1단계: 현재 구조 분석

프로젝트 루트부터 전체 구조를 읽고 파악한다:
- 프레임워크 확인 (`package.json`, 설정 파일 기반 — React, Next.js, Remix 등)
- 소스 코드 루트 확인 (`src/`, `app/`, 프로젝트 루트 등 프레임워크마다 다름)
- 현재 폴더 구조와 파일 위치
- 기존 경로 별칭과 설정 파일 (`tsconfig.json`, `vite.config.ts` 등)
- 패키지 매니저 (yarn, npm, pnpm — lock 파일로 판단)
- 기존 API 호출 코드 위치와 패턴
- 기존 상태 관리 방식 (TanStack Query 사용 여부 등)

변경 전에 현재 구조를 사용자에게 보고한다.

### 2단계: 전환 계획 수립

분석을 바탕으로 전환 계획을 작성한다:
- `app/`으로 이동할 파일 (라우팅, Provider, 전역 스타일)
- `pages/`로 이동할 파일 (route 기준 화면 모듈)
- `shared/`로 이동할 파일 (유틸리티, 훅, 설정, API 클라이언트)
- 현재 위치에 그대로 둘 파일 (이미 올바른 위치)

계획을 사용자에게 제시하고 **확인을 받은 후** 진행한다.

### 3단계: 기본 구조 생성 및 파일 이동

1단계에서 확인한 프레임워크에 따라 구조를 생성한다.

#### React (Vite) 프로젝트

```
src/
├─ main.tsx        # 부팅 파일
├─ app/            # 라우팅, Provider, 전역 스타일/레이아웃
├─ pages/          # route 기준 화면 모듈
└─ shared/
   ├─ config/      # env.ts
   └─ routes/      # paths.ts
```

- 엔트리 컴포넌트 (App, Router, Providers) → `src/app/`
- route 기준 페이지 → `src/pages/[page-name]/`
- 공통 유틸리티, 훅, UI 컴포넌트 → `src/shared/`의 적절한 세그먼트
- 정적 자원 → `src/shared/assets/`
- `main.tsx`는 소스 루트에 부팅 파일로 유지

#### Next.js 프로젝트 (App Router)

[nextjs.md](../architecture/integrations/nextjs.md)의 구조를 따른다. 핵심 원칙:

```
├─ app/                # Next.js App Router (루트) — re-export 전용
│  ├─ layout.tsx       # src/app의 providers, global.css를 조립
│  └─ [route]/
│     └─ page.tsx      # src/pages의 page를 re-export만 함
├─ pages/              # 빈 폴더 (Pages Router 폴백 방지)
│  └─ README.md
└─ src/
   ├─ app/             # FSD app 레이어 (providers, global.css)
   ├─ pages/           # FSD pages 레이어 (화면 모듈)
   └─ shared/
      ├─ config/
      └─ routes/
```

- `src/` 폴더가 없으면 생성하고 FSD 레이어를 `src/` 안에 배치한다.
- 루트 `app/`의 `page.tsx`는 re-export만 수행한다: `export { PageName as default } from '@/pages/...'`
- 루트 `app/layout.tsx`에서 `src/app/`의 providers와 global style을 조립한다.
- 루트에 빈 `pages/` 폴더 + README.md를 생성한다.
- **루트 `app/`에 로직, 훅, 컴포넌트를 직접 구현하지 않는다.**

#### Next.js 프로젝트 (Pages Router)

[nextjs.md](../architecture/integrations/nextjs.md)의 구조를 따른다. 핵심 원칙:

```
├─ app/                # 빈 폴더 (App Router 감지 방지)
│  └─ README.md
├─ pages/              # Next.js Pages Router (루트) — re-export 전용
│  ├─ _app.tsx         # src/app의 custom-app을 re-export
│  └─ [route]/
│     └─ index.tsx     # src/pages의 page를 re-export만 함
└─ src/
   ├─ app/             # FSD app 레이어 (custom-app, providers, global.css)
   ├─ pages/           # FSD pages 레이어 (화면 모듈)
   └─ shared/
      ├─ config/
      └─ routes/
```

- 루트에 빈 `app/` 폴더 + README.md를 생성한다.
- 루트 `pages/`의 파일은 re-export만 수행한다.
- `_app.tsx`의 실제 구현은 `src/app/custom-app.tsx`에 둔다.

#### 공통

가능한 경우 `git mv`를 사용하여 git 히스토리를 보존한다.

- `widgets/`, `features/`, `entities/`는 생성하지 않는다 — 필요할 때만 도입.

### 4단계: import 수정 및 도구 설정

모든 import 경로를 새 구조에 맞게 수정한다:
- 상대 경로를 경로 별칭으로 교체 (`@app/`, `@pages/`, `@shared/`)
- 파일 이동으로 인한 깨진 import 수정
- 타입 import는 반드시 `import type` 사용

도구 설정:
- `tsconfig.json` (또는 `tsconfig.app.json`)에 경로 별칭 추가 (`src/` 기준)
- ESLint `no-restricted-imports` 추가
- Vite 사용 시 `tsconfigPaths` 활성화
- Next.js 사용 시 `next.config.js` 설정 확인

### 5단계: 빌드 검증

- 프로젝트를 실행하여 빌드 및 동작에 오류가 없는지 확인
- 남아 있는 깨진 import 확인
- 최종 구조를 사용자에게 보고

**사용자에게 Phase 1 완료를 알리고, Phase 2 진행 여부를 확인한다.**

---

## Phase 2: shared/api 3계층 구조 적용

> 기존 API 호출 코드가 있는 경우에만 진행한다. 없으면 건너뛴다.

상세 규칙: [shared-api.md](../architecture/layers/shared-api.md)

### 6단계: 기존 API 코드 분석

현재 API 관련 코드를 파악한다:
- API 호출 함수 위치와 패턴
- HTTP 클라이언트 설정 (Axios, fetch 등)
- 요청/응답 타입 정의 위치
- 도메인별 분류 가능 여부

분석 결과를 사용자에게 보고하고, 도메인 분류 계획을 **확인받은 후** 진행한다.

### 7단계: base 인프라 생성

`shared/api/base/`에 공통 인프라를 구성한다:
- `base-http-client.ts` — Axios 래퍼, 인터셉터, 인증 토큰 주입
- `types.ts` — 공통 응답 타입 (예: `DefaultResponse<T>`)
- `errors.ts` — 공통 에러 클래스 (필요 시)

기존 HTTP 클라이언트 설정이 있으면 이를 base로 통합한다.

### 8단계: 도메인별 API 구조 전환

각 도메인에 대해 3계층 구조를 적용한다:

```
shared/api/[domain]/
├─ index.ts                    # [DOMAIN]_API 객체 export
├─ model.ts                    # 공유 도메인 타입 (필요 시만)
├─ [domain]-http-client.ts     # 도메인 HTTP 클라이언트
└─ endpoints/
   └─ [action]-[resource].ts   # 엔드포인트별 파일 (함수 + req/res 타입)
```

전환 규칙:
- 엔드포인트별로 API 함수와 요청/응답 타입을 한 파일에 둔다
- `index.ts`에서 `[DOMAIN]_API` 객체로 묶어 export
- 도메인 내부는 상대경로, 외부는 `@shared/api/[domain]` entrypoint로 import
- endpoint에서는 `response.data`만 꺼내 반환. 그 외 데이터 변환 금지
- 2개 이상의 endpoint가 공유하는 도메인 타입이 있을 때만 `model.ts` 생성

### 9단계: 기존 API 호출부 수정

기존 코드에서 API를 직접 호출하던 부분을 `[DOMAIN]_API` 사용으로 변경한다.

빌드 검증 후 사용자에게 보고한다.

**사용자에게 Phase 2 완료를 알리고, Phase 3 진행 여부를 확인한다.**

---

## Phase 3: query/mutation 팩토리 적용

> TanStack Query를 사용하는 프로젝트에서만 진행한다. 사용하지 않으면 건너뛴다.

상세 규칙: [shared-query-factory.md](../architecture/layers/shared-query-factory.md), [shared-mutation-factory.md](../architecture/layers/shared-mutation-factory.md)

### 10단계: 기존 쿼리/뮤테이션 분석

현재 TanStack Query 사용 패턴을 파악한다:
- `useQuery`, `useMutation` 호출 위치
- queryKey 관리 방식
- 기존 커스텀 훅 구조

분석 결과를 사용자에게 보고하고 **확인받은 후** 진행한다.

### 11단계: query-factory 구성

`shared/query-factory/`를 생성한다:
- `default-query-keys.ts` — 도메인별 기본 쿼리 키 정의
- `[domain]-queries.ts` — 도메인별 쿼리 팩토리 (`queryOptions()` 반환)

키 계층: `allKeys()` → `listKeys()` / `detailKeys()` → 개별 쿼리

barrel(`index.ts`)은 사용하지 않는다.

### 12단계: mutation-factory 구성

`shared/mutation-factory/`를 생성한다:
- `default-mutation-keys.ts` — 도메인별 기본 mutation 키 정의
- `[domain]-mutations.ts` — 도메인별 mutation 팩토리 (`mutationOptions()` 반환)

복합 트랜잭션은 팩토리에 넣지 않는다. 커스텀 훅에서 조합한다.

### 13단계: 기존 호출부 전환

기존 `useQuery`, `useMutation` 호출을 팩토리 사용으로 변경한다:

```ts
// 변경 전
useQuery({ queryKey: ['product', 'list', params], queryFn: () => fetchProducts(params) })

// 변경 후
useQuery(productQueries.list(params))
```

빌드 검증 후 최종 구조를 사용자에게 보고한다.

---

## Phase 4: 코드 정리 및 세분화

### 14단계: shared 세그먼트 분류

기존 코드 중 shared로 이동된 파일들을 세그먼트별로 정리한다:
- `shared/ui/` — business-agnostic UI 컴포넌트만 허용. 도메인 특화 UI(`ProductCard` 등)는 제외
- `shared/hooks/` — page 문맥 없이 독립적으로 성립하는 훅
- `shared/lib/` — 범용 유틸리티 함수

각 파일을 분류할 때 아래 기준으로 판단한다:
- business-agnostic인가? → shared
- 도메인 특화인가? → entities (또는 page에 유지)
- 특정 Slice 상태에 결합되어 있는가? → 해당 page에 유지

### 15단계: page 내부 분해

각 page의 코드를 분석하고 필요 시 분해한다:
- 파일이 과도하게 크면 큰 단위 컴포넌트로 분리
- page 전용 훅, 타입, 상수는 page 내부에 유지 (`_hooks/`, `_ui/` 등 private 폴더)
- page 밖으로 추출하지 않는다 — page는 로직을 직접 소유

### 16단계: 선택 레이어 도입 제안

코드 중복을 분석한다:
- 복합 UI 블록이 여러 page에서 반복 → `widgets/` 도입 제안
- 사용자 인터랙션이 여러 page에서 반복 → `features/` 도입 제안
- 도메인 UI/표시 로직이 여러 page에서 반복 → `entities/` 도입 제안

제안만 하고, 도입 여부는 사용자가 결정한다. 사용자가 원하면 해당 레이어를 생성하고 코드를 이동한다.

빌드 검증 후 **Phase 5로 진행한다.**

---

## Phase 5: 최종 보고

### 17단계: 전환 결과 요약

전체 작업을 분석하고 사용자에게 보고한다:

**적용 완료 항목:**
- 변경된 폴더 구조 (before → after 트리)
- 이동된 파일 수와 주요 변경 사항
- 적용된 설정 (path alias, ESLint, 등)
- 적용된 패턴 (API 3계층, query/mutation 팩토리 등)

**미적용 또는 수동 확인이 필요한 항목:**
- 자동 분류가 애매해서 현재 위치에 남긴 파일과 그 이유
- 네이밍 컨벤션이 적용되지 않은 파일 (외부 라이브러리 제약 등)
- 추후 코드가 늘어나면 추출을 검토할 후보
- 기타 수동 확인이 필요한 사항

**다음 작업 제안:**
- 즉시 처리하면 좋을 후속 작업 목록
- 코드가 더 쌓인 후 검토할 사항

---

## 주의사항

- 각 Phase 시작 전에 반드시 사용자 확인을 받는다.
- 파일 이동 시 `git mv`를 사용하여 히스토리를 보존한다.
- 선택 레이어(widgets, features, entities)를 강제하지 않는다.
- Next.js 프로젝트는 반드시 [nextjs.md](../architecture/integrations/nextjs.md)를 참조하여 루트 라우팅 폴더와 `src/` FSD 레이어를 분리한다.
- 전환 과정에서 네이밍 컨벤션(kebab-case 파일명, Named Export)을 적용한다.
- 각 Phase 완료 후 빌드가 정상인지 반드시 확인한다.
