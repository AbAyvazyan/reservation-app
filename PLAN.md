# HANDOFF PLAN — Meeting Room Booking Interface

> Self-contained brief. A fresh model with no prior context should be able to implement the whole project from this file alone. Work through §12 "Implementation Steps" in order, commit after each step, and tick it off.
> Goal beyond "working app": demonstrate **Senior React Engineer** judgement — clear boundaries, explicit state modelling, correct async/edge-case handling, tests on what matters, and documented tradeoffs.

---

## 1. Original task (summary of `task-definition.txt`)

Implement an interface for booking a meeting room during the working day **09:00–18:00**.

User must be able to: select a date; view existing bookings for that date; select start and end time; create, edit, delete a booking. Display format is free (list / timeline / slot grid / day calendar).

### Business rules
- Start and end within the working day; `start < end`.
- Min duration 30 min; max duration 2 h.
- Bookings cannot overlap. Touching boundaries is NOT a conflict (10:00–11:00 and 11:00–12:00 allowed).
- Past time cannot be booked. Today: past slots unavailable. Past dates: creating is unavailable.
- When editing, the booking must not conflict with itself.
- The server may return a conflict (409) even if the UI considered the slot free — expected, not a bug. UI must: show a clear message, refresh the bookings list, and NOT lose the user's entered data.

### What is graded (engineering accuracy, not art)
Business logic/validation care; UI states (loading, empty, error, submitting); server-error/conflict handling; API layer separated from UI; readable TypeScript & clear structure; responsiveness & basic accessibility.

### Stack constraints
React/Next/Vue, **TypeScript mandatory**. No real backend/auth/DB; use a mock API. Network layer must be separated from UI and easily replaceable with a real API.

### API contract
```
GET    /api/bookings?date=YYYY-MM-DD
POST   /api/bookings
PATCH  /api/bookings/:id
DELETE /api/bookings/:id

type Booking = { id: string; date: string /* YYYY-MM-DD */; start: string /* HH:mm */; end: string /* HH:mm */; title?: string }
```
Server validates the rules and can return 409.

### Deliverables
Repo link; README (how to run, what was done, what was NOT done, time spent; if unfinished, what remains + priorities); deployed demo (Vercel/Netlify); chat transcript with the AI (user exports it). Guideline 4–6 hours. "If something seems ambiguous — ask questions" → we document ambiguities + chosen assumptions explicitly (§10).

---

## 2. Current repo state (verified 2026-10-22)
Path: `/Users/albert_ayvazyan/Desktop/reservation-app` (NOT a git repo yet). Node 24.13.1, npm 11.15.0.
Vite scaffold: React 19.3, TS 6.0 (`erasableSyntaxOnly`, `verbatimModuleSyntax`, `noUnusedLocals/Parameters` → no TS enums/namespaces/parameter properties, use `import type`), Vite 8.3, ESLint 10 flat config (`eslint.config.js`: js + typescript-eslint recommended + react-hooks + react-refresh).
Files: `index.html` (title "reservation-app" → change), `src/{main.tsx,App.tsx,App.css,index.css}`, `src/assets/*`, `public/{favicon.svg,icons.svg}`, template README. Also `.idea/` (already gitignored) and `.codemie/` (NOT gitignored → add).
Scripts: `dev`, `build` (`tsc -b && vite build`), `lint`, `preview`.

## 3. Decisions made with the user
| Topic | Decision |
|---|---|
| Mock API | **MSW** (service worker; also enabled in the production build so the static deploy works). UI uses plain `fetch` to `/api/bookings`. |
| Data/caching | Data from the mock API; client cache via **TanStack Query** (no localStorage). MSW store in-memory, seeded relative to today. |
| Demo controls | Server always validates and returns 409. A visible "Demo controls" panel (mocks only): **Simulate other user booking**, **Simulate server error** (next request → 500), **Slow network** (adds ~2 s latency). Lets reviewers see every UI state without DevTools. |
| Styling | Plain CSS (CSS modules + global tokens), no UI library. |
| Tests | **Vitest** + jsdom + Testing Library + user-event. Explicit imports (`import { describe, it, expect } from 'vitest'`), no `globals: true`. |

