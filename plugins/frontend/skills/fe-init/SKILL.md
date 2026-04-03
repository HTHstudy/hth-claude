---
name: fe-init
description: 레이어드 아키텍처가 적용된 새 프론트엔드 프로젝트를 생성한다. Vite + React + TypeScript 기반.
---

# 프론트엔드 프로젝트 생성

레이어드 아키텍처가 적용된 새 프론트엔드 프로젝트를 생성한다.

## 사전 요구사항

이 스킬 실행 전 `/frontend:architecture` 스킬을 반드시 로드한다.

---

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

### 1단계: 프로젝트 이름 확인

사용자에게 프로젝트 이름을 물어본다.

### 2단계: 기본 프로젝트 생성

```bash
yarn create vite [project-name] --template react-ts
cd [project-name]
```

### 3단계: 추가 의존성 설치

```bash
yarn add react-router @tanstack/react-query axios
yarn add -D @tailwindcss/vite tailwindcss prettier eslint-config-prettier
```

### 4단계: 아키텍처 구조로 재구성

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

### 5단계: 설정

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

**ESLint** — `no-restricted-imports` 규칙 추가:

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

### 6단계: 완료

사용자에게 안내:
- `yarn dev`로 개발 서버를 시작할 수 있다

### 주의사항

- `widgets/`, `features/`, `entities/` 디렉토리를 생성하지 않는다. 필요할 때만 도입하는 선택 레이어다.
- Vite 템플릿의 기본 파일(기본 CSS, 플레이스홀더 콘텐츠 등)을 제거한다.

### 팁

API 응답이 통일된 형식(예: 모든 API가 `{ data: T }`를 반환)을 따른다면, `shared/api/base/types.ts`에 공통 응답 타입을 정의한다:

```ts
export type DefaultResponse<T> = {
  data: T;
};
```
