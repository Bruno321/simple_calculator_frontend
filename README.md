# Calculator frontend

A responsive React + TypeScript interface for the calculator API in `../backend`. It supports addition, multiplication, division, exponentiation, square root, and percentage.

## How it works

The UI follows the backend's operation-specific contracts instead of parsing arbitrary expressions:

- Addition, multiplication, and division start with two operands and allow more to be added. Every operand uses the selected operation, and division is evaluated left to right by the backend.
- Exponentiation accepts exactly a base and exponent.
- Square root accepts exactly one radicand.
- Percentage accepts exactly a value and percentage.

Incomplete or non-numeric inputs disable calculation. While a request is running, all inputs and operation controls are disabled to prevent edits and duplicate requests. Backend domain errors—such as division by zero or a negative square root—are shown as returned; mathematical validation is not duplicated in the UI.

API request construction and response handling live in `src/api/calculatorApi.ts`; `src/App.tsx` owns the calculator interaction; and the CSS files provide the responsive presentation. Tests cover the main interaction and API mapping paths.

## Local development

Requirements: Node.js 22 or newer and the backend running on `http://localhost:8080`.

```sh
npm install
npm run dev
```

Open the URL printed by Vite (normally `http://localhost:5173`). The browser calls `/api`, and Vite proxies that path to `http://localhost:8080`, avoiding a cross-origin request.

To use another backend during development, create `.env.local`:

```dotenv
VITE_DEV_API_TARGET=http://localhost:9000
```

Useful commands:

```sh
npm test
npm run lint
npm run build
npm run preview
```

`npm run build` writes the production application to `dist/`.

## API configuration

`VITE_API_BASE_URL` controls the URL used by the browser and defaults to `/api`. Keeping the default is recommended: the Vite development server and production Nginx container proxy that same-origin path to the backend.

For a custom deployment gateway, set `VITE_API_BASE_URL` at build time. If it is an absolute cross-origin URL, that server must allow the frontend origin because the current Go backend intentionally has no CORS middleware.

The production container reads `BACKEND_API_URL` at runtime for its `/api` reverse proxy. It defaults to `http://host.docker.internal:8080`.

## Docker

The multi-stage image builds the Vite app with Node, then copies only the static output into an Nginx runtime image. Node and npm are not present in the final stage.

With the backend exposed on host port `8080`:

```sh
docker build -t calculator-frontend .
docker run --rm -p 3000:80 calculator-frontend
```

Open `http://localhost:3000`. To target another backend:

```sh
docker run --rm -p 3000:80 -e BACKEND_API_URL=http://backend:8080 calculator-frontend
```

On Linux, reaching a backend on the host may also require `--add-host=host.docker.internal:host-gateway`. When both containers share a Docker network, use the backend container's network name in `BACKEND_API_URL`.
