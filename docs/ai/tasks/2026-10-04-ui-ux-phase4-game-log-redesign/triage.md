# Triage: Game log readability redesign

Request: implement the approved spec in this folder's ui-design.md ("Final spec" section) — redesign GameLog for readability: GameState.log changes from string[] to a backward-compatible discriminated union (string | StructuredLogEntry) carrying playerId/category/turn/isMilestone/isPassive; ~61 state.log.push(...) call sites across 14 reducer files push structured entries via a shared helper; GameLog gains turn-divider grouping, player-color accents, a declutter toggle, and rewritten copy.
Type: feature (cross-module)
Tier: L
Pipeline: architect-a architect-b implementer-a implementer-b tester-a tester-b preview-a preview-b architect-b:final-review
Overrides: implementer-a=sonnet, implementer-b=sonnet, tester-a=sonnet, tester-b=sonnet, preview-a=sonnet, preview-b=sonnet
Phases: 2 (estimate — architect-a to confirm/cut)

## Why this tier
- `GameState.log` is a persisted Firestore field (`src/lib/types/game.ts:41`) changing shape — the table's explicit L trigger ("GameState or Firestore shape change").
- Crosses two modules: `src/modules/game-rules` (14 reducer files, ~61 `log.push` call sites, one new shared helper) and `src/modules/hud/components/GameLog` (types/map/hook/view/styles, new player-color-class helper).
- Real migration risk already identified by the independent design review: 32 existing assertions across 11 `*.reducer.test.ts` files do `entry.includes(...)` / `.log.some(...)` directly on log strings and will break once entries become structured objects — not a cosmetic ripple, a correctness-affecting change to how every `game-rules` reducer test asserts its log output.
- `ui-design` stage already ran and was independently reviewed (ui-designer-a → ui-designer-b, VERDICT: APPROVED after a genuine — not self-written — challenge pass that caught a turn-0 divider edge case, a citation error, and the understated test-migration risk).
- Every builder escalated to sonnet per the L-tier rule, not only the ones touching `game-rules` reducers directly, since the reducer-shape change and its 11-file test migration are the load-bearing risk of this task.

## Scope
- In: `GameState.log` shape change + shared push helper in `src/modules/game-rules`; migrating all ~61 call sites; updating the 11 affected `*.reducer.test.ts` files' assertions; `GameLog` consuming the new shape (turn dividers, color accents, declutter toggle, rewritten copy); the new `PlayerColor`-to-text-class helper (reusing the `PlayerInfo.styles.ts:3-22` const-object pattern per the review, not `player-sprite.ts`'s function shape); backward-compat rendering for legacy plain-string entries already in in-progress matches' Firestore documents (no migration script — matches are short-lived, append-only documents).
- Out: `ActionsPanel`/mobile actions-panel work (separate Phase 3 task, confirmed non-overlapping by the design review), any other `game-rules` behavior change.

## Open questions
- None — architect-a to propose the exact phase split (likely: Phase 1 = game-rules shape + helper + test migration, zero visible change; Phase 2 = hud consumption, visible change, previews).
