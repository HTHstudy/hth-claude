# Phase 1: 구조 전환

### 1단계: 현재 구조 분석

프로젝트 루트부터 전체 구조를 읽고 파악한다:
- 프레임워크 확인 (`package.json`, 설정 파일 기반 — React, Next.js, Remix 등)
- 소스 코드 루트 확인 (`src/`, `app/`, 프로젝트 루트 등 프레임워크마다 다름)
- 현재 폴더 구조와 파일 위치
- 기존 경로 별칭과 설정 파일 (`tsconfig.json`, `vite.config.ts` 등)
- 패키지 매니저 (yarn, npm, pnpm — lock 파일로 판단)
- 기존 API 호출 코드 위치와 패턴
- 기존 상태 관리 방식 (TanStack Query 사용 여부 등)

변경 전에 현재 구조를 사용자에게 보고한다.

### 2단계: 전환 계획 수립

분석을 바탕으로 전환 계획을 작성한다:
- `app/`으로 이동할 파일 (라우팅, Provider, 전역 스타일)
- `pages/`로 이동할 파일 (route 기준 화면 모듈)
- `shared/`로 이동할 파일 (유틸리티, 훅, 설정, API 클라이언트)
- 현재 위치에 그대로 둘 파일 (이미 올바른 위치)

계획을 사용자에게 제시하고 **확인을 받은 후** 진행한다.

### 3단계: 기본 구조 생성 및 파일 이동

1단계에서 확인한 프레임워크에 따라 구조를 생성한다.

#### React (Vite) 프로젝트

```
src/
├─ main.tsx        # 부팅 파일
├─ app/            # 라우팅, Provider, 전역 스타일/레이아웃
├─ pages/          # route 기준 화면 모듈
└─ shared/
   ├─ config/      # env.ts
   └─ routes/      # paths.ts
```

- 엔트리 컴포넌트 (App, Router, Providers) → `src/app/`
- route 기준 페이지 → `src/pages/[page-name]/`
- 공통 유틸리티, 훅, UI 컴포넌트 → `src/shared/`의 적절한 세그먼트
- 정적 자원 → `src/shared/assets/`
- `main.tsx`는 소스 루트에 부팅 파일로 유지

#### Next.js 프로젝트 (App Router)

[nextjs.md](../../architecture/integrations/nextjs.md)의 구조를 따른다. 핵심 원칙:

```
├─ app/                # Next.js App Router (루트) — re-export 전용
│  ├─ layout.tsx       # src/app의 providers, global.css를 조립
│  └─ [route]/
│     └─ page.tsx      # src/pages의 page를 re-export만 함
├─ pages/              # 빈 폴더 (Pages Router 폴백 방지)
│  └─ README.md
└─ src/
   ├─ app/             # FSD app 레이어 (providers, global.css)
   ├─ pages/           # FSD pages 레이어 (화면 모듈)
   └─ shared/
      ├─ config/
      └─ routes/
```

- `src/` 폴더가 없으면 생성하고 FSD 레이어를 `src/` 안에 배치한다.
- 루트 `app/`의 `page.tsx`는 re-export만 수행한다: `export { PageName as default } from '@pages/...'`
- 루트 `app/layout.tsx`에서 `src/app/`의 providers와 global style을 조립한다.
- 루트에 빈 `pages/` 폴더 + README.md를 생성한다.
- **루트 `app/`에 로직, 훅, 컴포넌트를 직접 구현하지 않는다.**

#### Next.js 프로젝트 (Pages Router)

[nextjs.md](../../architecture/integrations/nextjs.md)의 구조를 따른다. 핵심 원칙:

```
├─ app/                # 빈 폴더 (App Router 감지 방지)
│  └─ README.md
├─ pages/              # Next.js Pages Router (루트) — re-export 전용
│  ├─ _app.tsx         # src/app의 custom-app을 re-export
│  └─ [route]/
│     └─ index.tsx     # src/pages의 page를 re-export만 함
└─ src/
   ├─ app/             # FSD app 레이어 (custom-app, providers, global.css)
   ├─ pages/           # FSD pages 레이어 (화면 모듈)
   └─ shared/
      ├─ config/
      └─ routes/
```

- 루트에 빈 `app/` 폴더 + README.md를 생성한다.
- 루트 `pages/`의 파일은 re-export만 수행한다.
- `_app.tsx`의 실제 구현은 `src/app/custom-app.tsx`에 둔다.

#### 공통

가능한 경우 `git mv`를 사용하여 git 히스토리를 보존한다.

- `widgets/`, `features/`, `entities/`는 생성하지 않는다 — 필요할 때만 도입.

### 4단계: import 수정 및 도구 설정

모든 import 경로를 새 구조에 맞게 수정한다:
- 상대 경로를 경로 별칭으로 교체 (`@app/`, `@pages/`, `@shared/`)
- 파일 이동으로 인한 깨진 import 수정
- 타입 import는 반드시 `import type` 사용

도구 설정:
- `tsconfig.json` (또는 `tsconfig.app.json`)에 경로 별칭 추가 (`src/` 기준)
- ESLint `no-restricted-imports` 추가
- Vite 사용 시 `tsconfigPaths` 활성화
- Next.js 사용 시 `next.config.js` 설정 확인

### 5단계: 빌드 검증

- 프로젝트를 실행하여 빌드 및 동작에 오류가 없는지 확인
- 남아 있는 깨진 import 확인
- 최종 구조를 사용자에게 보고

### 빌드 검증 후 커밋

빌드가 정상이면 중간 커밋을 생성한다:

```bash
git add -A
git commit -m "refactor: restructure folders to layered architecture"
```

**사용자에게 Phase 1 완료를 알리고, Phase 2 진행 여부를 확인한다.**
