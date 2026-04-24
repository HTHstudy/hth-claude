# Shared Layer

> `shared` 레이어의 정의, 구조, 규약이다.

---

## 1. 목적

`shared` 레이어는 앱의 기본 구성 요소와 기반 도구들을 모아두는 곳이다.

- 백엔드, 서드파티 라이브러리, 실행 환경과의 연결을 담당한다.
- 여러 곳에서 사용하는 응집도 높은 내부 라이브러리를 보관한다.
- 특정 Slice 문맥에 결합된 코드는 shared에 두지 않는다.

---

## 2. 기본 전제

- `shared`는 가장 하위 레이어이다. 다른 레이어를 import하지 않는다.
- 어떤 레이어에서든 `shared`를 import할 수 있다.
- Slice 없이 Segment로만 구성한다.
- 비즈니스 도메인이 없으므로 Slice 간 경계는 없지만, Segment 간 책임 경계는 존재한다. 의존 방향은 섹션 9를 따른다.

```txt
src/
├─ app/
├─ pages/
└─ shared/
```

---

## 3. shared에 두는 것 / 두지 않는 것

### 둔다

- 백엔드와의 연결 (API 클라이언트, 공통 요청 함수)
- 서드파티 라이브러리 래핑 및 설정
- 실행 환경 설정 (환경변수, Feature Flag 값)
- 범용 UI 컴포넌트
- 응집도 높은 내부 라이브러리 (날짜, 색상, 텍스트 등 주제별)
- 범용 커스텀 훅
- 라우트 상수/패턴
- 번역 설정, 전역 문자열

### 두지 않는다

- 특정 Slice의 비즈니스 로직
- 특정 Slice 상태나 context에 의존하는 코드
- UI 전용 파생 타입, 화면 상태용 타입
- 다른 레이어(`app`, `pages`, `widgets`, `features`, `entities`)를 import하는 코드

---

## 4. shared로 이동하는 조건

business-agnostic 코드라도 처음에는 사용하는 Slice에 둔다. 다른 Slice에서 실제로 공통 사용이 발생하면 shared로 이동한다.

이동 조건 — 다음을 **모두** 만족해야 한다. 하나라도 불충족이면 현재 범위에 남긴다.

