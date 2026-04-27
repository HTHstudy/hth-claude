# Foundations

This document defines the vocabulary used in every subsequent document. Its scope is what a layer is, how Slice differs from Segment, and why imports are one-directional.

---

## Why Layers

Frontend code naturally grows over time. A file handling a single screen splits into several components; two screens come to share the same display logic; server calls appear in many places. Without rules, this growth leads to a state where **who-imports-whom becomes unpredictable**. A change can ripple anywhere, and extraction always feels either too early or too late.

Layers solve this through an **axis of responsibility**. Each layer has a distinct responsibility, and dependencies flow in one direction. Within a single layer, a second division keeps different business areas from mixing. The result: the question "where does this code belong?" always has an answer by the same criteria.

---

## Layers

The architecture consists of six layers.

| Layer | Role |
|-------|------|
| `app` | Assembles the application into a runnable form. Routing setup, global providers, global styles, and initialization logic live here. |
| `pages` | Screen modules corresponding to each route. Directly own state, hooks, components, and domain logic. |
| `widgets` (optional) | Independent composite UI blocks reused across multiple pages. |
| `features` (optional) | User interaction units reused across multiple pages. Own UI and its logic (state, validation, API trigger) together. |
| `entities` (optional) | Frontend domain representation. Domain-specific UI, display logic (label/color mapping), validation. Do not own APIs. |
| `shared` | Foundational tools and values used by the app. Only business-agnostic code. |

`widgets`, `features`, and `entities` are **optional**. A project starts with `app / pages / shared` and introduces each optional layer only after real repetition occurs. They are mutually independent, so any subset of the three can exist.

`main.tsx` is not a layer. It is the boot file that mounts the app into the DOM and lives at the `src/` root, outside `app/`.

```txt
src/
├─ main.tsx        ← outside app, boot only
├─ app/
├─ pages/
├─ widgets/        ← if needed
├─ features/       ← if needed
├─ entities/       ← if needed
└─ shared/
```

---

## Hierarchy and Direction

Layers are **ranked**. Top to bottom: `app` is the highest, `shared` is the lowest.

```txt
app → pages → (widgets → features → entities →) shared
```

**Dependencies flow only in this direction.** An upper layer may import from a lower layer; a lower layer cannot reference an upper one. `shared` imports from no other layer. `app` may import from any layer.

Optional layers enter the chain only when introduced. If `widgets` is not introduced, `features` is referenced directly from `pages`. The introduced chain preserves the order above.

This direction rule is the backbone of the architecture. The guarantee that no code references something above its layer is what keeps change-impact flowing downward only.

---

## Slice

Inside a layer, one more division prevents codes from mixing. **A Slice is a business-domain unit inside the `pages`, `widgets`, `features`, or `entities` layer.**

In pages, each route becomes a Slice. Names like `home`, `product-detail`, `settings-profile`. In widgets, UI blocks like `header`, `sidebar` are Slices. In features, interaction units like `add-to-cart`, `auth-form`. In entities, domain nouns like `product`, `user`, `order`.

A Slice is a **self-sufficient module**. It directly owns its state, hooks, components, and logic. Simple cases use a single file; once sub-dependencies appear, it is promoted to a folder with `index.tsx`.

```txt
pages/
├─ home.tsx                    ← single-file Slice (no sub-dependencies)
└─ product-detail/             ← folder Slice (has sub-dependencies)
   ├─ product-info.tsx
   ├─ product-reviews.tsx
   ├─ use-product-detail.ts
   └─ index.tsx
```

### Meaning of Slice boundaries

Slice gains meaning alongside the rule "the same layer's other Slices cannot be referenced." page-a does not import page-b's internal modules; feature-a does not reference feature-b. This constraint keeps each Slice as an independent unit — a change inside one Slice does not leak into other Slices of the same layer.

The moment two Slices in the same layer want to share code is a **signal that a wider sharing scope is needed**. If two pages share the same domain UI, consider `entities`; the same interaction, `features`; the same composite UI block, `widgets`.

### Slice context

**Slice context** is the Slice's own state, context, and domain meaning. Code that internally references a particular Slice's state, or requires a particular Slice's domain type, is coupled to Slice context. Such code does not leave its Slice. The term appears repeatedly in extraction and movement rules.

