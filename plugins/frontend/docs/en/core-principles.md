# Core Principles

Three principles that run through this architecture.

---

## 1. Page-First

**All code starts in a page.**

A page is not a simple route entry — it is an independent, screen-level module. It directly owns its own state, hooks, components, and domain logic.

Don't spread code across multiple layers from the start. Begin inside a page, decompose within the page as complexity grows, and only move code to another layer when real reuse occurs.

```
Start with a single page
→ Decompose into large components as needed
→ Decompose further within those components
→ When reuse appears, consider extraction
→ If conditions are met, move to another layer
```

### Business-agnostic code follows the same rule

Even generic code like Button or useDebounce stays where it's used if only one place needs it. When 2+ slices actually share it, move it to shared.

The only exception is **infrastructure that must exist before any page can work**:
- `shared/config` — environment variables, feature flags
- `shared/routes` — route path constants
- `shared/i18n` — translation setup
- `shared/api` — API clients and endpoint definitions
- Design system / headless components — UI foundation adopted by the project

These exist in shared from the start because pages depend on them to function.

---

## 2. Import Direction

**Layer imports flow top-down only. Reverse direction is forbidden.**

```
app → pages → widgets → features → entities → shared
```

- `app` can import from all layers.
- `pages` can import from layers below it.
- `shared` does not import from any other layer.
- **Cross-import between slices in the same layer is forbidden.** page-a cannot import from page-b. feature-a cannot import from feature-b.

This rule enforces dependency direction and makes the impact of changes predictable.

### When cross-import is needed

When two slices in the same layer need to share code, that is **the signal to move code to a wider scope**.

- Two pages share the same domain UI → move to `entities`
- Two pages share the same interaction → move to `features`
- Two pages share the same composite UI block → move to `widgets`

The cross-import ban is not just a constraint — it is **a mechanism that drives expansion**.

---

## 3. Extraction and Movement

Moving code to another scope happens in two stages.

### Extraction: Separating shared code within a slice

When multiple sub-modules inside a slice use the same code, extract it to the nearest common scope.

```
[slice]/
├─ component-a/    ← both use filter-chip
├─ component-b/    ←
├─ _ui/
│  └─ filter-chip.tsx   ← extracted to common scope
└─ index.tsx
```

### Movement: Relocating to another layer

When 2+ slices actually use the code and it works independently of any slice context, consider moving it to another layer.

**Movement must be deliberate.** Do not move unless all conditions are met:

1. Is it actually used in 2+ slices? (real usage, not prediction)
2. Does it make sense without the slice context?
3. Is its input/output free from specific slice state?
4. Is the responsibility stable enough? (don't move while it's still changing)
5. Does it work with generic interfaces only?

Extracting to the nearest common scope is the default. Moving to another layer is the final step.

### Movement is not always the answer

When slices in the same layer need to interact, sometimes the answer is not moving code but **letting the consumer compose them**.

Example: header widget and sidebar widget need to be linked.
- Don't move sidebar to another layer.
- The page composes both widgets and manages the shared state.

```tsx
// Page composes the widgets
const [sidebarOpen, setSidebarOpen] = useState(false);

<Header onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
<Sidebar open={sidebarOpen} />
```
