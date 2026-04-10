# Phase 1: 구조 전환

> Phase 0에서 assessment.md + mapping.tsv가 준비된 상태이다. 이 Phase에서는 파일 이동, kebab-case rename, import 재작성만 수행한다. ESLint/Named Export/import type은 Phase 2에서 처리한다. 폴더 구조 전환(단일 파일 → 폴더)은 Phase 5에서 처리한다.

### 1단계: mapping.tsv 및 프로젝트 정보 확인

`.architecture-migration/mapping.tsv`와 `.architecture-migration/assessment.md`를 읽는다. Next.js 프로젝트면 [nextjs.md](../../architecture/integrations/nextjs.md)도 **병렬로 동시에** 읽는다. nextjs.md를 읽을 때는 assessment.md에서 확인한 라우터 타입(App Router / Pages Router)에 해당하는 섹션과 공통 섹션(route-Slice 매핑, API Routes, 특수 파일)만 읽는다.

확인 항목:
- 프레임워크, 빌드 도구, 소스 루트
- mapping.tsv의 이동 계획 (Phase 0에서 사용자 승인 완료)

### 2단계: 기본 구조 생성 및 파일 이동

assessment.md에서 확인한 프레임워크에 따라 구조를 생성한다.

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
   - 기존 route page.tsx에 조합 로직(Suspense, hooks, 여러 컴포넌트 합성)이 있으면, 해당 로직을 `src/pages/[page-name]/index.tsx`로 추출한다. `connect-page.tsx` 같은 이름이 아닌 **반드시 `index.tsx`**를 사용한다.
   - 단일 컴포넌트를 그대로 반환하는 경우는 추출하지 않고 route page.tsx에서 직접 re-export한다.
3. 루트에 빈 `pages/` 폴더 + README.md를 생성한다

**주의: 루트 `app/`의 파일을 재작성할 때 반드시 Read 도구로 먼저 읽은 후 Write한다.** Read 없이 Write하면 도구 에러가 발생하여 불필요한 왕복이 생긴다.

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

**Phase 1에서는 현재 디렉토리 구조를 그대로 유지하여 이동한다.** 폴더 전환(단일 파일 → 폴더 + index.tsx)은 Phase 5에서 수행한다.

- 현재 폴더에 있는 파일들은 폴더 채로 이동한다 (예: `components/connect/` → `pages/connect/`)
- 현재 단일 파일은 단일 파일로 이동한다 (예: `components/promotion/Promotion.tsx` → `pages/promotion.tsx`)

#### 일괄 처리 전략

mapping.tsv의 행 수에 따라 전략을 선택한다:

##### A. 파일 20개 미만 — 단일 스크립트

```bash
# 1. 대상 디렉토리 일괄 생성
awk -F'\t' '{print $2}' .architecture-migration/mapping.tsv | xargs -I{} dirname {} | sort -u | xargs mkdir -p

# 2. git mv 일괄 실행 (파일명 유지이므로 대소문자 충돌 없음)
while IFS=$'\t' read -r from to; do
  [[ "$from" == \#* ]] && continue  # 주석 스킵
  git mv "$from" "$to"
done < .architecture-migration/mapping.tsv
```

##### B. 파일 20개 이상 — 레이어별 병렬 Agent

파일이 많으면 레이어별 Agent를 **동시에** 생성하여 병렬 처리한다:

**1단계: mapping.tsv를 레이어별로 분할**

```bash
# app/ 레이어
grep -P '\t[^\t]*app/' .architecture-migration/mapping.tsv > .architecture-migration/app-mapping.tsv || true
# pages/ 레이어
grep -P '\t[^\t]*pages/' .architecture-migration/mapping.tsv > .architecture-migration/pages-mapping.tsv || true
# shared/ 레이어
grep -P '\t[^\t]*shared/' .architecture-migration/mapping.tsv > .architecture-migration/shared-mapping.tsv || true
```

**2단계: 레이어별 Agent를 동시에 생성 (Agent 도구 병렬 호출)**

