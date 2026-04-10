# Phase 5: 아키텍처 준수 점검

> Phase 1~4에서 구조 전환, ESLint 규칙 설정, API/Query 패턴이 완료된 상태이다. 이 Phase에서는 [architecture SKILL.md](../../architecture/SKILL.md)의 규칙을 기준으로 준수 여부를 점검하고, 위반 사항을 수정한다.

### 14단계: 레이어 역할 점검

architecture SKILL.md의 **"레이어 역할"** 섹션을 기준으로 각 레이어의 파일 배치를 점검한다.

#### app 레이어

app은 "라우팅, 전역 Provider, 전역 스타일/레이아웃"을 소유한다. 이 역할에 맞게 파일이 배치되었는지 점검한다:

- Provider, 전역 스타일, 레이아웃 셸 → `app/` 루트에 유지
- 레이아웃 UI 컴포넌트(gnb, footer, lnb, modal, sidebar 등) → 5개 이상이면 `app/_ui/`로 분리

**탐지:** `src/app/` 내 `.tsx` 파일 목록을 확인하고, Provider/layout이 아닌 UI 컴포넌트 파일 수를 센다. `_ui/`로 이동할 파일 목록을 사용자에게 제시하고 확인받는다.

#### pages 레이어

pages는 "route 기준 화면 모듈"이며, "전용 상태/훅/컴포넌트/도메인 로직을 직접 소유"한다. 점검 항목:

- 각 page가 route 기준 독립 Slice인지
- page 전용 코드가 shared 등 외부로 유출되지 않았는지

#### shared 레이어

shared는 "page 문맥 없이 독립적으로 성립하는 코드"만 둔다. 각 모듈의 실제 사용처를 분석한다:

**사용처 분석** — shared의 각 모듈(ui, hooks, lib)에 대해 **Grep을 병렬 도구 호출로 동시에 실행**하여 프로젝트 전체에서 해당 모듈을 import하는 파일 목록을 수집하고, 아래 기준으로 분류한다:

| 사용처 | 판단 | 조치 |
|--------|------|------|
| 단일 Slice에서만 사용 | 해당 Slice 전용 | Slice 내부 private 폴더 (`_ui/`, `_hooks/` 등)로 이동 |
| 단일 레이어에서만 사용 | 해당 레이어 전용 | 해당 레이어 내부 private 폴더로 이동 |
| 여러 레이어에서 사용 + business-agnostic | 공유 가능 | shared 유지 |
| 여러 레이어에서 사용 + domain-specific | 공유하되 레이어 검토 | shared 유지, 향후 entities 도입 시 이동 후보로 기록 |

이동 계획을 사용자에게 표로 제시하고, 확인을 받은 후 이동한다.

### 15단계: 네이밍 및 폴더 규칙 점검

architecture SKILL.md의 **"네이밍 및 폴더 규칙"** 테이블을 기준으로 점검한다.

#### index.tsx re-export 래퍼 탐지

`index.tsx`는 "종속 컴포넌트를 조합하는 실제 구현 파일"이어야 한다. 단순 re-export 래퍼를 탐지한다:

- Grep: pattern `export \{ .* \} from '\.\/'`, glob `src/pages/**/index.{ts,tsx}`, head_limit 20

탐지된 경우:
- 해당 폴더에 하위 종속 컴포넌트가 **있는** 경우: re-export 대상 파일의 내용을 `index.tsx`로 이동하고, 원래 파일을 삭제한다. SCSS 모듈 파일도 함께 rename한다.
- 해당 폴더에 하위 종속 컴포넌트가 **없는** 경우: 폴더를 단일 파일로 되돌린다.

#### 폴더 전환 대상 탐지

"하위 종속 없으면 파일, 있으면 폴더 + index.tsx" 규칙을 점검한다:

- 각 Slice의 파일이 같은 Slice 내 다른 파일을 import하는지 Grep으로 확인
- 하위 종속이 있는데 단일 파일인 경우 → 폴더 + `index.tsx`로 전환

> macOS 대소문자 비구분 파일시스템에서 rename 시 임시 경로 경유가 필요하다. Phase 1의 일괄 처리 전략을 참조.

#### 잔여 네이밍/export 점검

파일명(kebab-case)은 Phase 1에서, Named Export와 import type 전환은 Phase 2에서 완료되어 있다. Phase 3-4에서 새로 작성한 코드에 잔여 위반이 있을 수 있으며 eslint가 자동 탐지한다.

### 16단계: 선택 레이어 도입 제안

architecture SKILL.md의 **"추출 이동 기준"** + **"판단 순서"** 섹션을 기준으로 분석한다.

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

**사용자에게 Phase 5 완료를 알리고, Phase 6 진행 여부를 확인한다.**
