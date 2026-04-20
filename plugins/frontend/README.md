# Frontend Plugin

> 프론트엔드 코드 작성 시 일관된 레이어드 아키텍처를 자동 적용하는 Claude Code 플러그인. React(Vite)와 Next.js(App Router / Pages Router)를 지원합니다.

## 설치

```
/plugin install frontend@hth-plugins
```

## 시작하기

설치 후 아래 스킬 중 하나를 먼저 실행하세요. `architecture` 스킬이 자동 로드되어 이후 모든 프론트엔드 코드 작성에 아키텍처 규칙이 적용됩니다.

| 상황 | 실행 |
|------|------|
| 새 프로젝트 시작 | `/frontend:create` |
| 기존 프로젝트에 적용 | `/frontend:migrate` |

---

## 제공 기능

### 스킬

| 스킬 | 유형 | 설명 |
|------|------|------|
| `architecture` | 자동 적용 | 프론트엔드 코드 작성·리뷰·리팩토링 시 레이어 아키텍처 규칙을 자동 적용. Next.js 프로젝트 감지 시 추가 규칙 자동 로드 |
| `create` | 사용자 호출 | 레이어드 아키텍처 기반 새 프로젝트 생성 |
| `migrate` | 사용자 호출 | 기존 프로젝트를 레이어드 아키텍처로 단계별 전환 |

`architecture` 스킬은 별도 호출 없이 프론트엔드 코드 작업 시 Claude가 자동으로 적용합니다:

- 레이어 구조: `app → pages → (widgets → features → entities →) shared`
- import 방향 규칙 (역방향 금지)
- Slice 분해·추출 원칙
- 네이밍 컨벤션 (kebab-case, Named Export)
- ESLint 엔트리포인트 강제
- Next.js 프로젝트 감지 시 라우팅 폴더/FSD 레이어 분리 규칙 자동 적용

### 사용자 호출 스킬

| 스킬 | 호출 방법 | 설명 |
|------|-----------|------|
| `create` | `/frontend:create` | 새 프로젝트 생성 |
| `migrate` | `/frontend:migrate` | 기존 프로젝트에 아키텍처 적용 |

---

## `/frontend:create`

레이어드 아키텍처가 적용된 새 프론트엔드 프로젝트를 생성합니다.

**React (Vite) 템플릿**

| 분류          | 기술                            |
| ------------- | ------------------------------- |
| 빌드          | Vite                            |
| UI            | React                           |
| 언어          | TypeScript                      |
| 스타일링      | Tailwind CSS                    |
| 라우팅        | React Router                    |
| 서버 상태     | TanStack Query                  |
| HTTP          | Axios                           |
| 패키지 매니저 | yarn / npm / pnpm (사용자 선택) |
| 포매터        | Prettier                        |

**Next.js App Router 템플릿**

| 분류          | 기술                            |
| ------------- | ------------------------------- |
| 프레임워크    | Next.js (App Router)            |
| 언어          | TypeScript                      |
| 스타일링      | Tailwind CSS                    |
| 서버 상태     | TanStack Query                  |
| HTTP          | Axios                           |
| 패키지 매니저 | yarn / npm / pnpm (사용자 선택) |
| 포매터        | Prettier                        |

## `/frontend:migrate`

기존 프로젝트의 구조를 분석하고, 레이어드 아키텍처로 단계별 전환합니다.
React(Vite)와 Next.js(App Router / Pages Router) 프로젝트 모두 지원하며, 프레임워크를 자동 감지하여 적절한 구조를 적용합니다.
각 Phase 완료 후 빌드 가능한 상태를 유지하며, 사용자 확인을 받고 다음 Phase로 진행합니다.

| Phase | 내용 | 조건 |
|-------|------|------|
| 0 | 분석 + 계획 — architecture 스킬 기반 프로젝트 분석, 전환 계획 수립 | 항상 |
| 1 | 구조 전환 — 파일 이동, import 수정 | 항상 |
| 2 | 코드 규칙 — ESLint 설정, Named Export, import type | 항상 |
| 3 | API 3계층 — 기존 API 코드를 도메인별 3계층으로 전환 | API 코드가 있을 때 |
| 4 | Query/Mutation 팩토리 — TanStack Query 프로젝트만 | TanStack Query 사용 시 |
| 5 | 검증 + 보고 — architecture 스킬 기반 준수 점검, 보고서 | 항상 |

---

## 아키텍처 구조

```
src/
├─ main.tsx          엔트리포인트 (app 외부)
├─ app/              라우팅, Provider, 전역 스타일/레이아웃
├─ pages/            route 기준 화면 모듈 (핵심 레이어)
├─ widgets/          (선택) 복합 UI 블록
├─ features/         (선택) 사용자 인터랙션 단위
├─ entities/         (선택) 도메인 표현
└─ shared/           기반 도구 (API, config, routes, UI, lib, hooks)
```

> 초기 구조는 `app / pages / shared` 3개만 사용합니다.
> `widgets`, `features`, `entities`는 실제 재사용이 발생할 때 하나씩 도입합니다.

---

## 문서

- [한국어 문서](docs/ko/README.md)
- [English docs](docs/en/README.md)

> **문서 동기화 주의:** `skills/` 내 규칙 문서(에이전트 지시문)와 `docs/`(사람용 설명)는 같은 내용을 다른 톤으로 작성합니다. `skills/` 규칙을 변경하면 `docs/ko/`와 `docs/en/`도 함께 반영해야 합니다.
