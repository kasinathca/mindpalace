// eslint.config.js — ESLint 9 flat config
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // Apply to all TypeScript files in the monorepo
  { files: ['**/*.{ts,tsx}'] },

  // Ignore build outputs and generated files
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.turbo/**',
      '**/coverage/**',
      '**/prisma/migrations/**',
    ],
  },

  // Base ESLint recommended rules
  eslint.configs.recommended,

  // TypeScript ESLint recommended strict rules
  ...tseslint.configs.recommendedTypeChecked,

  // Language options — required for type-checked rules
  {
    languageOptions: {
      parserOptions: {
        // Explicitly list each workspace package's tsconfig so that TypeScript
        // ESLint can resolve imported types (e.g. @prisma/client, pino).
        // projectService: true requires a tsconfig.json at tsconfigRootDir,
        // but this monorepo only has tsconfig.base.json at the root.
        project: [
          './apps/api/tsconfig.json',
          './apps/api/tests/tsconfig.json',
          './apps/web/tsconfig.json',
          './packages/shared/tsconfig.json',
        ],
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // Custom rule overrides
  {
    rules: {
      // --- TypeScript ---
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        destructuredArrayIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
      '@typescript-eslint/explicit-function-return-type': [
        'error',
        { allowExpressions: true, allowTypedFunctionExpressions: true },
      ],
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-misused-promises': 'error',

      // --- General JS ---
      'no-console': 'error',         // Use the structured logger, not console.log
      'prefer-const': 'error',
      'no-var': 'error',
      'eqeqeq': ['error', 'always'],
      'no-throw-literal': 'error',   // Only throw Error objects, never raw strings
    },
  },

  // Test file overrides — relax rules that conflict with Vitest's expect() API
  {
    files: ['**/*.test.ts', '**/*.spec.ts', '**/*.test.tsx'],
    rules: {
      // Vitest matchers (.toBe, .toBeInstanceOf, etc.) look like unbound methods
      // to TypeScript but are safe to use as-is per the Vitest design.
      '@typescript-eslint/unbound-method': 'off',
      // expect.objectContaining() / expect.any() return AsymmetricMatcher typed
      // as `any` in TypeScript — unavoidable in test assertion code.
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      // getByRole / queryByRole sometimes requires type narrowing which
      // TS-ESLint flags as unnecessary when the DOM lib resolves it differently.
      '@typescript-eslint/no-unnecessary-type-assertion': 'off',
      // Test helpers (renderX, setup functions) have obvious return types;
      // requiring explicit annotations would bloat test files unnecessarily.
      '@typescript-eslint/explicit-function-return-type': 'off',
    },
  },
);
