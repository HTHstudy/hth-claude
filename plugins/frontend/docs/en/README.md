# Frontend Layered Architecture

This documentation describes a layered architecture for writing frontend code with a consistent structure.

The architecture is based on [Feature-Sliced Design (FSD)](https://feature-sliced.design), with two strengthenings. Slice internals are relaxed into free decomposition, and both the API layer and TanStack Query factories are centralized. It is framework-agnostic — React (Vite) applies it directly, and Next.js adds rules to resolve file-based routing conflicts.

---

## Core Ideas

The architecture reduces to three sentences.

**1. Pages are the center.** All code starts inside a page. A page is not a simple route entry — it is a self-sufficient screen-level module. It directly owns its state, hooks, components, and domain logic. Code is not placed in a shared layer in advance.

**2. Do not move code to other layers prematurely.** Move only after real reuse occurs, the responsibility is stable, and independence from slice context is confirmed. Do not promote "because it might be reused later."

**3. Layer order determines imports.** Code may only import from layers below its own. The same layer's other slices cannot be referenced directly. This constraint fixes the dependency direction and keeps the scope of change predictable.

---

## Layer Composition

```txt
app → pages → (widgets → features → entities →) shared
```

`widgets`, `features`, `entities` are optional. A project starts with `app / pages / shared` and introduces each optional layer only when real need emerges.

---

## Relationship to FSD

This architecture shares FSD's layer hierarchy and import direction. The differences concentrate in two axes.

**Slice internals are free.** FSD fixes slice internals with named segments like `ui/`, `model/`, `api/`. This architecture does not pre-define the slice's internal structure; it applies the same decomposition rule as pages (based on the number of responsibilities).

**API is centralized in shared.** FSD permits per-slice `api/` segments. This architecture gathers every API into `shared/api` and enforces a three-layer structure (http-client → endpoints → public interface). Entities do not own APIs — they handle domain representation only.

---

## Reading Order

Reading in the order below builds the concepts in layers.

| Document | Content |
|----------|---------|
| [foundations](foundations.md) | Layer, Slice, Segment, hierarchy, import direction — the vocabulary for the rest |
| [principles](principles.md) | page-first, extraction, and movement principles with a decision procedure |
| [app](app.md) | The app layer — the assembler |
| [pages](pages.md) | The pages layer — the center of the architecture. Slice decomposition and extraction |
| [shared](shared.md) | The shared layer — segment composition and dependency direction |
| [shared-api](shared-api.md) | API's three-layer structure and http-client patterns |
| [query-mutation](query-mutation.md) | TanStack Query factory pattern |
| [optional-layers](optional-layers.md) | widgets · features · entities |
| [nextjs](nextjs.md) | Structure separation for Next.js projects |
| [nextjs-rsc](nextjs-rsc.md) | Server Components + TanStack Query |

Read `foundations` and `principles` first; the rest can be read in any order.

---

## Applying to a Project

The architecture's import direction, entrypoint, and naming constraints can be enforced automatically with ESLint rules (`no-restricted-imports`, `import/no-default-export`, `consistent-type-imports`, `import/no-cycle`, file-name kebab-case, etc.). Concrete config templates and auto-application tools are provided by the `hth-claude` plugin (the `architecture`, `create`, and `migrate` skills in the `frontend` plugin).
