---
name: api-endpoint
description: Use when adding or changing an API endpoint or its payload/error shape. Keeps interface, HTTP impl, parser, mock handler, tests and README contract in sync.
---
1. Update the `BookingsApi` interface (`src/api/bookingsApi.ts`).
2. Implement in `createHttpBookingsApi`; forward AbortSignal; parse response in `parse.ts`.
3. Add/adjust MSW handler in `src/mocks/handlers.ts` with real validation + documented errors.
4. Map any new status/code in `src/api/http.ts` → typed error.
5. Tests: api mapping test + one UI test exercising the new path.
6. Update README "API contract".