# Shared

이 문서는 shared 레이어를 다룬다. shared는 가장 하위에 위치하며, 앱의 기반이 되는 범용 도구와 값을 모아두는 곳이다.

---

## 왜 shared가 필요한가

page가 중심이라는 원칙을 따라가도, 모든 코드를 page 안에 둘 수는 없다. 두 종류의 예외가 존재한다.

**하나는 page보다 먼저 존재해야 하는 기반**이다. 환경변수 값, 라우트 경로 상수, API 클라이언트, 번역 설정 — 이들은 page가 호출하는 대상이므로 page보다 먼저 있어야 한다. 이런 기반은 처음부터 shared에 둔다.

**다른 하나는 시간이 지나며 shared로 이동하게 되는 코드**다. 한 page에서 쓰이던 범용 훅이 두 번째 page에서도 쓰이게 되고, 책임이 안정적이며 Slice 문맥과 무관함이 확인되면 shared로 옮긴다. 이때 shared는 **이동의 최종 단계**다. 먼저 가까운 공통 범위로 추출하고, 그래도 더 넓은 공유가 필요할 때만 shared로 간다.

shared는 이 두 경로가 만나는 저수지다. 위에서 내려온 코드와 처음부터 하층에 놓인 코드가 같은 공간에 공존한다.

---

## Slice 대신 Segment

shared에는 비즈니스 도메인이 없다. 그래서 **Slice로 나누지 않고 Segment로 나눈다**. Segment는 책임 단위로 묶은 하위 폴더다.

```txt
shared/
├─ api/
├─ ui/
├─ lib/
├─ hooks/
├─ config/
├─ routes/
├─ i18n/
├─ assets/
├─ query-factory/
└─ mutation-factory/
```

| Segment | 책임 |
|---------|------|
| `api/` | 백엔드와의 연결. API 클라이언트와 엔드포인트 정의. 도메인은 비즈니스 단위가 아니라 **전송 영역 기준**(baseURL + 공통 인터셉터)으로 분리한다. 상세는 [shared-api](shared-api.md) 문서 참조 |
| `ui/` | 공통 UI 컴포넌트. business-agnostic. 브랜드 테마 적용은 허용 |
| `lib/` | 주제별 내부 라이브러리. 하나의 주제(date, text, css 등)에 집중. 잡다한 유틸 모음이 아니다 |
| `hooks/` | 인프라 수준 커스텀 훅. 특정 Slice 상태에 결합하지 않는 범용 훅만 |
| `config/` | 환경변수, Feature Flag **값 정의**. 이 값을 사용한 초기화는 `app`이 담당 |
| `routes/` | 라우트 경로 상수·패턴 **정의**. 라우터 설정과 route-page 연결은 `app`이 담당 |
| `i18n/` | 번역 설정, 전역 문자열 |
| `assets/` | 정적 리소스 (이미지, 폰트 등) |
| `query-factory/` | TanStack Query 쿼리 팩토리. 상세는 [query-mutation](query-mutation.md) 문서 |
| `mutation-factory/` | TanStack Query 뮤테이션 팩토리. 상세는 [query-mutation](query-mutation.md) 문서 |

모든 Segment가 필수는 아니다. 필요할 때만 만든다. Segment 이름은 **그 폴더가 무엇을 하는지** 명확히 드러내야 한다. `components`, `types`, `utils`처럼 내용을 알 수 없는 이름은 쓰지 않는다. 명확한 책임을 나타낸다면 위에 없는 새 Segment도 만들 수 있다.

---

## 처음부터 shared에 두는 것

page-first 원칙의 예외로, 다음은 page에서 시작하지 않고 처음부터 shared에 둔다.

- **기반 인프라**: `config`, `routes`, `i18n`, `api` — 애플리케이션이 동작하기 위한 기반
- **정적 리소스**: `assets`
- **디자인 시스템 / 헤드리스 컴포넌트**: 프로젝트가 채택한 UI 기반 (`shared/ui`에 위치)
- **TanStack Query 팩토리**: `query-factory`, `mutation-factory` (TanStack Query를 사용하는 프로젝트만)

이들은 page가 호출하는 대상이거나 page가 사용하는 재료다. page보다 먼저 존재해야 의미가 있으므로 예외로 둔다.

