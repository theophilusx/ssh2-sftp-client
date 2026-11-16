import js from '@eslint/js';
import globals from 'globals';
import promise from 'eslint-plugin-promise';
import n from 'eslint-plugin-n';
import unicorn from 'eslint-plugin-unicorn';
import mocha from 'eslint-plugin-mocha';
import prettier from 'eslint-config-prettier';

export default [
  { ignores: ['test/testData/**', 'coverage/**'] },
  js.configs.recommended,
  promise.configs['flat/recommended'],
  n.configs['flat/recommended-module'],
  unicorn.configs['flat/recommended'],
  prettier,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.node, ...globals.mocha },
    },
    plugins: { mocha },
    rules: {
      'no-console': 0,
      quotes: [1, 'single'],
      'unicorn/import-style': 0,
      'unicorn/prevent-abbreviations': 0,
      'unicorn/catch-error-name': 0,
      'unicorn/prefer-string-slice': 'warn',
      'unicorn/no-array-for-each': 0,
      'unicorn/no-object-as-default-parameter': 0,
      'unicorn/no-null': 0,
      'unicorn/explicit-length-check': 0,
      'unicorn/numeric-separators-style': 0,
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      // Rules added to unicorn since v54 that flag code predating the ESM
      // migration. Kept visible as warnings rather than enforced.
      'unicorn/prefer-class-fields': 'warn',
      'unicorn/prefer-ternary': 'warn',
      'unicorn/no-negated-condition': 'warn',
      'unicorn/consistent-function-scoping': 'warn',
      'unicorn/prefer-single-call': 'warn',
      'unicorn/no-unused-array-method-return': 'warn',
      'unicorn/prefer-string-replace-all': 'warn',
      'unicorn/prefer-at': 'warn',
      'unicorn/prefer-logical-operator-over-ternary': 'warn',
      'mocha/max-top-level-suites': 0,
      'mocha/no-hooks-for-single-case': 0,
    },
  },
  {
    // Examples are illustrative scripts: promise chains and camelCase file names
    // are intentional there, so only correctness rules apply.
    files: ['examples/**/*.js'],
    rules: {
      'unicorn/prefer-top-level-await': 0,
      'unicorn/filename-case': 0,
      'promise/always-return': 0,
      'promise/catch-or-return': 0,
      'promise/no-return-in-finally': 0,
      'unicorn/prefer-single-call': 0,
    },
  },
];
