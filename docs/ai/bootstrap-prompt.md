# Bootstrap prompt: configure Claude Code for a front-end repository

Paste everything below the line into a new Claude Code session opened at the repository root.
It generated this repository's setup (`CLAUDE.md`, `.claude/`, `docs/ai/`, `scripts/claude-swarm-runner.sh`, `src/testbed/`).
Run it again after a large stack change; it updates the existing files instead of overwriting them.

---

You are configuring Claude Code for this repository so that every future session, and every agent it spawns, works the same way: concise, grounded in the real code, and organised in small teams of agents with the right model for each job. You generate Markdown files, Claude Code skills and agents, one shell script, and a component testbed. You work in phases and you verify everything you write.

## Ground rules for this whole task

- **No flattery, no filler.** Never praise me or my request. Lead with results. Be concise and focused on what you produce.
- **Don't hallucinate.** Never write a path, command, version, API, prop or rule into a file before verifying it in this repository (Glob, Grep, Read, `package.json`, `node_modules/<pkg>/package.json` and `.d.ts` files) or in the official Claude Code documentation (https://code.claude.com/docs). If you can't verify something, say "unverified" or ask.
- **Suggest before executing.** When you see a better approach than the one I describe, say so in one or two sentences before doing anything, then follow my decision.
- **Ask when unsure.** If a decision is mine to make (see Phase 0), ask with AskUserQuestion, recommended option first, and wait.
- **KISS, DRY, SOLID.** Every rule lives in exactly one file; other files link to it. Generate nothing that only repeats something else.
- **Phases.** Execute the phases below in order. At the end of each phase: run its checks, commit (Conventional Commits, one commit per logical change), then stop and ask me to type `continue`.
- **If you reach your output limit, stop and ask me to type 'continue' to finish generating the remaining files. Do not skip files to save space.**
- **Existing configuration.** If `CLAUDE.md`, `.claude/`, `AGENTS.md`, `.agents/`, `.cursor/` or similar exist, read them first and merge: keep what is still true, replace what is wrong, and tell me what you removed.

## Expected stack (a hypothesis to verify, not a fact)

React, Next.js, TypeScript, SCSS, with content fetched from Contentful. Detect the real stack in Phase 0 and adapt every generated file to it:

| If the repo uses | Component style file | `.map.ts` transforms | Data skill covers |
|---|---|---|---|
| SCSS / CSS Modules | `Name.module.scss` | — | — |
| Tailwind | `Name.styles.ts` (class maps, `cva` variants) | — | — |
| Contentful | — | Contentful entries → view models (strip `sys`/`fields`, resolve links and assets, rich text) | client setup, preview/draft mode, caching and revalidation, generated content types if the repo already has a generator |
| Firebase / REST / GraphQL | — | documents or responses → view models | the real client, its cost and security constraints |

## Phase 0: discovery (read-only)

1. Read `package.json` (scripts, dependencies, versions), the lockfile type, `tsconfig.json`, `next.config.*`, styling config (Sass, Tailwind, PostCSS), test configs (Jest, Vitest, Playwright, Cypress), lint and format configs, CI files, env examples, `README.md`, everything in `docs/`, and any existing agent configuration.
2. Map the component architecture, paying special attention to standard directories like `src/components/...` if they exist. Note file sizes, naming conventions, how styles, state, data fetching and tests are organised, and which parts look legacy.
3. Run the baseline and record exact results: dependency install, typecheck, lint, unit tests, and the production build if it is feasible. Note any command that hangs or prompts interactively.
4. Identify the data layer (Contentful or other): SDK, content types or schemas, environment variables, preview mode, caching.
5. List gaps and risks: missing or disabled quality gates, documentation that contradicts the code, duplicated files, oversized files, security smells, tests that touch production services.
6. Report concisely: expected vs. actual stack, baseline results, gaps, the additional standards you propose for this stack, and your plan. Ask me, with AskUserQuestion, about every decision that changes what you generate. At least:
   - the component style file type, when the styling differs from SCSS;
   - the data layer and what `.map.ts` means, when it differs from Contentful;
   - the testbed technology (a dev-only in-app route vs. Storybook; recommend the in-app route unless Storybook already exists);
   - which repository fixes to include (for example a lint config, re-enabling build checks, docs cleanup, a SessionStart hook).
   Wait for my answers.