## 4. Dependencies (versions verified compatible)
- runtime: `@tanstack/react-query@^5` (peer react ^18||^19 ✓)
- dev: `msw@^3` (peer vite >=6, typescript >=5.9 ✓), `vitest@^5` (peer vite ^6||^7||^8 ✓), `jsdom`, `@testing-library/react@^16`, `@testing-library/dom`, `@testing-library/user-event`, `@testing-library/jest-dom`
- ⚠️ **msw 3.x is a new major.** Before writing handlers, read its migration guide / docs (WebFetch `https://mswjs.io/docs`) — do not assume the v2 API (`http`, `HttpResponse`, `delay`, `setupWorker`, `setupServer` are unchanged in v3; verified, but `onUnhandledRequest` was renamed to **`onUnhandledFrame`**).
- `npx msw init public/ --save` → commit `public/mockServiceWorker.js`.
- `vite.config.ts`: `defineConfig` from `vitest/config`; `test: { environment: 'jsdom', setupFiles: ['./src/test/setup.ts'] }`. Scripts: `"test": "vitest run"`, `"test:watch": "vitest"`, `"typecheck": "tsc -b"`.
- Env: `VITE_USE_MOCKS` (default `true`), `VITE_API_BASE_URL` (default `''`). Real API swap = `VITE_USE_MOCKS=false` + base URL. Provide `.env.example`.
- Optional: `zod` for response parsing — prefer a small hand-written parser to keep deps minimal (decide in step 3; either is fine, justify in README).

## 5. Architecture (`src/`)
```
domain/                      # pure, framework-free, 100% unit-tested
  types.ts                   # branded types: ISODate ("YYYY-MM-DD"), TimeHHmm ("HH:mm"), Minutes (number);
                             # Booking, BookingDraft {date,start,end,title?}; ValidationIssue {code, field: 'start'|'end'|'date'|'title'|'form', message}
  rules.ts                   # DAY_START=9*60, DAY_END=18*60, MIN_DURATION=30, MAX_DURATION=120, SLOT_STEP=15, TITLE_MAX=60
  time.ts                    # toMinutes, toHHmm, toISODate(Date) (LOCAL, never toISOString), addDays, isBefore; all pure, take `now` as arg
  validation.ts              # validateBooking(draft, ctx: { existing: Booking[]; editing?: Booking; now: Date }) -> ValidationIssue[]
  availability.ts            # overlaps (half-open), findConflicts, startOptions/endOptions(ctx) -> {value, disabled, reason}[]
  bookingStatus.ts           # getStatus(booking, now): 'past' | 'in-progress' | 'upcoming' → drives editability
api/                         # network layer — no React imports
  errors.ts                  # ApiError base + ConflictError {conflicts: Booking[]}, ValidationApiError {issues}, NotFoundError, NetworkError, ServerError
  http.ts                    # fetch wrapper: base URL, JSON, AbortSignal passthrough, maps status → typed errors, parses error body
  parse.ts                   # runtime validation of response payloads (don't trust the network)
  bookingsApi.ts             # interface BookingsApi { list(date, signal?), create(draft), update(id, patch), remove(id) } + createHttpBookingsApi(baseUrl)
  ApiProvider.tsx            # React context injecting a BookingsApi (real impl in app, fake/in-memory in tests)
mocks/                       # MSW; dynamically imported in main.tsx only when VITE_USE_MOCKS
  db.ts                      # in-memory store + seed relative to today (incl. one in-progress booking if within hours)
  handlers.ts                # GET/POST/PATCH/DELETE; reuse domain/validation on the server side; latency 300–600 ms
  controls.ts                # demoControls: simulateOtherUserBooking(date), failNextRequest(), setSlowNetwork(bool)  (not `demoControls.ts`: collides with DemoControls.tsx on case-insensitive file systems)
  DemoControls.tsx           # reviewer-facing panel; injected into BookingPage via renderDemoControls
  browser.ts / node.ts       # worker (respect import.meta.env.BASE_URL for SW url) / server for tests
features/bookings/
  queryKeys.ts               # bookingKeys = { all: ['bookings'], byDate: (d) => ['bookings', d] } as const
  hooks.ts                   # useBookings(date) (signal forwarded, prefetch date±1, refetchOnWindowFocus on),
                             # useCreateBooking/useUpdateBooking (NOT optimistic; invalidate on settle),
                             # useDeleteBooking (optimistic with rollback on error)
  useSelectedDate.ts         # date synced with URL `?date=` (history.replaceState / popstate); invalid/missing → today
  formReducer.ts             # form state machine; mode: {kind:'create'} | {kind:'edit', booking}; status: idle|submitting|error
  BookingPage.tsx            # layout: DatePicker + DayTimeline + BookingForm panel (2 cols ≥768px, stacked below)
  DatePicker.tsx             # <input type="date"> + prev/next + Today; past dates viewable (read-only banner)
  DayTimeline.tsx            # 09:00–18:00 list with booking cards + free gaps ("Book 11:00–12:00" quick action); skeleton / empty / error+Retry
  BookingCard.tsx            # time range, title, status badge (text, not colour-only), Edit/Delete per status
  BookingForm.tsx            # start/end <select> (15-min steps, disabled options with reason), title; inline errors (aria-describedby); form alert
  ConfirmDeleteDialog.tsx    # native <dialog>.showModal() (built-in focus trap & Esc), focus returns to trigger
shared/
  useNow.ts                  # ticks every minute (aligned to minute boundary) → recompute availability, handles midnight rollover
  components/                # Button (loading state), Alert, Skeleton, ErrorBoundary (app-level fallback)
  styles/                    # tokens.css (colors, spacing, focus ring), global.css
test/
  setup.ts                   # jest-dom matchers, MSW node server lifecycle, reset db between tests
  renderWithProviders.tsx    # QueryClient (retry:false) + ApiProvider
main.tsx                     # if mocks: await import('./mocks/browser') → worker.start({ onUnhandledFrame: 'bypass' }); then render
App.tsx                      # ErrorBoundary > QueryClientProvider > ApiProvider > BookingPage
```
Dependency direction: `features → api → domain`, `mocks → domain`. `domain` imports nothing. UI never calls `fetch` directly.

