# Domain layer
Pure TypeScript. Allowed imports: other files in `src/domain` only.
- Every exported function is deterministic: time comes in as an argument (`now: Date`).
- Every new rule → new `ValidationIssue` code + table-driven test in `*.test.ts` covering both sides of each boundary.
- Intervals are half-open `[start, end)`: `overlaps = a.start < b.end && b.start < a.end`.
- This code also runs inside the mock server — no browser APIs.
- Exports used by UI and server alike: `validateBooking`, `startOptions`/`endOptions`, `freeGaps`, `getStatus`, `describeBooking`. Add new rules in `validation.ts` only.
- Validation issue codes are listed in `ISSUE_CODES` (types.ts); the API client validates incoming codes against it, so keep it in sync.
