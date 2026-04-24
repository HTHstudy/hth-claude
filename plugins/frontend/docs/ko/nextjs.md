# Next.js 적용

이 문서는 Next.js 프로젝트에서 이 아키텍처를 적용할 때 달라지는 점을 다룬다. React(Vite)에서는 특별한 제약 없이 그대로 적용되지만, Next.js는 파일 기반 라우팅 구조가 이 아키텍처의 `app`·`pages` 레이어와 이름이 충돌한다.

이 문서가 답하는 질문은 하나다 — **Next.js의 라우팅 폴더와 이 아키텍처의 레이어 폴더를 어떻게 공존시키는가.**

---

## 핵심 문제와 해결 원칙

Next.js는 라우팅을 **폴더 이름으로 정의**한다. App Router를 쓰면 루트의 `app/` 폴더가, Pages Router를 쓰면 루트의 `pages/` 폴더가 라우트 정의 공간이 된다. 이 두 이름은 이 아키텍처의 `app` 레이어(앱 조립), `pages` 레이어(화면 모듈)와 그대로 충돌한다.

**해결 원칙**은 단순하다.

- **Next.js 라우팅 폴더는 프로젝트 루트에 둔다** — `<root>/app/`, `<root>/pages/`
- **아키텍처 레이어는 `src/` 안에 둔다** — `src/app/`, `src/pages/`, `src/shared/` 등
- **루트 라우팅 파일에는 로직을 구현하지 않는다** — 아키텍처 레이어의 구현을 re-export하는 얇은 래퍼 역할만 한다

이 분리를 지키면 "라우팅은 루트, 레이어는 `src/`"라는 원칙이 한 줄로 일관된다.

---

## App Router

### 폴더 구조

```txt
├── app/                        ← Next.js App Router (루트)
│   ├── layout.tsx
│   ├── page.tsx
│   ├── products/
│   │   ├── page.tsx
│   │   └── [id]/
│   │       └── page.tsx
│   └── api/
│       └── products/
│           └── route.ts
├── pages/                      ← 빈 폴더 (Pages Router 폴백 방지)
│   └── README.md
├── middleware.ts                ← 루트 전용
├── instrumentation.ts           ← 루트 전용
└── src/
    ├── app/                    ← 아키텍처 app 레이어
    │   ├── providers.tsx
    │   └── global.css
    ├── pages/                  ← 아키텍처 pages 레이어
    │   ├── home.tsx
    │   ├── products.tsx
    │   └── product-detail/
    │       └── index.tsx
    ├── widgets/                ← 선택
    ├── features/               ← 선택
    ├── entities/               ← 선택
    └── shared/
```

### 기본 re-export 패턴

루트 `app/`의 `page.tsx`는 **아키텍처 page를 re-export만 한다.** 로직을 직접 구현하지 않는다.

```ts
// app/page.tsx
export { HomePage as default } from '@pages/home';

// app/products/page.tsx
export { ProductsPage as default } from '@pages/products';
```

re-export 패턴이 유지되면 라우팅 폴더는 "어떤 route가 어떤 page에 연결되는가"만 보여주고, 실제 화면 구현은 `src/pages/` 안에 유지된다.

### Next.js 기능이 필요할 때

동적 라우트 params, `generateMetadata`, `generateStaticParams`, `searchParams`, 서버 사이드 데이터 로딩 등 Next.js의 page 레벨 기능을 쓰려면 re-export만으로는 부족하다. 이 경우 import 후 export default 패턴을 쓴다.

```ts
// app/products/[id]/page.tsx
import { ProductDetailPage } from '@pages/product-detail';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProductDetailPage id={id} />;
}
```

Next.js 훅과 params는 루트 파일에서 처리하고, 값을 props로 넘겨 아키텍처 page에 전달한다. 이렇게 하면 아키텍처 page는 Next.js 의존성 없이 유지되고, 루트 파일은 Next.js 전용 관심사만 담는다.

### generateMetadata 예외

`generateMetadata`에서 API 호출이 필요한 경우, 루트 `app/` 파일에서 `@shared/api`를 직접 import하는 것을 허용한다. Next.js가 `page.tsx`에서만 `generateMetadata`를 export할 수 있게 강제하기 때문에 생기는 예외다.

```ts
// app/products/[id]/page.tsx
import { ProductDetailPage } from '@pages/product-detail';
import { PRODUCT_API } from '@shared/api/product';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProductDetailPage id={id} />;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await PRODUCT_API.getProduct({ id });
  return { title: product.name, description: product.description };
}
```

