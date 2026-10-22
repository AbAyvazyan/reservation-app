# Meeting Room Booking — Agent Guide

React 19 + TypeScript 6 + Vite 8 SPA. Mock backend via MSW 3. Server state via TanStack Query 5. Tests: Vitest + Testing Library.
Full requirements: `task-definition.txt`. Implementation plan and decisions: `PLAN.md`.

## Commands
- `npm run dev` — dev server (MSW enabled by default)
- `npm test` — Vitest once · `npm run test:watch`
- `npm run typecheck` · `npm run lint` · `npm run build`
- Definition of done for any change: `npm run lint && npm run typecheck && npm test` green.

## Architecture (dependency direction is enforced — do not invert)
features → api → domain
mocks → domain
- `src/domain` — pure business rules. No React, no fetch, no Date.now().
- `src/api` — network layer behind the `BookingsApi` interface. No React except `ApiProvider.tsx`.
- `src/mocks` — MSW handlers + in-memory DB. Never imported by `features`.
- `src/features/bookings` — UI + TanStack Query hooks. Never calls `fetch` directly and never imports `src/mocks` (dev tooling is injected through `BookingPage`'s `renderDemoControls` slot from `App.tsx`).
- `src/shared` — app-agnostic UI building blocks (`components/`, `styles/`) and `useNow`. Imports nothing from `features`, `api` or `mocks`.
- `src/config.ts` reads env (`VITE_USE_MOCKS`, `VITE_API_BASE_URL`); `src/queryClient.ts` holds query defaults (no retry on 4xx).

## Non-negotiable business rules
Working day 09:00–18:00 · start < end · 30 min ≤ duration ≤ 120 min · 15-min grid ·
no overlap, touching boundaries allowed (half-open intervals) · no past time · past dates read-only ·
editing excludes the booking itself · server is the source of truth and may return 409.
Every rule lives in `src/domain/validation.ts` and is reused by the mock server. Never duplicate a rule in UI code.

## Conventions
- TS: `erasableSyntaxOnly` → no enums/namespaces/parameter properties; use `as const` objects and union types. `import type` for types.
- Branded types `ISODate`, `TimeHHmm` at boundaries; minutes (number) internally.
- Dates: local date only — never `toISOString()` for a calendar date.
- Pass `now` explicitly into domain functions; UI gets it from `useNow()`.
- Query keys only via `bookingKeys`. Mutations invalidate by key; only delete is optimistic.
- Form state lives in `formReducer`, never derived from query data (409 must not wipe user input).
- Accessibility: every input has a `<label>`, errors use `aria-describedby` + `aria-invalid`, dialogs use native `<dialog>`.
- No new dependencies without stating why in the PR/commit message.
- Comments only for non-obvious "why".
- File names must differ by more than letter case (macOS/Windows are case-insensitive: `controls.ts` vs `DemoControls.tsx`, not `demoControls.ts` vs `DemoControls.tsx`).
- One export kind per `.tsx` file (react-refresh): components in `Foo.tsx`, hooks/contexts in `.ts` files.
- MSW 3: use `onUnhandledFrame` (not v2's `onUnhandledRequest`); `http`, `HttpResponse`, `delay`, `setupWorker`, `setupServer` are unchanged.

## Testing
- Domain: table-driven tests for every rule, including edges (09:00, 18:00, 30/120 min, touching).
- UI: test behaviour through the accessible tree (`getByRole`, `getByLabelText`), not class names.
- Use MSW node server for API/UI tests (`src/test/setup.ts` wires it, empties the mock DB before each test and stubs `<dialog>`); `vi.setSystemTime` for time.
- Render with `renderWithProviders` / `renderHookWithProviders` (`src/test/renderWithProviders.tsx`); use `testApi` with `baseUrl: 'http://localhost'` (Node fetch needs absolute URLs).
- The 409 test in `BookingPage.test.tsx` is the contract for the key requirement. If you change form or mutation code, mutation-check it: break the behaviour and confirm the test fails.

## Don't
- Don't edit `public/mockServiceWorker.js` (generated) or `package-lock.json` by hand.
- Don't silence lint/TS errors with `any`, `@ts-ignore`, or `eslint-disable` — fix the cause.
- Don't commit or push unless asked.
