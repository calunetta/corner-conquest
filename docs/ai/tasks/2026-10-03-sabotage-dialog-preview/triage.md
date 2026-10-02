# Triage: SabotageDialog testbed preview

Request: Add a testbed preview for SabotageDialog so its states are visible without starting a match.
Type: component
Tier: S
Pipeline: implementer-a tester-a
Overrides: none
Phases: 1

<!-- The Pipeline and Overrides lines are read by scripts/claude-swarm-runner.sh. Keep their format. -->

## Why this tier
- `src/features/game/dialogs/SabotageDialog.tsx`: pure props-driven component (`players: Player[]`, `onSabotage`, `onClose`), no `useGameBoard` or Firestore coupling — safe to render directly per `testbed-preview`'s "never the connected component" rule.
- One new file (`src/testbed/legacy/SabotageDialog.preview.tsx`) plus one registry edit (`src/testbed/registry.ts`): single layer (view), under the ~6-file S/M threshold.
- No gameplay, Firestore, or `GameState` shape change (Gameplay/Data/Risk signals: no). Visible UI: yes, but it's an existing dialog rendered in isolation, not a new player-facing surface — implementers can follow the established `MapZoomControls.preview.tsx` pattern without a UI-design pass.
- Confirmed by reading the component: an earlier candidate (`GameStatusBadge`) was rejected because it calls `useGameBoard()` directly with no pure view to render, which the `testbed-preview` skill forbids.

## Scope
- In: `src/testbed/legacy/SabotageDialog.preview.tsx` (states: two opponents, full 3-opponent grid, long-name truncation edge case), a `registry.ts` entry, player fixture data for the preview.
- Out: Any change to `SabotageDialog.tsx` itself or `GameBoardContext`. No new app route or Firestore wiring.

## Open questions
- none
