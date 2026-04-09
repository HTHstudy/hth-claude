# Slice 공통 규칙

> pages, widgets, features, entities 모든 Slice 기반 레이어에 동일하게 적용한다.

---

## 1. 공개 인터페이스

Slice 내부 파일은 외부에서 직접 import하지 않는다.
각 Slice의 entrypoint(`index.tsx` 또는 `index.ts`)만 통해 접근한다.

```ts
// 올바름
import { Header } from '@widgets/header';
import { ProductCard } from '@entities/product';

// 금지: 내부 파일 직접 import
import { NavMenu } from '@widgets/header/nav-menu';
```

### ESLint 강제

아래 규칙을 ESLint로 강제한다. 전체 설정 템플릿은 [eslint-config.md](eslint-config.md) 참조.

- `@[layer]/*/*` 패턴으로 Slice 내부 직접 접근 차단
- 레이어 방향 위반 import 차단 (하위 → 상위)
- 같은 레이어 sibling 간 cross-import 차단
- 상대경로로 다른 레이어 접근 차단 (path alias 강제)
- `import/no-default-export` — Named Export 강제 (프레임워크 요구 파일은 override로 예외)
- `@typescript-eslint/consistent-type-imports` — 타입 import에 `type` 키워드 강제

### import 규칙
- Slice 내부: 상대경로
- Slice 외부: `@[layer]/[slice]`에서만 import
- **같은 레이어 Slice 간 cross-import 금지** — 필요하면 상위 레이어에서 조합

---

## 2. 분해 규칙

### 시작
처음부터 `_ui/`, `_context/`, `_hooks/` 같은 폴더를 미리 만들지 않는다. 가장 단순한 형태로 시작.

### 분해 시점
- JSX와 로직 책임이 2개 이상 섞여 있을 때
- 한 파일 안에서 서로 무관한 상태나 흐름이 공존할 때
- 파일 길이보다 **독립적 책임의 수**를 기준으로 삼는다

### 분해 방향
Slice를 설명하기 위한 큰 단위 컴포넌트로 나눈다. 하위 컴포넌트도 필요하면 계속 분해. 깊이는 문제 자체가 아니다.

### 분해 흐름
```
Slice 하나로 시작
→ 필요하면 큰 단위 컴포넌트로 분해
→ 그 큰 단위도 필요하면 내부에서 다시 분해
→ 가장 작은 부분에서 재사용이 보이면 추출 검토
→ 책임이 안정적이고 Slice 문맥과 무관하면 실제 추출
```

```txt
[slice]/
├─ component-a/
│  ├─ child-a/
│  │  └─ index.tsx
│  └─ index.tsx
├─ component-b/
│  └─ index.tsx
└─ index.tsx
```

---

## 3. 추출 규칙

### 원칙
Slice 내부 구조는 해당 Slice 전용이다. 그대로 다른 레이어로 이동하지 않는다.
재사용이 필요하면, Slice 문맥과 무관한 책임만 추출하여 더 넓은 공유 범위로 이동.

### 가장 가까운 공통 범위로 추출
처음부터 Slice 루트나 다른 레이어로 이동하지 않는다.

### 추출한 파일 정리
여러 개 생기면 `_ui/`, `_context/`, `_lib/` 같은 private 폴더로 묶는다. 처음부터 만들지 않는다.

```txt
[slice]/
├─ component-a/
├─ _ui/
│  ├─ filter-chip.tsx
│  └─ summary-badge.tsx
├─ _context/
│  └─ filter-context.tsx
└─ index.tsx
```

### 다른 레이어로 이동
2개 이상의 Slice에서 실제 사용 + Slice 문맥 없이 독립 동작 → 이동 검토.
하나라도 불충족이면 로컬에 남긴다. 가장 가까운 공통 범위 추출이 기본, 다른 레이어 이동은 최종 단계.
