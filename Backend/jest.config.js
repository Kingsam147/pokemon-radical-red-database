/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
  testPathIgnorePatterns: ['<rootDir>/node_modules/'],
  testTimeout: 30000,
  collectCoverageFrom: [
    'Controllers/**/*.js',
    'infrastructure/**/*.js',
    '!infrastructure/logger/logger.js',
  ],
  coverageDirectory: 'coverage',
};
