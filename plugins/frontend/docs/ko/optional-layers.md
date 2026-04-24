# Optional Layers

이 문서는 선택 레이어 `widgets`, `features`, `entities`를 다룬다. 세 레이어는 각자 다른 책임을 가지지만, 도입 조건과 운영 규칙이 공통된 패턴을 따르므로 한 문서에서 함께 설명한다.

---

## 왜 선택인가

세 레이어는 **page에서 출발한 코드가 이동할 곳**이다. 처음부터 이 레이어들을 채우는 것은 page-first 원칙에 반한다. 아직 존재하지 않는 재사용을 예측해서 코드를 분산하면, 실제 사용이 발생했을 때 이미 굳은 인터페이스가 방해하게 된다.

세 레이어는 각각 독립적이다. 셋이 세트로 도입되어야 하는 것이 아니다 — `entities`만 도입하고 `features`·`widgets`는 두지 않아도 되고, `widgets`만 도입한 상태도 정상이다. 도입 시점은 **실제 반복이 2개 이상의 Slice에서 관측된 때**다.

---

## 공통 도입 조건

세 레이어 모두 다음 세 가지를 **모두** 만족할 때 도입을 검토한다. 하나라도 불충족이면 현재 범위에 남긴다. 조건의 배경은 [principles](principles.md)에서 다룬다.

**1. 2개 이상의 상위 Slice에서 실제로 사용하고 있다.** 레이어별 허용 상위는 다르다. `widgets`는 2개 이상 page, `features`는 2개 이상 page 또는 widget, `entities`는 2개 이상 page·widget·feature 중에서다. 상위 선택 레이어가 아직 도입되지 않았다면 그 항목은 조건에서 제외된다.

**2. 책임이 안정적이다.** 인터페이스(props, 파라미터, 반환 타입)가 최근 변경되었거나 변경 예정이면 이동하지 않는다.

**3. Slice 문맥과 독립적이다.** 특정 Slice의 상태·context에 결합되어 있으면 이동하지 않는다. 도메인 엔티티 타입을 직접 받거나 특정 Slice 상태를 참조하는 코드는 상위 Slice에 남긴다.

이 조건은 "확장의 조건"이 아니라 **"섣불리 확장하지 않기 위한 조건"**이다. 조건을 엄격히 하는 것이 이 아키텍처의 핵심 성격이다.

---

## 공통 운영 규칙

### Slice 구성

세 레이어는 모두 Slice 기반이다. [pages](pages.md)와 동일한 규칙을 따른다.

- Slice 이름은 kebab-case
- 단일 파일 Slice → 하위 종속이 생기면 폴더 + `index.tsx`로 승격
- Slice 외부에서는 entrypoint(`@[layer]/[slice]`)만 통해 접근
- Slice 내부에서 추출된 파일은 `_ui/`, `_hooks/`, `_context/`, `_lib/` 같은 private 폴더로 묶는다 (실제 추출이 발생한 뒤에 도입)
- Slice 내부 분해는 책임 수를 기준으로 (파일 길이가 아니다)

### cross-import 금지

같은 레이어의 sibling Slice 간 cross-import는 금지한다. widget-a가 widget-b를, feature-a가 feature-b를 직접 참조하지 않는다.

같은 레이어의 두 Slice가 공유를 원하면 **상위 레이어가 조합**한다. 두 widget이 연동되어야 하면 두 widget을 사용하는 page가 상태를 소유하고 props로 내려준다. 두 feature 간 의존이 필요하면 feature를 사용하는 쪽(widget, page)이 조합한다.

### import 깊이

widgets는 features와 entities를 모두 직접 import할 수 있다 — 계급 규칙상 둘 다 하위이므로 허용된다. "widget → feature → entity" 같은 단계적 경유를 강제하지 않는다. 깊이 제한을 두는 것은 코드를 인위적으로 복잡하게 만들 뿐이다.

조합이 복잡해지면 **widget 내부에서 분해**한다. widget이 여러 feature와 entity를 직접 조합하는 것이 자연스러우면 그대로 두고, 조합 로직이 무거워지면 widget 내부에서 컴포넌트로 나눈다.

---

## Widgets

### 책임

**독립적 복합 UI 블록.** 여러 page에서 반복되는 UI 조합(헤더, 사이드바, 상품 목록 섹션 등)을 캡슐화한다. 하위 레이어(`features`, `entities`, `shared`)를 조합해 완성된 UI를 제공한다.

### 도입 시점

동일한 복합 UI 블록이 **2개 이상 page에서 반복**될 때 도입한다. page가 widget 배치만으로 자연스럽게 구성될 정도로 자족적이어야 한다.

단일 컴포넌트를 감싸기만 하는 widget은 만들지 않는다. 하나의 버튼이나 하나의 카드를 감싸는 wrapper는 widget으로서의 가치가 없다 — 그 수준의 재사용은 `shared/ui`나 `entities`의 몫이다.

