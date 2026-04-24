# Optional Layers

This document covers the optional layers `widgets`, `features`, and `entities`. Each has a distinct responsibility, but they share enough patterns in introduction and operation that one document covers all three.

---

## Why Optional

These three layers are **destinations for code that starts in pages**. Filling them from the start violates the page-first principle. Pre-distributing code based on predicted reuse freezes interfaces before they meet real use, and the frozen interface gets in the way once real use arrives.

The three layers are mutually independent. They are not introduced as a set — introducing only `entities` while leaving `features`·`widgets` unused is fine, as is introducing only `widgets`. The trigger for introduction is **observed real repetition across 2+ Slices**.

---

## Common Introduction Conditions

All three conditions below must hold. If any one fails, keep the code in the current scope. The reasoning behind these conditions is covered in [principles](principles.md).

**1. Actually used by 2+ upper Slices.** The allowed superiors differ per layer. `widgets` needs 2+ pages; `features` needs 2+ pages or widgets; `entities` needs 2+ among pages·widgets·features. If a higher optional layer is not yet introduced, that count is excluded.

**2. Responsibility is stable.** Do not move when interfaces (props, parameters, return type) changed recently or are about to change.

**3. Independent from Slice context.** Do not move when coupled to a specific Slice's state or context. Code that takes a domain entity type directly or references a specific Slice's state stays in the upper Slice.

These conditions aim not at "conditions for expansion" but at **"conditions to avoid expanding prematurely"**. Keeping these strict is central to this architecture's character.

---

## Common Operational Rules

### Slice composition

All three layers are Slice-based. Follow the same rules as [pages](pages.md).

- Slice names in kebab-case
- Single-file Slice → promote to folder + `index.tsx` when sub-dependencies appear
- External access only through the entrypoint (`@[layer]/[slice]`)
- Group extracted files into private folders like `_ui/`, `_hooks/`, `_context/`, `_lib/` (only after real extraction occurs)
- Decompose by number of responsibilities (not file length)

### No cross-import

Cross-imports between sibling Slices in the same layer are forbidden. widget-a does not directly reference widget-b; feature-a does not reference feature-b.

When two Slices in the same layer want to share, **the upper layer composes**. If two widgets must interact, the page using both widgets owns the state and passes it down as props. If two features depend on each other, whoever uses them (widget, page) composes.

### Import depth

Widgets may directly import both features and entities — the hierarchy rule permits it since both are lower. Single-step traversal ("widget → feature → entity") is not enforced. Depth limits would only force artificial complexity.

When composition becomes heavy, **decompose inside the widget**. A widget directly combining several features and entities is natural; when the composition grows heavy, split the widget into smaller components internally.

---

## Widgets

### Responsibility

**Independent composite UI blocks.** They encapsulate UI compositions reused across multiple pages (header, sidebar, product list section, etc.). They compose lower layers (`features`, `entities`, `shared`) to deliver complete UI.

### When to introduce

Introduce when the same composite UI block **repeats across 2+ pages**. It must be self-contained enough that the page can look like a composition of widgets.

Do not create widgets that merely wrap a single component. A wrapper around one button or one card has no value as a widget — that level of reuse belongs to `shared/ui` or `entities`.

### Slice name

Names that describe the UI block's role: `header`, `sidebar`, `product-list-section`.

### Usable lower layers

`features`, `entities`, `shared`. Upper layers are forbidden to import.

### Composition

When widgets need to interact, that is not a signal to move a widget but **a signal for the page to compose**. If the sidebar needs to know about the header's state, the fix is not moving sidebar elsewhere — the page using both widgets owns the state and passes it down.

---

## Features

### Responsibility

**User interaction encapsulation.** Owns interaction UI together with its logic (state, validation, API trigger). The unit is "what can the user do here?".

### When to introduce

Introduce when the same user interaction **repeats across 2+ pages or widgets**. If `widgets` is not yet introduced, this reduces to "repeated across 2+ pages."

The interaction logic and UI must move together to be meaningful. Do not create features where UI and logic live separately. Not every user action deserves a feature — if only one page uses it, keep it in that page.

### Slice name

Noun phrases describing actions: `add-to-cart`, `auth-form`, `product-search`.

### Usable lower layers

`entities`, `shared`. Upper layers (`pages`, `widgets`) are forbidden to import.

### Notes

API definitions still live in [shared-api](shared-api.md). A feature calls `[DOMAIN]_API` to trigger APIs but does not own API schemas or clients. Once that boundary breaks, API definitions start duplicating per feature.

When features depend on each other (e.g., `add-to-cart` needs to check `auth` state), the consumer composes. Inject the auth state via props, or gate at the call site.

---

## Entities

### Responsibility

**Frontend domain representation.** Domain-specific UI, display logic (label·color mapping), and validation schemas. The unit is "how does this domain look on screen?".

### When to introduce

Introduce when domain-specific UI (`ProductCard`, `UserAvatar`) or display mapping **repeats across 2+ of pages·widgets·features**. Layers that are not introduced are excluded from the count.

When you feel the urge to place a domain component inside `shared/ui`, that is the natural time to introduce entities. `shared/ui` stays business-agnostic, and UI with domain vocabulary goes to entities — that is the architecture's default placement.

### Slice name

Domain nouns: `product`, `user`, `order`.

### Usable lower layers

Only `shared`. All upper layers are forbidden to import.

### Relationship with shared/api

Entities do not own APIs. API definitions are in `shared/api`; entities import the types and constants to build frontend representation.

| Concern | shared/api | entities |
|---------|-----------|----------|
| API response types | O | X |
| API call functions | O | X |
| Domain UI | X | O |
| Display logic (label/color) | X | O |
| Validation schemas | X | O |

Entities do not fetch remote data either. Entities receive data via props and handle rendering and display logic only. Data fetching is the responsibility of pages·widgets·features.

### Entity composition

When entities need to combine (e.g., `Product` needs to reference `User` information), the consumer (page, feature, widget) composes. No inter-entity dependencies. This rule keeps entities as **atomic units of domain representation**.

---

## Summary

- All three layers are optional and mutually independent.
- Introduce only when all three conditions (actual 2+ use, stability, context independence) hold.
- Slice structure·entrypoint·decomposition rules match pages.
- No same-layer cross-import. Composition is the upper layer's job.
- Widgets = composite UI blocks, features = interaction units, entities = domain representation.
- APIs live in none of these. `shared/api` is the sole API owner.
- Entities do not own APIs or fetch data. They handle representation only.
