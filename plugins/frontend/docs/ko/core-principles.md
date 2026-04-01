# 핵심 원칙

이 아키텍처를 관통하는 3가지 원칙입니다.

---

## 1. Page-First

**모든 코드는 page에서 시작합니다.**

page는 단순한 라우트 엔트리가 아니라, 화면 단위의 독립적 모듈입니다. 전용 상태, 훅, 컴포넌트, 도메인 로직을 page가 직접 소유합니다.

처음부터 코드를 여러 레이어에 분산하지 않습니다. page 안에서 시작하고, 복잡해지면 page 내부에서 분해하고, 재사용이 실제로 발생하면 그때 다른 레이어로 이동합니다.

```
page 하나로 시작
→ 필요하면 큰 단위 컴포넌트로 분해
→ 그 큰 단위도 필요하면 내부에서 다시 분해
→ 재사용이 보이면 추출 검토
→ 조건을 만족하면 다른 레이어로 이동
```

### business-agnostic 코드도 마찬가지

Button, useDebounce 같은 범용 코드라도 한 곳에서만 쓰이면 그 곳에 둡니다. 2개 이상의 Slice에서 실제로 공통 사용이 발생하면 그때 shared로 이동합니다.

예외는 **page보다 먼저 존재해야 하는 인프라**뿐입니다:
- `shared/config` — 환경변수, Feature Flag
- `shared/routes` — 라우트 경로 상수
- `shared/i18n` — 번역 설정
- `shared/api` — API 클라이언트, 엔드포인트 정의
- 디자인 시스템 / 헤드리스 컴포넌트 — 프로젝트가 채택한 UI 기반

이들은 page가 동작하기 위한 기반이므로 처음부터 shared에 둡니다.

---

## 2. Import 방향

**레이어 간 import는 위에서 아래로만 허용합니다. 역방향은 금지합니다.**

```
app → pages → widgets → features → entities → shared
```

- `app`은 모든 레이어를 import할 수 있습니다.
- `pages`는 그 아래 레이어를 import할 수 있습니다.
- `shared`는 다른 레이어를 import하지 않습니다.
- **같은 레이어 Slice 간 cross-import는 금지합니다.** page-a가 page-b를, feature-a가 feature-b를 import하지 않습니다.

이 규칙이 의존성 방향을 강제하고, 코드의 영향 범위를 예측 가능하게 만듭니다.

### cross-import가 필요한 순간

같은 레이어의 두 Slice가 코드를 공유하고 싶다면, 그것이 **더 넓은 공유 범위로 이동할 시점**입니다.

- 두 page가 같은 도메인 UI를 쓴다 → `entities`로 이동
- 두 page가 같은 인터랙션을 쓴다 → `features`로 이동
- 두 page가 같은 복합 UI 블록을 쓴다 → `widgets`로 이동

cross-import 금지는 단순한 제약이 아니라, **확장을 유도하는 메커니즘**입니다.

---

## 3. 추출과 이동

코드를 다른 범위로 옮기는 행위는 두 단계로 나뉩니다.

### 추출: Slice 내부에서 공통 코드를 분리

Slice 내부에서 여러 하위 모듈이 같은 코드를 쓰면, 가장 가까운 공통 범위로 추출합니다.

```
[slice]/
├─ component-a/    ← 둘 다 filter-chip을 쓴다
├─ component-b/    ←
├─ _ui/
│  └─ filter-chip.tsx   ← 공통 범위로 추출
└─ index.tsx
```

### 이동: 다른 레이어로 옮기기

2개 이상의 Slice에서 실제로 사용하고 있고, Slice 문맥 없이 독립적으로 동작하면 다른 레이어로 이동을 검토합니다.

**이동은 신중해야 합니다.** 다음 조건을 모두 만족하지 않으면 이동하지 않습니다:

1. 2개 이상의 Slice에서 실제로 사용하고 있는가? (예측이 아닌 실제)
2. Slice 문맥 없이도 의미가 성립하는가?
3. 입력/출력이 특정 Slice 상태에 결합되어 있지 않은가?
4. 해당 책임이 충분히 안정적인가?
5. 범용 인터페이스만으로 동작하는가?

가장 가까운 공통 범위로 추출하는 것이 기본이고, 다른 레이어로의 이동은 최종 단계입니다.

### 이동이 항상 답은 아니다

같은 레이어의 Slice 간 조합이 필요할 때, 코드를 이동하는 대신 **사용하는 쪽에서 조합**하는 것이 답인 경우도 있습니다.

예: header 위젯과 sidebar 위젯이 연동되어야 할 때
- sidebar를 다른 레이어로 이동하는 것이 아니라
- page가 두 위젯을 조합하고 상태를 관리합니다

```tsx
// page에서 조합
const [sidebarOpen, setSidebarOpen] = useState(false);

<Header onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
<Sidebar open={sidebarOpen} />
```
