# How I worked with AI on this task

A text account of the collaboration: how the work was prompted, how decisions were made, which agents and tooling were set up, and where the engineer (me) steered or overruled the AI. It is reconstructed from the session itself; prompts are quoted as written (typos kept) or marked as paraphrased.

- **Task:** meeting-room booking UI (`task-definition.txt`), React + TypeScript.
- **Tools:** Claude Code. Models: Sonnet 5.5 for most work, Opus 5.5 for the plan review, Haiku sub-agents for mechanical work, Sonnet 5.5 as an independent final reviewer.
- **Time:** about 1 hour of hands-on time, started at 18:00.
- **Result:** 24 commits, 203 automated tests, deployed at https://reservation-app-red.vercel.app/ (repo: https://github.com/AbAyvazyan/reservation-app).

## 1. The working method in one paragraph

Plan first, in a mode where the AI cannot change anything. Then turn the plan into a self-contained document that any model can execute. Review that plan with a different model before building. Build in small, tested, separately committed steps; delegate only well-specified mechanical work to cheaper models and review it myself; keep the business-critical code in my own loop. Finish with an independent review by another model, and fix what it finds with regression tests that are proven to fail without the fix. At each step the prompts were short and directive, and the AI was expected to push back, verify and report honestly.

## 2. Timeline of prompts and what they produced

| # | My prompt (quoted or paraphrased) | What the AI did | What I decided or corrected |
|---|---|---|---|
| 1 | `/plan @task-definition.txt` (plan mode on) | Read the task, inspected the existing Vite scaffold, and asked four design questions rather than guessing: mock-API approach, persistence, how to demo a 409, tooling. | Chose MSW. On persistence I overruled the default: "we can have maybe caching imitiation with tanstack for example? but we will get mock data from fetching api for now". Accepted the recommended conflict-demo toggle and plain CSS + Vitest. |
| 2 | Rejected the first plan: "create file which will represent all he plan that i will be able to go throgh with opus model" | Rewrote the plan as a self-contained hand-off document: requirements, repo state, decisions, architecture, rules, conflict flow, tests, steps, verification. | I wanted the plan to be portable between models, not trapped in one chat. |
| 3 | "i need Plan md" | Explained that plan mode only allows editing the plan file, asked to leave plan mode, then copied it to `PLAN.md`. | |
| 4 | Switched to Opus 5.5: "go through the plan and verify each step. I will need to demonstrate Senior React Engineer skills during this test task completion so i am open for your suggestions" | Checked the plan against reality (real package versions and peer ranges, config files). Found gaps: "now" would never advance, git set up too late, MSW 3 is a new major, request cancellation missing, edge cases for bookings in progress, and more. Proposed senior-level additions. | Asked for the suggestions to be added. |
| 5 | "add" | Rewrote `PLAN.md` with everything: branded types, injected API interface, optimistic delete only, URL-synced date, assumptions table, commit policy. | |
| 6 | "also create AI-Suggestions.md file ... suggest some skills, commands, hooks and also subfolder and main folder claude.md file suggestions ... Also lets have agents.md instead of claude md" | Wrote `AI-Suggestions.md` with copy-ready content. Pointed out that Claude Code reads `CLAUDE.md`, not `AGENTS.md`, so proposed `AGENTS.md` as the single source of truth with one-line `CLAUDE.md` files importing it. | Accepted the design; this also keeps the setup usable by other agents. |
| 7 | Switched back to Sonnet 5.5: "check what we have and draw step by step roadmap ... You can decide and separately run haiku 5.5 sub agents" | Produced a roadmap and a delegation table (which steps go to which model). A compound setup command was blocked by the permission checker. | I did not override the block; I ran `git init` myself with `!`, then told the AI to continue. |
| 8 | "you will need to commit meaningfully abut all the file content change and i will need you to code review with sonet 5.5 model after everything will be finished" | Added a commit policy (one logical change per commit, Conventional Commits, tests with the code they cover) and made a final review step 11. | Fixed the process before any code existed. |
| 9 | "go ahead" | Launched a Haiku agent for the AI-tooling files while building the domain layer itself, test-first. | I stopped the first Haiku agent partway. The AI then checked on disk what it had created, validated the scripts and JSON, and committed only what was verified. |
| 10 | "move on" (several times) | Step 3 (API layer + mock server) after reading MSW 3's installed type definitions. Then hooks, form state, UI, tests. | Short prompts were enough because the plan and instruction files carried the context. |
| 11 | "move on and dont forget to update instruction files if needed" | Built the UI; a second Haiku agent built shared styles and base components under a strict file boundary. Updated `AGENTS.md` files with lessons learned. | Made keeping the agent instructions current part of every step. |
| 12 | "lets scan snyk by snyk cli not mcp if it needs authentification then skip it" | Ran `snyk code test`; got a 401; stopped. Did not try to work around it. | The scan was skipped, and that is stated in the README rather than hidden. |
| 13 | Pasted a browser error: `The requested module '/src/mocks/DemoControls.ts' does not provide an export named 'DemoControls'` | Checked the disk, found the files correct, and traced it to my already-running dev server holding a stale module graph from before a rename. Gave restart steps. | Reported evidence instead of changing correct code. |
| 14 | "move on to next point" | Ran the final independent review with a Sonnet sub-agent (read-only), verified the findings, fixed 9 of 10 with regression tests. | The review ran after all tests were green, and still found real defects. |
| 15 | "i need to auth and push with this token ..." | Checked for secrets in tracked files, pushed with a one-shot auth header so the token never entered `.git/config`, confirmed that, and advised revoking the token because the transcript is a deliverable. | |
| 16 | "lets work on ui make it beautiful now it is ugly. also at the end i need you to create interaction file ..." | Redesigned tokens, buttons, cards, empty state, header and form panel in two commits. | |
| 17 | Interrupted a screenshot attempt: "no need screenshots i need text based only they want to know how i prompt ai and how i work with ai as senior engineer" | Stopped, removed its temporary files and dev server, and continued with checks that do not need images. | Redirected the effort toward evidence a reviewer can read. |
| 18 | Shared the deployed link and the time spent. | Put both into the README. | |

