module.exports = {
  env: {
    es6: true,
    node: true,
    mocha: true
  },
  extends: 'eslint:recommended',
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: 'module'
  },
  rules: {
    'no-unused-vars': [
      'error',
      {
        varsIgnorePattern: 'should|expect'
      }
    ],
    'no-console': 'off',
    indent: 'off',
    'linebreak-style': ['error', 'unix'],
    quotes: ['error', 'single'],
    semi: ['error', 'always']
  }
};
