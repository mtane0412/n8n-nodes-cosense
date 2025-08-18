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
    '^@cosense/std/websocket$': '<rootDir>/nodes/Cosense/__mocks__/@cosense/std/websocket.ts',
    '^@cosense/types/rest$': '<rootDir>/nodes/Cosense/__mocks__/@cosense/types/rest.ts',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(@cosense|@jsr|option-t))',
  ],
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      useESM: true,
    }],
  },
};