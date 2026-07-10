import tsParser from '@typescript-eslint/parser'
import tsPlugin from '@typescript-eslint/eslint-plugin'

export default [
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
      },
      globals: {
        fetch: 'readonly',
        console: 'readonly',
        process: 'readonly',
        URL: 'readonly',
        RequestInit: 'readonly',
        Response: 'readonly',
        globalThis: 'readonly',
        Promise: 'readonly',
        Array: 'readonly',
        JSON: 'readonly',
        Object: 'readonly',
        Error: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        Map: 'readonly',
        Set: 'readonly',
        Math: 'readonly',
        Date: 'readonly',
        Boolean: 'readonly',
        Number: 'readonly',
        String: 'readonly',
        Symbol: 'readonly',
        RegExp: 'readonly',
        Uint8Array: 'readonly',
        Int32Array: 'readonly',
        Float32Array: 'readonly',
        AbortController: 'readonly',
        AbortSignal: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-undef': 'off',
      'no-empty': ['error', { allowEmptyCatch: true }],
      'prefer-const': 'warn',
      'eqeqeq': ['error', 'always'],
    },
  },
  {
    ignores: ['dist/**', 'node_modules/**', '*.config.js', '*.config.ts'],
  },
]