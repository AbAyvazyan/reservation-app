# Meeting Room Booking

A single-room booking interface for a 09:00–18:00 working day: pick a date, see that day's bookings, and create, edit or delete a booking. Business rules are validated on the client and again by a strict mock server, which can answer `409 Conflict` even when the UI believed a slot was free. The UI handles that case without losing what the user typed.

- **Demo:** https://reservation-app-red.vercel.app/
- **Repo:** https://github.com/AbAyvazyan/reservation-app
- **How I worked with the AI:** [`AI-INTERACTION.md`](./AI-INTERACTION.md)

## Run it

```bash
npm install
npm run dev        # http://localhost:5173, mock API enabled by default
npm test           # 203 tests (Vitest + Testing Library + MSW)
npm run lint && npm run typecheck && npm run build
```

Node 24 was used. Environment (see `.env.example`):

| Variable | Default | Meaning |
|---|---|---|
| `VITE_USE_MOCKS` | `true` | Serve `/api/*` from the in-browser MSW mock. Set to `false` to talk to a real backend. |
| `VITE_API_BASE_URL` | empty | Prefix for API requests (same origin when empty). |

## What you can do

- Choose a date (picker, previous/next day, "Today"). The date is kept in the URL (`?date=YYYY-MM-DD`), so reloads and links keep it.
- See the day's bookings together with the free gaps between them; a gap has a one-click **Book** shortcut.
- Create, edit and delete bookings. Start/end are 15-minute selects; unavailable options are disabled and marked.
- Past days are read-only. Today's past slots are unavailable and expire on their own as the clock moves.

### Demo controls (bottom of the page, mock backend only)

| Control | What it shows |
|---|---|
| Simulate another user's booking | Inserts a booking behind the UI's back. Then try to book that exact time to see the 409 flow. |
| Fail next load | The next GET returns 500 (e.g. change the date): error state with Retry. |
| Fail next save | The next create/update/delete returns 500: the form keeps its values; a failed delete rolls back. Scoped so background loading of neighbouring days cannot swallow it. |
| Slow network (+2 s) | Loading and submitting states. |

## Business rules

| Rule | Where it lives |
|---|---|
| Within 09:00–18:00, start < end, 30 min ≤ duration ≤ 2 h, 15-minute grid | `src/domain/validation.ts` |
| No overlap; touching boundaries are allowed (`10:00–11:00` and `11:00–12:00`) — half-open intervals | `src/domain/intervals.ts` |
| No past time/date; today's start must not be before the current minute | `src/domain/validation.ts` |
| Editing never conflicts with itself | `validateBooking({ editing })` |
| A meeting in progress: start and date locked, end and title editable, delete allowed. Past bookings are read-only. | `src/domain/bookingStatus.ts` |

One validator serves both sides: the UI uses it to disable options and show inline errors, and the mock server uses the same function to reject requests. The two cannot drift apart, and the server stays the source of truth.

## Architecture

```
features → api → domain          mocks → domain
```

| Folder | Responsibility |
|---|---|
| `src/domain` | Pure business rules. No React, no `fetch`, `now` is always injected. |
| `src/api` | `BookingsApi` interface, an HTTP implementation, typed errors, runtime response parsing. |
| `src/mocks` | MSW handlers, in-memory DB, demo controls. Behaves like a strict backend. |
| `src/features/bookings` | Page, timeline, form, query hooks, form reducer. Never calls `fetch` or imports mocks. |
| `src/shared` | Design tokens, small accessible components, `useNow`. |

**Replacing the mock with a real API.** The UI depends only on the `BookingsApi` interface, injected through `App`'s `api` prop and React context. Either set `VITE_USE_MOCKS=false` and `VITE_API_BASE_URL`, or implement `BookingsApi` yourself.

### API contract

```
GET    /api/bookings?date=YYYY-MM-DD   -> Booking[]
POST   /api/bookings                   -> 201 Booking
PATCH  /api/bookings/:id               -> Booking
DELETE /api/bookings/:id               -> 204
```

Errors share one shape, `{ code, message, details? }`:

| Status | Code | `details` |
|---|---|---|
| 400 / 422 | `VALIDATION_ERROR` | list of `{ code, field, message }` issues |
| 409 | `CONFLICT` | `{ conflicts: Booking[] }` |
| 404 | `NOT_FOUND` | — |
| 5xx | `INTERNAL` | — |

## Handling the 409 (and other failures)

When a create or update is rejected with 409, the form shows an alert (announced and focused) that names the conflicting booking, the day's list is refetched, and **every value the user entered is kept**. Form state lives in a reducer and is never derived from query data, so a refetch cannot overwrite it. With the fresh list, the overlap is also flagged inline.

Other failures follow the same principle: validation errors map onto fields, network and server errors keep the form and offer a retry, and a booking deleted by someone else offers "Create as new booking" with the same values.

## Decisions and trade-offs

