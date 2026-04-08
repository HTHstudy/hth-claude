# Next.js + FSD 적용 가이드

Next.js 프로젝트에서 이 아키텍처를 적용할 때의 추가 규칙.
**기본 원칙은 SKILL.md와 동일하다.** 이 문서는 Next.js 파일 기반 라우팅과 FSD 레이어 구조 간의 충돌을 해결하는 방법만 다룬다.

---

## 핵심 차이점

Next.js는 `app/` 또는 `pages/` 폴더로 라우팅을 정의한다. 이는 FSD의 `app`, `pages` 레이어와 이름이 충돌한다.

**해결 원칙:** Next.js 라우팅 폴더는 프로젝트 루트에, FSD 레이어는 `src/` 안에 배치한다.

---

## App Router (Next.js 13+)

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
│           ├── route.ts
│           └── [id]/
│               └── route.ts
├── pages/                      ← 빈 폴더 (Pages Router 폴백 방지용)
│   └── README.md
├── middleware.ts                ← 루트에 위치
├── instrumentation.ts          ← 루트에 위치
└── src/
    ├── app/                    ← FSD app 레이어
    │   ├── providers.tsx
    │   └── global.css
    ├── pages/                  ← FSD pages 레이어
    │   ├── home.tsx               ← 단순한 page
    │   ├── products.tsx           ← 상품 목록
    │   └── product-detail/        ← 복잡해지면 폴더로 분해
    │       ├── product-info.tsx
    │       ├── product-reviews.tsx
    │       ├── use-product-detail.ts
    │       └── index.tsx
    ├── widgets/                # optional
    ├── features/               # optional
    ├── entities/               # optional
    └── shared/
```

> pages 레이어 구조는 React와 동일하다. 단순하면 파일 하나, 복잡해지면 폴더로 분해하여 전용 상태/훅/컴포넌트를 직접 소유한다. 상세 규칙은 [pages.md](../layers/pages.md) 참조.

### re-export 패턴

Next.js `app/` 폴더의 `page.tsx`는 FSD page를 re-export만 한다. 로직을 직접 구현하지 않는다.

**기본: re-export** — 단순 렌더링만 하는 경우:

```typescript
// app/page.tsx
export { HomePage as default } from '@pages/home';

// app/products/page.tsx
export { ProductsPage as default } from '@pages/products';
```

**import + export default** — Next.js page 레벨 기능이 필요한 경우:

동적 라우트 params, `generateMetadata`, `generateStaticParams`, `searchParams`, 서버 사이드 데이터 로딩 등 Next.js 기능을 사용해야 하면 import 후 export default 패턴을 사용한다.

```typescript
// app/products/[id]/page.tsx
import { ProductDetailPage } from '@pages/product-detail';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProductDetailPage id={id} />;
}
```

`generateMetadata`에서 API 호출이 필요한 경우, 루트 `app/` 파일에서 `@shared/api`를 직접 import하는 것을 허용한다. Next.js가 `page.tsx`에서만 `generateMetadata`를 export할 수 있도록 강제하기 때문이다.

```typescript
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

### layout.tsx

루트 `app/layout.tsx`에서 FSD app 레이어의 providers와 global style을 조립한다.

