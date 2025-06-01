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
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  moduleFileExtensions: ['js', 'json'],
  roots: ['<rootDir>/src'],
  moduleDirectories: ['node_modules', '<rootDir>/src'],
  verbose: true,
  testTimeout: 30000,
  // Configuración específica para CI
  ci: process.env.CI === 'true',
  silent: process.env.CI === 'true',
  reporters: process.env.CI === 'true' 
    ? [['default', { silent: true }], 'github-actions'] 
    : ['default']
}; 