## 3. Agentic setup

### 3.1 Instruction files (AGENTS.md is the single source of truth)

| File | Purpose |
|---|---|
| `AGENTS.md` | Commands, architecture and dependency direction, the business rules, conventions, testing rules, a "don't" list. |
| `CLAUDE.md` (root and per folder) | One line, `@AGENTS.md`, so Claude Code and other agents read the same rules. |
| `src/domain/AGENTS.md` | Pure TypeScript, injected `now`, half-open intervals, a test for both sides of every boundary. |
| `src/api/AGENTS.md` | UI depends on the `BookingsApi` interface only; parse every response; forward `AbortSignal`; error contract. |
| `src/mocks/AGENTS.md` | Mock server behaves like a strict backend; scoped failure injection; MSW 3 naming. |
| `src/features/AGENTS.md` | Hooks only, no fetch, no mock imports; form state in a reducer; create/update not optimistic; keep the in-flight guard. |
| `src/shared/AGENTS.md` | App-agnostic components; tokens only; accessibility is part of the component contract. |

These files were updated during the work, not just written once. Examples: a rule about file names that differ only by case (after a real macOS collision), the MSW 3 option rename, the "no form switching while a save is in flight" rule after the review.

### 3.2 Hooks (`.claude/settings.json`)

- **PreToolUse** `protect-files.mjs`: blocks edits to generated or sensitive files (the MSW worker, the lock file, env files).
- **PostToolUse** `lint-changed-file.mjs`: runs ESLint on the edited file and feeds errors back to the agent.
- **Stop** `verify-on-stop.mjs`: the agent cannot finish while typecheck or tests fail. Enabled only after those scripts existed, and tested by hand first.
- A permission allowlist for the read-only and verification commands.

### 3.3 Skills, commands and subagents (`.claude/`)

- Skills: `business-rule-change`, `ui-state-audit`, `api-endpoint` (repeatable multi-file workflows with a checklist).
- Commands: `/verify`, `/step-done`, `/conflict-scenario`.
- Subagent definitions: `react-reviewer`, `a11y-auditor`, `domain-test-writer` (limited tools, review-only roles).

### 3.4 Agents actually used in this session

| Agent | Model | Job | Boundaries I set | Outcome |
|---|---|---|---|---|
| Plan reviewer | Opus 5.5 | Verify the plan against real versions and config | Review and suggest only | Found the stale "now", MSW 3 risk, git ordering, and more. |
| AI-tooling agent | Haiku | Create the instruction, hook, skill, command and agent files from the spec | No git, no installs, no edits outside listed files | I stopped it midway; I then verified every file myself before committing. |
| Shared-components agent | Haiku | Styles, Button, Alert, Skeleton, ErrorBoundary and their tests | Exact props, exact file list, must run lint/typecheck/tests and report only what it verified | Delivered; I re-ran the gate and reviewed the APIs before use. |
| Final reviewer | Sonnet 5.5 | Independent, read-only review of the whole code base | No edits; must substantiate each finding with a failing scenario; max 12 findings; under 700 words | 10 findings, no blockers; I reproduced one before fixing, then fixed 9. |

What I kept in my own loop: the domain rules and their tests, the API layer and mock server, the conflict handling, and the form state machine. Those are the graded, high-risk parts.

## 4. Prompting patterns that worked

