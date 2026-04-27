# Foundations

이 문서는 이후 모든 문서가 사용하는 어휘를 정의한다. 레이어란 무엇이고, Slice와 Segment는 어떻게 다르며, import가 왜 단방향인지가 이 문서의 범위다.

---

## 왜 레이어를 나누는가

프론트엔드 코드는 시간이 흐르며 자연스럽게 커진다. 한 파일이 담당하던 화면이 여러 컴포넌트로 나뉘고, 두 화면이 같은 표시 로직을 쓰게 되고, 서버 호출이 여러 곳에서 필요해진다. 이 흐름을 규칙 없이 따라가면 **누가 누구를 참조하는지 예측할 수 없는 상태**에 빠진다. 한 곳의 수정이 어디까지 영향을 주는지 알 수 없고, 추상화는 언제 해도 이르거나 늦는 것처럼 느껴진다.

레이어는 이 문제를 **책임의 축**으로 푼다. 각 레이어에는 고유한 책임이 있고, 의존은 한 방향으로만 흐른다. 같은 레이어 안에서도 비즈니스 영역이 섞이지 않도록 한 번 더 나눈다. 그 결과 "이 코드는 어디에 두는가"라는 질문에 항상 같은 기준으로 답할 수 있게 된다.

---

## 레이어

아키텍처는 여섯 개 레이어로 구성된다.

| 레이어 | 역할 |
|--------|------|
| `app` | 애플리케이션을 실행 가능한 형태로 조립한다. 라우팅 설정, 전역 Provider, 전역 스타일, 초기화 로직이 여기에 온다. |
| `pages` | 각 route에 대응하는 화면 모듈. 전용 상태·훅·컴포넌트·도메인 로직을 직접 소유한다. |
| `widgets` (선택) | 여러 page에서 반복되는 독립적 복합 UI 블록. |
| `features` (선택) | 여러 page에서 반복되는 사용자 인터랙션 단위. UI + 로직(상태, 검증, API 트리거)을 함께 소유한다. |
| `entities` (선택) | 프론트엔드 도메인 표현. 도메인 특화 UI, 표시 로직(label/color 매핑), 검증. API는 소유하지 않는다. |
| `shared` | 앱의 기반이 되는 범용 도구·값. business-agnostic한 코드만 둔다. |

`widgets`, `features`, `entities`는 **선택**이다. 프로젝트는 `app / pages / shared` 세 레이어로 시작하고, 실제 반복이 발생한 뒤에야 필요한 레이어를 하나씩 도입한다. 셋이 서로 독립적이므로, 특정 레이어만 도입하고 다른 둘은 도입하지 않는 상태도 정상이다.

`main.tsx`는 레이어가 아니다. 앱을 DOM에 마운트하는 부팅 파일로, `app/` 바깥의 `src/` 루트에 둔다.

```txt
src/
├─ main.tsx        ← app 바깥, 부팅 전용
├─ app/
├─ pages/
├─ widgets/        ← 필요 시
├─ features/       ← 필요 시
├─ entities/       ← 필요 시
└─ shared/
```

---

## 계급과 방향

레이어에는 **계급**이 있다. 위에서 아래로: `app`이 가장 위, `shared`가 가장 아래다.

```txt
app → pages → (widgets → features → entities →) shared
```

**의존은 이 방향으로만 흐른다.** 위쪽 레이어는 아래쪽 레이어를 import할 수 있고, 아래쪽은 위쪽을 참조할 수 없다. `shared`는 다른 어떤 레이어도 import하지 않는다. `app`은 모든 레이어를 import할 수 있다.

선택 레이어는 도입된 만큼만 체인에 포함된다. `widgets`를 도입하지 않으면 `features`는 바로 `pages` 아래에서 참조된다. 도입된 체인은 항상 위 순서를 유지한다.

이 방향 규칙이 아키텍처의 기본 뼈대다. 어떤 코드든 자기 레이어보다 위를 참조하지 않는다는 사실이, 변경의 영향 범위가 아래로만 퍼진다는 보장을 만든다.

