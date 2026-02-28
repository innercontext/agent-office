import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Package.json validation', () => {
  const packagePath = join(__dirname, '../package.json');
  
  it('should have a valid package.json', () => {
    expect(existsSync(packagePath)).toBe(true);
  });

  it('should have required fields', () => {
    const pkg = JSON.parse(readFileSync(packagePath, 'utf-8'));
    expect(pkg.name).toBe('aocli');
    expect(pkg.version).toMatch(/^\d+\.\d+\.\d+/);
    expect(pkg.type).toBe('module');
    expect(pkg.bin).toHaveProperty('aocli');
  });

  it('should have commander dependency', () => {
    const pkg = JSON.parse(readFileSync(packagePath, 'utf-8'));
    expect(pkg.dependencies).toHaveProperty('commander');
  });

  it('should have test scripts', () => {
    const pkg = JSON.parse(readFileSync(packagePath, 'utf-8'));
    expect(pkg.scripts).toHaveProperty('test');
    expect(pkg.scripts).toHaveProperty('test:watch');
    expect(pkg.scripts).toHaveProperty('test:coverage');
  });
});

describe('TypeScript configuration', () => {
  const tsconfigPath = join(__dirname, '../tsconfig.json');
  
  it('should have tsconfig.json', () => {
    expect(existsSync(tsconfigPath)).toBe(true);
  });

  it('should have strict mode enabled', () => {
    const config = JSON.parse(readFileSync(tsconfigPath, 'utf-8'));
    expect(config.compilerOptions.strict).toBe(true);
  });

  it('should use ESM modules', () => {
    const config = JSON.parse(readFileSync(tsconfigPath, 'utf-8'));
    expect(config.compilerOptions.module).toBe('ESNext');
  });
});

describe('Vitest configuration', () => {
  const vitestConfigPath = join(__dirname, '../vitest.config.ts');
  
  it('should have vitest.config.ts', () => {
    expect(existsSync(vitestConfigPath)).toBe(true);
  });
});
