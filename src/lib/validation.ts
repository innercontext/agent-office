const DISALLOWED_RESOURCE_CHARS = /[\\/?#%]/
const CONTROL_CHAR_RE = /[\u0000-\u001F\u007F]/
const PATH_TRAVERSAL_RE = /\.\.[/\\]|\.\.\Z/
const DOUBLE_ENCODED_RE = /%2e%2e|%252e%252e/i

export function assertSafeText(value: unknown, label: string, allowEmpty = false): string {
  if (typeof value !== 'string') {
    throw new Error(`${label} must be a string`)
  }
  if (!allowEmpty && value.trim().length === 0) {
    throw new Error(`${label} must not be empty`)
  }
  if (CONTROL_CHAR_RE.test(value)) {
    throw new Error(`${label} contains control characters`)
  }
  return value
}

export function validateResourceName(value: unknown, label: string): string {
  const text = assertSafeText(value, label)
  if (DISALLOWED_RESOURCE_CHARS.test(text)) {
    throw new Error(`${label} contains unsupported characters`)
  }
  if (DOUBLE_ENCODED_RE.test(text)) {
    throw new Error(`${label} contains suspicious traversal sequence`)
  }
  return text
}

export function validateSafePath(value: unknown, label: string): string {
  const text = assertSafeText(value, label)

  // Check for path traversal attempts
  if (PATH_TRAVERSAL_RE.test(text)) {
    throw new Error(`${label} contains path traversal attempt`)
  }

  // Check for absolute paths
  if (text.startsWith('/') || (text.length > 1 && text[1] === ':')) {
    throw new Error(`${label} must be a relative path`)
  }

  // Check for double-encoded sequences
  if (DOUBLE_ENCODED_RE.test(text)) {
    throw new Error(`${label} contains suspicious double-encoded sequence`)
  }

  // Check for URL-encoded special chars
  if (/%2[fF]|%5[cC]|%2[eE]/i.test(text)) {
    throw new Error(`${label} contains URL-encoded path characters`)
  }

  return text
}

export function validateCoworkerName(name: unknown): string {
  return validateResourceName(name, 'Coworker name')
}

export function validateTaskColumn(column: unknown): string {
  return assertSafeText(column, 'Task column')
}

export function validateCronSchedule(schedule: unknown): string {
  const text = validateResourceName(schedule, 'Cron schedule')
  if (text.length === 0) {
    throw new Error('Cron schedule must not be empty')
  }
  return text
}

export function validateTimezone(value: unknown): string {
  return assertSafeText(value, 'Timezone')
}

export function validatePositiveInteger(value: unknown, label: string): number {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${label} must be a positive integer`)
  }
  return parsed
}

export function validateNonNegativeInteger(value: unknown, label: string): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 0 || !Number.isInteger(parsed)) {
    throw new Error(`${label} must be a non-negative integer`)
  }
  return parsed
}

export function validateIsoDateTime(value: unknown, label: string): Date {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${label} must be an ISO 8601 timestamp`)
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${label} must be an ISO 8601 timestamp`)
  }
  return date
}

export function validateOptionalIsoDateTime(value: unknown, label: string): Date | undefined {
  if (value === undefined || value === null) {
    return undefined
  }
  return validateIsoDateTime(value, label)
}

export function validateStringArray(values: unknown, label: string): string[] {
  if (!Array.isArray(values)) {
    throw new Error(`${label} must be an array`)
  }
  return values.map((value, index) => {
    if (typeof value !== 'string') {
      throw new Error(`${label}[${index}] must be a string`)
    }
    return assertSafeText(value, `${label}[${index}]`)
  })
}

export function validatePositiveIntegerArray(values: unknown, label: string): number[] {
  if (!Array.isArray(values)) {
    throw new Error(`${label} must be an array`)
  }
  return values.map((value, index) => {
    try {
      return validatePositiveInteger(value, `${label}[${index}]`)
    } catch (error) {
      if (error instanceof Error) {
        throw error
      }
      throw new Error(`${label}[${index}] must be a positive integer`)
    }
  })
}

export function validateFieldsParam(fields: unknown): string[] | undefined {
  if (fields === undefined || fields === null) {
    return undefined
  }

  if (typeof fields === 'string') {
    return fields
      .split(',')
      .map(f => f.trim())
      .filter(f => f.length > 0)
  }

  if (Array.isArray(fields)) {
    return fields.map((f, i) => {
      if (typeof f !== 'string') {
        throw new Error(`fields[${i}] must be a string`)
      }
      return assertSafeText(f, `fields[${i}]`)
    })
  }

  throw new Error('fields must be a comma-separated string or array of strings')
}
