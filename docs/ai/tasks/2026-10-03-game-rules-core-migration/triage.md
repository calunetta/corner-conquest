# Triage: Migrate game rules core logic into src/modules

Request: Move `src/lib/game-logic.ts`, `turn-progression.ts`, `bot-logic.ts`, `game-initializer.ts`,
`card-data.ts`, `player-data.ts` into `src/modules/<domain>/` per the component-architecture
standard (row #2 of `docs/ai/refactor.md`). Depends on row #1 (done), which these files already
import from `@/modules/game-rules`.
Type: refactor
Tier: L
Pipeline: architect-a architect-b implementer-a implementer-b tester-a tester-b architect-b:final-review
Overrides: implementer-a=sonnet, implementer-b=sonnet, tester-a=sonnet, tester-b=sonnet
Phases: 4

<!-- The Pipeline and Overrides lines are read by scripts/claude-swarm-runner.sh. Keep their format. -->

## Why this tier
- Six files verified by line count: `game-logic.ts` (86), `turn-progression.ts` (104),
  `bot-logic.ts` (242), `game-initializer.ts` (321), `card-data.ts` (55), `player-data.ts` (55).
  `bot-logic.ts` and `game-initializer.ts` both exceed the 150-line `max-lines` cap
  (`eslint.config.mjs:73`) that applies once they leave `LEGACY_PATHS` — each needs splitting
  across the component-architecture file types, not a straight move.
- Two layers: data (`card-data.ts`, `player-data.ts` — pure lookup tables) and logic
  (`game-logic.ts`, `game-initializer.ts`, `turn-progression.ts`, `bot-logic.ts`).
- `bot-logic.ts` is impure: imports `db, doc, updateDoc, setDoc` from `./firebase`
  (`src/lib/bot-logic.ts:5`) and writes directly to Firestore — this needs a `.service.ts`, not a
  reducer. `game-initializer.ts` and `bot-logic.ts` also call `Math.random()` extensively
  (non-deterministic — tests need seeding or injection, confirm approach with architect-a).
  The other four files are pure.
- Internal dependency order verified via imports: `game-initializer.ts` imports from
  `card-data.ts` and `player-data.ts`; `game-logic.ts` imports from `player-data.ts` and
  `game-initializer.ts`; `turn-progression.ts` and `bot-logic.ts` both import
  `@/modules/game-rules` (row #1, done) and are otherwise independent of each other.
- Call-site count per legacy path (grep across `src e2e docs scripts .claude CLAUDE.md`):
  `game-logic` 13, `turn-progression` 6, `bot-logic` 12, `game-initializer` 37, `card-data` 8,
  `player-data` 17 — every import must be repointed, this is a cross-module refactor touching
  widely-consumed files, so every builder is escalated to sonnet per the triage rule for L tasks
  and for Firestore-writing code.
- No gameplay rule changes (no game-designer stage), no new or changed UI (no ui-designer stage,
  no preview stage — these are data/logic files, not components).

## Scope
- In: moving the six files above into `src/modules/<domain>/` with the component-architecture
  file split (`.map.ts`/`.service.ts`/`.types.ts`/fixtures/tests as appropriate), repointing every
  import, splitting `bot-logic.ts` and `game-initializer.ts` under the 150-line cap.
- Out: `src/lib/types.ts` / `src/features/game/types.ts` (types migrate with whichever row first
  consumes them, per `docs/ai/refactor.md`'s "Not in scope" section) — leave only the type imports
  these six files need, don't do a types-only pass. `src/lib/firebase.ts` stays in place; only
  `bot-logic.ts`'s usage of it moves into a `.service.ts`. No behavior or rule changes — this is a
  structural move, verified by existing tests passing unchanged (modulo import paths) plus new
  tests for any file split out of a monolith.

## Open questions
- none
