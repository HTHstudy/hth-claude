# Shared

This document covers the shared layer. Shared sits at the bottom and collects the foundational tools and values the app depends on.

---

## Why Shared Exists

Even when following the page-first principle, not all code can stay inside pages. Two kinds of exceptions exist.

**One is infrastructure that must exist before any page can work.** Environment values, route path constants, API clients, translation setup — pages call these, so they have to exist before pages do. Such infrastructure lives in shared from the start.

**The other is code that moves into shared over time.** A generic hook written inside one page starts being used by a second page; once the responsibility is stable and independent of Slice context, it moves to shared. Here, shared is the **final stage of movement**. Extract to a close common scope first, and move to shared only when wider sharing is actually required.

Shared is the reservoir where these two paths meet. Code that descended from above and code placed at the bottom from the start coexist in the same space.

---

## Segments Instead of Slices

Shared has no business domain, so **it is divided by Segments, not Slices**. A Segment is a responsibility-based sub-folder.

```txt
shared/
├─ api/
├─ ui/
├─ lib/
├─ hooks/
├─ config/
├─ routes/
├─ i18n/
├─ assets/
├─ query-factory/
└─ mutation-factory/
```

| Segment | Responsibility |
|---------|---------------|
| `api/` | Backend communication. API clients and endpoint definitions. Here, "domain" is not a business unit but a **transport-area unit** (baseURL + common processing). Details in the [shared-api](shared-api.md) document |
| `ui/` | Common UI components. Business-agnostic. Brand theming allowed |
| `lib/` | Topic-focused internal libraries. Each sub-folder is a single topic (date, text, css). Not a bag of miscellaneous utils |
| `hooks/` | Infrastructure-level custom hooks. Only generic hooks unbound to any Slice's state |
| `config/` | **Definitions** of environment variables and feature flag values. Initialization using these is owned by `app` |
| `routes/` | **Definitions** of route path constants and patterns. Router setup and route-page connections are owned by `app` |
| `i18n/` | Translation setup, global strings |
| `assets/` | Static resources (images, fonts, etc.) |
| `query-factory/` | TanStack Query query factories. Details in the [query-mutation](query-mutation.md) document |
| `mutation-factory/` | TanStack Query mutation factories. Details in the [query-mutation](query-mutation.md) document |

Not every Segment is required — create only when needed. A Segment's name must clearly state **what the folder does**. Vague names like `components`, `types`, `utils` are not used. New Segments may be added when they represent a clear responsibility.

---

## What Goes in Shared from the Start

As exceptions to the page-first principle, the following are placed in shared from the start rather than beginning inside pages.

- **Foundational infrastructure**: `config`, `routes`, `i18n`, `api` — the basis on which the application runs
- **Static resources**: `assets`
- **Design system / headless components**: the UI foundation adopted by the project (lives in `shared/ui`)
- **TanStack Query factories**: `query-factory`, `mutation-factory` (only when the project uses TanStack Query)

These are things pages call or consume. They are meaningful only if they exist before pages, so they are the exceptions.

Everything else starts in a Slice and moves to shared after conditions are met.

---

## Conditions for Moving to Shared

Code that originated in a Slice must satisfy all three conditions before it moves to shared.

**1. Two or more Slices already use it.** Shared is the lowest, so any combination of upper-layer Slices counts (pages 1 + features 1 is acceptable). It must be actual use, not prediction.

**2. Responsibility is stable.** If the interface changed recently or is about to change, do not move.

**3. Context-independent.** Components that take a domain entity type directly as a prop, or internally reference a specific layer's state, do not belong in shared. It must work through generic props and interfaces alone.

If the conditions are not met, keep it in the current scope. Duplicating across two Slices is better than premature movement.

---

## ui Segment

`shared/ui` holds **only business-agnostic components**. Rendering must complete through generic props alone. Brand theming is allowed, but no domain knowledge.

Allowed:
- Generic UI like Button, Input, Modal
- Components that carry **UI self-logic** — Logo, Layout, SearchInput (local state and display logic only). Remote data fetching is owned by an upper layer and injected through props.

Not allowed:
- Names with domain vocabulary like `ProductCard`, `OrderStatusBadge`, `UserProfileCard`
- Components that depend on a specific Slice's context, hook, or type
- Components that take domain entity types directly as props
- Components that import `shared/api` — `ui` does not depend on `api`

When domain-specific UI is needed, place it inside `pages` or an extension layer (`widgets`, `features`, `entities`). Wrapping a generic `shared/ui` component to apply domain requirements is the upper layer's responsibility.

The boundary shows up most clearly in the props signature.

```ts
// ✓ shared/ui/button.tsx — generic props only
type ButtonProps = {
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  children: React.ReactNode;
};
```