### Layers without Slices

`app` and `shared` do not have Slices. `app` is a single concern (assembling the runtime), and `shared` has no business domain, so there is no criterion to split into Slices.

---

## Segment

`shared` is organized by **Segments** instead of Slices. A Segment is a responsibility-based sub-folder inside shared.

```txt
shared/
├─ api/               ← backend communication
├─ ui/                ← business-agnostic UI components
├─ lib/               ← topic-focused internal libraries (date, text, css, etc.)
├─ hooks/             ← infrastructure-level custom hooks
├─ config/            ← environment variables, feature flags
├─ routes/            ← route path constants
├─ i18n/              ← translation setup
├─ assets/            ← static resources (images, fonts, etc.)
├─ query-factory/     ← TanStack Query query factories (if TanStack Query is used)
└─ mutation-factory/  ← TanStack Query mutation factories (if TanStack Query is used)
```

A Segment's name must clearly indicate **what that folder does**. Vague names like `components`, `types` that reveal nothing about content are not used. New Segments may be added when needed, and not every Segment is required.

`shared` has no business Slice boundaries, but **it does have responsibility boundaries**. Segments have a dependency direction too — covered in the [shared](shared.md) document.

---

## Import Rules

The hierarchy, Slices, and Segments combine into import rules.

**Layer direction.** Code inside a Slice may only import from the Slice of a layer below its own. It does not reference the same layer or a higher one.

**No same-layer cross-import.** A Slice cannot import another Slice of the same layer. When sharing is needed, extract to a wider scope.

---

## Boundaries and Access

### Entrypoint

**Code outside a Slice does not directly import the Slice's internal files.** Access goes through the Slice's entrypoint. "Entrypoint" is not a specific file name — it is the **concept of "the single public access point"**, realized in different shapes depending on the Slice's form.

- **Single-file Slice** — the file itself is the entrypoint (`pages/home.tsx`).
- **Folder Slice** — the `index.*` inside the folder is the entrypoint (`pages/product-detail/index.tsx`).

Folder entrypoints fall into two shapes by purpose.

**Composition form (`index.tsx`)** — composes sub-components into a complete screen unit. Not used as a thin re-export wrapper.

```tsx
// ❌ product-detail/index.tsx — thin re-export wrapper
export { ProductDetailPage } from './product-detail-page';
```

```tsx
// ✓ product-detail/index.tsx — actual implementation with composition
export function ProductDetailPage() {
  return (
    <>
      <ProductInfo />
      <ProductReviews />
    </>
  );
}
```

**Barrel form (`index.ts`)** — exposes modules that contain no JSX (API objects, types, factory functions, etc.) in an organized way. The canonical example is `shared/api/[domain]/index.ts` — endpoint functions are grouped into a `[DOMAIN]_API` object and needed types are re-exported.

```ts
// ✓ shared/api/product/index.ts — barrel
import { getProductList } from './endpoints/get-product-list';
import { createProduct } from './endpoints/create-product';

export const PRODUCT_API = { getProductList, createProduct };
export type { ProductItem } from './model';
```

### Private folders

When multiple extracted files appear inside a Slice, group them into **private folders** like `_ui/`, `_hooks/`, `_context/`, `_lib/`. The underscore marks "not accessed from outside the Slice." Private folders are not created upfront — they appear only after actual extraction produces files worth grouping.

### Path alias

Imports between layers go through path aliases only. Relative paths (`../`) are allowed only inside the same layer.

```txt
@app/*        @pages/*        @widgets/*
@features/*   @entities/*     @shared/*
```

A blanket alias that covers all source (`@/*`, etc.) is not used. A blanket alias makes the direction rule unverifiable by static analysis.

---

## Summary

The vocabulary defined here is reused in every subsequent document.

- **Layer** — 6 total. `app / pages / (widgets / features / entities) / shared`
- **Hierarchy** — top to bottom. Imports allowed only from upper → lower
- **Slice** — a business-domain unit inside a layer. A self-sufficient module
- **Slice context** — the Slice's own state, context, domain meaning
- **Segment** — responsibility unit inside shared
- **Entrypoint** — the only path for accessing a Slice from outside

On top of this vocabulary, the question "where does code belong?" is taken up by the [principles](principles.md) document.
