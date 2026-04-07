# Phase 4: 코드 정리 및 세분화

### 14단계: shared 세그먼트 분류

기존 코드 중 shared로 이동된 파일들을 세그먼트별로 정리한다:
- `shared/ui/` — business-agnostic UI 컴포넌트만 허용. 도메인 특화 UI(`ProductCard` 등)는 제외
- `shared/hooks/` — page 문맥 없이 독립적으로 성립하는 훅
- `shared/lib/` — 범용 유틸리티 함수

#### 사용처 분석

shared의 각 모듈(ui, hooks, lib)에 대해 **실제 import 사용처를 검색**한다. 프로젝트 전체에서 해당 모듈을 import하는 파일 목록을 수집하고, 아래 기준으로 분류한다:

| 사용처 | 판단 | 이동 대상 |
|--------|------|-----------|
| 단일 Slice에서만 사용 | 해당 Slice 전용 | Slice 내부 private 폴더 (`_ui/`, `_hooks/` 등) |
| 단일 레이어에서만 사용 | 해당 레이어 전용 | 해당 레이어 내부 private 폴더 (`_ui/`, `_hooks/` 등) |
| 여러 레이어에서 사용 + business-agnostic | 공유 가능 | shared 유지 |
| 여러 레이어에서 사용 + domain-specific | 공유하되 레이어 검토 | shared 유지, 향후 entities/ 도입 시 이동 후보로 기록 |

이동 계획을 사용자에게 표로 제시하고, 확인을 받은 후 이동한다.

#### 네이밍 컨벤션 적용

[SKILL.md](../../architecture/SKILL.md)의 "네이밍 및 폴더 규칙" 테이블을 기준으로, `src/` 내 FSD 레이어의 모든 파일을 검사한다:

| 항목 | 점검 내용 | 전환 방법 |
|------|-----------|-----------|
| 파일명 | 케밥 케이스가 아닌 파일 | `git mv`로 이름 변경, import 경로 일괄 수정 |
| export | `export default` 사용 파일 | Named Export로 전환, import 구문을 `import { ... } from`으로 수정 |
| import | 타입에 `type` 키워드 누락 | `import type { Foo }` 형식으로 수정 |
| 컴포넌트 구조 | 하위 종속이 있는데 단일 파일인 경우 | 폴더 + `index.tsx`로 전환 |

**예외 — Default Export를 유지하는 파일:**

프레임워크가 Default Export를 요구하는 파일은 전환하지 않는다. Next.js의 경우 [nextjs.md](../../architecture/integrations/nextjs.md)의 "Default Export" 섹션을 참조한다.

위반 목록을 사용자에게 표로 제시하고, 확인을 받은 후 진행한다.

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

### 빌드 검증 후 커밋

빌드가 정상이면 중간 커밋을 생성한다:

```bash
git add -A
git commit -m "refactor: 코드 정리 및 shared 모듈 세분화"
```

**사용자에게 Phase 4 완료를 알리고, Phase 5 진행 여부를 확인한다.**
