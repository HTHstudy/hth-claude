# Next.js Guide

How and why the architecture structure changes when applied to Next.js projects.

---

## The Core Problem

Next.js defines file-based routing via `app/` or `pages/` folders. These names conflict with FSD's `app` and `pages` layers.

**Solution:** Next.js routing folders stay at the project root, while FSD layers go inside `src/`.

| Location | Role |
|----------|------|
| Root `app/` or `pages/` | Next.js routing (re-export only) |
| `src/app/` | FSD app layer (providers, global style) |
| `src/pages/` | FSD pages layer (screen modules) |
| `src/shared/` | FSD shared layer |

Root routing files contain no logic. They serve as thin wrappers that re-export code from FSD layers.

---

## App Router Structure

```
├── app/                        ← Next.js App Router (root)
│   ├── layout.tsx
│   ├── page.tsx
│   └── products/
│       ├── page.tsx
│       └── [id]/
│           └── page.tsx
├── pages/                      ← Empty folder (prevents Pages Router fallback)
│   └── README.md
└── src/
    ├── app/                    ← FSD app layer
    │   ├── providers.tsx
    │   └── global.css
    ├── pages/                  ← FSD pages layer
    │   ├── home.tsx
    │   ├── products.tsx
    │   └── product-detail/
    │       └── index.tsx
    └── shared/
```

### Re-export pattern

Root `app/` `page.tsx` files only re-export FSD pages.

```ts
// app/page.tsx
export { HomePage as default } from '@pages/home';

// app/products/page.tsx
export { ProductsPage as default } from '@pages/products';

// app/products/[id]/page.tsx
export { ProductDetailPage as default } from '@pages/product-detail';
```

### layout.tsx

Root `app/layout.tsx` assembles providers and global styles from the FSD app layer.

```ts
// app/layout.tsx
import '@app/global.css';
import { Providers } from '@app/providers';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

### Empty pages folder

An empty `pages/` folder is created at the root. This prevents Next.js from falling back to the Pages Router.

---

## Pages Router Structure

```
├── app/                        ← Empty folder (prevents App Router detection)
│   └── README.md
├── pages/                      ← Next.js Pages Router (root)
│   ├── _app.tsx
│   └── example/
│       └── index.tsx
└── src/
    ├── app/                    ← FSD app layer
    │   ├── custom-app.tsx
    │   ├── providers.tsx
    │   └── global.css
    ├── pages/                  ← FSD pages layer
    │   ├── home.tsx
    │   └── product-detail/
    │       └── index.tsx
    └── shared/
```

### Re-export pattern

```ts
// pages/example/index.tsx
export { ExamplePage as default } from '@pages/example';
```

### Custom App

The actual `_app.tsx` implementation lives in the FSD app layer.

```ts
// src/app/custom-app.tsx
import type { AppProps } from 'next/app';
import '@app/global.css';
import { Providers } from '@app/providers';

export function CustomApp({ Component, pageProps }: AppProps) {
  return (
    <Providers>
      <Component {...pageProps} />
    </Providers>
  );
}

// pages/_app.tsx
export { CustomApp as default } from '@app/custom-app';
```

### Empty app folder

An empty `app/` folder is created at the root. This prevents Next.js from detecting `src/app/` as an App Router directory and causing a build error.

---

## Route to Slice Mapping

Next.js nested routing structure and FSD pages layer Slices do not map 1:1. In FSD, each route is an independent Slice. Next.js folder nesting is not replicated in FSD Slices.

| Next.js route | Root `app/` structure | FSD `src/pages/` Slice |
|---------------|----------------------|----------------------|
| `/` | `app/page.tsx` | `pages/home.tsx` |
| `/products` | `app/products/page.tsx` | `pages/products.tsx` |
| `/products/[id]` | `app/products/[id]/page.tsx` | `pages/product-detail.tsx` |
| `/settings` | `app/settings/page.tsx` | `pages/settings.tsx` |
| `/settings/profile` | `app/settings/profile/page.tsx` | `pages/settings-profile.tsx` |

- **Root routing folders** follow Next.js routing structure (nested folders).
- **`src/pages/`** follows FSD rules (flat Slice structure).
- Even within the same domain (`/products` and `/products/[id]`), each is a separate Slice.

---

## API Routes

API Routes are a **server-side concern**, independent of FSD layers. Treat them as a standalone backend server.

### Import direction

```
app/api/  →  src/  ❌  API routes do not import FSD layers
src/      →  app/api/  ❌  Direct import forbidden
src/shared/api  →  fetch('/api/...')  ✅  Access via HTTP calls only
```

- API routes are self-contained. All logic is handled within the route file itself.
- Frontend accesses API routes through `shared/api` via HTTP calls. Code is never directly imported.
- The same `shared/api` 3-tier structure applies. Only the baseURL differs (`/api/...`).

### When to use

Use API routes only when server-side logic is required:
- Protecting API keys, auth tokens, or other secrets from the client
- Direct database access (full-stack without a separate backend)
- Server-only logic (email sending, file processing, etc.)
- Webhook receivers, composing multiple external APIs server-side (BFF)
