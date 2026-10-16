# Triage: Mobile Event Log expansion panel

Request: On mobile, surface the Event Log as an expandable panel the player opens from the game-actions UI, instead of a static block the player scrolls past; desktop stays unchanged.
Type: feature
Tier: M
Pipeline: ui-designer-a ui-designer-b architect-a architect-b implementer-a implementer-b tester-a tester-b preview-a preview-b docs-sync architect-b:final-review
Overrides: none
Phases: 1

<!-- The Pipeline and Overrides lines are read by scripts/claude-swarm-runner.sh. Keep their format. -->

## Why this tier
- Visible UI signal: yes — new mobile-only interaction surfacing `src/modules/hud/components/GameLog/GameLog.tsx` (currently rendered inline in `src/features/game/components/GameBoard.tsx:75`, inside the `aside` that stacks below the map on mobile).
- One module (`hud`), but a new component (a mobile Event Log trigger + sheet/expansion) plus wiring changes in `ActionsPanel`/`MobileActionsBar`/`MobileActionsSheet` (`src/modules/hud/components/ActionsPanel/`) and `GameBoard.tsx` — more than a 1–3 file "obvious pattern" tweak, so S is too small.
- No gameplay/rule change, no Firestore shape change, no new `GameState` field — L's signals don't apply.
- Existing primitives already cover the mechanics: `src/components/ui/sheet.tsx` (used by `MobileActionsSheet.tsx`) and the existing `MobileActionsBar` "More Actions" bottom-sheet pattern (`src/modules/hud/components/ActionsPanel/MobileActionsBar.tsx`, `MobileActionsSheet.tsx`).

## Scope
- In: mobile-only presentation of the Event Log as an on-demand expansion/panel reachable from the mobile actions UI (e.g. a button in `MobileActionsBar` or an entry in `MobileActionsSheet` that opens the `GameLogView` in a sheet). Keep `GameLogView`/`useGameLog` logic as the single source of truth; only add a mobile trigger + presentation wrapper.
- Out: desktop layout in `GameBoard.tsx` (the `aside` with `ActionsPanel` + `GameLog` stays exactly as is), any change to `GameLog.hook.ts` / `GameLog.map.ts` log content or filtering logic, any change to `ActionsPanel`'s desktop view.

## Open questions
- None — user specified desktop stays as-is, mobile gets an expandable panel triggered from the actions area.