---

## Slice

레이어 안에서도 코드가 섞이지 않도록 한 번 더 나눈다. **Slice는 `pages`·`widgets`·`features`·`entities` 레이어 내부를 비즈니스 도메인별로 나눈 단위다.**

pages에서는 각 route가 하나의 Slice가 된다. `home`, `product-detail`, `settings-profile` 같은 이름이다. widgets에서는 `header`, `sidebar` 같은 UI 블록이, features에서는 `add-to-cart`, `auth-form` 같은 인터랙션 단위가, entities에서는 `product`, `user` 같은 도메인 개체가 Slice가 된다.

Slice는 **자족적 모듈**이다. 전용 상태·훅·컴포넌트·로직을 직접 소유한다. 간단하면 파일 한 개, 하위 종속이 생기면 폴더 + `index.tsx`로 승격한다.

```txt
pages/
├─ home.tsx                    ← 단일 파일 Slice (하위 종속 없음)
└─ product-detail/             ← 폴더 Slice (하위 종속 있음)
   ├─ product-info.tsx
   ├─ product-reviews.tsx
   ├─ use-product-detail.ts
   └─ index.tsx
```

### Slice 경계의 의미

Slice는 "같은 레이어의 다른 Slice를 참조할 수 없다"는 규칙과 함께 의미를 얻는다. page-a가 page-b의 내부 모듈을 가져다 쓰지 않고, feature-a가 feature-b를 참조하지 않는다. 이 제약이 Slice를 독립 단위로 유지하고, 한 Slice의 수정이 같은 레이어의 다른 Slice로 새지 않도록 한다.

같은 레이어의 두 Slice가 코드를 공유하고 싶어지는 순간은 **더 넓은 공유 범위로 이동할 시점을 알리는 신호**다. 두 page가 같은 도메인 UI를 쓴다면 `entities`로, 같은 인터랙션을 쓴다면 `features`로, 같은 복합 UI 블록을 쓴다면 `widgets`로 이동을 검토한다.

### Slice 문맥

**Slice 문맥**은 해당 Slice 고유의 상태·context·도메인 의미를 가리키는 용어다. 특정 Slice 상태를 내부에서 참조하거나, 특정 Slice의 도메인 타입을 요구하는 코드는 Slice 문맥에 결합되어 있다. 이런 코드는 Slice 바깥으로 이동하지 않는다. 추출·이동의 조건을 따질 때 반복해서 등장하는 용어다.

### Slice가 없는 레이어

`app`과 `shared`는 Slice를 가지지 않는다. `app`은 앱 수준의 실행 환경을 조립하는 단일 관심사이고, `shared`는 비즈니스 도메인이 없는 범용 영역이므로 Slice로 나눌 기준이 없다.

---

## Segment

`shared`는 Slice 대신 **Segment**로 구성한다. Segment는 책임 단위로 묶은 shared 내부의 하위 폴더다.

```txt
shared/
├─ api/               ← 백엔드와의 연결
├─ ui/                ← 범용 UI 컴포넌트
├─ lib/               ← 주제별 내부 라이브러리 (date, text, css 등)
├─ hooks/             ← 인프라 수준 커스텀 훅
├─ config/            ← 환경변수, Feature Flag
├─ routes/            ← 라우트 경로 상수
├─ i18n/              ← 번역 설정
├─ assets/            ← 이미지, 폰트 등 정적 리소스
├─ query-factory/     ← TanStack Query 쿼리 팩토리 (TanStack Query 사용 시)
└─ mutation-factory/  ← TanStack Query 뮤테이션 팩토리 (TanStack Query 사용 시)
```

Segment 이름은 **그 폴더가 무엇을 하는지** 명확히 드러내야 한다. `components`, `types`처럼 그 안에 무엇이 들어있는지 알 수 없는 이름은 쓰지 않는다. 필요에 따라 새 Segment를 추가할 수 있고, 모든 Segment가 필수는 아니다.