이 예외가 없으면 `generateMetadata` 안의 API 호출을 다른 파일로 옮길 수 없다. 루트 라우팅 파일에서 `@shared/api`를 import하는 것이 허용되는 유일한 경우다.

### layout.tsx

루트 `app/layout.tsx`에서 아키텍처 `app` 레이어의 providers와 global style을 조립한다.

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

루트 `layout.tsx`는 Next.js의 HTML 셸을 담당하고, 실제 Provider 합성과 global style 정의는 아키텍처 `app` 레이어에 남긴다. 이 경계가 유지되어야 `src/app/`이 Next.js 외 환경으로도 이식 가능한 조립 로직을 유지한다.

### 빈 pages 폴더

App Router를 쓸 때, 루트에 **빈 `pages/` 폴더를 반드시 생성한다.** Next.js가 Pages Router로 폴백하는 것을 방지하기 위한 장치다. 폴더 안에 README를 두어 "비어 있어야 하는 이유"를 기재한다.

```markdown
<!-- pages/README.md -->
이 폴더는 비어 있어야 합니다.
Next.js가 Pages Router로 폴백하는 것을 방지하기 위해 존재합니다.
아키텍처 pages 레이어는 src/pages/에 위치합니다.
```

---

## Pages Router

### 폴더 구조

```txt
├── app/                        ← 빈 폴더 (App Router 감지 방지)
│   └── README.md
├── pages/                      ← Next.js Pages Router (루트)
│   ├── _app.tsx
│   ├── api/
│   │   └── example.ts
│   └── example/
│       └── index.tsx
└── src/
    ├── app/                    ← 아키텍처 app 레이어
    │   ├── custom-app.tsx
    │   ├── providers.tsx
    │   └── global.css
    ├── pages/                  ← 아키텍처 pages 레이어
    ├── widgets/                ← 선택
    ├── features/               ← 선택
    ├── entities/               ← 선택
    └── shared/
```

### re-export 패턴

```ts
// pages/example/index.tsx
export { ExamplePage as default } from '@pages/example';
```

### Custom App

`_app.tsx`의 실제 구현은 아키텍처 `app` 레이어에 둔다. 루트 `pages/_app.tsx`는 re-export만 한다.

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

Pages Router를 쓸 때, 루트에 **빈 `app/` 폴더를 반드시 생성한다.** Next.js가 `src/app/`을 App Router 디렉토리로 감지하면 "pages and app directories should be under the same folder" 빌드 에러가 난다. 루트의 빈 `app/`이 감지 대상이 되어 이 에러를 피한다.

```markdown
<!-- app/README.md -->
이 폴더는 비어 있어야 합니다.
Next.js가 src/app/을 App Router로 감지하여 빌드 에러를 일으키는 것을 방지하기 위해 존재합니다.
아키텍처 app 레이어는 src/app/에 위치합니다.
```

---

## Route와 Slice 매핑

Next.js의 **중첩 라우팅 구조와 아키텍처 Slice는 1:1로 대응하지 않는다.** 라우팅의 폴더 중첩이 Slice의 폴더 중첩을 의미하지 않는다는 뜻이다.

| Next.js route | 루트 `app/` 구조 | 아키텍처 `src/pages/` Slice |
|---------------|-----------------|---------------------------|
| `/` | `app/page.tsx` | `pages/home.tsx` |
| `/products` | `app/products/page.tsx` | `pages/products.tsx` |
| `/products/[id]` | `app/products/[id]/page.tsx` | `pages/product-detail.tsx` |
| `/settings` | `app/settings/page.tsx` | `pages/settings.tsx` |
| `/settings/profile` | `app/settings/profile/page.tsx` | `pages/settings-profile.tsx` |

루트 라우팅 폴더는 Next.js 라우팅 구조(중첩 폴더)를 따르고, `src/pages/`는 아키텍처 규칙(평면 Slice 구조)을 따른다. 동일 도메인이라도 `/products`와 `/products/[id]`는 각각 별도의 Slice로 관리한다. 같은 폴더에 넣지 않는다.

Slice 이름은 route의 의미를 나타내는 kebab-case다: `products`, `product-detail`, `settings-profile`. 내부 구조가 복잡해지면 pages 레이어의 일반 규칙에 따라 폴더 Slice로 승격한다.

---

## API Routes

API Route는 이 아키텍처 레이어와 **무관한 서버 영역**이다. `src/` 바깥에 위치하는 하나의 백엔드 서버로 취급한다.

### 핵심 규칙

