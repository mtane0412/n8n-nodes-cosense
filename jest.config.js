/**
 * Jestの設定ファイル
 */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/nodes'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: [
    'nodes/**/*.ts',
    '!nodes/**/*.d.ts',
    '!nodes/**/__tests__/**',
  ],
  moduleNameMapper: {
    '^n8n-workflow$': '<rootDir>/node_modules/n8n-workflow',
  },
};