import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import boundaries from 'eslint-plugin-boundaries';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'screenshots/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      boundaries,
    },
    settings: {
      // Core_Patterns §1: engine — самый вложенный слой (выше game).
      'boundaries/elements': [
        { type: 'engine', pattern: 'game/engine' },
        { type: 'core', pattern: 'core' },
        { type: 'game', pattern: 'game' },
        { type: 'components', pattern: 'components' },
        { type: 'hooks', pattern: 'hooks' },
        { type: 'ui', pattern: 'ui' },
        { type: 'lib', pattern: 'lib' },
      ],
      'boundaries/files': [
        { pattern: 'src/__tests__/**/*', category: 'test' },
      ],
      'import/resolver': {
        typescript: { alwaysTryTypes: true },
      },
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],
      // `any` escapes the type system, so it is banned in shipped code. Tests
      // are exempt below: a deliberately-partial test double is exactly where
      // an explicit `any` cast is the honest annotation.
      '@typescript-eslint/no-explicit-any': 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      // Core_Patterns §1 автогейт: последнее совпавшее политика выигрывает.
      'boundaries/dependencies': ['error', {
        default: 'allow',
        policies: [
          {
            disallow: { to: { file: { categories: 'test' } } },
            message: 'Production code must not import test files (src/__tests__).',
          },
          {
            from: { file: { categories: 'test' } },
            allow: { to: { file: { categories: 'test' } } },
          },
          {
            from: { element: { type: 'core' } },
            disallow: { to: { element: { type: ['game', 'engine', 'components', 'hooks', 'ui'] } } },
            message: 'core must stay dependency-free: no game/engine/components/hooks/ui imports (Core_Patterns §1).',
          },
          {
            from: { element: { type: 'game' } },
            disallow: { to: { element: { type: ['components', 'hooks'] } } },
            message: 'game must not import React components or app hooks (Core_Patterns §1).',
          },
          {
            from: { element: { type: ['components', 'hooks'] } },
            disallow: { to: { element: { type: 'engine' } } },
            message: 'React layer must not import game/engine directly — go through GameApi (Core_Patterns §1).',
          },
          {
            from: { element: { type: 'components' } },
            disallow: { to: { element: { type: 'game', fileInternalPath: 'Game.ts' } } },
            message: 'Components must not import the Game class — use the GameApi prop (Core_Patterns §8 non-goal).',
          },
        ],
      }],
    },
  },
  {
    files: ['src/__tests__/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
);
