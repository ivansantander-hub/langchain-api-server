const { describe, it, expect, beforeEach, afterEach } = require('@jest/globals');
const fs = require('fs');

describe('cli.ts', () => {
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
      const cliContent = fs.readFileSync('src/cli.ts', 'utf8');
      
      // Check that environment validation exists
      expect(cliContent).toContain('if (!process.env.OPENAI_API_KEY)');
      expect(cliContent).toContain('console.error(\'Error: OPENAI_API_KEY is not set in .env\')');
      expect(cliContent).toContain('process.exit(1)');
      
      // Verify that the compiled version also has the validation
      const compiledContent = fs.readFileSync('dist/cli.js', 'utf8');
      expect(compiledContent).toContain('if (!process.env.OPENAI_API_KEY)');
      expect(compiledContent).toContain('process.exit(1)');
    });

    it('should handle environment check before starting CLI', () => {
      const cliContent = fs.readFileSync('src/cli.ts', 'utf8');
      
      // Should check for API key before starting CLI
      const apiKeyIndex = cliContent.indexOf('OPENAI_API_KEY');
      const startCLICallIndex = cliContent.indexOf('await startCLI()');
      
      expect(apiKeyIndex).toBeGreaterThan(-1);
      expect(startCLICallIndex).toBeGreaterThan(-1);
      // The environment check should come before the startCLI call
      expect(apiKeyIndex).toBeLessThan(startCLICallIndex);
    });
  });

  describe('Application structure', () => {
    it('should import required modules', () => {
      const cliContent = fs.readFileSync('src/cli.ts', 'utf8');
      
      expect(cliContent).toContain("import { config } from 'dotenv'");
      expect(cliContent).toContain("import { startCLI } from './lib/chat.js'");
    });

    it('should call config() to load environment variables', () => {
      const cliContent = fs.readFileSync('src/cli.ts', 'utf8');
      
      expect(cliContent).toContain('config()');
    });

    it('should contain main function with proper error handling', () => {
      const cliContent = fs.readFileSync('src/cli.ts', 'utf8');
      
      expect(cliContent).toContain('async function main()');
      expect(cliContent).toContain('try {');
      expect(cliContent).toContain('} catch (error) {');
      expect(cliContent).toContain("console.error('Error starting CLI interface:', error)");
    });

    it('should start CLI interface in main function', () => {
      const cliContent = fs.readFileSync('src/cli.ts', 'utf8');
      
      expect(cliContent).toContain('await startCLI()');
    });

    it('should call main function', () => {
      const cliContent = fs.readFileSync('src/cli.ts', 'utf8');
      
      expect(cliContent).toContain('main()');
    });

    it('should have proper file structure and length', () => {
      const cliContent = fs.readFileSync('src/cli.ts', 'utf8');
      const lines = cliContent.split('\n');
      
      // File should be reasonably short and focused
      expect(lines.length).toBeGreaterThan(15);
      expect(lines.length).toBeLessThan(30);
    });
  });

  describe('Error handling', () => {
    it('should contain specific error message for CLI interface', () => {
      const cliContent = fs.readFileSync('src/cli.ts', 'utf8');
      
      expect(cliContent).toContain('Error starting CLI interface:');
    });

    it('should have different error message than index.ts', () => {
      const cliContent = fs.readFileSync('src/cli.ts', 'utf8');
      const indexContent = fs.readFileSync('src/index.ts', 'utf8');
      
      // CLI should have its own specific error message
      expect(cliContent).toContain('Error starting CLI interface:');
      expect(indexContent).toContain('Error in the application:');
      expect(cliContent).not.toContain('Error in the application:');
    });
  });

  describe('File structure', () => {
    it('should have compiled JavaScript file', () => {
      expect(fs.existsSync('dist/cli.js')).toBe(true);
    });

    it('should have source map', () => {
      expect(fs.existsSync('dist/cli.js.map')).toBe(true);
    });

    it('should have declaration file', () => {
      expect(fs.existsSync('dist/cli.d.ts')).toBe(true);
    });
  });
}); 