`shared`에는 비즈니스 Slice 경계가 없지만 **책임 경계는 있다**. Segment 간에도 의존 방향이 있다 — 이는 [shared](shared.md) 문서에서 다룬다.

---

## import 규칙

위에서 설명한 계급과 Slice·Segment 개념이 합쳐져 import 규칙이 된다.

**레이어 방향.** 하나의 Slice 안에서 작성된 코드는 자신이 속한 레이어보다 아래 레이어의 Slice만 import할 수 있다. 같은 레이어 혹은 위쪽 레이어는 참조하지 않는다.

**같은 레이어 Slice 간 금지.** 같은 레이어의 다른 Slice를 import할 수 없다. 공유가 필요하면 더 넓은 공유 범위로 추출한다.

---

## Entrypoint와 path alias

### Entrypoint

**Slice 외부에서는 Slice의 내부 파일을 직접 import하지 않는다.** 각 Slice의 entrypoint만 통해 접근한다. 여기서 entrypoint는 특정 파일 이름이 아니라 **"외부로 공개되는 유일한 접근 지점"이라는 개념**이다. 실제 형태는 Slice 모양에 따라 달라진다.

- **단일 파일 Slice** — 그 파일 자체가 entrypoint (`pages/home.tsx`).
- **폴더 Slice** — 폴더 안의 `index.*`가 entrypoint (`pages/product-detail/index.tsx`).

폴더 entrypoint는 용도에 따라 두 형태로 나뉜다.

**조합 구현형 (`index.tsx`)** — 하위 컴포넌트를 조합해 화면 단위를 완성한다. 단순 re-export 래퍼로 쓰지 않는다.

```tsx
// ❌ product-detail/index.tsx — 단순 re-export 래퍼
export { ProductDetailPage } from './product-detail-page';
```

```tsx
// ✓ product-detail/index.tsx — 조합 코드가 있는 실제 구현
export function ProductDetailPage() {
  return (
    <>
      <ProductInfo />
      <ProductReviews />
    </>
  );
}
```

**barrel형 (`index.ts`)** — JSX가 없는 모듈(API 객체, 타입, 팩토리 함수 등)을 정리해 노출한다. `shared/api/[domain]/index.ts`가 대표 예시 — 여러 endpoint 함수를 `[DOMAIN]_API` 객체로 묶고 필요한 타입을 re-export한다.

```ts
// ✓ shared/api/product/index.ts — barrel
import { getProductList } from './endpoints/get-product-list';
import { createProduct } from './endpoints/create-product';

export const PRODUCT_API = { getProductList, createProduct };
export type { ProductItem } from './model';
```

### Path alias

레이어 간 import는 path alias로만 한다. 상대경로(`../`)는 같은 레이어 내부에서만 허용한다.

```txt
@app/*        @pages/*        @widgets/*
@features/*   @entities/*     @shared/*
```

전체 소스를 잡는 포괄적 alias(`@/*` 등)는 쓰지 않는다. 포괄적 alias가 있으면 방향 규칙을 정적으로 검증할 수 없어진다.

### Private 폴더

Slice 내부에서 추출된 파일이 여러 개 생기면 `_ui/`, `_hooks/`, `_context/`, `_lib/` 같은 **private 폴더**로 묶는다. 언더스코어는 "Slice 외부에서 접근하지 않는다"는 표식이다. 처음부터 만들지 않고, 실제로 묶을 파일이 생긴 뒤에 도입한다.

---

## 정리

이 문서에서 정의한 어휘를 다음 문서들이 반복해서 사용한다.

- **레이어** — 6개. `app / pages / (widgets / features / entities) / shared`
- **계급** — 위에서 아래로. import는 위 → 아래만 허용
- **Slice** — 레이어 내부 비즈니스 도메인 단위. 자족적 모듈
- **Slice 문맥** — Slice 고유의 상태·context·도메인 의미
- **Segment** — shared 내부 책임 단위
- **Entrypoint** — Slice 외부에서 접근하는 유일한 경로

이 어휘 위에서 "코드를 어디에 두는가"라는 질문은 [principles](principles.md) 문서가 다룬다.
