# Phase 4: 코드 정리 및 세분화

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

### 빌드 검증 후 커밋

빌드가 정상이면 중간 커밋을 생성한다:

```bash
git add -A
git commit -m "refactor: 코드 정리 및 shared 모듈 세분화"
```

**사용자에게 Phase 4 완료를 알리고, Phase 5 진행 여부를 확인한다.**