각 Agent에게 아래 작업을 지시한다 (3개 Agent를 단일 메시지에서 동시 호출):

- **Agent 1 (app):** `.architecture-migration/app-mapping.tsv`를 읽고 대상 디렉토리 생성 → git mv 실행
- **Agent 2 (pages):** `.architecture-migration/pages-mapping.tsv`를 읽고 대상 디렉토리 생성 → git mv 실행
- **Agent 3 (shared):** `.architecture-migration/shared-mapping.tsv`를 읽고 대상 디렉토리 생성 → git mv 실행

각 Agent는 자기 레이어의 mapping만 처리하므로 git mv 충돌이 없다. **worktree 격리를 사용하지 않는다** — 같은 워킹트리에서 실행해야 git mv가 정상 동작한다.

**3단계: Agent 완료 후 메인에서 통합 처리**

모든 Agent가 완료되면:
1. 빈 디렉토리 정리
2. cross-layer import 일괄 치환 (3단계에서 수행)
3. 잔여 패턴 Grep 검증

> **macOS 대소문자 비구분 파일시스템 대응**: PascalCase → kebab-case rename 시 대소문자만 다른 경로로 인식되어 직접 `git mv`가 실패한다. 반드시 임시 경로를 경유하는 2단계 rename을 사용한다:
>
> ```bash
> git mv src/pages/MyPage.tsx src/pages/tmp-my-page.tsx
> git mv src/pages/tmp-my-page.tsx src/pages/my-page.tsx
> ```
>
> 일괄 처리 스크립트에서 이를 자동 적용한다.

#### 빈 디렉토리 정리

`git mv`는 파일만 이동하고 빈 디렉토리를 남긴다. 파일 이동 완료 후 반드시 빈 디렉토리를 정리한다:

```bash
# mapping.tsv의 이동 전 경로에서 빈 디렉토리 수집 및 삭제
awk -F'\t' '{print $1}' .architecture-migration/mapping.tsv | xargs -I{} dirname {} | sort -u -r | while read -r dir; do
  [ -d "$dir" ] && find "$dir" -type d -empty -delete
done
```

정리 후 `src/` 아래에 FSD 레이어(`app/`, `pages/`, `shared/`)만 남아있는지 확인한다. 이전 구조의 디렉토리(`components/`, `hooks/`, `lib/`, `stores/`, `styles/`, `types/` 등)가 빈 폴더로 남아있으면 안 된다.

### 3단계: import 수정 및 tsconfig paths 설정

모든 import 경로를 새 구조에 맞게 수정한다:
- 상대 경로를 경로 별칭으로 교체 (`@app/`, `@pages/`, `@shared/`)
- 파일 이동으로 인한 깨진 import 수정

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

### 사전 점검 및 빌드 검증

#### 사전 점검 (빌드 전)

SCSS/CSS 파일은 tsc 대상이 아니므로 Grep으로 별도 점검한다:

- **SCSS/CSS `@import`/`@use` 경로 불일치**: pattern `@import|@use`, glob `*.{scss,css,sass,less}`, head_limit 20 — 파일 이동 후 내부 경로가 맞는지 확인

#### 공통 점검 (tsc → 빌드)

Phase 1에서는 ESLint가 아직 설정되지 않았으므로 **tsc만** 실행한다. eslint는 Phase 2에서 설정 후 검증한다.

```bash
# tsc 타입 검사
npx tsc --noEmit 2>&1 | head -50
```

tsc 에러가 있으면 수정한다. **tsc를 통과한 후** 빌드를 실행한다.

#### 빌드 검증

- 프로젝트를 실행하여 빌드 및 동작에 오류가 없는지 확인
- 최종 구조를 사용자에게 보고

### 빌드 검증 후 커밋

빌드가 정상이면 중간 커밋을 생성한다:

```bash
git add -A
git commit -m "refactor: 레이어드 아키텍처 폴더 구조 전환"
```

**사용자에게 Phase 1 완료를 알리고, Phase 2 진행 여부를 확인한다.**
