# AI-Native Engineering Setup — Suggestions

How to set up this repo so the **AI workflow itself is part of the deliverable**: reviewers see agent instructions, reusable skills, guard-rail hooks, and a transcript showing an engineer *steering* the AI rather than accepting its output.

Everything below is a proposal with copy-ready content. Nothing is created yet — pick what you want and we'll add it in plan step 1 (or a dedicated "chore: AI tooling" commit).

---

## 0. Proposed layout

```
AGENTS.md                      # single source of truth for any coding agent
CLAUDE.md                      # one line: @AGENTS.md  (Claude Code reads CLAUDE.md, not AGENTS.md)
PLAN.md                        # implementation plan (already exists)
docs/
  decisions/                   # lightweight ADRs written during the work (0001-msw.md, 0002-no-optimistic-create.md …)
.claude/
  settings.json                # hooks + permission allowlist (committed, shared)
  hooks/
    lint-changed-file.mjs      # PostToolUse: eslint --fix on edited TS file, report errors back to the agent
    protect-files.mjs          # PreToolUse: block edits to generated/sensitive files
    verify-on-stop.mjs         # Stop: typecheck + tests must pass before the agent says "done"
  skills/
    business-rule-change/SKILL.md
    ui-state-audit/SKILL.md
    api-endpoint/SKILL.md
  commands/
    verify.md                  # /verify
    step-done.md               # /step-done
    conflict-scenario.md       # /conflict-scenario
  agents/
    react-reviewer.md
    a11y-auditor.md
    domain-test-writer.md
src/domain/AGENTS.md  (+ CLAUDE.md → @AGENTS.md)
src/api/AGENTS.md     (+ CLAUDE.md)
src/mocks/AGENTS.md   (+ CLAUDE.md)
src/features/AGENTS.md(+ CLAUDE.md)
```

### AGENTS.md vs CLAUDE.md
`AGENTS.md` is the cross-tool convention (Codex, Cursor, Copilot, Gemini CLI and others read it). Claude Code loads `CLAUDE.md` and supports `@path` imports, so each folder gets:

```md
@AGENTS.md
```

A symlink (`ln -s AGENTS.md CLAUDE.md`) would also work, but symlinks behave badly on Windows checkouts and in some deploy tooling. The import is explicit and portable.
Subfolder `CLAUDE.md` files are loaded **on demand**, when the agent works with files in that folder. Rules stay close to the code and out of the global context.

---

## 1. Root `AGENTS.md`

````md
# Meeting Room Booking — Agent Guide

React 19 + TypeScript 6 + Vite 8 SPA. Mock backend via MSW 3. Server state via TanStack Query 5. Tests: Vitest + Testing Library.
Full requirements: `task-definition.txt`. Implementation plan and decisions: `PLAN.md`.

## Commands
- `npm run dev` — dev server (MSW enabled by default)
- `npm test` — Vitest once · `npm run test:watch`
- `npm run typecheck` · `npm run lint` · `npm run build`
- Definition of done for any change: `npm run lint && npm run typecheck && npm test` green.

## Architecture (dependency direction is enforced — do not invert)
features → api → domain
mocks → domain
- `src/domain` — pure business rules. No React, no fetch, no Date.now().
- `src/api` — network layer behind the `BookingsApi` interface. No React except `ApiProvider.tsx`.
- `src/mocks` — MSW handlers + in-memory DB. Never imported by `features`.
- `src/features/bookings` — UI + TanStack Query hooks. Never calls `fetch` directly.

## Non-negotiable business rules
Working day 09:00–18:00 · start < end · 30 min ≤ duration ≤ 120 min · 15-min grid ·
no overlap, touching boundaries allowed (half-open intervals) · no past time · past dates read-only ·
editing excludes the booking itself · server is the source of truth and may return 409.
Every rule lives in `src/domain/validation.ts` and is reused by the mock server. Never duplicate a rule in UI code.

