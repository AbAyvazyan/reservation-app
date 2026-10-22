---
name: ui-state-audit
description: Use before finishing any React component or screen that fetches or mutates data. Audits loading, empty, error, submitting, success, conflict states and accessibility.
---
For the target component, verify and report a checklist (✅/❌ with file:line):
- Loading: skeleton or spinner with `aria-busy`; no layout jump.
- Empty: meaningful message + next action (hidden on read-only dates).
- Error: human message + Retry; user input preserved.
- Submitting: button disabled + label change; no double submit.
- Success: `aria-live="polite"` announcement; focus moved sensibly.
- Conflict (409): alert names conflict, list refetched, form values kept, focus on alert.
- A11y: labels, `aria-invalid`/`aria-describedby`, keyboard path, visible focus, not colour-only.
- Responsive: works at 320px, targets ≥44px.
Fix every ❌, then add/extend a Testing Library test for the riskiest state.