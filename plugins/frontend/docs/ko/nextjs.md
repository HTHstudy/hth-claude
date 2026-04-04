# Next.js 적용 가이드

Next.js 프로젝트에서 이 아키텍처를 적용할 때 구조가 달라지는 이유와 방법을 설명합니다.

---

## 핵심 문제

Next.js는 `app/` 또는 `pages/` 폴더로 파일 기반 라우팅을 정의합니다. 이 이름은 FSD의 `app`, `pages` 레이어와 충돌합니다.

**해결 원칙:** Next.js 라우팅 폴더는 프로젝트 루트에, FSD 레이어는 `src/` 안에 배치하여 분리합니다.

| 위치 | 역할 |
|------|------|
| 루트 `app/` 또는 `pages/` | Next.js 라우팅 (re-export 전용) |
| `src/app/` | FSD app 레이어 (providers, global style) |
| `src/pages/` | FSD pages 레이어 (화면 모듈) |
| `src/shared/` | FSD shared 레이어 |

루트 라우팅 파일에는 로직을 구현하지 않습니다. FSD 레이어의 코드를 re-export하는 얇은 래퍼 역할만 합니다.

---

## App Router 구조

```
├── app/                        ← Next.js App Router (루트)
│   ├── layout.tsx
│   ├── page.tsx
│   └── products/
│       ├── page.tsx
│       └── [id]/
│           └── page.tsx
├── pages/                      ← 빈 폴더 (Pages Router 폴백 방지)
│   └── README.md
└── src/
    ├── app/                    ← FSD app 레이어
    │   ├── providers.tsx
    │   └── global.css
    ├── pages/                  ← FSD pages 레이어
    │   ├── home.tsx
    │   ├── products.tsx
    │   └── product-detail/
    │       └── index.tsx
    └── shared/
```

### re-export 패턴

루트 `app/`의 `page.tsx`는 FSD page를 re-export만 합니다.

```ts
// app/page.tsx
export { HomePage as default } from '@pages/home';

// app/products/page.tsx
export { ProductsPage as default } from '@pages/products';

// app/products/[id]/page.tsx
export { ProductDetailPage as default } from '@pages/product-detail';
```

### layout.tsx

루트 `app/layout.tsx`에서 FSD app 레이어의 providers와 global style을 조립합니다.

```ts
// app/layout.tsx
import '@app/global.css';
import { Providers } from '@app/providers';

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

### 빈 pages 폴더

루트에 빈 `pages/` 폴더를 생성합니다. Next.js가 Pages Router로 폴백하는 것을 방지하기 위해 필요합니다.

---

## Pages Router 구조

```
├── app/                        ← 빈 폴더 (App Router 감지 방지)
│   └── README.md
├── pages/                      ← Next.js Pages Router (루트)
│   ├── _app.tsx
│   └── example/
│       └── index.tsx
└── src/
    ├── app/                    ← FSD app 레이어
    │   ├── custom-app.tsx
    │   ├── providers.tsx
    │   └── global.css
    ├── pages/                  ← FSD pages 레이어
    │   ├── home.tsx
    │   └── product-detail/
    │       └── index.tsx
    └── shared/
```

### re-export 패턴

```ts
// pages/example/index.tsx
export { ExamplePage as default } from '@pages/example';
```

### Custom App

`_app.tsx`의 실제 구현은 FSD app 레이어에 둡니다.

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

### 빈 app 폴더

루트에 빈 `app/` 폴더를 생성합니다. Next.js가 `src/app/`을 App Router로 감지하여 빌드 에러를 일으키는 것을 방지하기 위해 필요합니다.

---

## Route와 Slice 매핑

Next.js의 중첩 라우팅 구조와 FSD pages 레이어의 Slice는 1:1로 대응하지 않습니다. FSD에서는 각 route가 독립된 Slice입니다. Next.js의 폴더 중첩을 FSD Slice에서 그대로 복제하지 않습니다.

| Next.js route | 루트 `app/` 구조 | FSD `src/pages/` Slice |
|---------------|-----------------|----------------------|
| `/` | `app/page.tsx` | `pages/home.tsx` |
| `/products` | `app/products/page.tsx` | `pages/products.tsx` |
| `/products/[id]` | `app/products/[id]/page.tsx` | `pages/product-detail.tsx` |
| `/settings` | `app/settings/page.tsx` | `pages/settings.tsx` |
| `/settings/profile` | `app/settings/profile/page.tsx` | `pages/settings-profile.tsx` |

- **루트 라우팅 폴더**는 Next.js 라우팅 구조를 따릅니다 (중첩 폴더).
- **`src/pages/`**는 FSD 규칙을 따릅니다 (플랫한 Slice 구조).
- 동일 도메인이라도 (`/products`와 `/products/[id]`) 각각 별도의 Slice로 관리합니다.

---

## API Routes

API Routes는 FSD 레이어와 무관한 **서버 영역**입니다. 하나의 백엔드 서버로 취급합니다.

### import 방향

```
app/api/  →  src/  ❌  API route는 FSD 레이어를 import하지 않음
src/      →  app/api/  ❌  직접 import 금지
src/shared/api  →  fetch('/api/...')  ✅  HTTP 호출로만 접근
```

- API route는 자체 완결적입니다. 필요한 로직은 route 파일 안에서 처리합니다.
- 프론트엔드에서 API route에 접근할 때는 `shared/api`를 통해 HTTP로 호출합니다. 코드를 직접 import하지 않습니다.
- `shared/api`의 3계층 구조를 그대로 적용합니다. baseURL만 `/api/...`로 다를 뿐입니다.

### 언제 사용하나

서버에서만 가능한 로직이 있을 때만 사용합니다:
- API 키, 인증 토큰 등 클라이언트에 노출하면 안 되는 것 보호
- DB 직접 접근 (별도 백엔드 없이 풀스택일 때)
- 서버 전용 로직 (이메일 발송, 파일 처리 등)
- Webhook 수신, 여러 외부 API를 서버에서 조합 (BFF)
