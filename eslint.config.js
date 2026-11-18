import js from '@eslint/js'
import globals from 'globals'

export default [
  { ignores: ['node_modules/**'] },
  js.configs.recommended,
  {
    files: ['**/*.js', '**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-var': 'error',
      'prefer-const': 'error',
      eqeqeq: ['error', 'always', { null: 'ignore' }],
    },
  },
  {
    files: ['client.js'],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ['test/**/*.mjs'],
    languageOptions: { globals: globals.node },
  },
]
