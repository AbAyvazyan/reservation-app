# Mock server (MSW 3)
- Behaves like a real, strict backend: re-validates with `src/domain/validation.ts`, returns the documented error contract.
- Seed data is relative to "today" so the demo always has content.
- Demo controls (`demoControls.ts`) are the only way UI may touch the mock DB, and only from `DemoControls.tsx`.
- Check MSW 3 docs before using an API you remember from v2.
