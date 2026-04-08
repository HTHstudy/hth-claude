# Phase 0: 사전 평가

마이그레이션 시작 전, 프로젝트의 규모와 복잡도를 분석하여 전환 가능 여부와 권장 범위를 결정한다.

---

## 0-1. 프로젝트 스캔

아래 항목을 분석한다:

| 항목 | 확인 방법 |
|------|-----------|
| 프레임워크 | `package.json`의 `dependencies` — React / Next.js / Remix 등 |
| 빌드 도구 | Vite / Webpack / Turbopack / CRA 등 |
| 패키지 매니저 | lock 파일 확인 — `yarn.lock` / `package-lock.json` / `pnpm-lock.yaml` |
| TypeScript 여부 | `tsconfig.json` 존재 여부 |
| 소스 루트 | `src/` 또는 프로젝트 루트 |
| 총 컴포넌트 수 | `.tsx` / `.jsx` 파일 개수 (테스트·스토리 제외) |
| 라우트/페이지 수 | 라우터 설정 또는 pages/app 디렉토리의 라우트 수 |
| API 호출 코드 | axios / fetch / 자체 HTTP 클라이언트 사용 현황 |
| TanStack Query 사용 | `useQuery` / `useMutation` 호출 수 |

### 프로젝트 구조 스냅샷

위 항목 분석과 함께, Phase 1에서 파일을 다시 탐색하지 않도록 아래 정보를 Claude Code 내장 도구로 수집한다:

1. **폴더 구조 캡처** — Glob 도구로 `[소스루트]/**/*` 패턴 사용. node_modules, .next, dist, build, .git 경로는 자동 제외됨
2. **소스 파일 목록** — Glob 도구로 `[소스루트]/**/*.{ts,tsx,js,jsx}` 패턴 사용. 결과에서 `__tests__`, `.test.`, `.spec.`, `.stories.` 경로 제외
3. **import 맵 (파일별 import 문)** — Grep 도구 사용:
   - pattern: `^import `
   - glob: `*.{ts,tsx,js,jsx}`
   - path: [소스루트]
   - output_mode: content

import 맵이 200줄을 초과하면 assessment.md에는 처음 200줄만 저장하고, 전체 맵은 `.architecture-migration/import-map.txt`에 별도 저장한다. Phase 1에서는 import-map.txt를 Grep 도구로 필요한 패턴별로 검색하여 참조한다.

이 결과를 assessment.md에 포함한다. Phase 1은 이 스냅샷만으로 전환 계획을 수립할 수 있다.

## 0-2. 복잡도 분류

컴포넌트 수 기준으로 분류한다:

| 등급 | 컴포넌트 수 | 권장 범위 |
|------|------------|-----------|
| **Small** | 20개 미만 | 전체 Phase (1-5) 진행 가능 |
| **Medium** | 20-50개 | 전체 Phase 진행 가능, 단 각 Phase 사이 충분한 검증 필요 |
| **Large** | 50개 이상 | Phase 1(구조 전환)만 우선 진행 권장. 나머지는 안정화 후 별도 실행 |

## 0-3. 차단 요소 탐지

아래 항목이 발견되면 사용자에게 보고하고, 해결 방안을 먼저 논의한다:

- **모노레포 구조** — 여러 패키지가 하나의 저장소에 있는 경우, 대상 패키지를 명확히 지정해야 한다
- **비표준 빌드 설정** — eject된 CRA, 커스텀 Webpack 설정 등이 있으면 빌드 호환성 사전 확인 필요
- **순환 의존성** — 모듈 간 순환 참조가 광범위하면 Phase 1에서 import 수정이 복잡해진다
- **비표준 진입점** — `src/index.tsx`나 `src/main.tsx`가 아닌 별도 엔트리를 사용하는 경우

차단 요소가 있으면 해당 항목의 해결 방안을 사용자에게 제시한다.

## 0-4. 평가 보고서 작성 및 저장

분석 결과를 아래 형식으로 `.architecture-migration/assessment.md`에 저장하고, 사용자에게도 보고한다.

> 이 파일은 세션이 중단되더라도 이후 Phase에서 참조할 수 있도록 영속화한 것이다.

```
## 프로젝트 평가 결과

| 항목 | 결과 |
|------|------|
| 프레임워크 | [결과] |
| 빌드 도구 | [결과] |
| 소스 루트 | [결과] |
| 패키지 매니저 | [결과] |
| 컴포넌트 수 | [N]개 |
| 라우트 수 | [N]개 |
| 복잡도 등급 | [Small / Medium / Large] |
| API 호출 방식 | [결과 — 없으면 "없음"] |
| TanStack Query | [사용 / 미사용] |
| 차단 요소 | [없음 / 목록] |

### 파일 구조
[폴더 구조 출력 결과]

### 소스 파일 목록
[소스 파일 경로 목록]

### import 맵
[파일별 import 문 목록]

### 권장 전환 범위
[전체 Phase 진행 / Phase 1만 우선 진행 / 진행 불가 — 사유]

### 적용 대상 Phase
- [x] Phase 1: 구조 전환
- [ ] Phase 2: shared/api 3계층
- [ ] Phase 3: query/mutation 팩토리
- [x] Phase 4: 코드 정리 및 세분화
- [x] Phase 5: 최종 보고
```

**적용 대상 Phase 판단 기준:**

0-1 스캔 결과를 바탕으로 체크 여부를 결정한다. 템플릿을 그대로 복사하지 않는다.

| Phase | 체크 조건 |
|-------|-----------|
| Phase 1 | 항상 체크 |
| Phase 2 | API 호출 코드가 존재할 때만 체크 (axios, fetch, HTTP 클라이언트 사용이 확인된 경우) |
| Phase 3 | TanStack Query를 사용할 때만 체크 (`useQuery`/`useMutation` 호출이 확인된 경우) |
| Phase 4 | 항상 체크 |
| Phase 5 | 항상 체크 |

저장 후 `.gitignore`에 `.architecture-migration/`을 추가한다.

## 0-5. 사용자 확인

사용자에게 권장 범위를 안내하고, 진행 여부와 범위를 확인받는다.

- 사용자가 권장 범위와 다른 선택을 하면 그에 따른다
- Large 프로젝트에서 전체 Phase를 원하면 각 Phase 사이 커밋 및 검증을 더욱 철저히 수행한다

### 진행 불가 시

해결 불가능한 차단 요소가 있거나 사용자가 중단을 선택하면:

1. 차단 요소와 해결 방안을 보고한다
2. `.architecture-migration/assessment.md`는 남겨둔다 (해결 후 재실행 시 참고용)
3. 브랜치를 생성하지 않고 스킬을 종료한다
4. 사용자에게 "차단 요소 해결 후 다시 실행하면 Phase 0을 건너뛰고 진행할 수 있다"고 안내한다
