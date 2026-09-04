import { useMemo, useState } from 'react'
import { calculate, type Operation } from './api/calculatorApi'
import './App.css'

type OperationDefinition = {
  id: Operation
  label: string
  symbol: string
  description: string
  fields: string[]
  variableOperands?: boolean
}

const operations: OperationDefinition[] = [
  { id: 'addition', label: 'Addition', symbol: '+', description: 'Add two or more numbers.', fields: ['First number', 'Second number'], variableOperands: true },
  { id: 'multiplication', label: 'Multiplication', symbol: '×', description: 'Multiply two or more numbers.', fields: ['First number', 'Second number'], variableOperands: true },
  { id: 'division', label: 'Division', symbol: '÷', description: 'Divide from left to right.', fields: ['Dividend', 'Divisor'], variableOperands: true },
  { id: 'exponentiation', label: 'Power', symbol: 'xʸ', description: 'Raise a base to an exponent.', fields: ['Base', 'Exponent'] },
  { id: 'square-root', label: 'Square root', symbol: '√', description: 'Find the square root of one number.', fields: ['Radicand'] },
  { id: 'percentage', label: 'Percentage', symbol: '%', description: 'Find a percentage of a value.', fields: ['Value', 'Percentage'] },
]

const decimalPattern = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i

function parseNumber(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed || !decimalPattern.test(trimmed)) return null
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : null
}

function emptyInputsFor(operation: OperationDefinition): string[] {
  return operation.fields.map(() => '')
}

function expressionFor(operation: OperationDefinition, inputs: string[]): string {
  const values = inputs.map((input) => input.trim() || '…')
  if (operation.variableOperands) return values.join(` ${operation.symbol} `)
  if (operation.id === 'exponentiation') return `${values[0]} ^ ${values[1]}`
  if (operation.id === 'square-root') return `√(${values[0]})`
  return `${values[1]}% of ${values[0]}`
}

function App() {
  const [selectedId, setSelectedId] = useState<Operation>('addition')
  const selectedOperation = operations.find(({ id }) => id === selectedId)!
  const [inputs, setInputs] = useState<string[]>(emptyInputsFor(selectedOperation))
  const [result, setResult] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const parsedInputs = useMemo(() => inputs.map(parseNumber), [inputs])
  const isComplete = parsedInputs.every((input) => input !== null)

  function selectOperation(operation: OperationDefinition) {
    if (isLoading || operation.id === selectedId) return
    setSelectedId(operation.id)
    setInputs(emptyInputsFor(operation))
    setResult(null)
    setError(null)
  }

  function updateInput(index: number, value: string) {
    setInputs((current) => current.map((input, inputIndex) => (inputIndex === index ? value : input)))
    setResult(null)
    setError(null)
  }

  function addOperand() {
    setInputs((current) => [...current, ''])
    setResult(null)
    setError(null)
  }

  function removeOperand(index: number) {
    setInputs((current) => current.filter((_, inputIndex) => inputIndex !== index))
    setResult(null)
    setError(null)
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isLoading || !isComplete) {
      setError('Enter a valid number in every field before calculating.')
      return
    }

    const values = parsedInputs as number[]
    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      setResult(await calculate(selectedId, values))
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to calculate. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="app-shell">
      <header className="intro">
        <p className="eyebrow">Simple calculator</p>
        <h1>Choose an operation.<br />We’ll do the math.</h1>
        <p className="intro-copy">Six focused operations, calculated by the API.</p>
      </header>

      <section className="calculator-card" aria-labelledby="calculator-title">
        <div className="card-heading">
          <div>
            <p className="step-label">01 · Operation</p>
            <h2 id="calculator-title">What would you like to calculate?</h2>
          </div>
          <span className="api-status"><span aria-hidden="true" /> API powered</span>
        </div>

        <div className="operation-grid" aria-label="Operations">
          {operations.map((operation) => (
            <button
              className={`operation-button${operation.id === selectedId ? ' selected' : ''}`}
              type="button"
              key={operation.id}
              aria-pressed={operation.id === selectedId}
              disabled={isLoading}
              onClick={() => selectOperation(operation)}
            >
              <span className="operation-symbol" aria-hidden="true">{operation.symbol}</span>
              <span>{operation.label}</span>
            </button>
          ))}
        </div>

        <form onSubmit={submit} noValidate>
          <fieldset disabled={isLoading}>
            <legend className="sr-only">{selectedOperation.label} inputs</legend>
            <div className="input-heading">
              <div>
                <p className="step-label">02 · Values</p>
                <h2>{selectedOperation.label}</h2>
                <p>{selectedOperation.description}</p>
              </div>
              <div className="expression" aria-label="Current expression">{expressionFor(selectedOperation, inputs)}</div>
            </div>

            <div className="input-list">
              {inputs.map((input, index) => {
                const label = selectedOperation.fields[index] ?? `Number ${index + 1}`
                const inputId = `calculator-input-${index}`
                const invalid = input.length > 0 && parseNumber(input) === null

                return (
                  <div className="input-row" key={inputId}>
                    <label htmlFor={inputId}>{label}</label>
                    <div className="input-control">
                      <input
                        id={inputId}
                        type="text"
                        inputMode="decimal"
                        autoComplete="off"
                        value={input}
                        aria-invalid={invalid}
                        placeholder="Enter a number"
                        onChange={(event) => updateInput(index, event.target.value)}
                      />
                      {selectedOperation.variableOperands && inputs.length > 2 && (
                        <button className="remove-button" type="button" aria-label={`Remove ${label.toLowerCase()}`} onClick={() => removeOperand(index)}>×</button>
                      )}
                    </div>
                    {invalid && <span className="field-error">Enter a finite number.</span>}
                  </div>
                )
              })}
            </div>

            {selectedOperation.variableOperands && (
              <button className="add-operand-button" type="button" onClick={addOperand}>
                <span aria-hidden="true">+</span> Add another operand
              </button>
            )}

            <button className="calculate-button" type="submit" disabled={!isComplete || isLoading}>
              {isLoading ? <><span className="spinner" aria-hidden="true" /> Calculating…</> : 'Calculate'}
            </button>
          </fieldset>
        </form>

        <div className="feedback" aria-live="polite" aria-busy={isLoading}>
          {isLoading && <p className="loading-message">Sending calculation to the API…</p>}
          {!isLoading && error && <p className="error-message" role="alert">{error}</p>}
          {!isLoading && result !== null && (
            <div className="result-panel">
              <p>Result</p>
              <output aria-label="Calculation result">{String(result)}</output>
            </div>
          )}
          {!isLoading && !error && result === null && !isComplete && <p className="helper-message">Complete every value to enable calculation.</p>}
        </div>
      </section>

      <footer>Results are calculated by the backend API.</footer>
    </main>
  )
}

export default App
