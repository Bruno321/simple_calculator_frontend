# Calculator frontend

A responsive React + TypeScript calculator that connects to a compatible calculator HTTP API. It provides one calculator display and an on-screen keypad for addition, subtraction, multiplication, division, exponentiation, square root, and percentage.

## Docker

Build and run the frontend from this directory:

```sh
docker build -t calculator-frontend .
docker run --rm -p 3000:80 calculator-frontend
```

URL: [http://localhost:3000](http://localhost:3000). 

## Calculator interaction

Enter numbers with the keyboard or number keys. Choose an operation using its keypad key, then enter the next value. The display identifies the active operation and value.

- Addition, subtraction, multiplication, and division accept two or more operands. Press the selected operation again to continue the chain, such as `10 - 4 - 2`. Only one operator is allowed in a chain, and operands are sent to the API in their entered order.
- Power collects exactly a base and exponent.
- Square root collects one radicand.
- Percentage collects a value followed by a percentage and displays the relationship as `percentage% of value`.

Repeatable operation keys stay enabled so another operand can be added. Power and percentage become disabled after moving to their second value, and square root becomes disabled as soon as it is selected because it needs no additional operand. AC and backspace remain available whenever they can affect the current input.

The keypad also provides decimal input, backspace, all-clear, and calculate. Keyboard shortcuts are `+`, `-`, `*`/`x`, `/`, `^`, `%`, and `r` for square root; Enter calculates and Escape clears. A leading `-` starts a negative number, while `-` after a complete value selects or continues subtraction. Other operation keys are disabled as soon as an operation is selected, so a chain cannot mix operators. Unsupported keyboard characters are ignored instead of being added to the display.

Calculation is disabled for missing, incomplete, or invalid numeric input. Number, operation, display, and calculate controls are disabled while a request is pending, preventing edits and duplicate requests. AC and backspace remain available whenever they can clear or delete something; using either invalidates the pending interaction so a late response cannot overwrite the display. Mathematical or domain errors returned by the API are shown in the calculator display.

## Structure

```text
src/App.tsx                         calculator state and interaction
src/calculator/calculatorInput.ts   constrained input/display helpers
src/api/calculatorApi.ts            API endpoint and payload mapping
src/*.test.tsx, src/api/*.test.ts   interaction and API contract tests
nginx/default.conf.template         production API reverse proxy
```

The frontend does not evaluate expressions. It collects valid numeric tokens, maps them to the API request models, and displays the returned result or error.

## Local development

Requirement: Node.js 22 or newer. A compatible calculator API must be available at the configured development target.

```sh
npm install
npm run dev
```

Project checks:

```sh
npm test
npm run lint
npm run build
```