```ts
// ❌ shared/ui/product-card.tsx — coupled to a domain type
import type { ProductItem } from '@shared/api/product';

type ProductCardProps = {
  product: ProductItem;              // accepts a shared/api type directly
  onAddToCart: (id: string) => void; // domain-specific action
};
```

A component like the second one belongs in `entities/product/product-card.tsx`.

### Folder when sub-dependencies exist

A single-file component stays a file; once sub-dependencies appear, it is promoted to a folder + `index.tsx`. Same rule as page Slice promotion.

```txt
shared/ui/
├─ button.tsx
└─ modal/
   ├─ modal-overlay.tsx
   ├─ modal-content.tsx
   └─ index.tsx
```

---

## lib Segment

`shared/lib` is **not a utility dump**. Each sub-folder is an **internal library** focused on a single topic.

```txt
# Correct — topic-cohesive
shared/lib/
├─ date/
│  ├─ format.ts
│  ├─ parse.ts
│  └─ index.ts
├─ text/
│  ├─ truncate.ts
│  └─ index.ts
└─ css/
   ├─ cn.ts
   └─ index.ts
```

```txt
# Avoid — an undifferentiated pile of utils
shared/lib/
├─ format-date.ts
├─ cn.ts
├─ truncate-text.ts
├─ parse-query-string.ts
└─ deep-merge.ts
```

Topic-based folders make each library's scope explicit and keep related functions together. Code that does not fit any topic naturally gets filtered out. A README inside each lib sub-folder, noting role and scope, is recommended.

---

## hooks Segment

`shared/hooks` holds only **infrastructure-level generic hooks**.

Allowed:
- Browser API wrappers (`use-media-query`, `use-local-storage`)
- Generic state patterns (`use-debounce`, `use-toggle`)
- Generic async patterns (`use-async`)

Not allowed:
- Hooks that internally reference a specific Slice's state or context
- Hooks that contain business logic

Do not promote a hook to shared just because "two pages use it." Verify whether the hook serves the same role in both, and whether it is independent of Slice context. If coupled to Slice context, keep it in the Slice or move it to a suitable extension layer.

---

## Dependency Direction Between Segments

Shared has no business Slice boundaries, but **responsibility boundaries exist**. Each Segment has a limited set of other Segments it may import.

| Segment | Responsibility | May import | Avoid |
|---------|---------------|------------|-------|
| `config/` | env, flag, runtime values | prefer none | `ui`, `api`, `routes` |
| `routes/` | path constants, path builders | prefer none | `ui`, `api` |
| `i18n/` | translation setup, global strings | `config` | `ui`, `api` |
| `lib/` | topic-focused internal libraries | `config` at most | `ui`, `api` |
| `hooks/` | generic custom hooks | `lib`, `config` | `ui`, `api` |
| `api/` | external communication, clients | `config`, `lib` | `ui` |
| `query-factory/` | query key/option factories | `api`, `config` | `ui`, `hooks`, `mutation-factory` |
| `mutation-factory/` | mutation key/option factories | `api`, `config` | `ui`, `hooks`, `query-factory` |
| `ui/` | common UI, presentation | `lib`, `i18n` | `api`, `routes`, `query-factory`, `mutation-factory` |

The overall flow — `config / routes / i18n → lib / hooks → api / ui` — stays stable. Cycles are forbidden. `query-factory` and `mutation-factory` do not import each other.

`assets/` is a static resource and is not part of the direction graph. Any Segment or layer may import it when needed.

---

## Boundary with app

`shared` **only defines** tools and values. It does not know how they are assembled. `app` **takes what shared defined and assembles** it into an executable form.

| Concern | shared (definition) | app (assembly) |
|---------|---------------------|----------------|
| Routing | Path constants/patterns (`shared/routes`) | Router setup, route-page connection, guard |
| Settings | Env values, feature flag values (`shared/config`) | Provider composition, initialization logic |
| Backend | API clients, per-domain request functions (`shared/api`) | Calls during init (auth restoration, remote config load, etc.) |
| Style | Common UI components (`shared/ui`) | Global style application (`global.css`) |

For the same concern, shared provides the "material" and app owns the "assembly." The boundary becomes sharp when you keep this split in mind.

---

## Summary

- Shared is the lowest layer. It does not import from any other layer.
- No Slices, only Segments. Segment names clearly state responsibility.
- Foundational infrastructure, static resources, design system, and query factories live in shared from the start.
- Other code starts in a Slice and moves to shared only after all three conditions are met.
- `shared/ui` is business-agnostic only. Domain-specific UI lives in upper layers.
- `shared/lib` is topic-focused internal libraries, not a utility dump.
- Segments have a dependency direction. No cycles.
- Shared defines, app assembles.