1. **2개 이상의 Slice에서 실제로 사용하고 있는가?** — 예측이 아닌 실제 사용. shared는 최하위이므로 어느 상위 레이어의 Slice든 포함한다(pages 1 + features 1 등 조합도 가능). 레이어 계급 전체는 [SKILL.md §3 레이어 계급](../SKILL.md#3-레이어-계급과-도입이동-조건) 참조.
2. **책임이 안정적인가?** — 인터페이스(props/params/return type)가 최근 변경되었거나 변경 예정이면 이동하지 않는다. `git log`로 최근 커밋을 확인한다.
3. **문맥 독립적인가?** — 특정 Slice 상태·context에 결합되지 않고, 범용 props/인터페이스만으로 동작해야 한다. 도메인 엔티티 타입을 직접 props로 받거나 특정 레이어 상태를 내부에서 참조하면 shared에 두지 않는다.

**shared는 이동의 최종 단계이다.** 공통이 생기면 먼저 가장 가까운 공통 범위로 추출한다. 그래도 더 넓은 공유가 필요하고 위 조건을 모두 만족할 때만 shared로 이동한다.

> page에서 시작하지 않고 shared에 바로 생성하는 예외 Segment는 §5.2 참조.

---

## 5. Segment 구조

### 5.1 원칙

- Slice 없이 Segment로 바로 나눈다.
- Segment 이름은 **이 폴더가 무엇을 하는지** 명확하게 드러내야 한다.
- `components`, `types`처럼 그 안에 무엇이 들어있는지 알 수 없는 모호한 이름은 사용하지 않는다.
- 아래 나열된 Segment는 모두 필수가 아니다. 필요할 때만 만든다.
- 명확한 책임을 나타내는 이름이라면 새로운 Segment를 추가할 수 있다.

### 5.2 예외 — page-first의 예외 Segment

이 아키텍처의 기본은 page-first이지만, 다음은 예외로 page에서 시작하지 않고 shared에 바로 생성한다. 애플리케이션이 동작하기 위한 기반이거나 프로젝트가 채택한 UI 기반이라, page보다 먼저 존재해야 한다.

- 기반 인프라: `config`, `routes`, `i18n`, `api`
- 디자인 시스템 / 헤드리스 컴포넌트
- 정적 리소스: `assets` (이미지, 폰트 등)
- (TanStack Query 사용 시) `query-factory`, `mutation-factory`

### 5.3 Segment 분류

| Segment             | 용도                                                                                                                                                                                   |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `api/`              | API 레이어. API 클라이언트, 외부 API 영역 기준으로 분리된 백엔드 요청 캡슐화. 비즈니스 규칙을 담는 도메인이 아니라 전송 영역 기준의 API 분리이다. [상세 규칙](shared-api.md)         |
| `ui/`               | 공통 UI 컴포넌트. 비즈니스 로직은 포함하지 않는다. 브랜드 테마 적용 가능. 로고, 레이아웃, 자동완성/검색창 등 UI 자체 로직을 포함하는 컴포넌트는 허용                                   |
| `lib/`              | 응집도 높은 내부 라이브러리. 날짜, 색상, 텍스트 등 **하나의 주제에 집중**한다. 단순 utils/helpers 모음이 아니다                                                                        |
| `hooks/`            | 범용 커스텀 훅. 특정 Slice 상태에 결합하지 않는 인프라 수준 훅만 둔다                                                                                                                  |
| `config/`           | 환경변수, 전역 Feature Flag **값 정의**. 이 값을 사용한 초기화/Provider 구성은 `app`이 담당한다                                                                                        |
| `routes/`           | 라우트 경로 상수/패턴 **정의**. 이 상수를 사용한 라우터 설정과 route-page 연결은 `app`이 담당한다                                                                                      |
| `i18n/`             | 번역 설정, 전역 문자열                                                                                                                                                                 |
| `assets/`           | 정적 리소스 (이미지, 폰트 등)                                                                                                                                                          |
| `query-factory/`    | TanStack Query 기반 query factory. queryKey와 queryOptions를 도메인별로 중앙 관리한다. [상세 규칙](shared-query-factory.md)                                                             |
| `mutation-factory/` | TanStack Query 기반 mutation factory. mutationKey와 mutationOptions를 도메인별로 중앙 관리한다. [상세 규칙](shared-mutation-factory.md)                                                  |

### 5.4 구조 예시

```txt
shared/
├─ api/                # API 레이어 (상세: shared-api.md)
│  ├─ base/
│  ├─ product/
│  └─ order/
├─ ui/
│  ├─ button.tsx
│  ├─ modal/
│  │  └─ index.tsx
│  └─ search-input/
│     └─ index.tsx
├─ lib/
│  ├─ date/
│  │  └─ index.ts
│  └─ text/
│     └─ index.ts
├─ hooks/
│  ├─ use-debounce.ts
│  └─ use-media-query.ts
├─ query-factory/
│  ├─ default-query-keys.ts
│  └─ product-queries.ts
├─ mutation-factory/
│  ├─ default-mutation-keys.ts
│  └─ product-mutations.ts
├─ config/
│  └─ env.ts
├─ routes/
│  └─ paths.ts
└─ i18n/
   └─ setup.ts
```

---

## 6. lib Segment 규칙

### lib는 utils/helpers 모음이 아니다

`lib/`의 각 하위 폴더는 **하나의 주제에 집중하는 내부 라이브러리**다.
잡다한 유틸리티를 한 폴더에 모아두지 않는다. 주제별로 응집도 높게 구성한다.

### Do

```txt
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

### Don't

```txt
shared/lib/
├─ format-date.ts
├─ cn.ts
├─ truncate-text.ts
├─ parse-query-string.ts
└─ deep-merge.ts
```

각 lib 하위 폴더에 README를 작성하여 역할과 범위를 문서화하는 것을 권장한다.

---

## 7. ui Segment 규칙

### 허용

- 브랜드 테마 적용
- UI 자체 로직을 포함하는 컴포넌트 (로고, 레이아웃, 자동완성/검색창 등). 단, 로컬 상태/표현 로직만 허용한다. 원격 데이터 조회는 상위 레이어가 담당하고 props로 주입한다.
- props만으로 렌더링이 완결되는 컴포넌트

### 금지

- 특정 Slice의 context/hook/타입에 의존하는 컴포넌트
- 비즈니스 로직을 포함하는 컴포넌트
- 특정 도메인 용어가 포함된 이름 (`OrderStatusBadge`, `UserProfileCard`, `ProductCard`)
- `shared/api`를 import하는 컴포넌트 (ui는 api에 의존하지 않는다)
- 도메인 엔티티 타입을 직접 props로 받는 컴포넌트 (예: `ProductItem`을 props 타입으로 사용)

`shared/ui`는 business-agnostic UI만 둔다.
도메인 특화 UI는 `pages` 내부 또는 적절한 확장 레이어(`widgets`, `features`, `entities`)에 둔다.
도메인 특화가 필요하면 상위 레이어 내부에서 shared 컴포넌트를 감싸서 사용한다.

### 하위 종속이 있는 컴포넌트는 폴더로 구성한다

```txt
shared/ui/
└─ modal/
   ├─ modal-overlay.tsx
   ├─ modal-content.tsx
   └─ index.tsx
```

---

## 8. hooks Segment 규칙

### 허용

- 브라우저 API 래핑 (`use-media-query`, `use-local-storage`)
- 범용 상태 패턴 (`use-debounce`, `use-toggle`)
- 범용 비동기 패턴 (`use-async`)

### 금지

- 특정 Slice 상태나 context를 내부에서 참조하는 훅
- 비즈니스 로직을 포함하는 훅 → 해당 Slice에 둔다

---

## 9. import 방향

- `shared`는 다른 레이어를 import하지 않는다.

### Segment 간 의존 방향

shared 내부는 기술적으로 상호 import가 가능하다. 그러나 모든 의존을 권장하지 않는다.
shared는 비즈니스 slice 경계가 없을 뿐, **책임 경계까지 없는 것은 아니다.**
`config/routes/i18n → lib/hooks → api/ui` 수준의 안정적인 의존 방향을 유지한다.

| Segment              | 주된 책임                        | import 가능                                     | 피할 것                                    |
| -------------------- | -------------------------------- | ----------------------------------------------- | ------------------------------------------ |
| `config/`            | env, flag, 실행환경 값           | 가능하면 없음                                   | `ui`, `api`, `routes`                      |
| `routes/`            | 경로 상수, path builder          | 가능하면 없음                                   | `ui`, `api`                                |
| `i18n/`              | 번역 설정, 전역 문자열           | `config`                                        | `ui`, `api`                                |
| `lib/`               | 순수 내부 라이브러리             | `config` 정도만 제한적으로                      | `ui`, `api`                                |
| `hooks/`             | 범용 커스텀 훅                   | `lib`, `config`                                 | `ui`, `api`                                |
| `api/`               | 외부 통신, 클라이언트            | `config`, `lib`                                 | `ui`                                       |
| `query-factory/`     | 쿼리 키·옵션 팩토리              | `api`, `config`                                 | `ui`, `hooks`, `mutation-factory`          |
| `mutation-factory/`  | 뮤테이션 키·옵션 팩토리          | `api`, `config`                                 | `ui`, `hooks`, `query-factory`             |
| `ui/`                | 공통 UI, 표현, UI 자체 로직      | `lib`, `i18n`                                   | `api`, `routes`, `query-factory`, `mutation-factory` |

`shared/ui`는 `shared/api`에 의존하지 않는다.  
외부 시스템 연동과 원격 데이터 조회는 상위 레이어에서 담당한다.  
순환 의존은 금지한다.

`assets/`는 정적 리소스이므로 의존 방향 대상이 아니다. 어떤 Segment/레이어든 필요 시 직접 import한다.

### app과의 경계

`shared`는 값과 도구를 **정의만** 한다. 어떻게 조립되는지는 알지 못한다.
`app`은 `shared`에서 값과 도구를 **가져와서 실행 가능한 형태로 조립**한다.

| 관심사      | shared (값·도구 정의)                                 | app (조립·실행)                     |
| ----------- | ----------------------------------------------------- | ----------------------------------- |
| 라우팅      | 경로 상수/패턴 (`shared/routes`)                      | 라우터 설정, route-page 연결, guard |
| 설정        | 환경변수, Feature Flag 값 (`shared/config`)           | Provider 구성, 초기화 로직          |
| 백엔드 연결 | API 클라이언트, 도메인별 요청 함수 (`shared/api`)     | 초기화 시 호출 (인증 복원, 원격 설정 로드 등) |
| 스타일      | 범용 UI 컴포넌트 (`shared/ui`)                        | 전역 스타일 적용 (`global.css`)     |

---

## 10. Do / Don't

### Do

- 예외 Segment(§5.2)는 page-first를 거치지 않고 시작부터 shared에 둔다.
- 그 외 코드는 해당 Slice에서 시작해서 실제 재사용 + 문맥 독립 + 안정성 확인 후 shared로 이동한다 (§4).
- `lib/` 하위는 주제별로 응집도 높게 구성한다.
- Segment 이름은 무엇을 하는지 명확하게 드러낸다.
- `ui/`는 business-agnostic 컴포넌트만 둔다. props만으로 렌더링을 완결한다.
- `hooks/`는 인프라 수준 관심사만 다룬다.

### Don't

- Slice에서 태어난 코드를 실제 재사용 없이 shared로 올리지 않는다.
- 특정 레이어 전용 훅을 두 곳에서 쓴다는 이유만으로 shared로 올리지 않는다.
- 도메인 특화 UI를 `shared/ui/`에 두지 않는다. `pages` 또는 확장 레이어에 둔다.
- 도메인 엔티티 타입을 props로 받는 컴포넌트를 `shared/ui/`에 두지 않는다.
- `shared/ui/`에서 `shared/api/`를 import하지 않는다.
- shared 내부에서 다른 레이어의 모듈을 import하지 않는다.
- `lib/`에 잡다한 유틸리티를 주제 구분 없이 모아두지 않는다.
- `components`, `types`처럼 모호한 Segment 이름을 사용하지 않는다.