그 외의 모든 코드는 해당 Slice에서 시작해서, 조건을 만족한 뒤에 shared로 이동한다.

---

## shared로 이동하는 조건

Slice에서 출발한 코드가 shared로 이동하려면 다음 세 가지를 **모두** 만족해야 한다.

**1. 2개 이상의 Slice에서 실제로 사용하고 있다.** shared는 가장 하위이므로 어느 상위 레이어의 Slice든 조합 가능하다 (pages 1 + features 1 등도 인정된다). 예측이 아닌 실제 사용이어야 한다.

**2. 책임이 안정적이다.** 인터페이스가 최근 변경되었거나 변경 예정이면 이동하지 않는다.

**3. 문맥 독립적이다.** 도메인 엔티티 타입을 직접 props로 받거나, 특정 레이어 상태를 내부에서 참조하는 코드는 shared에 두지 않는다. 범용 props·인터페이스만으로 동작해야 한다.

조건을 만족하지 못하면 현재 범위에 남긴다. 두 Slice에 중복해 두는 편이 섣부른 이동보다 낫다.

---

## ui Segment

`shared/ui`에는 **business-agnostic 컴포넌트만** 둔다. 범용 props만으로 렌더링이 완결되는 것, 브랜드 테마 적용은 가능하되 특정 도메인 지식이 없는 것이 기준이다.

허용되는 것:
- Button, Input, Modal 같은 범용 UI
- Logo, Layout, SearchInput 같은 **UI 자체 로직**을 포함하는 컴포넌트 (로컬 상태·표현 로직까지). 원격 데이터 조회는 상위 레이어가 담당하고 props로 주입받는다.

금지되는 것:
- `ProductCard`, `OrderStatusBadge`, `UserProfileCard`처럼 도메인 용어가 포함된 이름
- 특정 Slice의 context·hook·타입에 의존하는 컴포넌트
- 도메인 엔티티 타입을 직접 props로 받는 컴포넌트
- `shared/api`를 import하는 컴포넌트 — `ui`는 `api`에 의존하지 않는다

도메인 특화 UI가 필요하면 `pages` 내부나 확장 레이어(`widgets`, `features`, `entities`)에 둔다. `shared/ui`의 범용 컴포넌트를 감싸서 도메인 요구를 입히는 것은 상위 레이어의 책임이다.

경계는 props 시그니처에서 가장 분명하게 드러난다.

```ts
// ✓ shared/ui/button.tsx — 범용 props만
type ButtonProps = {
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  children: React.ReactNode;
};
```

```ts
// ❌ shared/ui/product-card.tsx — 도메인 타입에 결합
import type { ProductItem } from '@shared/api/product';

type ProductCardProps = {
  product: ProductItem;              // shared/api 타입 직접 수용
  onAddToCart: (id: string) => void; // 도메인 동작
};
```

위와 같은 컴포넌트는 `entities/product/product-card.tsx`에 둔다.

### 하위 종속이 있으면 폴더로

단일 파일 컴포넌트는 파일 하나, 하위 종속이 생기면 폴더 + `index.tsx`로 승격한다. pages의 Slice 승격 규칙과 같다.

```txt
shared/ui/
├─ button.tsx
└─ modal/
   ├─ modal-overlay.tsx
   ├─ modal-content.tsx
   └─ index.tsx
```

---

## lib Segment

`shared/lib`는 **utils 모음이 아니다**. 각 하위 폴더는 하나의 주제에 집중하는 **내부 라이브러리**다.

```txt
# 올바른 형태 — 주제별 응집
shared/lib/
├─ date/
│  ├─ format.ts
│  ├─ parse.ts
│  └─ index.ts
├─ text/
│  ├─ truncate.ts
│  └─ index.ts
└─ css/
   ├─ cn.ts
   └─ index.ts
```

```txt
# 피해야 할 형태 — 주제 구분 없는 유틸 덩어리
shared/lib/
├─ format-date.ts
├─ cn.ts
├─ truncate-text.ts
├─ parse-query-string.ts
└─ deep-merge.ts
```

주제별 폴더로 나누면 각 라이브러리의 범위가 명확해지고, 관련 함수들이 한 곳에 모인다. 주제에 맞지 않는 코드가 섞이는 것도 자연스럽게 걸러진다. 각 lib 하위 폴더에 README를 두어 역할과 범위를 명시하는 것을 권장한다.

