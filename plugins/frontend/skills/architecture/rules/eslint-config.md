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

> **주의:** ESLint `no-restricted-imports`는 파일별 override 시 기본 규칙을 덮어쓴다(merge가 아닌 replace). 따라서 각 레이어별 설정에 공통 패턴(`basePatterns`)을 반복 포함해야 한다. 아래 템플릿은 헬퍼 함수로 이를 처리한다.

## Flat Config (eslint.config.js) — ESLint 9+

```js
// eslint.config.js
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

// ── 공통 패턴 ──────────────────────────────────────────

/** Slice 내부 직접 접근 차단 */
const sliceInternalPatterns = [
  { group: ['@shared/api/*/*'], message: '@shared/api/[domain] entrypoint를 통해 접근하세요.' },
  { group: ['@pages/*/*'], message: '@pages/[page] entrypoint를 통해 접근하세요.' },
  { group: ['@widgets/*/*'], message: '@widgets/[widget] entrypoint를 통해 접근하세요.' },
  { group: ['@features/*/*'], message: '@features/[feature] entrypoint를 통해 접근하세요.' },
  { group: ['@entities/*/*'], message: '@entities/[entity] entrypoint를 통해 접근하세요.' },
];

/** 상대경로로 다른 레이어 접근 차단 */
const noRelativeCrossLayerPattern = {
  group: [
    '../**/app/**', '../**/pages/**', '../**/shared/**',
    '../**/widgets/**', '../**/features/**', '../**/entities/**',
  ],
  message: '다른 레이어는 path alias를 사용하세요. 상대경로는 레이어 내부에서만 허용됩니다.',
};

const basePatterns = [...sliceInternalPatterns, noRelativeCrossLayerPattern];

/** 역방향 import 차단 패턴 생성 */
function blockLayers(...layers) {
  return [{
    group: layers.flatMap((l) => [`@${l}`, `@${l}/*`]),
    message: `이 레이어에서 ${layers.join(', ')} 레이어를 import할 수 없습니다.`,
  }];
}

/** 같은 레이어 cross-import 차단 패턴 생성 */
function blockSiblings(layer) {
  return [{
    group: [`@${layer}`, `@${layer}/*`],
    message: '같은 레이어의 다른 Slice를 import할 수 없습니다.',
  }];
}

// ── ESLint 설정 ──────────────────────────────────────────

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // 기본 규칙 (특정 레이어에 속하지 않는 파일)
  {
    rules: {
      'no-restricted-imports': ['error', { patterns: basePatterns }],
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      'import/no-default-export': 'error',
    },
  },

  // ── Default Export 예외: 프레임워크가 요구하는 파일 ────
  {
    files: [
      // Next.js App Router — UI 컴포넌트
      'app/**/page.tsx', 'app/**/layout.tsx', 'app/**/loading.tsx',
      'app/**/error.tsx', 'app/**/not-found.tsx', 'app/**/template.tsx',
      'app/**/default.tsx', 'app/global-error.tsx',
      // Next.js App Router — 메타데이터 생성 파일
      'app/**/icon.tsx', 'app/**/apple-icon.tsx',
      'app/**/opengraph-image.tsx', 'app/**/twitter-image.tsx',
      'app/manifest.ts', 'app/sitemap.ts', 'app/robots.ts',
      // Next.js Pages Router
      'pages/**/*.tsx',
      // Vite 엔트리
      'src/main.tsx',
    ],
    rules: {
      'import/no-default-export': 'off',
    },
  },

  // ── 레이어별 import 방향 규칙 ────────────────────────

  // shared: 모든 상위 레이어 import 금지
  {
    files: ['src/shared/**/*.{ts,tsx,js,jsx}'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          ...basePatterns,
          ...blockLayers('app', 'pages', 'widgets', 'features', 'entities'),
        ],
      }],
    },
  },

  // entities: shared만 import 가능
  {
    files: ['src/entities/**/*.{ts,tsx,js,jsx}'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          ...basePatterns,
          ...blockLayers('app', 'pages', 'widgets', 'features'),
          ...blockSiblings('entities'),
        ],
      }],
    },
  },

  // features: entities, shared만 import 가능
  {
    files: ['src/features/**/*.{ts,tsx,js,jsx}'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          ...basePatterns,
          ...blockLayers('app', 'pages', 'widgets'),
          ...blockSiblings('features'),
        ],
      }],
    },
  },

  // widgets: features, entities, shared만 import 가능
  {
    files: ['src/widgets/**/*.{ts,tsx,js,jsx}'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          ...basePatterns,
          ...blockLayers('app', 'pages'),
          ...blockSiblings('widgets'),
        ],
      }],
    },
  },

  // pages: app import 금지 + cross-page 금지
  {
    files: ['src/pages/**/*.{ts,tsx,js,jsx}'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          ...basePatterns,
          ...blockLayers('app'),
          ...blockSiblings('pages'),
        ],
      }],
    },
  },
);
```

## Legacy Config (.eslintrc.js) — ESLint 8

```js
// .eslintrc.js

