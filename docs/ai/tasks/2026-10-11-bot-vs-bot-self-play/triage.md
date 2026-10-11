# Triage: Bot-vs-bot self-play testing (rule-bug track + UI-bug track)

Request: add a self-play mode where two bots play each other so rule/balance bugs and UI/UX bugs can be found, with a Claude review step after the (free) simulation instead of a Claude call per move or per turn.
Type: feature
Tier: L
Pipeline: architect-a architect-b implementer-a implementer-b tester-a tester-b architect-b:final-review
Overrides: implementer-a=sonnet, implementer-b=sonnet, tester-a=sonnet, tester-b=sonnet
Phases: 2

<!-- The Pipeline and Overrides lines are read by scripts/claude-swarm-runner.sh. Keep their format. -->

## Why this tier
- Spans two independent layers that don't share files, so it naturally splits into 2 phases:
  - Phase 1 (headless rule-bug track): `scripts/balance-simulator/engine.ts` (192 lines today), `cli.ts` (85 lines) already run free headless batches via `runAll`/`runMatch` and aggregate into `ConfigMetrics`/`RunReport` (`metrics/`, `report/`). That part is mostly built. New work: surface per-match anomalies (e.g. a caught reducer error in `game-rules.reducer.ts:33-142`'s catch-and-return-original-state path, or an invalid/no-op bot action) into the report, and add a new review agent that reads the aggregated report + `docs/architecture/game-mechanics.md` and flags rule/balance bugs. No `GameState` or Firestore shape changes; `takeBotTurn` (`services/bot-turn.service.ts:9-16`) stays the only I/O touchpoint and is already stubbed in tests.
  - Phase 2 (UI-bug track): new Playwright e2e spec that drives two real browser contexts against the Firestore emulator (pattern: `e2e/reconnect-bot-takeover.spec.ts`, `e2e/gameplay.spec.ts`), translating `decideBotTurn`'s pure output (`bot-turn.reducer.ts:14-27`, not currently exported from `src/modules/game-rules/index.ts` — only the I/O-wrapped `takeBotTurn` is) into real clicks/drags instead of calling the reducer directly. Captures screenshots/console/network errors per turn, filters to flagged turns, and a second review agent inspects the filtered subset for broken interactions. `e2e/**/*.ts` is exempt from `max-lines` and `no-restricted-imports` (`eslint.config.mjs:116-121`), so the spec can import `bot-turn.reducer.ts` directly despite the deep-import rule.
- Gameplay signal: no — no rule, number, card, monster, economy or win-condition change. `game-designer-*` not needed.
- Visible UI signal: no new player-facing UI or component; the e2e spec only drives the existing UI. `ui-designer-*`, `preview-a`, `preview-b` not needed.
- Data signal: no Firestore document shape or `GameState` field changes.
- Risk: two new Claude Agent SDK agent definitions (not application code) have to be authored with the right inputs/model/tools — unusual work for `implementer-a`/`implementer-b`'s normal logic/view split, so `plan.md` must say explicitly who owns the two `.claude/agents/*.md` files per phase. Phase 2 also has real concurrency (two simultaneous browser contexts) and depends on exporting or otherwise reaching the pure bot-decision function, which is a boundary change `architect-a` has to decide (export `decideBotTurn` from the module's public index vs. a test-only deep import).
- `docs/ai/refactor.md` has no row for this path, and no game-rule or architecture behavior changes, so `docs-sync` is dropped for both phases — this is testing infrastructure, not documented game behavior. If a phase ends up changing something in `docs/architecture/*.md` anyway (e.g. documenting the new bot-logic entry point), say so in that phase's `progress.md` and add the doc update inline rather than invoking the mandatory stage.
- All builders escalated to sonnet per the L-tier rule, not case-by-case: this is tooling that other tasks will build on, and phase 2 touches concurrency.

## Scope
- In: headless batch rule/balance bug review (phase 1); UI-driven bot-vs-bot Playwright track with filtered screenshot/log review (phase 2); the two new review-agent definitions; wiring bot decisions into real UI interactions for phase 2.
- Out: any LLM call during actual gameplay (both tracks simulate for free; Claude only reviews aggregated/filtered output); changing bot decision logic itself (`bot-army-actions.reducer.ts` etc. are reused as-is); changing game rules, balance numbers, or Firestore schema; new player-facing UI.

## Open questions
- None — proceed with architect-a on phase 1.