### Slice 이름

UI 블록의 역할을 나타내는 이름을 쓴다: `header`, `sidebar`, `product-list-section`.

### 사용 가능한 하위 레이어

`features`, `entities`, `shared`. 상위 레이어는 import 금지.

### 조합

widget끼리 연동이 필요한 상황은 widget을 이동시키는 신호가 아니라 **page가 조합하는 신호**다. sidebar가 header의 상태를 알아야 한다면 sidebar를 다른 곳으로 옮기는 것이 아니라, 두 widget을 사용하는 page가 상태를 소유하고 props로 내려준다.

---

## Features

### 책임

**사용자 인터랙션 캡슐화.** 인터랙션 UI와 그에 필요한 로직(상태, 검증, API 트리거)을 함께 소유한다. "무엇을 할 수 있게 하는가"가 feature의 단위다.

### 도입 시점

동일한 사용자 인터랙션이 **2개 이상 page 또는 widget에서 반복**될 때 도입한다. `widgets`가 아직 도입되지 않았다면 "2개 이상 page에서 반복"으로 조건이 축소된다.

인터랙션 로직과 UI가 함께 이동해야 의미가 있다. UI와 로직을 따로 나눠 두는 feature는 만들지 않는다. 모든 사용자 동작을 feature로 만들 필요도 없다 — 한 page 전용이면 그 page에 둔다.

### Slice 이름

동작을 나타내는 명사구를 쓴다: `add-to-cart`, `auth-form`, `product-search`.

### 사용 가능한 하위 레이어

`entities`, `shared`. 상위 레이어(`pages`, `widgets`)는 import 금지.

### 주의

API 정의는 여전히 [shared-api](shared-api.md)에 둔다. feature는 `[DOMAIN]_API`를 호출해서 API 트리거만 담당하고, API 스키마와 클라이언트는 소유하지 않는다. 이 경계가 깨지면 feature마다 API 정의가 중복되기 시작한다.

feature 간 의존이 필요한 상황(`add-to-cart`가 `auth` 상태를 확인해야 함 등)은 feature를 사용하는 쪽이 조합한다. auth 상태는 props로 주입하거나, 사용하는 쪽에서 gating한다.

---

## Entities

### 책임

**프론트엔드 도메인 표현.** 도메인 특화 UI, 표시 로직(label·color 매핑), 검증 스키마. "이 도메인을 화면에서 어떻게 보이게 하는가"가 entity의 단위다.

### 도입 시점

도메인 특화 UI(`ProductCard`, `UserAvatar`)나 표시 매핑이 **2개 이상 page·widget·feature 중에서** 반복될 때 도입한다. 도입되지 않은 상위 레이어는 조건에서 제외된다.

`shared/ui`에 도메인 컴포넌트를 두고 싶은 충동이 생기면, 그것이 entity가 자연스러운 시점이다. `shared/ui`는 business-agnostic을 지키고, 도메인 용어가 들어간 UI는 entity로 가는 것이 이 아키텍처의 기본 배치다.

### Slice 이름

도메인 명사를 쓴다: `product`, `user`, `order`.

### 사용 가능한 하위 레이어

`shared`만. 상위 레이어는 전부 import 금지.

### shared/api와의 관계

entities는 API를 소유하지 않는다. API 정의는 `shared/api`에 있고, entity는 그 타입과 상수를 import해서 프론트엔드 표현을 만든다.

| 관심사 | shared/api | entities |
|--------|-----------|----------|
| API 응답 타입 | O | X |
| API 호출 함수 | O | X |
| 도메인 UI | X | O |
| 표시 로직 (label/color) | X | O |
| 검증 스키마 | X | O |

원격 데이터 조회도 entity가 직접 하지 않는다. entity는 props로 데이터를 받고 렌더링과 표시 로직만 담당한다. 데이터 조회는 page·widget·feature가 한다.

### entity 간 조합

entity 간 조합이 필요한 상황(`Product`가 `User` 정보를 참조해야 함 등)은 entity를 사용하는 쪽(page, feature, widget)이 조합한다. entity 간 의존을 만들지 않는다. 이 원칙은 entity를 **도메인 표현의 원자 단위**로 유지한다.

---

## 정리

- 세 레이어는 선택이다. 각각 독립적으로 도입 가능하다.
- 도입 조건(실제 2+ 사용, 안정성, 문맥 독립성) 세 가지를 모두 만족할 때만 도입한다.
- Slice 구조·entrypoint·분해 규칙은 pages와 동일.
- 같은 레이어 Slice 간 cross-import 금지. 조합은 상위 레이어의 책임.
- widgets는 복합 UI 블록, features는 인터랙션 단위, entities는 도메인 표현.
- API는 어느 선택 레이어에도 두지 않는다. `shared/api`가 유일한 API 소유자.
- entity는 API를 소유하지 않는다. 데이터 조회도 하지 않는다. 표현만 담당한다.
