---
name: architecture
description: 프론트엔드 아키텍처 규칙. React, Next.js 프로젝트에서 페이지 추가, 컴포넌트 생성, API 연동, 라우팅, 폴더 구조 변경 등 프론트엔드 코드를 작성·리뷰·리팩토링할 때 자동 적용한다. 레이어 배치(app/pages/shared), import 방향, 네이밍, Slice 분해·추출을 강제한다.
---

# Frontend Layered Architecture

프론트엔드 코드를 작성, 리뷰, 리팩토링할 때 이 규칙을 적용한다.
이 문서와 레이어별 상세 규칙이 충돌할 경우, 레이어별 상세 규칙이 우선한다.

이 규칙의 목적:
- 누가 작업하든 동일한 구조와 패턴으로 코드를 생성한다.
- 파일을 어디에 두는지, 어떤 책임을 어떤 레이어에 배치하는지 일관되게 판단한다.
- 구현뿐 아니라 추출, 분리, 확장 시점까지 동일한 기준으로 판단한다.

## 행동 규칙

이 스킬이 적용되면 아래 행동을 따른다.

### ESLint 아키텍처 규칙 감지 (스킬 로드 시 1회)
이 스킬이 로드되면 ESLint 설정에 아키텍처 필수 규칙(`no-restricted-imports`, `import/no-default-export`, `@typescript-eslint/consistent-type-imports`)이 있는지 확인한다.
- **규칙이 있으면**: 추가 행동 없이 진행한다.
- **규칙이 없으면**: 사용자에게 "아키텍처 ESLint 규칙이 설정되어 있지 않습니다. [eslint-config.md](rules/eslint-config.md) 템플릿을 적용할까요?"라고 안내하고, 동의 시 eslint-config.md의 "기존 ESLint 설정이 있는 프로젝트" 병합 절차에 따라 기존 규칙을 유지하면서 아키텍처 규칙만 추가한다. 거부 시 규칙 없이 진행하되, 코드 리뷰 시 ESLint로 잡을 수 없는 위반은 수동으로 지적한다.

### 경로 상수 파일 감지 (스킬 로드 시 1회)
이 스킬이 로드되면 `src/shared/routes/paths.ts`(경로 상수)가 존재하는지 확인한다.
- **파일이 있으면**: 추가 행동 없이 진행한다.
- **파일이 없으면**: 사용자에게 "`shared/routes/paths.ts`가 누락되어 있습니다. 생성할까요?"라고 안내한다. 동의 시 프로젝트의 기존 라우트를 분석하여 경로 상수 파일을 scaffold한다. 거부 시 진행하되, 라우트 관련 코드 작성 시 누락을 지적한다.

### Next.js 프로젝트 감지 시 필수 행동
Next.js 프로젝트(`package.json`에 `next` 의존성 존재)를 감지하면 [nextjs.md](integrations/nextjs.md)를 **반드시 읽고** 해당 규칙을 적용한다. 이 단계를 건너뛰지 않는다.
추가로 App Router + TanStack Query를 함께 사용하는 프로젝트를 감지하면 [nextjs-rsc-tanstack-query.md](integrations/nextjs-rsc-tanstack-query.md)도 **반드시 읽고** 적용한다.

### 코드 작성 시
- 모든 코드를 이 규칙에 맞춰 생성한다.
- 레이어 배치, import 방향, 네이밍 컨벤션을 준수한다.
- 판단 순서를 따라 코드를 어디에 둘지 결정한다.
- **기존 파일을 수정할 때**, 해당 파일 안에 아래 컨벤션 위반이 있으면 함께 교정한다:
  - `export default` → Named Export 전환 (프레임워크 요구 파일 제외)
  - 타입 import에 `type` 키워드 누락 → `import type { Foo }` 형식으로 수정
  - 파일명이 케밥 케이스가 아닌 경우 → `git mv`로 이름 변경, import 경로 수정
  - 수정 범위는 **해당 파일과 직접 관련된 import/export**로 한정한다. 프로젝트 전체를 일괄 교정하지 않는다.

### 코드 리뷰 시
- 이 규칙 위반 사항을 탐지하고 리포트한다.
- 잘못된 레이어 배치, import 역방향, 네이밍 위반을 지적한다.

### 구조 적용 시 (새 프로젝트 또는 기존 프로젝트)
프로젝트 src/ 구조를 분석하고 아래 체크리스트를 **모두** 완료한다.
**Next.js 프로젝트인 경우** [nextjs.md](integrations/nextjs.md)를 반드시 읽고 적용한다.

**필수 구조:**
- [ ] `src/app/` 생성 — App.tsx, providers.tsx, router.tsx, global.css
- [ ] `src/pages/` 생성 — 기존 화면을 route별 Slice로 재배치
- [ ] `src/shared/routes/paths.ts` 생성 — 경로 상수 (경로가 하나라도 필수)
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
- 네이밍 컨벤션(kebab-case, Named Export)으로 변환한다.
- Vite 기본 템플릿 파일(`App.css`, `index.css`, 기본 `App.tsx`) 정리/대체한다.

