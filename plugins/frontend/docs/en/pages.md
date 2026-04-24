# Pages

This document covers the pages layer. It is where most code in the architecture lives, and the reason other layers exist lies mostly in the process of code starting in a page and outgrowing it.

---

## Why Pages Are the Center

Most frontend code exists **to be executed on some screen**. Server calls, state management, form validation, UI composition — they all ultimately run on a screen a user sees. If that is true, the default placement should be based on "which screen does this code belong to?".

Pages turn this criterion into a **physical module**. The state, hooks, components, and domain logic needed to render `/product/123` collect inside that page. Until it is confirmed that other screens actually use them, they stay there.

The shared layers (`widgets`, `features`, `entities`, `shared`) are what remains after code that started in a page **met a second use site and moved**. "Pages are the center" is not mere rhetoric — it is the rule that **determines how the rest of the layers are populated**.

---

## Pages and Slices

Each page is a Slice. The Slice name follows what the route represents.

| Route | Slice name |
|-------|-----------|
| `/` | `home` |
| `/products` | `products` |
| `/products/[id]` | `product-detail` |
| `/settings/profile` | `settings-profile` |

Slice names use kebab-case. Route folder nesting is **flattened** into the Slice name — `/settings/profile` is not `pages/settings/profile/`, but a single Slice `pages/settings-profile/`. Each nested route is its own Slice, so even parent-child routes like `settings` and `settings-profile` do not share internal modules with each other.

### Single file vs. folder

A Slice's shape is decided by **whether sub-dependencies exist**.

No sub-dependencies means a single-file Slice. The file itself is the entrypoint; the router imports this file's Named Export.

```txt
pages/
├─ home.tsx
├─ about.tsx
└─ product-detail.tsx
```

Once sub-dependencies appear, promote to a folder Slice. `index.tsx` is the entrypoint; the remaining files are internal to the Slice.

```txt
pages/
├─ home.tsx
└─ product-detail/
   ├─ product-info.tsx
   ├─ product-reviews.tsx
   ├─ use-product-detail.ts
   └─ index.tsx
```

Size or line count is not the promotion criterion. **Whether sub-dependencies have emerged** is the only one. A long file without sub-dependencies stays a file; a short Slice with sub-dependencies is a folder.

---

## Decomposing a Page

### When to decompose

Consider decomposition if any of the following holds.

- Two or more responsibilities mix JSX and logic.
- Unrelated states or flows coexist in one file.
- Naming starts colliding inside a single file.

File length is not a criterion. A 500-line file with one coherent responsibility can stay; a 100-line file mixing two unrelated flows should be split.

### Decomposition direction

First split into **larger components** that describe the Slice. Further split those larger units if needed. Depth itself is not a problem — as long as each level has a clear responsibility, it can keep going deeper.

```txt
product-detail/
├─ product-info/          ← larger unit needing internal split → folder
│  ├─ product-spec.tsx
│  ├─ product-price.tsx
│  └─ index.tsx
├─ product-reviews.tsx    ← larger unit without sub-dependencies → single file
└─ index.tsx              ← Slice entrypoint
```

### Private folders

When multiple extracted files appear inside a Slice, group them into private folders like `_ui/`, `_hooks/`, `_context/`, `_lib/`. The underscore marks "not accessed from outside the Slice."

**Do not create them upfront.** An empty `_ui/` created in advance and then filled with components is predictive structuring. Create private folders only after extraction has actually produced multiple files worth grouping.

```txt
product-detail/
├─ product-info.tsx
├─ product-reviews.tsx
├─ _ui/
│  ├─ filter-chip.tsx      ← shared by several sub-components
│  └─ summary-badge.tsx
├─ _hooks/
│  └─ use-filter-state.ts
└─ index.tsx
```

---

## Cross-Import and Movement

Direct imports from page-a into page-b's internal modules are forbidden. Cross-imports between Slices of the same layer are a signal that "a wider sharing scope is needed."

When two pages need the same code, the movement destination depends on the nature of the responsibility.

- Domain UI or display logic → `entities`
- User interaction unit → `features`
- Composite UI block → `widgets`
- Business-agnostic utility/hook/UI → `shared`

Movement requires all three conditions from the [principles](principles.md) document (actual use by 2+ Slices, responsibility stability, Slice-context independence). When conditions are not met, it is better to duplicate the same code briefly across two pages than to move prematurely. A rushed abstraction becomes a frozen interface that charges more cost later.

---

## Nested Routes

`/settings` and `/settings/profile` are each independent pages. They look parent-child in the URL, but that relationship is **not replicated** in the Slice structure.

- The `settings` page is `pages/settings.tsx` (or `pages/settings/index.tsx`)
- The `settings-profile` page is `pages/settings-profile.tsx` (or `pages/settings-profile/index.tsx`)

When shared code emerges between them, treat it as **two Slices of the same layer that need to share**. Do not reference internal modules directly; apply the movement conditions and either move the code to `entities` / `features` / `widgets` / `shared`, or keep the duplication.

URL nesting does not justify code nesting. URL is a routing concern; Slice structure is a code-ownership concern.

---

## Summary

- The pages layer is the center of the architecture. All code starts inside a page.
- Each route is an independent Slice, and Slice names are flattened kebab-case representations of routes.
- Without sub-dependencies, a single-file Slice; with them, a folder Slice. File length is not the criterion.
- Decomposition is judged by the number of independent responsibilities. `index.tsx` is the actual implementation file.
- Private folders are introduced after real extraction, never upfront.
- Each nested route is an independent Slice. Do not share internal modules directly.
