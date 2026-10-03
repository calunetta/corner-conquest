# Final review: Migrate game rules core logic into src/modules/game-rules, phase 1/4

VERDICT: APPROVED

## Checks run
- `npm run typecheck`: 4 errors, all in `src/modules/hud/` (untracked files belonging to the concurrent, unrelated `2026-10-03-game-header-migration` task — confirmed by filtering the output for lines outside `modules/hud`, which returned none). Zero errors in any file this phase touches (`src/modules/game-rules/*`, `src/lib/game-initializer.ts`, `src/lib/game-logic.ts`, the 17 repointed call sites).
- `npm run lint`: `✖ 2 problems (2 errors, 0 warnings)`, both in `src/modules/hud/components/GameStatusBadge/GameStatusBadge.test.tsx` (same unrelated concurrent task, unused `container` var). Zero lint errors in any Phase 1 file.
- `npx jest src/modules/game-rules --silent`: `Test Suites: 16 passed, 16 total` / `Tests: 201 passed, 201 total`.
- `npm test` (full suite): `Test Suites: 1 failed, 69 passed, 70 total` / `Tests: 2 failed, 701 passed, 703 total`. The 1 failing suite is `src/modules/hud/components/GameBoardHeader/GameBoardHeader.test.tsx` — same concurrent unrelated task, not this plan's scope. No failure in any card-data/player-data consumer.
- ui-verify: not applicable — plan's acceptance criteria state "No UI changed, so no preview/ui-verify step" (`plan.md:12`), and this phase is a pure data-constant relocation with no new/changed component.

The working tree currently mixes in-flight changes from four other sibling tasks (`game-dialogs-remaining-migration`, `game-header-migration`, `game-map-migration`, `game-panels-migration` — all visible as untracked folders/files in `git status`). All typecheck/lint/test failures found above trace to `src/modules/hud/` (that sibling task), not to anything owned by this phase. Isolating the check to this phase's files (git diff below) shows a clean result.

## Plan adherence
- `src/modules/game-rules/card-data.ts`, `player-data.ts` created — bodies verified byte-identical to `git show HEAD:src/lib/card-data.ts` / `player-data.ts` except the necessary import-path change (`./types` → `@/lib/types`, same barrel), matching the "unchanged body" contract (`plan.md:168-180`). Met.
- `src/modules/game-rules/index.ts` — both export lines added exactly as specified (`plan.md:56`). Met.
- All 17 Phase 1 call-site repoints (`combat-monster-resolve.reducer.ts`, `combat-player-resolve.reducer.ts` → relative `./player-data`; `MonsterAttackScreen.tsx`, `MonsterCombatDialog.map.ts`, `CombatDialog.map.ts`, `CustomSettingsSheet.tsx`, `CreateGameDialog.tsx`, `CardsDialog.tsx`, `SpecialIslandRollDialog.tsx`, `PlayerInfo.tsx`, `IslandTile.tsx`, `TileOccupants.tsx`, `AttackSelectionDialog.tsx`, `SabotageDialog.tsx`, `ArmySelectionDialog.tsx`, `StealResourceDialog.tsx`, `game-initializer.ts`, `game-logic.ts` → `@/modules/game-rules`) verified present and correct via `git diff`. Met.
- `src/lib/card-data.ts`, `src/lib/player-data.ts` deleted (`git status`: `D`). Met.
- No remaining import of either deleted path anywhere in `src`, `e2e`, `scripts`: `grep -rn "lib/card-data\|lib/player-data"` across those trees returns zero source-code hits (only prose references in `docs/`, `.claude/`, and other tasks' plan files — none are code imports, and none are in this phase's File plan to edit). Met for the acceptance criterion's "call site" sense.
- `npm run typecheck && npm run lint && npm test` pass for every file this phase owns. Met (see Checks).

## Findings
| # | File:line | Problem | Owner | Blocking? |
|---|---|---|---|---|
| 1 | `src/lib/game-initializer.ts:4-5` | Plan said "single import line" for the `BASE_CARDS`/`PLAYER_COLORS` repoint (`plan.md:73`); implementer-b left two separate `import { X } from '@/modules/game-rules'` lines. Cosmetic only — no lint rule flags duplicate import sources in this repo, typecheck/lint/tests all pass. | implementer-b | No |
| 2 | `.claude/agents/game-designer-a.md:20`, `.claude/skills/game-design/SKILL.md:28`, `.claude/skills/anti-hallucination/SKILL.md:18`, `docs/balance-simulator-guide.md:125` | These still cite `src/lib/card-data.ts`, which no longer exists after this phase. Not in this phase's (or any phase's) File plan — Phase 4's docs step only touches `docs/README.md`. Pre-existing plan gap already implicitly accepted at plan-approval time (no File plan entry proposes touching them), not a Phase 1 build defect. | — (plan gap, not this phase's build) | No |

## Docs
- `docs/README.md`: not updated — correct per plan, scheduled for Phase 4 (`plan.md:13,162`). `docs/README.md:163` still says `src/lib/player-data.ts`, expected until Phase 4 lands.

## progress.md
Confirmed for the coordinator to tick: implementation, tests (tester-a's "no new tests needed" call for card-data/player-data confirmed correct — pure re-exported constants, already covered transitively by every consumer's existing tests, none of which changed behavior), checks (typecheck/lint/unit tests), and final review for Phase 1. Previews/UI-verify boxes stay unticked — not applicable, per plan.
