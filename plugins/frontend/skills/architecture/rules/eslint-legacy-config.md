# Legacy Config (.eslintrc.js) — ESLint 8

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
  plugins: ['import'],
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
