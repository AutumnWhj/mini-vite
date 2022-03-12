// @ts-check
const { defineConfig } = require('eslint-define-config')

module.exports = defineConfig({
  root: true,
  // 拓展eslint规则
  extends: [
    'eslint:recommended',
    'plugin:node/recommended',
    'plugin:@typescript-eslint/recommended'
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2021
  },
  // 自定义规则
  rules: {
    'no-debugger': ['error'],
    'no-empty': ['warn', { allowEmptyCatch: true }],
    'no-process-exit': 'off',
    'no-useless-escape': 'off',
    'prefer-const': [
      'warn',
      {
        destructuring: 'all'
      }
    ],

    'node/no-missing-import': [
      'error',
      {
        allowModules: [
          'types',
          'estree',
          'testUtils',
          'less',
          'sass',
          'stylus'
        ],
        tryExtensions: ['.ts', '.js', '.jsx', '.tsx', '.d.ts']
      }
    ],
    'node/no-missing-require': [
      'error',
      {
        // for try-catching yarn pnp
        allowModules: ['pnpapi', 'mini-vite'],
        tryExtensions: ['.ts', '.js', '.jsx', '.tsx', '.d.ts']
      }
    ],
    'node/no-restricted-require': [
      'error',
      Object.keys(
        require('./packages/mini-vite/package.json').devDependencies
      ).map((d) => ({
        name: d,
        message:
          `devDependencies can only be imported using ESM syntax so ` +
          `that they are included in the rollup bundle. If you are trying to ` +
          `lazy load a dependency, use (await import('dependency')).default instead.`
      }))
    ],
    'node/no-extraneous-import': [
      'error',
      {
        allowModules: ['mini-vite', 'less', 'sass']
      }
    ],
    'node/no-extraneous-require': [
      'error',
      {
        allowModules: ['mini-vite']
      }
    ],
    'node/no-deprecated-api': 'off',
    'node/no-unpublished-import': 'off',
    'node/no-unpublished-require': 'off',
    'node/no-unsupported-features/es-syntax': 'off',

    '@typescript-eslint/ban-ts-comment': 'off', // TODO: we should turn this on in a new PR
    '@typescript-eslint/ban-types': 'off', // TODO: we should turn this on in a new PR
    '@typescript-eslint/no-empty-function': [
      'error',
      { allow: ['arrowFunctions'] }
    ],
    '@typescript-eslint/no-empty-interface': 'off',
    '@typescript-eslint/no-explicit-any': 'off', // maybe we should turn this on in a new PR
    '@typescript-eslint/no-extra-semi': 'off', // conflicts with prettier
    '@typescript-eslint/no-inferrable-types': 'off',
    '@typescript-eslint/no-non-null-assertion': 'off', // maybe we should turn this on in a new PR
    '@typescript-eslint/no-unused-vars': 'off', // maybe we should turn this on in a new PR
    '@typescript-eslint/no-var-requires': 'off',
    '@typescript-eslint/consistent-type-imports': [
      'error',
      { prefer: 'type-imports' }
    ]
  },
  // 更细粒度地控制eslint规则，如某文件下，新增某规则
  overrides: [
    {
      files: ['packages/mini-vite/src/node/**'],
      rules: {
        // 'no-console': ['error']
      }
    },
    {
      files: ['packages/mini-vite/types/**'],
      rules: {
        'node/no-extraneous-import': 'off'
      }
    },
    {
      files: ['*.js'],
      rules: {
        '@typescript-eslint/explicit-module-boundary-types': 'off'
      }
    },
    {
      files: ['*.d.ts'],
      rules: {
        '@typescript-eslint/triple-slash-reference': 'off'
      }
    }
  ]
})
