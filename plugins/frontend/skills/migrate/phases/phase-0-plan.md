# Phase 0: 분석 + 계획

> **timing.log 기록:** 각 단계(0-1~0-7) 시작 시 `echo "step_0_N: $(date +%s)" >> .architecture-migration/timing.log` 실행.

## 0-1. architecture 스킬 로드

`frontend:architecture` 스킬을 로드한다. 다음 섹션을 모두 확인한다:
- 레이어 역할 (app, pages, shared, 선택 레이어)
- 네이밍 및 폴더 규칙
- import 방향 규칙
- 추출 이동 기준
- 판단 순서

Next.js 프로젝트면 [nextjs.md](../../architecture/integrations/nextjs.md)도 **병렬로 동시에** 읽는다.

## 0-2. 프로젝트 스캔

아래 4개를 **병렬 도구 호출로 동시에** 수집한다:

1. **폴더 구조**: Glob 도구로 `src/` 하위 디렉토리 구조 수집
2. **import 맵**: Grep 도구로 `^import` 패턴 수집 → `.architecture-migration/import-map.txt`에 저장
3. **API 사용 여부**: Grep 도구로 `axios|fetch\(|createApi` 패턴 확인
4. **TanStack Query 사용 여부**: Grep 도구로 `useQuery|useMutation` 패턴 확인

추가 확인:
- 프레임워크 (React/Next.js/Remix)
- 빌드 도구 (Vite/Webpack/Turbopack)
- TypeScript 사용 여부
- 소스 루트 (`src/` vs 루트)
- 총 컴포넌트 수, route/page 수

## 0-3. 복잡도 분류

| 규모 | 파일 수 | 권장 범위 |
|------|---------|-----------|
| Small | 20개 미만 | 전체 Phase (0-5) |
| Medium | 20-50개 | 전체 Phase + 각 Phase 사이 충분한 검증 |
| Large | 50개 이상 | Phase 1만 우선 진행, 안정화 후 나머지 Phase |

> **Large 프로젝트 재진입:** Phase 1 커밋 후 세션이 종료되어도, `/frontend:migrate`를 다시 실행하면 커밋 기반으로 완료된 Phase를 자동 감지하고 다음 Phase부터 이어간다.

## 0-4. 차단 요소 확인

아래 항목이 발견되면 사용자에게 보고하고, 진행 여부를 확인받는다:
- 모노레포 구조
- 비표준 빌드 설정 (ejected CRA, 커스텀 Webpack)
- 순환 의존성
- 비표준 엔트리 포인트

## 0-5. 평가 보고서 작성

`.architecture-migration/assessment.md`에 아래 내용을 저장한다:

```markdown
# Architecture Migration Assessment

## 프로젝트 정보
- 프레임워크: [React/Next.js/Remix]
- 라우터: [App Router / Pages Router / React Router]
- 빌드 도구: [Vite/Webpack/Next.js Built-in]
- TypeScript: [Yes/No]
- 소스 루트: [src/ / 루트]

## 규모
- 총 파일 수: N개
- 컴포넌트 수: N개
- Route/Page 수: N개
- 복잡도: [Small/Medium/Large]

## 차단 요소
- (없음 / 목록)

## 적용 대상 Phase
| Phase | 내용 | 적용 |
|-------|------|------|
| Phase 1: 구조 전환 | 항상 | ✅ |
| Phase 2: 코드 규칙 | 항상 | ✅ |
| Phase 3: API 3계층 | API 코드 존재 시 | ✅/❌ |
| Phase 4: Query/Mutation | TanStack Query 사용 시 | ✅/❌ |
| Phase 5: 검증 + 보고 | 항상 | ✅ |
```

저장 후 `.gitignore`에 `.architecture-migration/`을 추가한다.

## 0-6. 전환 계획 수립

> **이 분류는 패턴 매칭이다. 설계 판단이 아니다.** import-map 데이터만으로 기계적으로 분류한다. 개별 파일 Read 금지. 이 결과는 초기 배치 후보이며, Phase 5에서 architecture 스킬 기준으로 최종 검증한다.

import-map을 **1회 읽고**, 아래 절차를 순서대로 실행한다.

