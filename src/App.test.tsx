import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { calculate } from './api/calculatorApi'

vi.mock('./api/calculatorApi', () => ({ calculate: vi.fn() }))

const mockedCalculate = vi.mocked(calculate)

describe('calculator-style interaction', () => {
  beforeEach(() => {
    mockedCalculate.mockReset()
  })

  it('accepts a repeatable expression from the keyboard', async () => {
    mockedCalculate.mockResolvedValue(3)
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByLabelText('Calculator display'), '1+1+1')
    expect(screen.getByLabelText('Current expression')).toHaveTextContent('1 + 1 + 1')
    await user.click(screen.getByRole('button', { name: 'Calculate' }))

    expect(mockedCalculate).toHaveBeenCalledWith('addition', [1, 1, 1])
    expect(screen.getByLabelText('Calculator display')).toHaveValue('3')
  })

  it('accepts values and operators from the on-screen keypad', async () => {
    mockedCalculate.mockResolvedValue(24)
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '2' }))
    await user.click(screen.getByRole('button', { name: 'Multiplication' }))
    await user.click(screen.getByRole('button', { name: '3' }))
    await user.click(screen.getByRole('button', { name: 'Multiplication' }))
    await user.click(screen.getByRole('button', { name: '4' }))
    await user.click(screen.getByRole('button', { name: 'Calculate' }))

    expect(mockedCalculate).toHaveBeenCalledWith('multiplication', [2, 3, 4])
    expect(screen.getByLabelText('Calculator display')).toHaveValue('24')
  })

  it('prevents submission when the expression ends with an operator', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '1' }))
    await user.click(screen.getByRole('button', { name: 'Addition' }))
    await user.click(screen.getByRole('button', { name: '1' }))
    await user.click(screen.getByRole('button', { name: 'Addition' }))

    expect(screen.getByLabelText('Current expression')).toHaveTextContent('1 + 1 +')
    expect(screen.getByRole('button', { name: 'Calculate' })).toBeDisabled()
    expect(mockedCalculate).not.toHaveBeenCalled()
  })

  it('disables other operations and ignores mixed keyboard operators', async () => {
    const user = userEvent.setup()
    render(<App />)

    const display = screen.getByLabelText('Calculator display')
    await user.type(display, '1+2')

    const selectedOperation = screen.getByRole('button', { name: 'Addition' })
    expect(selectedOperation).toBeEnabled()
    expect(selectedOperation).toHaveAttribute('aria-pressed', 'true')
    expect(selectedOperation).not.toHaveClass('selected')
    expect(screen.getByRole('button', { name: 'Multiplication' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Division' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Power' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Square root' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Percentage' })).toBeDisabled()

    await user.type(display, '*')
    expect(screen.getByLabelText('Current expression')).toHaveTextContent('1 + 2')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'AC' }))
    expect(screen.getByRole('button', { name: 'Multiplication' })).toBeEnabled()
  })

  it('blocks unsupported keyboard characters before they enter the display', async () => {
    const user = userEvent.setup()
    render(<App />)

    const display = screen.getByLabelText('Calculator display')
    await user.type(display, '12abc!@#')

    expect(display).toHaveValue('12')
    expect(display).toHaveAttribute('aria-invalid', 'false')
    expect(screen.queryByText('Enter a valid finite number.')).not.toBeInTheDocument()
  })

  it('applies keyboard backspace with the same calculator behavior as the keypad', async () => {
    const user = userEvent.setup()
    render(<App />)

    const display = screen.getByLabelText('Calculator display')
    await user.type(display, '12+')
    expect(screen.getByLabelText('Current expression')).toHaveTextContent('12 +')

    await user.keyboard('{Backspace}')
    expect(screen.getByLabelText('Current expression')).toHaveTextContent('12')

    await user.keyboard('{Backspace}')
    expect(display).toHaveValue('1')
  })

  it('removes the sign key and places backspace directly after AC', () => {
    render(<App />)

    const keypadButtons = screen.getByRole('group', { name: 'Calculator keypad' }).querySelectorAll('button')
    expect(keypadButtons[0]).toHaveTextContent('AC')
    expect(keypadButtons[1]).toHaveAccessibleName('Backspace')
    expect(screen.queryByRole('button', { name: 'Toggle positive or negative' })).not.toBeInTheDocument()
  })

  it('collects exactly a base and exponent', async () => {
    mockedCalculate.mockResolvedValue(8)
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '2' }))
    await user.click(screen.getByRole('button', { name: 'Power' }))
    await user.click(screen.getByRole('button', { name: '3' }))

    expect(screen.getByRole('button', { name: 'Power' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'AC' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Backspace' })).toBeEnabled()
    await user.click(screen.getByRole('button', { name: 'Calculate' }))

    expect(mockedCalculate).toHaveBeenCalledWith('exponentiation', [2, 3])
  })

  it('collects a value and percentage through one display', async () => {
    mockedCalculate.mockResolvedValue(25)
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByLabelText('Calculator display'), '100')
    await user.click(screen.getByRole('button', { name: 'Percentage' }))
    await user.type(screen.getByLabelText('Calculator display'), '25')

    expect(screen.getByRole('button', { name: 'Percentage' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'AC' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Backspace' })).toBeEnabled()
    await user.click(screen.getByRole('button', { name: 'Calculate' }))

    expect(mockedCalculate).toHaveBeenCalledWith('percentage', [100, 25])
  })

  it('disables the display and keypad while a request is loading', async () => {
    let resolveRequest: (value: number) => void = () => undefined
    mockedCalculate.mockImplementation(() => new Promise((resolve) => { resolveRequest = resolve }))
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByLabelText('Calculator display'), '8+2')
    await user.click(screen.getByRole('button', { name: 'Calculate' }))

    expect(screen.getByText('Please wait')).toBeInTheDocument()
    expect(screen.getByLabelText('Calculator display')).toBeDisabled()
    expect(screen.getByRole('button', { name: '1' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Addition' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'AC' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Backspace' })).toBeEnabled()
    expect(mockedCalculate).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole('button', { name: 'Backspace' }))
    await act(async () => resolveRequest(10))
    expect(screen.queryByText('Please wait')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Calculator display')).toHaveValue('')
  })

  it('displays backend errors without duplicating domain validation', async () => {
    mockedCalculate.mockRejectedValue(new Error('square root of a negative number has no real result'))
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByLabelText('Calculator display'), '-9')
    await user.click(screen.getByRole('button', { name: 'Square root' }))

    expect(screen.getByRole('button', { name: 'Square root' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'AC' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Backspace' })).toBeEnabled()
    await user.click(screen.getByRole('button', { name: 'Calculate' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('square root of a negative number has no real result')
  })
})
