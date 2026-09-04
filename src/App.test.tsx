import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { calculate } from './api/calculatorApi'

vi.mock('./api/calculatorApi', () => ({ calculate: vi.fn() }))

const mockedCalculate = vi.mocked(calculate)

async function enterAddition(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('First number'), '1')
  await user.type(screen.getByLabelText('Second number'), '2')
}

describe('calculator', () => {
  beforeEach(() => {
    mockedCalculate.mockReset()
  })

  it('shows the exact inputs for a selected fixed-input operation', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Square root' }))

    expect(screen.getByLabelText('Radicand')).toBeInTheDocument()
    expect(screen.queryByLabelText('Second number')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /add another operand/i })).not.toBeInTheDocument()
  })

  it('keeps a multi-operand expression on the selected operation', async () => {
    const user = userEvent.setup()
    render(<App />)

    await enterAddition(user)
    await user.click(screen.getByRole('button', { name: /add another operand/i }))
    await user.type(screen.getByLabelText('Number 3'), '3')

    expect(screen.getByLabelText('Current expression')).toHaveTextContent('1 + 2 + 3')
  })

  it('prevents an incomplete multi-operand calculation', async () => {
    const user = userEvent.setup()
    render(<App />)

    await enterAddition(user)
    await user.click(screen.getByRole('button', { name: /add another operand/i }))

    expect(screen.getByRole('button', { name: 'Calculate' })).toBeDisabled()
    expect(screen.getByText('Complete every value to enable calculation.')).toBeInTheDocument()
    expect(mockedCalculate).not.toHaveBeenCalled()
  })

  it('disables interaction and prevents duplicate requests while loading', async () => {
    let resolveRequest: (value: number) => void = () => undefined
    mockedCalculate.mockImplementation(() => new Promise((resolve) => { resolveRequest = resolve }))
    const user = userEvent.setup()
    render(<App />)

    await enterAddition(user)
    await user.click(screen.getByRole('button', { name: 'Calculate' }))

    expect(screen.getByRole('button', { name: 'Calculating…' })).toBeDisabled()
    expect(screen.getByLabelText('First number')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Multiplication' })).toBeDisabled()
    expect(mockedCalculate).toHaveBeenCalledTimes(1)

    await act(async () => resolveRequest(3))
    expect(await screen.findByLabelText('Calculation result')).toHaveTextContent('3')
  })

  it('displays a successful API result', async () => {
    mockedCalculate.mockResolvedValue(3)
    const user = userEvent.setup()
    render(<App />)

    await enterAddition(user)
    await user.click(screen.getByRole('button', { name: 'Calculate' }))

    expect(await screen.findByLabelText('Calculation result')).toHaveTextContent('3')
    expect(mockedCalculate).toHaveBeenCalledWith('addition', [1, 2])
  })

  it('displays an error returned by the backend', async () => {
    mockedCalculate.mockRejectedValue(new Error('division by zero'))
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Division' }))
    await user.type(screen.getByLabelText('Dividend'), '10')
    await user.type(screen.getByLabelText('Divisor'), '0')
    await user.click(screen.getByRole('button', { name: 'Calculate' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('division by zero')
  })
})
