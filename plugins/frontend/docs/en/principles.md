# Principles

This document answers "where does code belong?". Layer structure provides the vocabulary; the principles here connect that vocabulary to actual judgment.

---

## Page-First

### Why

Spreading code across layers from the start creates two problems at once. One is **predictive extraction** — promoting code to a shared layer "because it might be reused later," when the reuse does not yet exist. Code that has risen early receives constraints from the shared layer while still having only one actual user, and the interface that would have evolved naturally if kept close gets frozen prematurely. The other is **responsibility fragmentation** — a state where understanding one screen requires hopping between many folders. When a screen and its required logic are not together, both readers and editors must reassemble the puzzle every time.

Page-first solves both.

### What

**A page is not a simple route entry. It is a self-sufficient screen-level module.** A page **directly owns** its state, hooks, components, and domain logic. It is not preemptively placed in a shared layer.

All code starts inside a page. Business-agnostic code is no exception — a Button or a useDebounce stays within the page if only that page uses it.

The exception is **infrastructure that must exist before any page can function**: environment variable definitions, route path constants, translation setup, API clients, static assets, design system / headless components, and TanStack Query factories. These are things pages call or consume, so they belong in `shared` from the start.

### How

As complexity grows inside a page, follow this flow.

```txt
Start with one page
→ decompose into large components when needed
→ decompose those larger units further when needed
→ when reuse appears at the smallest parts, consider extraction
→ when all conditions are met, move to another layer
```

Decomposition is judged by the **number of independent responsibilities**, not by file length. When a file holds multiple unrelated flows or mixes JSX with several logical responsibilities, it is time to decompose. Depth itself is not a problem — the page may keep decomposing internally.

---

## Extraction and Movement

Relocating code splits into two stages. **Extraction** and **movement** mean different things.

### Extraction

**Extraction separates common code inside a Slice.** When multiple sub-modules in a Slice share the same code, separate it to the nearest common scope. The extracted file still belongs to the same Slice.

```txt
[slice]/
├─ component-a/    ← both use filter-chip
├─ component-b/    ←
├─ _ui/
│  └─ filter-chip.tsx   ← extracted to the nearest common scope inside the Slice
└─ index.tsx
```

When several extracted files accumulate, group them into private folders like `_ui/`, `_context/`, `_lib/`. Do not create these folders upfront; group only after extraction has actually happened.

### Movement

**Movement relocates code to a different layer.** Consider it only when reuse occurs across Slices in reality, and when the code can operate independently of Slice context.

Movement must be cautious. **Extraction is the default; movement is the final stage.** Do not jump straight to `shared` or `widgets` / `features` / `entities` when commonality appears. First extract to the nearest common scope, then consider movement only if that does not resolve the situation.

---

## Movement Conditions

All three conditions below must hold. If any one fails, keep the code in the current scope.

### 1. Two or more Slices already use it in reality

Actual use, not prediction. "If a second use case appears, it will look useful" is not a movement condition yet. Reconsider movement when the second use actually happens.

The meaning of "two or more" depends on the target layer's allowed superiors — see [foundations](foundations.md#hierarchy-and-direction) for the full hierarchy. `widgets` needs 2+ pages, `features` needs 2+ pages or widgets, `entities` needs 2+ among pages·widgets·features, `shared` needs 2+ Slices from any upper layer.

When a higher optional layer has not been introduced, that condition is excluded. For example, in a project without `widgets`, the condition for `features` reduces to "repeated across 2+ pages."

### 2. The responsibility is stable

If the interface (props, parameters, return type) changed recently or is expected to change, do not move. Once moved, interface churn forces synchronized changes across many Slices, eating the value of the move. Use `git log` if needed to check recent activity.

### 3. Meaning stands without Slice context

If input/output is coupled to a specific Slice's state or context, do not move. Code that takes a domain entity type directly as a prop, or internally references a specific Slice's state, is bound to Slice context. Only code that operates purely on generic props and interfaces qualifies for movement.

The distinction shows up in the props signature.

```ts
// ❌ coupled to Slice context — requires ProductDetailState directly
type Props = {
  state: ProductDetailState;
  onToggleSection: (section: SectionId) => void;
};
```

```ts
// ✓ generic interface — usable from any Slice
type Props = {
  expanded: boolean;
  onToggle: () => void;
};
```

The second form takes only primitive values and generic callbacks, so the component keeps its meaning when reused from a different Slice.

---

## Decision Procedure

When deciding where to place code, always follow this order.

1. **Is this code specific to a single page?** → keep it in the page.
2. **Can it be resolved in a smaller scope?** → place it in the narrowest scope (page-internal component, Slice sub-folder, etc.).
3. **Has commonality emerged?** → extract to the nearest common scope.
4. **Is it actually used by 2+ upper Slices?** → if not, keep it in the current scope.
5. **Does meaning hold without Slice context?** → move to the appropriate layer.
6. **If none of the above apply**, keep it local.

This procedure aims not at "how do we scale?" but at **"how do we avoid moving prematurely?"**. Keeping code local is the default; movement is the exception that requires all conditions to be satisfied.

---

## Movement Targets

When all movement conditions hold, the destination depends on the nature of the responsibility.

| Nature of responsibility | Destination |
|--------------------------|-------------|
| Composite UI block (UI made of several sub-compositions) | `widgets` |
| User interaction unit (UI + logic) | `features` |
| Domain UI / display logic (label·color mapping, validation) | `entities` |
| Business-agnostic utility / hook / UI | `shared` |

The same code goes to different layers depending on what it does. UI with domain vocabulary does not belong in `shared/ui` — `shared/ui` holds only business-agnostic components.

---

## Movement Is Not Always the Answer

When Slices of the same layer need to be combined, the answer is often **composition at the calling site**, not movement.

When a header widget and a sidebar widget must communicate, the fix is not to move sidebar elsewhere — the page that uses both widgets owns the state and passes it down as props. The widgets are not moved; no inter-widget dependency is created.

The same reasoning applies to features and entities. If features depend on each other, whoever uses them (page, widget) composes them. If entities need to combine, the consumer (page, feature, widget) composes them. **Composition is the responsibility of the upper layer.**

---

## Summary

- A page is a self-sufficient screen module. It directly owns state, hooks, components, and logic.
- **Start in the narrowest scope**. When commonality appears, extract first to the nearest common scope.
- **Extraction is inside a Slice; movement is to another layer.** Movement is the final stage.
- Movement conditions: (1) actual use across 2+ Slices, (2) responsibility stability, (3) independence from Slice context. All three must hold.
- When same-layer Slices need to combine, compose at the upper layer instead of moving.
