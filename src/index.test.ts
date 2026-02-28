import { describe, it, expect } from 'vitest'
import { execSync } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const rootDir = join(__dirname, '..')

describe('CLI Integration Tests', () => {
  const runCLI = (args: string): string => {
    try {
      return execSync(`npx tsx src/index.ts ${args}`, {
        encoding: 'utf-8',
        cwd: rootDir,
      }).trim()
    } catch (error: any) {
      return error.stdout?.trim() || error.message
    }
  }

  describe('version command', () => {
    it('should display version with --version flag', () => {
      const output = runCLI('--version')
      expect(output).toMatch(/^\d+\.\d+\.\d+/)
    })

    it('should display version with -V flag', () => {
      const output = runCLI('-V')
      expect(output).toMatch(/^\d+\.\d+\.\d+/)
    })
  })

  describe('help command', () => {
    it('should display help with --help flag', () => {
      const output = runCLI('--help')
      expect(output).toContain('Usage: agent-office')
      expect(output).toContain('Commands:')
    })

    it('should display help with -h flag', () => {
      const output = runCLI('-h')
      expect(output).toContain('Usage: agent-office')
    })
  })

  describe('database options', () => {
    it('should show --sqlite option in help', () => {
      const output = runCLI('--help')
      expect(output).toContain('--sqlite')
      expect(output).toContain('--postgresql')
    })
  })
})
