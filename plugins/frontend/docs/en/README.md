# Frontend Layered Architecture

A guide for structuring frontend code with a consistent layered architecture.

This architecture is based on [Feature-Sliced Design (FSD)](https://feature-sliced.design), with strengthened **slice internal management** and **centralized API layer**. It is framework-agnostic.

---

## Core Ideas

1. **Pages are the center.** All code starts in a page.
2. **Don't move code to other layers prematurely.** Only move when real reuse occurs.
3. **Layer order determines imports.** You can only import from top to bottom.

```
app → pages → widgets → features → entities → shared
```

---

## Documentation

| Document | Content |
|----------|---------|
| [Core Principles](core-principles.md) | Page-first, import direction, extraction and movement |
| [Layer Guide](layers.md) | Role and relationship of each layer, when to introduce |
| [Shared API](shared-api.md) | API layer structure, domain patterns, data transformation |
| [Query & Mutation Factory](query-mutation.md) | TanStack Query factory patterns |
| [Next.js Guide](nextjs.md) | Structure separation and routing mapping for Next.js |
| [RSC + TanStack Query](nextjs-rsc-tanstack-query.md) | Data fetching patterns with Server Components |
| [Expansion Guide](expansion-guide.md) | When and how to introduce widgets, features, entities |

---

## Initial Project Structure

```
src/
├─ main.tsx
├─ app/
│  ├─ App.tsx
│  └─ global.css
├─ pages/
└─ shared/
```

`widgets/`, `features/`, `entities/` are not created initially. Introduce them one at a time when needed.

---

## Relationship with FSD

This architecture shares FSD's layer hierarchy and import direction rules. FSD v2.1 also recommends page-first, starting with minimal layers, and placing types near usage — the direction is aligned.

### Where This Architecture Strengthens FSD

| Aspect | FSD | This Architecture |
|--------|-----|-------------------|
| **Slice internals** | Named segments (`ui/`, `model/`, `api/`) | No predefined structure. Free decomposition, same rules as pages |
| **API centralization** | Common client in `shared/api`, slice-level `api/` also allowed | All APIs centralized in `shared/api`. Strict 3-tier structure (base → http-client → endpoints) |
| **Query/Mutation** | No standard | Standardized via `shared/query-factory`, `shared/mutation-factory` |
| **Data transformation** | Mapper placed near DTO | Transformation handled by the API consumer. Endpoints don't transform |
| **Entrypoint enforcement** | Recommended | Enforced via ESLint `@[layer]/*/*` pattern |