- **MSW instead of a fake `fetch`.** The UI makes real HTTP calls to `/api/...`, so removing the mock needs no UI change, and 409s are visible in the network tab. The cost is a service-worker file that must be deployed.
- **Create/update are not optimistic; delete is.** The server can still say 409, and showing a booking that then vanishes is worse than a short pending state. Delete is unambiguous and trivially rolled back.
- **TanStack Query** for caching, request cancellation (the `AbortSignal` is forwarded, so quick date changes don't show stale data), background refresh on focus, and warming neighbouring days.
- **Plain CSS with tokens.** No UI library; native `<select>`, `<dialog>` and `<button>` carry the accessibility.
- **15-minute grid.** Makes the 30-minute minimum and 2-hour maximum meaningful. The server rejects off-grid times.
- **Branded `ISODate` / `TimeHHmm` types** at boundaries, minutes internally, and a local-date helper instead of `toISOString()` (which shifts the day across time zones).

## Questions I would ask (and what I assumed)

| Question | Assumption |
|---|---|
| Time granularity? | 15 minutes. |
| Can a meeting in progress be edited? | End and title yes; start and date locked; deletable (end early / cancel). |
| Can past bookings be deleted? | No, they are read-only. |
| Whose time zone? | Browser-local time stands in for the room's. A real system would take the room's zone from the server. |
| Is the title required? | Optional, at most 60 characters. |
| Multiple rooms? | One room. |
| Can an edit move to another date? | No, an edit stays on its day; to move it, create a new booking. |
| Persistence? | The mock DB is in memory and resets on reload. |

## Testing

Domain rules are covered with table-driven tests that probe both sides of every boundary (08:45 / 09:00 / 18:00 / 18:15, durations 15/30/120/135, touching vs overlapping, past slots at 10:07, in-progress rules, midnight rollover). API tests run the real HTTP client against the mock handlers and check each error mapping, malformed payloads, and abort handling. UI tests drive the page through the accessible tree and include the full 409 flow. I checked that the 409 test can fail: making a failed submit wipe the form breaks four tests.

## Accessibility

Every control has a label; errors are tied to fields with `aria-invalid` / `aria-describedby`; alerts use `role="alert"` for errors and `role="status"` otherwise, with an icon and text so state is never colour-only; the delete confirmation is a native modal `<dialog>`; focus moves to the alert after a failed submit and back to a sensible place after success or delete; reduced-motion is respected; layout is a single column below 48rem with 44px touch targets. Not yet audited with a screen reader or automated tooling.

## How I worked with AI

- Full prompt-by-prompt account: [`AI-INTERACTION.md`](./AI-INTERACTION.md).
- **Plan first.** `PLAN.md` was written and reviewed before any code; `AI-Suggestions.md` records the tooling ideas.
- **Agent instructions.** `AGENTS.md` (root and per folder) is the single source of truth; `CLAUDE.md` files just import it. Hooks block edits to generated files, lint on edit, and refuse to finish while typecheck or tests fail. Skills, commands and review subagents live in `.claude/`.
- **Delegation.** Mechanical, well-specified work (tooling files, base components) went to a smaller model with a strict file boundary, and I reviewed the results; the business rules, API layer and conflict handling were written and tested directly.
- **Where the AI was wrong, and how it was caught.**
  - The plan used MSW 2's `onUnhandledRequest`; reading MSW 3's type definitions showed it is now `onUnhandledFrame`.
  - Two files, `demoControls.ts` and `DemoControls.tsx`, differed only by case and broke the TypeScript build on macOS; renamed.
  - A first test run passed everything, so I deliberately broke the form-reset behaviour to prove the conflict test actually fails.
  - An independent review pass (a second model) found real defects after all tests were green: the start of a meeting in progress was shown as "(unavailable)", and a slow save could deliver its 409 to a different form. Both are fixed with regression tests that fail without the fix.
  - Review of the plan found that "now" would never advance (fixed with `useNow`) and that a meeting in progress had no defined rules.

## Done / not done

**Done:** everything in the task, plus request cancellation, URL-synced date, free-gap shortcuts, in-progress rules, demo controls, CI.

**Not done / with more time:**
- Not verified by clicking through in a real browser or on a real phone; no end-to-end (Playwright) tests.
- No screen-reader or automated accessibility audit.
- **Snyk security scans were not run** (the CLI was not authenticated).
- Time zones are browser-local; multiple rooms, recurring bookings, i18n and live updates (SSE/websocket) are out of scope.
- Editing a booking cannot change its date.
- Known edge cases left alone: at midnight, a page showing "today" rolls to the new day and closes an open edit form; if an upcoming booking starts while it is being edited, its start becomes locked.
- The dialog's behaviour on a repeated Esc is handled in code but was only checked in jsdom, not in each browser.

## Time spent

About **1 hour** of hands-on time, starting at 18:00 — well under the 4–6 hour guideline. That is only possible because the work was planned up front and implemented and reviewed with AI agents; the interaction log (`AI-INTERACTION.md`) shows exactly how.