/** Slice 내부 직접 접근 차단 */
const sliceInternalPatterns = [
  { group: ['@shared/api/*/*'], message: '@shared/api/[domain] entrypoint를 통해 접근하세요.' },
  { group: ['@pages/*/*'], message: '@pages/[page] entrypoint를 통해 접근하세요.' },
  { group: ['@widgets/*/*'], message: '@widgets/[widget] entrypoint를 통해 접근하세요.' },
  { group: ['@features/*/*'], message: '@features/[feature] entrypoint를 통해 접근하세요.' },
  { group: ['@entities/*/*'], message: '@entities/[entity] entrypoint를 통해 접근하세요.' },
];

/** 상대경로로 다른 레이어 접근 차단 */
const noRelativeCrossLayerPattern = {
  group: [
    '../**/app/**', '../**/pages/**', '../**/shared/**',
    '../**/widgets/**', '../**/features/**', '../**/entities/**',
  ],
  message: '다른 레이어는 path alias를 사용하세요. 상대경로는 레이어 내부에서만 허용됩니다.',
};

const basePatterns = [...sliceInternalPatterns, noRelativeCrossLayerPattern];

/** 역방향 import 차단 패턴 생성 */
function blockLayers(...layers) {
  return [{
    group: layers.flatMap((l) => [`@${l}`, `@${l}/*`]),
    message: `이 레이어에서 ${layers.join(', ')} 레이어를 import할 수 없습니다.`,
  }];
}

/** 같은 레이어 cross-import 차단 패턴 생성 */
function blockSiblings(layer) {
  return [{
    group: [`@${layer}`, `@${layer}/*`],
    message: '같은 레이어의 다른 Slice를 import할 수 없습니다.',
  }];
}