1. **Plan mode first, then a portable document.** Nothing was built until there was a plan that a fresh model could execute alone.
2. **Ask for suggestions explicitly.** "I am open for your suggestions" turned a review into design input (request cancellation, URL-synced date, in-progress rules).
3. **Decide the process up front.** Commit policy, a final review by a different model, and an instruction file for agents were all set before code existed.
4. **Short follow-ups once context lives in files.** "move on" was enough because `PLAN.md` and `AGENTS.md` carried the state.
5. **Delegation with contracts.** Each sub-agent prompt named exact files, exact APIs, forbidden actions, and required the agent to verify and report only what it ran.
6. **Trust but verify.** After every delegated task and every test run, the result was re-checked: lint, typecheck, tests, build, git status, and a read of the actual files.
7. **Prove tests can fail.** Twice the AI broke the behaviour on purpose (wiping the form on error; removing the in-flight guard and the availability fix) and confirmed the relevant tests went red, then restored the code.
8. **Independent review after green.** A different model reviewed everything after all tests passed, and still found real defects.
9. **Stop the AI when it goes the wrong way.** I interrupted a half-finished sub-agent and an unnecessary screenshot approach.
10. **Respect guard rails.** When the permission checker blocked a setup command and when Snyk needed authentication, the AI did not work around them; I did the step myself or chose to skip it.

## 5. Things the AI got wrong, and how they were caught

| Problem | How it was caught | Fix |
|---|---|---|
| The plan used MSW 2's `onUnhandledRequest` option | Reading MSW 3's installed type definitions | `onUnhandledFrame`; recorded in `AGENTS.md`. |
| The plan's "now" would never advance (a slot would stay bookable after its time passed) | Plan review by the second model | `useNow` hook that ticks on the minute and on tab focus. |
| `demoControls.ts` and `DemoControls.tsx` differed only by case and broke the TypeScript build on macOS | Typecheck failure | Renamed to `controls.ts`; rule added to `AGENTS.md`. |
| First full test run passed 17 of 17 immediately | I treated it with suspicion | Mutation check: wiping the form on error made four tests fail, so the tests were meaningful. |
| The start time of a meeting in progress showed "(unavailable)" | Final review; I reproduced it with a throwaway test | Judge the booking's own start with its own end; regression test. |
| A slow save could deliver its 409 to a different form | Final review | Reducer ignores form switches and date changes while saving; regression test that fails without the guard. |
| "Fail next request" could be swallowed by a background prefetch | Final review | Failures are scoped to loads or saves. |
| A test asserted an option was enabled inside a disabled `<select>` | Test failure | Assertion rewritten to check the accessible name instead. |
| A stale dev server threw a module error after a rename | Error pasted by me | Disk checked first, then restart instructions; no code change needed. |

## 6. Engineering principles visible in the result

- **One source of truth for rules.** The same validator drives disabled options in the UI and rejections in the mock server.
- **Server is the authority.** The UI pre-computes availability but assumes nothing; a 409 keeps what the user typed, refreshes the list, names the conflicting booking and moves focus to the alert.
- **Replaceable network layer.** The UI depends on a `BookingsApi` interface and plain `fetch`; turning off the mock needs no UI change.
- **Honest scope.** The README lists what was not done: Snyk scans (CLI not authenticated), real-browser and screen-reader testing, end-to-end tests, time zones beyond the browser's.
- **Safety with credentials.** A token supplied in chat was used once through a one-shot auth header and never written to git config. Because this transcript is a deliverable, the token should be revoked.

## 7. Commit history (one logical change each)

```
5b847ed docs: add task definition, implementation plan and AI tooling proposal
53f4456 chore: set up project tooling for booking app
a6352e9 feat(domain): add booking rules, validation and availability with tests
e4ede80 chore: add AI tooling (agent guides, hooks, skills, commands, subagents)
73c4187 chore: add trailing newline to domain agent guides
eac8029 docs: tick completed plan steps and fix MSW 3 option name
c678680 feat(api): add typed HTTP client behind a replaceable BookingsApi
cf5b767 feat(mocks): add MSW mock backend with demo controls and API tests
c3991cd refactor(domain): extract describeBooking for reuse by the UI
0f00749 feat(bookings): add data hooks, form state machine and URL-synced date
d5883ed feat(domain): add freeGaps for bookable gaps in a day
c96a72f feat(shared): add design tokens and accessible base components
b2d6927 feat(bookings): add day view, booking form and delete confirmation
fdc10d8 feat(app): wire providers, config and MSW bootstrap with demo controls
e5c7873 test(bookings): cover day states, create/edit/delete and the 409 flow
5c0fa7f docs: update agent instructions, enable stop hook, tick plan steps 4-6
63a121e ci: run lint, typecheck, tests and build on push and pull requests
b957968 docs: write README with architecture, conflict handling and assumptions
903aa14 fix(domain): keep an in-progress booking's own start selectable
2941a08 fix(bookings): protect a form while it saves and tidy dialog/a11y behaviour
0375b5d feat(mocks): scope injected failures to loads or saves
f5beecf docs: reflect review fixes, known edge cases and scoped demo failures
e8cba0c style(shared): refresh design tokens, buttons and add decorative icons
12d8765 style(bookings): redesign page with hero, time-column cards and empty state
```

## 8. Verification state when this file was written

- Lint, typecheck, build: clean. Tests: 203 passing.
- The restyle in the last two commits was verified by tests and by checking that every CSS class used in the markup exists; it has not been judged visually by me in a browser (I was asked not to take screenshots). The deployed demo predates that restyle until it is redeployed.