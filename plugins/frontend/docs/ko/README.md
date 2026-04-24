# Frontend Layered Architecture

이 문서는 프론트엔드 코드를 일관된 구조로 작성하기 위한 레이어드 아키텍처를 설명한다.

이 아키텍처는 [Feature-Sliced Design(FSD)](https://feature-sliced.design)을 기반으로 한다. Slice 내부를 자유 분해하도록 완화하고, API 레이어와 TanStack Query 팩토리를 중앙화해 강화했다. 특정 프레임워크에 종속되지 않는다. React(Vite)에서는 그대로 적용되고, Next.js에서는 파일 기반 라우팅과의 충돌을 해결하는 추가 규칙이 있다.

---

## 핵심 아이디어

이 아키텍처는 세 가지 문장으로 요약된다.

**1. Page가 중심이다.** 모든 코드는 page 안에서 시작한다. page는 단순한 라우트 엔트리가 아니라, 화면 단위의 자족적 모듈이다. 전용 상태·훅·컴포넌트·도메인 로직을 page가 직접 소유한다. 공통 레이어에 미리 두지 않는다.

**2. 섣불리 다른 레이어로 옮기지 않는다.** 실제 재사용이 발생하고, 책임이 안정적이며, Slice 문맥과 무관함이 확인된 뒤에만 다른 레이어로 이동한다. "나중에 쓸 것 같다"는 이유로 미리 올리지 않는다.

**3. 레이어 순서가 import를 결정한다.** 코드는 자신이 속한 레이어보다 아래 레이어만 import할 수 있다. 같은 레이어의 다른 Slice를 직접 참조하지 않는다. 이 제약이 의존성 방향을 고정하고, 변경의 영향 범위를 예측 가능하게 만든다.

---

## 레이어 구성

```txt
app → pages → (widgets → features → entities →) shared
```

`widgets`, `features`, `entities`는 선택이다. 프로젝트는 `app / pages / shared` 세 레이어로 시작하고, 실제 필요가 생길 때 하나씩 도입한다.

---

## FSD와의 관계

이 아키텍처는 FSD의 레이어 계층과 import 방향을 공유한다. 차이는 두 축에 집중되어 있다.

**Slice 내부 구조가 자유롭다.** FSD는 `ui/`, `model/`, `api/` 같은 named segment로 Slice 내부를 고정한다. 이 아키텍처는 Slice 내부를 미리 정해진 구조로 나누지 않고, page와 동일한 분해 규칙(책임 수 기준)을 적용한다.

**API가 shared에 중앙화된다.** FSD는 slice별 `api/` segment를 허용한다. 이 아키텍처는 모든 API를 `shared/api`에 모으고 3계층 구조(http-client → endpoints → public interface)를 강제한다. entities는 API를 소유하지 않고, 도메인 표현만 담당한다.

---

## 문서 순서

아래 순서로 읽으면 개념이 쌓인다.

| 문서 | 내용 |
|------|------|
| [foundations](foundations.md) | 레이어·Slice·Segment·계급·import 방향 — 이후 문서의 어휘 |
| [principles](principles.md) | page-first·추출·이동 원칙과 판단 순서 |
| [app](app.md) | app 레이어 — 조립자 |
| [pages](pages.md) | pages 레이어 — 아키텍처의 중심. Slice 분해와 추출 |
| [shared](shared.md) | shared 레이어 — Segment 구성과 의존 방향 |
| [shared-api](shared-api.md) | API 3계층 구조와 http-client 패턴 |
| [query-mutation](query-mutation.md) | TanStack Query 팩토리 패턴 |
| [optional-layers](optional-layers.md) | widgets · features · entities |
| [nextjs](nextjs.md) | Next.js 프로젝트에서의 구조 분리 |
| [nextjs-rsc](nextjs-rsc.md) | Server Components + TanStack Query |

`foundations`와 `principles`를 먼저 읽고, 나머지는 필요한 순서로 접근해도 된다.

---

## 프로젝트 적용 시

이 아키텍처는 ESLint 규칙(`no-restricted-imports`, `import/no-default-export`, `consistent-type-imports`, `import/no-cycle`, 파일명 kebab-case 강제 등)으로 import 방향·entrypoint·네이밍을 자동 차단할 수 있다. 구체 설정 템플릿과 자동 적용 도구는 `hth-claude` 플러그인(`frontend` 플러그인의 `architecture`·`create`·`migrate` 스킬)이 제공한다.
