# Triage: Migrate src/lib/actions reducers to src/modules/game-rules

Request: Migrate `src/lib/actions/{attack,player,card,movement}.ts` (pure reducer functions, no React) to `src/modules/game-rules/*.map.ts` under the component-architecture standard, with tests.
Type: refactor
Tier: L
Pipeline: architect-a architect-b implementer-a implementer-b tester-a tester-b architect-b:final-review
Overrides: implementer-a=sonnet, implementer-b=sonnet, tester-a=sonnet, tester-b=sonnet
Phases: 2

<!-- The Pipeline and Overrides lines are read by scripts/claude-swarm-runner.sh. Keep their format. -->

## Why this tier
- 4 files, one layer (pure logic, no React): `src/lib/actions/attack.ts` (376 LOC), `src/lib/actions/player.ts` (351 LOC), `src/lib/actions/card.ts` (264 LOC), `src/lib/actions/movement.ts` (154 LOC) — 1,145 LOC total, verified with `wc -l`.
- No gameplay rule changes, no visible UI — these are the existing rules engine, moved and restructured, not redesigned. Game-designer/ui-designer stages are skipped.
- Risk signal is high: these are the game-rule reducers `docs/README.md` describes as the source of truth. A cross-module refactor of game-rule reducers escalates every builder to sonnet per triage rule 4, and qualifies as tier L (cross-module refactor) rather than M.
- `src/modules/` currently has one precedent folder (`game-board`); this introduces the first `.map.ts`-only module with no view layer, so the architects need to confirm the pattern still fits.
- No component is created and no visual state changes, so `preview-a`/`preview-b` are dropped per triage rule 3.
- `src/lib/actions/resource.ts` and `index.ts` are explicitly out of scope — only the 4 named files move.

## Scope
- In: convert `attack.ts`, `player.ts`, `card.ts`, `movement.ts` into `.map.ts` pure functions under `src/modules/game-rules/`, matching `component-architecture` conventions (types, index, tests); update all call sites; port/extend unit tests for each reducer.
- Out: `src/lib/actions/resource.ts`, `index.ts`, any reducer behavior change, Firestore document shape, UI/view code.

## Open questions
- None — architect-a to confirm the exact module/file split and phase boundary (likely by reducer-count or by call-site risk) and record it in `plan.md`.