- **API route는 자체 완결**이다. 아키텍처 레이어(`src/`)를 import하지 않는다. 필요한 로직은 route 파일 안에서 처리한다.
- **API route 접근은 `shared/api`를 통해서만** 이루어진다. page에서 `fetch('/api/...')`를 직접 호출하지 않는다. `shared/api`에 도메인으로 정의하고, 그 도메인의 endpoint가 HTTP로 호출한다.
- **[shared-api](shared-api.md)의 3계층 구조를 그대로 적용한다.** baseURL만 `/api/...`로 다를 뿐이다.

### import 방향

```txt
app/api/  →  src/            ❌  API route는 아키텍처 레이어를 import하지 않음
src/      →  app/api/        ❌  직접 import 금지
src/shared/api  →  fetch('/api/...')   ✅  HTTP 호출로만 접근
```

### shared/api 도메인 구성 예

API route와 외부 백엔드가 공존하는 프로젝트에서는 각각을 별도 도메인으로 둔다. 호출하는 쪽(page, query-factory)은 목적지가 API route인지 외부 BE인지 구분할 필요 없이 `shared/api`만 바라본다.

```txt
shared/api/
├─ base/
├─ internal/                       # API route — baseURL: '/api'
│  ├─ internal-http-client.ts
│  ├─ index.ts
│  └─ endpoints/
│     ├─ get-product-list.ts       #   /api/products
│     └─ get-cart.ts               #   /api/cart
├─ main/                           # 외부 메인 BE — baseURL: 'https://api.example.com'
│  ├─ main-http-client.ts
│  ├─ index.ts
│  └─ endpoints/
│     └─ get-user.ts
```

### API Route가 필요한 경우

서버에서만 가능한 로직이 있을 때만 API Route를 쓴다.

- API 키, 인증 토큰 등 클라이언트에 노출하면 안 되는 것 보호
- DB 직접 접근 (별도 백엔드 없이 풀스택 구성)
- 서버 전용 로직 (이메일 발송, 파일 처리, PDF 생성 등)
- Webhook 수신
- 여러 외부 API를 서버에서 조합 (BFF)

프론트엔드 편의를 위해 API Route를 프록시로만 쓰는 것은 권장하지 않는다. 외부 BE에 직접 호출할 수 있다면 `shared/api` 도메인으로 바로 연결한다.

---

## 특수 파일 위치

Next.js가 프로젝트 루트에 두기를 요구하는 파일이 있다. 이들은 `src/`로 옮길 수 없다.

| 파일 | 위치 | 비고 |
|------|------|------|
| `middleware.ts` | 프로젝트 루트 | Next.js 요구사항 |
| `instrumentation.ts` | 프로젝트 루트 | Next.js 요구사항 |
| `next.config.js` | 프로젝트 루트 | — |
| 빈 `pages/` | 프로젝트 루트 | App Router 사용 시 필수 |
| 빈 `app/` | 프로젝트 루트 | Pages Router 사용 시 필수 |

---

## 기본 규칙과의 차이

### path alias

tsconfig path alias는 `src/` 기준으로 설정한다. 레이어별 alias만 허용한다 — `@app/*`, `@pages/*`, `@shared/*` 등. 전체 소스를 잡는 포괄적 alias(`@/*`)는 쓰지 않는다. Next.js 기본 템플릿이 `@/*` alias를 만들어주면 제거한다.

### Default Export

기본 규칙은 Named Export이고 Default Export는 프레임워크 요구 시에만 허용된다. Next.js에서는 `page.tsx`, `layout.tsx`, `route.ts`, `_app.tsx` 등이 Default Export를 요구한다. 이 파일들은 아키텍처 page를 re-export하는 얇은 래퍼이므로 Default Export를 사용한다.

아키텍처 레이어 내부(`src/` 안)에서는 여전히 Named Export가 기본이다.

### 엔트리포인트

React(Vite)는 `src/main.tsx`가 부팅 파일이다. Next.js는 `main.tsx`를 두지 않는다. 루트 `app/layout.tsx` 또는 `pages/_app.tsx`가 엔트리 역할을 대신하고, 실제 조립 구현은 `src/app/`에 위치한다.

---

## 정리

- 라우팅은 루트, 레이어는 `src/`. 두 공간을 섞지 않는다.
- 루트 라우팅 파일은 re-export 전용. Next.js 기능이 필요하면 import 후 export default로 래핑.
- `generateMetadata`는 예외 — 루트에서 `@shared/api` 직접 import 허용.
- Next.js 라우팅 중첩을 Slice 구조에 복제하지 않는다. Slice는 평면.
- API Route는 서버 영역. `src/`를 import하지 않고, `shared/api`가 HTTP로 호출한다.
- App Router 사용 시 빈 `pages/`, Pages Router 사용 시 빈 `app/`을 루트에 둔다.
