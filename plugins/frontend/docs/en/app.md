# App

This document covers the app layer. App is the topmost layer, and its sole responsibility is **assembling** the application into a runnable form.

---

## Why a Separate Layer

For an application to run, many pieces must come together. Routes must be configured, global providers installed, environment variables validated, auth tokens restored. Where to put this assembly logic relates directly to other layers' boundaries.

Putting assembly in `shared` breaks shared's "definition-only" principle. Putting it in `pages` burdens one particular page with the entire app's assembly responsibility. Putting everything in `main.tsx` makes the boot file aware of every concern the app has.

The app layer **takes full ownership** of this assembly. Shared provides materials; app assembles. Separating concerns by assembly-vs-definition clarifies each layer's role.

---

## Boundary with shared

Even for the same concern, definition and assembly are split.

| Concern | shared (definition) | app (assembly) |
|---------|---------------------|----------------|
| Routing | Path constants/patterns (`shared/routes`) | Router setup, route-page connection, guard |
| Settings | Env values, feature flag values (`shared/config`) | Provider composition, initialization logic |
| Backend | API clients, per-domain request functions (`shared/api`) | Calls during init (auth restoration, remote config load, etc.) |
| Style | Common UI components (`shared/ui`) | Global style application (`global.css`) |

Maintaining this boundary is the key to keeping the app layer thin.

---

## What Goes in App / What Does Not

### Goes

- Root component (`App.tsx`)
- Routing setup and route-page connection
- Global providers (theme, query client, auth, toast, error boundary, etc.)
- Global styles (`global.css`)
- Global layout (applied to every page)
- Initialization logic (env validation, i18n language detection, theme restoration, auth token restoration, etc.)
- Route guards and redirects

### Does not

- Business logic
- Slice-specific components or state
- Reusable utilities (→ `shared/lib`)
- Slice-specific providers (→ the respective Slice)
- `main.tsx` — it is the boot file at the `src/` root outside `app/`

---

## Internal Structure

App **starts with a minimal structure**. Promote to folders only when files multiply. Naming follows the same rule as other layers — file when there are no sub-dependencies, folder + `index.tsx` when there are.

```txt
# minimal                 # split when files grow     # folderize further
app/                      app/                        app/
├─ App.tsx                ├─ App.tsx                  ├─ providers/
└─ global.css             ├─ router.tsx               ├─ routes/
                          ├─ providers.tsx            ├─ styles/
                          └─ global.css               └─ App.tsx
```

Combine all providers in a single `providers.tsx`; if it grows too large, promote to a `providers/` folder with per-provider files. Same for routing — `router.tsx` when small, `routes/` folder when it grows.

---

## Providers

Only **global providers** live in app. Slice-specific providers stay in the Slice. Do not hoist "in case it becomes global later."

Examples of global providers:
- Theme / Design System provider
- i18n provider
- Auth provider
- QueryClientProvider (TanStack Query)
- Toast / Dialog provider
- Error boundary
- Suspense boundary

When there are two or more, compose them in `providers.tsx` and export a single component. The root component wraps children in this `Providers` once.

---

## Routing

Path constants are **defined in `shared/routes`**. If the project has any routes at all, `shared/routes/paths.ts` is required. App takes those constants and handles the actual router setup and page-component connection.

**Route guards and redirects belong to app.** Redirecting unauthenticated users to `/login`, rendering `/403` when the user lacks permission — these live in app. The reason: guards are a routing-level concern, decided **before** a particular page renders.

```tsx
// app/router.tsx — decides whether the page itself renders
<Route
  path={PATHS.dashboard}
  element={
    isAuthenticated ? <DashboardPage /> : <Navigate to={PATHS.login} />
  }
/>
```

**Conditional rendering inside a page belongs to the page.** Things like "show different menu items based on the user's role" are the page's own responsibility, since they branch after the page has rendered.

```tsx
// pages/dashboard/index.tsx — internal branching after the page is rendered
export function DashboardPage() {
  const { role } = useCurrentUser();
  return (
    <>
      <Sidebar />
      {role === 'admin' ? <AdminPanel /> : <UserPanel />}
    </>
  );
}
```

The difference between guards and internal branches is **"decides whether to render"** vs **"decides what to render"**.

---

## Global Layout

**Only global layouts live in app** — layouts applied to every page (a common header + main + footer structure, etc.).

**Do not branch per page inside a global layout.** Code like `if (route === '/login') return ...` is a signal that the page does not share the global layout. In such cases, narrow the global layout's scope to a route group, or let the page own its own layout.

Non-global layouts are handled as sub-dependencies of the relevant layer. A page-specific layout is a page-internal component; a layout pattern used across several pages is a Layout component in `shared/ui`.

---

## Initialization Logic

Logic that must run when the application first mounts belongs in app.

- Env validation (fail immediately if required values are missing)
- i18n language detection and initial setup
- Theme restoration (e.g., saved dark mode preference)
- Auth token restoration and validation
- Remote feature flag loading

Such logic **defines when to run** while pulling materials (functions, constants, API calls) from `shared`. Shared never runs directly.

---

## main.tsx

`main.tsx` is not part of app. It is the **boot file** that mounts the root component to the DOM, located at the `src/` root.

```ts
// src/main.tsx
import { createRoot } from 'react-dom/client';
import { App } from './app/App';

createRoot(document.getElementById('root')!).render(<App />);
```

main.tsx is the outer shell that runs the app layer, not the app layer itself. That is why it lives outside `src/app/`. Its position visually signals the separation "app layer = assembly, main.tsx = mount."

Next.js does not have a main.tsx — Next.js's root `app/layout.tsx` or `pages/_app.tsx` takes on the entry role. Details are in the [nextjs](nextjs.md) document.

---

## Summary

- App is the assembly layer. It does not implement business logic directly.
- Shared defines, app assembles. The same concern splits across two layers.
- Start with a minimal internal structure; promote to folders when files grow.
- Only global providers. Slice-specific providers stay in the Slice.
- Route guards and redirects in app. Per-page branching in the page.
- No per-page branches inside a global layout.
- Initialization defines when to run, pulling materials from shared.
- `main.tsx` is the boot file at the `src/` root, outside app.