## Phase 1: quality gates

Make every command the configuration will cite real and non-interactive: `typecheck`, `lint`, unit tests, build. If lint has no configuration, add one scoped to new code (legacy paths listed explicitly), enforcing for new code: no `any`, type-only imports, a 150-line file limit, and import boundaries (I/O only in services, legacy UI only in hooks, other modules only through their public index). Prove each rule fires with throwaway probe files, then delete them. Re-enable any disabled build checks if the baseline is clean.

## Phase 2: core configuration

1. **`CLAUDE.md`** at the root, under 200 lines, loaded by every session and sub-agent. Only facts and always-on rules: communication rules (no flattery, concise, suggest before executing, ask when unsure), the verified stack, a command table, where code goes (new structure vs. frozen legacy), principles (no hallucination, KISS/DRY/SOLID, readable code an expert front-end engineer would write, tests ship with code, browser check for visible changes, docs stay true), the workflow (triage → swarm, the agent roster, the task folder, the DONE/BLOCKER sentinel), the phase protocol, the output-limit sentence above verbatim, and a definition of done. Procedures belong in skills, not here.
2. **`.claude/settings.json`**: `"outputStyle": "Concise"` (built-in style), and `permissions.allow` limited to the repository's own check commands (dev server, typecheck, lint, tests, build, e2e, the screenshot script, the runner, read-only git).
3. **`docs/ai/README.md`**: a short human guide to the setup (what lives where, daily use, pipeline, agents, how to maintain it).
4. **`docs/ai/templates/`**: `triage.md` (with machine-readable `Pipeline:` and `Overrides:` lines), `game-design.md` or the domain equivalent, `ui-design.md`, `plan.md` (verified context, decisions, file plan with owners, a TypeScript contracts block, phases, test plan, preview states, review section), `progress.md` (one checkbox block per phase plus a log), `review.md`.
5. A new folder structure for new work, separate from legacy code so changes are easy to trace back: `src/modules/<domain>/components/<Name>/` with one file per responsibility: `Name.tsx` (view), `Name.hook.ts` (state and effects), the style file chosen in Phase 0, `Name.map.ts` (pure data transforms), `Name.types.ts`, `Name.fixtures.ts`, colocated tests, `Name.preview.tsx`, `index.ts`; module services in `services/<name>.service.ts`; shared code in `src/modules/shared/`. Legacy folders stay frozen except for bug fixes, minimal wiring, and explicit migrations. Make sure the styling toolchain scans the new folders (for example Tailwind `content` globs).

## Phase 3: testbed and UI verification

1. **Testbed**: a dev-only route (for example `/testbed` and `/testbed/<slug>`), returning 404 in production unless an explicit build-time flag enables it. A registry lists every preview; a preview has a slug, title, group and named states, each rendering the pure view with fixtures. Add a registry test (unique kebab-case slugs, unique state names) and preview one existing component as an example. Previews must render on the client, because they pass functions as props.
2. **Screenshot script** (inside the `ui-verify` skill folder): opens URLs in headless Chromium at desktop and mobile size, saves screenshots under an ignored folder, and fails on console errors, uncaught exceptions, HTTP errors or a missing testbed slug or state. Errors from other origins (fonts, CDNs) are warnings. Supports `--all` (crawl the testbed), a `CHROMIUM_PATH` override, and waiting for the dev server.
3. Verify both for real: run the dev server, screenshot every preview, look at the images, script one interaction, and confirm the production 404.

## Phase 4: skills

Write `.claude/skills/<name>/SKILL.md` files with valid frontmatter (`name`, a `description` that says what the skill does and when to use it, under 1,536 characters) and bodies well under 500 lines. Reference material goes in supporting files. Required skills:

