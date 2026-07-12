import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { FlatCompat } from '@eslint/eslintrc'
import js from '@eslint/js'
import typescriptEslint from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import { defineConfig } from 'eslint/config'
import { importX } from 'eslint-plugin-import-x'
import prettier from 'eslint-plugin-prettier'
import unusedImports from 'eslint-plugin-unused-imports'
import globals from 'globals'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
})

export default defineConfig([
  {
    plugins: {
      '@typescript-eslint': typescriptEslint,
      'unused-imports': unusedImports,
      prettier: prettier,
    },

    extends: compat.extends('eslint:recommended', 'plugin:@typescript-eslint/recommended'),

    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
      parser: tsParser,
    },

    rules: {
      'prettier/prettier': ['error', { endOfLine: 'auto' }],

      'unused-imports/no-unused-imports': 'error',

      '@typescript-eslint/no-unused-vars': 'off',
      'unused-imports/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    plugins: {
      'import-x': importX,
    },

    extends: ['import-x/flat/recommended'],

    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
      parser: tsParser,
    },

    rules: {
      'import-x/no-unresolved': 'off',

      'import-x/order': [
        'warn',
        {
          alphabetize: { order: 'asc', orderImportKind: 'asc' },
          named: true,
          'newlines-between': 'always',
        },
      ],

      'import-x/consistent-type-specifier-style': ['warn', 'prefer-inline'],
    },
  },
])
