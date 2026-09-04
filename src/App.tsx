import { type FormEvent, type KeyboardEvent, useRef, useState } from 'react'
import { calculate, type Operation } from './api/calculatorApi'
import {
  canCalculate,
  currentFieldLabel,
  definitionFor,
  expressionFor,
  isEditableNumber,
  parseNumber,
} from './calculator/calculatorInput'
import './App.css'

function App() {
  const [operation, setOperation] = useState<Operation | null>(null)
  const [entries, setEntries] = useState([''])
  const [result, setResult] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const displayRef = useRef<HTMLInputElement>(null)
  const requestIdRef = useRef(0)

  const currentIndex = entries.length - 1
  const currentEntry = entries[currentIndex]
  const isComplete = canCalculate(operation, entries)
  const hasSomethingToClear = operation !== null || entries.some(Boolean) || result !== null || error !== null || isLoading
  const hasSomethingToDelete = result !== null || currentEntry.length > 0 || entries.length > 1

  function focusDisplay() {
    window.requestAnimationFrame(() => displayRef.current?.focus())
  }

  function fixedOperationIsLocked(candidate: Operation): boolean {
    if (operation !== candidate) return false

    const definition = definitionFor(candidate)
    return definition.kind === 'single' || (definition.kind === 'pair' && entries.length >= 2)
  }

  function operationIsDisabled(candidate: Operation): boolean {
    return isLoading || Boolean(operation && operation !== candidate) || fixedOperationIsLocked(candidate)
  }

  function clearCalculator() {
    requestIdRef.current += 1
    setIsLoading(false)
    setOperation(null)
    setEntries([''])
    setResult(null)
    setError(null)
    focusDisplay()
  }

  function updateCurrentEntry(value: string) {
    if (!isEditableNumber(value)) return
    setEntries((current) => current.map((entry, index) => (index === current.length - 1 ? value : entry)))
    setResult(null)
    setError(null)
  }

  function appendCharacter(character: string) {
    if (isLoading) return
    if (result !== null) {
      setOperation(null)
      setEntries([character === '.' ? '0.' : character])
      setResult(null)
      setError(null)
      focusDisplay()
      return
    }

    let next = currentEntry
    if (character === '.') {
      const mantissa = next.toLowerCase().split('e')[0]
      if (mantissa.includes('.')) return
      next = next === '' || next === '-' ? `${next}0.` : `${next}.`
    } else if (next === '0') {
      next = character
    } else if (next === '-0') {
      next = `-${character}`
    } else {
      next += character
    }
    updateCurrentEntry(next)
    focusDisplay()
  }

  function backspace() {
    requestIdRef.current += 1
    setIsLoading(false)
    if (result !== null) {
      clearCalculator()
      return
    }
    if (currentEntry.length > 0) updateCurrentEntry(currentEntry.slice(0, -1))
    else if (entries.length > 1) {
      setEntries((current) => current.slice(0, -1))
      setError(null)
    }
    focusDisplay()
  }

  function chooseOperation(nextOperation: Operation) {
    if (isLoading) return

    if (operation && operation !== nextOperation) {
      focusDisplay()
      return
    }

    if (fixedOperationIsLocked(nextOperation)) {
      focusDisplay()
      return
    }

    const workingEntries = result === null ? entries : [String(result)]
    const workingOperation = result === null ? operation : null
    const current = workingEntries[workingEntries.length - 1]
    const hasCurrentNumber = parseNumber(current) !== null
    const nextDefinition = definitionFor(nextOperation)

    setResult(null)
    setError(null)

    if (workingOperation !== nextOperation) {
      setOperation(nextOperation)
      if (nextDefinition.kind !== 'single' && hasCurrentNumber) setEntries([...workingEntries, ''])
      else setEntries(workingEntries)
      focusDisplay()
      return
    }

    if (nextDefinition.kind === 'single') {
      focusDisplay()
      return
    }

    if (!hasCurrentNumber) {
      setError('Finish the current number before adding another value.')
      focusDisplay()
      return
    }

    if (nextDefinition.kind === 'pair' && workingEntries.length === 2) {
      setError(`${nextDefinition.label} accepts exactly two values.`)
      focusDisplay()
      return
    }

    setEntries([...workingEntries, ''])
    focusDisplay()
  }

  function handleKeyboard(event: KeyboardEvent<HTMLInputElement>) {
    const operationKeys: Record<string, Operation> = {
      '+': 'addition',
      '*': 'multiplication',
      x: 'multiplication',
      X: 'multiplication',
      '/': 'division',
      '^': 'exponentiation',
      '%': 'percentage',
      r: 'square-root',
      R: 'square-root',
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      clearCalculator()
      return
    }

    if (event.ctrlKey || event.metaKey) return

    if (event.key === 'Backspace' || event.key === 'Delete') {
      event.preventDefault()
      backspace()
      return
    }

    const keyedOperation = operationKeys[event.key]
    if (keyedOperation) {
      event.preventDefault()
      chooseOperation(keyedOperation)
      return
    }

    if (result !== null && /^[0-9.]$/.test(event.key)) {
      event.preventDefault()
      appendCharacter(event.key)
      return
    }

    const allowedEditingKeys = new Set(['ArrowLeft', 'ArrowRight', 'Home', 'End', 'Tab', 'Enter'])
    if (event.key.length === 1 && !/^[0-9.-]$/.test(event.key) && !allowedEditingKeys.has(event.key)) event.preventDefault()
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isLoading || !isComplete || !operation) return

    const values = entries.map(parseNumber) as number[]
    const requestId = ++requestIdRef.current
    setIsLoading(true)
    setError(null)

    try {
      const calculatedResult = await calculate(operation, values)
      if (requestId === requestIdRef.current) setResult(calculatedResult)
    } catch (requestError) {
      if (requestId === requestIdRef.current) {
        setError(requestError instanceof Error ? requestError.message : 'Unable to calculate. Please try again.')
      }
    } finally {
      if (requestId === requestIdRef.current) setIsLoading(false)
    }
  }

  return (
    <main className="page-shell">
      <h1 className="sr-only">Calculator</h1>
      <form className="calculator" onSubmit={submit} noValidate>
        <fieldset>
          <legend className="sr-only">Calculator controls</legend>

          <section className={`display${error ? ' has-error' : ''}`} aria-live="polite" aria-busy={isLoading}>
            <div className="display-meta">
              <span>{operation ? definitionFor(operation).label : 'Calculator'}</span>
              <span>{isLoading ? 'Please wait' : currentFieldLabel(operation, entries)}</span>
            </div>
            <div className="display-expression" aria-label="Current expression">
              {expressionFor(operation, entries)}
            </div>
            <input
              ref={displayRef}
              className="display-input"
              aria-label="Calculator display"
              aria-invalid={Boolean(!result && currentEntry && parseNumber(currentEntry) === null)}
              inputMode="decimal"
              autoComplete="off"
              placeholder="0"
              readOnly={result !== null}
              value={result !== null ? String(result) : currentEntry}
              disabled={isLoading}
              onChange={(event) => updateCurrentEntry(event.target.value)}
              onKeyDown={handleKeyboard}
            />
            {result !== null && <span className="result-label">Result</span>}
            {error && <p className="display-error" role="alert">{error}</p>}
            {!error && !result && currentEntry && parseNumber(currentEntry) === null && (
              <p className="display-error">Enter a valid finite number.</p>
            )}
          </section>

          <div className="keypad" role="group" aria-label="Calculator keypad">
            <button className="key utility-key" type="button" disabled={!hasSomethingToClear} onClick={clearCalculator}>AC</button>
            <button className="key utility-key backspace-key" type="button" aria-label="Backspace" disabled={!hasSomethingToDelete} onClick={backspace}>&larr;</button>
            <OperationKey operation="square-root" selected={operation === 'square-root'} disabled={operationIsDisabled('square-root')} onChoose={chooseOperation} />

            <NumberKey value="7" disabled={isLoading} onPress={appendCharacter} />
            <NumberKey value="8" disabled={isLoading} onPress={appendCharacter} />
            <NumberKey value="9" disabled={isLoading} onPress={appendCharacter} />
            <OperationKey operation="division" selected={operation === 'division'} disabled={operationIsDisabled('division')} onChoose={chooseOperation} />

            <NumberKey value="4" disabled={isLoading} onPress={appendCharacter} />
            <NumberKey value="5" disabled={isLoading} onPress={appendCharacter} />
            <NumberKey value="6" disabled={isLoading} onPress={appendCharacter} />
            <OperationKey operation="multiplication" selected={operation === 'multiplication'} disabled={operationIsDisabled('multiplication')} onChoose={chooseOperation} />

            <NumberKey value="1" disabled={isLoading} onPress={appendCharacter} />
            <NumberKey value="2" disabled={isLoading} onPress={appendCharacter} />
            <NumberKey value="3" disabled={isLoading} onPress={appendCharacter} />
            <OperationKey operation="addition" selected={operation === 'addition'} disabled={operationIsDisabled('addition')} onChoose={chooseOperation} />

            <NumberKey value="0" className="zero-key" disabled={isLoading} onPress={appendCharacter} />
            <NumberKey value="." label="Decimal point" disabled={isLoading} onPress={appendCharacter} />
            <OperationKey operation="exponentiation" selected={operation === 'exponentiation'} disabled={operationIsDisabled('exponentiation')} onChoose={chooseOperation} />
            <OperationKey operation="percentage" selected={operation === 'percentage'} disabled={operationIsDisabled('percentage')} onChoose={chooseOperation} />

            <button className="key equals-key" type="submit" aria-label="Calculate" disabled={!isComplete || isLoading}>
              {isLoading ? 'Calculating...' : '='}
            </button>
          </div>
        </fieldset>
      </form>
    </main>
  )
}

type NumberKeyProps = {
  value: string
  label?: string
  className?: string
  disabled?: boolean
  onPress: (value: string) => void
}

function NumberKey({ value, label, className = '', disabled = false, onPress }: NumberKeyProps) {
  return <button className={`key number-key ${className}`} type="button" aria-label={label} disabled={disabled} onClick={() => onPress(value)}>{value}</button>
}

type OperationKeyProps = {
  operation: Operation
  selected: boolean
  disabled: boolean
  onChoose: (operation: Operation) => void
}

function OperationKey({ operation, selected, disabled, onChoose }: OperationKeyProps) {
  const definition = definitionFor(operation)
  return (
    <button
      className="key operation-key"
      type="button"
      aria-label={definition.label}
      aria-pressed={selected}
      disabled={disabled}
      onClick={() => onChoose(operation)}
    >
      {definition.symbol}
    </button>
  )
}

export default App
