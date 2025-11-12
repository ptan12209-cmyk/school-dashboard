module.exports = {
  env: {
    node: true,
    es2021: true,
    jest: true,
  },
  extends: ['airbnb-base'],
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module',
  },
  rules: {
    'no-console': 'off',
    'linebreak-style': 'off', // Windows environment uses CRLF
    'no-plusplus': 'off', // Allow ++ and -- operators
    'no-await-in-loop': 'warn', // Warn but don't error on await in loops
    'no-restricted-syntax': 'off', // Allow for...of loops
    'no-return-await': 'warn', // Warn on redundant await
    'class-methods-use-this': 'warn', // Warn on methods not using this
    'max-len': ['warn', { code: 120 }], // Increase line length limit
    'no-continue': 'off', // Allow continue statements
    'no-nested-ternary': 'warn', // Warn on nested ternary
    'camelcase': 'warn', // Warn on snake_case
    'import/no-extraneous-dependencies': ['error', { devDependencies: true }],
  },
  ignorePatterns: ['node_modules/', 'tests/'],
};
