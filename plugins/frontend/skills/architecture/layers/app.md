# App Layer

> `app` 레이어의 상세 규칙이다. 기본 역할은 SKILL.md 참조.

---

## 두는 것 / 두지 않는 것

**둔다:** 루트 컴포넌트(`App.tsx`), 라우팅 설정, 전역 Provider, 전역 스타일, 전역 레이아웃, 초기화 로직
**두지 않는다:** 비즈니스 로직, page 전용 컴포넌트/상태, 재사용 유틸(`shared`에), page 전용 Provider(해당 page에)

---

## 내부 구조

최소 구조로 시작. 파일이 늘어날 때만 폴더로 정리.

```txt
# 최소                    # 분리 시                  # 폴더화 시
app/                      app/                       app/
├─ App.tsx                ├─ App.tsx                 ├─ providers/
└─ global.css             ├─ router.tsx              ├─ routes/
                          ├─ providers.tsx            ├─ styles/
                          └─ global.css               └─ App.tsx
```

---

## Provider 규칙

- **전역 Provider만** app에 둔다. page 전용 Provider는 해당 page에.
- Provider 2개 이상 시 `providers.tsx`에서 합성.

## 라우팅 규칙

- 경로 상수는 `shared/routes`에 정의 **(경로가 하나라도 필수)**. app은 가져와서 page 컴포넌트와 연결.
- route guard/redirect는 app에. page 내부 조건부 렌더링은 page가 처리.

## 전역 레이아웃 규칙

- 모든 page에 걸쳐 유지되는 레이아웃은 app에.
- page별 레이아웃 변형은 route 설정이나 page 자체에서 처리. 전역 레이아웃에 page별 분기 금지.

---

## app과 shared의 경계

| 관심사 | app (조립·실행) | shared (값·도구 정의) |
|--------|----------------|---------------------|
| 라우팅 | 라우터 설정, route-page 연결, guard | 경로 상수 (`shared/routes`) |
| 설정 | Provider 구성, 초기화 | 환경변수, Feature Flag (`shared/config`) |
| 스타일 | 전역 스타일 적용 | 범용 UI (`shared/ui`) |
