# Triage: Resource collection feedback + farmer-boat reset

Request: On turn start, show visible feedback (toast) when a player's positioned resources are collected; confirm the turn log already records amount/resource per player; make a farmer's resource position clear after collecting so the unit visually returns to its boat instead of staying parked on the tile forever.
Type: feature
Tier: M
Pipeline: game-designer-a game-designer-b ui-designer-a ui-designer-b architect-a architect-b implementer-a implementer-b tester-a tester-b preview-a preview-b docs-sync architect-b:final-review
Overrides: implementer-a=sonnet, tester-a=sonnet
Phases: 1

<!-- The Pipeline and Overrides lines are read by scripts/claude-swarm-runner.sh. Keep their format. -->

## Why this tier
- Collection logic verified at `src/modules/game-rules/player-turn.reducer.ts:8-31` (`applyAutomaticCollection`), called from `handleEndTurn` (`:143-151`) for the incoming player every turn. It mutates `player.resources` and pushes a `pushLogEntry` with `category: 'economy', isPassive: true`.
- Log already records resource type + amount per player every time it becomes their turn (`src/modules/game-rules/log-entry.ts`, rendered by `src/modules/hud/components/GameLog/GameLog.tsx`), but entries are marked `isPassive: true` and hidden by default by `filterVisibleEntries` in `GameLog.map.ts` unless the user enables "Show routine activity" — this is almost certainly why it "doesn't seem to have happened."
- No toast fires today. A toast store/hook already exists (`src/modules/shared/toast-store.ts`, `use-toast.ts`) with one existing usage (`AbilitiesDialog.hook.ts`) to follow as the pattern.
- Farmer positions (`Player.positions`, `src/lib/types/map.ts:18-23`, set by `handleSelectResourceForPosition` in `src/modules/game-rules/resource-position.reducer.ts`) currently persist indefinitely — the army keeps collecting every turn with no code path that clears it. The visual farming vs. idle-at-boat sprite in `TileBoats.map.ts` (`showIdleCollector: !isPositionedOnResource`) already derives purely from that position state, so clearing the position on collection should make the boat sprite reappear automatically with no extra view-layer branching — but this is a real game-rule change (player must re-position the army each turn to keep collecting), not just a visual fix. Confirmed with the user: position should clear (not stay with only a cosmetic change).
- Bots were checked and do not call the resource-positioning reducer at all (`grep` for `resource-position`/`handleSelectResourceForPosition` across `src` found no bot module). So this change has no bot-AI side effect, but it does add a per-turn action requirement for human players — a balance/pacing change that needs the game-designer pair's sign-off (economy pacing, APM cost) before implementation, and the UI-designer pair for the toast copy/placement and any log-visibility change.
- Reducers touched (`player-turn.reducer.ts`, `resource-position.reducer.ts`) are game-rule code, so `implementer-a`/`tester-a` are escalated to sonnet per the model-escalation rule.
- `docs/architecture/game-mechanics.md` §5.3 ("Resources & Progression", documents collection-on-position-start-of-turn as a standing/repeating effect) and §6.3 ("Position" action) describe the current behavior and must be updated — `docs-sync` is mandatory.

## Scope
- In:
  - Toast feedback when the current client's player collects resources at turn start (resource types + amounts).
  - Decide and apply the log's default visibility for this event (keep `isPassive` hidden-by-default, or promote it) so it's clearly visible without digging — game/ui designers to confirm with the toast in place.
  - Clear `player.positions` (and the tile's `positionedBy` mirror) for a spot once it has been collected from, so the army no longer passively farms until re-positioned.
  - Verify (and adjust if needed) that the visual farmer sprite reverts to idle/at-boat once the position clears (expected to fall out of existing `TileBoats` logic, confirm in preview).
  - `docs/architecture/game-mechanics.md` updated for the new "collect once per position, then re-position to continue" rule.
- Out:
  - Any change to bot behavior (bots don't use this mechanic today).
  - Reworking the Productive-card dialog interception path (`state.productiveDialogState`) beyond what's needed to keep it consistent with the position-clearing change.
  - New boat/farmer animations beyond what the existing sprite states already support.

## Open questions
- None — farmer-boat behavior confirmed with the user as a real position-clear (not cosmetic-only).
