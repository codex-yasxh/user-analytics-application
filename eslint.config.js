import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'agent_docs/**',
      'fixtures/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
      'dashboard/public/**',
    ],
  },
  ...tseslint.configs.recommended,
  {
    rules: {
      'no-console': 'error',
    },
  },
);
