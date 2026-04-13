# Next.js App Router 프로젝트 템플릿

## 버전 관리 정책

공급망 공격(Supply Chain Attack) 방지를 위해 의존성 설치 시 버전을 명시적으로 지정한다.

**설치 전 버전 조회 절차:**
1. 아래 명령으로 각 패키지의 최신 stable 버전과 릴리스 날짜를 확인한다:
   ```bash
   npm view [패키지명] time --json | jq 'to_entries | map(select(.key | test("^[0-9]"))) | sort_by(.value) | last'
   ```
2. 릴리스일이 **2주 이상** 경과한 버전 중 가장 최신 버전을 선택한다
3. 2주 이내 릴리스만 있으면 그 직전 버전을 사용한다
4. `@latest`를 사용하지 않는다
5. 선택한 버전을 `yarn add 패키지명@^X.Y.Z` 형태로 설치한다

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

버전 관리 정책에 따라 `next` 패키지의 안정 버전을 조회한 뒤 실행한다.

```bash
npx create-next-app@[조회버전] [project-name] --typescript --tailwind --eslint --app --use-yarn
cd [project-name]
```

> `--src-dir`는 사용하지 않는다. 루트 `app/`이 Next.js 라우팅 디렉토리가 되고, `src/`는 FSD 레이어 전용으로 수동 생성한다.
> `--import-alias`는 지정하지 않는다 — 5단계에서 레이어별 alias로 교체한다.

### 2단계: 추가 의존성 설치

버전 관리 정책에 따라 각 패키지의 안정 버전을 조회한 뒤 설치한다.

```bash
yarn add @tanstack/react-query@^[조회버전] axios@^[조회버전]
yarn add -D prettier@^[조회버전] eslint-config-prettier@^[조회버전]
```

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
│     │     └─ base-http-client.ts
│     ├─ config/
│     │  └─ env.ts
│     └─ routes/
│        └─ paths.ts
└─ ...설정 파일들
```

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
2. `yarn lint` — ESLint 규칙 위반 확인
3. `yarn build` — 빌드 성공 확인

에러 발생 시 수정 후 재검증한다. 목표: 빌드 최대 2회.

### 7단계: 완료

사용자에게 안내:
- `yarn dev`로 개발 서버를 시작할 수 있다
