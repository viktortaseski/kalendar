# Kalendar

Online booking platform for small businesses.

## Project layout

```
kalendar/
├── kalendar-web/   # Angular 21 frontend (runs on :4200)
└── kalendar-api/   # Express + TypeScript backend (runs on :3000)
```

The two projects are independent — each has its own `package.json` and `node_modules`. They communicate over HTTP.

## Running locally

You need **two terminals**, one for each service.

### Terminal 1 — backend

```bash
cd kalendar-api
npm install        # first time only
npm run dev        # starts on http://localhost:3000
```

Available endpoints:
- `GET  /api/health` — health check
- `GET  /api/plans` — list pricing plans
- `POST /api/bookings` — create a booking (body: `{ "name": "...", "slot": "..." }`)

### Terminal 2 — frontend

```bash
cd kalendar-web
npm install        # first time only (already done)
npm start          # starts on http://localhost:4200
```

## How the pieces fit

- The Angular app (browser) calls the API using `HttpClient`.
- The API has CORS configured to accept requests from `http://localhost:4200`.
- The API is currently in-memory; a database will be added next.
