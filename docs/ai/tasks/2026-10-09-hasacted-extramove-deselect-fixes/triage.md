# Triage: hasActed/Extra Move consistency + Deselect Army card refund

Request: Fix three confirmed game-rules bugs found during the functionality audit (`docs/ai/functionality-audit.md` points 53, 61, 77): defeated armies wrongly reset to `hasActed:false` on respawn, Extra Move inconsistently forces `hasActed:true` on armies that hadn't acted, and "Deselect Army" doesn't refund an in-progress pending card.
Type: bug
Tier: S
Pipeline: architect-a architect-b implementer-a tester-a architect-b:final-review
Overrides: none
Phases: 1

## Why this tier
- All three bugs are confined to `src/modules/game-rules/*.reducer.ts` (pure logic, no view files) plus one hook (`src/modules/game-board/game-board.local-actions.hook.ts`) — no new UI, no new types.
- Root cause already located for all three (see plan.md Verified context / Root cause). No exploratory work needed, just a targeted conditional fix plus one dispatch wiring.
- Risk is moderate because `hasActed` gates nearly every army action — needs full reducer test coverage before merge, not just the three bug sites.

## Scope
- In: `combat-player-resolve.reducer.ts`, `combat-monster-resolve.reducer.ts` (respawn `hasActed`); `combat-player-roll.reducer.ts`, `combat-monster-roll.reducer.ts`, `resource-position.reducer.ts` (Extra Move `hasActed` consistency, matching the pattern already correct in `movement.reducer.ts`); `game-board.local-actions.hook.ts` (`local_DeselectArmy` refunding pending card state).
- Out: the Extra Move UI banner/copy, the Escape-key dual-branch behavior (separate, lower-priority doc inaccuracy — not touched here), any other card.

## Open questions
- None — behavior was specified exactly by the user in the audit review.
