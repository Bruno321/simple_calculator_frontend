import { afterEach, describe, expect, it, vi } from 'vitest'
import { calculate } from './calculatorApi'

describe('calculator API client', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('maps an operation to the backend endpoint and payload', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ result: 25 }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(calculate('percentage', [100, 25])).resolves.toBe(25)
    expect(fetchMock).toHaveBeenCalledWith('/api/percentage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: 100, percentage: 25 }),
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
