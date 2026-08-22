/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
  testPathIgnorePatterns: ['<rootDir>/node_modules/'],
  testTimeout: 30000,
  collectCoverageFrom: [
    '**/*.js',
    '!**/node_modules/**',
    '!**/__tests__/**',
    '!coverage/**',
    '!jest.config.js',
    '!dataAlteringFiles/**',
    '!infrastructure/logger/logger.js',
  ],
  coverageDirectory: 'coverage',
};
