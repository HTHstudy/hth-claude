# Phase 2: 규칙 적용

> Phase 1에서 폴더 구조 전환(git mv + kebab-case + import 재작성)이 완료된 상태이다. 이 단계에서는 ESLint 규칙 설정, Named Export 전환, import type 전환을 수행한다.

### 4단계: ESLint 규칙 설정

[eslint-config.md](../../architecture/rules/eslint-config.md)를 읽고 프로젝트에 적용한다:

0. **필수 의존성 확인:** eslint-config.md의 "필수 의존성" 섹션을 따라 `eslint-plugin-import`, `@typescript-eslint/*` 등이 설치되어 있는지 확인하고, 미설치 시 설치한다
1. **ESLint 버전 감지:** `eslint.config.*` 존재 (`.js`, `.mjs`, `.cjs`, `.ts`, `.mts`, `.cts`) → Flat Config (9+), `.eslintrc.*` 존재 → Legacy Config (8)
2. **해당 버전의 템플릿 파일만 읽는다** — eslint-config.md의 "버전별 템플릿" 링크를 따라 [eslint-flat-config.md](../../architecture/rules/eslint-flat-config.md) 또는 [eslint-legacy-config.md](../../architecture/rules/eslint-legacy-config.md) 중 하나만 로드. `no-restricted-imports`, `import/no-default-export`, `@typescript-eslint/consistent-type-imports` 등 모든 규칙을 포함해야 한다.
3. **Next.js 프로젝트:** eslint-config.md의 "Next.js 프로젝트 추가 규칙" 섹션도 함께 적용한다
4. **기존 설정이 있으면:** eslint-config.md의 "기존 ESLint 설정이 있는 프로젝트" 병합 절차를 따른다
5. **검증:** `yarn lint` (또는 프로젝트의 lint 명령)을 실행하여 규칙이 정상 동작하는지 확인한다

### 5단계: Named Export 전환 + import type 전환

#### Named Export 전환

ESLint `import/no-default-export` 규칙이 `error`이므로, 기존 `export default`를 모두 Named Export로 전환한다. 프레임워크 예외 파일(ESLint 설정에서 `import/no-default-export: 'off'`인 `page.tsx`, `layout.tsx` 등)은 제외.

1. **위반 파일 목록 수집:**
   ```bash
   npx eslint --no-warn-ignored --quiet --rule '{"import/no-default-export": "error"}' 'src/**/*.{ts,tsx}' 2>&1 | head -50
   ```

2. **일괄 전환:** 위반 파일의 `export default` → Named Export, default import → Named Import로 수정한다.
   - `export default function Foo()` → `export function Foo()`
   - `export default Foo` → named 선언으로 변경
   - `import Foo from './path'` → `import { Foo } from './path'`

3. **검증:** 1번 명령을 재실행하여 위반 0건 확인.

#### import type 전환

eslint `--fix`로 자동 수정한다:

```bash
npx eslint --fix --rule '{"@typescript-eslint/consistent-type-imports": ["error", {"prefer": "type-imports"}]}' 'src/**/*.{ts,tsx}'
```

### 사전 점검 (빌드 전)

이 Phase에서 ESLint를 처음 설정했으므로, 레이어 방향 규칙도 처음 검증한다.

#### 공통 점검 (tsc → eslint → 빌드)

아래를 **순서대로** 실행한다. 빌드는 두 검사를 모두 통과한 후에만 수행한다.

```bash
# tsc 타입 검사
npx tsc --noEmit 2>&1 | head -50
```

tsc 에러가 있으면 수정한다.

```bash
# eslint 레이어 규칙 검증
npx eslint --no-warn-ignored --quiet --rule '{"no-restricted-imports": "error"}' 'src/**/*.{ts,tsx}' 2>&1 | head -30
```

eslint 에러가 있으면 수정한다. **두 검사를 모두 통과한 후** 빌드를 실행한다.

### 빌드 검증 후 커밋

빌드가 정상이면 중간 커밋을 생성한다:

```bash
git add -A
git commit -m "refactor: ESLint 규칙 및 Named Export 적용"
```

**사용자에게 Phase 2 완료를 알리고, Phase 3 진행 여부를 확인한다.**
