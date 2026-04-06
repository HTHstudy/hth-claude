# React (Vite) 프로젝트 템플릿

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

```bash
yarn add react-router @tanstack/react-query axios
yarn add -D @tailwindcss/vite tailwindcss prettier eslint-config-prettier
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
- `vite.config.ts` 수정: Tailwind 플러그인 추가, `resolve.tsconfigPaths` 활성화
- `global.css` 수정: `@import 'tailwindcss'`

### 4단계: 설정

**경로 별칭** — `tsconfig.app.json`에 추가:

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

**환경변수** — `.env` 생성:

```
# API base URL
# VITE_API_URL=http://localhost:5174/api
```

### 5단계: 완료

사용자에게 안내:
- `yarn dev`로 개발 서버를 시작할 수 있다
