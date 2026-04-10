# Phase 4: 코드 정리 및 세분화

> Phase 1에서 레이어 배치(app/pages/shared)와 re-export 래퍼 생성이 완료된 상태이다. 파일명은 원래 이름 그대로이고, 폴더 구조도 원본을 유지하고 있다. 이 단계에서 네이밍 컨벤션(kebab-case), 폴더 구조 전환을 수행한다.

### 14단계: shared 세그먼트 분류

기존 코드 중 shared로 이동된 파일들을 세그먼트별로 정리한다:
- `shared/ui/` — business-agnostic UI 컴포넌트만 허용. 도메인 특화 UI(`ProductCard` 등)는 제외
- `shared/hooks/` — page 문맥 없이 독립적으로 성립하는 훅
- `shared/lib/` — 범용 유틸리티 함수

#### 사용처 분석

shared의 각 모듈(ui, hooks, lib)에 대해 **실제 import 사용처를 검색**한다. **모듈별 Grep을 병렬 도구 호출로 동시에 실행**하여 프로젝트 전체에서 해당 모듈을 import하는 파일 목록을 수집하고, 아래 기준으로 분류한다:

| 사용처 | 판단 | 이동 대상 |
|--------|------|-----------|
| 단일 Slice에서만 사용 | 해당 Slice 전용 | Slice 내부 private 폴더 (`_ui/`, `_hooks/` 등) |
| 단일 레이어에서만 사용 | 해당 레이어 전용 | 해당 레이어 내부 private 폴더 (`_ui/`, `_hooks/` 등) |
| 여러 레이어에서 사용 + business-agnostic | 공유 가능 | shared 유지 |
| 여러 레이어에서 사용 + domain-specific | 공유하되 레이어 검토 | shared 유지, 향후 entities/ 도입 시 이동 후보로 기록 |

이동 계획을 사용자에게 표로 제시하고, 확인을 받은 후 이동한다.

#### 네이밍 컨벤션 적용

[SKILL.md](../../architecture/SKILL.md)의 "네이밍 및 폴더 규칙" 테이블을 기준으로, `src/` 내 FSD 레이어의 **모든 파일**을 검사한다. Phase 1에서 이동한 파일뿐 아니라, **이동하지 않고 기존 위치에 남아 있는 파일도 반드시 포함**한다:

| 항목 | 점검 내용 | 전환 방법 |
|------|-----------|-----------|
| 파일명 | 케밥 케이스가 아닌 파일 | `git mv`로 이름 변경, import 경로 일괄 수정 |
| export | `export default` 사용 파일 | eslint `import/no-default-export`가 탐지. Named Export로 전환 |
| import | 타입에 `type` 키워드 누락 | eslint `consistent-type-imports`가 탐지. `import type { Foo }` 형식으로 수정 |
| 컴포넌트 구조 | 하위 종속이 있는데 단일 파일인 경우 | 폴더 + `index.tsx`로 전환 |

> export/import 위반은 Phase 1에서 설정한 eslint 규칙이 자동 탐지한다. Phase 4에서 별도 Grep 탐지 불필요.

#### 위반 탐지 전략

`export default`, `import type` 위반은 eslint 규칙(`import/no-default-export`, `@typescript-eslint/consistent-type-imports`)이 잡는다. Phase 4 자체 탐지는 **PascalCase 파일명만** 수행한다 (tsc/eslint가 파일명 규칙을 모름):

- **파일명 — 케밥 케이스 위반**: Glob 도구로 `src/**/*[A-Z]*.{ts,tsx}` 패턴 사용

결과를 바로 수정한다 (kebab-case 변환은 기계적 규칙이므로 사용자 확인 불필요).

