# Project Config

> 프로젝트 부트스트랩 시 정착해야 하는 설정 규칙. 코드 컨벤션은 [conventions.md](./conventions.md), ESLint 규칙은 [eslint-config.md](./eslint-config.md)를 참조.

---

## Prettier

권장 옵션 — `.prettierrc`:

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

ESLint 설정에 `eslint-config-prettier`를 추가하여 충돌을 방지한다. 미설치 시 함께 설치한다.

**적용 정책:**

- 기존 Prettier 설정이 있으면 **그대로 둔다 (pass)**. 감지 대상: `.prettierrc`, `.prettierrc.{json,js,cjs,mjs,yaml,yml}`, `prettier.config.{js,cjs,mjs}`, `package.json`의 `prettier` 필드
- 없으면 위 권장 옵션으로 `.prettierrc`를 생성한다
- `eslint-config-prettier` 연동은 기존 설정 유무와 무관하게 항상 적용한다

---

## tsconfig paths

레이어별 path alias를 설정한다. `baseUrl`은 사용하지 않는다.

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

**baseUrl 미사용 근거:**

- TypeScript 6+ 권장 패턴 — `paths`만으로 alias가 동작
- TypeScript 7.0에서 `baseUrl` 자체가 제거 예정

**적용 정책:**

- `paths`만 추가/갱신한다. `compilerOptions`의 다른 옵션은 수정하지 않는다
- 기존 `baseUrl`이 있으면 제거 검토 대상으로 보고한다 (자동 제거 금지 — 사용자 확인 후 제거)
- `@/*` 같은 포괄 alias는 제거 검토 대상으로 보고한다 (레이어별 alias만 허용)
- 적용 대상 파일: 프로젝트의 메인 tsconfig
  - Vite — `tsconfig.app.json`
  - Next.js — `tsconfig.json`

---

## env.ts

환경변수 접근은 `src/shared/config/env.ts` 모듈에 중앙화한다. 컴포넌트나 다른 레이어에서 `import.meta.env`/`process.env`를 직접 참조하지 않는다.

**Vite:**

```ts
export const ENV = {
  API_URL: import.meta.env.VITE_API_URL as string,
} as const;
```

**Next.js:**

```ts
export const ENV = {
  API_URL: process.env.NEXT_PUBLIC_API_URL as string,
} as const;
```

**중앙화 근거:**

- 환경변수 키 변경/추가 시 변경점이 한 곳에 모임
- 타입 단언/검증을 한 곳에서 수행
- 컴포넌트는 `ENV.API_URL`로 접근 (런타임/빌드 환경에 비종속)

**적용 정책:**

- `src/shared/config/env.ts` 모듈을 생성한다. 프로젝트가 사용하는 환경변수 키에 맞춰 `ENV` 객체를 정의한다
- 사용 키가 없으면 빈 객체(`{} as const`)로 scaffold하고, 환경변수 추가 시점에 키를 정의한다
- 기존 코드에서 `import.meta.env`/`process.env`를 직접 참조하는 부분은 ENV 모듈 사용으로 리팩토링하는 것이 권장이다 (강제 아님 — 일정 고려)

---

## paths.ts

라우트 경로는 `src/shared/routes/`에 상수로 정의한다. 라우터 설정과 route-page 연결은 `app` 레이어 책임이며, 여기서는 경로 상수만 다룬다.

**기본 형태 — 단일 파일 (`src/shared/routes/paths.ts`):**

```ts
export const PATHS = {
  HOME: '/',
} as const;
```

**도메인별 분리도 허용:**

```
src/shared/routes/
├─ paths/
│  ├─ auth.ts
│  └─ admin.ts
└─ index.ts
```

라우트 수가 많아지거나 도메인 경계가 뚜렷해질 때 분리한다. 단일 파일에서 시작해 필요 시 분리하는 것이 권장.

**중앙화 근거:**

- 경로 변경/추가 시 변경점이 한 곳에 모임
- 라우터 설정(`app`)과 링크 사용처(`pages`/컴포넌트)가 같은 상수를 참조 → drift 방지
- 컴포넌트 prop에 path를 주입할 때도 `PATHS.X` 형식으로 일관 사용

**적용 정책:**

- 라우트가 하나라도 정의되면 필수
- 신규 프로젝트 — 빈 `PATHS` 객체로 scaffold
- 기존 프로젝트 — 하드코딩된 라우트 경로 문자열을 분석해 상수로 추출. 추출 대상이 없으면 빈 객체로 scaffold (라우트 추가 시점에 키 정의)
- `shared/ui/`는 `shared/routes/`를 import하지 않는다. 경로가 필요한 컴포넌트는 path를 props로 받는다 (이 규칙은 [shared.md](../layers/shared.md)에서 다룬다)
