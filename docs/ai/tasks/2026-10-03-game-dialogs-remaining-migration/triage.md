# Triage: Migrate the remaining game dialogs into src/modules

Request: Move the 13 legacy dialogs still in `src/features/game/dialogs/` (row #4 of
`docs/ai/refactor.md`: `AbilitiesDialog`, `ArmySelectionDialog`, `AttackSelectionDialog`,
`CardsDialog`, `ConfirmExitDialog`, `HostLeaveDialog`, `MonsterSelectionDialog`, `PositionDialog`,
`ProductiveCardDialog`, `SabotageDialog`, `SpecialIslandRollDialog`, `StealResourceDialog`,
`WealthyDialog`) into `src/modules/<domain>/` per component-architecture. Depends on row #3
(done — `2026-10-03-migrate-dialog-components`), whose plan.md established that
`GameDialogManager.tsx` itself stays at its legacy path and only its imports change, since a
module `.tsx` may never import `@/features/*` (only `*.hook.ts` is exempted).
Type: refactor
Tier: L
Pipeline: architect-a architect-b implementer-a implementer-b tester-a tester-b preview-a preview-b architect-b:final-review
Overrides: implementer-a=sonnet, implementer-b=sonnet, tester-a=sonnet, tester-b=sonnet
Phases: 5

<!-- The Pipeline and Overrides lines are read by scripts/claude-swarm-runner.sh. Keep their format. -->

## Why this tier
- All 13 files verified by line count: `AbilitiesDialog` 125, `ArmySelectionDialog` 116,
  `AttackSelectionDialog` 100, `CardsDialog` 120, `ConfirmExitDialog` 55, `HostLeaveDialog` 67,
  `MonsterSelectionDialog` 80, `PositionDialog` 90, `ProductiveCardDialog` 111, `SabotageDialog` 76,
  `SpecialIslandRollDialog` 115, `StealResourceDialog` 183, `WealthyDialog` 93 — 1,331 LOC total.
  `StealResourceDialog.tsx` exceeds the 150-line `max-lines` cap (`eslint.config.mjs:73`) once it
  leaves `LEGACY_PATHS` and will need splitting, same pattern as `MonsterCombatDialog` in row #3.
- Grepped all 13 files for `firebase`, `Math.random`, `Date.now`: no hits. All are pure,
  prop-driven view components (same shape as row #3's `CombatDialog`/`MonsterCombatDialog`) —
  no `.service.ts` needed for any of them.
- Row #3's precedent directly applies and must not be re-litigated: `GameDialogManager.tsx`
  (`src/features/game/components/GameDialogManager.tsx`) imports and renders all 13 of these
  dialogs plus calls `useGameBoard()` itself; it cannot move into `src/modules` (no `.tsx` under
  `src/modules/**` may import `@/features/*`, and a `.hook.ts` may never return JSX). Only its
  import lines change, once per dialog as each one migrates.
- This is ~6.5x row #3's scope (2 components migrated there vs. 13 here) spread across several
  domains (card-effect dialogs, pre-combat/movement dialogs, session dialogs) — comfortably past
  tier M's single-domain, ~6-file-per-phase budget, and past the "feature across modules" line
  into tier L. Every builder is escalated to sonnet per the triage rule for L tasks.
- No gameplay/rule changes, no Firestore shape changes. Visuals must stay pixel-identical (same
  "no ui-designer stage" call as row #3 — this is a structural move, not a redesign), but each
  dialog is a new/changed component so the preview stage stays in, per row #3.
- Call-site counts (files referencing each dialog's name, repo-wide, source file excluded):
  `AbilitiesDialog` 5, `ArmySelectionDialog` 8, `AttackSelectionDialog` 7, `CardsDialog` 5,
  `ConfirmExitDialog` 3, `HostLeaveDialog` 3, `MonsterSelectionDialog` 7, `PositionDialog` 7,
  `ProductiveCardDialog` 7, `SabotageDialog` 14, `SpecialIslandRollDialog` 8,
  `StealResourceDialog` 8, `WealthyDialog` 8 — every import must be repointed in
  `GameDialogManager.tsx` and in each dialog's own tests.

## Scope
- In: moving all 13 dialogs into `src/modules/<domain>/` with the component-architecture split
  (view/.hook.ts/.styles.ts/.map.ts/.types.ts/fixtures/tests/.preview.tsx), splitting
  `StealResourceDialog.tsx` under the 150-line cap, repointing `GameDialogManager.tsx`'s imports
  dialog-by-dialog, testbed previews for each, deleting each legacy file once its replacement is
  verified. Domain grouping (e.g. which dialogs share a `cards` vs. a `combat`/movement vs. a
  session/misc domain) and the exact phase split are architect-a's call, informed by row #3's
  `combat` domain precedent.
- Out: any change to dialog content, copy, game rules, or `GameBoardContext`; migrating
  `GameDialogManager.tsx` itself (stays legacy per row #3's established decision); row #5
  (game panels) and later rows, which depend on this one finishing.

## Open questions
- none