### 상세 패턴이 필요할 때
아래 파일을 참조한다. 일반적인 작업에서는 이 SKILL.md만으로 충분하다.
- shared/api 3계층 패턴 → [shared-api.md](layers/shared-api.md)
- HTTP 클라이언트 (base + 도메인) → [http-client.md](rules/http-client.md)
- query-factory 패턴 → [shared-query-factory.md](layers/shared-query-factory.md)
- mutation-factory 패턴 → [shared-mutation-factory.md](layers/shared-mutation-factory.md)
- app 레이어 상세 → [app.md](layers/app.md)
- pages 레이어 상세 → [pages.md](layers/pages.md)
- shared 레이어 상세 → [shared.md](layers/shared.md)
- 선택 레이어(entities/features/widgets) 상세 → [optional-layers.md](layers/optional-layers.md)
- Slice 공통 규칙(인터페이스/분해/추출) → [rules.md](rules/rules.md)
- ESLint 설정 템플릿 → [eslint-config.md](rules/eslint-config.md)
- Next.js 프로젝트 적용 가이드 → [nextjs.md](integrations/nextjs.md)
- RSC + TanStack Query 패턴 → [nextjs-rsc-tanstack-query.md](integrations/nextjs-rsc-tanstack-query.md)

---

## 핵심 원칙

- **pages 레이어가 중심이다.** 모든 구조는 page에서 시작하여 필요에 따라 확장한다.
- 초기 구조: `app / pages / shared`. 필요 시 `widgets / features / entities`를 하나씩 도입.
- **가장 좁은 범위에서 시작.** 공통이 생기면 가장 가까운 공통 범위로 추출.
- **섣불리 다른 레이어로 이동하지 않는다.** 2개 이상 Slice에서 실제 사용 + 책임 안정성 + Slice 문맥 무관 모두 확인한 뒤에만 이동.
- page는 단순 엔트리가 아닌 화면 단위 모듈이다. 전용 상태·훅·컴포넌트·도메인 로직을 직접 소유한다.

---

## 레이어 역할

### app
애플리케이션 실행을 위한 최상위 구성 레이어.
라우팅, 전역 Provider, 전역 스타일/레이아웃을 소유한다.
비즈니스 로직을 직접 구현하지 않는다. 다른 레이어에서 만든 것을 조립하는 역할.
엔트리포인트(`main.tsx`)는 app 바깥(`src/` 루트)에 위치하는 부팅 파일이다.

### pages
Route 기준 화면 모듈. 이 아키텍처의 핵심 레이어.
page는 화면 모듈이며, 전용 상태/훅/컴포넌트/도메인 로직을 직접 소유한다.
복잡해지면 큰 단위 컴포넌트로 나누고, 그 하위도 필요에 따라 계속 분해한다.

### shared
앱의 기본 구성 요소와 기반 도구. page 문맥 없이 독립적으로 성립하는 코드만 둔다.
가장 하위 레이어이며, 다른 레이어를 import하지 않는다.
내부는 Segment로 구성: `api`, `ui`, `lib`, `hooks`, `config`, `routes`, `i18n`, `query-factory`, `mutation-factory`

**shared 분류 기준:**
- **기반 모듈** (초기부터 존재): `config`, `routes`, `i18n`, `api`, 디자인 시스템
- **이동 모듈** (사용처에서 시작 → 공통 시 이동): business-agnostic 코드라도 처음에는 사용처에 둔다

이동 모듈 판단 — 아래 조건을 **모두** 만족하지 않으면 이동하지 않는다:
- 단순히 두 번 이상 사용된다는 이유만으로 전역화하지 않는다
- 2개 이상의 Slice에서 **실제로** 사용하고 있을 때만 추출 검토
- 해당 책임이 충분히 안정적인지 판단. 변경 중이면 추출하지 않는다
- Slice 문맥 없이도 의미가 유지되는지 확인
- 입력/출력이 특정 Slice 상태에 결합되어 있으면 로컬 유지

**shared/ui는 business-agnostic만 허용.** 도메인 특화 UI(`ProductCard` 등)는 `entities`에 둔다.

### widgets (optional)
독립적으로 동작하는 큰 UI 구성 단위. 여러 page에서 재사용되는 복합 UI 블록.
하위 레이어(`features`, `entities`, `shared`)를 조합한다.
2개 이상의 page에서 동일한 복합 UI가 반복될 때 도입.

### features (optional)
사용자에게 비즈니스 가치를 제공하는 재사용 가능한 기능 단위.
인터랙션 UI와 로직(장바구니 추가, 검색, 인증 등)을 캡슐화.
2개 이상의 page에서 동일한 인터랙션이 반복될 때 도입.

### entities (optional)
프론트엔드 도메인 표현 레이어 (User, Product, Order 등).
도메인 특화 UI, 표시 로직(label/color 매핑), 검증을 소유.
API 정의는 `shared/api`에 둔다. entities는 "데이터를 어떻게 표현하는가"에 집중.

