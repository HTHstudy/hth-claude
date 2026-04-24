# Next.js Integration

This document covers what changes when applying this architecture to a Next.js project. React (Vite) applies the architecture directly without special constraints, but Next.js's file-based routing structure collides by name with this architecture's `app` and `pages` layers.

The document answers one question — **how do Next.js routing folders and this architecture's layer folders coexist?**

---

## The Core Problem and Solution Principle

Next.js defines routing **by folder name**. With App Router, the root `app/` folder becomes the routing space; with Pages Router, the root `pages/` folder does. Both names clash directly with this architecture's `app` layer (app assembly) and `pages` layer (screen modules).

**The solution is simple.**

- **Next.js routing folders live at the project root** — `<root>/app/`, `<root>/pages/`
- **Architecture layers live inside `src/`** — `src/app/`, `src/pages/`, `src/shared/`, etc.
- **Root routing files do not implement logic** — they only serve as thin wrappers that re-export implementations from the architecture layers

Holding this separation keeps one rule consistent: "routing at the root, layers in `src/`."

---

## App Router

### Folder structure

```txt
├── app/                        ← Next.js App Router (root)
│   ├── layout.tsx
│   ├── page.tsx
│   ├── products/
│   │   ├── page.tsx
│   │   └── [id]/
│   │       └── page.tsx
│   └── api/
│       └── products/
│           └── route.ts
├── pages/                      ← empty folder (prevents Pages Router fallback)
│   └── README.md
├── middleware.ts                ← root only
├── instrumentation.ts           ← root only
└── src/
    ├── app/                    ← architecture app layer
    │   ├── providers.tsx
    │   └── global.css
    ├── pages/                  ← architecture pages layer
    │   ├── home.tsx
    │   ├── products.tsx
    │   └── product-detail/
    │       └── index.tsx
    ├── widgets/                ← optional
    ├── features/               ← optional
    ├── entities/               ← optional
    └── shared/
```

### Basic re-export pattern

`page.tsx` files inside the root `app/` **only re-export the architecture page**. No logic is implemented directly.

```ts
// app/page.tsx
export { HomePage as default } from '@pages/home';

// app/products/page.tsx
export { ProductsPage as default } from '@pages/products';
```

Keeping the re-export pattern means the routing folder shows only "which route connects to which page," while actual screen implementations stay in `src/pages/`.

### When Next.js features are needed

Dynamic route params, `generateMetadata`, `generateStaticParams`, `searchParams`, server-side data loading — using these Next.js page-level features is not enough with re-export alone. Use the import-then-export-default pattern.

```ts
// app/products/[id]/page.tsx
import { ProductDetailPage } from '@pages/product-detail';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProductDetailPage id={id} />;
}
```

Handle Next.js hooks and params in the root file and pass the values as props to the architecture page. The architecture page stays free of Next.js dependencies, while the root file holds Next.js-specific concerns only.

### generateMetadata exception

When `generateMetadata` needs to call an API, importing `@shared/api` directly from the root `app/` file is allowed. The exception exists because Next.js enforces that `generateMetadata` be exportable only from `page.tsx`.

```ts
// app/products/[id]/page.tsx
import { ProductDetailPage } from '@pages/product-detail';
import { PRODUCT_API } from '@shared/api/product';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProductDetailPage id={id} />;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await PRODUCT_API.getProduct({ id });
  return { title: product.name, description: product.description };
}
```

Without this exception, the API call inside `generateMetadata` could not be moved elsewhere. This is the only case where `@shared/api` import from a root routing file is allowed.

### layout.tsx

The root `app/layout.tsx` composes the architecture `app` layer's providers and global style.

```ts
// app/layout.tsx
import '@app/global.css';
import { Providers } from '@app/providers';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

The root `layout.tsx` owns Next.js's HTML shell, while actual provider composition and global style definitions remain in the architecture `app` layer. Maintaining this boundary keeps `src/app/` as portable assembly logic that works outside Next.js.

### Empty pages folder

When using App Router, **a root `pages/` folder must be created empty.** It prevents Next.js from falling back to Pages Router. Leave a README inside stating why it must remain empty.

```markdown
<!-- pages/README.md -->
This folder must remain empty.
It exists to prevent Next.js from falling back to Pages Router.
The architecture pages layer lives in src/pages/.
```

---

## Pages Router

### Folder structure

```txt
├── app/                        ← empty folder (prevents App Router detection)
│   └── README.md
├── pages/                      ← Next.js Pages Router (root)
│   ├── _app.tsx
│   ├── api/
│   │   └── example.ts
│   └── example/
│       └── index.tsx
└── src/
    ├── app/                    ← architecture app layer
    │   ├── custom-app.tsx
    │   ├── providers.tsx
    │   └── global.css
    ├── pages/                  ← architecture pages layer
    ├── widgets/                ← optional
    ├── features/               ← optional
    ├── entities/               ← optional
    └── shared/
