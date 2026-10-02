// ESLint flat config.
//
// Strict rules apply to new code only. Legacy folders are listed in LEGACY_PATHS and are
// not linted until they are migrated into src/modules (see CLAUDE.md, "Where code goes").
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FlatCompat } from '@eslint/eslintrc';

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

/** Frozen legacy code. Remove an entry when that code is migrated into src/modules. */
const LEGACY_PATHS = [
  'src/features/**',
  'src/lib/**',
  'src/hooks/**',
  'src/ai/**',
  'src/components/icons.tsx',
  'src/app/page.tsx',
  'src/app/layout.tsx',
  'jest.config.js',
  'jest.setup.js',
  'tailwind.config.ts',
  'e2e/auth-and-lobby.spec.ts',
  'e2e/gameplay.spec.ts',
  'e2e/map-viewport.spec.ts',
  'e2e/tutorial-beacons.spec.ts',
  'e2e/e2e-cleanup.ts',
];

/** Generated, vendored or tool-owned files. */
const IGNORED_PATHS = [
  '.next/**',
  'out/**',
  'build/**',
  'coverage/**',
  'test-results/**',
  'playwright-report/**',
  'next-env.d.ts',
  'src/components/ui/**',
];

const MODULE_FILES = 'src/modules/**/*.{ts,tsx}';

/** Architecture boundaries for src/modules (see the component-architecture skill). */
const RESTRICTED_IMPORTS = {
  firestore: {
    group: ['@/lib/firebase', 'firebase', 'firebase/*'],
    message: 'Firestore access belongs in *.service.ts files.',
  },
  legacyUi: {
    group: ['@/features/*', '@/features/**'],
    message: 'Legacy UI and context may only be adapted inside *.hook.ts files.',
  },
  deepModuleImport: {
    group: ['@/modules/*/*'],
    message: 'Import another module through its public index: @/modules/<domain>.',
  },
};

const restrictImports = (...patterns) => ['error', { patterns }];

const config = [
  { ignores: [...IGNORED_PATHS, ...LEGACY_PATHS] },

  ...compat.extends('next/core-web-vitals', 'next/typescript'),

  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      eqeqeq: ['error', 'smart'],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'max-lines': ['error', { max: 150, skipBlankLines: true, skipComments: true }],
    },
  },

  {
    files: [MODULE_FILES],
    rules: {
      'no-restricted-imports': restrictImports(
        RESTRICTED_IMPORTS.firestore,
        RESTRICTED_IMPORTS.legacyUi,
        RESTRICTED_IMPORTS.deepModuleImport,
      ),
    },
  },

  {
    files: ['src/modules/**/*.hook.ts'],
    rules: {
      'no-restricted-imports': restrictImports(
        RESTRICTED_IMPORTS.firestore,
        RESTRICTED_IMPORTS.deepModuleImport,
      ),
    },
  },

  {
    files: ['src/modules/**/*.service.ts'],
    rules: {
      'no-restricted-imports': restrictImports(
        RESTRICTED_IMPORTS.legacyUi,
        RESTRICTED_IMPORTS.deepModuleImport,
      ),
    },
  },

  {
    files: ['**/*.test.{ts,tsx}', 'e2e/**/*.ts'],
    rules: {
      'no-restricted-imports': 'off',
      'max-lines': 'off',
    },
  },
];

export default config;
