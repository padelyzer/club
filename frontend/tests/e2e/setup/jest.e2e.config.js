/**
 * Jest E2E Configuration for BFF Light Testing
 * Specialized config for end-to-end API testing
 */

const { defaults } = require('jest-config');

module.exports = {
  displayName: 'E2E BFF Tests',
  testEnvironment: 'node',
  
  // Test patterns for E2E tests
  testMatch: [
    '<rootDir>/tests/e2e/**/*.test.{js,ts}',
    '<rootDir>/tests/integration/**/*.test.{js,ts}',
    '<rootDir>/tests/performance/**/*.test.{js,ts}'
  ],
  
  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/tests/e2e/setup/test-setup.ts'
  ],
  
  // Module path mapping
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  
  // Coverage configuration
  collectCoverageFrom: [
    'src/app/api/**/*.ts',
    'src/lib/api/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts'
  ],
  
  coverageDirectory: 'coverage/e2e',
  coverageReporters: ['text', 'json', 'html', 'lcov'],
  
  // Timeout for long-running E2E tests
  testTimeout: 30000,
  
  // Transform TypeScript files
  transform: {
    '^.+\\.(ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }]
  },
  
  // Extensions to resolve
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // Verbose output for debugging
  verbose: true,
  
  // Bail on first test failure for CI
  bail: process.env.CI ? 1 : 0,
  
  // Performance monitoring
  detectOpenHandles: true,
  forceExit: true,
  
  // Custom reporters for BFF testing
  reporters: [
    'default',
    ['<rootDir>/tests/e2e/setup/performance-reporter.js', {}]
  ]
};