| Skill | Content |
|---|---|
| `triage` | Signals (size, gameplay/domain impact, visible UI, data, risk, bug) → tiers XS, S, M, L, XL → pipeline, models, phases; writes `triage.md`; L and XL wait for my approval |
| `swarm` | Coordinator playbook: stage table, how to spawn each agent (paths, not pasted content), proposer/challenger rounds (at most two), the phase loop with checks and one commit per phase, escalation. State clearly that **the coordinator must wait for the exact string "BLOCKER" or "DONE" from a sub-agent before spawning the next** |
| `agent-protocol` | Shared agreement preloaded into every agent: inputs, file ownership, modes (default, revise, final-review), report format, `VERDICT:` line, the final `DONE`/`BLOCKER` line; `user-invocable: false` |
| `component-architecture` | The structure from Phase 2, what each file may and may not do, the pure `NameView` plus one-line connected `Name` split for components whose hook reads app state, styles rules, import boundaries, size and naming, wiring into legacy code, migrating a legacy component. Include a complete worked example in `reference/example.md`, built as real code first, then type-checked, linted, tested and screenshot-verified, then copied into the reference and removed from `src/` |
| `code-standards` | The readability bar (code an expert front-end engineer would write), TypeScript, React, Next.js, styling and data-layer conventions of this stack |
| `kiss-dry-solid` | The three principles mapped to React, the legacy anti-patterns found in Phase 0, a checklist before DONE |
| `anti-hallucination` | Verify-before-use table, the never list (no invented paths, no unrun checks reported as passing), how to cite evidence, the final self-check |
| `testing` | Commands, locations, logic tests, hook tests, view tests (by role and ARIA, never classes), bug reproduction first, e2e rules. Include verbatim, adapted to the detected data layer: "tester-a must prioritize unit-testing the isolated logic files (the .map.ts Contentful transformers and the .hook.ts state managers) before writing DOM-heavy tests for the .tsx view." |
| `testbed-preview` | How to write and register a preview, which states to cover, deterministic fixtures, the checks |
| `ui-verify` | Start the dev server, run the screenshot script, read the screenshots against the UI spec, script interactions, run e2e when its prerequisites exist, report only what this run produced |
| `ui-design` | The product's visual language as found in the code (tokens, typography, components, layout, mobile rules, accessibility), how to write and review `ui-design.md` |
| `game-design` (games only) or a domain-design equivalent | Core loop, verified rule numbers with source files, design pillars, fun lenses, balance math, constraints, the proposal and review process |

## Phase 5: agents

Write `.claude/agents/<name>.md` with frontmatter `name`, `description` (when to use it), `tools` (least privilege: a reviewer that only observes gets no Write or Edit), `model`, `color`, and `skills:` (always `agent-protocol`, plus what the role needs). Bodies: role, inputs, steps, don'ts. Planners use the stronger model (`claude-sonnet-5`); builders use a small model (`haiku`), which triage escalates to `sonnet` for risky logic. Each pair is a proposer (`-a`) and a challenger (`-b`) that interact through hand-off files in the task folder:

| Pair | Model | Runs when | Writes |
|---|---|---|---|
| `game-designer-a` / `-b` (games; otherwise a domain-design pair, or none) | claude-sonnet-5 | Rule, balance, economy or pacing changes; "make it more fun" reviews. First in the pipeline. | `game-design.md` |
| `ui-designer-a` / `-b` | claude-sonnet-5 | Anything the user sees, tier M and up, before the architects | `ui-design.md` |
| `architect-a` / `-b` | claude-sonnet-5 | Tier M and up; `-b` also runs the end-of-phase final review | `plan.md`, `progress.md`, `review.md` |
| `implementer-a` / `-b` | haiku | Logic files / view files, in parallel, then cross-review | code |
| `tester-a` / `-b` | haiku | Logic tests first / view tests and e2e, then gap review | tests |
| `preview-a` / `-b` | haiku | Testbed previews / browser check of every state | previews, screenshots |

Triage decides how many pairs run and on which models: a typo runs no agents; risky logic gets planners and sonnet builders.

