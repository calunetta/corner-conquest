# Triage: Resource-gain animations (HUD + island tile)

Request: Play a gold/wood/food gain animation under the player's resource counts in the HUD, and on the island tile where that resource was actually collected, whenever a player's resource total increases.
Type: feature
Tier: L
Pipeline: ui-designer-a ui-designer-b architect-a architect-b implementer-a implementer-b tester-a tester-b preview-a preview-b docs-sync architect-b:final-review
Overrides: implementer-a=sonnet, implementer-b=sonnet, tester-a=sonnet, tester-b=sonnet, preview-a=sonnet, preview-b=sonnet
Phases: 2

<!-- The Pipeline and Overrides lines are read by scripts/claude-swarm-runner.sh. Keep their format. -->

## Why this tier

- Visible UI signal: yes — new animated feedback appears in two places the player watches every turn.
- Crosses modules: `src/modules/hud/components/PlayerInfo/` (HUD counts) and `src/modules/map/components/TileResources/` (island tile) are separate modules; `eslint.config.mjs:38-54` (`deepModuleImport`) forbids importing each other's internals directly, so any shared detection logic has to live in a module both can reach through a public index, or be duplicated per-module.
- Non-trivial file count once hooks, two view integrations, tests, and previews are counted — above the ~6-file single-phase guideline, so this is phased by layer (HUD first, tile second) rather than being one M-sized sitting.
- No gameplay or `GameState`/Firestore shape change — resources already increment in pure reducers; this is pure view-layer feedback, so `game-designer-*` is not needed.
- Risk is low (read-only reaction to existing state), but the trigger mechanism (detecting a per-resource-type, per-player, per-island delta) is new logic, not a copy of an existing pattern 1:1, so it goes through the architects rather than going straight to an implementer.

### Relevant code (verified)

- Resources actually increment in pure reducers — no firebase/Date.now/Math.random in the increment paths:
  - `src/modules/game-rules/player-turn.reducer.ts:21` `applyAutomaticCollection` — `player.resources[resourceSpot.type] += resourceSpot.amount`
  - `src/modules/game-rules/turn-start-passives.reducer.ts:62` `applyCollectorAbility` — `player.resources[resource.type] += 1`
  - `src/modules/game-rules/card-effects.reducer.ts:81`, `card-targeted-effects.reducer.ts:40,74` — card-driven gains
- HUD counts render in `src/modules/hud/components/PlayerInfo/PlayerInfoStats.tsx:84-101` (`.resourceChip`, `data-testid="player-info-resource-${type}"` at line 89, value span at line 91). Not in `ActionsPanel` — that component only reads resource costs to disable buttons (`ActionsPanel.map.ts:89,106,120`).
- Island tile resources render in `src/modules/map/components/TileResources/TileResources.tsx:29-78` (pure view) + `:81-86` (connected, via `useTileResources`).
- An existing transient-feedback pattern already does almost this for toasts: `src/modules/game-board/resource-collection-feedback.hook.ts` (`useResourceCollectionFeedback`, `:23-58`) diffs `gameState.log.length` against a `seenLogLength` ref, extracts new collection entries with a pure `findNewCollectionEntries` (`.map.ts`), and fires a toast per entry — this is the log-diffing approach the architects should evaluate reusing/extending rather than inventing a new detection mechanism, and it already has resource type + island + player on each log entry (confirmed by its toast content).
- `eslint.config.mjs:69` `max-lines: 150` applies to every new file.
- `src/testbed/registry.ts` needs a new/updated preview entry for each visually-changed component (`component-architecture`/`testbed-preview` skills).

## Scope

- In:
  - Three draft GIF assets (`gold_gain.gif`, `wood_gain.gif`, `food_gain.gif`, composited this session from the pack's own `G_Spawn.png`/`W_Spawn.png`/`M_Spawn.png`) copied into `public/` under a path the architects choose.
  - A per-resource-type, per-player gain detection mechanism (likely extending/reusing the `resource-collection-feedback` log-diff pattern), producing enough information to know: which player, which resource type, which island/tile.
  - HUD: a short-lived animation rendered under the matching resource chip in `PlayerInfoStats.tsx` when that player's count just increased.
  - Map: a short-lived animation rendered over the relevant `TileResources` tile when the collection happens there.
  - Tests (logic first, then view) and testbed previews for every new/changed visual state.
  - `docs-sync` if `docs/architecture/*.md` documents the current toast-only feedback mechanism and this changes player-visible behavior.
- Out:
  - Any change to resource amounts, collection rules, bot behavior, or `GameState`/Firestore shape.
  - Replacing the existing toast feedback (`resource-collection-feedback.hook.ts`) — this adds animations alongside it unless the architects find a reason to fold them together.
  - Final art polish on the GIFs themselves (they're a first draft from this session, not reviewed for game-feel timing).

## Open questions

- None — proceeding to architects for the detection-mechanism design; they'll confirm whether to extend `resource-collection-feedback.hook.ts` or add a sibling, and the exact asset path under `public/`.