## 6. API error contract (mock server + client agree)
- Error body: `{ code: string; message: string; details?: unknown }`
- 400/422 `VALIDATION_ERROR` → `details: ValidationIssue[]`
- 409 `CONFLICT` → `details: { conflicts: Booking[] }` → UI message "Conflicts with 10:00–11:00 'Standup'"
- 404 `NOT_FOUND` (update/delete of a booking removed by someone else)
- 500 `INTERNAL` / network failure → generic retryable message
Document this in README as the expected real-API contract.

## 7. Business logic details
- Internally minutes-from-midnight; "HH:mm" only at the API boundary. Branded types prevent mixing date/time strings.
- Dates compared lexicographically as `YYYY-MM-DD`; derived from local clock. All domain functions receive `now` explicitly (deterministic tests, no `Date.now()` inside domain).
- `validateBooking` issue codes: `OUT_OF_HOURS`, `START_NOT_BEFORE_END`, `TOO_SHORT`, `TOO_LONG`, `NOT_ON_GRID`, `OVERLAP`, `PAST_DATE`, `PAST_TIME`, `TITLE_TOO_LONG`. Edit passes `editing` so the booking is excluded from overlap checks (never conflicts with itself).
- Booking status → editability:
  - **upcoming**: full edit + delete.
  - **in-progress** (start ≤ now < end, today): start is locked; end and title editable (new end must be > now and satisfy duration rules); delete allowed ("end early / cancel").
  - **past** (end ≤ now, or past date): read-only, no edit/delete. Server enforces the same.
- Today: start options < now (rounded up to next 15-min slot) are disabled; recomputed by `useNow` every minute. If the user's selected start becomes past while the form is open, show the field error rather than silently changing it.
- UI precomputes availability (disabled options with a reason, disabled submit with explanation) but the **server is the source of truth**.