module.exports = {
  rules: {
    // 기본 규칙 (특정 레이어에 속하지 않는 파일)
    'no-restricted-imports': ['error', { patterns: basePatterns }],
    '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
    'import/no-default-export': 'error',
  },
  overrides: [
    // ── Default Export 예외: 프레임워크가 요구하는 파일 ──
    {
      files: [
        // Next.js App Router — UI 컴포넌트
        'app/**/page.tsx', 'app/**/layout.tsx', 'app/**/loading.tsx',
        'app/**/error.tsx', 'app/**/not-found.tsx', 'app/**/template.tsx',
        'app/**/default.tsx', 'app/global-error.tsx',
        // Next.js App Router — 메타데이터 생성 파일
        'app/**/icon.tsx', 'app/**/apple-icon.tsx',
        'app/**/opengraph-image.tsx', 'app/**/twitter-image.tsx',
        'app/manifest.ts', 'app/sitemap.ts', 'app/robots.ts',
        // Next.js Pages Router
        'pages/**/*.tsx',
        // Vite 엔트리
        'src/main.tsx',
      ],
      rules: {
        'import/no-default-export': 'off',
      },
    },

    // ── 레이어별 import 방향 규칙 ──────────────────

    // shared: 모든 상위 레이어 import 금지
    {
      files: ['src/shared/**/*.{ts,tsx,js,jsx}'],
      rules: {
        'no-restricted-imports': ['error', {
          patterns: [
            ...basePatterns,
            ...blockLayers('app', 'pages', 'widgets', 'features', 'entities'),
          ],
        }],
      },
    },

    // entities: shared만 import 가능
    {
      files: ['src/entities/**/*.{ts,tsx,js,jsx}'],
      rules: {
        'no-restricted-imports': ['error', {
          patterns: [
            ...basePatterns,
            ...blockLayers('app', 'pages', 'widgets', 'features'),
            ...blockSiblings('entities'),
          ],
        }],
      },
    },

    // features: entities, shared만 import 가능
    {
      files: ['src/features/**/*.{ts,tsx,js,jsx}'],
      rules: {
        'no-restricted-imports': ['error', {
          patterns: [
            ...basePatterns,
            ...blockLayers('app', 'pages', 'widgets'),
            ...blockSiblings('features'),
          ],
        }],
      },
    },

    // widgets: features, entities, shared만 import 가능
    {
      files: ['src/widgets/**/*.{ts,tsx,js,jsx}'],
      rules: {
        'no-restricted-imports': ['error', {
          patterns: [
            ...basePatterns,
            ...blockLayers('app', 'pages'),
            ...blockSiblings('widgets'),
          ],
        }],
      },
    },

    // pages: app import 금지 + cross-page 금지
    {
      files: ['src/pages/**/*.{ts,tsx,js,jsx}'],
      rules: {
        'no-restricted-imports': ['error', {
          patterns: [
            ...basePatterns,
            ...blockLayers('app'),
            ...blockSiblings('pages'),
          ],
        }],
      },
    },
  ],
};
```

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

1. **기존 설정 확인**: ESLint 설정 파일(`eslint.config.js` 또는 `.eslintrc.*`)을 읽고, 기존 rules/extends/plugins/overrides를 파악한다.
2. **아키텍처 규칙만 추가**: 아래 3가지를 기존 설정에 병합한다. 기존 rules/extends/plugins는 그대로 유지한다.
   - `no-restricted-imports` — 레이어별 override (Flat Config: 별도 config 객체 추가, Legacy: overrides 배열에 추가)
   - `import/no-default-export` + default export 예외 파일 override
   - `@typescript-eslint/consistent-type-imports`
3. **충돌 처리**:
   - 기존 `no-restricted-imports`가 있으면 기존 patterns에 아키텍처 patterns를 **합친다** (replace 아님)
   - `import/no-default-export`와 `consistent-type-imports`는 아키텍처 필수 규칙이다. 기존 설정이 `off`나 `warn`이면 `error`로 **덮어쓴다**
   - 기존 extends(`airbnb`, `next/core-web-vitals` 등)나 아키텍처와 무관한 플러그인/규칙은 그대로 유지한다. 단, 아키텍처 규칙이 extends보다 **뒤에** 위치하도록 배치하여 우선순위를 보장한다
4. **검증**: `yarn lint` (또는 프로젝트의 lint 명령)으로 기존 규칙과 아키텍처 규칙이 모두 동작하는지 확인한다.

> **새 프로젝트(create)**에서는 기존 설정이 없으므로 위 템플릿을 그대로 사용한다.

## 적용 시점

- **새 프로젝트 (create):** 프로젝트 생성 시 전체 템플릿 포함
- **기존 프로젝트 (migrate):** Phase 1의 4단계에서 위 병합 절차로 추가
- **자동 트리거 (architecture):** 스킬 로드 시 감지 → 사용자 동의 후 위 병합 절차로 추가
- 모든 레이어(선택 레이어 포함)의 규칙을 처음부터 포함한다. 해당 레이어 폴더가 없어도 규칙이 있으면 해가 없고, 나중에 도입 시 누락을 방지한다.
