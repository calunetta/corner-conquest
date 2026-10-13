# Triage: Special island — broken temple idle art + card-reveal animation

Request: Replace the special island tile's `Star` icon with a broken-temple sprite (idle state, always shown). When a player actually receives a card from that island — either the first-ever discovery (auto-granted) or a later roll that succeeds — play a one-shot reveal animation on that tile (flash → card rises → settles with sparkle), then return to idle. No animation on a failed roll or when the hand is full / deck is empty.
Type: feature
Tier: L
Pipeline: ui-designer-a ui-designer-b architect-a architect-b implementer-a implementer-b tester-a tester-b preview-a preview-b docs-sync architect-b:final-review
Overrides: implementer-a=sonnet, implementer-b=sonnet, tester-a=sonnet, tester-b=sonnet, preview-a=sonnet, preview-b=sonnet
Phases: 2

<!-- The Pipeline and Overrides lines are read by scripts/claude-swarm-runner.sh. Keep their format. -->

## Why this tier

- **`GameState` shape change** (automatic L criterion): triggering the animation for every viewer in a multiplayer match (not just the acting player) requires a shared, synced signal — the same way unit deaths already work. This needs a new array on `GameState`, e.g. `cardRevealAnimations: CardRevealAnimation[]`, mirroring the existing `deathAnimations: DeathAnimation[]` (`src/lib/types/combat.ts:26-31`, `src/lib/types/game.ts:63`).
- Crosses modules: `game-rules` (two pure reducers push the new entries), `game-board` (engine hook schedules clearing it, a Firestore service function clears it, the roll-dialog UI state needs to carry tile coordinates it doesn't carry today), `cards` (`SpecialIslandRollDialog` state), `features/game` (`GameDialogManager` wiring), `map` (`IslandTile` rendering). `eslint.config.mjs:38-54` `deepModuleImport` blocks reaching into another module's internals directly, so each module reads/writes only through its own reducer or public index.
- Visible UI signal: yes — insert `ui-designer-a/b`. Note for them: the actual art (idle frame + reveal animation) and the auto-clear-and-revert mechanism are already decided this session (see Scope) — their job is placement/responsive sizing/motion-reduced fallback, not redesigning the art or the trigger rule.
- No gameplay/economy change — card odds, hand limit, deck logic are untouched. `game-designer-*` not needed.

### Relevant code (verified this session)

- Tile currently renders `<Star className={styles.specialIcon} />` for `IslandType.Special` at `src/modules/map/components/IslandTile/IslandTile.tsx:67` (style at `IslandTile.styles.ts:57`).
- **First-ever discovery** (silent today, no dialog): `src/modules/game-rules/island-discovery.reducer.ts:6` `revealIsland(state, x, y, isScout)` — `x`/`y` are already function params. The card-drawn branch is `:60-69` (`player.specialCards.push(drawnCardResult)`), guarded by `!isScout` (`:38`) and the hand-full/deck-empty branches above it (`:39-76`) — only the success branch should push a reveal-animation entry.
- **Later landings**: `src/modules/game-board/game-board.tile-click.hook.ts:79-85` opens `SpecialIslandRollDialog` only when `isRevealedSpecial` (already in `localPlayer.revealedTiles`). The roll itself is a real shared reducer, not client-only random: `src/modules/game-rules/card-acquisition.reducer.ts:90` `handleRollOnSpecialIsland(state, payload?: { roll?: number })`, dispatched via `GameAction.RollOnSpecialIsland` from `src/features/game/components/GameDialogManager.tsx:138`. Today's payload is just `{ roll }` — it has no `x`/`y`, so the reducer can't know which tile to animate. The dialog's own state (`SpecialIslandRollDialogState`) also doesn't carry tile coordinates today — both need to gain `x`/`y` (set when `tile-click.hook.ts:84` opens the dialog, threaded through to the `onRoll` dispatch at `GameDialogManager.tsx:138`). The success branch is `:118-128` (`cardDrawn = drawnCardResult`) — only that branch pushes the animation; roll-no-card (`:136-141`), hand-full (`:97-102`), and empty-deck (`:129-134`) branches must not.
- **Existing pattern to mirror exactly**: `DeathAnimation` (`src/lib/types/combat.ts:26-31`) is pushed by reducers, matched per-tile in `src/modules/map/components/IslandTile/IslandTile.hook.ts:26-31` (`deathAnimationOnTile`, matched by `x`/`y` + elapsed time vs `DEATH_ANIMATION_DURATION`), and cleared by the session driver in `src/modules/game-board/game-board.engine.hook.ts:122-148` (scheduled `setTimeout` per animation `id`, then a Firestore clear call — find the sibling of `clearDeathAnimations` in `src/modules/game-board/services/game-board.engine.service.ts`). The one-shot playback itself is `src/modules/map/components/DeathEffect/` (`DeathEffect.tsx` + `.hook.ts` + `.types.ts`): a `key`+cache-busting-query-param remount trick forces the GIF to restart from frame 0 every time a new animation `id` mounts, and a `setTimeout` matching `DEATH_ANIMATION_DURATION` hides it afterward. The new feature should reuse this shape (`{id, x, y, createdAt}` at minimum) and this exact component pattern, not invent a new one.

## Scope

- In:
  - Idle art: `public/sprites/special_island_idle.png` (185×173, transparent) — already copied in, replaces the `Star` icon whenever `island.type === IslandType.Special` and no reveal animation is active on that tile.
  - Reveal animation: `public/sprites/special_island_reveal.gif` (186×179, transparent, 3 frames, ~1.4s, `loop=1`) — already copied in, both sourced/cropped from the user-supplied reference image this session. Plays once via the `DeathEffect`-style mechanism, then the tile reverts to idle art.
  - New `GameState` field (name/shape/file location: architect's call, but mirror `DeathAnimation`) pushed by the two success branches above, cleared the same way `deathAnimations` is cleared.
  - Threading `x`/`y` through `SpecialIslandRollDialogState` and the `RollOnSpecialIsland` action payload so the reducer knows which tile to animate.
  - `IslandTile` idle/reveal rendering, its hook's animation-matching logic, styles, tests, and a testbed preview state for both idle and mid-reveal.
  - `docs-sync` on `docs/architecture/game-mechanics.md:35` ("Special Islands: ...") if this is judged a player-visible behavior change worth documenting (it's new feedback for existing mechanics, not a rule change).
- Out:
  - Any change to card odds, hand limit, deck/discard logic, or `IslandType.Special` map generation.
  - The `SpecialIslandRollDialog`'s own dialog content (it keeps showing the roll result as today) — the animation is on the map tile, not inside the dialog, per explicit user direction.
  - Resource-gain animations (separate task: `docs/ai/tasks/2026-10-13-resource-gain-animations/`, plan only for now).
  - New art direction — the idle/reveal assets are locked in from the user's reference image; only placement, sizing, and timing are open for this task's designers/implementers to adjust.

## Open questions

- None — proceeding to `ui-designer-a` for placement/responsive sizing, then the architects for the `GameState` field and reducer wiring.
