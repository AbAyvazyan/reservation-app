# Feature UI
- Data via hooks in `hooks.ts` only; components never import from `src/api/http.ts` or `src/mocks`.
- Every async view handles: loading, empty, error (with retry), submitting, success announcement.
- On ConflictError: show alert naming the conflict, invalidate the day, keep form values, focus the alert.
- Prefer native elements (`<select>`, `<dialog>`, `<button>`) over ARIA re-implementations.
- Before finishing a component, run the `ui-state-audit` skill.