---

## hooks Segment

`shared/hooks`에는 **인프라 수준 범용 훅**만 둔다.

허용:
- 브라우저 API 래핑 (`use-media-query`, `use-local-storage`)
- 범용 상태 패턴 (`use-debounce`, `use-toggle`)
- 범용 비동기 패턴 (`use-async`)

금지:
- 특정 Slice의 상태나 context를 내부에서 참조하는 훅
- 비즈니스 로직을 포함하는 훅

"두 page에서 쓴다"는 이유만으로 shared에 올리지 않는다. 그 훅이 두 page에서 같은 역할을 하는지, Slice 문맥과 무관한지를 먼저 검증한다. Slice 문맥에 결합되어 있다면 해당 Slice 내부에 남기거나 적절한 확장 레이어로 이동한다.

---

## Segment 간 의존 방향

shared 안에는 비즈니스 Slice 경계가 없지만 **책임 경계는 있다**. 각 Segment는 다른 Segment에 의존할 수 있는 범위가 제한된다.

| Segment | 주된 책임 | import 가능 | 피할 것 |
|---------|----------|-------------|---------|
| `config/` | env, flag, 실행환경 값 | 가능하면 없음 | `ui`, `api`, `routes` |
| `routes/` | 경로 상수, path builder | 가능하면 없음 | `ui`, `api` |
| `i18n/` | 번역 설정, 전역 문자열 | `config` | `ui`, `api` |
| `lib/` | 주제별 내부 라이브러리 | `config` 정도만 | `ui`, `api` |
| `hooks/` | 범용 커스텀 훅 | `lib`, `config` | `ui`, `api` |
| `api/` | 외부 통신, 클라이언트 | `config`, `lib` | `ui` |
| `query-factory/` | 쿼리 키·옵션 팩토리 | `api`, `config` | `ui`, `hooks`, `mutation-factory` |
| `mutation-factory/` | 뮤테이션 키·옵션 팩토리 | `api`, `config` | `ui`, `hooks`, `query-factory` |
| `ui/` | 공통 UI, 표현 | `lib`, `i18n` | `api`, `routes`, `query-factory`, `mutation-factory` |

방향은 `config / routes / i18n → lib / hooks → api / ui` 수준의 안정적인 흐름을 유지한다. 순환 의존은 금지한다. `query-factory`와 `mutation-factory`는 서로 import하지 않는다.

`assets/`는 정적 리소스이므로 의존 방향 대상이 아니다. 어떤 Segment·레이어든 필요 시 직접 import한다.

---

## app과의 경계

`shared`는 도구와 값을 **정의만** 한다. 어떻게 조립되는지는 알지 못한다. `app`은 `shared`에서 정의된 것을 **가져와서 실행 가능한 형태로 조립**한다.

| 관심사 | shared (정의) | app (조립) |
|--------|--------------|------------|
| 라우팅 | 경로 상수·패턴 (`shared/routes`) | 라우터 설정, route-page 연결, guard |
| 설정 | 환경변수, Feature Flag 값 (`shared/config`) | Provider 구성, 초기화 로직 |
| 백엔드 연결 | API 클라이언트, 도메인별 요청 함수 (`shared/api`) | 초기화 시 호출 (인증 복원, 원격 설정 로드 등) |
| 스타일 | 범용 UI 컴포넌트 (`shared/ui`) | 전역 스타일 적용 (`global.css`) |

같은 관심사에 대해 shared는 "재료"를, app은 "조립"을 담당한다고 생각하면 경계가 선명해진다.

---

## 정리

- shared는 가장 하위 레이어. 다른 레이어를 import하지 않는다.
- Slice가 없고 Segment로만 구성한다. Segment 이름은 책임을 명확히 드러낸다.
- 기반 인프라·정적 리소스·디자인 시스템·쿼리 팩토리는 처음부터 shared에.
- 그 외 코드는 Slice에서 시작해서 3가지 조건을 모두 만족한 뒤에 shared로 이동한다.
- `shared/ui`는 business-agnostic만. 도메인 특화 UI는 상위 레이어에.
- `shared/lib`는 주제별 내부 라이브러리. utils 덩어리가 아니다.
- Segment 간에도 의존 방향이 있다. 순환 의존 금지.
- shared는 정의, app은 조립.