---

## 초기 구조

```txt
src/
├─ main.tsx        ← app 바깥, 부팅 전용
├─ app/
├─ pages/
└─ shared/
```

확장 시 (필요한 레이어만 독립적으로 도입):

```txt
src/
├─ main.tsx
├─ app/
├─ pages/
├─ widgets/      # optional
├─ features/     # optional
├─ entities/     # optional
└─ shared/
```

### page-first 확장 경로

모든 코드는 page에서 시작. 재사용이 실제로 발생하면 추출한다. 각 Stage는 순서가 아니라 필요에 따른 독립적 선택이다.

```
Stage 0: app / pages / shared — page가 모든 것을 소유
Stage 1: 도메인 UI가 여러 page에서 반복 → entities 도입
Stage 2: 인터랙션이 여러 page에서 반복 → features 도입
Stage 3: 복합 UI 블록이 여러 page에서 반복 → widgets 도입
```

---

## import 방향 규칙

레이어 간 import는 상위에서 하위 방향으로만 허용. 역방향 금지.

```txt
app → pages → (widgets → features → entities →) shared
```

- `app`은 모든 하위 레이어를 import 가능. 다른 레이어는 `app`을 import하지 않는다.
- `pages`는 `shared`를 import 가능. 확장 시 `widgets`, `features`, `entities`도 가능.
- **page 간 cross-import 금지.** 같은 레이어 sibling 간 cross-import 금지.
- `shared`는 다른 레이어를 import하지 않는다.
- **다른 레이어 접근 시 반드시 path alias를 사용한다.** 상대경로(`../`)는 같은 레이어 내부에서만 허용.

---

## 네이밍 및 폴더 규칙

| 항목 | 규칙 | 예시 |
|------|------|------|
| 파일명 | 케밥 케이스 | `page-header.tsx`, `use-page-filters.ts` |
| 컴포넌트 | 하위 종속 없으면 파일, 있으면 폴더 + `index.tsx` | `button.tsx` vs `modal/index.tsx` |
| export | Named Export 기본. Default Export는 프레임워크 요구 시만 | `export function Button()` |
| import | 타입은 반드시 `type` import | `import type { Foo }` |
| `index.tsx` | 종속 컴포넌트를 조합하는 실제 구현 파일. 단순 re-export 래퍼가 아니다 | — |
| `index.ts` | export 정리용 엔트리만 | — |
| private 폴더 | `_` prefix. 처음부터 만들지 않고 필요 시만 | `_ui/`, `_hooks/` |

---

## 추출 이동 기준

아래 조건을 **모두** 만족하지 않으면 이동하지 않는다:

1. **2개 이상의 Slice에서 실제로 사용** — "나중에 쓸 것 같다"는 예측 금지
2. **책임이 안정적** — 변경 중이면 추출하지 않는다
3. **Slice 문맥 없이도 의미가 유지** — 특정 Slice 상태에 결합되어 있으면 로컬 유지
4. **공통이 생기면 가장 가까운 공통 범위로 먼저 추출** — 바로 전역 레이어로 올리지 않는다

추출 대상 분류:
- 복합 UI 블록 → `widgets`
- 사용자 인터랙션 단위 → `features`
- 도메인 UI / 표시 로직 → `entities`
- business-agnostic 유틸/훅 → `shared`

---

## 판단 순서

이 순서를 반드시 따른다.

1. 이 코드는 특정 page 전용인가? → page에 둔다.
2. 특정 하위 모듈 전용인가? → 해당 하위 모듈에 둔다.
3. 더 작은 범위 안에서 해결할 수 있는가? → 가장 좁은 범위에 둔다.
4. 공통이 생겼는가? → **가장 가까운 공통 범위로 추출한다.**
5. 2개 이상의 Slice에서 실제로 사용하고 있는가? → 아니면 현재 범위에 남긴다.
6. page 문맥 없이도 의미가 성립하는가? → 적절한 레이어로 추출.
7. 위 조건에 해당하지 않으면 로컬에 남긴다.

---

## Agent 행동 규칙

### 금지
- page 내부 구조를 전역 구조처럼 해석하지 않는다.
- page 전용 구조를 무리하게 추상화하지 않는다.
- 공통 폴더를 미리 만들지 않는다. 실제 공통이 생겼을 때만 추출한다.
- "나중에 쓸 것 같아서" 전역 레이어로 올리지 않는다.
- "나중에 전역에서 쓸 수 있으니까" Provider를 app에 미리 올리지 않는다.
- 도메인 특화 코드를 shared에 두지 않는다. 확장 레이어 도입 여부를 사용자에게 먼저 물어본다.
- page를 단순 import 후 나열만 하는 빈 조립 레이어로 축소하지 않는다. page는 로직을 직접 소유한다.
- 입력/출력이 특정 Slice 상태에 결합된 코드를 전역으로 추출하지 않는다. 로컬에 유지한다.
