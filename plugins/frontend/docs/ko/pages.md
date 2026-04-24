# Pages

이 문서는 pages 레이어를 다룬다. 이 아키텍처에서 가장 많은 코드가 쓰이는 곳이며, 다른 레이어의 존재 이유는 대부분 page에서 출발한 코드가 자라는 과정에 있다.

---

## 왜 pages가 중심인가

대부분의 프론트엔드 코드는 **어떤 화면에서든 실행되기 위해** 존재한다. 서버 호출도, 상태 관리도, 폼 검증도, UI 조합도 궁극적으로는 사용자가 보는 화면에서 쓰인다. 그렇다면 코드의 기본 배치도 "이 코드는 어느 화면에 속하는가"를 기준으로 삼는 게 자연스럽다.

Page는 이 기준을 **물리적 모듈**로 만든다. `/product/123`을 보여주는 화면이 필요한 상태·훅·컴포넌트·도메인 로직은 그 page 안에 모인다. 다른 화면에서 쓰일 가능성이 실제로 확인되기 전까지는 그 자리에 남는다.

공통 레이어(`widgets`, `features`, `entities`, `shared`)는 page에서 출발한 코드가 **두 번째 사용처를 만나** 이동한 결과다. page가 중심이라는 말은 단순히 "page가 중요하다"는 수사가 아니라, **나머지 레이어를 채우는 방향**을 정하는 규칙이다.

---

## Page와 Slice

각 page는 하나의 Slice다. Slice 이름은 route가 나타내는 의미에 따른다.

| Route | Slice 이름 |
|-------|-----------|
| `/` | `home` |
| `/products` | `products` |
| `/products/[id]` | `product-detail` |
| `/settings/profile` | `settings-profile` |

Slice 이름은 kebab-case로 쓴다. route 폴더 중첩은 Slice 이름에 **평면화**된다 — `/settings/profile`은 `pages/settings/profile/` 같은 중첩 폴더가 아니라 `pages/settings-profile/`이라는 단일 Slice다. 중첩 라우트는 각각 독립된 Slice이므로, `settings`와 `settings-profile`은 부모-자식 관계처럼 보여도 서로의 내부 모듈을 참조하지 않는다.

### 단일 파일 vs 폴더

Slice의 형태는 **하위 종속의 유무**로 결정한다.

하위 종속이 없으면 단일 파일 Slice다. 파일 자체가 entrypoint이고, 라우터는 이 파일의 Named Export를 가져간다.

```txt
pages/
├─ home.tsx
├─ about.tsx
└─ product-detail.tsx
```

하위 종속이 생기면 폴더 Slice로 승격한다. `index.tsx`가 entrypoint이고, 나머지 파일은 이 Slice 내부 전용이다.

```txt
pages/
├─ home.tsx
└─ product-detail/
   ├─ product-info.tsx
   ├─ product-reviews.tsx
   ├─ use-product-detail.ts
   └─ index.tsx
```

파일의 크기나 줄 수는 승격 기준이 아니다. **하위 종속이 실제로 생겼는가**가 유일한 기준이다. 길이가 길다고 미리 폴더로 쪼개지 않고, 짧아도 하위 종속이 있으면 폴더다.

---

## Page 내부 분해

### 분해 시점

다음 중 하나라도 해당하면 분해를 검토한다.

- JSX와 로직 책임이 2개 이상 섞여 있다.
- 한 파일 안에서 서로 무관한 상태나 흐름이 공존한다.
- 같은 파일 안에서 이름이 서로 충돌하기 시작한다.

파일 길이는 기준이 아니다. 500줄이라도 하나의 응집된 책임이면 유지하고, 100줄이라도 무관한 두 흐름이 섞였으면 나눈다.

### 분해 방향

Slice를 설명하기 위한 **큰 단위 컴포넌트**로 먼저 나눈다. 그 큰 단위도 필요하면 내부에서 다시 분해한다. 깊이는 문제 자체가 아니다 — 각 단계에서 책임이 명확하면 계속 내려가도 괜찮다.

