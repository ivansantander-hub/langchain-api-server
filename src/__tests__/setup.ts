import { jest } from '@jest/globals';

// Extend Jest matchers for better TypeScript support
declare global {
  namespace jest {
    interface AsymmetricMatchers {
      any<T>(sample: T): T;
    }
  }
}

// Mock environment variables
process.env.OPENAI_API_KEY = 'test-api-key';
process.env.NODE_ENV = 'test';

const originalConsole = global.console;
global.console = {
  ...originalConsole,
  log: () => {},
  error: () => {},
  warn: () => {},
  info: () => {},
};

// Mock process.exit with proper typing
const mockExit = jest.fn();
// @ts-expect-error Mocking process.exit for tests
process.exit = mockExit;

declare global {
  var mockExit: jest.Mock;
}

// Global test utilities
global.mockExit = mockExit;

// Global setup for mocks
beforeEach(() => {
  jest.clearAllMocks();
});

export {}; 