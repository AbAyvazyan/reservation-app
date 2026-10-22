# 0001 — Use MSW for the mock API

## Context
The app needs a backend before the real API exists. Mocking inside feature code or swapping modules would couple the UI to the mock and make the switch to a real backend a rewrite.

## Decision
We use MSW so the UI calls plain `fetch` against `/api/bookings`. MSW intercepts those requests in the browser and in Node tests. The network layer is replaceable by a real API by turning off `VITE_USE_MOCKS`; no feature code changes.

## Consequences
- The deployed app must ship the service worker file `public/mockServiceWorker.js`, or mocked requests will not be intercepted.
- That file is generated (`msw init`), so it is never edited by hand.
- Tests use the MSW node server, so UI and API tests exercise the same handlers.