```typescript
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

루트에 빈 `pages/` 폴더를 반드시 생성한다. Next.js가 Pages Router로 폴백하는 것을 방지한다.
`pages/README.md`에 이 폴더의 용도를 기재한다.

```markdown
<!-- pages/README.md -->
이 폴더는 비어 있어야 합니다.
Next.js가 Pages Router로 폴백하는 것을 방지하기 위해 존재합니다.
FSD pages 레이어는 src/pages/에 위치합니다.
```

---

## Next.js route와 FSD Slice 매핑

Next.js의 중첩 라우팅 구조와 FSD pages 레이어의 Slice는 1:1로 대응하지 않는다.
**FSD에서 각 route는 독립된 Slice다.** Next.js의 폴더 중첩이 FSD Slice의 폴더 중첩을 의미하지 않는다.

### 매핑 원칙

| Next.js route | 루트 `app/` 구조 | FSD `src/pages/` Slice |
|---------------|-----------------|----------------------|
| `/` | `app/page.tsx` | `pages/home.tsx` |
| `/products` | `app/products/page.tsx` | `pages/products.tsx` |
| `/products/[id]` | `app/products/[id]/page.tsx` | `pages/product-detail.tsx` |
| `/settings` | `app/settings/page.tsx` | `pages/settings.tsx` |
| `/settings/profile` | `app/settings/profile/page.tsx` | `pages/settings-profile.tsx` |

- **루트 `app/`은 Next.js 라우팅 구조를 따른다** (중첩 폴더).
- **`src/pages/`는 FSD 규칙을 따른다** (플랫한 Slice 구조). 각 Slice는 독립적이며, route의 폴더 중첩을 그대로 복제하지 않는다.
- Slice 이름은 route의 의미를 나타내는 kebab-case: `products`, `product-detail`, `settings-profile`
- 동일 도메인이라도 (`/products`와 `/products/[id]`) 각각 별도의 Slice로 관리한다. 같은 폴더에 넣지 않는다.

### 복잡해지면

Slice가 복잡해지면 React와 동일하게 폴더로 분해한다:

```txt
src/pages/
├─ products.tsx                    # 단순 — 파일 하나
└─ product-detail/                 # 복잡 — 폴더로 분해
   ├─ product-info.tsx
   ├─ product-reviews.tsx
   ├─ use-product-detail.ts
   └─ index.tsx
```

---

## Pages Router (Next.js 12 이하 또는 선택적 사용)

### 폴더 구조

```txt
├── app/                        ← 빈 폴더 (App Router 감지 방지용)
│   └── README.md
├── pages/                      ← Next.js Pages Router (루트)
│   ├── _app.tsx
│   ├── api/
│   │   └── example.ts
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
    │       ├── product-info.tsx
    │       ├── product-reviews.tsx
    │       ├── use-product-detail.ts
    │       └── index.tsx
    ├── widgets/                # optional
    ├── features/               # optional
    ├── entities/               # optional
    └── shared/
```

> app 레이어도 React와 동일하게 최소 구조로 시작한다. 파일이 늘어날 때만 폴더로 정리. 상세 규칙은 [app.md](../layers/app.md) 참조.

### re-export 패턴

```typescript
// pages/example/index.tsx
export { ExamplePage as default } from '@pages/example';
```

### Custom App

`_app.tsx`의 실제 구현은 FSD app 레이어에 둔다.

```typescript
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

루트에 빈 `app/` 폴더를 반드시 생성한다. Next.js가 `src/app/`을 App Router 디렉토리로 감지하여 "`pages` and `app` directories should be under the same folder" 빌드 에러를 일으키는 것을 방지한다.
`app/README.md`에 이 폴더의 용도를 기재한다.

```markdown
<!-- app/README.md -->
이 폴더는 비어 있어야 합니다.
Next.js가 src/app/을 App Router로 감지하여 빌드 에러를 일으키는 것을 방지하기 위해 존재합니다.
FSD app 레이어는 src/app/에 위치합니다.
```

---

## API Routes

API route는 **하나의 BE 서버로 취급**한다. FSD 레이어(`src/`) 바깥의 서버 영역이다.

### 핵심 규칙

- **API route는 자체 완결** — FSD 레이어(`src/`)를 import하지 않는다. 필요한 로직은 route 파일 안에서 처리한다.
- **API route 접근은 `shared/api`를 통해서만** — page 등에서 직접 fetch하지 않는다. `shared/api`에 도메인으로 정의하고 endpoint를 통해 HTTP로 호출한다.
- **기존 shared/api 3계층 구조 그대로 적용** — 도메인별 http-client의 baseURL만 다름 (`/api/...`).

### API route가 필요한 경우

서버에서만 가능한 로직이 있을 때만 사용한다:
- API 키, 인증 토큰 등 클라이언트에 노출하면 안 되는 것 보호
- DB 직접 접근 (별도 백엔드 없이 풀스택일 때)
- 서버 전용 로직 (이메일 발송, 파일 처리, PDF 생성 등)
- Webhook 수신
- 여러 외부 API를 서버에서 조합 (BFF)

### shared/api 도메인 구성 예시

API route와 외부 BE가 공존할 때:

