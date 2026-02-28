import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

describe('CLI Integration Tests', () => {
  const runCLI = (args: string): string => {
    try {
      return execSync(`npx tsx src/index.ts ${args}`, {
        encoding: 'utf-8',
        cwd: rootDir,
      }).trim();
    } catch (error: any) {
      return error.stdout?.trim() || error.message;
    }
  };

  describe('version command', () => {
    it('should display version with --version flag', () => {
      const output = runCLI('--version');
      expect(output).toMatch(/^\d+\.\d+\.\d+/);
    });

    it('should display version with -V flag', () => {
      const output = runCLI('-V');
      expect(output).toMatch(/^\d+\.\d+\.\d+/);
    });
  });

  describe('help command', () => {
    it('should display help with --help flag', () => {
      const output = runCLI('--help');
      expect(output).toContain('Usage: aocli');
      expect(output).toContain('Commands:');
      expect(output).toContain('hello');
    });

    it('should display help with -h flag', () => {
      const output = runCLI('-h');
      expect(output).toContain('Usage: aocli');
    });

    it('should display hello command help', () => {
      const output = runCLI('hello --help');
      expect(output).toContain('Say hello');
      expect(output).toContain('--name');
    });
  });

  describe('hello command', () => {
    it('should say hello with default name in TOON format', () => {
      const output = runCLI('hello');
      // TOON format should contain greeting key
      expect(output).toContain('greeting');
      expect(output).toContain('Hello, World!');
    });

    it('should say hello with custom name in TOON format', () => {
      const output = runCLI('hello --name Alice');
      expect(output).toContain('greeting');
      expect(output).toContain('Hello, Alice!');
    });

    it('should say hello with -n shorthand in TOON format', () => {
      const output = runCLI('hello -n Bob');
      expect(output).toContain('greeting');
      expect(output).toContain('Hello, Bob!');
    });

    it('should output JSON when --json flag is provided', () => {
      const output = runCLI('--json hello --name Alice');
      const parsed = JSON.parse(output);
      expect(parsed).toEqual({ greeting: 'Hello, Alice!' });
    });
  });

  describe('database options', () => {
    it('should show --sqlite option in help', () => {
      const output = runCLI('--help');
      expect(output).toContain('--sqlite');
      expect(output).toContain('--postgresql');
    });
  });
});
