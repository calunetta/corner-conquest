# Plan: Migrate game rules core logic (game-logic, turn-progression, bot-logic, game-initializer, card-data, player-data) into src/modules/game-rules

Status: APPROVED
Inputs: triage.md

## Goal and acceptance criteria
- [ ] `src/lib/game-logic.ts`, `turn-progression.ts`, `bot-logic.ts`, `game-initializer.ts`, `card-data.ts`, `player-data.ts` no longer exist. Every symbol they exported lives in `src/modules/game-rules/` (same module as `docs/ai/refactor.md` row 1 — row 2's "Domain" column also reads "Game rules — core logic").
- [ ] Every file over the 150-line lint cap (`eslint.config.mjs:73`) is split by responsibility, not by line count: `bot-logic.ts` (242 lines) and `game-initializer.ts` (321 lines) each become multiple files, none over 150 lines (lint `max-lines`), none using `any` (lint `no-explicit-any`).
- [ ] `bot-logic.ts`'s Firestore write (`db`, `doc`, `setDoc` from `./firebase`, `src/lib/bot-logic.ts:5,240`) ends up in a `.service.ts`; the bot's decision logic is pure `(state) => state` reducers, calling the service only for the final write.
- [ ] Every call site across `src`, `e2e`, `scripts`, `docs`, `.claude` resolves to `@/modules/game-rules` (or a relative import inside the module). No file imports from any of the six deleted legacy paths after its phase lands.
- [ ] All existing tests for these six files are ported with equivalent coverage (none deleted without a new home); `monster-catalog.ts`, `player-factory.ts` and `bot-turn.reducer.ts` get new direct-unit coverage where today they are only exercised indirectly through `initializeGame`/`takeBotTurn` integration tests.
- [ ] `npm run typecheck`, `npm run lint` and `npm test` pass at the end of every phase. No UI changed, so no preview/ui-verify step.
- [ ] `docs/README.md` reflects the new locations (§"src/lib/", §"src/modules/", the game-initializer/player-data/bot-logic prose references) in Phase 4, once the whole module is in its final shape.

## Verified context
| Symbol or file | Location | Why it matters |
|---|---|---|
| `addPlayerToGame`, `BASE_TILE_SIZE` | `src/lib/game-logic.ts:7,10` | the one reducer to move; imports `createPlayer` (`:4`) and `PLAYER_COLORS` (`:3`); 86 lines, no split needed |
| `hasPlayerRemainingActions` | `src/lib/turn-progression.ts:15` | pure predicate `(state, player, hasActiveDialogOrPendingAction?) => boolean`; already imports `getPossibleMoves` from `@/modules/game-rules` (`:3`); 104 lines, no split needed |
| `takeBotTurn` | `src/lib/bot-logic.ts:25` | **not pure** — clones state, runs the full bot decision tree, then `await setDoc(doc(db, 'games', gameId), state)` (`:5,240`). `console.log` debug lines at `:33,196,233,241` become lint errors (`no-console` only allows `warn`/`error`) once this leaves `LEGACY_PATHS` |
| `selectRandom`, `canAfford`, `BotAction` (local) | `src/lib/bot-logic.ts:7,12,16` | private helpers shared by every phase of the bot's decision tree; `BotAction.payload?: any` (`:20`) is a lint error once moved — becomes `unknown` |
| 4 phases inside `takeBotTurn`, by its own comments | `src/lib/bot-logic.ts:35(1. pre-turn cards),79(2. purchases),108(3. army actions loop),232(4. end turn)` | the natural split boundary: each phase is `(state) => state`, called in this exact order |
| `defaultGameSettings`, `MONSTER_DATA`, `generateMonsters`, `createPlayer`, `initializeGame`, `startGame` | `src/lib/game-initializer.ts:8,23,30,90,139,314` | 321 lines total, over cap; `generateMonsters` and `createPlayer` take/return neither `GameState` nor a view model — plain helpers, same category as `dice.ts` (`docs/ai/tasks/2026-10-03-game-rules-actions-migration/plan.md`'s Decisions); `initializeGame`/`startGame` produce/consume `GameState` — reducers |
| Map-generation loop | `src/lib/game-initializer.ts:219-278` | per-tile terrain/resource/monster assignment by distance-from-center `Math.random()` branching; skips tiles already `IslandType.Base` (`:223`); calls `generateMonsters` (`:275`) and `MONSTER_DATA[4]` directly for the center boss (`:229`) — this loop is the biggest extractable chunk |
| Player-base placement, 3 near-identical copies | `src/lib/game-logic.ts:59-67`, `src/lib/game-initializer.ts:177-187` (creator), `:203-213` (bots) | pre-existing duplication (verified: 3 copies of "build a Base island tile for a new player"). Out of scope to unify — see Decisions |
| `BASE_CARDS`, `SPECIAL_CARDS`, `USABLE_CARDS`, `SPECIAL_CARD_DESCRIPTIONS` | `src/lib/card-data.ts:4,12,29,41` | pure data; `SPECIAL_CARDS` has **zero** consumers anywhere in the repo (verified: `grep -rn "SPECIAL_CARDS\b" src e2e scripts` returns only its own definition) — pre-existing dead export, left untouched (see Decisions); 55 lines, no split |
| `PLAYER_COLORS`, `PLAYER_DATA`, `PlayerData`/`PlayerSpriteInfo` (local types) | `src/lib/player-data.ts:4,18` | pure data; 55 lines, no split |
| `GameAction`, `CardName`, `AbilityName`, `ResourceType`, `IslandType`, `GameStatus`, `Monster`, `MonsterName`, `Player`, `GameState`, `Island`, `IslandResource`, `GameSettings`, `BaseTileInfo`, `PlayerColor`, `Army`, `HAND_LIMIT`, `MAP_COLS`, `MAP_ROWS` | `src/lib/types/*.ts`, barrel `@/lib/types` | every type these six files need; all importable from the one barrel |
| `handleGameAction`, `getPossibleMoves`, `handleEndTurn` | `src/modules/game-rules/game-rules.reducer.ts`, `movement.reducer.ts`, `player-turn.reducer.ts`, all re-exported by `src/modules/game-rules/index.ts:19,6,16` | already-migrated row-1 reducers that `bot-logic.ts` and `turn-progression.ts` depend on |
| `handlePlayerExit` | `src/modules/game-rules/services/player-exit.service.ts:12` | precedent `.service.ts`: imports `db, doc, runTransaction` from `@/lib/firebase` (`:3`) directly — confirms a module file may import `@/lib/firebase` (not `LEGACY_PATHS`-restricted; the import-boundary lint rule only restricts `firebase/*`/`@/lib/firebase` to `*.service.ts` files, which this is) |
| `src/modules/game-rules/index.ts` | 19 lines, one `export` per reducer/service | the file every new export in this plan is added to |
| Every call site of the 6 files | verified via `grep -rn "from ['\"].*<name>['\"]" src e2e scripts` and `jest.mock(` for each of the six names | full list below, split per phase in File plan |
| `eslint.config.mjs:12-28` (`LEGACY_PATHS`), `:73` (`max-lines: 150`), `:69` (`no-explicit-any: error`), `:72` (`no-console`, allows `warn`/`error`) | lint config | `src/lib/**` stays in `LEGACY_PATHS` after this task — `firebase.ts`, `placeholder-images.ts`, `types.ts`, `types/`, `utils.ts` remain there per `docs/ai/refactor.md`'s "Not in scope"; no `eslint.config.mjs` edit needed |
| `docs/ai/tasks/2026-10-03-game-rules-actions-migration/plan.md` (APPROVED, merged) | precedent task, same module | established: flat module layout (no `components/` wrapper), `.reducer.ts` for pure `(state,...)=>state` game-rule logic (randomness/timestamps allowed, unlike `.map.ts`), `.service.ts` for the one Firestore-writing file, `payload: unknown` + per-case cast instead of `any`, ported-not-abandoned tests, docs updated once at the end |

## Decisions
- **Domain: `src/modules/game-rules/` (existing module), flat layout** — `docs/ai/refactor.md`'s own table names row 2 "Game rules — core logic" and every one of these six files already imports from, or is imported by, something in that module. Rejected: new `cards`/`players` domains for `card-data.ts`/`player-data.ts` (component-architecture's example domain list includes "cards", but no such module exists yet and nothing in this task's scope has a view — creating two new logic-only modules for ~110 lines of static data is speculative structure for data this module already needs internally).
- **Plain `.ts` for `monster-catalog.ts`, `player-factory.ts`, `map-generation.ts`, `bot-helpers.ts`**: none of these take or return `GameState` — they take/return `Monster[]`, `Player`, `Island[][]`, or primitives. Same reasoning the precedent task used for `dice.ts` ("fits neither `.reducer.ts` nor `.map.ts` — no `GameState` in or out"). `.reducer.ts` for `game-setup.reducer.ts` (produces/consumes `GameState`), `player-join.reducer.ts`, `turn-progression.ts` kept as a plain name (returns `boolean`, not `GameState` — a query, not a reducer, same "neither" category), and the four `bot-*.reducer.ts` files (all `(state) => state`).
- **`bot-logic.ts` splits into 6 files along its own 4 numbered phases, plus helpers and the service**: `bot-helpers.ts` (shared `selectRandom`/`canAfford`/`BotAction`), `bot-card-strategy.reducer.ts` (phase 1), `bot-purchases.reducer.ts` (phase 2), `bot-army-actions.reducer.ts` (phase 3, the biggest chunk at ~120 content lines — verify against the 150 cap at implementation time, split further by extracting the "score one army's options" inner logic into `bot-helpers.ts` if it runs over), `bot-turn.reducer.ts` (orchestrates all 4 phases, pure), `services/bot-turn.service.ts` (guard + Firestore write). Rejected: one `bot-ai.reducer.ts` with everything (over the cap); splitting by "first half / second half" of the loop (would cut phase 3's single coherent loop in half for no reason).
- **Guard moves from the reducer into the service**: the original `takeBotTurn` clones state, then checks `!botPlayer || !botPlayer.isBot || status !== 'playing'` and returns `void` with no write (`bot-logic.ts:27-31`). A pure reducer must always return a `GameState`, so `decideBotTurn(state)` (the new pure orchestrator) has no guard and assumes a valid bot turn; `takeBotTurn` (the service) checks the identical condition against `initialState` directly (cheaper — no clone needed to read two fields) before calling `decideBotTurn` and writing. Net behavior is identical: an invalid call still does nothing and writes nothing.
- **`console.log` debug lines (`bot-logic.ts:33,196,233,241`) are dropped, not converted to `console.warn`**: `no-console` (`eslint.config.mjs:72`) only allows `warn`/`error` outside `LEGACY_PATHS`, and these are debug trace lines, not actual warnings — mislabeling them `console.warn` would be worse than removing them. They are not game rules; dropping them is not a behavior change the acceptance criteria need to preserve.
- **`BotAction.payload` becomes `unknown`** (same fix the precedent task made to `HandleActionParams.payload`), matching `handleGameAction`'s own `payload: unknown` signature — no cast needed at the call sites that build `BotAction.payload` object literals.
- **No DRY extraction of the 3-copy "build a Base island tile" duplication** (`game-logic.ts:59-67`, `game-initializer.ts:177-187,203-213`) despite hitting the kiss-dry-solid "third copy" threshold: unifying them changes `game-logic.ts`'s mutate-in-place style to `game-initializer.ts`'s spread-and-replace style (or vice versa), which is a behavior-risking refactor beyond "move keeps function bodies as they were" (component-architecture, "Migrating a legacy component"/"Logic-only modules" rules) — this task's acceptance criteria are a structural move verified by unchanged tests, not a dedup pass. Left as a candidate for a future, dedicated refactor.
- **`SPECIAL_CARDS` (dead export) moves unchanged**: verified zero consumers repo-wide; removing it is a cleanup beyond "move", and the file is nowhere near the 150-line cap, so nothing forces the decision either way.
- **Phase order follows the dependency graph, not file-size**: card-data/player-data (zero intra-group deps) → game-initializer split (needs card-data/player-data) → game-logic + turn-progression (game-logic needs game-initializer's `createPlayer`/`player-data`'s `PLAYER_COLORS`; turn-progression needs only the already-migrated `@/modules/game-rules`) → bot-logic split (independent of the other 5 in production code, but its test fixtures need `game-initializer`, already available by then). Rejected: migrating bot-logic first (triage's "Why this tier" already orders the dependency graph this way; moving bot-logic earlier would leave its test fixtures importing a legacy path that outlives it).
- **`createPlayer` is exported from `index.ts`** even though only `game-logic.ts`/`player-join.reducer.ts` consumes it today: `game-logic.ts` needs it from Phase 2 (when `game-initializer.ts` dies) through Phase 3 (when `game-logic.ts` itself moves and becomes a same-module relative import) — during that window it is still a legacy file reaching into the module and must go through the public index, not a deep path. `MONSTER_DATA`/`generateMonsters` have no such external legacy consumer (verified via grep) and stay unexported.
- **`tester-b`'s role is integration/regression, not new view tests**: no UI changes. `tester-b` runs `npm run typecheck && npm run lint && npm test` repo-wide at the end of each phase, plus `npm run test:e2e -- e2e/gameplay.spec.ts` at the end of Phase 4 (bot turns and game setup underlie that spec). Rejected: skipping tester-b (triage scheduled it with a sonnet override for this reason).

## File plan

### Phase 1 — data layer: card-data, player-data → game-rules
| File | New / Edit | Responsibility | Owner |
|---|---|---|---|
| `src/modules/game-rules/card-data.ts` | new | `BASE_CARDS`, `SPECIAL_CARDS`, `USABLE_CARDS`, `SPECIAL_CARD_DESCRIPTIONS` — moved verbatim from `src/lib/card-data.ts` | implementer-a |
| `src/modules/game-rules/player-data.ts` | new | `PLAYER_COLORS`, `PLAYER_DATA`, local `PlayerData`/`PlayerSpriteInfo` types — moved verbatim from `src/lib/player-data.ts` | implementer-a |
| `src/modules/game-rules/index.ts` | edit | add `export { BASE_CARDS, SPECIAL_CARD_DESCRIPTIONS, USABLE_CARDS } from './card-data';` and `export { PLAYER_COLORS, PLAYER_DATA } from './player-data';` | implementer-a |
| `src/modules/game-rules/combat-monster-resolve.reducer.ts` | edit | repoint `PLAYER_DATA` import (`:3`) from `@/lib/player-data` to `./player-data` (same module, relative) | implementer-b |
| `src/modules/game-rules/combat-player-resolve.reducer.ts` | edit | same repoint (`:3`) | implementer-b |
| `src/modules/combat/components/MonsterCombatDialog/MonsterAttackScreen.tsx` | edit | repoint `PLAYER_DATA` import (`:3`) from `@/lib/player-data` to `@/modules/game-rules` (cross-module: through the public index) | implementer-b |
| `src/modules/combat/components/MonsterCombatDialog/MonsterCombatDialog.map.ts` | edit | same repoint (`:3`) | implementer-b |
| `src/modules/combat/components/CombatDialog/CombatDialog.map.ts` | edit | same repoint (`:3`) | implementer-b |
| `src/features/lobby/components/CustomSettingsSheet.tsx` | edit | repoint `BASE_CARDS` import (`:21`) to `@/modules/game-rules` | implementer-b |
| `src/features/lobby/components/CreateGameDialog.tsx` | edit | repoint `PLAYER_COLORS, PLAYER_DATA` import (`:28`) to `@/modules/game-rules` (`defaultGameSettings` import at `:27` is untouched this phase) | implementer-b |
| `src/features/game/dialogs/CardsDialog.tsx` | edit | repoint `SPECIAL_CARD_DESCRIPTIONS, USABLE_CARDS` import (`:4`) to `@/modules/game-rules` | implementer-b |
| `src/features/game/dialogs/SpecialIslandRollDialog.tsx` | edit | repoint `SPECIAL_CARD_DESCRIPTIONS` import (`:14`) to `@/modules/game-rules` | implementer-b |
| `src/features/game/panels/PlayerInfo.tsx` | edit | repoint `PLAYER_DATA` import (`:12`) to `@/modules/game-rules` | implementer-b |
| `src/features/game/components/IslandTile.tsx` | edit | repoint `PLAYER_DATA` import (`:10`) to `@/modules/game-rules` | implementer-b |
| `src/features/game/components/TileOccupants.tsx` | edit | repoint `PLAYER_DATA` import (`:7`) to `@/modules/game-rules` | implementer-b |
| `src/features/game/dialogs/AttackSelectionDialog.tsx` | edit | repoint `PLAYER_DATA` import (`:15`) to `@/modules/game-rules` | implementer-b |
| `src/features/game/dialogs/SabotageDialog.tsx` | edit | repoint `PLAYER_DATA` import (`:15`) to `@/modules/game-rules` | implementer-b |
| `src/features/game/dialogs/ArmySelectionDialog.tsx` | edit | repoint `PLAYER_DATA` import (`:16`) to `@/modules/game-rules` | implementer-b |
| `src/features/game/dialogs/StealResourceDialog.tsx` | edit | repoint `PLAYER_DATA` import (`:17`) to `@/modules/game-rules` | implementer-b |
| `src/lib/game-initializer.ts` | edit | repoint `BASE_CARDS` (`:4`) and `PLAYER_COLORS` (`:5`) imports to `@/modules/game-rules` (single import line) — still a legacy file until Phase 2 | implementer-b |
| `src/lib/game-logic.ts` | edit | repoint `PLAYER_COLORS` import (`:3`) to `@/modules/game-rules` — still a legacy file until Phase 3 | implementer-b |
| `src/lib/card-data.ts` | delete | fully migrated | implementer-b |
| `src/lib/player-data.ts` | delete | fully migrated | implementer-b |

### Phase 2 — game-initializer → game-rules (monster-catalog, player-factory, map-generation, game-setup)
| File | New / Edit | Responsibility | Owner |
|---|---|---|---|
| `src/modules/game-rules/monster-catalog.ts` | new | `MONSTER_DATA`, `generateMonsters(x, y)` — moved from `game-initializer.ts:23-88` unchanged | implementer-a |
| `src/modules/game-rules/monster-catalog.test.ts` | new | **new** direct coverage (today only exercised indirectly through `initializeGame`) — see Test plan | tester-a |
| `src/modules/game-rules/player-factory.ts` | new | `createPlayer(...)` — moved from `game-initializer.ts:90-137` unchanged | implementer-a |
| `src/modules/game-rules/player-factory.test.ts` | new | **new** direct coverage — see Test plan | tester-a |
| `src/modules/game-rules/map-generation.ts` | new | `generateIslandTerrain(map2D, settings)` — moved from `game-initializer.ts:219-278` unchanged, calling `generateMonsters`/`MONSTER_DATA` from `./monster-catalog` | implementer-a |
| `src/modules/game-rules/game-setup.reducer.ts` | new | `defaultGameSettings`, `initializeGame(...)`, `startGame(...)` — moved from `game-initializer.ts:8-21,139-321`, delegating player-base placement (unchanged, 2 copies kept — see Decisions) and calling `generateIslandTerrain`/`createPlayer` | implementer-a |
| `src/modules/game-rules/game-setup.reducer.test.ts` | new | ported from `src/lib/__tests__/game-initializer.test.ts` (all 3 cases) | tester-a |
| `src/modules/game-rules/index.ts` | edit | add `export { createPlayer } from './player-factory';` and `export { defaultGameSettings, initializeGame, startGame } from './game-setup.reducer';` | implementer-a |
| `src/lib/game-initializer.ts` | delete | fully migrated | implementer-b |
| `src/lib/__tests__/game-initializer.test.ts` | delete | fully ported | tester-a |
| `src/features/lobby/components/Lobby.tsx` | edit | repoint `initializeGame, startGame, defaultGameSettings` import (`:6`) to `@/modules/game-rules` | implementer-b |
| `src/features/lobby/components/CreateGameDialog.tsx` | edit | repoint `defaultGameSettings` import (`:27`) to `@/modules/game-rules` | implementer-b |
| `src/lib/game-logic.ts` | edit | repoint `createPlayer` import (`:4`) to `@/modules/game-rules` | implementer-b |
| `src/modules/game-board/game-board.session.hook.ts` | edit | repoint `startGame` import (`:3`) to `@/modules/game-rules` | implementer-b |
| `src/features/game/context/__tests__/GameBoardContext.characterization.test.tsx` | edit | `jest.mock` path (`:13`): `@/lib/game-initializer` → `@/modules/game-rules` | implementer-b |
| `src/features/game/context/__tests__/GameBoardContext.handlers.characterization.test.tsx` | edit | same mock path (`:18`) | implementer-b |
| `src/features/game/context/__tests__/test-utils/gameBoardTestKit.tsx` | edit | update docstring example (`:6`) to the new mock path | implementer-b |
| `src/lib/__tests__/bot-logic.test.ts` | edit | repoint `initializeGame, startGame, defaultGameSettings` import (`:2`) to `@/modules/game-rules` (file itself still legacy until Phase 4) | implementer-b |
| `src/lib/__tests__/turn-progression.test.ts` | edit | repoint `initializeGame, startGame, defaultGameSettings` import (`:1`) to `@/modules/game-rules` (`addPlayerToGame` import at `:2` untouched this phase) | implementer-b |
| `src/modules/game-rules/player-actions.reducer.test.ts` | edit | repoint `@/lib/game-initializer` import (`:3`) to `@/modules/game-rules` | tester-a |
| `src/modules/game-rules/combat-player-roll.reducer.test.ts` | edit | same repoint (`:3`) | tester-a |
| `src/modules/game-rules/card-targeted-effects.reducer.test.ts` | edit | same repoint (`:3`) | tester-a |
| `src/modules/game-rules/player-turn.reducer.test.ts` | edit | same repoint (`:3`) | tester-a |
| `src/modules/game-rules/combat-initiate.reducer.test.ts` | edit | same repoint (`:3`) | tester-a |
| `src/modules/game-rules/movement.reducer.test.ts` | edit | same repoint (`:3`) | tester-a |
| `src/modules/game-rules/island-discovery.reducer.test.ts` | edit | same repoint (`:3`) | tester-a |
| `src/modules/game-rules/combat-monster-resolve.reducer.test.ts` | edit | same repoint (`:3`) | tester-a |
| `src/modules/game-rules/combat-monster-roll.reducer.test.ts` | edit | same repoint (`:3`) | tester-a |
| `src/modules/game-rules/card-acquisition.reducer.test.ts` | edit | same repoint (`:3`) | tester-a |
| `src/modules/game-rules/combat-player-resolve.reducer.test.ts` | edit | same repoint (`:3`) | tester-a |
| `src/modules/game-rules/resource-position.reducer.test.ts` | edit | same repoint (`:3`) | tester-a |
| `src/modules/game-rules/game-rules.reducer.test.ts` | edit | same repoint (`:4`) | tester-a |
| `src/modules/game-rules/card-effects.reducer.test.ts` | edit | same repoint (`:3`) | tester-a |
| `src/modules/game-rules/services/player-exit.service.test.ts` | edit | same repoint (`:3`) | tester-a |
| `scripts/balance-simulator/cli.ts` | edit | repoint `defaultGameSettings` import (`:4`) to `'../../src/modules/game-rules'` | implementer-b |
| `scripts/balance-simulator/engine.ts` | edit | repoint `initializeGame, startGame, defaultGameSettings` import (`:1`) to `'../../src/modules/game-rules'` | implementer-b |
| `scripts/balance-simulator/rng.ts` | edit | update doc-comment reference (`:5`) from `src/lib/game-initializer.ts` to `src/modules/game-rules/game-setup.reducer.ts` | implementer-b |

### Phase 3 — game-logic + turn-progression → game-rules
| File | New / Edit | Responsibility | Owner |
|---|---|---|---|
| `src/modules/game-rules/player-join.reducer.ts` | new | `BASE_TILE_SIZE`, `addPlayerToGame(...)` — moved from `src/lib/game-logic.ts` unchanged, importing `createPlayer` and `PLAYER_COLORS` as same-module relative imports | implementer-a |
| `src/modules/game-rules/player-join.reducer.test.ts` | new | ported from `src/lib/__tests__/turn-progression.test.ts`'s `addPlayerToGame` setup usage, plus new direct coverage (full-game, color-exhausted, already-joined branches) — see Test plan | tester-a |
| `src/modules/game-rules/turn-progression.ts` | new | `hasPlayerRemainingActions(...)` — moved from `src/lib/turn-progression.ts` unchanged, importing `getPossibleMoves` as a same-module relative import (`./movement.reducer`) instead of self-importing `@/modules/game-rules` | implementer-a |
| `src/modules/game-rules/turn-progression.test.ts` | new | ported from `src/lib/__tests__/turn-progression.test.ts` (the one `hasPlayerRemainingActions` case) | tester-a |
| `src/modules/game-rules/index.ts` | edit | add `export { addPlayerToGame, BASE_TILE_SIZE } from './player-join.reducer';` and `export { hasPlayerRemainingActions } from './turn-progression';` | implementer-a |
| `src/lib/game-logic.ts` | delete | fully migrated | implementer-b |
| `src/lib/turn-progression.ts` | delete | fully migrated | implementer-b |
| `src/lib/__tests__/turn-progression.test.ts` | delete | fully ported (setup usage + the one test case) | tester-a |
| `src/features/lobby/components/Lobby.tsx` | edit | repoint `addPlayerToGame` import (`:7`) to `@/modules/game-rules` | implementer-b |
| `src/modules/game-board/game-board.hook.ts` | edit | repoint `hasPlayerRemainingActions` import (`:3`) to `@/modules/game-rules` | implementer-b |
| `src/features/game/context/__tests__/GameBoardContext.handlers.characterization.test.tsx` | edit | `jest.mock` path (`:24`): `@/lib/turn-progression` → `@/modules/game-rules` | implementer-b |
| `src/features/game/context/__tests__/test-utils/gameBoardTestKit.tsx` | edit | update docstring example (`:12`) to the new mock path | implementer-b |
| `src/lib/__tests__/bot-logic.test.ts` | edit | repoint `addPlayerToGame`-adjacent nothing here (file does not import `game-logic`) — **no change**; left out of this phase's edits, listed for completeness | — |
| `src/modules/game-rules/combat-player-roll.reducer.test.ts` | edit | repoint `@/lib/game-logic` import (`:4`) to `@/modules/game-rules` | tester-a |
| `src/modules/game-rules/player-turn.reducer.test.ts` | edit | same repoint (`:4`) | tester-a |
| `src/modules/game-rules/card-targeted-effects.reducer.test.ts` | edit | same repoint (`:4`) | tester-a |
| `src/modules/game-rules/combat-initiate.reducer.test.ts` | edit | same repoint (`:4`) | tester-a |
| `src/modules/game-rules/combat-player-resolve.reducer.test.ts` | edit | same repoint (`:4`) | tester-a |
| `src/modules/game-rules/movement.reducer.test.ts` | edit | same repoint (`:4`) | tester-a |
| `src/modules/game-rules/card-effects.reducer.test.ts` | edit | same repoint (`:4`) | tester-a |
| `src/modules/game-rules/resource-position.reducer.test.ts` | edit | same repoint (`:4`) | tester-a |
| `src/modules/game-rules/game-rules.reducer.test.ts` | edit | same repoint (`:5`) | tester-a |
| `src/modules/game-rules/services/player-exit.service.test.ts` | edit | same repoint (`:4`) | tester-a |

### Phase 4 — bot-logic → game-rules, plus docs
| File | New / Edit | Responsibility | Owner |
|---|---|---|---|
| `src/modules/game-rules/bot-helpers.ts` | new | `selectRandom<T>`, `canAfford`, `BotAction` type (`payload: unknown`, not `any`) — shared by the 3 files below | implementer-a |
| `src/modules/game-rules/bot-card-strategy.reducer.ts` | new | `applyBotCardStrategy(state)` — phase 1, moved from `bot-logic.ts:35-76` | implementer-a |
| `src/modules/game-rules/bot-purchases.reducer.ts` | new | `applyBotPurchases(state)` — phase 2, moved from `bot-logic.ts:79-106` | implementer-a |
| `src/modules/game-rules/bot-army-actions.reducer.ts` | new | `applyBotArmyActions(state)` — phase 3, moved from `bot-logic.ts:108-230`; if over 150 lines after the move, extract the per-army scoring step into `bot-helpers.ts` | implementer-a |
| `src/modules/game-rules/bot-turn.reducer.ts` | new | `decideBotTurn(initialState)` — clones, calls the 3 files above in order, then `handleGameAction({ action: GameAction.EndTurn, ... })`; no guard (see Decisions) | implementer-a |
| `src/modules/game-rules/bot-turn.reducer.test.ts` | new | **new** direct coverage of the decision tree's branches (see Test plan) | tester-a |
| `src/modules/game-rules/services/bot-turn.service.ts` | new | `takeBotTurn(initialState): Promise<void>` — guard, calls `decideBotTurn`, `setDoc`s the result | implementer-a |
| `src/modules/game-rules/services/bot-turn.service.test.ts` | new | ported from `src/lib/__tests__/bot-logic.test.ts` (the one integration case) | tester-a |
| `src/modules/game-rules/index.ts` | edit | add `export { takeBotTurn } from './services/bot-turn.service';` | implementer-a |
| `src/lib/bot-logic.ts` | delete | fully migrated | implementer-b |
| `src/lib/__tests__/bot-logic.test.ts` | delete | fully ported | tester-a |
| `src/hooks/use-game-engine.ts` | edit | repoint `takeBotTurn` import (`:8`) to `@/modules/game-rules` | implementer-b |
| `scripts/balance-simulator/engine.ts` | edit | repoint `type { takeBotTurn as TakeBotTurn }` import (`:4`) to `'../../src/modules/game-rules'` | implementer-b |
| `docs/README.md` | edit | §"src/lib/" (`:68-82`): remove the `game-initializer.ts`/`game-logic.ts`/`bot-logic.ts` bullets and the `__tests__` bullet's file list (only `firebase.test.ts` remains); §"src/modules/" (`:33`): extend the `game-rules/` description to mention setup, player-join, turn-progression, card/player catalogs, and bot AI; `:162-163` (game-initializer/player-data prose) and `:384` (bot-logic prose): repoint to `@/modules/game-rules` | implementer-b |

Model escalation: none beyond triage's blanket sonnet override for all 4 builder roles on this task.

## Contracts
```ts
// src/modules/game-rules/card-data.ts — unchanged from src/lib/card-data.ts
import type { CardName } from '@/lib/types';
export const BASE_CARDS: CardName[];
export const SPECIAL_CARDS: CardName[]; // dead export, kept as-is — see Decisions
export const USABLE_CARDS: CardName[];
export const SPECIAL_CARD_DESCRIPTIONS: Record<CardName, string>;

// src/modules/game-rules/player-data.ts — unchanged from src/lib/player-data.ts
import { PlayerColor } from '@/lib/types';
type PlayerSpriteInfo = { idle: string; attack: string; death: string };
type PlayerData = { name: string; sprite: PlayerSpriteInfo; base: string };
export const PLAYER_COLORS: PlayerColor[];
export const PLAYER_DATA: Record<PlayerColor, PlayerData>;

// src/modules/game-rules/monster-catalog.ts — unchanged from game-initializer.ts:23-88
import type { Monster, MonsterName } from '@/lib/types';
export const MONSTER_DATA: Record<number, { name: MonsterName; sprite: { idle: string; attack: string; death: string } }>;
export function generateMonsters(x: number, y: number): Monster[];

// src/modules/game-rules/player-factory.ts — unchanged from game-initializer.ts:90-137
import type { Player, PlayerColor, GameSettings } from '@/lib/types';
export function createPlayer(
  seatIndex: number,
  playerId: string,
  name: string,
  color: PlayerColor,
  isBot: boolean,
  basePos: { x: number; y: number },
  settings: GameSettings,
  debugMode: boolean
): Player;

// src/modules/game-rules/map-generation.ts — unchanged body from game-initializer.ts:219-278
import type { Island, GameSettings } from '@/lib/types';
export function generateIslandTerrain(map2D: Island[][], settings: GameSettings): Island[][];
// Skips tiles already IslandType.Base; places the center boss monster (MONSTER_DATA[4]) and,
// for every other tile, a distance-from-center Math.random() roll decides Resource/Monster/Special
// and (for Resource) 1-2 resource types, (for Monster) generateMonsters(x, y).

// src/modules/game-rules/game-setup.reducer.ts — unchanged from game-initializer.ts:8-21,139-321
import type { GameSettings, GameState, PlayerColor } from '@/lib/types';
export const defaultGameSettings: GameSettings;
export function initializeGame(
  gameId: string,
  gameName: string,
  maxPlayers: number,
  creator: { playerId: string; name: string; color: PlayerColor },
  numBots: number,
  debugMode?: boolean,
  settings?: GameSettings
): GameState;
export function startGame(gameState: GameState, starterName: string): GameState;

// src/modules/game-rules/player-join.reducer.ts — unchanged from src/lib/game-logic.ts
import type { GameState, BaseTileInfo } from '@/lib/types';
export const BASE_TILE_SIZE = 150;
export function addPlayerToGame(
  gameState: GameState,
  playerInfo: { playerId: string; name: string }
): { newGameState: GameState | null; newBaseTile: BaseTileInfo | null };

// src/modules/game-rules/turn-progression.ts — unchanged from src/lib/turn-progression.ts
import type { GameState, Player } from '@/lib/types';
export function hasPlayerRemainingActions(
  state: GameState,
  player: Player,
  hasActiveDialogOrPendingAction?: boolean
): boolean;

// src/modules/game-rules/bot-helpers.ts
import type { GameState, GameAction, ResourceType } from '@/lib/types';
export function selectRandom<T>(array: T[]): T | null;
export function canAfford(player: GameState['players'][0], cost: number, resource: ResourceType): boolean;
export type BotAction = { name: string; priority: number; action: GameAction; payload?: unknown };

// src/modules/game-rules/bot-card-strategy.reducer.ts — unchanged body from bot-logic.ts:35-76
import type { GameState } from '@/lib/types';
export function applyBotCardStrategy(state: GameState): GameState;

// src/modules/game-rules/bot-purchases.reducer.ts — unchanged body from bot-logic.ts:79-106
import type { GameState } from '@/lib/types';
export function applyBotPurchases(state: GameState): GameState;

// src/modules/game-rules/bot-army-actions.reducer.ts — unchanged body from bot-logic.ts:108-230
import type { GameState } from '@/lib/types';
export function applyBotArmyActions(state: GameState): GameState;

// src/modules/game-rules/bot-turn.reducer.ts
import type { GameState } from '@/lib/types';
export function decideBotTurn(initialState: GameState): GameState;
// clone(initialState) -> applyBotCardStrategy -> applyBotPurchases -> applyBotArmyActions
// -> handleGameAction({ action: GameAction.EndTurn, gameState: state }) -> return final state.
// No guard: callers (bot-turn.service.ts, tests) must pass a valid in-progress bot turn.

// src/modules/game-rules/services/bot-turn.service.ts — unchanged guard+write from bot-logic.ts:25-31,239-241
import type { GameState } from '@/lib/types';
export function takeBotTurn(initialState: GameState): Promise<void>;
// if (!botPlayer || !botPlayer.isBot || initialState.status !== 'playing') return;
// const finalState = decideBotTurn(initialState);
// await setDoc(doc(db, 'games', initialState.id), finalState);
```

## Phases
### Phase 1: data layer (card-data, player-data)
1. Create `card-data.ts`, `player-data.ts` in `src/modules/game-rules/`, byte-for-byte bodies (implementer-a).
2. Add both exports to `index.ts` (implementer-a).
3. Repoint every call site listed in Phase 1's File plan (implementer-b).
4. Delete `src/lib/card-data.ts`, `src/lib/player-data.ts` (implementer-b).
5. `npm run typecheck && npm run lint && npm test` (tester-b).

### Phase 2: game-initializer split
1. Create `monster-catalog.ts`, `player-factory.ts`, `map-generation.ts`, `game-setup.reducer.ts` (implementer-a), each verified against `git show HEAD:src/lib/game-initializer.ts` for byte-identical function bodies.
2. Add the 4 new exports to `index.ts` (implementer-a).
3. Port `game-initializer.test.ts`'s 3 cases to `game-setup.reducer.test.ts`; write new `monster-catalog.test.ts` and `player-factory.test.ts` (tester-a).
4. Repoint every call site listed in Phase 2's File plan, including the 15 `game-rules/*.test.ts` fixture-import lines (implementer-b for production/legacy files, tester-a for the `game-rules/*.test.ts` files it already owns).
5. Delete `src/lib/game-initializer.ts`, `src/lib/__tests__/game-initializer.test.ts` (implementer-b / tester-a).
6. `npm run typecheck && npm run lint && npm test` (tester-b).

### Phase 3: game-logic + turn-progression
1. Create `player-join.reducer.ts`, `turn-progression.ts` (implementer-a).
2. Add both exports to `index.ts` (implementer-a).
3. Port tests, repoint call sites per Phase 3's File plan (tester-a, implementer-b).
4. Delete `src/lib/game-logic.ts`, `src/lib/turn-progression.ts`, `src/lib/__tests__/turn-progression.test.ts` (implementer-b / tester-a).
5. `npm run typecheck && npm run lint && npm test` (tester-b).

### Phase 4: bot-logic split + docs
1. Create `bot-helpers.ts`, `bot-card-strategy.reducer.ts`, `bot-purchases.reducer.ts`, `bot-army-actions.reducer.ts`, `bot-turn.reducer.ts`, `services/bot-turn.service.ts` (implementer-a). Check `bot-army-actions.reducer.ts`'s line count against the 150 cap before moving on.
2. Add the `takeBotTurn` export to `index.ts` (implementer-a).
3. Write `bot-turn.reducer.test.ts` (new branch coverage) and port `bot-turn.service.test.ts` (tester-a).
4. Repoint `use-game-engine.ts`, `scripts/balance-simulator/engine.ts` (implementer-b).
5. Delete `src/lib/bot-logic.ts`, `src/lib/__tests__/bot-logic.test.ts` (implementer-b / tester-a).
6. Update `docs/README.md` per Phase 4's File plan (implementer-b).
7. `npm run typecheck && npm run lint && npm test && npm run test:e2e -- e2e/gameplay.spec.ts` (tester-b).
8. After this phase's commit, a follow-up edit marks `docs/ai/refactor.md` row 2 `done` with the commit hash (mirrors row 1's `docs(game-rules): record commit hash...` precedent) — not a blocking step inside this plan.

## Test plan
- tester-a (logic, first):
  - `card-data.ts`/`player-data.ts`: no new tests needed (pure constant re-exports; covered transitively by every consumer's existing tests).
  - `monster-catalog.test.ts`: `generateMonsters` returns only level-1/2 monsters at outer-ring distance, can include level-3/4 at center, never duplicates a monster name on one tile (reuse the dedup check already implicit in the function).
  - `player-factory.test.ts`: `createPlayer` gives debug-mode human players `20/20/20` resources and the full deduped `BASE_CARDS` set; non-debug and bot players get `0/0/0` and no cards; `fogOfWar: true` seeds `revealedTiles` with the base tile id, `false` leaves it empty.
  - `game-setup.reducer.test.ts`: the 3 ported cases unchanged (valid initial state + corner bases, bot player creation, `startGame` status/turn/log transition).
  - `player-join.reducer.test.ts`: joining a full game, joining twice with the same `playerId` (no-op), joining when `status !== Waiting` (rejected), last seat fills the game and flips `status` to `Playing`.
  - `turn-progression.test.ts`: the ported case (exhausted vs. available actions, Extra Move override) unchanged.
  - `bot-turn.reducer.test.ts` (new): a bot with Reinforce in hand uses it pre-turn; a bot adjacent to an enemy army attacks over moving; a bot with no possible actions ends its turn without looping forever (`possibleActions.length === 0` break, `bot-logic.ts:192`); a monster-combat auto-resolves via `MonsterCombatRoll`+`CloseMonsterCombat`.
  - `bot-turn.service.test.ts`: ported integration case (`takeBotTurn` resolves without throwing, writes to the mocked `setDoc`); add one case for the guard (non-bot `currentPlayerIndex` → `setDoc` never called).
- tester-b (integration, no view changes): `npm run typecheck && npm run lint && npm test` at the end of every phase; `npm run test:e2e -- e2e/gameplay.spec.ts` at the end of Phase 4 (exercises bot turns and game setup end-to-end).

## Preview states
- None — no UI changes.

## Risks
- **`game-initializer.ts`'s map-generation loop depends on base tiles already being placed** (`:223`, skips `IslandType.Base`) — splitting it into `generateIslandTerrain` must receive the map *after* player bases are placed, not before. Mitigation: `game-setup.reducer.ts` calls `generateIslandTerrain` only after both the creator's and every bot's base tile are written into `map2D`, exactly as the original function order did.
- **`bot-army-actions.reducer.ts` may still exceed 150 lines** after the move (it's the single biggest extracted chunk). Mitigation: the plan already names the fallback (extract per-army scoring into `bot-helpers.ts`); implementer-a checks line count before moving to the next file.
- **15 `game-rules/*.test.ts` files get two separate one-line edits** (Phase 2 for `game-initializer`, Phase 3 for `game-logic`) — a missed file in either phase breaks `npm test` immediately, which is also how it would be caught; both phases' checklists enumerate the exact file list verified by grep.

## Review (architect-b)
VERDICT: APPROVED

Verification performed: re-ran the architect's grep for all six legacy paths (`game-logic`,
`turn-progression`, `bot-logic`, `game-initializer`, `card-data`, `player-data`) across
`src e2e scripts docs .claude`, read every hit, and cross-checked each against the File plan.
Every production/test import is accounted for in the correct phase (all 15 `game-rules/*.test.ts`
`game-initializer` imports at `:3`/`:4`, all 10 `game-logic` imports in those same files at
Phase 3, `CardsDialog.tsx`/`SpecialIslandRollDialog.tsx`/`CustomSettingsSheet.tsx`'s three-way
split of `card-data`'s named exports, all 13 `player-data` consumers). Spot-checked line numbers
cited in Verified context and Contracts against the actual files
(`game-logic.ts:7,10`, `turn-progression.ts:15`, `game-initializer.ts:8,23,30,139,314`,
`eslint.config.mjs:73,99-106` for the firestore-restriction claim) — all exact. Confirmed
`index.ts` is 19 lines as claimed, and `player-exit.service.ts:3` does import `@/lib/firebase`
directly, supporting the "firestore ban lifts only in `*.service.ts`" claim.

- **`bot-army-actions.reducer.ts` line-count risk**: counted the body at `bot-logic.ts:108-230`
  myself — 108 non-blank/non-comment lines before extraction. Adding the function wrapper
  (signature + return + closing brace, ~3 lines) and the 4-5 new import lines pushes it to
  roughly 115-120 lines, under the 150 cap but with little headroom. The plan's own mitigation
  (extract per-army scoring into `bot-helpers.ts` if it runs over, Decisions + Risks) is concrete
  and correctly placed as a fallback, not a maybe. No change requested; implementer-a must
  actually check the count before moving on, as Phase 4 step 1 already says.
- **Phase 1→2→3 ordering**: verified by reading the actual import lines, not just the plan's
  prose. `game-initializer.ts:4-5` imports `BASE_CARDS`/`PLAYER_COLORS` (Phase 1's output),
  `game-logic.ts:3-4` imports `PLAYER_COLORS`/`createPlayer` (Phase 1 and Phase 2's output),
  `turn-progression.ts:1-3` imports nothing from the other five files. The dependency graph the
  plan claims is real; the ordering is correct and is the only ordering that avoids a legacy file
  reaching into a not-yet-migrated legacy file after its own phase starts.
- **Map-generation/base-placement ordering risk**: confirmed `generateIslandTerrain`'s source
  (`game-initializer.ts:219` on, `if (map2D[y][x].type === IslandType.Base ...) continue`) does
  depend on base tiles already being written at `:177-187` (creator) and `:203-213` (bots). The
  named mitigation (call it only after both placements) is the only correct fix and is already in
  the plan.
- **Minor, non-blocking**: `src/docs/README.md` (tracked in git, `git ls-files` confirms) is a
  stray, stale duplicate of `docs/README.md` — predates the current CLAUDE.md-based workflow and
  still says `src/lib/player-data.ts`/`src/lib/bot-logic.ts` even today. It is not reachable from
  the app and out of this plan's scope (the acceptance criteria only name `docs/README.md`), so
  not a reason to request changes, but it should not be mistaken for the real docs file by a
  future agent. Worth a separate cleanup task (delete it), not inside this one.
- Design: the file split follows `bot-logic.ts`'s own 4 numbered comment phases and
  `game-initializer.ts`'s existing section boundaries — no invented abstraction, matches
  `kiss-dry-solid`'s "smallest correct change." Plain `.ts` vs `.reducer.ts` classification
  (state-in/state-out vs. everything else) is applied consistently and matches the precedent task.
  Contracts are complete enough for two builders in parallel (implementer-a's new files,
  implementer-b's call-site repoints, tester-a's tests, independently listed per phase).
  No simpler option found: six files, two line-cap violations, already-migrated row 1 to build on
  — a four-phase dependency-ordered split is the natural shape, not over-engineered.
- No invented paths or symbols found in Verified context or File plan.