```
shared/api/
├─ base/
│  ├─ base-http-client.ts
│  ├─ types.ts
│  └─ errors.ts
├─ internal/                       # API route (baseURL: '/api')
│  ├─ internal-http-client.ts
│  ├─ index.ts
│  └─ endpoints/
│     ├─ get-product-list.ts       #   /api/products
│     ├─ get-product-detail.ts     #   /api/products/:id
│     └─ get-cart.ts               #   /api/cart
├─ main/                           # 외부 메인 BE (baseURL: 'https://api.example.com')
│  ├─ main-http-client.ts
│  ├─ index.ts
│  └─ endpoints/
│     └─ get-user.ts
```

호출하는 쪽(page, query-factory)은 API route인지 외부 BE인지 구분할 필요 없이 `shared/api`만 바라본다.

### import 방향

```
app/api/  →  src/  ❌  (API route는 FSD 레이어를 import하지 않음)
src/      →  app/api/  ❌  (직접 import 금지, HTTP 호출로만 접근)
src/shared/api  →  fetch('/api/...')  ✅  (shared/api endpoint에서 HTTP 호출)
```

---

## 특수 파일 위치

| 파일 | 위치 | 비고 |
|------|------|------|
| `middleware.ts` | 프로젝트 루트 | Next.js 요구사항. `src/` 안에 둘 수 없음 |
| `instrumentation.ts` | 프로젝트 루트 | Next.js 요구사항 |
| `next.config.js` | 프로젝트 루트 | — |
| 빈 `pages/` 폴더 | 프로젝트 루트 | App Router 사용 시 필수 |
| 빈 `app/` 폴더 | 프로젝트 루트 | Pages Router 사용 시 필수 |

---

## SKILL.md 규칙과의 차이

### 구조 적용 시 체크리스트 변경

SKILL.md의 기본 체크리스트 대신 아래를 따른다:

**필수 구조:**
- [ ] 루트 `app/` (App Router) 또는 루트 `pages/` (Pages Router) 생성 — re-export 전용
- [ ] `src/app/` 생성 — providers.tsx, global.css
- [ ] `src/pages/` 생성 — 기존 화면을 route별 Slice로 재배치
- [ ] `src/shared/routes/paths.ts` 생성 — 경로 상수
- [ ] `src/shared/config/env.ts` 생성 — 환경변수 관리
- [ ] App Router 사용 시: 루트에 빈 `pages/` 폴더 + README.md 생성
- [ ] Pages Router 사용 시: 루트에 빈 `app/` 폴더 + README.md 생성

**필수 설정:**
- [ ] tsconfig path alias — 레이어별 alias만 허용(`@app/*`, `@pages/*`, `@shared/*` 등, `src/` 기준). 전체 소스를 잡는 포괄적 alias(`@/*` 등)는 사용하지 않는다. Next.js 기본 `@/*` alias가 있으면 제거한다.
- [ ] ESLint `no-restricted-imports` — [eslint-config.md](../rules/eslint-config.md)의 기본 템플릿 + "Next.js 프로젝트 추가 규칙" 섹션의 API route 차단 설정을 함께 적용한다

- [ ] `next.config.js` 설정

### 엔트리포인트

- React(Vite): `src/main.tsx`가 부팅 파일
- **Next.js: `src/main.tsx` 없음.** 루트 `app/layout.tsx` 또는 `pages/_app.tsx`가 엔트리 역할을 대신함 (실제 구현은 `src/app/`에 위치)

### Default Export

- SKILL.md 기본 규칙: Named Export 기본, Default Export는 프레임워크 요구 시만
- **Next.js에서는 `page.tsx`, `layout.tsx`, `route.ts`, `_app.tsx` 등이 Default Export를 요구한다.** 이 파일들은 FSD page를 re-export하는 얇은 래퍼이므로 Default Export를 사용한다.
- FSD 레이어 내부(`src/` 안)에서는 여전히 Named Export를 기본으로 한다.

---

## 주의사항

- **루트 `app/`과 `src/app/`을 혼동하지 않는다.** 루트는 Next.js 라우팅, `src/app/`은 FSD 레이어.
- **루트 라우트 파일에 로직을 구현하지 않는다.** re-export만 수행한다.
- FSD가 프론트엔드 아키텍처이므로, 복잡한 백엔드 로직은 별도 패키지(모노레포)로 분리를 권장한다.
- `shared/api`의 3계층 패턴은 동일하게 적용한다. Next.js의 서버 컴포넌트에서도 `shared/api`를 통해 데이터를 가져온다.
