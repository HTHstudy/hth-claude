# App

이 문서는 app 레이어를 다룬다. app은 최상위 레이어이며, 애플리케이션을 실행 가능한 형태로 **조립**하는 것이 유일한 책임이다.

---

## 왜 app이 별도 레이어인가

애플리케이션이 동작하려면 여러 조각이 모여야 한다. 라우트가 설정되어야 하고, 전역 Provider가 설치되어야 하고, 환경변수가 검증되어야 하고, 인증 토큰이 복원되어야 한다. 이런 조립 로직을 **어디에 두는가**는 다른 레이어들의 경계와 직접 관련된다.

조립을 `shared`에 두면, shared는 "정의"만 담는다는 원칙이 깨진다. `pages`에 두면 특정 page가 앱 전체의 조립 책임까지 떠안게 된다. `main.tsx`에 전부 넣으면 부팅 파일이 앱의 모든 관심사를 알게 된다.

app 레이어는 이 조립 책임을 **전담**한다. shared는 재료를 제공하고, app은 그 재료로 앱을 조립한다. 각 레이어의 경계가 조립-정의로 분리되면서 관심사가 명확해진다.

---

## app과 shared의 경계

같은 관심사라도 정의와 조립이 분리된다.

| 관심사 | shared (정의) | app (조립) |
|--------|--------------|------------|
| 라우팅 | 경로 상수·패턴 (`shared/routes`) | 라우터 설정, route-page 연결, guard |
| 설정 | 환경변수·Feature Flag 값 (`shared/config`) | Provider 구성, 초기화 로직 |
| 백엔드 연결 | API 클라이언트·도메인별 요청 함수 (`shared/api`) | 초기화 시 호출 (인증 복원, 원격 설정 로드 등) |
| 스타일 | 범용 UI 컴포넌트 (`shared/ui`) | 전역 스타일 적용 (`global.css`) |

이 경계를 유지하는 것이 app 레이어를 얇게 유지하는 핵심이다.

---

## app에 두는 것 / 두지 않는 것

### 둔다

- 루트 컴포넌트 (`App.tsx`)
- 라우팅 설정과 route-page 연결
- 전역 Provider (theme, query client, auth, toast, error boundary 등)
- 전역 스타일 (`global.css`)
- 전역 레이아웃 (모든 page에 공통으로 적용되는 것)
- 초기화 로직 (환경변수 검증, i18n 언어 탐지, 테마 복원, 인증 토큰 복원 등)
- route guard, redirect

### 두지 않는다

- 비즈니스 로직
- 특정 Slice 전용 컴포넌트·상태
- 재사용 유틸 (→ `shared/lib`)
- 특정 Slice 전용 Provider (→ 해당 Slice)
- `main.tsx` — app 바깥 `src/` 루트의 부팅 파일이다

---

## 내부 구조

app은 **최소 구조로 시작**한다. 파일이 늘어날 때만 폴더로 정리한다. 네이밍 규칙은 다른 레이어와 같다 — 하위 종속이 없으면 파일, 있으면 폴더 + `index.tsx`.

```txt
# 최소                    # 파일이 늘면 분리         # 더 늘면 폴더화
app/                      app/                      app/
├─ App.tsx                ├─ App.tsx                ├─ providers/
└─ global.css             ├─ router.tsx             ├─ routes/
                          ├─ providers.tsx          ├─ styles/
                          └─ global.css             └─ App.tsx
```

`providers.tsx` 하나에 모든 Provider를 합성하고, 그게 너무 커지면 `providers/` 폴더로 승격해서 개별 Provider 파일로 나눈다. 라우팅도 마찬가지 — 규모가 작으면 `router.tsx` 한 파일, 많아지면 `routes/` 폴더.

---

## Provider

app에는 **전역 Provider만** 둔다. 특정 Slice에서만 쓰이는 Provider는 해당 Slice에 둔다. "나중에 전역에서 쓸 수 있으니까" 미리 app으로 끌어올리지 않는다.

전역 Provider의 예:
- Theme / Design System Provider
- i18n Provider
- Auth Provider
- QueryClientProvider (TanStack Query)
- Toast / Dialog Provider
- Error Boundary
- Suspense boundary

Provider가 두 개 이상이면 `providers.tsx`에서 합성해 하나의 컴포넌트로 export한다. 루트 컴포넌트는 이 `Providers`를 한 번만 감싸면 된다.

---

## 라우팅

