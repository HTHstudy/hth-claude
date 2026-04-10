# Phase 1: 구조 전환

> Phase 0에서 migration-plan.md + mapping.tsv가 준비된 상태이다. 이 Phase에서는 파일 이동, import 재작성만 수행한다. 구조/레이어 규칙은 migration-plan.md를 따른다.

### 1단계: 계획 확인

`.architecture-migration/migration-plan.md`와 `.architecture-migration/mapping.tsv`를 읽는다. Next.js 프로젝트면 migration-plan.md의 "프레임워크 특이사항"을 확인한다.

### 2단계: 기본 구조 생성 및 파일 이동

migration-plan.md의 Phase 1 섹션에 명시된 구조를 생성하고, mapping.tsv에 따라 파일을 이동한다.

#### 경로 상수 파일 생성

기본 구조 생성 시 `src/shared/routes/paths.ts`를 함께 생성한다. 기존 프로젝트에 라우트 경로 문자열이 하드코딩되어 있으면 상수로 추출하고, 없으면 빈 상수 객체로 scaffold한다.

#### 일괄 처리 전략

mapping.tsv의 행 수에 따라 전략을 선택한다:

##### A. 파일 20개 미만 — 단일 스크립트

```bash
# 1. 대상 디렉토리 일괄 생성
awk -F'\t' '{print $2}' .architecture-migration/mapping.tsv | xargs -I{} dirname {} | sort -u | xargs mkdir -p

# 2. git mv 일괄 실행
while IFS=$'\t' read -r from to; do
  [[ "$from" == \#* ]] && continue
  git mv "$from" "$to"
done < .architecture-migration/mapping.tsv
```

##### B. 파일 20개 이상 — 레이어별 병렬 Agent

**1단계: mapping.tsv를 레이어별로 분할**

```bash
grep -P '\t[^\t]*app/' .architecture-migration/mapping.tsv > .architecture-migration/app-mapping.tsv || true
grep -P '\t[^\t]*pages/' .architecture-migration/mapping.tsv > .architecture-migration/pages-mapping.tsv || true
grep -P '\t[^\t]*shared/' .architecture-migration/mapping.tsv > .architecture-migration/shared-mapping.tsv || true
```

**2단계: 레이어별 Agent를 동시에 생성 (3개 Agent 병렬 호출)**

- **Agent 1 (app):** app-mapping.tsv → mkdir + git mv
- **Agent 2 (pages):** pages-mapping.tsv → mkdir + git mv
- **Agent 3 (shared):** shared-mapping.tsv → mkdir + git mv

**worktree 격리를 사용하지 않는다** — 같은 워킹트리에서 실행해야 git mv가 정상 동작한다.

**3단계: Agent 완료 후 통합 처리**

#### macOS 대소문자 비구분 파일시스템 대응

PascalCase → kebab-case rename 시 임시 경로를 경유한다:

```bash
git mv src/pages/MyPage.tsx src/pages/tmp-my-page.tsx
git mv src/pages/tmp-my-page.tsx src/pages/my-page.tsx
```

#### 폴더 page의 index.tsx 규칙

폴더로 이동한 page에 공개 엔트리(`index.tsx`)가 없으면, 루트 컴포넌트 파일을 `index.tsx`로 rename한다. **re-export 래퍼를 생성하지 않는다.**

```bash
# home/main.tsx가 루트 파일인 경우 → index.tsx로 rename
git mv src/pages/home/main.tsx src/pages/home/tmp-index.tsx
git mv src/pages/home/tmp-index.tsx src/pages/home/index.tsx
```

**판단 기준:**
1. 폴더 내에 다른 파일을 import하는 "루트" 파일이 1개 → `index.tsx`로 rename
2. 루트 파일 없이 모든 파일이 독립적 → `index.tsx`에서 조합 로직을 직접 작성
3. 이미 `index.tsx`가 존재 → 그대로 유지

#### 빈 디렉토리 정리

```bash
awk -F'\t' '{print $1}' .architecture-migration/mapping.tsv | xargs -I{} dirname {} | sort -u -r | while read -r dir; do
  [ -d "$dir" ] && find "$dir" -type d -empty -delete
done
```

### 3단계: import 수정 및 tsconfig paths 설정

mapping.tsv 기반으로 import 경로를 일괄 치환한다.

#### import 일괄 치환

**대량 치환은 sed, 소수 정밀 수정은 Edit 도구.**

1. **매핑에서 sed 치환 규칙 생성**
2. **Grep으로 대상 파일 수집 → sed 일괄 실행**:
   ```bash
   sed -i '' \
     -e "s|from ['\"]\\.\\.*/components/Header['\"]|from '@app/header'|g" \
     -e "s|from ['\"]\\.\\.*/utils/format['\"]|from '@shared/lib/format'|g" \
     src/app/*.tsx src/pages/*.tsx src/shared/**/*.ts
   ```
   치환 패턴 10개 이상이면 `.architecture-migration/fix-imports.sed` 파일로 분리

3. **잔여 import 검증** — Grep:
   - pattern: `from ['\"]\.\.\/`
   - glob: `*.{ts,tsx}`
   - head_limit: 20

4. **비정형 패턴** (동적 import 등)은 개별 Edit 도구로 수정

#### tsconfig paths 설정

migration-plan.md의 path alias 목록에 따라 `tsconfig.json`에 경로 별칭을 설정한다.

### 사전 점검 (빌드 전)

SCSS/CSS 파일은 tsc 대상이 아니므로 Grep으로 별도 점검한다:

- **SCSS/CSS `@import`/`@use` 경로 불일치**: pattern `@import|@use`, glob `*.{scss,css,sass,less}`, head_limit 20 — 파일 이동 후 내부 경로가 맞는지 확인

> TS/TSX import 경로는 tsc가 잡고, cross-layer 상대경로는 Phase 2의 ESLint가 잡는다.

#### 공통 점검 (tsc → 빌드)

Phase 1에서는 ESLint가 아직 설정되지 않았으므로 **tsc만** 실행한다.

```bash
npx tsc --noEmit 2>&1 | head -50
```

tsc 에러가 있으면 수정한다. **tsc를 통과한 후** 빌드를 실행한다.

### 빌드 검증 후 커밋

```bash
git add -A
git commit -m "refactor: 레이어드 아키텍처 폴더 구조 전환"
```

**사용자에게 Phase 1 완료를 알리고, Phase 2 진행 여부를 확인한다.**
