# Mock server (MSW 3)
- Behaves like a real, strict backend: re-validates with `src/domain/validation.ts`, returns the documented error contract.
- Seed data is relative to "today" so the demo always has content.
- Demo levers live in `controls.ts` (`demoControls` object); the reviewer-facing panel is `DemoControls.tsx` in this folder and is the only UI allowed to call them. Do not name two files differing only by case.
- The panel is passed into `BookingPage` via `renderDemoControls` from `App.tsx`, only when `config.useMocks`.
- Server rules: invalid input -> 422, taken slot -> 409 with `details.conflicts`, unknown id -> 404, past booking edit/delete -> 422 `NOT_EDITABLE`.
- Use `onUnhandledFrame` (MSW 3), not `onUnhandledRequest`.
- Check MSW 3 docs before using an API you remember from v2.
- Injected failures are scoped (`failNextRequest('read' | 'write' | 'any')`) so background prefetches of neighbouring days cannot consume a failure meant for a save.