경로 상수는 **`shared/routes`에 정의**한다. 프로젝트에 라우트가 하나라도 있으면 `shared/routes/paths.ts`는 필수다. app은 이 상수를 가져와 실제 라우터 설정과 page 컴포넌트 연결을 담당한다.

**Route guard와 redirect는 app의 책임이다.** 비로그인 사용자를 `/login`으로 보내는 것, 권한이 부족한 사용자에게 `/403`을 렌더링하는 것은 app에서 처리한다. 이유는 guard가 라우팅 레벨의 관심사이기 때문이다 — 특정 page가 렌더링되기 **전에** 결정되어야 한다.

```tsx
// app/router.tsx — page 자체의 렌더링 여부를 결정
<Route
  path={PATHS.dashboard}
  element={
    isAuthenticated ? <DashboardPage /> : <Navigate to={PATHS.login} />
  }
/>
```

**page 내부의 조건부 렌더링은 page가 처리한다.** "로그인 유저의 역할에 따라 메뉴 항목을 다르게 표시한다" 같은 것은 page 자신의 책임이다. page가 렌더링된 뒤의 분기이므로 app이 관여할 필요가 없다.

```tsx
// pages/dashboard/index.tsx — 이미 렌더링된 page의 내부 분기
export function DashboardPage() {
  const { role } = useCurrentUser();
  return (
    <>
      <Sidebar />
      {role === 'admin' ? <AdminPanel /> : <UserPanel />}
    </>
  );
}
```

guard와 내부 분기의 차이는 **"렌더링 여부를 결정하느냐, 렌더링 내용을 결정하느냐"**다.

---

## 전역 레이아웃

**전역 레이아웃만 app에 둔다.** 모든 page에 공통으로 적용되는 레이아웃(헤더 + 메인 + 푸터 구조 등)이 여기에 해당한다.

전역 레이아웃에 **page별 분기를 넣지 않는다**. `if (route === '/login') return ...` 같은 코드는 신호다 — 해당 page는 전역 레이아웃을 공유하지 않는다는 뜻이다. 이런 경우 전역 레이아웃을 적용하는 범위를 route 그룹 단위로 좁히거나, 해당 page가 자신의 레이아웃을 직접 소유하도록 한다.

전역이 아닌 레이아웃은 해당 레이어의 하위 종속으로 처리한다. 특정 page의 레이아웃이면 page 내부 컴포넌트로, 여러 page에서 쓰이는 레이아웃 패턴이면 shared/ui의 Layout 컴포넌트로.

---

## 초기화 로직

애플리케이션이 처음 마운트될 때 실행되어야 하는 로직은 app에 둔다.

- 환경변수 검증 (필수 값이 비어 있으면 즉시 에러)
- i18n 언어 탐지 및 초기 설정
- 테마 복원 (저장된 다크모드 설정 등)
- 인증 토큰 복원 및 검증
- 원격 Feature Flag 로드

이런 로직은 `shared`에서 재료(함수, 상수, API 호출)를 가져와 **실행 시점을 정의**한다. shared가 직접 실행하지 않는다.

---

## main.tsx

`main.tsx`는 app의 일부가 아니다. DOM에 루트 컴포넌트를 마운트하는 **부팅 파일**이며, `src/` 루트에 위치한다.

```ts
// src/main.tsx
import { createRoot } from 'react-dom/client';
import { App } from './app/App';

createRoot(document.getElementById('root')!).render(<App />);
```

main.tsx는 app 레이어를 실행시키는 바깥 껍데기이지 app 자체가 아니다. 그래서 `src/app/` 폴더 안이 아니라 바깥에 둔다. 이 위치가 "app 레이어 = 조립, main.tsx = 마운트"라는 분리를 시각적으로 드러낸다.

Next.js는 main.tsx를 두지 않는다 — Next.js의 루트 `app/layout.tsx` 또는 `pages/_app.tsx`가 엔트리 역할을 대신한다. 상세는 [nextjs](nextjs.md) 문서에서 다룬다.

---

## 정리

- app은 조립 레이어. 비즈니스 로직을 직접 구현하지 않는다.
- shared는 정의, app은 조립. 같은 관심사도 두 레이어로 나뉜다.
- 내부 구조는 최소로 시작해서 파일이 늘면 폴더로 승격.
- 전역 Provider만. 특정 Slice 전용 Provider는 해당 Slice에.
- Route guard·redirect는 app. page 내부 분기는 page.
- 전역 레이아웃에 page별 분기 금지.
- 초기화 로직은 app이 실행 시점을 정의. shared에서 재료를 가져온다.
- `main.tsx`는 app 바깥 `src/` 루트의 부팅 파일.
