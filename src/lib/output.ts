import { encode } from '@toon-format/toon'

export type OutputFormat = 'toon' | 'json' | 'ndjson' | 'auto'

export interface OutputOptions {
  format: OutputFormat
  fields?: string[]
}

function isTTY(): boolean {
  try {
    return process.stdout.isTTY === true
  } catch {
    return false
  }
}

export function detectOutputFormat(preferredFormat: OutputFormat = 'auto'): 'toon' | 'json' {
  if (preferredFormat === 'auto') {
    return isTTY() ? 'toon' : 'json'
  }
  return preferredFormat === 'toon' ? 'toon' : 'json'
}

export function filterFields(data: unknown, fields?: string[]): unknown {
  if (!fields || fields.length === 0) {
    return data
  }

  if (Array.isArray(data)) {
    return data.map(item => filterFields(item, fields))
  }

  if (data === null || typeof data !== 'object') {
    return data
  }

  const result: Record<string, unknown> = {}
  for (const field of fields) {
    if (field in data) {
      result[field] = (data as Record<string, unknown>)[field]
    }
  }
  return result
}

export function formatOutput(data: unknown, options: OutputOptions | boolean): string {
  let format: OutputFormat
  let fields: string[] | undefined

  if (typeof options === 'boolean') {
    format = options ? 'json' : 'auto'
  } else {
    format = options.format
    fields = options.fields
  }

  const filteredData = filterFields(data, fields)

  switch (format) {
    case 'toon':
      return encode(filteredData)
    case 'json':
      return JSON.stringify(filteredData, null, 2)
    case 'ndjson':
      if (Array.isArray(filteredData)) {
        return filteredData.map(item => JSON.stringify(item)).join('\n')
      }
      return JSON.stringify(filteredData)
    case 'auto':
    default:
      return isTTY() ? encode(filteredData) : JSON.stringify(filteredData, null, 2)
  }
}

export function formatNDJSON(data: unknown[]): string {
  return data.map(item => JSON.stringify(item)).join('\n')
}
