# ESLint 설정 템플릿

프로젝트에 아키텍처를 적용할 때 아래 ESLint 설정을 함께 추가한다.
프로젝트의 ESLint 버전에 맞는 형식을 사용한다.

## 적용하는 규칙

| 규칙 | 설명 | 차단 예시 |
|------|------|-----------|
| Slice 내부 접근 차단 | `@[layer]/*/*` 패턴 차단 | `import { x } from '@pages/home/utils'` |
| 레이어 방향 강제 | 하위 → 상위 레이어 import 차단 | shared에서 `import { x } from '@pages/home'` |
| 같은 레이어 cross-import 차단 | sibling Slice 간 import 차단 | pages/home에서 `import { x } from '@pages/products'` |
| 상대경로 레이어 횡단 차단 | 다른 레이어 접근 시 alias 강제 | `import { x } from '../../shared/lib/utils'` |
| Named Export 강제 | default export 차단 (프레임워크 요구 파일 제외) | `export default function Page()` |
| 타입 import 강제 | 타입에 `type` 키워드 필수 | `import { Foo } from './types'` (타입인 경우) |
| 파일명 케밥 케이스 | 파일명을 kebab-case로 강제 | `myComponent.tsx` |
| 순환 의존 금지 | 순환 import 경로 차단 | `a.ts → b.ts → a.ts` |

> **주의:** ESLint `no-restricted-imports`는 파일별 override 시 기본 규칙을 덮어쓴다(merge가 아닌 replace). 따라서 각 레이어별 설정에 공통 패턴(`basePatterns`)을 반복 포함해야 한다. 아래 템플릿은 헬퍼 함수로 이를 처리한다.

## 필수 의존성

아래 패키지가 설치되어 있지 않으면 규칙을 적용하기 전에 설치한다. 이미 설치된 패키지는 건너뛴다.

| 패키지 | 용도 | 필요 버전 |
|--------|------|----------|
| `eslint-plugin-import` | `import/no-default-export`, `import/no-cycle` 규칙 | ^2.29 |
| `eslint-plugin-check-file` | 파일명 네이밍 규칙 (`check-file/filename-naming-convention`) | ^2.0 |
| `@typescript-eslint/eslint-plugin` | `consistent-type-imports` 규칙 | ^7.0 \|\| ^8.0 |
| `@typescript-eslint/parser` | TypeScript 파싱 | ^7.0 \|\| ^8.0 |
| `typescript-eslint` | Flat Config 전용 (9+) — 위 두 패키지를 통합 제공 | ^8.0 |

**감지 후 설치:**
1. `package.json`의 `devDependencies`에서 각 패키지 존재 여부를 확인한다
2. 미설치 패키지가 있으면 프로젝트의 패키지 매니저로 설치한다:
   - Flat Config (9+): `typescript-eslint` + `eslint-plugin-import` + `eslint-plugin-check-file`
   - Legacy Config (8): `@typescript-eslint/eslint-plugin` + `@typescript-eslint/parser` + `eslint-plugin-import` + `eslint-plugin-check-file`
3. **플러그인 미설치 상태로 규칙을 건너뛰지 않는다.** 설치 후 규칙을 적용한다.

## 버전별 템플릿

ESLint 버전을 감지한 후 **해당 템플릿만** 읽는다. 두 파일을 모두 읽지 않는다:

- `eslint.config.*` 존재 (`.js`, `.mjs`, `.cjs`, `.ts`, `.mts`, `.cts`) → **Flat Config (9+)**: [eslint-flat-config.md](eslint-flat-config.md)
- `.eslintrc.*` 존재 (`.js`, `.cjs`, `.json`, `.yml`, `.yaml`) → **Legacy Config (8)**: [eslint-legacy-config.md](eslint-legacy-config.md)

## Next.js 프로젝트 추가 규칙

Next.js 프로젝트에서는 API route ↔ FSD 레이어 간 import도 차단해야 한다. 위 템플릿의 레이어별 설정에 아래 override를 추가한다. 상세 배경은 [nextjs.md](../integrations/nextjs.md)의 "SKILL.md 규칙과의 차이" 섹션을 참조.

```js
// API route 파일에서 FSD 레이어 import 차단
{
  files: ['app/api/**/*.{ts,tsx,js,jsx}'],
  rules: {
    'no-restricted-imports': ['error', {
      patterns: [
        {
          group: [
            '@app', '@app/*', '@pages', '@pages/*', '@shared', '@shared/*',
            '@widgets', '@widgets/*', '@features', '@features/*', '@entities', '@entities/*',
          ],
          message: 'API route는 FSD 레이어를 import할 수 없습니다. 자체적으로 로직을 완결하세요.',
        },
      ],
    }],
  },
},
```

> FSD 레이어 → API route 방향은 별도 차단 불필요. API route는 `src/` 밖(루트 `app/api/`)에 있어 path alias로 접근할 수 없고, 상대경로도 depth가 깊어 실질적으로 발생하지 않는다.

## 기존 ESLint 설정이 있는 프로젝트

기존 ESLint 규칙이 있으면 **전체 교체가 아닌 병합**으로 적용한다. 기존 규칙을 유실하지 않는다.

### 병합 절차

1. **기존 설정 확인**: ESLint 설정 파일(`eslint.config.*` 또는 `.eslintrc.*`)을 읽고, 기존 rules/extends/plugins/overrides를 파악한다.
2. **아키텍처 규칙만 추가**: 아래 3가지를 기존 설정에 병합한다. 기존 rules/extends/plugins는 그대로 유지한다.
   - `no-restricted-imports` — 레이어별 override (Flat Config: 별도 config 객체 추가, Legacy: overrides 배열에 추가)
   - `import/no-default-export` + default export 예외 파일 override
   - `@typescript-eslint/consistent-type-imports`
3. **충돌 처리**:
   - 기존 `no-restricted-imports`가 있으면 기존 patterns에 아키텍처 patterns를 **합친다** (replace 아님)
   - `import/no-default-export`와 `consistent-type-imports`는 아키텍처 필수 규칙이다. 기존 설정이 `off`나 `warn`이면 `error`로 **덮어쓴다**
   - 기존 extends(`airbnb`, `next/core-web-vitals` 등)나 아키텍처와 무관한 플러그인/규칙은 그대로 유지한다. 단, 아키텍처 규칙이 extends보다 **뒤에** 위치하도록 배치하여 우선순위를 보장한다
4. **검증**: `yarn lint` (또는 프로젝트의 lint 명령)으로 기존 규칙과 아키텍처 규칙이 모두 동작하는지 확인한다.

> **새 프로젝트(create)**에서도 스캐폴딩 도구(Vite, create-next-app 등)가 ESLint 설정을 생성하므로 병합 절차를 따른다.

## 적용 시점

- **새 프로젝트 (create):** 프로젝트 생성 시 전체 템플릿 포함
- **기존 프로젝트 (migrate):** Phase 1의 4단계에서 위 병합 절차로 추가
- **자동 트리거 (architecture):** 스킬 로드 시 감지 → 사용자 동의 후 위 병합 절차로 추가
- 모든 레이어(선택 레이어 포함)의 규칙을 처음부터 포함한다. 해당 레이어 폴더가 없어도 규칙이 있으면 해가 없고, 나중에 도입 시 누락을 방지한다.
