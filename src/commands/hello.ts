import { formatOutput } from '../lib/output.js';

export interface HelloOptions {
  name: string;
  json?: boolean;
}

export function hello(options: HelloOptions): void {
  const result = { greeting: `Hello, ${options.name}!` };
  console.log(formatOutput(result, options.json ?? false));
}
