# App Layer

> `app` 레이어의 상세 규칙이다. 기본 역할은 SKILL.md 참조.

---

## 두는 것 / 두지 않는 것

**둔다:** 루트 컴포넌트(`App.tsx`), 라우팅 설정, 전역 Provider, 전역 스타일, 전역 레이아웃, 초기화 로직(환경변수 검증, i18n 언어 탐지, 테마 복원, 인증 토큰 복원 등)
**두지 않는다:** 비즈니스 로직, 특정 사용처 전용 컴포넌트/상태, 재사용 유틸(`shared`에), 특정 사용처 전용 Provider(해당 레이어에), `main.tsx`(app 바깥 `src/` 루트의 부팅 파일)

---

## 내부 구조

최소 구조로 시작. 파일이 늘어날 때만 폴더로 정리한다. 네이밍 규칙("하위 종속이 없으면 파일, 있으면 폴더 + `index.tsx`")을 따른다 — `providers.tsx`가 여러 Provider 파일로 쪼개지면 `providers/index.tsx` 폴더로 승격.

```txt
# 최소                    # 분리 시                  # 폴더화 시
app/                      app/                       app/
├─ App.tsx                ├─ App.tsx                 ├─ providers/
└─ global.css             ├─ router.tsx              ├─ routes/
                          ├─ providers.tsx           ├─ styles/
                          └─ global.css              └─ App.tsx
```

---

## Provider 규칙

- **전역 Provider만** app에 둔다. 특정 사용처 전용 Provider는 해당 레이어에.
- Provider 2개 이상 시 `providers.tsx`에서 합성.
- 전역 Provider 예시: Theme / Design System, i18n, Auth, QueryClient(TanStack Query), Toast·Dialog, Error Boundary, Suspense boundary

## 라우팅 규칙

- 경로 상수는 `shared/routes`에 정의 (라우트가 하나라도 정의되면 필수). app은 가져와서 page 컴포넌트와 연결.
- **route guard/redirect는 app에.** 예: 비로그인 시 `/login`으로 리디렉트, 권한 부족 시 `/403` 라우트 렌더링.
- **page 내부 조건부 렌더링은 page가 처리.** 예: 로그인 유저의 역할에 따라 메뉴 항목 다르게 표시, 상태에 따른 UI 분기.

## 전역 레이아웃 규칙

- 전역 레이아웃(모든 page에 공통)만 app에 둔다. 그 외는 해당 레이어의 하위 종속으로 처리한다.
- 전역 레이아웃에 page별 분기(`if (route === ...)`)를 넣지 않는다.

---

## app과 shared의 경계

| 관심사      | app (조립·실행)                               | shared (값·도구 정의)                             |
| ----------- | --------------------------------------------- | ------------------------------------------------- |
| 라우팅      | 라우터 설정, route-page 연결, guard           | 경로 상수 (`shared/routes`)                       |
| 설정        | Provider 구성, 초기화                         | 환경변수, Feature Flag (`shared/config`)          |
| 백엔드 연결 | 초기화 시 호출 (인증 복원, 원격 설정 로드 등) | API 클라이언트, 도메인별 요청 함수 (`shared/api`) |
| 스타일      | 전역 스타일 적용                              | 범용 UI (`shared/ui`)                             |
