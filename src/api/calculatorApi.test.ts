import { afterEach, describe, expect, it, vi } from 'vitest'
import { calculate, type Operation } from './calculatorApi'

type ContractCase = {
  operation: Operation
  values: number[]
  endpoint: string
  payload: object
}

const contractCases: ContractCase[] = [
  { operation: 'addition', values: [1, 2, 3], endpoint: 'addition', payload: { operands: [1, 2, 3] } },
  { operation: 'multiplication', values: [2, 3, 4], endpoint: 'multiplication', payload: { operands: [2, 3, 4] } },
  { operation: 'division', values: [100, 5, 2], endpoint: 'division', payload: { operands: [100, 5, 2] } },
  { operation: 'exponentiation', values: [2, 3], endpoint: 'exponentiation', payload: { base: 2, exponent: 3 } },
  { operation: 'square-root', values: [9], endpoint: 'square-root', payload: { radicand: 9 } },
  { operation: 'percentage', values: [100, 25], endpoint: 'percentage', payload: { value: 100, percentage: 25 } },
]

describe('calculator API client', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it.each(contractCases)('maps $operation to its backend contract', async ({ operation, values, endpoint, payload }) => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ result: 1 }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await calculate(operation, values)

    expect(fetchMock).toHaveBeenCalledWith(`/api/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  })

  it('surfaces the backend error message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ error: 'division by zero' }),
    }))

    await expect(calculate('division', [10, 0])).rejects.toThrow('division by zero')
  })
})
