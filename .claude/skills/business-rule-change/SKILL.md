---
name: business-rule-change
description: Use when adding or changing any booking business rule (hours, duration, overlap, past-time, editability, grid). Ensures the rule is changed in one place and propagated to server, UI, tests and docs.
---
1. Write/adjust failing table-driven tests in `src/domain/validation.test.ts` first (both sides of each boundary).
2. Change constants in `src/domain/rules.ts` or logic in `validation.ts` / `availability.ts`. Add a new `ValidationIssue` code if needed.
3. Confirm `src/mocks/handlers.ts` uses the shared validator (no duplicated logic).
4. Check UI option generation (`availability.ts` consumers) disables newly invalid options with a reason.
5. Update README "Business rules" table and PLAN.md §7 if behaviour changed.
6. Run `npm test && npm run typecheck`.