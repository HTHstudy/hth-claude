# Phase 1: 구조 전환

### 1단계: Phase 0 평가 확인

`.architecture-migration/assessment.md`를 읽고 프로젝트 정보를 확인한다:
- 프레임워크, 빌드 도구, 소스 루트, 패키지 매니저
- 복잡도 등급과 적용 대상 Phase
- **파일 구조, 소스 파일 목록, import 맵** (Phase 0에서 수집한 스냅샷)

assessment.md의 스냅샷만으로 전환 계획을 수립한다. 소스 파일을 개별적으로 다시 읽지 않는다. 변경 전 현재 구조를 사용자에게 보고한다.

**병렬 읽기:** assessment.md와 참조 문서(Next.js 프로젝트면 [nextjs.md](../../architecture/integrations/nextjs.md))를 **동시에** 읽는다. 직렬로 읽지 않는다.

### 2단계: 전환 계획 수립

> **이 분류는 패턴 매칭이다. 설계 판단이 아니다.** import-map의 데이터만으로 기계적으로 분류한다. 컴포넌트를 개별로 읽거나 내부 로직을 분석하지 않는다. 개별 파일 Read 금지.

> **Phase 1은 레이어 배치와 구조 전환만 수행한다.** 파일명 변환(kebab-case), 폴더 구조 전환(단일 파일 → 폴더), FSD import 방향 검증은 **Phase 4에서 처리한다.** 여기서 판단하지 않는다.

assessment.md의 import 맵(또는 `.architecture-migration/import-map.txt`)을 **1회 읽고**, 아래 절차를 순서대로 실행한다.

#### 분류 절차 (순서대로 실행, 먼저 매칭 우선)

**Step A.** import-map에서 `ClientLayout` 또는 루트 `layout.tsx`가 직접 import하는 컴포넌트 목록 추출 → 전부 `app/`

**Step B.** 각 route `page.tsx`가 import하는 컴포넌트 추출 → 해당 page에 귀속 (`pages/[page-name]/`)

**Step C.** Step B에서 2개 이상 page에 등장한 컴포넌트 → `shared/ui/`로 승격

**Step D.** 나머지는 현재 디렉토리 기반으로 기계적 매핑:

| 현재 디렉토리 | → 대상 | 비고 |
|--------------|--------|------|
| `hooks/` | `shared/hooks/` | |
| `lib/` | `shared/lib/` | |
| `stores/` | `shared/stores/` | |
| `i18n/` | `shared/i18n/` | |
| `types/` | `shared/types/` | |
| `styles/` 중 `globals` | `app/` | 전역 스타일 |
| `styles/` 나머지 | `shared/styles/` | 설정/변수 |

이 절차에서 thinking을 길게 쓰지 않는다. import-map에서 카운트하고 바로 매핑 테이블을 작성한다.

#### 매핑 테이블 작성

매핑 테이블을 `.architecture-migration/mapping.tsv`에 TSV 형식으로 저장한다. 이 파일은 3단계(git mv)와 4단계(import 수정)에서 셸 스크립트의 입력으로 사용한다.

```
# 현재경로\t대상경로
src/components/Header.tsx	src/app/Header.tsx
src/views/Home.tsx	src/pages/Home.tsx
src/utils/format.ts	src/shared/lib/format.ts
```

**파일명은 현재 이름 그대로 유지한다.** kebab-case 변환은 Phase 4에서 일괄 처리한다.

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

**Phase 1에서는 현재 디렉토리 구조를 그대로 유지하여 이동한다.** 폴더 전환(단일 파일 → 폴더 + index.tsx)은 Phase 4에서 수행한다.

- 현재 폴더에 있는 파일들은 폴더 채로 이동한다 (예: `components/connect/` → `pages/connect/`)
- 현재 단일 파일은 단일 파일로 이동한다 (예: `components/promotion/Promotion.tsx` → `pages/Promotion.tsx`)

#### 일괄 처리 전략

파일 이동은 2단계에서 저장한 `.architecture-migration/mapping.tsv`를 셸 스크립트의 입력으로 사용하여 일괄 처리한다:

```bash
# 1. 대상 디렉토리 일괄 생성
awk -F'\t' '{print $2}' .architecture-migration/mapping.tsv | xargs -I{} dirname {} | sort -u | xargs mkdir -p

# 2. git mv 일괄 실행 (파일명 유지이므로 대소문자 충돌 없음)
while IFS=$'\t' read -r from to; do
  [[ "$from" == \#* ]] && continue  # 주석 스킵
  git mv "$from" "$to"
done < .architecture-migration/mapping.tsv
```

> **참고:** Phase 1에서는 파일명을 변경하지 않으므로 macOS 대소문자 비구분 파일시스템 문제가 발생하지 않는다. 대소문자 변경(PascalCase → kebab-case)은 Phase 4에서 처리하며, 이때 임시 경로 경유 2단계 rename을 사용한다.

#### 빈 디렉토리 정리

`git mv`는 파일만 이동하고 빈 디렉토리를 남긴다. 파일 이동 완료 후 반드시 빈 디렉토리를 정리한다:

```bash
# mapping.tsv의 이동 전 경로에서 빈 디렉토리 수집 및 삭제
awk -F'\t' '{print $1}' .architecture-migration/mapping.tsv | xargs -I{} dirname {} | sort -u -r | while read -r dir; do
  [ -d "$dir" ] && find "$dir" -type d -empty -delete
done
```

정리 후 `src/` 아래에 FSD 레이어(`app/`, `pages/`, `shared/`)만 남아있는지 확인한다. 이전 구조의 디렉토리(`components/`, `hooks/`, `lib/`, `stores/`, `styles/`, `types/` 등)가 빈 폴더로 남아있으면 안 된다.

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
- **SCSS/CSS Module import**: 파일 이동 후 import 경로 불일치
- **절대경로 잔여**: 이전 경로 별칭이나 상대경로가 남아있는지 확인
- **타입 import**: `import { Type }` → `import type { Type }` 변환 누락

Grep 도구로 아래 패턴을 점검한다:
- 이전 상대경로 잔여: pattern `from ['\"]\.\.\/`, glob `*.{ts,tsx}`, head_limit 20
- 이전 경로 별칭 잔여: pattern `@old-alias/`, glob `*.{ts,tsx}`, head_limit 20
- **SCSS/CSS import 경로 불일치**: pattern `@import|@use`, glob `*.{scss,css,sass,less}`, head_limit 20
- **CSS Module import 불일치**: pattern `\.module\.(scss|css|sass|less)`, glob `*.{ts,tsx}`, head_limit 20 — 파일 이동 후 import 경로가 맞는지 확인

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