```txt
product-detail/
├─ product-info/          ← 하위 분해가 필요한 큰 단위 → 폴더
│  ├─ product-spec.tsx
│  ├─ product-price.tsx
│  └─ index.tsx
├─ product-reviews.tsx    ← 하위 종속 없는 큰 단위 → 단일 파일
└─ index.tsx              ← Slice entrypoint
```

### Private 폴더

Slice 내부에서 추출된 파일이 여러 개 생기면 `_ui/`, `_hooks/`, `_context/`, `_lib/` 같은 private 폴더로 묶는다. 언더스코어는 "Slice 외부에서 접근하지 않는다"는 표식이다.

**처음부터 만들지 않는다.** 빈 `_ui/` 폴더를 미리 만들고 그 안에 컴포넌트를 넣는 것은 예측 구조화다. 실제로 Slice 내부에서 여러 개가 추출되어 묶을 가치가 생긴 뒤에 도입한다.

```txt
product-detail/
├─ product-info.tsx
├─ product-reviews.tsx
├─ _ui/
│  ├─ filter-chip.tsx      ← 여러 하위 컴포넌트가 공유
│  └─ summary-badge.tsx
├─ _hooks/
│  └─ use-filter-state.ts
└─ index.tsx
```

---

## cross-import와 이동

page-a가 page-b의 내부 모듈을 직접 import하는 것은 금지된다. 같은 레이어 Slice 간 cross-import는 "더 넓은 공유 범위로 이동해야 할 시점"을 알리는 신호다.

두 page가 같은 코드를 필요로 할 때, 책임의 성격에 따라 이동 대상이 달라진다.

- 도메인 UI나 표시 로직 → `entities`
- 사용자 인터랙션 단위 → `features`
- 복합 UI 블록 → `widgets`
- business-agnostic 유틸·훅·UI → `shared`

이동 조건은 [principles](principles.md) 문서의 세 가지 규칙(2개 이상 실제 사용, 책임 안정성, Slice 문맥 독립성)을 모두 만족해야 한다. 조건을 만족하지 않으면 두 page에서 같은 코드를 잠시 중복해 두는 것이 이동보다 낫다. 성급한 추상화는 곧 굳는 인터페이스가 되어 나중에 더 큰 비용을 만든다.

---

## nested route

`/settings`와 `/settings/profile`은 각각 독립된 page다. URL에서는 부모-자식처럼 보이지만, 이 관계는 Slice 구조에 복제되지 않는다.

- `settings` page는 `pages/settings.tsx`(또는 `pages/settings/index.tsx`)
- `settings-profile` page는 `pages/settings-profile.tsx`(또는 `pages/settings-profile/index.tsx`)

두 page 간에 공통 코드가 생기면 **같은 레이어 Slice 간 공유가 필요한 상황**으로 취급한다. 내부 모듈을 직접 참조하지 않고, 이동 조건을 따져 `entities`·`features`·`widgets`·`shared` 중 하나로 이동하거나 중복을 유지한다.

URL 중첩이 코드 중첩을 정당화하지 않는다. URL은 라우팅의 문제이고, Slice 구조는 코드 소유의 문제다.

---

## 정리

- pages 레이어는 아키텍처의 중심이다. 모든 코드는 page 안에서 시작한다.
- 각 route는 독립된 Slice이며, Slice 이름은 route를 나타내는 kebab-case로 평면화한다.
- 하위 종속이 없으면 단일 파일 Slice, 있으면 폴더 Slice. 파일 길이는 기준이 아니다.
- 분해는 독립적 책임의 수를 기준으로. `index.tsx`는 실제 구현 파일이다.
- private 폴더는 실제 추출이 생긴 뒤에 도입한다.
- nested route는 각각 독립된 Slice. 내부 모듈을 직접 공유하지 않는다.
