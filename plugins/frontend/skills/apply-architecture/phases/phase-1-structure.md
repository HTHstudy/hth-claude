# Phase 1: 구조 전환

### 1단계: Phase 0 평가 확인

`.architecture-migration/assessment.md`를 읽고 프로젝트 정보를 확인한다:
- 프레임워크, 빌드 도구, 소스 루트, 패키지 매니저
- 복잡도 등급과 적용 대상 Phase
- **파일 구조, 소스 파일 목록, import 맵** (Phase 0에서 수집한 스냅샷)

assessment.md의 스냅샷만으로 전환 계획을 수립한다. 소스 파일을 개별적으로 다시 읽지 않는다. 변경 전 현재 구조를 사용자에게 보고한다.

### 2단계: 전환 계획 수립

assessment.md의 스냅샷을 바탕으로 전환 계획을 작성한다:
- `app/`으로 이동할 파일 (라우팅, Provider, 전역 스타일)
- `pages/`로 이동할 파일 (route 기준 화면 모듈)
- `shared/`로 이동할 파일 (유틸리티, 훅, 설정, API 클라이언트)
- 현재 위치에 그대로 둘 파일 (이미 올바른 위치)

#### 컴포넌트 레이어 분류 기준

assessment.md의 import 맵을 참고하여 각 컴포넌트의 레이어를 판단한다. 아래 휴리스틱을 **위에서 아래로** 적용한다 (먼저 매칭되는 규칙 우선):

| 판단 기준 | → 레이어 | 예시 |
|-----------|----------|------|
| Router, Provider, 전역 Layout을 감싸는 최상위 컴포넌트 | `app/` | `Providers`, `AppRouter` |
| 루트 layout/App에서 직접 import하는 레이아웃 셸 | `app/` | `Header`, `Footer`, `Sidebar`, `ClientLayout` |
| route와 1:1 대응하는 화면 | `pages/` | `HomePage`, `ProductList` |
| 2개 이상의 page에서 import하는 공통 UI 컴포넌트 | `shared/ui/` | `Button`, `Modal`, `Card` |
| 유틸리티, 훅, 설정, API 클라이언트 | `shared/` 하위 적절한 세그먼트 | `useAuth` → `shared/hooks/`, `axios` → `shared/api/` |
| 1개 page에서만 사용하는 하위 컴포넌트 | 해당 page 폴더 내부 | `ProductCard` (ProductList 전용) |

**빠른 판단법:** import 맵에서 해당 컴포넌트를 import하는 파일 수를 세면 된다:
- 0개 (엔트리에서만 사용) → `app/`
- 1개 page → 해당 page 폴더 내부
- 2개 이상 page → `shared/ui/`

#### 매핑 테이블 작성

매핑 테이블을 `.architecture-migration/mapping.tsv`에 TSV 형식으로 저장한다. 이 파일은 3단계(git mv)와 4단계(import 수정)에서 셸 스크립트의 입력으로 사용한다.

```
# 현재경로\t대상경로
src/components/Header.tsx	src/app/header.tsx
src/views/Home.tsx	src/pages/home/index.tsx
src/utils/format.ts	src/shared/lib/format.ts
```

계획(매핑 테이블)을 사용자에게 제시하고 **확인을 받은 후** 진행한다.

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

[nextjs.md](../../architecture/integrations/nextjs.md)의 구조를 따른다. 목표 구조:

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

##### 기존 구조에서 전환하는 순서

대부분의 Next.js App Router 프로젝트는 `src/app/`에 Next.js 라우팅과 컴포넌트가 혼재되어 있다. 아래 순서로 분리한다:

**Step A. 루트 `app/` 생성 및 라우팅 파일 이동**
1. 루트에 `app/` 디렉토리를 생성한다
2. `src/app/`에서 **Next.js 라우팅 파일만** 루트 `app/`으로 이동한다:
   - `layout.tsx`, `page.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`
   - `[route]/page.tsx` 등 중첩 라우트 구조
   - `api/` 디렉토리 전체
   - `middleware.ts`는 프로젝트 루트로 이동
3. `next.config.js`에서 `src` 디렉토리 설정이 있으면 제거한다 (루트 `app/`을 사용하므로)

**Step B. `src/app/`을 FSD app 레이어로 정리**
1. `src/app/`에 남은 파일 중 Provider, 전역 스타일, 전역 레이아웃 셸만 남긴다
2. page 컴포넌트는 `src/pages/`로 이동한다
3. 공통 컴포넌트/훅/유틸은 `src/shared/`로 이동한다

**Step C. 루트 `app/`의 파일을 re-export 래퍼로 교체**
1. 루트 `app/layout.tsx`에서 `src/app/`의 providers와 global style을 조립하도록 재작성한다
2. 루트 `app/[route]/page.tsx`는 `src/pages/`의 page를 re-export만 하도록 재작성한다
3. 루트에 빈 `pages/` 폴더 + README.md를 생성한다

