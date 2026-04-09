# React (Vite) 프로젝트 템플릿

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
| 빌드 도구 | Vite |
| UI 라이브러리 | React |
| 언어 | TypeScript |
| 스타일링 | Tailwind CSS |
| 라우팅 | React Router |
| 서버 상태 관리 | TanStack Query |
| HTTP 클라이언트 | Axios |
| 패키지 매니저 | Yarn |
| 포매터 | Prettier |

## 실행 단계

### 1단계: 기본 프로젝트 생성

```bash
yarn create vite [project-name] --template react-ts
cd [project-name]
```

### 2단계: 추가 의존성 설치

버전 관리 정책에 따라 각 패키지의 안정 버전을 조회한 뒤 설치한다.

```bash
yarn add react-router@^[조회버전] @tanstack/react-query@^[조회버전] axios@^[조회버전]
yarn add -D @tailwindcss/vite@^[조회버전] tailwindcss@^[조회버전] prettier@^[조회버전] eslint-config-prettier@^[조회버전]
```

### 3단계: 아키텍처 구조로 재구성

`src/`를 재구성하고 기본 파일을 제거한다:

```
src/
├─ main.tsx
├─ app/
│  ├─ App.tsx             # 루트: Providers + Router
│  ├─ providers.tsx       # QueryClientProvider
│  ├─ router.tsx          # BrowserRouter + Routes
│  └─ global.css          # Tailwind: @import 'tailwindcss'
├─ pages/
│  └─ home/
│     └─ index.tsx        # 홈 페이지
└─ shared/
   ├─ api/
   │  └─ base/
   │     └─ base-http-client.ts
   ├─ config/
   │  └─ env.ts
   └─ routes/
      └─ paths.ts
```

- Vite 기본 파일 제거: `App.css`, `index.css`, `App.tsx` (아키텍처 구조로 대체)
- `vite.config.ts` 수정: Tailwind 플러그인 추가 및 `resolve.tsconfigPaths: true` 설정
- `global.css` 수정: `@import 'tailwindcss'`

### 4단계: 설정

**경로 별칭** — `tsconfig.app.json`의 `compilerOptions`에 `paths`만 추가한다. `baseUrl`은 TypeScript 7.0에서 제거 예정이므로 사용하지 않는다. 기존 옵션은 수정하지 않는다:

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

**ESLint** — `no-restricted-imports` 규칙을 아래와 같이 **정확히** 추가한다:

```js
'no-restricted-imports': ['error', {
  patterns: [
    { group: ['@shared/api/*/*'], message: '@shared/api/[domain] 엔트리포인트를 사용하세요.' },
    { group: ['@pages/*/*'], message: '@pages/[page] 엔트리포인트를 사용하세요.' },
    { group: ['@widgets/*/*'], message: '@widgets/[widget] 엔트리포인트를 사용하세요.' },
    { group: ['@features/*/*'], message: '@features/[feature] 엔트리포인트를 사용하세요.' },
    { group: ['@entities/*/*'], message: '@entities/[entity] 엔트리포인트를 사용하세요.' },
  ],
}],
'@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
'import/no-default-export': 'error'
```

`src/main.tsx`는 Vite 엔트리포인트이므로 default export 예외 처리한다:

```js
// override: Vite 엔트리 파일
{
  files: ['src/main.tsx'],
  rules: {
    'import/no-default-export': 'off',
  },
}
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

**환경변수** — `.env` 생성:

```
# API base URL
# VITE_API_URL=http://localhost:5174/api
```

**`shared/config/env.ts`** — 환경변수 접근을 중앙화:

```ts
export const ENV = {
  API_URL: import.meta.env.VITE_API_URL as string,
} as const;
```

### 5단계: 완료

사용자에게 안내:
- `yarn dev`로 개발 서버를 시작할 수 있다
