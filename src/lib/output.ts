import { encode } from '@toon-format/toon'

export function formatOutput(data: unknown, useJson: boolean): string {
  if (useJson) {
    return JSON.stringify(data, null, 2)
  }
  return encode(data)
}
