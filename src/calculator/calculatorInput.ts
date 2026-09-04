import type { Operation } from '../api/calculatorApi'

export type OperationDefinition = {
  id: Operation
  label: string
  symbol: string
  kind: 'repeatable' | 'pair' | 'single'
  fields: string[]
}

export const operations: OperationDefinition[] = [
  { id: 'addition', label: 'Addition', symbol: '+', kind: 'repeatable', fields: ['First number', 'Next number'] },
  { id: 'multiplication', label: 'Multiplication', symbol: '\u00d7', kind: 'repeatable', fields: ['First number', 'Next number'] },
  { id: 'division', label: 'Division', symbol: '\u00f7', kind: 'repeatable', fields: ['Dividend', 'Divisor'] },
  { id: 'exponentiation', label: 'Power', symbol: 'x\u02b8', kind: 'pair', fields: ['Base', 'Exponent'] },
  { id: 'square-root', label: 'Square root', symbol: '\u221a', kind: 'single', fields: ['Radicand'] },
  { id: 'percentage', label: 'Percentage', symbol: '%', kind: 'pair', fields: ['Value', 'Percentage'] },
]

const decimalPattern = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i
const editableDecimalPattern = /^-?\d*\.?\d*$/

export function isEditableNumber(value: string): boolean {
  return editableDecimalPattern.test(value)
}

export function parseNumber(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed || !decimalPattern.test(trimmed)) return null

  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : null
}

export function definitionFor(operation: Operation): OperationDefinition {
  return operations.find(({ id }) => id === operation)!
}

export function currentFieldLabel(operation: Operation | null, entries: string[]): string {
  if (!operation) return 'Enter a number'

  const definition = definitionFor(operation)
  if (definition.kind === 'repeatable') {
    if (entries.length === 1) return definition.fields[0]
    if (operation === 'division' && entries.length === 2) return definition.fields[1]
    return `Operand ${entries.length}`
  }

  return definition.fields[Math.min(entries.length - 1, definition.fields.length - 1)]
}

export function expressionFor(operation: Operation | null, entries: string[]): string {
  const values = entries.map((entry) => entry.trim() || '\u2026')
  if (!operation) return values[0] === '\u2026' ? 'Ready' : values[0]

  const definition = definitionFor(operation)
  if (definition.kind === 'repeatable') return values.join(` ${definition.symbol} `)
  if (operation === 'exponentiation') return `${values[0]} ^ ${values[1] ?? '\u2026'}`
  if (operation === 'square-root') return `\u221a(${values[0]})`
  if (values.length === 1) return `Percentage of ${values[0]}`
  return `${values[1]}% of ${values[0]}`
}

export function canCalculate(operation: Operation | null, entries: string[]): boolean {
  if (!operation || entries.some((entry) => parseNumber(entry) === null)) return false

  const definition = definitionFor(operation)
  if (definition.kind === 'repeatable') return entries.length >= 2
  if (definition.kind === 'pair') return entries.length === 2
  return entries.length === 1
}
