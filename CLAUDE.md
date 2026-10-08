# Corner Conquest: instructions for Claude

Multiplayer island-conquest strategy game: 2–4 players or bots, armies, resources, special cards, monsters, fog of war.
- Game rules and architecture: `docs/README.md`, an index into `docs/architecture/*.md` (code wins if they disagree; report the drift).
- Original product brief: `docs/blueprint.md` (its style section is outdated; the implemented theme wins).
- How this AI setup works, for humans: `docs/ai/README.md`.
- `.agents/` is Google Antigravity config (Genkit skill, workflows). Claude Code does not use it.

## How to communicate
- No flattery, no praise, no filler. Never open with "Great question" or "You're absolutely right". Lead with the result.
- Be brief: what changed, what was verified (with the command), what is left. Reference code as `path:line`.
- If a request conflicts with the architecture or the game rules, or you see a clearly better approach, say so in one or two sentences before executing, then follow the user's decision.
- If you are unsure what is wanted, ask before executing. Never fill gaps with guesses.

## Stack
Verified at bootstrap; check `package.json` before relying on a version.
- Next.js 15 App Router (`src/app`), React 18, TypeScript strict, alias `@/*` → `src/*`.
- Tailwind CSS 3 + shadcn/ui (Radix) in `src/components/ui`. Theme tokens are CSS variables in `src/app/globals.css`; merge classes with `cn()` from `@/lib/utils`. Dark theme only.
- Firebase Firestore client SDK via `@/lib/firebase`, configured by `NEXT_PUBLIC_FIREBASE_*` env vars. One Firestore document per match; the game rules are pure reducers in `src/modules/game-rules`.
- Jest 30 + React Testing Library (jsdom). Playwright e2e in `e2e/`.
- Not used: SCSS, Contentful. Genkit is installed but nothing calls it.

## Commands
| Purpose | Command |
|---|---|
| Dev server (http://localhost:9002) | `npm run dev` |
| Typecheck | `npm run typecheck` |
| Lint (new code only, zero warnings allowed) | `npm run lint` |
| Unit tests | `npm test`, one file: `npx jest <path>` |
| E2E (starts the Firestore emulator and a production build on :3000; needs Java 21) | `npm run test:e2e`, one spec: `npm run test:e2e -- e2e/<spec>.spec.ts` |
| Production build (fails on type or lint errors) | `npm run build` |
| Component testbed | `npm run dev`, then http://localhost:9002/testbed |
| Browser check with screenshots | `node .claude/skills/ui-verify/scripts/snapshot.mjs <url>` |
| Headless swarm | `scripts/claude-swarm-runner.sh <task-folder>` |

## Where code goes
- **New code: `src/modules/<domain>/`**, one folder per component: `Name.tsx` (view), `Name.hook.ts`, `Name.styles.ts`, `Name.map.ts`, `Name.types.ts`, tests and `Name.preview.tsx`. Details in skill `component-architecture`; ESLint enforces the import boundaries.
- **Testbed: `src/testbed/`** plus the dev-only route `src/app/testbed/`.
- **Vendored:** `src/components/ui/` (shadcn). Reuse it; add primitives with the shadcn CLI; don't fork them.
- Paths drift. Confirm a path with Glob before citing it.

## Principles
1. **Don't hallucinate.** Never cite a file, symbol, prop, command, version or rule you haven't verified in this session. Skill `anti-hallucination`.
2. **KISS, DRY, SOLID.** Smallest correct change; search before writing; one responsibility per file. Skill `kiss-dry-solid`.
3. **Readable code**, the way an expert front-end engineer writes it: intention-revealing names, small functions, early returns, no cleverness, comments explain why. Skill `code-standards`.
4. **Tests ship with the code.** Logic tests before view tests. Never skip or weaken a test to get green. Skill `testing`.
5. **Check visible changes in a browser** before calling them done. Skill `ui-verify`.
6. **Docs stay true.** A change to game rules or architecture, including a bug fix that changes documented behavior, updates the relevant `docs/architecture/*.md` file in the same phase. Mandatory agent `docs-sync`, skill `docs-sync`.
7. **Learn once.** When a review catches a non-obvious bug a future agent could repeat, it goes in `docs/ai/lessons-learned.md`, not just that task's `progress.md`. Skill `lessons-learned`.

## Workflow
- Every feature, component, bug fix or refactor starts with skill `triage` (`/triage <request>`). It sizes the task XS–XL and picks the agent pairs and their models.
- Skill `swarm` runs the pipeline. Agents live in `.claude/agents/`: planners (`game-designer-*`, `ui-designer-*`, `architect-*`) run on claude-sonnet-5; builders (`implementer-*`, `tester-*`, `preview-*`, `docs-sync`) run on haiku and are escalated to sonnet by triage when needed. `docs-sync` is mandatory, not optional, whenever game rules, architecture, or a documented bug's behavior changed.
- Each task has a record folder `docs/ai/tasks/<YYYY-MM-DD>-<slug>/` built from `docs/ai/templates/`. It is the handoff between agents and the trail for tracing bugs later. Commit it with the code.
- Every sub-agent ends its final message with a line that contains only `DONE` or `BLOCKER`. Wait for that line before starting the next stage. On `BLOCKER`, stop and report to the user.

## Phases
- A task too long for one sitting (tier L or XL, or more than about 6 files) is split into phases in its `progress.md`.
- Each phase: implement → tests → previews → checks → commit → **stop and ask the user to type `continue`**.
- At session start, look for unticked boxes in `docs/ai/tasks/*/progress.md` (the SessionStart hook lists them) and resume from there.

## Output limit
If you reach your output limit, stop and ask me to type 'continue' to finish generating the remaining files. Do not skip files to save space.

## Definition of done
- `npm run typecheck`, `npm run lint` and `npm test` pass; quote their summary lines.
- New or changed components have a testbed preview, checked with skill `ui-verify`.
- `progress.md` is updated; the relevant `docs/architecture/*.md` file is updated if behavior changed (agent `docs-sync`, mandatory for rule/architecture changes and bug fixes).
- One commit per phase, Conventional Commits style: `feat(combat): add dice tray [phase 1/2]`.
