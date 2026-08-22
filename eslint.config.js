import js from '@eslint/js'
import globals from 'globals'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

export default [
  { ignores: ['dist'] },
  // Node-context config files at the repo root
  {
    files: ['./*.js'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.node,
    },
  },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    settings: { react: { version: '18.3' } },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,
      ...reactHooks.configs.recommended.rules,
      'react/jsx-no-target-blank': 'off',
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      // Legacy-style data layer catches errors without using the object;
      // keep pre-ESLint-9 behavior for catch clause variables.
      'no-unused-vars': ['error', { ignoreRestSiblings: true, argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' }],
      // This codebase does not use prop-types validation anywhere; the rule
      // is pure noise here. Shape safety comes from zod schemas + shared
      // constants in src/lib/constants.js instead.
      'react/prop-types': 'off',
    },
  },
  // Generated shadcn/ui components use non-standard styling hooks on purpose.
  // Last block wins in flat config, so this override goes last.
  {
    files: ['src/components/ui/**/*.jsx'],
    rules: {
      'react/no-unknown-property': 'off',
    },
  },
]
