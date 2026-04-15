# Next.js App Router 프로젝트 템플릿

## 버전 관리 정책

공급망 공격(Supply Chain Attack) 방지를 위해 의존성 설치 시 버전을 명시적으로 지정한다. 버전 조회는 `${CLAUDE_PLUGIN_ROOT}/scripts/resolve-versions.js` 스크립트를 사용한다.

- 스크립트는 npm registry에서 각 패키지의 stable 버전 중 **릴리스 후 14일 이상** 경과한 최신 버전을 자동 선택한다
- 결과는 `.resolved-versions.json`에 기록되며, 설치 완료 후 삭제한다
- `@latest`를 사용하지 않는다

## 기술 스택

| 항목 | 기술 |
|------|------|
| 프레임워크 | Next.js (App Router) |
| 언어 | TypeScript |
| 스타일링 | Tailwind CSS |
| 서버 상태 관리 | TanStack Query |
| HTTP 클라이언트 | Axios |
| 패키지 매니저 | 사용자 선택 (yarn / npm / pnpm) |
| 포매터 | Prettier |

## 실행 단계

> 아래 모든 설치/실행 명령은 사용자가 선택한 패키지 매니저를 사용한다.

### 1단계: 기본 프로젝트 생성

`create-next-app`으로 프로젝트를 생성하고 프로젝트 디렉토리로 이동한다. 선택된 패키지 매니저에 맞는 `--use-*` 플래그를 지정한다.

- `--typescript --tailwind --eslint --app` 옵션을 포함한다
- `--src-dir`는 사용하지 않는다. 루트 `app/`이 Next.js 라우팅 디렉토리가 되고, `src/`는 FSD 레이어 전용으로 수동 생성한다.
- `--import-alias`는 지정하지 않는다 — 5단계에서 레이어별 alias로 교체한다.

### 2단계: 추가 의존성 설치

1. 버전 조회 스크립트를 실행한다:
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/scripts/resolve-versions.js" @tanstack/react-query axios prettier eslint-config-prettier
   ```
2. `.resolved-versions.json`을 읽고 각 패키지의 `version` 값으로 설치한다:
   - **dependencies:** `@tanstack/react-query`, `axios`
   - **devDependencies:** `prettier`, `eslint-config-prettier`
3. `.resolved-versions.json`을 삭제한다

### 3단계: 아키텍처 구조로 재구성

Next.js의 기본 구조를 FSD 레이어드 아키텍처로 전환한다. 상세 규칙: [nextjs.md](../../architecture/integrations/nextjs.md)

> **핵심 원칙:** 루트 `app/`은 Next.js 라우팅 전용(re-export만), `src/`는 FSD 레이어 전용. 이 두 영역은 반드시 분리한다.

**최종 구조:**

```
[project-name]/
├─ app/                        # Next.js App Router (루트) — re-export 전용
│  ├─ layout.tsx               # src/app의 providers, global.css를 조립
│  └─ page.tsx                 # src/pages/home을 re-export
├─ pages/                      # 빈 폴더 (Pages Router 폴백 방지)
│  └─ README.md
├─ src/                        # FSD 레이어 (수동 생성)
│  ├─ app/                     # FSD app 레이어
│  │  ├─ providers.tsx         # QueryClientProvider (client component)
│  │  └─ global.css            # Tailwind: @import 'tailwindcss'
│  ├─ pages/                   # FSD pages 레이어
│  │  └─ home.tsx              # 홈 페이지
│  └─ shared/
│     ├─ api/
│     │  └─ base/
│     │     ├─ base-http-client.ts
│     │     ├─ errors.ts
│     │     └─ types.ts
│     ├─ config/
│     │  └─ env.ts
│     └─ routes/
│        └─ paths.ts
└─ ...설정 파일들
```

`shared/api/base/` 파일은 [http-client.md](../../architecture/rules/http-client.md)의 템플릿을 따라 생성한다.

**구체적 작업:**

1. `create-next-app`이 루트 `app/`에 생성한 파일들을 정리:
   - `app/globals.css` → 삭제 (아래에서 `src/app/global.css`로 대체)
   - `app/page.tsx` → re-export 패턴으로 교체
   - `app/page.module.css` → 삭제
   - `app/layout.tsx` → re-export 패턴으로 교체
   - `app/favicon.ico` → `public/`에 그대로 유지
2. `src/` 디렉토리 수동 생성 후 FSD 레이어 배치:
   - `src/app/` — providers.tsx, global.css
   - `src/pages/` — home.tsx
   - `src/shared/` — api, config, routes
3. 루트에 빈 `pages/` 폴더 + README.md 생성

### 4단계: 핵심 파일 작성

**루트 `app/layout.tsx`** — providers와 global style 조립 (re-export 역할):

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

import { environmentManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: 60 * 1000 },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

function getQueryClient() {
  if (environmentManager.isServer()) return makeQueryClient();
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

**`src/app/global.css`** — Tailwind:

```css
@import 'tailwindcss';
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

**경로 별칭** — `tsconfig.json`에서 `create-next-app`의 기본 `@/*` alias를 제거하고 레이어별 alias로 교체한다. `baseUrl`은 TypeScript 7.0에서 제거 예정이므로 사용하지 않는다. 기존 옵션은 수정하지 않는다:

```json
{
  "compilerOptions": {
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

**ESLint** — [eslint-config.md](../../architecture/rules/eslint-config.md)를 읽고, ESLint 버전에 맞는 템플릿(Flat Config 또는 Legacy Config)을 **그대로** 적용한다. Next.js 프로젝트이므로 "Next.js 프로젝트 추가 규칙" 섹션도 함께 적용한다.

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

**`src/shared/config/env.ts`** — 환경변수 접근을 중앙화:

```ts
export const ENV = {
  API_URL: process.env.NEXT_PUBLIC_API_URL as string,
} as const;
```

### 6단계: 검증

1. `npx tsc --noEmit` — 타입 에러 확인
2. lint 실행 — ESLint 규칙 위반 확인
3. build 실행 — 빌드 성공 확인
4. `npm audit` — 알려진 취약점 확인 (moderate 이상 발견 시 사용자에게 보고)

에러 발생 시 수정 후 재검증한다. 목표: 빌드 최대 2회.

### 7단계: 완료

사용자에게 개발 서버 시작 방법을 안내한다.
