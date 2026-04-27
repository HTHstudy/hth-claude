---
name: architecture
description: Use when React/Next.js 프로젝트에서 페이지 추가, 컴포넌트 생성, API 연동, 라우팅, 폴더 구조 변경 등 프론트엔드 코드를 작성·리뷰·리팩토링할 때. 레이어 배치(app/pages/shared), import 방향, 네이밍, Slice 분해·추출 판단이 필요한 상황.
---

# Frontend Layered Architecture

프론트엔드 코드를 작성, 리뷰, 리팩토링할 때 이 규칙을 적용한다.
이 문서와 레이어별 상세 규칙이 충돌할 경우, 레이어별 상세 규칙이 우선한다.

이 규칙의 목적:
- 누가 작업하든 동일한 구조와 패턴으로 코드를 생성한다.
- 파일을 어디에 두는지, 어떤 책임을 어떤 레이어에 배치하는지 일관되게 판단한다.
- 구현뿐 아니라 추출, 분리, 확장 시점까지 동일한 기준으로 판단한다.

문서 흐름: **§1~5 용어·구조·규약 정의 → §6~7 원칙·판단 기준 → §8~9 행동 규칙 → §10 상세 링크.**

---

## 1. 레이어

아키텍처는 6개 레이어로 구성된다. `widgets`, `features`, `entities`는 선택 — 필요할 때만 도입한다.

| 레이어              | 역할                                                                            | 상세                                            |
| ------------------- | ------------------------------------------------------------------------------- | ----------------------------------------------- |
| `app`               | 앱 수준 실행 환경 정의·조립. 라우팅 설정, 전역 Provider, 전역 스타일, 초기화 로직 등 앱 단위 구성 요소. | [app.md](layers/app.md)                         |
| `pages`             | Route 기준 화면 모듈. 전용 상태/훅/컴포넌트/도메인 로직을 직접 소유.            | [pages.md](layers/pages.md)                     |
| `widgets` (선택)    | 독립적 복합 UI 블록. 여러 page에서 재사용되는 UI 조합.                          | [optional-layers.md](layers/optional-layers.md) |
| `features` (선택)   | 사용자 인터랙션 캡슐화 (UI + 로직, 상태, 검증, API 트리거).                     | [optional-layers.md](layers/optional-layers.md) |
| `entities` (선택)   | 프론트엔드 도메인 표현 (도메인 특화 UI, 표시 로직, 검증).                       | [optional-layers.md](layers/optional-layers.md) |
| `shared`            | 범용 재사용 가능한 도구·값 정의. business-agnostic한 코드만 둔다.               | [shared.md](layers/shared.md)                   |

### 폴더 구조

엔트리포인트(`main.tsx`)는 `src/` 루트의 부팅 파일이다. `app/` 레이어 바깥에 둔다.

```txt
src/
├─ main.tsx        ← app 바깥, 부팅 전용
├─ app/
├─ pages/
├─ widgets/        ← 필요 시
├─ features/       ← 필요 시
├─ entities/       ← 필요 시
└─ shared/
```

---

## 2. Slice

**Slice** = `pages`/`widgets`/`features`/`entities` 레이어 내부를 비즈니스 도메인별로 나눈 단위.
이름·개수에 제한이 없으며, 같은 레이어의 다른 Slice를 직접 참조할 수 없다.
이 규칙이 높은 응집도와 낮은 결합도를 보장한다.

Slice는 자족적 모듈로서 전용 상태/훅/컴포넌트/로직을 직접 소유할 수 있다.

### 형태
하위 종속에 따라 두 형태:
- **단일 파일 Slice** — 하위 종속이 없을 때. 파일 자체가 entrypoint.
  - 예: `pages/home.tsx`, `widgets/header.tsx`
- **폴더 Slice** — 하위 종속이 생기면 폴더로 승격, `index.tsx`가 entrypoint.
  - 예: `pages/product-detail/index.tsx`

### Slice 문맥
해당 Slice 고유의 상태·context·도메인 의미.
Slice 문맥에 결합된 코드(특정 Slice 상태를 내부 참조하거나 Slice 전용 도메인 타입을 요구하는 코드)는 Slice 바깥으로 이동하지 않는다. §6·§7·§9에서 사용되는 용어다.

### 예외
`app`(앱 수준 실행 환경 정의·조립)과 `shared`(Segment 구성) 두 레이어는 모두 Slice를 가지지 않는다.

Slice 분해·추출 등 공통 규칙 상세 → [slice.md](rules/slice.md).
레이어별 Slice 명명 규약 → [pages.md](layers/pages.md), [optional-layers.md](layers/optional-layers.md).

---

## 3. 레이어 계급과 도입/이동 조건

