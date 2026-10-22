# Shared UI
- App-agnostic building blocks only: `components/` (Button, Alert, Skeleton, ErrorBoundary), `styles/` (tokens.css, global.css), `useNow`.
- Never import from `features`, `api` or `mocks`.
- Style with the CSS custom properties in `tokens.css`; never hard-code colours. Keep AA contrast in light and dark.
- Accessibility is part of the component contract: `Alert` is `role="alert"` only for errors, `Button` with `loading` is disabled + `aria-busy`, `Skeleton` is decorative (the consumer owns the live text).
- Every new component gets a Testing Library test (cleanup is global in `src/test/setup.ts`).
