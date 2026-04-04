# Layer Guide

The role and relationship of each layer.

---

## Layer Hierarchy

```
app          Top-level. Assembler.
pages        Core. Screen-level modules.
widgets      (Optional) Composite UI blocks.
features     (Optional) User interaction units.
entities     (Optional) Domain representation.
shared       Bottom-level. Foundation tools.
```

Imports flow top-down only. Reverse direction is forbidden.

---

## app

The layer that assembles the application into a runnable form.

- Routing setup (route constants come from `shared/routes`)
- Global providers (theme, query client, auth, etc.)
- Global styles, global layout
- Route guards, initialization logic

Does not implement business logic. Its role is to assemble what other layers have built.

`main.tsx` is a boot file located outside app, at the `src/` root.

---

## pages

**The core layer of this architecture.**

Each page is a screen module corresponding to a single route. It is not a simple entry point — it directly owns its state, hooks, components, and domain logic.

```
pages/
├─ home.tsx                    # Simple page
└─ product-detail/             # Complex page
   ├─ product-info.tsx
   ├─ product-reviews.tsx
   ├─ use-product-detail.ts
   └─ index.tsx
```

### Decomposing a page

Start with the simplest form. A single file, or a folder with `index.tsx`.

As complexity grows, break it into large components, then decompose further as needed. Depth itself is not a problem. Judge decomposition by the number of independent responsibilities.

Private folders like `_ui/`, `_hooks/`, `_context/`, `_lib/` are not created upfront. Only group extracted files when several actually accumulate.

### Nested routes

`/settings` and `/settings/profile` are each independent pages. Even parent-child routes do not share internal modules directly.

---

## shared

The layer for foundational building blocks and tools. Sits at the bottom of the hierarchy and does not import from any other layer.

### Segment structure

Shared is organized by Segments (not Slices). Each Segment has a clear responsibility.

| Segment | Role |
|---------|------|
| `api/` | API clients, endpoint definitions. [Details](shared-api.md) |
| `ui/` | Business-agnostic UI components |
| `lib/` | Focused internal libraries (date, text, css, etc.) |
| `hooks/` | Infrastructure-level custom hooks |
| `config/` | Environment variables, feature flag values |
| `routes/` | Route path constants/patterns |
| `i18n/` | Translation setup, global strings |
| `query-factory/` | TanStack Query query factories. [Details](query-mutation.md) |
| `mutation-factory/` | TanStack Query mutation factories. [Details](query-mutation.md) |

### What goes in shared

- **Foundation modules** (in shared from the start): infrastructure (config, routes, i18n, api), design system / headless components
- **Moved modules** (start where used → move when shared): business-agnostic UI, generic hooks, generic libs

### shared/ui rules

shared/ui holds **business-agnostic components only**. Names containing domain terms (`ProductCard`, `OrderStatusBadge`) cannot go in shared/ui. Domain-specific UI belongs in `entities`.

---

## widgets (optional)

Large, independently operating UI blocks. Encapsulates composite UI (header, sidebar, product list sections, etc.) reused across multiple pages.

Can be introduced independently, without entities or features.

### When to introduce

When the same composite UI block actually repeats in 2+ pages.

If it's page-specific, keep it in the page. Don't create unnecessary wrappers around single components.

---

## features (optional)

Reusable units of user-facing functionality. Owns interaction UI together with its logic (state, validation, API trigger).

Can be introduced independently, without entities or widgets.

### When to introduce

When the same user interaction actually repeats in 2+ pages.

Don't turn every user action into a feature. If it's used in one page only, keep it there.

---

## entities (optional)

Frontend domain representation of business entities (User, Product, Order, etc.). Owns domain-specific UI and display logic.

Can be introduced independently, without features or widgets.

### When to introduce

- Domain-specific UI (`ProductCard`, `UserAvatar`) repeats in 2+ pages
- You feel the urge to put domain components in `shared/ui` → entities is the right place

### Relationship with shared/api

| Concern | shared/api | entities |
|---------|-----------|----------|
| API response types | O | X |
| API call functions | O | X |
| Domain UI | X | O |
| Display logic (label/color) | X | O |
| Validation schemas | X | O |

Entities do not own APIs. They focus on how the frontend represents data from the backend.
