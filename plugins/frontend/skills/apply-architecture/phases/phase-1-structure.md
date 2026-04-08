# Phase 1: 구조 전환

### 1단계: Phase 0 평가 확인

`.architecture-migration/assessment.md`를 읽고 프로젝트 정보를 확인한다:
- 프레임워크, 빌드 도구, 소스 루트, 패키지 매니저
- 복잡도 등급과 적용 대상 Phase

현재 폴더 구조와 파일 위치를 파악하고, 변경 전 현재 구조를 사용자에게 보고한다.

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

- `widgets/`, `features/`, `entities/`는 생성하지 않는다 — 필요할 때만 도입.

#### 일괄 처리 전략

파일 이동은 개별 `git mv`를 반복하지 않고, 매핑 테이블 → 셸 스크립트로 일괄 처리한다:

1. **매핑 테이블 작성**: 이동 전에 모든 파일의 `현재 경로 → 대상 경로` 매핑을 먼저 정리한다
2. **셸 스크립트로 일괄 실행**: 매핑 테이블을 기반으로 `git mv`를 일괄 실행한다

```bash
# 예시: 대상 디렉토리 생성 후 일괄 이동
mkdir -p src/app src/pages src/shared

git mv src/components/Header.tsx src/app/header.tsx
git mv src/views/Home.tsx src/pages/home/index.tsx
# ... 매핑 테이블의 모든 항목
```

3. **macOS 대소문자 비구분 파일시스템 대응**: 파일명의 대소문자만 변경하는 경우(예: PascalCase → kebab-case) 직접 `git mv`가 실패한다. 반드시 임시 경로를 경유하는 2단계 rename을 사용한다:

```bash
# 틀림: macOS에서 실패
git mv src/MyComponent.tsx src/my-component.tsx

# 올바름: 임시 경로 경유
git mv src/MyComponent.tsx src/tmp-my-component.tsx
git mv src/tmp-my-component.tsx src/my-component.tsx
```

대소문자 변경이 필요한 파일이 여러 개이면, 모든 파일을 한 번에 임시 경로로 이동한 뒤 다시 한 번에 최종 경로로 이동한다.

### 4단계: import 수정 및 도구 설정

모든 import 경로를 새 구조에 맞게 수정한다:
- 상대 경로를 경로 별칭으로 교체 (`@app/`, `@pages/`, `@shared/`)
- 파일 이동으로 인한 깨진 import 수정
- 타입 import는 반드시 `import type` 사용

#### 일괄 치환 전략

import 수정도 개별 파일이 아닌, 3단계에서 작성한 매핑 테이블을 기반으로 프로젝트 전체를 일괄 치환한다:

1. **매핑 테이블 → import 치환 규칙**: 파일 이동 매핑에서 import 경로 변경 규칙을 도출한다
2. **프로젝트 전체 대상 일괄 수정**: Agent에 위임할 경우, 전체 매핑을 한 번에 전달하여 누락을 방지한다
3. **누락 검증**: 치환 후 `grep -r "이전경로"` 등으로 남아 있는 이전 import가 없는지 확인한다

도구 설정:
- `tsconfig.json` (또는 `tsconfig.app.json`)에 경로 별칭 추가 (`src/` 기준)
- Vite 사용 시 `resolve.tsconfigPaths: true` 설정
- Next.js 사용 시 `next.config.js` 설정 확인

#### ESLint `no-restricted-imports` 설정

[eslint-config.md](../../architecture/rules/eslint-config.md)를 읽고, 프로젝트에 맞게 적용한다:

1. **ESLint 버전 감지:** `eslint.config.js` 존재 → Flat Config (9+), `.eslintrc.*` 존재 → Legacy Config (8)
2. **적용할 패턴 결정:** Phase 1에서 실제 생성한 레이어만 포함한다. rules.md 템플릿의 4가지 규칙을 모두 적용한다:
   - Slice 내부 접근 차단 (`@[layer]/*/*`)
   - 레이어 방향 강제 (하위 → 상위 차단, 레이어별 override)
   - 같은 레이어 cross-import 차단
   - 상대경로 레이어 횡단 차단
3. **ESLint config 파일에 규칙 추가:** eslint-config.md의 해당 버전 템플릿을 적용한다
4. **Next.js 프로젝트:** [nextjs.md](../../architecture/integrations/nextjs.md)의 API route ↔ FSD 레이어 차단 규칙도 함께 추가한다
5. **검증:** `yarn lint` (또는 프로젝트의 lint 명령)을 실행하여 규칙이 정상 동작하는지 확인한다

### 5단계: 사전 점검 및 빌드 검증

빌드 실행 전에 known breaking pattern을 미리 점검하여 "빌드 → 실패 → 수정 → 재빌드" 반복을 최소화한다:

#### 사전 점검 (빌드 전)

프레임워크별로 자주 발생하는 문제를 미리 grep해서 일괄 수정한다:

- **Next.js App Router**: `searchParams`, `params`가 Promise로 바뀐 버전에서 null 체크/await 누락
- **SCSS/CSS Module import**: 파일명 대소문자 변경 후 import 경로 불일치
- **절대경로 잔여**: 이전 경로 별칭이나 상대경로가 남아있는지 확인
- **타입 import**: `import { Type }` → `import type { Type }` 변환 누락

```bash
# 예시: 이전 경로가 남아있는지 확인
grep -r "from ['\"]\.\./" src/ --include="*.ts" --include="*.tsx" | head -20
grep -r "@old-alias/" src/ --include="*.ts" --include="*.tsx" | head -20
```

#### 빌드 검증

- 프로젝트를 실행하여 빌드 및 동작에 오류가 없는지 확인
- 남아 있는 깨진 import 확인
- 최종 구조를 사용자에게 보고

### 빌드 검증 후 커밋

빌드가 정상이면 중간 커밋을 생성한다:

```bash
git add -A
git commit -m "refactor: 레이어드 아키텍처 폴더 구조 전환"
```

**사용자에게 Phase 1 완료를 알리고, Phase 2 진행 여부를 확인한다.**
