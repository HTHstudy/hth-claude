# 선택 레이어: Widgets / Features / Entities

> 3개 레이어의 공통 패턴과 각 레이어별 고유 규칙이다.

---

## 공통 패턴

### 도입 원칙
- 선택 레이어는 필요할 때만 도입한다. 3개를 한꺼번에 도입하지 않는다.
- 각 레이어는 단독으로 도입할 수 있다. (entities 없이 features만, widgets만 등)
- 모든 코드는 **page에서 시작**한다. 재사용이 실제로 발생하면 적절한 레이어로 추출한다.

### 도입 조건
다음 조건을 **모두** 만족할 때 도입한다:

1. **2개 이상의 상위 Slice에서 실제 사용** — 레이어별 허용 상위는 [SKILL.md 레이어 계급 표](../SKILL.md) 참조. 상위 optional 레이어가 미도입이면 해당 항목은 조건에서 제외된다 (예: widgets 미도입 시 features 조건은 "2개 이상 page"로 축소).
2. **책임 안정성** — 인터페이스가 최근 변경되었거나 변경 예정이면 이동하지 않는다.
3. **문맥 독립성** — 특정 Slice 상태·context에 결합되지 않아야 한다.

상세 추출 규칙은 [slice.md §3](../rules/slice.md). 원칙: 가장 가까운 공통 범위로 먼저 추출. 레이어별 고유 시점은 아래 각 섹션 참조.

### Slice 구조
공통 Slice 규칙(entrypoint, 네이밍, 분해, 추출)을 따른다 — [slice.md](../rules/slice.md).

### cross-import
같은 레이어 sibling 간 cross-import 금지. 조합이 필요하면 사용하는 쪽(상위 레이어)에서 조합한다.

### import 깊이
Widget은 Feature와 Entity를 모두 직접 import할 수 있다 (계층 규칙상 허용). 깊이 제한은 두지 않는다. 조합이 복잡해지면 Widget 내부에서 분해한다 — [slice.md](../rules/slice.md)의 분해 규칙을 따른다.

---

## Widgets

**목적:** 독립적 복합 UI 블록 — 하위 레이어를 조합하여 완성된 UI 제공.

**import 가능:** `features`, `entities`, `shared`. 상위 레이어 금지.

**Slice 이름:** UI 블록 역할 — `header`, `sidebar`, `product-list-section`

**도입 시점:**
- 동일한 복합 UI 블록이 **2개 이상 page**에서 반복
- page가 widget 배치만으로 구성될 수 있을 정도로 자족적일 때

**주의:**
- 단일 컴포넌트를 감싸기만 하는 불필요한 widget을 만들지 않는다.
- widget 간 연동이 필요하면 page가 상태를 소유하고 props로 내려준다.

---

## Features

**목적:** 사용자 인터랙션 캡슐화 — 인터랙션 UI와 로직(상태, 검증, API 트리거)을 함께 소유.

**import 가능:** `entities`, `shared`. 상위 레이어 금지.

**Slice 이름:** 동작 명사구 — `add-to-cart`, `auth-form`, `product-search`

**도입 시점:**
- 동일한 인터랙션이 **2개 이상 page 또는 widget**에서 반복 (widgets 미도입 시: 2개 이상 page)
- 인터랙션 로직과 UI가 함께 이동해야 할 때

**주의:**
- 단순 데이터 표시 UI는 features에 두지 않는다.
- API 정의는 `shared/api`에 둔다.
- feature 간 의존이 필요하면 사용하는 쪽에서 조합한다.

---

## Entities

**목적:** 프론트엔드 도메인 표현 — 도메인 특화 UI, 표시 로직(label/color 매핑), 검증.

**import 가능:** `shared`만. 상위 레이어 금지.

**Slice 이름:** 도메인 명사 — `product`, `user`, `order`

**도입 시점:**
- 도메인 UI(`ProductCard`, `UserAvatar`)가 **2개 이상 page, widget, feature 중에서** 반복 (미도입 레이어는 조건에서 제외)

**주의:**
- API 정의는 `shared/api`에 둔다. entities는 API를 소유하지 않는다.
- 원격 데이터 조회를 직접 하지 않는다. props로 주입받는다.
- entity 간 조합이 필요하면 사용하는 쪽(page, feature, widget)에서 조합한다.

| 관심사 | shared/api | entities |
|--------|-----------|----------|
| API 응답 타입 / 호출 함수 / query·mutation | O | X |
| 도메인 UI / 표시 로직 / 검증 | X | O |