## 8. Async & conflict handling (key requirement)
- **409 on create/update**: (1) `role="alert"` message naming the conflicting booking; (2) invalidate `bookingKeys.byDate(date)` → refetch; (3) form stays open with ALL values intact — form state lives in `formReducer`, never derived from query data, and the form component is not keyed by data that changes on refetch; (4) validation re-runs against fresh data so the conflict is flagged inline; (5) focus moves to the alert.
- **404 on update/delete**: "This booking was removed by someone else" → refetch; on edit, offer "Create as new booking" keeping the values.
- **400/422**: map `details` to field errors.
- **Network/5xx**: retryable message, data retained; queries use default retry (3, backoff), mutations no retry.
- **Optimistic delete**: snapshot cache in `onMutate`, remove item, rollback in `onError`, invalidate in `onSettled`. Create/update are deliberately not optimistic because the server can reject them with 409 — explain in README.
- **Race conditions**: AbortSignal forwarded so switching dates quickly cancels stale requests; submit button disabled while pending (no double submit); a mutation keeps the date it was created for (no writing into the wrong day's cache if the user switches date mid-request).
- Multi-tab: `refetchOnWindowFocus` picks up changes from other tabs/users.

## 9. UI states & accessibility
- States: loading (skeleton + `aria-busy`), background refetch (subtle indicator, list stays visible), empty ("No bookings for this day" + CTA unless past date), error + Retry, submitting (button spinner + label), success (`aria-live="polite"` status), read-only past date banner.
- A11y: real `<label>`s, `aria-describedby`/`aria-invalid` for field errors, visible focus ring, native `<dialog>`, focus management after create/delete/errors, status not colour-only, contrast AA, `prefers-reduced-motion`, keyboard-only flow works, `lang` and page `<title>` set.
- Responsive: single column <768px, two columns above; no horizontal scroll at 320px; touch targets ≥ 44px.

## 10. Ambiguities & chosen assumptions (put in README under "Questions I would ask")
| Question | Assumption |
|---|---|
| Time granularity? | 15-minute grid (so min/max rules are meaningful); server rejects off-grid times. |
| In-progress bookings editable? | Start locked; end/title editable; delete allowed. |
| Past bookings deletable? | No — read-only (audit trail). |
| Timezone? | Browser local time = room local time; real system would use the room's timezone from the server. |
| Title required? | Optional, trimmed, ≤60 chars. |
| Multiple rooms? | Single room. |
| Persistence? | Mock DB in memory; resets on reload by design. |
| Booking ending exactly at 18:00 / starting at 09:00? | Allowed. |

## 11. Tests (Vitest) — prioritised
1. **domain** (must have): 08:45/18:15 out of hours and exact 09:00–18:00 edges; durations 15/30/120/135; start = end; touching boundaries allowed; partial and full overlap rejected; self-exclusion on edit; past slot today and rounding at e.g. 10:07; past date; in-progress rules; off-grid times; `toISODate` near midnight (no TZ off-by-one).
2. **api** (must have): status/body → typed error mapping; response parsing rejects malformed payloads; AbortSignal forwarded.
3. **UI** (must have — the conflict test): 409 on submit keeps form values, refreshes list, shows message naming the conflict.
4. **UI** (nice to have): create happy path; edit doesn't conflict with itself; optimistic delete + rollback on error; empty/error/loading states; past date has no create.
Use `vi.setSystemTime` for "now" (avoid full fake timers with MSW/user-event, or use `vi.useFakeTimers({ shouldAdvanceTime: true })`).

## 12. Implementation Steps (commit after each)
- [x] 1. `git init`; update `.gitignore` (`.codemie/`); remove template content (App.tsx demo, App.css, assets, template README); set `<title>`; install deps; configure vitest, scripts, `.env.example`; `msw init`. Commit "chore: project setup". **Start a time log for the README.**
- [x] 1b. AI tooling per `AI-Suggestions.md`: root `AGENTS.md` (source of truth) + `CLAUDE.md` containing `@AGENTS.md`; scoped `AGENTS.md` (+ `CLAUDE.md` import) in `src/domain`, `src/api`, `src/mocks`, `src/features`; `.claude/settings.json` hooks + scripts; chosen skills, commands, subagents. Commit "chore: AI tooling".
- [x] 2. `domain/` with tests first (TDD). Commit.
- [x] 3. `api/` (errors, http, parse, BookingsApi, provider) + `mocks/` (db, handlers, demo controls) + api tests. Read msw 3 docs first. Commit.
- [x] 4. `shared/` (useNow, ErrorBoundary, base components, tokens), query keys, hooks, `useSelectedDate`. Commit.
- [x] 5. UI: page, date picker, timeline, card, form + reducer, delete dialog, styles, responsive. Commit.
- [x] 6. Conflict / 404 / error flows end-to-end + DemoControls + UI tests (conflict test first). Commit.
- [x] 7. GitHub Actions `.github/workflows/ci.yml`: `npm ci`, `lint`, `typecheck`, `test`, `build` on push/PR. Commit.
- [ ] 8. Per the user's global CLAUDE.md: run `snyk_code_scan` on new first-party code; fix findings; rescan until clean. Also `snyk_sca_scan` for deps.
- [x] 9. README (§13). Commit.
- [ ] 10. `npm run lint && npm run typecheck && npm test && npm run build` green; `npm run preview` works with MSW. Deploy (Vercel/Netlify, build `npm run build`, output `dist`), confirm `mockServiceWorker.js` served. Push only when the user asks. User exports the chat transcript.

- [ ] 11. Final code review: run `/code-review` with the Sonnet 5.5 model (and the `react-reviewer` / `a11y-auditor` subagents) over the whole diff once everything is finished. Fix confirmed findings in separate `fix:` commits, then re-run the quality gate.

**Commit policy.** Commit meaningfully: one logical change per commit (never one giant commit), Conventional Commits (`chore:`, `feat:`, `test:`, `fix:`, `docs:`, `ci:`), messages explain the why, tests committed with the code they cover, each commit leaves lint/typecheck/tests green. Review `git status` before staging; stage files by name. Commits end with the attribution trailer required by the session. Never push unless asked.

**Timebox priorities (4–6 h).** Must: domain + tests, API layer + mocks, conflict handling, all UI states, a11y basics, README. Cut first if short on time: nice-to-have UI tests, adjacent-day prefetch, in-progress partial edit (fallback: in-progress = read-only), CI workflow. List anything cut in README "Not done".

## 13. README outline
1. Links: demo, repo. 2. How to run (`npm i`, `npm run dev`, `npm test`, env vars). 3. Feature overview + demo controls guide (how to trigger 409 / 500 / slow network). 4. Architecture: folder map + dependency direction diagram; how to swap to a real API (implement `BookingsApi` or set env). 5. API contract incl. error shapes (§6). 6. Business rules & how they're enforced (client vs server). 7. Key decisions & tradeoffs (MSW vs fake fetch, no optimistic create/update, TanStack Query, plain CSS, 15-min grid, branded types). 8. Questions I would ask / assumptions (§10). 9. Testing strategy. 10. Accessibility notes. 11. Done / Not done / With more time (e.g. real timezone handling, e2e Playwright, i18n, multi-room, SSE/websocket live updates). 12. Time spent (from the log).

## 14. Verification checklist
- `npm run dev`: create/edit/delete; 10–11 then 11–12 accepted; overlap rejected; <30 min and >2 h rejected; out-of-hours impossible; today's past slots disabled and update as the minute ticks; past date read-only; in-progress booking only end/title editable.
- Demo: "Simulate other user booking" in a free-looking slot → submit → 409 message naming conflict, list refreshed, form values preserved.
- Demo: "Simulate server error" → error state + Retry; on delete → booking reappears (rollback) with message.
- Delete a booking in another tab while editing it here → 404 handled.
- Switch dates rapidly → no stale data flashes; reload keeps `?date=`.
- Keyboard-only flow; 320–375 px width; screen-reader announcements for status/alerts.
- `npm run build && npm run preview` with MSW in production build; lint, typecheck, tests, CI green.
