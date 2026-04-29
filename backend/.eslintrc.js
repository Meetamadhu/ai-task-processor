// backend/.eslintrc.js
module.exports = {
  env: {
    node: true,
    es2021: true,
  },
  extends: 'eslint:recommended',
  parserOptions: {
    ecmaVersion: 'latest',
  },
  rules: {
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'semi': ['error', 'always'],
    'quotes': ['error', 'single'],
    'comma-dangle': ['error', 'only-multiline'],
    'indent': ['error', 2],
    'eol-last': ['error', 'always'],
    'no-trailing-spaces': 'error',
    'object-curly-spacing': ['error', 'always'],
  }
};
