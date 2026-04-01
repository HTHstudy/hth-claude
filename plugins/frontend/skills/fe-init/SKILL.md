---
name: fe-init
description: Initialize a new frontend project with layered architecture. Uses Vite + React + TypeScript as base.
disable-model-invocation: true
---

# Create Frontend Project

Create a new runnable frontend project with Frontend Layered Architecture applied.

## Instructions

### Step 1: Ask project name

Ask the user for a project name.

### Step 2: Create base project

```bash
yarn create vite [project-name] --template react-ts
cd [project-name]
```

### Step 3: Install additional dependencies

```bash
yarn add react-router @tanstack/react-query axios
yarn add -D @tailwindcss/vite tailwindcss prettier eslint-config-prettier
```

### Step 4: Restructure to architecture

Reorganize `src/` and remove default files:

```
src/
├─ main.tsx
├─ app/
│  ├─ App.tsx             # Root: Providers + Router
│  ├─ providers.tsx       # QueryClientProvider
│  ├─ router.tsx          # BrowserRouter + Routes
│  └─ global.css          # Tailwind: @import 'tailwindcss'
├─ pages/
│  └─ home/
│     └─ index.tsx        # Home page
└─ shared/
   ├─ api/
   │  └─ base/
   │     └─ base-http-client.ts
   ├─ config/
   │  └─ env.ts
   └─ routes/
      └─ paths.ts
```

- Remove default files: `App.css`, `index.css`, `App.tsx` (replace with architecture structure)
- Update `vite.config.ts`: add Tailwind plugin, enable `resolve.tsconfigPaths`
- Update `global.css`: `@import 'tailwindcss'`

### Step 5: Configure

**Path aliases** — add to `tsconfig.app.json`:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@app/*": ["./src/app/*"],
      "@pages/*": ["./src/pages/*"],
      "@shared/*": ["./src/shared/*"],
      "@widgets/*": ["./src/widgets/*"],
      "@features/*": ["./src/features/*"],
      "@entities/*": ["./src/entities/*"]
    }
  }
}
```

**ESLint** — add `no-restricted-imports` rules:

```js
'no-restricted-imports': ['error', {
  patterns: [
    { group: ['@shared/api/*/*'], message: 'Use @shared/api/[domain] entrypoint.' },
    { group: ['@pages/*/*'], message: 'Use @pages/[page] entrypoint.' },
  ],
}]
```

**Prettier** — create `.prettierrc`:

```json
{
  "singleQuote": true,
  "trailingComma": "all",
  "tabWidth": 2,
  "semi": true,
  "printWidth": 120,
  "useTabs": false,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

Add `eslint-config-prettier` to ESLint config to prevent conflicts.

**Environment** — create `.env`:

```
# API base URL
# VITE_API_URL=http://localhost:5174/api
```

### Step 6: Complete

Inform the user:
- Run `yarn dev` to start the dev server

### Important

- Do NOT create `widgets/`, `features/`, `entities/` directories. These are optional layers introduced only when needed.
- Remove unused default files from the Vite template (default CSS, placeholder content, etc.).
- Do NOT run dependency installation. The user does this themselves.

### Tip

If API responses follow a unified format (e.g., all APIs return `{ data: T }`), define a common response type in `shared/api/base/types.ts`:

```ts
export type DefaultResponse<T> = {
  data: T;
};
```