파일 rename 및 import 수정은 [Phase 1의 일괄 처리 전략](phase-1-structure.md#일괄-처리-전략)을 동일하게 적용한다 (매핑 테이블 → 셸 스크립트 일괄 `git mv`, import 일괄 치환 후 Grep 도구로 잔여 검증).

**macOS 대소문자 비구분 파일시스템 대응**: kebab-case 변환 시 PascalCase → kebab-case는 대소문자만 다른 경로로 인식되어 직접 `git mv`가 실패한다. 반드시 임시 경로를 경유하는 2단계 rename을 사용한다:

```bash
# 임시 경로 경유
git mv src/app/Header.tsx src/app/tmp-header.tsx
git mv src/app/tmp-header.tsx src/app/header.tsx
```

대소문자 변경이 필요한 파일이 여러 개이면, 모든 파일을 한 번에 임시 경로로 이동한 뒤 다시 한 번에 최종 경로로 이동한다.

### 15단계: page 내부 분해

각 page의 코드를 분석하고 필요 시 분해한다:
- **하위 종속 컴포넌트가 실제로 존재할 때만** 폴더 구조로 전환한다
- 파일 크기(줄 수)가 크다는 이유만으로 폴더로 전환하지 않는다
- "향후 확장 대비"와 같은 예측 기반 분리를 하지 않는다
- page 전용 훅, 타입, 상수는 page 내부에 유지 (`_hooks/`, `_ui/` 등 private 폴더)
- page 밖으로 추출하지 않는다 — page는 로직을 직접 소유

#### 폴더 전환 예시

**올바른 예 — 종속 컴포넌트가 있을 때:**
```
fun/
├── index.tsx              ← 종속 컴포넌트 조합체 (실제 구현)
├── loot.tsx
├── nft.tsx
├── play.tsx
└── modal-service-detail.tsx
```
`index.tsx`가 하위 컴포넌트를 조합하는 실제 구현 파일이다.

**잘못된 예 — 단순 re-export 래퍼:**
```
brandstory/
├── index.ts               ← export { BrandstoryPage } from './brandstory' (불필요)
└── brandstory.tsx
```
종속 컴포넌트 없이 `index.ts`가 re-export만 하는 구조는 만들지 않는다. 이 경우 `brandstory.tsx` 단일 파일로 유지한다.

### 16단계: 선택 레이어 도입 제안

[architecture SKILL.md](../../architecture/SKILL.md)의 "레이어 역할"(선택 레이어: widgets/features/entities), "추출 이동 기준", "판단 순서" 섹션을 읽고 아래 분석을 수행한다.

코드 중복을 분석한다:
- 복합 UI 블록이 여러 page에서 반복 → `widgets/` 도입 제안
- 사용자 인터랙션이 여러 page에서 반복 → `features/` 도입 제안
- 도메인 UI/표시 로직이 여러 page에서 반복 → `entities/` 도입 제안

제안만 하고, 도입 여부는 사용자가 결정한다. 사용자가 원하면 해당 레이어를 생성하고 코드를 이동한다.

### 사전 점검 (빌드 전) — tsc/eslint가 잡지 못하는 항목만

- **불필요한 re-export index.ts 잔존**: 종속 컴포넌트 없이 re-export만 하는 index.ts가 없는지

Grep 도구로 점검한다:
- 불필요한 re-export 패턴: pattern `export \{ .* \} from '\.\/'`, glob `**/index.{ts,tsx}`, head_limit 20

#### 공통 점검 (tsc → eslint → 빌드)

Phase별 Grep 점검을 통과한 후 아래를 **순서대로** 실행한다. 빌드는 두 검사를 모두 통과한 후에만 수행한다.

```bash
# tsc 타입 검사
npx tsc --noEmit 2>&1 | head -50
```

tsc 에러가 있으면 수정한다.

```bash
# eslint 레이어 규칙 검증
npx eslint --no-warn-ignored --quiet --rule '{"no-restricted-imports": "error"}' 'src/**/*.{ts,tsx}' 2>&1 | head -30
```

eslint 에러가 있으면 수정한다. **두 검사를 모두 통과한 후** 빌드를 실행한다.

### 빌드 검증 후 커밋

빌드가 정상이면 중간 커밋을 생성한다:

```bash
git add -A
git commit -m "refactor: 코드 정리 및 shared 모듈 세분화"
```

**사용자에게 Phase 4 완료를 알리고, Phase 5 진행 여부를 확인한다.**
