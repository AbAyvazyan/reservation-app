# API layer
- The UI depends only on the `BookingsApi` interface; `createHttpBookingsApi` is one implementation.
- Every response passes through `parse.ts` — never cast `res.json()` to a type.
- Map HTTP status to typed errors in `http.ts` (409 → ConflictError with `conflicts`, 404 → NotFoundError, 400/422 → ValidationApiError, network → NetworkError).
- Always forward `AbortSignal`.
- Error body contract: `{ code, message, details? }` — keep `README.md#api-contract` in sync when it changes.
