# 레이어 가이드

각 레이어의 역할과 관계를 설명합니다.

---

## 레이어 계층

```
app          최상위. 조립자.
pages        핵심. 화면 단위 모듈.
widgets      (선택) 복합 UI 블록.
features     (선택) 사용자 인터랙션 단위.
entities     (선택) 도메인 표현.
shared       최하위. 기반 도구.
```

import는 위에서 아래로만 가능합니다. 역방향은 금지입니다.

---

## app

애플리케이션을 실행 가능한 형태로 조립하는 레이어입니다.

- 라우팅 설정 (경로 상수는 `shared/routes`에서 가져옴)
- 전역 Provider (theme, query client, auth 등)
- 전역 스타일, 전역 레이아웃
- route guard, 초기화 로직

비즈니스 로직을 직접 구현하지 않습니다. 다른 레이어에서 만든 것을 조립하는 역할입니다.

`main.tsx`는 app 바깥(`src/` 루트)에 위치하는 부팅 파일입니다.

---

## pages

**이 아키텍처의 핵심 레이어입니다.**

각 page는 하나의 route에 대응하는 화면 모듈입니다. 단순 엔트리 포인트가 아니라 전용 상태, 훅, 컴포넌트, 도메인 로직을 직접 소유합니다.

```
pages/
├─ home.tsx                    # 단순한 page
└─ product-detail/             # 복잡한 page
   ├─ product-info.tsx
   ├─ product-reviews.tsx
   ├─ use-product-detail.ts
   └─ index.tsx
```

### page 내부 분해

처음에는 가장 단순한 형태로 시작합니다. 파일 하나, 또는 폴더 + `index.tsx`.

복잡해지면 큰 단위 컴포넌트로 나누고, 그 하위도 필요하면 계속 분해합니다. 깊이 자체는 문제가 아닙니다. 독립적 책임의 수를 기준으로 분해를 판단합니다.

`_ui/`, `_hooks/`, `_lib/` 같은 private 폴더는 처음부터 만들지 않습니다. 추출된 파일이 실제로 여러 개 생겼을 때만 묶습니다.

### nested route

`/settings`와 `/settings/profile`은 각각 독립된 page입니다. 부모-자식 관계라도 page 간 내부 모듈을 직접 공유하지 않습니다.

---

## shared

앱의 기본 구성 요소와 기반 도구를 모아두는 레이어입니다. 가장 하위에 위치하며, 다른 레이어를 import하지 않습니다.

### Segment 구조

shared는 Slice 없이 Segment로 구성합니다. 각 Segment는 명확한 책임을 가집니다.

| Segment | 역할 |
|---------|------|
| `api/` | API 클라이언트, 엔드포인트 정의. [상세](shared-api.md) |
| `ui/` | business-agnostic UI 컴포넌트 |
| `lib/` | 주제별 내부 라이브러리 (date, text, css 등) |
| `hooks/` | 인프라 수준 커스텀 훅 |
| `config/` | 환경변수, Feature Flag 값 |
| `routes/` | 라우트 경로 상수/패턴 |
| `i18n/` | 번역 설정, 전역 문자열 |
| `query-factory/` | TanStack Query 쿼리 팩토리. [상세](query-mutation.md) |
| `mutation-factory/` | TanStack Query 뮤테이션 팩토리. [상세](query-mutation.md) |

### shared에 두는 것

- **기반 모듈** (처음부터 shared): 인프라(config, routes, i18n, api), 디자인 시스템/헤드리스 컴포넌트
- **이동 모듈** (사용하는 곳에서 시작 → 공통이 생기면 이동): business-agnostic UI, 범용 훅, 범용 lib

### shared/ui 규칙

shared/ui는 **business-agnostic 컴포넌트만** 둡니다. 도메인 용어가 포함된 이름(`ProductCard`, `OrderStatusBadge`)은 shared/ui에 둘 수 없습니다. 도메인 특화 UI는 `entities`에 둡니다.

---

## widgets (선택)

독립적으로 동작하는 비교적 큰 UI 블록입니다. 여러 page에서 재사용되는 복합 UI(헤더, 사이드바, 상품 목록 섹션 등)를 캡슐화합니다.

entities나 features 없이 단독으로 도입할 수 있습니다.

### 언제 도입하나

동일한 복합 UI 블록이 2개 이상의 page에서 실제로 반복될 때.

page 전용이면 page에 남깁니다. 단일 컴포넌트를 감싸기만 하는 불필요한 widget을 만들지 않습니다.

---

## features (선택)

사용자에게 비즈니스 가치를 제공하는 재사용 가능한 기능 단위입니다. 인터랙션 UI와 그에 필요한 로직(상태, 검증, API 트리거)을 함께 소유합니다.

entities나 widgets 없이 단독으로 도입할 수 있습니다.

### 언제 도입하나

동일한 사용자 인터랙션이 2개 이상의 page에서 실제로 반복될 때.

모든 사용자 동작을 feature로 만들지 않습니다. 한 page 전용이면 page에 둡니다.

---

## entities (선택)

프로젝트가 다루는 비즈니스 엔티티(User, Product, Order 등)의 프론트엔드 도메인 표현입니다. 도메인 특화 UI와 표시 로직을 소유합니다.

features나 widgets 없이 단독으로 도입할 수 있습니다.

### 언제 도입하나

- 도메인 특화 UI(`ProductCard`, `UserAvatar`)가 2개 이상의 page에서 반복될 때
- `shared/ui`에 도메인 컴포넌트를 두고 싶은 충동이 생길 때 → entities가 올바른 위치

### shared/api와의 관계

| 관심사 | shared/api | entities |
|--------|-----------|----------|
| API 응답 타입 | O | X |
| API 호출 함수 | O | X |
| 도메인 UI | X | O |
| 표시 로직 (label/color) | X | O |
| 검증 스키마 | X | O |

entities는 API를 소유하지 않습니다. 백엔드에서 온 데이터를 프론트엔드가 어떻게 표현하는가에 집중합니다.
