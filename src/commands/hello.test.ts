import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { hello, type HelloOptions } from './hello.js';
import { encode } from '@toon-format/toon';

describe('hello command', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('should greet with default name in TOON format', () => {
    const options: HelloOptions = { name: 'World', json: false };
    hello(options);
    expect(consoleSpy).toHaveBeenCalledWith(encode({ greeting: 'Hello, World!' }));
  });

  it('should greet with custom name in TOON format', () => {
    const options: HelloOptions = { name: 'Alice', json: false };
    hello(options);
    expect(consoleSpy).toHaveBeenCalledWith(encode({ greeting: 'Hello, Alice!' }));
  });

  it('should output in JSON format when json option is true', () => {
    const options: HelloOptions = { name: 'World', json: true };
    hello(options);
    expect(consoleSpy).toHaveBeenCalledWith(JSON.stringify({ greeting: 'Hello, World!' }, null, 2));
  });

  it('should handle empty string name', () => {
    const options: HelloOptions = { name: '', json: false };
    hello(options);
    expect(consoleSpy).toHaveBeenCalledWith(encode({ greeting: 'Hello, !' }));
  });

  it('should handle names with special characters', () => {
    const options: HelloOptions = { name: 'John-Doe_123', json: false };
    hello(options);
    expect(consoleSpy).toHaveBeenCalledWith(encode({ greeting: 'Hello, John-Doe_123!' }));
  });

  it('should handle names with spaces', () => {
    const options: HelloOptions = { name: 'Mary Jane', json: false };
    hello(options);
    expect(consoleSpy).toHaveBeenCalledWith(encode({ greeting: 'Hello, Mary Jane!' }));
  });

  it('should handle unicode names', () => {
    const options: HelloOptions = { name: 'José', json: false };
    hello(options);
    expect(consoleSpy).toHaveBeenCalledWith(encode({ greeting: 'Hello, José!' }));
  });

  it('should handle very long names', () => {
    const longName = 'A'.repeat(1000);
    const options: HelloOptions = { name: longName, json: false };
    hello(options);
    expect(consoleSpy).toHaveBeenCalledWith(encode({ greeting: `Hello, ${longName}!` }));
  });

  it('should handle single character name', () => {
    const options: HelloOptions = { name: 'X', json: false };
    hello(options);
    expect(consoleSpy).toHaveBeenCalledWith(encode({ greeting: 'Hello, X!' }));
  });
});
