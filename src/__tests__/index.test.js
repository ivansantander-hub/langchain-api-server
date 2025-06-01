const { describe, it, expect, beforeEach, afterEach } = require('@jest/globals');
const fs = require('fs');

describe('index.ts', () => {
  let originalEnv;

  beforeEach(() => {
    originalEnv = process.env.OPENAI_API_KEY;
  });

  afterEach(() => {
    if (originalEnv) {
      process.env.OPENAI_API_KEY = originalEnv;
    } else {
      delete process.env.OPENAI_API_KEY;
    }
  });

  describe('Environment validation', () => {
    it('should require OPENAI_API_KEY environment variable', () => {
      // Verify that the source code contains the proper environment validation
      const indexContent = fs.readFileSync('src/index.ts', 'utf8');
      
      // Check that environment validation exists
      expect(indexContent).toContain('if (!process.env.OPENAI_API_KEY)');
      expect(indexContent).toContain('console.error(\'Error: OPENAI_API_KEY is not set in .env\')');
      expect(indexContent).toContain('process.exit(1)');
      
      // Verify that the compiled version also has the validation
      const compiledContent = fs.readFileSync('dist/index.js', 'utf8');
      expect(compiledContent).toContain('if (!process.env.OPENAI_API_KEY)');
      expect(compiledContent).toContain('process.exit(1)');
    });

    it('should have environment check before main function execution', () => {
      const indexContent = fs.readFileSync('src/index.ts', 'utf8');
      
      // Should check for API key before running main logic
      const apiKeyIndex = indexContent.indexOf('OPENAI_API_KEY');
      const mainCallIndex = indexContent.indexOf('main()');
      
      expect(apiKeyIndex).toBeGreaterThan(-1);
      expect(mainCallIndex).toBeGreaterThan(-1);
      expect(apiKeyIndex).toBeLessThan(mainCallIndex);
    });
  });

  describe('Application structure', () => {
    it('should import required modules', () => {
      const indexContent = fs.readFileSync('src/index.ts', 'utf8');
      
      expect(indexContent).toContain("import { config } from 'dotenv'");
      expect(indexContent).toContain("import { initializeChat, createApiServer } from './lib/chat.js'");
    });

    it('should call config() to load environment variables', () => {
      const indexContent = fs.readFileSync('src/index.ts', 'utf8');
      
      expect(indexContent).toContain('config()');
    });

    it('should contain main function with proper error handling', () => {
      const indexContent = fs.readFileSync('src/index.ts', 'utf8');
      
      expect(indexContent).toContain('async function main()');
      expect(indexContent).toContain('try {');
      expect(indexContent).toContain('} catch (error) {');
      expect(indexContent).toContain("console.error('Error in the application:', error)");
    });

    it('should initialize chat and API server in main function', () => {
      const indexContent = fs.readFileSync('src/index.ts', 'utf8');
      
      expect(indexContent).toContain('const chatManager = await initializeChat()');
      expect(indexContent).toContain('const apiServer = createApiServer(');
      expect(indexContent).toContain('await apiServer.startServer()');
    });

    it('should log vector store information', () => {
      const indexContent = fs.readFileSync('src/index.ts', 'utf8');
      
      expect(indexContent).toContain('console.log(\'\\nAvailable vector stores:\')');
      expect(indexContent).toContain('console.log(\'\\nVector Store Debug Information:\')');
    });

    it('should call main function', () => {
      const indexContent = fs.readFileSync('src/index.ts', 'utf8');
      
      expect(indexContent).toContain('main()');
    });
  });

  describe('File structure', () => {
    it('should have compiled JavaScript file', () => {
      expect(fs.existsSync('dist/index.js')).toBe(true);
    });

    it('should have source map', () => {
      expect(fs.existsSync('dist/index.js.map')).toBe(true);
    });

    it('should have declaration file', () => {
      expect(fs.existsSync('dist/index.d.ts')).toBe(true);
    });
  });
}); 