## Phase 6: the swarm runner

Write `scripts/claude-swarm-runner.sh`, which the coordinator or I can trigger to run a task's pipeline headlessly, one `claude -p --agent <name> --model <model>` process per stage, in sequence:

- Read the stages from `triage.md`'s `Pipeline:` line (or arguments), the models from each agent's `model:` frontmatter, and per-task overrides from `Overrides:`.
- Start the next stage only after the previous one ends with the DONE sentinel. BLOCKER, no sentinel, or a CLI error stops the run with distinct exit codes.
- When scanning for the sentinel, the script's grep command must be resilient to trailing whitespace and markdown bolding (e.g., using `grep -i -E '^\s*\*?\*?(DONE|BLOCKER)\*?\*?\s*$'`). Check only the last non-blank line; prefer `[[:space:]]` over `\s` for portable grep.
- After a challenger answers `VERDICT: CHANGES REQUESTED`, re-run its proposer in revise mode and the challenger again, at most twice.
- Ensure the script passes existing authentication environment variables (like `$ANTHROPIC_API_KEY` or the active Claude session config) to the sub-processes so they do not hang prompting for a login. Also check `claude auth status` and the CLI version before the first stage, and redirect stdin from `/dev/null`.
- Append each agent's `skills:` to its system prompt (`--append-system-prompt-file`) and pass the project's `permissions.allow` rules as `--allowedTools` (see the appendix for why).
- Offer `--dry-run`, write each stage's report into the task folder's `logs/`, and log one line per stage in `progress.md`.

After writing `scripts/claude-swarm-runner.sh`, you must immediately run `chmod +x scripts/claude-swarm-runner.sh` via the Bash tool so the coordinator can actually trigger it.

Test it without spending tokens (a stub `claude` on `PATH` that covers every exit path), then with one cheap live stage (a read-only haiku agent).

## Phase 7: SessionStart hook

`.claude/hooks/session-start.sh`, registered in `.claude/settings.json`, synchronous, idempotent, non-interactive. Plain-text stdout becomes Claude's context, so send tool output to stderr. In every session, print the task phases that still have unticked boxes in `docs/ai/tasks/*/progress.md`. In cloud sessions (`CLAUDE_CODE_REMOTE=true`), install dependencies at startup or whenever they are missing, and persist needed environment variables through `$CLAUDE_ENV_FILE`. Test a cold start, a warm resume and a local run.

## Phase 8: final verification and hand-off

1. Run typecheck, lint, all unit tests and the production build; quote the summary lines.
2. Cross-check every path, skill name, agent name and command mentioned in `CLAUDE.md`, `docs/ai/`, the skills and the agents: each one must exist.
3. Update the project's architecture documentation for the new folders.
4. Push, then give me a short summary: what was created, what was verified and how, what is left, and suggested next steps.

## Appendix: pitfalls found on the first run (Claude Code 2.1.28x)

- `claude -p --agent <name>` does not preload the agent's `skills:` (sub-agents spawned through the Agent tool do). The runner appends them to the system prompt.
- Headless runs in a workspace that was never opened interactively ignore the project's `permissions.allow` ("this workspace has not been trusted"). The runner passes the allowlist as `--allowedTools`, and another flag must follow that option because it takes several values.
- Agent teams (`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS`) are experimental and don't spawn teammates under `claude -p`; sub-agents plus hand-off files work in both modes.
- `next build` and `next dev` share `.next/`: building while the dev server runs breaks the dev server.
- The Playwright version pinned by the repo may expect a different browser build than the machine has; honor a `CHROMIUM_PATH` override in both the screenshot script and the Playwright config.
- In jsdom tests, packages whose `browser` export is ESM (for example `lucide-react`) need mapping to their CommonJS build; jest-dom matchers need a `.d.ts` import for TypeScript.
- `pkill -f <pattern>` can match its own shell when the pattern appears in the command; use `pkill -f "[p]attern"`.
- A small model will report success from stale artifacts when a command is denied. Say so explicitly in the skills: cite only evidence produced by your own run.