## Conventions
- TS: `erasableSyntaxOnly` → no enums/namespaces/parameter properties; use `as const` objects and union types. `import type` for types.
- Branded types `ISODate`, `TimeHHmm` at boundaries; minutes (number) internally.
- Dates: local date only — never `toISOString()` for a calendar date.
- Pass `now` explicitly into domain functions; UI gets it from `useNow()`.
- Query keys only via `bookingKeys`. Mutations invalidate by key; only delete is optimistic.
- Form state lives in `formReducer`, never derived from query data (409 must not wipe user input).
- Accessibility: every input has a `<label>`, errors use `aria-describedby` + `aria-invalid`, dialogs use native `<dialog>`.
- No new dependencies without stating why in the PR/commit message.
- Comments only for non-obvious "why".

## Testing
- Domain: table-driven tests for every rule, including edges (09:00, 18:00, 30/120 min, touching).
- UI: test behaviour through the accessible tree (`getByRole`, `getByLabelText`), not class names.
- Use MSW node server for API/UI tests; `vi.setSystemTime` for time.

## Don't
- Don't edit `public/mockServiceWorker.js` (generated) or `package-lock.json` by hand.
- Don't silence lint/TS errors with `any`, `@ts-ignore`, or `eslint-disable` — fix the cause.
- Don't commit or push unless asked.
````

## 2. Subfolder `AGENTS.md` files

**`src/domain/AGENTS.md`**
```md
# Domain layer
Pure TypeScript. Allowed imports: other files in `src/domain` only.
- Every exported function is deterministic: time comes in as an argument (`now: Date`).
- Every new rule → new `ValidationIssue` code + table-driven test in `*.test.ts` covering both sides of each boundary.
- Intervals are half-open `[start, end)`: `overlaps = a.start < b.end && b.start < a.end`.
- This code also runs inside the mock server — no browser APIs.
```

