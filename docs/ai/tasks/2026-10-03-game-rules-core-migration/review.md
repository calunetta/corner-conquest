# Final review: Migrate game rules core logic into src/modules/game-rules, phase 2/4

VERDICT: APPROVED

## Checks run
- `npm run typecheck`: clean, no output, exit 0. (An earlier run during review hit 1 error in untracked `src/modules/map/components/TileForest/TileForest.map.test.ts`, belonging to the concurrent `game-map-migration` task — gone on this run, and was never in this phase's scope regardless.)
- `npm run lint`: 55 errors, all in untracked `src/modules/cards/components/StealResourceDialog/*.preview.tsx` and `src/modules/map/components/{IslandTile,TileBoats,TileOccupants,TileResources}/*.test.ts` — confirmed via `git status --porcelain` (`??`) and `grep -i "game-rules"` on the lint output (zero hits). Zero lint errors in any file this phase owns.
- `npx eslint src/modules/game-rules/game-setup.reducer.ts src/modules/game-rules/map-generation.ts src/modules/game-rules/index.ts`: no output — confirms the `max-lines` rule (`eslint.config.mjs:73`, `skipBlankLines`/`skipComments` true) genuinely passes on `game-setup.reducer.ts` despite `wc -l` reporting 153 raw lines, and no `no-explicit-any` regression from the cast removal.
- `npx jest src/modules/game-rules src/lib/__tests__ scripts/balance-simulator`: `Test Suites: 39 passed, 39 total` / `Tests: 334 passed, 334 total` — every test this phase owns or touches passes, matching implementer-a's reported count.
- `npm test` (full repo, informational): 3 failing suites remain in untracked `src/modules/cards/components/{SabotageDialog,StealResourceDialog,WealthyDialog}/*.preview.test.tsx` — concurrent `game-dialogs-remaining-migration` task, not this plan's scope.
- ui-verify: not applicable — plan states no UI change (`plan.md:12`), confirmed: this phase touches no `.tsx` view file in a way that changes rendered output (only import repoints).

## Fix verification (re-review after implementer-a's revision)
- **Finding 1 (gratuitous casts)**: re-read `map-generation.ts` and `game-setup.reducer.ts` directly. All six casts are gone: `map-generation.ts:18,23,40,63` now assign `map2D[y][x].monsters = ...` / `map2D[y][x].type = islandType;` directly; `game-setup.reducer.ts:68,94` now assign `creatorTile.type = IslandType.Base;` / `botTile.type = IslandType.Base;` directly. `tsc --noEmit` confirms no type error results. Resolved.
- **Finding 2 (unplanned exports)**: re-read `index.ts`. Lines 3-4 now export exactly `createPlayer` and `{ defaultGameSettings, initializeGame, startGame }`, matching `plan.md:88` verbatim. `MONSTER_DATA`, `generateMonsters`, `generateIslandTerrain` are no longer exported from the module's public API. Resolved.

## Plan adherence
- `monster-catalog.ts`, `player-factory.ts`, `map-generation.ts`, `game-setup.reducer.ts` created; line counts 68/52/69/153 (eslint `max-lines` passes on all four — see Checks). Met.
- Base-placement-before-terrain ordering risk (plan.md Risks): confirmed `game-setup.reducer.ts:107` calls `generateIslandTerrain(map2D, settings)` only after the creator's base tile (`:67-76`) and every bot's base tile (`:93-103`) are already written — same order as the original `game-initializer.ts:177-278`. Met, mitigation correctly implemented.
- `game-setup.reducer.test.ts` ports all 3 original cases from `git show HEAD:src/lib/__tests__/game-initializer.test.ts`, assertions byte-identical. Met.
- `monster-catalog.test.ts`, `player-factory.test.ts` — new direct-unit coverage matching the Test plan's specified cases (outer-ring level-1/2 only, center can reach level-3/4, no duplicate monster names, debug/non-debug/bot resource and card branches, `fogOfWar` true/false `revealedTiles` seeding). Met.
- `src/lib/game-initializer.ts`, `src/lib/__tests__/game-initializer.test.ts` deleted. Met.
- All 17 call-site repoints in Phase 2's File plan verified present and correct via `git diff`: `Lobby.tsx`, `CreateGameDialog.tsx`, `game-logic.ts`, `game-board.session.hook.ts`, both `GameBoardContext*.characterization.test.tsx` + `gameBoardTestKit.tsx` doc comment, `bot-logic.test.ts`, `turn-progression.test.ts`, all 14 `game-rules/*.reducer.test.ts` + `player-exit.service.test.ts` fixture imports, `scripts/balance-simulator/{cli,engine,rng}.ts`. Met.
- Repo-wide grep for the old path (`grep -rln "game-initializer" src e2e scripts docs .claude .agents`) returns only documentation/history files (`docs/ai/lessons-learned.md`, `docs/ai/refactor.md`, `docs/balance-simulator-guide.md`, `docs/README.md`, skill files, other tasks' records) — none are code imports, and `docs/README.md`'s update is explicitly deferred to Phase 4 (`plan.md:162`). Met for this phase's acceptance-criteria scope.

## Findings
| # | File:line | Problem | Owner | Blocking? |
|---|---|---|---|---|
| 1 | `src/modules/game-rules/map-generation.ts:18,23,40,63`, `src/modules/game-rules/game-setup.reducer.ts:68,94` | FIXED — six gratuitous type casts removed, direct assignment restored, `tsc --noEmit` confirms no error. | implementer-a | Resolved |
| 2 | `src/modules/game-rules/index.ts:3,5` | FIXED — the three unplanned exports (`MONSTER_DATA`, `generateMonsters`, `generateIslandTerrain`) removed; `index.ts` now matches `plan.md:88` exactly. | implementer-a | Resolved |

## Docs
- `docs/README.md`: not updated — correct per plan, scheduled for Phase 4 (`plan.md:13,162`).

## progress.md
Both findings fixed and re-verified in this session (not taken on implementer-a's word alone): re-read `map-generation.ts`, `game-setup.reducer.ts`, `index.ts` directly, reran `tsc --noEmit`, `npm run lint`, and `npx jest src/modules/game-rules src/lib/__tests__ scripts/balance-simulator` (334/334 passing). Phase 2 boxes ticked: implementation, tests, checks, final review. Previews/UI-verify stay unticked — not applicable, per plan.