각 하위 레이어는 바로 위쪽 레이어들의 Slice에서만 소비된다. 도입·이동 조건의 "2개 이상 사용"은 이 허용 상위를 기준으로 판단한다.

| 대상 레이어 | 소비 가능한 상위 레이어        | 도입 / 이동 조건 (2개 이상 사용)           |
| ----------- | ------------------------------ | ------------------------------------------ |
| `app`       | — (최상위)                     | — (앱 수준 실행 환경 정의·조립)            |
| `pages`     | `app`                          | — (모든 코드의 시작점, page-first)         |
| `widgets`   | `pages`                        | 2개 이상 page에서 반복                     |
| `features`  | `pages`, `widgets`             | 2개 이상 page 또는 widget에서 반복         |
| `entities`  | `pages`, `widgets`, `features` | 2개 이상 page, widget, feature 중에서 반복 |
| `shared`    | 모든 상위 레이어               | 2개 이상 Slice에서 사용 (레이어 구분 없음) |

- 상위 optional 레이어가 미도입이면 해당 항목은 무효. 예: `widgets` 미도입 상태에서 `features` 도입 조건은 "2개 이상 page에서 반복"으로 축소된다.
- 레이어별 도입 시점 상세는 [optional-layers.md](layers/optional-layers.md), shared 이동 조건 상세는 [shared.md §4](layers/shared.md#4-shared로-이동하는-조건) 참조.

---

## 4. import 규칙

각 레이어는 여러 Slice로 구성되며(§2 참조), Slice 간 연결은 import 규칙으로 제한된다. 이 제약이 응집도·결합도를 보장한다.

하나의 Slice 안에서 작성된 코드는 **자신이 속한 레이어보다 아래 레이어의 Slice만** import할 수 있다.

```txt
app → pages → (widgets → features → entities →) shared
```

예시 — `src/features/aaa/api/request.ts` 기준:
- ✗ 같은 레이어의 `src/features/bbb` — 같은 레이어 Slice 간 import 불가
- ✓ 아래 레이어 `src/entities`, `src/shared`
- ✓ 같은 Slice 내부 `src/features/aaa/lib/cache.ts`

기타 제약:
- **다른 레이어 접근 시 반드시 path alias를 사용한다.** 상대경로(`../`)는 같은 레이어 내부에서만 허용.
- 순환 의존 금지는 일반 컨벤션 — [conventions.md §6](rules/conventions.md) 참조.

---

## 5. Entrypoint와 path alias

이 아키텍처 고유의 구조 규약. 일반 코드 컨벤션(파일명·export·import·확장자 등)은 [conventions.md](rules/conventions.md) 참조.

| 항목         | 규칙                                                     | 예시                                                                               |
| ------------ | -------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| private 폴더 | `_` prefix. 처음부터 만들지 않고 Slice 내부 추출 발생 후에만 | `_ui/`, `_hooks/`, `_context/`, `_lib/`                                            |
| path alias   | 레이어별 alias만 허용. 포괄적 alias(`@/*`) 금지          | `@app/*`, `@pages/*`, `@shared/*`, `@widgets/*`, `@features/*`, `@entities/*`      |

**entrypoint 규칙:** entrypoint는 "Slice 외부 접근의 공개 지점" 개념이다. 실제 형태는 다음과 같다.
- **단일 파일 Slice** — 그 파일 자체가 entrypoint (예: `pages/home.tsx`)
- **폴더 Slice** — 폴더 안의 `index.*`가 entrypoint (예: `pages/product-detail/index.tsx`)

Slice 외부에서는 반드시 entrypoint를 통해서만 접근한다. Slice 내부 파일 직접 import 금지.

---

## 6. 핵심 원칙

- **pages 레이어가 중심이다.** 모든 구조는 page에서 시작하여 필요에 따라 확장한다.
- **가장 좁은 범위에서 시작.** 공통이 생기면 가장 가까운 공통 범위로 먼저 추출. 바로 전역 레이어로 올리지 않는다. "나중에 쓸 것 같다"는 예측 추출 금지. 상세 조건은 [slice.md §3](rules/slice.md#3-추출-규칙), shared 이동은 [shared.md §4](layers/shared.md#4-shared로-이동하는-조건).
- **섣불리 다른 레이어로 이동하지 않는다.** [계급 표(§3)](#3-레이어-계급과-도입이동-조건)의 도입/이동 조건을 만족하고 책임이 안정적이며 Slice 문맥과 무관함이 확인된 뒤에만 이동.
- **page는 단순 엔트리가 아닌 화면 단위 모듈이다.** 전용 상태·훅·컴포넌트·도메인 로직을 직접 소유한다.
- **shared 이동은 최종 단계다.** 사용하는 Slice에서 시작해서 이동 조건 충족 시 shared로. 단, page-first를 거치지 않고 shared에 바로 생성하는 예외 Segment가 있다 — 목록·상세는 [shared.md §5.2](layers/shared.md#52-예외--page-first의-예외-segment).
- **`shared/ui`는 business-agnostic만.** 도메인 특화 UI(`ProductCard` 등)는 `pages` 또는 확장 레이어(`widgets`, `features`, `entities`)에 둔다.

---

## 7. 판단 순서

코드를 어디에 둘지 결정할 때 이 순서를 반드시 따른다.

1. 이 코드는 특정 page 전용인가? → page에 둔다.
2. 더 작은 범위(page 내부 컴포넌트·폴더, Slice 하위 등)에서 해결할 수 있는가? → 가장 좁은 범위에 둔다.
3. 공통이 생겼는가? → **가장 가까운 공통 범위로 추출한다.**
4. 2개 이상의 상위 Slice에서 실제로 사용하고 있는가? → 아니면 현재 범위에 남긴다. (레이어별 기준은 [§3 계급 표](#3-레이어-계급과-도입이동-조건) 참조)
5. Slice 문맥 없이도 의미가 성립하는가? → 적절한 레이어로 추출.
6. 위 조건에 해당하지 않으면 로컬에 남긴다.

---

## 8. 행동 규칙 (자동 적용)

이 스킬이 적용되면 아래 행동을 따른다.

### 스킬 로드 시 감지 (1회)

| 감지 대상 | 조건 | 동의 시 조치 | 거부 시 조치 |
|---|---|---|---|
| ESLint 아키텍처 규칙 | 필수 규칙(`no-restricted-imports`, `import/no-default-export`, `@typescript-eslint/consistent-type-imports`) 누락 시 사용자에게 적용 여부 확인 | [eslint-config.md](rules/eslint-config.md) [병합 절차](rules/eslint-config.md#기존-eslint-설정이-있는-프로젝트)로 기존 규칙 유지하며 아키텍처 규칙 추가 | 규칙 없이 진행. 코드 리뷰 시 ESLint로 잡을 수 없는 위반은 수동 지적 |
| 경로 상수 파일 | `src/shared/routes/paths.ts` 부재 시 생성 여부 확인 | 기존 라우트 분석해 경로 상수 파일 scaffold | 진행하되 라우트 관련 코드 작성 시 누락 지적 |
| Next.js 프로젝트 | `package.json`에 `next` 의존성 존재 | [nextjs.md](integrations/nextjs.md)를 **반드시** 읽고 적용. App Router + TanStack Query 조합이면 [nextjs-rsc-tanstack-query.md](integrations/nextjs-rsc-tanstack-query.md)도 반드시 읽고 적용 | — (Next.js 감지 시 강제, 건너뛰지 않음) |

### 코드 작성 시

- **신규 작성 시** §7 판단 순서로 위치를 결정하고, §4 import 방향 / §5 entrypoint·path alias / [conventions.md](rules/conventions.md)의 일반 컨벤션을 처음부터 적용한다. `_ui/`, `_hooks/` 같은 private 폴더는 실제 추출이 발생한 뒤에 묶는다.
- **기존 파일 수정 시** 해당 파일 안에 아래 위반이 있으면 함께 교정한다:
  - `export default` → Named Export 전환 (프레임워크 요구 파일 제외)
  - 타입 import에 `type` 키워드 누락 → `import type { Foo }` 형식으로 수정
  - 파일명이 케밥 케이스가 아닌 경우 → `git mv`로 이름 변경, import 경로 수정
  - 수정 범위는 **해당 파일과 직접 관련된 import/export**로 한정한다. 프로젝트 전체를 일괄 교정하지 않는다.

### 코드 리뷰 시

ESLint로 이미 자동 차단되는 규칙은 Agent가 별도로 탐지할 필요 없다. 아래 **수동 리뷰 전용** 항목에 집중한다.

| 위반 유형 | 감지 포인트 |
|---|---|
| 레이어 배치 (의미) | 도메인 특화 코드가 `shared`에 있거나 page 전용 코드가 전역 레이어로 올라감. ESLint는 파일 위치만 보므로 의미적 판단은 수동 필요 |
| 섣부른 추출 | 1개 Slice만 사용하는 코드가 공통 레이어에 있거나, Slice 문맥에 결합된 코드가 전역화됨 |
| page 빈 조립 | page가 로직 없이 import만 나열 |
| private 폴더 선제 생성 | 실제 추출 없이 `_ui/`, `_hooks/`를 미리 생성 |

참고 — 아래는 [eslint-config.md](rules/eslint-config.md)가 자동 차단하므로 Agent 수동 탐지 불필요:
- import 방향 (`no-restricted-imports`)
- Slice 경계 / entrypoint 우회 (`@[layer]/*/*` 패턴)
- 상대경로로 다른 레이어 접근
- Default Export (`import/no-default-export`)
- 타입 import `type` 키워드 누락 (`consistent-type-imports`)
- 파일명 kebab-case (`check-file/filename-naming-convention`)
- 순환 의존 (`import/no-cycle`)

### 구조 적용 시 (새 프로젝트 또는 기존 프로젝트)

프로젝트 src/ 구조를 분석하고 아래 체크리스트를 **모두** 완료한다.
**Next.js 프로젝트인 경우** [nextjs.md](integrations/nextjs.md)를 반드시 읽고 적용한다.

**필수 구조:**
- [ ] `src/app/` 생성 — App.tsx, providers.tsx, router.tsx, global.css
- [ ] `src/pages/` 생성 — 기존 화면을 route별 Slice로 재배치
- [ ] `src/shared/routes/paths.ts` 생성 — 경로 상수 (라우트가 하나라도 정의되면 필수)
- [ ] `src/shared/config/env.ts` 생성 — 환경변수 관리
- [ ] `src/main.tsx` — app 바깥 부팅 파일로 유지
- [ ] 기존 assets → `src/shared/assets/`로 이동

**필수 설정:**
- [ ] tsconfig path alias — 레이어별 alias만 허용(`@app/*`, `@pages/*`, `@shared/*`, `@widgets/*`, `@features/*`, `@entities/*`). 전체 소스를 잡는 포괄적 alias(`@/*` 등)는 사용하지 않는다.
- [ ] ESLint — [eslint-config.md](rules/eslint-config.md)의 전체 템플릿 적용 (`no-restricted-imports`, `consistent-type-imports`, `import/no-default-export` 등)
- [ ] vite.config.ts — `resolve.tsconfigPaths: true` 설정
- [ ] `.prettierrc` 설정

**기존 코드 재배치:**
- 기존 코드가 있으면 올바른 레이어로 재배치를 권장한다.
- [conventions.md](rules/conventions.md)의 일반 컨벤션(kebab-case, Named Export 등)으로 변환한다.
- Vite 기본 템플릿 파일(`App.css`, `index.css`, 기본 `App.tsx`) 정리/대체한다.

---

## 9. Agent 행동 규칙

### 금지
- page 내부 구조를 전역 구조처럼 해석하지 않는다.
- page 전용 구조를 무리하게 추상화하지 않는다.
- 공통 폴더를 미리 만들지 않는다. 실제 공통이 생겼을 때만 추출한다.
- "나중에 쓸 것 같아서" 전역 레이어로 올리지 않는다.
- "나중에 전역에서 쓸 수 있으니까" Provider를 app에 미리 올리지 않는다.
- 도메인 특화 코드를 shared에 두지 않는다. 확장 레이어 도입 여부를 사용자에게 먼저 물어본다.
- page를 단순 import 후 나열만 하는 빈 조립 레이어로 축소하지 않는다. page는 로직을 직접 소유한다.
- 입력/출력이 특정 Slice 상태에 결합된 코드를 전역으로 추출하지 않는다. 로컬에 유지한다.

---

## 10. 상세 패턴이 필요할 때

아래 파일을 참조한다. 일반적인 작업에서는 이 SKILL.md만으로 충분하다.

- shared/api 3계층 패턴 → [shared-api.md](layers/shared-api.md)
- HTTP 클라이언트 (base + 도메인) → [http-client.md](rules/http-client.md)
- query-factory 패턴 → [shared-query-factory.md](layers/shared-query-factory.md)
- mutation-factory 패턴 → [shared-mutation-factory.md](layers/shared-mutation-factory.md)
- app 레이어 상세 → [app.md](layers/app.md)
- pages 레이어 상세 → [pages.md](layers/pages.md)
- shared 레이어 상세 → [shared.md](layers/shared.md)
- 선택 레이어(entities/features/widgets) 상세 → [optional-layers.md](layers/optional-layers.md)
- Slice 공통 규칙(인터페이스/분해/추출) → [slice.md](rules/slice.md)
- 일반 코드 컨벤션 (파일명·export·import·확장자·순환 의존) → [conventions.md](rules/conventions.md)
- ESLint 설정 템플릿 → [eslint-config.md](rules/eslint-config.md)
- Next.js 프로젝트 적용 가이드 → [nextjs.md](integrations/nextjs.md)
- RSC + TanStack Query 패턴 → [nextjs-rsc-tanstack-query.md](integrations/nextjs-rsc-tanstack-query.md)