**`src/api/AGENTS.md`**
```md
# API layer
- The UI depends only on the `BookingsApi` interface; `createHttpBookingsApi` is one implementation.
- Every response passes through `parse.ts` — never cast `res.json()` to a type.
- Map HTTP status to typed errors in `http.ts` (409 → ConflictError with `conflicts`, 404 → NotFoundError, 400/422 → ValidationApiError, network → NetworkError).
- Always forward `AbortSignal`.
- Error body contract: `{ code, message, details? }` — keep `README.md#api-contract` in sync when it changes.
```

**`src/mocks/AGENTS.md`**
```md
# Mock server (MSW 3)
- Behaves like a real, strict backend: re-validates with `src/domain/validation.ts`, returns the documented error contract.
- Seed data is relative to "today" so the demo always has content.
- Demo controls (`demoControls.ts`) are the only way UI may touch the mock DB, and only from `DemoControls.tsx`.
- Check MSW 3 docs before using an API you remember from v2.
```

**`src/features/AGENTS.md`**
```md
# Feature UI
- Data via hooks in `hooks.ts` only; components never import from `src/api/http.ts` or `src/mocks`.
- Every async view handles: loading, empty, error (with retry), submitting, success announcement.
- On ConflictError: show alert naming the conflict, invalidate the day, keep form values, focus the alert.
- Prefer native elements (`<select>`, `<dialog>`, `<button>`) over ARIA re-implementations.
- Before finishing a component, run the `ui-state-audit` skill.
```

---

## 3. Hooks (`.claude/settings.json`)

Hooks turn conventions into **enforced guard rails**. This shows you treat the agent like a CI pipeline, not a chat.

```json
{
  "permissions": {
    "allow": [
      "Bash(npm run lint)", "Bash(npm run typecheck)", "Bash(npm test)",
      "Bash(npm run test:watch)", "Bash(npm run build)", "Bash(npx vitest run:*)",
      "Bash(npx eslint:*)", "Bash(git status)", "Bash(git diff:*)", "Bash(git log:*)"
    ],
    "deny": ["Read(./.env)", "Read(./.env.*)"]
  },
  "hooks": {
    "PreToolUse": [
      { "matcher": "Edit|Write",
        "hooks": [{ "type": "command", "command": "node \"$CLAUDE_PROJECT_DIR\"/.claude/hooks/protect-files.mjs" }] }
    ],
    "PostToolUse": [
      { "matcher": "Edit|Write",
        "hooks": [{ "type": "command", "command": "node \"$CLAUDE_PROJECT_DIR\"/.claude/hooks/lint-changed-file.mjs" }] }
    ],
    "Stop": [
      { "hooks": [{ "type": "command", "command": "node \"$CLAUDE_PROJECT_DIR\"/.claude/hooks/verify-on-stop.mjs", "timeout": 180 }] }
    ]
  }
}
```

Hooks receive JSON on stdin. **Exit code 2** blocks the action, or after the fact sends stderr back to the agent so it fixes the problem itself. Node scripts are used instead of `jq` so they work on any machine with Node.

**`.claude/hooks/protect-files.mjs`** — blocks edits to generated or sensitive files
```js
import { readFileSync } from 'node:fs'
const { tool_input } = JSON.parse(readFileSync(0, 'utf8'))
const path = tool_input?.file_path ?? ''
const blocked = [/mockServiceWorker\.js$/, /package-lock\.json$/, /(^|\/)\.env(\.|$)/]
if (blocked.some((re) => re.test(path))) {
  console.error(`Blocked: ${path} is generated or sensitive. Use the proper command (npm i / msw init) instead.`)
  process.exit(2)
}
```

**`.claude/hooks/lint-changed-file.mjs`** — immediate feedback on every edit
```js
import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
const { tool_input } = JSON.parse(readFileSync(0, 'utf8'))
const file = tool_input?.file_path
if (!file || !/\.(ts|tsx)$/.test(file)) process.exit(0)
const r = spawnSync('npx', ['eslint', '--fix', file], { encoding: 'utf8' })
if (r.status !== 0) {
  console.error(`ESLint errors in ${file}:\n${r.stdout}${r.stderr}`)
  process.exit(2)
}
```

**`.claude/hooks/verify-on-stop.mjs`** — the agent can't say "done" while things are red
```js
import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
const input = JSON.parse(readFileSync(0, 'utf8'))
if (input.stop_hook_active) process.exit(0) // avoid infinite loop
const run = (args) => spawnSync('npm', args, { encoding: 'utf8' })
for (const args of [['run', 'typecheck'], ['test']]) {
  const r = run(args)
  if (r.status !== 0) {
    console.error(`\`npm ${args.join(' ')}\` failed — fix before finishing:\n${(r.stdout + r.stderr).slice(-4000)}`)
    process.exit(2)
  }
}
```
Tip: until `typecheck`/`test` scripts exist (plan step 1), the Stop hook would fail. Add hooks right after step 1.

Optional extras:
- `UserPromptSubmit` hook that appends the current PLAN.md step to context ("You are on step N"). Keeps long sessions on track.
- `PostToolUse` hook on `src/domain/**` that runs only that file's test (`npx vitest run related <file>`). Gives fast TDD feedback.

---

## 4. Skills (`.claude/skills/<name>/SKILL.md`)

Skills package a **repeatable multi-file workflow**. The description is what makes the agent pick the skill automatically, so write it as a trigger.

**`business-rule-change/SKILL.md`**
```md
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
```

**`ui-state-audit/SKILL.md`**
```md
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
```

**`api-endpoint/SKILL.md`**
```md
---
name: api-endpoint
description: Use when adding or changing an API endpoint or its payload/error shape. Keeps interface, HTTP impl, parser, mock handler, tests and README contract in sync.
---
1. Update the `BookingsApi` interface (`src/api/bookingsApi.ts`).
2. Implement in `createHttpBookingsApi`; forward AbortSignal; parse response in `parse.ts`.
3. Add/adjust MSW handler in `src/mocks/handlers.ts` with real validation + documented errors.
4. Map any new status/code in `src/api/http.ts` → typed error.
5. Tests: api mapping test + one UI test exercising the new path.
6. Update README "API contract".
```

## 5. Slash commands (`.claude/commands/*.md`)

Short, user-triggered prompts. (Skills are the newer, auto-invocable form. Commands remain useful for explicit one-shot actions.)

**`verify.md`** → `/verify`
```md
---
description: Run full quality gate and summarise failures
---
Run `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` in sequence. For each failure, show the root cause and fix it. Finish with a one-line pass/fail table.
```

**`step-done.md`** → `/step-done 3`
```md
---
description: Close a PLAN.md step — verify, tick it, log time, commit
argument-hint: <step number>
---
For PLAN.md step $ARGUMENTS:
1. Check every item in that step is actually implemented (cite files). List gaps instead of ticking if incomplete.
2. Run /verify.
3. Tick the checkbox in PLAN.md and append the step + elapsed time to `docs/time-log.md`.
4. Propose a Conventional Commit message (feat/chore/test/docs) and commit after I confirm.
```

**`conflict-scenario.md`** → `/conflict-scenario`
```md
---
description: Exercise and verify the 409 conflict flow end-to-end
---
Using the mock server: create a draft for a free slot, insert a conflicting booking via `demoControls.simulateOtherUserBooking`, submit, and assert (by running/adding a Testing Library test) that the alert names the conflict, the list refetched, form values persisted and focus moved to the alert. Report any deviation from PLAN.md §8.
```

Built-ins worth using visibly in the transcript: `/code-review` after each feature step, `/security-review` before submission, `/simplify` on the biggest component, plus Snyk MCP scans (already required by your global rules).

## 6. Subagents (`.claude/agents/*.md`)

Specialised reviewers with **limited tools** and separate context. Show this as "AI reviewing AI".

**`react-reviewer.md`**
```md
---
name: react-reviewer
description: Senior React/TS reviewer. Use proactively after implementing a feature step to review the diff for correctness, hooks misuse, race conditions, stale closures, cache-key bugs and architecture-boundary violations.
tools: Read, Grep, Glob, Bash
---
Review only the current diff (`git diff`). Check: dependency direction (features→api→domain), query-key usage, mutation invalidation/rollback, AbortSignal, effects without cleanup, derived state stored in state, form state wiped on refetch, unnecessary re-renders, `any`/casts. Report findings ranked by severity with file:line and a concrete fix. Do not edit files.
```

**`a11y-auditor.md`**
```md
---
name: a11y-auditor
description: Accessibility auditor. Use after building or changing UI components.
tools: Read, Grep, Glob
---
Audit against WCAG 2.2 AA basics: labels, roles, names, focus order and visibility, dialog behaviour, live regions, colour-only signals, target sizes, reduced motion. Output a checklist with file:line and the minimal fix.
```

**`domain-test-writer.md`**
```md
---
name: domain-test-writer
description: Writes exhaustive table-driven Vitest tests for src/domain functions, focusing on boundaries. Use when a domain function is added or changed.
tools: Read, Grep, Glob, Edit, Write, Bash
---
For the given function, enumerate boundaries (both sides), equivalence classes and invalid inputs; write `it.each` tables; run `npx vitest run <file>`; never change production code — report suspected bugs instead.
```

---

## 7. Optional MCP: browser verification

Add a Playwright MCP server in `.mcp.json` so the agent can open `npm run dev`, click through the conflict flow, check 375px layout and take screenshots. This closes the loop that unit tests can't ("type checks verify code, not features"). Mention it in the README if used.

## 8. Making it visible to reviewers

- **README → "How I worked with AI"** section: the plan-first approach (PLAN.md), AGENTS.md + scoped rules, hooks as guard rails, skills and subagents used, **what the AI got wrong and how I caught it** (e.g. msw 3 API drift, `toISOString` TZ bug, the `useNow` gap found in plan review). That last point is the strongest signal of senior judgement.
- **ADRs** in `docs/decisions/` (5–10 lines each): context → decision → consequences. Write them as you go, not at the end.
- **Commit history**: one Conventional Commit per plan step; AI co-author trailer kept honest.
- **Transcript**: keep the plan review and the "verify each step" exchanges. They show you challenged the AI rather than rubber-stamping it.
- **Time log** (`docs/time-log.md`) feeding the README's time-spent section.

## 9. Recommended minimum (if short on time)
1. `AGENTS.md` (root) + `CLAUDE.md` import + `src/domain/AGENTS.md`.
2. Hooks: `protect-files` + `lint-changed-file` (Stop hook optional — can slow the loop).
3. Skill: `ui-state-audit`. Subagent: `react-reviewer`. Command: `/step-done`.
4. README "How I worked with AI" section.