**주의:**
- `src/` 폴더가 없으면 생성하고 FSD 레이어를 `src/` 안에 배치한다.
- **루트 `app/`에 로직, 훅, 컴포넌트를 직접 구현하지 않는다.**
- Step A에서 라우팅 파일 이동 시 `tsconfig.json`의 `paths` 별칭이 깨지지 않도록 주의한다

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

#### 파일 vs 폴더 판단 기준

page(및 모든 컴포넌트)를 폴더로 만들지, 단일 파일로 둘지는 **하위 종속 컴포넌트 유무**로 결정한다:

| 조건 | 형태 | 예시 |
|------|------|------|
| 종속 컴포넌트·훅·스타일이 없음 | **단일 파일** | `pages/about-brandstory.tsx` |
| 종속 컴포넌트·훅·스타일이 2개 이상 | **폴더 + index.tsx** | `pages/about-brandstory/index.tsx` + 하위 파일들 |

- 종속 파일이 **1개뿐**이면 해당 로직을 index.tsx에 합쳐서 단일 파일로 유지한다.
- index.tsx가 단순 re-export만 하는 래퍼가 되어서는 안 된다. index.tsx는 실제 구현 파일이다.
- 파일 크기가 아니라 **종속 컴포넌트 유무**가 기준이다.

#### 일괄 처리 전략

파일 이동은 2단계에서 저장한 `.architecture-migration/mapping.tsv`를 셸 스크립트의 입력으로 사용하여 일괄 처리한다:

```bash
# 1. 대상 디렉토리 일괄 생성
awk -F'\t' '{print $2}' .architecture-migration/mapping.tsv | xargs -I{} dirname {} | sort -u | xargs mkdir -p

# 2. 대소문자만 변경하는 항목 분리 (macOS 대응)
# 대소문자 변경이 필요한 파일: 임시 경로 경유 2단계 rename
# 그 외: 직접 git mv

# 3. git mv 일괄 실행
while IFS=$'\t' read -r from to; do
  [[ "$from" == \#* ]] && continue  # 주석 스킵
  git mv "$from" "$to"
done < .architecture-migration/mapping.tsv
```

**macOS 대소문자 비구분 파일시스템 대응**: 파일명의 대소문자만 변경하는 경우(예: PascalCase → kebab-case) 직접 `git mv`가 실패한다. 반드시 임시 경로를 경유하는 2단계 rename을 사용한다:

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

#### import 일괄 치환

`.architecture-migration/mapping.tsv`와 assessment.md의 import 맵을 기반으로 import 경로를 일괄 치환한다.

**대량 치환은 sed, 소수 정밀 수정은 Edit 도구**를 사용한다. Read → Edit 방식은 파일 수 × 패턴 수만큼 도구 호출이 필요하여 비효율적이다.

1. **매핑 테이블에서 sed 치환 규칙 생성**:
   - 매핑: `src/components/Header.tsx` → `src/app/header.tsx` → sed: `s|from ['"].*components/Header['"]|from '@app/header'|g`
   - 매핑: `src/utils/format.ts` → `src/shared/lib/format.ts` → sed: `s|from ['"].*utils/format['"]|from '@shared/lib/format'|g`

2. **Grep으로 치환 대상 파일 목록 수집 → sed로 일괄 치환**:
   - Grep 도구로 이전 import 경로를 포함하는 파일 목록을 수집 (output_mode: files_with_matches)
   - 대상 파일에 sed를 일괄 실행:

   ```bash
   # 예시: mapping.tsv에서 sed 명령 생성
   sed -i '' \
     -e "s|from ['\"]\\.\\.*/components/Header['\"]|from '@app/header'|g" \
     -e "s|from ['\"]\\.\\.*/utils/format['\"]|from '@shared/lib/format'|g" \
     src/app/*.tsx src/pages/*.tsx src/shared/**/*.ts
   ```

   - 치환 패턴이 10개 이상이면 `.architecture-migration/fix-imports.sed` 파일로 분리하여 `sed -i '' -f fix-imports.sed` 실행

3. **잔여 import 검증** — Grep 도구 사용:
   - pattern: `from ['\"]\.\.\/`
   - glob: `*.{ts,tsx}`
   - path: [소스루트]
   - head_limit: 20

4. **잔여 패턴 정밀 수정** — sed로 처리하기 어려운 비정형 패턴(동적 import, 조건부 import 등)은 개별 Edit 도구로 수정한다.

**핵심:** 대량의 정형 치환은 sed로 한 번에, 소수의 비정형 패턴만 Edit으로 개별 처리한다.

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

Grep 도구로 아래 패턴을 점검한다:
- 이전 상대경로 잔여: pattern `from ['\"]\.\.\/`, glob `*.{ts,tsx}`, head_limit 20
- 이전 경로 별칭 잔여: pattern `@old-alias/`, glob `*.{ts,tsx}`, head_limit 20
- **SCSS/CSS import 경로 불일치**: pattern `@import|@use`, glob `*.{scss,css,sass,less}`, head_limit 20
- **CSS Module import 불일치**: pattern `\.module\.(scss|css|sass|less)`, glob `*.{ts,tsx}`, head_limit 20 — 파일명 대소문자 변경 후 import 경로가 맞는지 확인

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
