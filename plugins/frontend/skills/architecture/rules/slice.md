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

[eslint-config.md](eslint-config.md)의 전체 템플릿을 적용한다. 주요 규칙:

- `no-restricted-imports` — Slice 내부 접근, 레이어 방향, cross-import, 상대경로 횡단 차단
- `import/no-default-export` — Named Export 강제 (프레임워크 요구 파일은 예외)
- `@typescript-eslint/consistent-type-imports` — 타입 import 강제

규칙 추가/변경 시 eslint-config.md만 수정한다.

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
product-detail/
├─ product-info/          ← 하위 분해가 필요한 큰 단위 → 폴더
│  ├─ product-spec.tsx
│  ├─ product-price.tsx
│  └─ index.tsx
├─ product-reviews.tsx    ← 하위 종속 없는 큰 단위 → 단일 파일
└─ index.tsx              ← Slice entrypoint
```

---

## 3. 추출 규칙

> Slice 기반 레이어(pages, widgets, features, entities)의 추출·이동 기준이다.
> shared로의 이동은 성격이 달라 별도 규칙을 따른다 → [shared.md §4](../layers/shared.md#4-shared로-이동하는-조건)

### 원칙
- **가장 좁은 범위에서 시작**한다. 상위 레이어·공통 폴더에 미리 두지 않는다.
- Slice 내부 구조는 해당 Slice 전용이다. 그대로 다른 레이어로 이동하지 않는다.
- 재사용이 필요하면, Slice 문맥과 무관한 책임만 추출한다.
- 공통이 생기면 **가장 가까운 공통 범위로 먼저 추출**한다. 바로 다른 레이어로 올리지 않는다.
- 예측 추출 금지. "나중에 쓸 것 같다"는 이유로 이동하지 않는다.

### 추출 조건 (모두 충족)

다음을 **모두** 만족하지 않으면 이동하지 않는다. 하나라도 불충족이면 로컬에 남긴다.

1. **2개 이상의 Slice(또는 page)에서 실제로 사용하고 있다** — 예측이 아닌 실제 사용.
2. **책임이 안정적이다** — 인터페이스(props/params/return type)가 최근 변경되었거나 변경 예정이면 이동하지 않는다. 필요 시 `git log`로 확인.
3. **Slice 문맥 없이도 의미가 성립한다** — 입력/출력이 특정 Slice 상태·context에 결합되어 있으면 로컬에 유지.

### 추출 단계

추출은 한 번에 최종 위치로 가지 않는다.

```
로컬(현재 파일)
  → 같은 Slice 내부 (component 분해, private 폴더)
  → 가장 가까운 공통 범위 (sibling 공통 상위)
  → 다른 레이어 (widgets / features / entities)
```

**다른 레이어 이동은 최종 단계다.** 가까운 공통 범위에서 해결 가능하면 거기서 멈춘다.

### 추출 대상 분류

조건을 모두 만족했을 때, 책임 성격에 따라 이동 대상이 달라진다.

| 책임 성격 | 이동 대상 |
|-----------|-----------|
| 복합 UI 블록 (여러 하위 조합) | `widgets` |
| 사용자 인터랙션 단위 (UI + 로직) | `features` |
| 도메인 UI / 표시 로직 (label/color 매핑, 검증) | `entities` |
| business-agnostic 유틸/훅/UI | `shared` → [shared.md §4](../layers/shared.md#4-shared로-이동하는-조건) |

레이어별 도입 시점 상세는 [optional-layers.md](../layers/optional-layers.md).

### 추출한 파일 정리

Slice 내부에서 여러 개가 생기면 `_ui/`, `_context/`, `_lib/` 같은 private 폴더로 묶는다. 처음부터 만들지 않는다.

```txt
product-detail/
├─ product-info.tsx
├─ product-reviews.tsx
├─ _ui/
│  ├─ filter-chip.tsx
│  └─ summary-badge.tsx
├─ _context/
│  └─ filter-context.tsx
└─ index.tsx
```
