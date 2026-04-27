# Phase 2: 코드 규칙

> Phase 1에서 구조 전환이 완료된 상태이다. 이 Phase에서는 ESLint 규칙 설정, Named Export 전환, import type 전환을 수행한다. 규칙 정의는 [eslint-config.md](../../architecture/rules/eslint-config.md)를 따른다.

> **timing.log 기록:** 각 단계(4~5) 시작 시 `echo "step_N: $(date +%s)" >> .architecture-migration/timing.log` 실행. tsc/eslint 실패 시 `echo "phase_2_[tsc|eslint]_fail" >>`, 빌드 시 `echo "phase_2_build" >>`.

### 4단계: ESLint 규칙 + Prettier 설정

[eslint-config.md](../../architecture/rules/eslint-config.md)를 읽고 프로젝트에 적용한다:

0. **필수 의존성 확인:** eslint-config.md의 "필수 의존성" 섹션을 따라 미설치 플러그인을 설치
1. **ESLint 버전 감지:** `eslint.config.*` 존재 → Flat Config (9+), `.eslintrc.*` 존재 → Legacy Config (8)
2. **해당 버전의 템플릿 파일만 읽기** — [eslint-flat-config.md](../../architecture/rules/eslint-flat-config.md) 또는 [eslint-legacy-config.md](../../architecture/rules/eslint-legacy-config.md) 중 하나만 로드
3. **Next.js 프로젝트:** eslint-config.md의 "Next.js 프로젝트 추가 규칙" 섹션도 적용
4. **기존 설정 병합:** eslint-config.md의 병합 절차를 따른다
5. **Prettier 정착:** [project-config.md#prettier](../../architecture/rules/project-config.md#prettier)를 따른다. 기존 Prettier 설정이 감지되면 `.prettierrc` 생성은 건너뛰고, `eslint-config-prettier` 연동만 수행한다 (미설치면 설치)
6. **검증:** `yarn lint` (또는 프로젝트의 lint 명령)을 실행

### 5단계: Named Export 전환 + import type 전환

두 작업은 독립적이므로 **Agent 2개를 동시에** 생성하여 병렬 처리할 수 있다.

#### Named Export 전환

1. **위반 파일 목록 수집:**
   ```bash
   npx eslint --no-warn-ignored --quiet --rule '{"import/no-default-export": "error"}' 'src/**/*.{ts,tsx}' 2>&1 | head -50
   ```

2. **일괄 전환:** `export default` → Named Export, default import → Named Import로 수정
   - `export default function Foo()` → `export function Foo()`
   - `import Foo from './path'` → `import { Foo } from './path'`

3. **검증:** 1번 명령 재실행 → 위반 0건 확인

#### import type 전환

eslint `--fix`로 자동 수정:

```bash
npx eslint --fix --rule '{"@typescript-eslint/consistent-type-imports": ["error", {"prefer": "type-imports"}]}' 'src/**/*.{ts,tsx}'
```

### 사전 점검 (빌드 전)

이 Phase에서 ESLint를 처음 설정했으므로, 레이어 방향 규칙도 처음 검증한다.

#### 공통 점검 (tsc → eslint → 빌드)

```bash
# tsc 타입 검사
npx tsc --noEmit 2>&1 | head -50
```

```bash
# eslint 레이어 규칙 검증
npx eslint --no-warn-ignored --quiet --rule '{"no-restricted-imports": "error"}' 'src/**/*.{ts,tsx}' 2>&1 | head -30
```

**두 검사를 모두 통과한 후** 빌드를 실행한다.

### 빌드 검증 후 커밋

```bash
git add -A
git commit -m "refactor: ESLint 규칙 및 Named Export 적용"
```

**사용자에게 Phase 2 완료를 알리고, Phase 3 진행 여부를 확인한다.**