### 분류 절차 (순서대로, 먼저 매칭 우선)

**Step A.** import-map에서 루트 `layout.tsx` 또는 `ClientLayout`이 직접 import하는 컴포넌트 → `app/`

**Step B.** 각 route `page.tsx`가 import하는 컴포넌트 → 해당 page에 귀속 (`pages/[page-name]/`)

**page 이름은 route 경로에서 도출한다.** 컴포넌트 이름이 아닌 route 경로를 kebab-case로 평탄화한다. architecture 스킬과 nextjs.md의 route-Slice 매핑 규칙을 따른다.

**Step C.** Step B에서 2개 이상 page에 등장한 컴포넌트 → `shared/ui/`로 승격

> Step C는 import 횟수만 기반이며, architecture 스킬이 요구하는 "책임 안정성 + Slice 문맥 무관"은 Phase 5에서 재검토한다.

**Step D.** 나머지는 현재 디렉토리 기반으로 기계적 매핑. architecture 스킬의 shared 세그먼트 구조를 참조한다:

| 현재 디렉토리 | → 대상 | 비고 |
|--------------|--------|------|
| `hooks/` | `shared/hooks/` | |
| `lib/`, `utils/`, `helpers/` | `shared/lib/` | |
| `stores/` | `shared/stores/` | |
| `i18n/` | `shared/i18n/` | |
| `types/`, `models/`, `enums/` | `shared/types/` | |
| `styles/` 중 globals | `app/` | 전역 스타일 |
| `styles/` 나머지 | `shared/styles/` | |
| `constants/` | `shared/config/` | |
| `assets/` | `shared/assets/` | |
| `providers/` | `app/` | |
| `api/`, `apis/` | `shared/api/` | Phase 3에서 3계층으로 재구조화. baseURL이 다른 API가 있으면 도메인 후보로 기록 |
| `schemas/`, `validations/` | `shared/lib/` | |

위 매핑에 없는 디렉토리는 사용자에게 확인 후 배치한다. `context/`, `services/`, `layouts/`는 import-map으로 판단한다.

### 매핑 테이블 작성

`.architecture-migration/mapping.tsv`에 TSV 형식으로 저장:

```
# 현재경로	대상경로
src/components/Header.tsx	src/app/header.tsx
src/views/Home.tsx	src/pages/home.tsx
```

파일명을 kebab-case로 변환하여 매핑한다.

### migration-plan.md 작성

`.architecture-migration/migration-plan.md`에 프로젝트별 전환 계획을 저장한다. assessment 분석 결과와 architecture 스킬 규칙을 기반으로 각 Phase에서 구체적으로 할 일을 명시한다:

```markdown
# Migration Plan

## Phase 1: 구조 전환
- 레이어별 파일 수: app(N), pages(N), shared(N)
- 프레임워크 특이사항: [Next.js App Router → 루트 app/ 분리 필요 등]
- 폴더 page 목록 (index.tsx 필요): [목록]
- path alias 설정: [필요한 별칭 목록]

## Phase 2: 코드 규칙
- ESLint 설정 상태: [미설정 / 기존 설정 있음]
- 필요 플러그인: [미설치 목록]
- default export 전환 대상 수: N개
- import type 위반 수: N개

## Phase 3: API 3계층
- 적용 여부: [Yes/No]
- 도메인 목록: [auth, product, ...]
- 기존 HTTP 클라이언트: [axios / fetch / 기타]

## Phase 4: Query/Mutation
- 적용 여부: [Yes/No]
- useQuery 호출 수: N개
- useMutation 호출 수: N개

## Phase 5: 검증
- 중점 점검 항목: [Phase 0 분석에서 발견된 리스크]
```

mapping.tsv와 migration-plan.md는 분류 완료 후 **병렬로** 작성한다.

## 0-7. 사용자 확인

평가 결과, 매핑 테이블, 전환 계획을 사용자에게 제시하고 진행 여부를 확인받는다.

### 진행 불가 시

차단 요소가 해결 불가능하면:
- `.architecture-migration/` 디렉토리를 남겨둔다
- 사용자에게 차단 요소 해결 후 재실행을 안내한다