```

### re-export pattern

```ts
// pages/example/index.tsx
export { ExamplePage as default } from '@pages/example';
```

### Custom App

Place `_app.tsx`'s actual implementation in the architecture `app` layer. The root `pages/_app.tsx` only re-exports.

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

When using Pages Router, **a root `app/` folder must be created empty.** If Next.js detects `src/app/` as an App Router directory, the build fails with "pages and app directories should be under the same folder." The empty root `app/` becomes the detection target and avoids that error.

```markdown
<!-- app/README.md -->
This folder must remain empty.
It exists to prevent Next.js from detecting src/app/ as App Router and triggering build errors.
The architecture app layer lives in src/app/.
```

---

## Route ↔ Slice Mapping

**Next.js's nested routing does not map 1:1 to architecture Slices.** Routing's folder nesting does not imply Slice folder nesting.

| Next.js route | Root `app/` structure | Architecture `src/pages/` Slice |
|---------------|----------------------|-------------------------------|
| `/` | `app/page.tsx` | `pages/home.tsx` |
| `/products` | `app/products/page.tsx` | `pages/products.tsx` |
| `/products/[id]` | `app/products/[id]/page.tsx` | `pages/product-detail.tsx` |
| `/settings` | `app/settings/page.tsx` | `pages/settings.tsx` |
| `/settings/profile` | `app/settings/profile/page.tsx` | `pages/settings-profile.tsx` |

The root routing folder follows Next.js's nested structure; `src/pages/` follows the architecture's rules (flat Slice structure). Even within the same domain, `/products` and `/products/[id]` are separate Slices. They do not share a folder.

Slice names are kebab-case reflecting the route's meaning: `products`, `product-detail`, `settings-profile`. When internals grow complex, promote to a folder Slice following the pages layer's general rules.

---

## API Routes

API routes are a **server area unrelated to this architecture's layers**. Treat them as a single backend server living outside `src/`.

### Core rules

- **API routes are self-contained.** They do not import architecture layers (`src/`). Implement needed logic inside the route file.
- **Access API routes only via `shared/api`.** Do not call `fetch('/api/...')` directly from a page. Define it as a domain in `shared/api` and let that domain's endpoint call it over HTTP.
- **Apply the [shared-api](shared-api.md) three-layer structure as-is.** Only the baseURL differs (`/api/...`).

### Import direction

```txt
app/api/  →  src/            ❌  API routes do not import architecture layers
src/      →  app/api/        ❌  direct import forbidden
src/shared/api  →  fetch('/api/...')   ✅  HTTP call only
```

### shared/api domain composition example

When API routes coexist with external backends, each is a separate domain. Callers (pages, query-factory) do not need to distinguish whether the destination is an API route or an external BE — they look only at `shared/api`.

```txt
shared/api/
├─ base/
├─ internal/                       # API route — baseURL: '/api'
│  ├─ internal-http-client.ts
│  ├─ index.ts
│  └─ endpoints/
│     ├─ get-product-list.ts       #   /api/products
│     └─ get-cart.ts               #   /api/cart
├─ main/                           # external main BE — baseURL: 'https://api.example.com'
│  ├─ main-http-client.ts
│  ├─ index.ts
│  └─ endpoints/
│     └─ get-user.ts
```

### When API routes are needed

Use API routes only when the logic can exist only on the server.

- Protecting API keys, auth tokens — values that must not be exposed to the client
- Direct DB access (full-stack setup without a separate backend)
- Server-only logic (email sending, file processing, PDF generation)
- Webhook receivers
- Composing several external APIs on the server (BFF)

Using API routes as a proxy just for frontend convenience is not recommended. If the external BE can be called directly, connect as a `shared/api` domain.

---

## Special File Locations

Next.js requires certain files at the project root. These cannot be moved to `src/`.

| File | Location | Note |
|------|----------|------|
| `middleware.ts` | project root | Next.js requirement |
| `instrumentation.ts` | project root | Next.js requirement |
| `next.config.js` | project root | — |
| Empty `pages/` | project root | Required with App Router |
| Empty `app/` | project root | Required with Pages Router |

---

## Differences from the Base Rules

### path alias

Configure tsconfig path aliases based on `src/`. Allow only per-layer aliases — `@app/*`, `@pages/*`, `@shared/*`, etc. A blanket alias (`@/*`) that covers all source is not used. If Next.js's default template creates a `@/*` alias, remove it.

### Default Export

The base rule is Named Export, with Default Export allowed only when a framework demands it. Next.js requires Default Export for `page.tsx`, `layout.tsx`, `route.ts`, `_app.tsx`, etc. These files are thin wrappers that re-export architecture pages, so Default Export is used.

Inside the architecture layers (within `src/`), Named Export remains the default.

### Entrypoint

React (Vite) has `src/main.tsx` as the boot file. Next.js has no `main.tsx`. The root `app/layout.tsx` or `pages/_app.tsx` plays the entry role, while the actual assembly implementation lives in `src/app/`.

---

## Summary

- Routing at the root, layers in `src/`. The two spaces do not mix.
- Root routing files are re-export only. When Next.js features are needed, import-then-export-default.
- `generateMetadata` is an exception — direct `@shared/api` import in the root is allowed.
- Do not replicate Next.js routing nesting in the Slice structure. Slices remain flat.
- API routes are a server area. They do not import `src/`, and `shared/api` calls them over HTTP.
- With App Router, keep an empty root `pages/`; with Pages Router, keep an empty root `app/`.
