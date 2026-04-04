# Expansion Guide

How to go from `app / pages / shared` to introducing `widgets / features / entities`.

---

## Expansion Principles

- Don't introduce all three at once. Add only the layer you need, one at a time.
- Each layer can be introduced independently. Entities without features, widgets without features — all valid.
- Each expansion layer is **a destination for code extracted from pages**.

---

## Expansion Path

```
Stage 0: app / pages / shared
  Pages own everything.
  Domain UI, display logic, interactions, state — all inside pages.

Stage 1: entities
  When ProductCard, UserAvatar, etc. repeat across pages.
  Display mappings (label/color) move along with the UI.

Stage 2: features
  When AddToCartButton + useAddToCart, etc. repeat across pages.

Stage 3: widgets
  When header, sidebar, product list sections, etc. repeat across pages.
```

Each stage is an independent choice based on need, not a sequential order.

---

## Introducing entities

### When

- Domain-specific UI (`ProductCard`, `UserAvatar`) repeats in 2+ pages
- Frontend-specific domain logic (display mapping, validation) duplicates across pages
- You feel the urge to put domain components in `shared/ui`

### Slice example

```
entities/
└─ product/
   ├─ product-card.tsx
   ├─ product-status-badge.tsx
   ├─ display.ts               # PRODUCT_STATUS_LABEL, COLOR, etc.
   └─ index.ts
```

### Relationship with shared/api

Entities do not own APIs. They import types from `shared/api` and build frontend representations.

```ts
// entities/product/display.ts
import type { ProductStatus } from '@shared/api/product';
import { PRODUCT_STATUS } from '@shared/api/product';

export const PRODUCT_STATUS_LABEL: Record<ProductStatus, string> = {
  [PRODUCT_STATUS.ACTIVE]: 'Active',
  [PRODUCT_STATUS.SOLD_OUT]: 'Sold Out',
  [PRODUCT_STATUS.HIDDEN]: 'Hidden',
};
```

Don't force re-export of shared/api types. Consumers import types directly from where they are defined.

### When cross-import is needed

When entities need to reference each other (e.g., Product referencing User), the layer that uses both entities handles the composition. Don't create dependencies between entities.

---

## Introducing features

### When

- The same user interaction repeats in 2+ pages
- The interaction works independently of page context
- Interaction logic (state, validation, API trigger) and UI need to move together

### Slice example

```
features/
└─ add-to-cart/
   ├─ add-to-cart-button.tsx
   ├─ use-add-to-cart.ts
   └─ index.tsx
```

### When cross-import is needed

When features need to depend on each other (e.g., add-to-cart needing auth state), the consumer (widget or page) composes them. Auth state is injected via props or gated at the consumer level.

---

## Introducing widgets

### When

- The same composite UI block repeats in 2+ pages
- The block operates independently of page context
- Pages can be composed primarily by arranging widgets

### Slice example

```
widgets/
└─ product-list-section/
   ├─ product-list-item.tsx
   ├─ use-product-list.ts
   └─ index.tsx
```

### When cross-import is needed

When widgets need to interact (e.g., header toggling sidebar), the page owns the state and passes it via props.

```tsx
// Page composes the widgets
const [sidebarOpen, setSidebarOpen] = useState(false);

<Header onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
<Sidebar open={sidebarOpen} />
```

Don't move the widget or create dependencies between widgets.

---

## Common Rules

Rules that apply equally to all expansion layers:

- **Slice naming**: Use kebab-case. Name after domain nouns (`product`, `add-to-cart`, `product-list-section`).
- **Slice decomposition**: Same rules as pages. No predefined folder structure — decompose as needed.
- **Public interface**: External access only through `@[layer]/[slice]` entrypoint. Direct import of internal files is forbidden.
- **Same-layer cross-import ban**: When cross-import is needed, that's the signal to move to a wider scope.
- **ESLint enforcement**: `@[layer]/*/*` pattern blocks internal access.

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
