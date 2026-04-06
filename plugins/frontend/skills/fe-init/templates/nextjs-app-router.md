# Next.js App Router 프로젝트 템플릿

## 기술 스택

| 항목 | 기술 |
|------|------|
| 프레임워크 | Next.js (App Router) |
| 언어 | TypeScript |
| 스타일링 | Tailwind CSS |
| 서버 상태 관리 | TanStack Query |
| HTTP 클라이언트 | Axios |
| 패키지 매니저 | Yarn |
| 포매터 | Prettier |

## 실행 단계

### 1단계: 기본 프로젝트 생성

```bash
npx create-next-app@latest [project-name] --typescript --tailwind --eslint --app --src-dir --use-yarn
cd [project-name]
```

> `--src-dir` 플래그로 `src/` 디렉토리를 활성화한다. `--import-alias`는 지정하지 않는다 — 5단계에서 레이어별 alias로 교체한다.

### 2단계: 추가 의존성 설치

```bash
yarn add @tanstack/react-query axios
yarn add -D prettier eslint-config-prettier
```

### 3단계: 아키텍처 구조로 재구성

Next.js의 기본 구조를 FSD 레이어드 아키텍처로 전환한다. 상세 규칙: [nextjs.md](../../architecture/integrations/nextjs.md)

```
├─ app/                        # Next.js App Router (루트) — re-export 전용
│  ├─ layout.tsx               # src/app의 providers, global.css를 조립
│  ├─ page.tsx                 # src/pages의 home을 re-export
│  └─ globals.css              # 삭제 → src/app/global.css로 이동
├─ pages/                      # 빈 폴더 (Pages Router 폴백 방지)
│  └─ README.md
└─ src/
   ├─ app/                     # FSD app 레이어
   │  ├─ providers.tsx         # QueryClientProvider (client component)
   │  └─ global.css            # Tailwind: @import 'tailwindcss'
   ├─ pages/                   # FSD pages 레이어
   │  └─ home.tsx              # 홈 페이지
   └─ shared/
      ├─ api/
      │  └─ base/
      │     └─ base-http-client.ts
      ├─ config/
      │  └─ env.ts
      └─ routes/
         └─ paths.ts
```

**주요 변경:**
- `create-next-app`이 생성한 `src/app/` 내용물을 정리:
  - `globals.css` → `src/app/global.css`로 이동 (Tailwind import만 유지)
  - `page.tsx`, `page.module.css` → 삭제 (FSD pages로 대체)
  - `layout.tsx` → 루트 `app/layout.tsx`로 이동 (re-export 패턴 적용)
- `src/pages/`, `src/shared/` 생성
- 루트에 빈 `pages/` 폴더 + README.md 생성

### 4단계: 핵심 파일 작성

**루트 `app/layout.tsx`** — providers와 global style 조립:

```tsx
import '@app/global.css';
import { Providers } from '@app/providers';

export const metadata = {
  title: '[project-name]',
  description: '[project-name]',
};

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

**루트 `app/page.tsx`** — FSD page re-export:

```tsx
export { HomePage as default } from '@pages/home';
```

**`src/app/providers.tsx`** — Client Component:

```tsx
'use client';

import { isServer, QueryClient, QueryClientProvider } from '@tanstack/react-query';

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: 60 * 1000 },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

function getQueryClient() {
  if (isServer) return makeQueryClient();
  if (!browserQueryClient) browserQueryClient = makeQueryClient();
  return browserQueryClient;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
```

**`src/pages/home.tsx`** — 홈 페이지:

```tsx
export function HomePage() {
  return <div>Home</div>;
}
```

**`pages/README.md`** — 빈 폴더 설명:

```markdown
이 폴더는 비어 있어야 합니다.
Next.js가 Pages Router로 폴백하는 것을 방지하기 위해 존재합니다.
FSD pages 레이어는 src/pages/에 위치합니다.
```

### 5단계: 설정

**경로 별칭** — `tsconfig.json`에서 `create-next-app`의 기본 `@/*` alias를 제거하고 레이어별 alias로 교체:

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

> `@/*` 같은 포괄적 alias는 제거한다. 레이어별 alias만 허용.

**ESLint** — `no-restricted-imports` 규칙 추가 (상세 템플릿은 [rules.md](../../architecture/rules/rules.md) 참조):

```js
'no-restricted-imports': ['error', {
  patterns: [
    { group: ['@shared/api/*/*'], message: '@shared/api/[domain] 엔트리포인트를 사용하세요.' },
    { group: ['@pages/*/*'], message: '@pages/[page] 엔트리포인트를 사용하세요.' },
  ],
}]
```

**Prettier** — `.prettierrc` 생성:

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

ESLint 설정에 `eslint-config-prettier`를 추가하여 충돌을 방지한다.

**환경변수** — `.env.local` 생성:

```
# API base URL
# NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

### 6단계: 완료

사용자에게 안내:
- `yarn dev`로 개발 서버를 시작할 수 있다
