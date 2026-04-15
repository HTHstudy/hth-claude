# React (Vite) 프로젝트 템플릿

## 버전 관리 정책

공급망 공격(Supply Chain Attack) 방지를 위해 의존성 설치 시 버전을 명시적으로 지정한다. 버전 조회는 `${CLAUDE_PLUGIN_ROOT}/scripts/resolve-versions.js` 스크립트를 사용한다.

- 스크립트는 npm registry에서 각 패키지의 stable 버전 중 **릴리스 후 14일 이상** 경과한 최신 버전을 자동 선택한다
- 결과는 `.resolved-versions.json`에 기록되며, 설치 완료 후 삭제한다
- `@latest`를 사용하지 않는다

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
| 패키지 매니저 | 사용자 선택 (yarn / npm / pnpm) |
| 포매터 | Prettier |

## 실행 단계

> 아래 모든 설치/실행 명령은 사용자가 선택한 패키지 매니저를 사용한다.

### 1단계: 기본 프로젝트 생성

선택된 패키지 매니저로 Vite + React + TypeScript 프로젝트를 생성하고 프로젝트 디렉토리로 이동한다.

### 2단계: 추가 의존성 설치

1. 버전 조회 스크립트를 실행한다:
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/scripts/resolve-versions.js" react-router @tanstack/react-query axios @tailwindcss/vite tailwindcss prettier eslint-config-prettier
   ```
2. `.resolved-versions.json`을 읽고 각 패키지의 `version` 값으로 설치한다:
   - **dependencies:** `react-router`, `@tanstack/react-query`, `axios`
   - **devDependencies:** `@tailwindcss/vite`, `tailwindcss`, `prettier`, `eslint-config-prettier`
3. `.resolved-versions.json`을 삭제한다

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
   │     ├─ base-http-client.ts
   │     ├─ errors.ts
   │     └─ types.ts
   ├─ config/
   │  └─ env.ts
   └─ routes/
      └─ paths.ts
```

- `shared/api/base/` 파일은 [http-client.md](../../architecture/rules/http-client.md)의 템플릿을 따라 생성
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

**ESLint** — [eslint-config.md](../../architecture/rules/eslint-config.md)를 읽고, ESLint 버전에 맞는 템플릿(Flat Config 또는 Legacy Config)을 **그대로** 적용한다.

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

### 5단계: 검증

1. `npx tsc --noEmit` — 타입 에러 확인
2. lint 실행 — ESLint 규칙 위반 확인
3. build 실행 — 빌드 성공 확인
4. `npm audit` — 알려진 취약점 확인 (moderate 이상 발견 시 사용자에게 보고)

에러 발생 시 수정 후 재검증한다. 목표: 빌드 최대 2회.

### 6단계: 완료

사용자에게 개발 서버 시작 방법을 안내한다.
