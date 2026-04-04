# Frontend Layered Architecture

프론트엔드 코드를 일관된 구조로 작성하기 위한 레이어드 아키텍처 가이드입니다.

이 아키텍처는 [Feature-Sliced Design(FSD)](https://feature-sliced.design)을 기반으로, **Slice 내부 관리 방식**과 **API 중앙화**를 강화한 버전입니다. 특정 프레임워크에 종속되지 않습니다.

---

## 핵심 아이디어

1. **Page가 중심이다.** 모든 코드는 page에서 시작한다.
2. **섣불리 이동하지 않는다.** 실제 재사용이 발생할 때만 다른 레이어로 이동한다.
3. **레이어 순서가 import를 결정한다.** 위에서 아래로만 import할 수 있다.

```
app → pages → widgets → features → entities → shared
```

---

## 문서 구성

| 문서 | 내용 |
|------|------|
| [핵심 원칙](core-principles.md) | page-first, import 방향, 추출과 이동 |
| [레이어 가이드](layers.md) | 각 레이어의 역할, 관계, 언제 도입하는가 |
| [Shared API](shared-api.md) | API 레이어 구조, 도메인별 패턴, 데이터 변환 |
| [Query & Mutation Factory](query-mutation.md) | TanStack Query 팩토리 패턴 |
| [Next.js 적용](nextjs.md) | Next.js 프로젝트에서의 구조 분리와 라우팅 매핑 |
| [RSC + TanStack Query](nextjs-rsc-tanstack-query.md) | Server Components 환경에서의 데이터 페칭 패턴 |
| [확장 가이드](expansion-guide.md) | widgets, features, entities 도입 시점과 방법 |

---

## 초기 프로젝트 구조

```
src/
├─ main.tsx
├─ app/
│  ├─ App.tsx
│  └─ global.css
├─ pages/
└─ shared/
```

`widgets/`, `features/`, `entities/`는 초기에 만들지 않습니다. 필요할 때 하나씩 도입합니다.

---

## FSD와의 관계

이 아키텍처는 FSD의 레이어 계층과 import 방향 규칙을 공유합니다. FSD v2.1도 page-first, 최소 레이어 시작, 타입 사용처 배치를 권장하며 방향성이 같습니다.

### 이 아키텍처가 FSD를 강화한 부분

| 관점 | FSD | 이 아키텍처 |
|------|-----|------------|
| **Slice 내부 구조** | `ui/`, `model/`, `api/` 등 named segment 사용 | 미리 정해진 구조 없이 자유 분해. page와 동일한 분해 규칙 적용 |
| **API 중앙화** | 공통 클라이언트는 `shared/api`, slice별 `api/` segment도 허용 | 모든 API를 `shared/api`에 중앙화. 3계층 구조(base → http-client → endpoints) 강제 |
| **쿼리/뮤테이션** | 별도 표준 없음 | `shared/query-factory`, `shared/mutation-factory`로 팩토리 패턴 표준화 |
| **데이터 변환** | mapper를 DTO 근처에 배치 | API 소비하는 쪽에서 처리. endpoints는 변환하지 않음 |
| **Entrypoint 강제** | 권장 수준 | ESLint `@[layer]/*/*` 패턴으로 내부 접근 차단 |
