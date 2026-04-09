# 확장 가이드

`app / pages / shared`에서 시작하여 `widgets / features / entities`를 도입하는 과정을 설명합니다.

---

## 확장 원칙

- 3개를 한꺼번에 도입하지 않습니다. 필요한 레이어만 하나씩 도입합니다.
- 각 레이어는 독립적으로 도입할 수 있습니다. entities 없이 features만, features 없이 widgets만 가능합니다.
- 각 확장 레이어는 **page에서 추출된 코드의 도착지**입니다.

---

## 확장 경로

```
Stage 0: app / pages / shared
  page가 모든 것을 소유합니다.
  도메인 UI, 표시 로직, 인터랙션, 상태 모두 page 내부.

Stage 1: entities 도입
  ProductCard, UserAvatar 등 도메인 특화 UI가 여러 page에서 반복될 때.
  표시 매핑(label/color)도 함께 이동합니다.

Stage 2: features 도입
  AddToCartButton + useAddToCart 등 인터랙션 단위가 여러 page에서 반복될 때.

Stage 3: widgets 도입
  헤더, 사이드바, 상품 목록 섹션 등 복합 블록이 여러 page에서 반복될 때.
```

각 Stage는 순서가 아니라 필요에 따른 독립적 선택입니다.

---

## entities 도입

### 도입 시점

- 도메인 특화 UI(`ProductCard`, `UserAvatar`)가 2개 이상의 page에서 반복
- 프론트엔드 고유의 도메인 로직(표시 매핑, 검증)이 page마다 중복
- `shared/ui`에 도메인 컴포넌트를 두고 싶은 충동이 생김

### Slice 예시

```
entities/
└─ product/
   ├─ product-card.tsx
   ├─ product-status-badge.tsx
   ├─ display.ts               # PRODUCT_STATUS_LABEL, COLOR 등
   └─ index.ts
```

### shared/api와의 관계

entities는 API를 소유하지 않습니다. `shared/api`의 타입을 import하여 프론트엔드 표현을 만듭니다.

```ts
// entities/product/display.ts
import type { ProductStatus } from '@shared/api/product';
import { PRODUCT_STATUS } from '@shared/api/product';

export const PRODUCT_STATUS_LABEL: Record<ProductStatus, string> = {
  [PRODUCT_STATUS.ACTIVE]: '판매중',
  [PRODUCT_STATUS.SOLD_OUT]: '품절',
  [PRODUCT_STATUS.HIDDEN]: '숨김',
};
```

shared/api 타입을 강제로 re-export하지 않습니다. 소비자는 타입이 정의된 곳에서 직접 import합니다.

### cross-import가 필요할 때

entity 간 조합이 필요하면(예: Product가 User를 참조), 해당 entity를 사용하는 쪽(feature, widget, page)에서 조합합니다. entity 간 의존을 만들지 않습니다.

---

## features 도입

### 도입 시점

- 동일한 사용자 인터랙션이 2개 이상의 page에서 반복
- 인터랙션이 page 문맥과 무관하게 독립적으로 동작
- 인터랙션 로직(상태, 검증, API 트리거)과 UI가 함께 이동해야 함

### Slice 예시

```
features/
└─ add-to-cart/
   ├─ add-to-cart-button.tsx
   ├─ use-add-to-cart.ts
   └─ index.tsx
```

### cross-import가 필요할 때

feature 간 의존이 필요하면(예: add-to-cart가 auth 상태 확인), feature를 사용하는 쪽(widget, page)에서 조합합니다. auth 상태는 props로 주입하거나, 사용하는 쪽에서 gating합니다.

---

## widgets 도입

### 도입 시점

- 동일한 복합 UI 블록이 2개 이상의 page에서 반복
- 해당 블록이 page 문맥 없이 독립적으로 동작
- page가 widget 배치만으로 구성될 수 있을 정도로 자족적

### Slice 예시

```
widgets/
└─ product-list-section/
   ├─ product-list-item.tsx
   ├─ use-product-list.ts
   └─ index.tsx
```

### cross-import가 필요할 때

widget 간 연동이 필요하면(예: header에서 sidebar 토글), widget을 사용하는 page가 상태를 소유하고 props로 내려줍니다.

```tsx
// page에서 조합
const [sidebarOpen, setSidebarOpen] = useState(false);

<Header onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
<Sidebar open={sidebarOpen} />
```

widget 자체를 이동하거나 widget 간 의존을 만들지 않습니다.

---

## 공통 규칙

모든 확장 레이어에 동일하게 적용되는 규칙:

- **Slice 네이밍**: kebab-case 사용. 도메인 명사로 작명한다 (`product`, `add-to-cart`, `product-list-section`).
- **Slice 내부 분해**: page와 같은 규칙. 미리 정해진 폴더 구조 없이 필요에 따라 분해.
- **공개 인터페이스**: 외부는 `@[layer]/[slice]` entrypoint만 통해 접근. 내부 파일 직접 import 금지.
- **같은 레이어 cross-import 금지**: cross-import가 필요한 순간이 이동할 시점.
- **import 깊이 제한 없음**: Widget은 Feature와 Entity를 모두 직접 import할 수 있습니다(계층 규칙상 허용). 조합이 복잡해지면 Widget 내부에서 분해합니다.
- **ESLint 강제**: `@[layer]/*/*` 패턴으로 내부 접근 차단.

```js
"no-restricted-imports": ["error", {
  patterns: [
    { group: ["@pages/*/*"], message: "..." },
    { group: ["@widgets/*/*"], message: "..." },
    { group: ["@features/*/*"], message: "..." },
    { group: ["@entities/*/*"], message: "..." },
  ],
}]
```
