export type Operation =
  | 'addition'
  | 'subtraction'
  | 'multiplication'
  | 'division'
  | 'exponentiation'
  | 'square-root'
  | 'percentage'

type ApiError = { error: string }
type ApiResult = { result: number }

const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '/api'
const apiBaseUrl = configuredBaseUrl.replace(/\/$/, '')

function payloadFor(operation: Operation, values: number[]): object {
  switch (operation) {
    case 'addition':
    case 'subtraction':
    case 'multiplication':
    case 'division':
      return { operands: values }
    case 'exponentiation':
      return { base: values[0], exponent: values[1] }
    case 'square-root':
      return { radicand: values[0] }
    case 'percentage':
      return { value: values[0], percentage: values[1] }
  }
}

function isApiError(value: unknown): value is ApiError {
  return typeof value === 'object' && value !== null && 'error' in value && typeof value.error === 'string'
}

function isApiResult(value: unknown): value is ApiResult {
  return typeof value === 'object' && value !== null && 'result' in value && typeof value.result === 'number'
}

export async function calculate(operation: Operation, values: number[]): Promise<number> {
  let response: Response
  try {
    response = await fetch(`${apiBaseUrl}/${operation}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payloadFor(operation, values)),
    })
  } catch {
    throw new Error('Could not reach the calculator API.')
  }

  let body: unknown
  try {
    body = await response.json()
  } catch {
    throw new Error('The calculator API returned an invalid response.')
  }

  if (!response.ok) throw new Error(isApiError(body) ? body.error : `Calculation failed (${response.status}).`)
  if (!isApiResult(body) || !Number.isFinite(body.result)) throw new Error('The calculator API returned an invalid result.')
  return body.result
}
