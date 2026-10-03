# Triage: Migrate dialog components to src/modules

Request: Migrate GameDialogManager.tsx, CombatDialog.tsx, and MonsterCombatDialog.tsx from src/features/game/ into src/modules/, following component-architecture (view/hook/styles/map/types split), since they are the direct view-layer consumers of the already-migrated GameBoardContext.
Type: refactor
Tier: M
Pipeline: architect-a architect-b implementer-a implementer-b tester-a tester-b preview-a preview-b architect-b:final-review
Overrides: none
Phases: 3

<!-- The Pipeline and Overrides lines are read by scripts/claude-swarm-runner.sh. Keep their format. -->

## Why this tier
- Files touched (verified): [src/features/game/components/GameDialogManager.tsx](../../../../src/features/game/components/GameDialogManager.tsx) (273 LOC), [src/features/game/dialogs/CombatDialog.tsx](../../../../src/features/game/dialogs/CombatDialog.tsx) (250 LOC), [src/features/game/dialogs/MonsterCombatDialog.tsx](../../../../src/features/game/dialogs/MonsterCombatDialog.tsx) (354 LOC) — 877 LOC total, view layer only.
- No gameplay/rule changes, no Firestore shape changes, no new visible UI — behavior must stay pixel-identical. Each legacy file likely expands into 4-6 new files under the component-architecture split (view, .hook.ts, .styles.ts, .map.ts/.types.ts, tests, .preview.tsx), so total file count across the 3 components exceeds the single-phase budget of ~6 files.
- Risk: these are the direct consumers of GameBoardContext; a structural slip here could silently break combat/monster-combat flows across all players. Architect planning and preview verification are warranted even though no gameplay changes.

## Scope
- In: moving/splitting the 3 named components into src/modules/<domain>/ per component-architecture, preserving exact current behavior and visuals; updating import sites; testbed previews for each.
- Out: any change to dialog content, copy, game rules, combat math, or GameBoardContext itself (already migrated).

## Open questions
- none
