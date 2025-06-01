module.exports = {
  testEnvironment: 'node',
  testMatch: [
    '**/__tests__/**/*.test.js',
    '**/?(*.)+(spec|test).js'
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/__tests__/**',
  ],
  moduleFileExtensions: ['js', 'json'],
  roots: ['<rootDir>/src'],
  moduleDirectories: ['node_modules', '<rootDir>/src'],
  verbose: true,
  testTimeout: 30000
}; 