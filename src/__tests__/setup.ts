// Test setup file

import { jest } from '@jest/globals';

// Extend Jest matchers for better TypeScript support
declare global {
  namespace jest {
    interface AsymmetricMatchers {
      any(sample: any): any;
    }
  }
}

// Mock environment variables
process.env.OPENAI_API_KEY = 'test-api-key';
process.env.NODE_ENV = 'test';

// Basic console mocking for cleaner test output
const originalConsole = global.console;
global.console = {
  ...originalConsole,
  log: () => {},
  error: () => {},
  warn: () => {},
  info: () => {},
};

// Mock process.exit
const mockExit = jest.fn();
process.exit = mockExit as any;

// Extend global interface for TypeScript
declare global {
  var mockExit: jest.Mock;
}

// Global test utilities
(global as any).mockExit = mockExit;

// Configuración global para mocks
beforeEach(() => {
  jest.clearAllMocks();
});

export {}; 