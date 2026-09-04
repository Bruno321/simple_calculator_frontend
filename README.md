# Calculator frontend

A responsive React + TypeScript calculator for the API in `../backend`. It provides one calculator display and an on-screen keypad for addition, multiplication, division, exponentiation, square root, and percentage.

## Calculator interaction

Enter numbers with the keyboard or number keys. Choose an operation using its keypad key, then enter the next value. The display identifies the active operation and value.

- Addition, multiplication, and division accept two or more operands. Press the selected operation again to continue the chain, such as `1 + 2 + 3`. Only one operator is allowed in a chain, and division stays in the backend's left-to-right order.
- Power collects exactly a base and exponent.
- Square root collects one radicand.
- Percentage collects a value followed by a percentage and displays the relationship as `percentage% of value`.

Repeatable operation keys stay enabled so another operand can be added. Power and percentage become disabled after moving to their second value, and square root becomes disabled as soon as it is selected because it needs no additional operand. AC and backspace remain available whenever they can affect the current input.

The keypad also provides decimal input, backspace, all-clear, and calculate. Keyboard shortcuts are `+`, `*`/`x`, `/`, `^`, `%`, and `r` for square root; Enter calculates and Escape clears. Other operation keys are disabled as soon as an operation is selected, so a chain cannot mix operators. Unsupported keyboard characters are ignored instead of being added to the display.

Calculation is disabled for missing, incomplete, or invalid numeric input. Number, operation, display, and calculate controls are disabled while a request is pending, preventing edits and duplicate requests. AC and backspace remain available whenever they can clear or delete something; using either invalidates the pending interaction so a late response cannot overwrite the display. Mathematical/domain validation—such as division by zero, negative square roots, and non-representable results—remains in the backend, and its error message is shown in the calculator display.

## Structure

```text
src/App.tsx                         calculator state and interaction
src/calculator/calculatorInput.ts   constrained input/display helpers
src/api/calculatorApi.ts            backend endpoint and payload mapping
src/*.test.tsx, src/api/*.test.ts   interaction and API contract tests
nginx/default.conf.template         production API reverse proxy
```

The frontend does not evaluate expressions or reproduce backend calculations. It only collects valid numeric tokens and maps them to the backend's established request models.

## Local development

Requirements: Node.js 22 or newer and the backend running on `http://localhost:8080`.

```sh
npm install
npm run dev
```

Open the URL printed by Vite, normally `http://localhost:5173`. Browser requests use `/api`; Vite proxies them to `http://localhost:8080`, avoiding cross-origin requests.

To change the development backend, add `.env.local`:

```dotenv
VITE_DEV_API_TARGET=http://localhost:9000
```

Project checks:

```sh
npm test
npm run lint
npm run build
```

The production output is written to `dist/`.

## API configuration

`VITE_API_BASE_URL` controls the browser-facing API prefix at build time and defaults to `/api`. The default is recommended because both Vite and the production Nginx image proxy that same-origin path. An absolute cross-origin value requires the target server to allow the frontend origin; the existing Go backend has no CORS middleware.

The container's `/api` proxy reads `BACKEND_API_URL` at runtime and defaults to `http://host.docker.internal:8080`.

## Docker

The multi-stage Dockerfile builds with the official Node image and serves only the generated static files from Nginx on port 80. Node and npm are not included in the runtime image.

```sh
docker build -t calculator-frontend .
docker run --rm -p 3000:80 calculator-frontend
```

Open `http://localhost:3000`. To use another backend:

```sh
docker run --rm -p 3000:80 -e BACKEND_API_URL=http://backend:8080 calculator-frontend
```

On Linux, reaching a backend on the host may also require `--add-host=host.docker.internal:host-gateway`. Containers on the same Docker network can use the backend container name in `BACKEND_API_URL`.
