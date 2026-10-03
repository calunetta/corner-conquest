# Plan: Migrate src/lib/actions reducers to src/modules/game-rules

Status: APPROVED
Inputs: triage.md

## Goal and acceptance criteria
- [ ] `src/lib/actions/` no longer exists — all 6 files (`attack.ts`, `player.ts`, `card.ts`, `movement.ts`, `resource.ts`, `index.ts`) are migrated. Pure reducers live in `src/modules/game-rules/*.reducer.ts` (each ≤150 lines, lint `max-lines`, no `any`, types imported from `@/lib/types`); the dice helper lives in `dice.ts` (not a reducer: no `GameState` in or out).
- [ ] `handlePlayerExit` (Firestore transaction, currently in `player.ts`) lives in `src/modules/game-rules/services/player-exit.service.ts` — it is impure I/O, not a reducer, and must follow the `.service.ts` rule (component-architecture skill: "Firestore access belongs in `*.service.ts` files").
- [ ] Every call site resolves to `@/modules/game-rules` — including the ones that used to need no edit because they imported the compatibility barrel (`@/lib/actions`): `use-game-engine.ts`, the three `game-board.*.hook.ts` files, `bot-logic.ts`'s `handleGameAction` import, and the characterization-test `jest.mock('@/lib/actions', ...)` calls. No file imports from `@/lib/actions` after Phase 2.
- [ ] All existing reducer tests are ported with equivalent coverage (none deleted without a new home); `handlePlayerExit` and the root dispatcher `handleGameAction` get new tests (both have **zero** today).
- [ ] `npm run typecheck`, `npm run lint`, `npm test` pass. No UI change, so no preview/ui-verify step.
- [ ] `docs/README.md` §"src/lib/" and §6.11 reflect the new location; `.claude/skills/component-architecture/SKILL.md`'s file table documents `.reducer.ts`.

## Verified context
| Symbol or file | Location | Why it matters |
|---|---|---|
| `handleInitiateCombatAction`, `handleCombatRoll`, `handleCloseCombat`, `handleMonsterCombatRoll`, `handleCloseMonsterCombat` | `src/lib/actions/attack.ts:8,50,113,200,292` | the 5 functions to move; 376 lines total, over the 150-line module cap, must split |
| `rollDice` (local helper, duplicated verbatim) | `src/lib/actions/attack.ts:99` and `:262` | DRY violation already in the code; extract to one shared helper during the move |
| `handleCancelAction`, `handleDeployAction`, `handleUpgradeAction`, `applyAutomaticCollection` (private), `handleEndTurn` | `src/lib/actions/player.ts:6,37,104,139,167` | pure reducers to move |
| `handlePlayerExit` | `src/lib/actions/player.ts:268` | **not pure** — uses `db`, `doc`, `runTransaction` from `src/lib/actions/player.ts:3` (`@/lib/firebase`). Must become a `.service.ts`, not a reducer. Calls `handleEndTurn` internally (`player.ts:336`) |
| `handleBuyCardAction`, `handleUseCard`, `handleUseProductiveCard`, `handleSabotagePlayer`, `handleGainWealth`, `handleStealResource`, `handleBuyAbility`, `handleRollOnSpecialIsland`, `handleCloseSpecialIslandDialog`, `handleScoutAction` | `src/lib/actions/card.ts:5,46,78,128,145,165,194,215,252,256` | 10 functions, 264 lines, must split |
| `getPossibleMoves`, `revealIsland`, `handleMoveAction` | `src/lib/actions/movement.ts:5,41,92` | movement + fog-of-war reveal are separate responsibilities |
| `handleSelectResourceForPosition` | `src/lib/actions/resource.ts:4-45` | **now in scope** (expanded 2026-10-03 to match `docs/ai/refactor.md` row #1). Pure `(state, resource, armyId) => state`; 5 throw paths (army not found, already acted, tile not found, resource unavailable, spot occupied), none covered by today's one existing test. Imports `Army`, `ActionHandlerResult` (`resource.ts:2`) but uses neither — dead, drop on move |
| `handleGameAction`, `HandleActionParams`, re-export of `handlePlayerExit` | `src/lib/actions/index.ts:1-99` | **now in scope**. `handleGameAction` (`index.ts:21`) is a pure dispatcher: `cloneDeep`s `gameState`, switches on `GameAction`, calls the matching reducer, catches any handler error and returns `{ state: gameState }` (the pre-clone original, not a half-mutated clone) instead of throwing (`index.ts:93-97`), and does the same with a `console.warn` for an unhandled action (`index.ts:89-91`). `payload?: any` (`index.ts:16`) — see Decisions, this becomes `unknown` plus per-case casts |
| `ActionHandlerResult` | `src/lib/types/game.ts:54-56` | comment at `game.ts:53` literally reads "Result of a reducer." — confirms `handleGameAction` is a reducer in this codebase's own vocabulary, not a view-model mapper. Dead import in `attack.ts:3`, `player.ts:2`, `card.ts:2`, `movement.ts:2`, `resource.ts:2` (drop); genuinely used by `index.ts`'s `handleGameAction` return type (keep) |
| Other dead imports | `attack.ts:3` (`Player`), `player.ts:2` (`CardName`, `IslandResource`), `player.ts:4` (`AbilityName`), `card.ts:2` (`Player`, `Army`), `movement.ts:2` (`Player`, `CardName`) | verified unused via grep; drop on move, don't carry forward |
| `PLAYER_DATA` | `src/lib/player-data.ts:18` | legacy sprite/base data, used by `attack.ts` for death animations; not Firestore, not React — allowed import for a reducer file (not in `eslint.config.mjs`'s `RESTRICTED_IMPORTS` groups) |
| Call sites that need repointing to `@/modules/game-rules` | `src/lib/bot-logic.ts:4` (`handleGameAction`, barrel import) and `:5` (`getPossibleMoves`, deep import), `src/lib/turn-progression.ts:3` (`getPossibleMoves`, deep import), `src/modules/game-board/game-board.state.hook.ts:3` (`getPossibleMoves`, deep import), `src/hooks/use-game-engine.ts:9` (`handleGameAction`, barrel import), `src/modules/game-board/game-board.actions.hook.ts:3` (`handleGameAction`, barrel import), `src/modules/game-board/game-board.card-actions.hook.ts:5` (`handleGameAction`, barrel import), `src/modules/game-board/game-board.session.hook.ts:2` (`handlePlayerExit`, barrel import) | now that `src/lib/actions/index.ts` itself moves (not just its internal imports), every one of these **does** need an edit — the earlier plan's "barrel-only, no change needed" framing only held while the barrel's file path stayed put. `bot-logic.ts`'s two imports are repointed in two different phases (line 5 in Phase 1 when `movement.ts` dies, line 4 in Phase 2 when `index.ts` dies) |
| `src/features/game/dialogs/__tests__/CombatDialog.characterization.test.tsx:6` | `import { handleInitiateCombatAction, handleCombatRoll } from '@/lib/actions/attack';` | **gap in the original inventory**, found verifying this revision. Untracked file (`git status`), created by the concurrent, in-progress `docs/ai/tasks/2026-10-03-migrate-dialog-components` task (which `docs/ai/refactor.md` row 3 lists as depending on this task). It deep-imports `attack.ts` to build combat-state fixtures, not to test `CombatDialog` itself. Must be repointed to `@/modules/game-rules` in **Phase 1** (not Phase 2 — `attack.ts` dies at the end of Phase 1) or that task's characterization baseline breaks the moment `attack.ts` is deleted. Verified no other dialog test imports `@/lib/actions/*` (`grep -rln "from '@/lib/actions" src/features/game/dialogs/`) |
| `jest.mock('@/lib/actions', ...)` and `jest.mock('@/lib/actions/movement', ...)` | `src/features/game/context/__tests__/GameBoardContext.characterization.test.tsx:13,18`, `GameBoardContext.handlers.characterization.test.tsx:18,23`, docstring in `.../test-utils/gameBoardTestKit.tsx:6-9,11` | the `movement` mock (lines 18/23/11) is repointed in Phase 1 (when `movement.ts` dies); the barrel mock (lines 13/18, and the docstring's lines 6-9) is repointed in Phase 2 (when `index.ts` dies) — both mock bodies (`handleGameAction`, `handlePlayerExit`) move to `@/modules/game-rules` unchanged in shape |
| Legacy reducer tests | `src/lib/__tests__/combat.test.ts` (112L, attack only), `movement.test.ts` (58L, movement only), `cards.test.ts` (155L, card+movement+player mixed), `player-actions.test.ts` (103L: Deploy, Upgrade, BuyCard, **Positioning** (`resource.ts`, now in scope), EndTurn — all 5 describe-blocks migrate, nothing is left, the whole file is deleted, not trimmed), `turn-progression.test.ts` (64L: 3 `handleEndTurn` cases migrate, 1 `hasPlayerRemainingActions` case stays — `turn-progression.ts` is refactor.md row #2, out of scope here) | source of ported test cases; see Test plan for the exact redistribution |
| `GameAction`, `HAND_LIMIT`, `CardName`, `AbilityName`, `ResourceType`, `IslandType`, `GameStatus`, `Monster`, `IslandResource`, `DeathAnimation`, `Army`, `Player`, `GameState` | `src/lib/types/{actions,cards,map,monsters,combat,player,game}.ts`, re-exported by `src/lib/types/index.ts:1-8` | all importable from `@/lib/types` (one barrel) — no need for the relative `../types` style the legacy files use |
| `eslint.config.mjs:45-58,65,67-75,11-26` | restricted-imports groups (`firestore`, `legacyUi`, `deepModuleImport`) + global `max-lines: 150` + global `@typescript-eslint/no-explicit-any: 'error'` (line 65), applying to every file **except** `LEGACY_PATHS` (`src/lib/**` among them, line 13) | confirms two things: every `.reducer.ts` must stay ≤150 lines, and — new finding this revision — `HandleActionParams.payload?: any` (legal today because `src/lib/**` is ignored) becomes a lint error the moment it moves into `src/modules/**`. See Decisions |
| `src/modules/game-board/game-board.reducer.ts:1-8`, `game-board.map.ts`, `index.ts` | existing module | precedent for both: (a) a flat, no-`components/` module layout, and (b) naming a pure `(state, action) => state` function `<domain>.reducer.ts` — `gameBoardReducer(state, action): GameBoardUIState`, distinct from `game-board.map.ts` (a view-model helper). `game-rules.reducer.ts` (this plan's root dispatcher) mirrors that exact naming: `<domain>.reducer.ts` for the one root reducer of the module |
| `docs/README.md:33,68-70,142,429` | architecture doc | exact lines to update (see Phase 2, implementer-b); `src/lib/__tests__/` contents checked via `ls` — after this migration only `bot-logic.test.ts`, `firebase.test.ts`, `game-initializer.test.ts`, and a trimmed `turn-progression.test.ts` remain, so line 69's "(movement, combat, cards, turn progression, player actions, bot AI)" list goes stale and line 70's `actions/` bullet describes a directory that no longer exists |
| `.claude/skills/component-architecture/SKILL.md:32-41` | "What each file may do" table | has no `.reducer.ts` row today; architect-b's review requires adding one in the same phase the repo first needs it (Phase 1, where `.reducer.ts` files first appear) |

## Decisions
- **Flat module layout, no `components/` subfolder**: `game-rules` has no `.tsx`, so files live directly under `src/modules/game-rules/`, mirroring the existing `game-board` module's flat layout. Rejected: forcing a `components/<Name>/` wrapper per the component-architecture skill's idealized tree (that layout is for components with a view; a pure-logic module has none).
- **Split each original file by function group, not by line count**: the 150-line lint cap forces a split; grouping is by combat phase / card mechanic / turn lifecycle so each file keeps one responsibility (see File plan). Rejected: splitting by "first N lines, next N lines" (would cut functions and group unrelated logic).
- **`handlePlayerExit` moves to `services/player-exit.service.ts`, not a reducer file**: it does Firestore I/O, which the import-boundary lint rule and the component-architecture skill reserve for `.service.ts`. It still calls `handleEndTurn` (relative import inside the module, now `'../player-turn.reducer'`). Rejected: leaving it alongside the pure functions (would violate the lint rule once inside `src/modules/**`).
- **Every pure `(state, ...) => state` function moves to `*.reducer.ts`, not `*.map.ts`** (architect-b review, point 1, resolving the Decisions tension the previous draft flagged). `docs/README.md:70` itself calls these functions "Pure reducer functions"; `src/lib/types/game.ts:53`'s own comment calls `ActionHandlerResult` the "Result of a reducer"; and `src/modules/game-board/game-board.reducer.ts` already establishes the `.reducer.ts` naming for exactly this shape, distinct from `.map.ts` (view-model transforms, which component-architecture explicitly bans `Date.now()`/`Math.random()` from — these reducers use both, legitimately, because they're game-rule logic, not view-model mapping). This resolves the tension without an exception to the `.map.ts` convention. Renamed: `combat-initiate`, `combat-player-roll`, `combat-player-resolve`, `combat-monster-roll`, `combat-monster-resolve`, `movement`, `island-discovery`, `card-acquisition`, `card-effects`, `card-targeted-effects`, `player-actions`, `player-turn` — all `.map.ts`/`.map.test.ts` → `.reducer.ts`/`.reducer.test.ts`. `dice.map.ts` fits neither convention (no `GameState` in or out) — renamed to `dice.ts`/`dice.test.ts`, a plain stateless RNG helper. Rejected (previous draft): documenting a `.map.ts` exception for randomness/timestamps — the file type itself was wrong, not just one rule inside it.
- **`resource.ts` → `resource-position.reducer.ts`, its own file, not merged into `player-actions.reducer.ts`**: `handleSelectResourceForPosition` is a distinct action (`GameAction.SelectResourcePosition`) with its own dialog and no shared state with Deploy/Upgrade/Cancel. Merging it into `player-actions.reducer.ts` (which already holds ~132 of its 150-line budget across `handleCancelAction`/`handleDeployAction`/`handleUpgradeAction`) would push that file over the cap. Rejected: merging anyway and re-splitting player-actions differently (more churn than one small new file).
- **`index.ts`'s dispatcher (`handleGameAction`, `HandleActionParams`) → `game-rules.reducer.ts`**, naming it after the module the same way `game-board.reducer.ts` names its one root reducer after `game-board`. It is itself a pure `(params) => ActionHandlerResult` reducer (clones state, switches, delegates) — not a view-model mapper, not I/O. Placed in **Phase 2** only, because it imports from every reducer this plan creates, including the Phase 2 ones (`card-*`, `player-*`, `resource-position`); it cannot exist correctly until all of them do. Rejected: splitting the dispatcher's cases across both phases (the whole point of `handleGameAction` is one exhaustive switch; a half-switch mid-migration would silently drop actions).
- **`HandleActionParams.payload` becomes `unknown`, not `any`, with a type assertion at each `switch` case** (new finding this revision, not in architect-b's review — `any` was legal in `index.ts` only because `src/lib/**` is in `eslint.config.mjs`'s `LEGACY_PATHS` and therefore unlinted; `src/modules/**` has no such exemption and `@typescript-eslint/no-explicit-any` is `'error'` repo-wide, `eslint.config.mjs:65`). Each `case` already calls a handler whose exact payload shape is given in this plan's Contracts (e.g. `payload as { resource: ResourceType; armyId: number }` for `SelectResourcePosition`) — a type assertion has zero runtime effect, so behavior is unchanged. This mirrors the precedent this plan already set for `handleCancelAction`'s payload (Contracts, `player-actions.reducer.ts`: replaced `any` with a locally-defined shape). Rejected: `Record<string, any>` or an `eslint-disable` comment (both keep the literal `any` token the rule bans; a disable comment also hides a real type hole instead of using the shape we already know).
- **No `.types.ts` or `.fixtures.ts` file in this module**: every payload shape is used by exactly one `.reducer.ts`/`.service.ts` and its own test (no cross-file sharing needed beyond the one-line type aliases inlined at each dispatcher `case`), so a shared types file would be a pass-through. Tests reuse the existing legacy `@/lib/game-initializer` (`initializeGame`, `startGame`, `defaultGameSettings`) and `@/lib/game-logic` (`addPlayerToGame`) helpers to build game state exactly as the legacy tests already do — test files are exempt from the module import-boundary lint rule, and this is the smallest change. Rejected: hand-built deterministic `.fixtures.ts` (more code, no behavior gained).
- **Two-phase split, now also carrying `resource.ts` and `index.ts` in Phase 2**: Phase 1 (attack + movement) stays independently shippable exactly as before — `src/lib/actions/index.ts` keeps living at its legacy path through Phase 1, with only its internal `attack`/`movement` imports repointed, so nothing outside this plan's file list breaks mid-migration. `resource.ts` and `index.ts`'s dispatcher land in Phase 2 because the dispatcher depends on every reducer (including Phase 2's), and because `resource.ts`'s one existing test lives inside `player-actions.test.ts`, which Phase 2 already touches for Deploy/Upgrade/BuyCard/EndTurn. Rejected: a third phase for just resource+index (two tiny, tightly-coupled files; triage already set `Phases: 2` and the dependency graph fits cleanly into the existing Phase 2).
- **`docs/README.md` updated once, at the end of Phase 2**: the "actions/ is the brain of the game" description is only fully wrong once both phases land. Rejected: updating incrementally per phase (churn for no reader benefit).
- **`tester-b`'s role on this task is integration/regression, not new view tests**: there is no view layer to test. `tester-b` runs `npm run typecheck && npm run lint && npm test` repo-wide and `e2e/gameplay.spec.ts` at the end of each phase. Rejected: skipping tester-b (triage scheduled it with a sonnet override; e2e is the only meaningful check left for a reducer relocation).

## File plan
### Phase 1 — attack + movement → game-rules
| File | New / Edit | Responsibility | Owner |
|---|---|---|---|
| `src/modules/game-rules/dice.ts` | new | `rollDice(count): number[]` — shared combat dice roller, extracted from the duplicate in `attack.ts:99,262` | implementer-a |
| `src/modules/game-rules/dice.test.ts` | new | tests for `rollDice` (count clamping, length, range 1-6) | tester-a |
| `src/modules/game-rules/combat-initiate.reducer.ts` | new | `handleInitiateCombatAction` — starts a player-vs-player or player-vs-monster combat state | implementer-a |
| `src/modules/game-rules/combat-initiate.reducer.test.ts` | new | ported from `combat.test.ts` (PvP + monster "initiates" cases) | tester-a |
| `src/modules/game-rules/combat-player-roll.reducer.ts` | new | `handleCombatRoll` — War Chief/Overcome cards, dice roll, winner calc for PvP | implementer-a |
| `src/modules/game-rules/combat-player-roll.reducer.test.ts` | new | ported from `combat.test.ts` ("resolves rolls and calculates winner") | tester-a |
| `src/modules/game-rules/combat-player-resolve.reducer.ts` | new | `handleCloseCombat` — applies PvP combat outcome (VP, army respawn, win check) | implementer-a |
| `src/modules/game-rules/combat-player-resolve.reducer.test.ts` | new | new coverage (not previously tested directly — see Test plan) | tester-a |
| `src/modules/game-rules/combat-monster-roll.reducer.ts` | new | `handleMonsterCombatRoll` — Overcome/War Chief/Decide-Dice-Roll cards, dice roll vs. monster | implementer-a |
| `src/modules/game-rules/combat-monster-roll.reducer.test.ts` | new | ported from `combat.test.ts` ("resolves monster combat roll") | tester-a |
| `src/modules/game-rules/combat-monster-resolve.reducer.ts` | new | `handleCloseMonsterCombat` — applies monster combat outcome (VP, loot reveal, army respawn, win check) | implementer-a |
| `src/modules/game-rules/combat-monster-resolve.reducer.test.ts` | new | new coverage (not previously tested directly — see Test plan) | tester-a |
| `src/modules/game-rules/movement.reducer.ts` | new | `getPossibleMoves`, `handleMoveAction` (incl. teleport) | implementer-a |
| `src/modules/game-rules/movement.reducer.test.ts` | new | ported from `movement.test.ts` + the Teleport test copied from `cards.test.ts:84-98`; new coverage for the untested branches (`movement.ts:99-112`) — see Test plan | tester-a |
| `src/modules/game-rules/island-discovery.reducer.ts` | new | `revealIsland` — fog-of-war reveal, discovery VP, special-island card draw | implementer-a |
| `src/modules/game-rules/island-discovery.reducer.test.ts` | new | ported from `movement.test.ts` ("reveals new islands...") | tester-a |
| `src/modules/game-rules/index.ts` | new | public API: re-exports the 5 combat handlers + `getPossibleMoves`, `handleMoveAction` | implementer-a |
| `src/lib/actions/index.ts` | edit | repoint `attack`/`movement` imports (lines 6, 8) to `@/modules/game-rules`; `card`/`player`/`resource` imports unchanged this phase | implementer-b |
| `src/lib/bot-logic.ts` | edit | repoint `getPossibleMoves` import (line 5) to `@/modules/game-rules` | implementer-b |
| `src/lib/turn-progression.ts` | edit | repoint `getPossibleMoves` import (line 3) to `@/modules/game-rules` | implementer-b |
| `src/modules/game-board/game-board.state.hook.ts` | edit | repoint `getPossibleMoves` import (line 3) to `@/modules/game-rules` | implementer-b |
| `src/features/game/context/__tests__/GameBoardContext.characterization.test.tsx` | edit | `jest.mock` path line 18: `@/lib/actions/movement` → `@/modules/game-rules` | implementer-b |
| `src/features/game/context/__tests__/GameBoardContext.handlers.characterization.test.tsx` | edit | same mock path, line 23 | implementer-b |
| `src/features/game/context/__tests__/test-utils/gameBoardTestKit.tsx` | edit | update the docstring's movement-mock example (line 11) to the new mock path | implementer-b |
| `src/features/game/dialogs/__tests__/CombatDialog.characterization.test.tsx` | edit | import line 6: `@/lib/actions/attack` → `@/modules/game-rules` (gap found this revision — see Verified context) | implementer-b |
| `.claude/skills/component-architecture/SKILL.md` | edit | add a `.reducer.ts` row to "What each file may do" (architect-b review, point 1) | implementer-b |
| `src/lib/actions/attack.ts` | delete | fully migrated, no remaining callers | implementer-b |
| `src/lib/actions/movement.ts` | delete | fully migrated, no remaining callers | implementer-b |
| `src/lib/__tests__/combat.test.ts` | delete | fully ported | tester-a |
| `src/lib/__tests__/movement.test.ts` | delete | fully ported | tester-a |

### Phase 2 — card + player + resource + dispatcher + player-exit service → game-rules
| File | New / Edit | Responsibility | Owner |
|---|---|---|---|
| `src/modules/game-rules/card-acquisition.reducer.ts` | new | `handleBuyCardAction`, `handleBuyAbility`, `handleRollOnSpecialIsland`, `handleCloseSpecialIslandDialog` — ways to acquire a card or ability | implementer-a |
| `src/modules/game-rules/card-acquisition.reducer.test.ts` | new | ported from `player-actions.test.ts` ("Buy Card Action"); new coverage for `handleBuyAbility`/`handleRollOnSpecialIsland` (see Test plan) | tester-a |
| `src/modules/game-rules/card-effects.reducer.ts` | new | `handleUseCard`, `handleUseProductiveCard`, `handleScoutAction` — activating a card from hand | implementer-a |
| `src/modules/game-rules/card-effects.reducer.test.ts` | new | ported from `cards.test.ts` (Extra Move, Productive-card cases) | tester-a |
| `src/modules/game-rules/card-targeted-effects.reducer.ts` | new | `handleSabotagePlayer`, `handleGainWealth`, `handleStealResource` — cards resolved via a follow-up dialog | implementer-a |
| `src/modules/game-rules/card-targeted-effects.reducer.test.ts` | new | ported from `cards.test.ts` (Wealthy, Sabotage, Steal Resource) | tester-a |
| `src/modules/game-rules/player-actions.reducer.ts` | new | `handleCancelAction`, `handleDeployAction`, `handleUpgradeAction` | implementer-a |
| `src/modules/game-rules/player-actions.reducer.test.ts` | new | ported from `player-actions.test.ts` (Deploy, Upgrade) + `cards.test.ts` ("cancels active card...") | tester-a |
| `src/modules/game-rules/player-turn.reducer.ts` | new | `handleEndTurn` + private `applyAutomaticCollection` — end-of-turn rotation, passive abilities, auto-collection, win check | implementer-a |
| `src/modules/game-rules/player-turn.reducer.test.ts` | new | ported from `player-actions.test.ts` ("End Turn Action") + `turn-progression.test.ts` (3 `handleEndTurn` cases) | tester-a |
| `src/modules/game-rules/resource-position.reducer.ts` | new | `handleSelectResourceForPosition` — positions an army on a resource node for per-turn yield | implementer-a |
| `src/modules/game-rules/resource-position.reducer.test.ts` | new | ported from `player-actions.test.ts` ("Positioning Action"); new coverage for the 5 untested throw paths (`resource.ts:9-31` — see Test plan) | tester-a |
| `src/modules/game-rules/services/player-exit.service.ts` | new | `handlePlayerExit(gameId, playerId)` — Firestore transaction: dismantle or update the match document when a player leaves | implementer-a |
| `src/modules/game-rules/services/player-exit.service.test.ts` | new | **new** coverage (no existing test) — see Test plan | tester-a |
| `src/modules/game-rules/game-rules.reducer.ts` | new | `handleGameAction`, `HandleActionParams` — the root dispatcher that maps a `GameAction` to one of this module's reducers; moved from `src/lib/actions/index.ts` | implementer-a |
| `src/modules/game-rules/game-rules.reducer.test.ts` | new | **new** coverage (no existing test — only mocked away in characterization tests) — see Test plan | tester-a |
| `src/modules/game-rules/index.ts` | edit | add exports for the card/player/resource/dispatcher/service handlers (Phase 1's 7 exports stay) | implementer-a |
| `src/lib/actions/index.ts` | delete | fully migrated into `game-rules.reducer.ts` + `index.ts` | implementer-b |
| `src/lib/actions/resource.ts` | delete | fully migrated into `resource-position.reducer.ts` | implementer-b |
| `src/lib/actions/card.ts` | delete | fully migrated | implementer-b |
| `src/lib/actions/player.ts` | delete | fully migrated | implementer-b |
| `src/hooks/use-game-engine.ts` | edit | repoint `handleGameAction` import (line 9) from `@/lib/actions` to `@/modules/game-rules` | implementer-b |
| `src/modules/game-board/game-board.actions.hook.ts` | edit | repoint `handleGameAction` import (line 3) to `@/modules/game-rules` | implementer-b |
| `src/modules/game-board/game-board.card-actions.hook.ts` | edit | repoint `handleGameAction` import (line 5) to `@/modules/game-rules` | implementer-b |
| `src/modules/game-board/game-board.session.hook.ts` | edit | repoint `handlePlayerExit` import (line 2) to `@/modules/game-rules` | implementer-b |
| `src/lib/bot-logic.ts` | edit | repoint `handleGameAction` import (line 4) to `@/modules/game-rules` | implementer-b |
| `src/features/game/context/__tests__/GameBoardContext.characterization.test.tsx` | edit | `jest.mock` path line 13: `@/lib/actions` → `@/modules/game-rules` | implementer-b |
| `src/features/game/context/__tests__/GameBoardContext.handlers.characterization.test.tsx` | edit | same mock path, line 18 | implementer-b |
| `src/features/game/context/__tests__/test-utils/gameBoardTestKit.tsx` | edit | update the docstring's barrel-mock example (lines 6-9) to the new mock path | implementer-b |
| `src/lib/__tests__/cards.test.ts` | delete | fully ported (including the Teleport test already copied into `movement.reducer.test.ts` in Phase 1) | tester-a |
| `src/lib/__tests__/player-actions.test.ts` | delete | all 5 describe-blocks (Deploy, Upgrade, BuyCard, Positioning, EndTurn) migrate — nothing is left to keep | tester-a |
| `src/lib/__tests__/turn-progression.test.ts` | edit | remove the `handleEndTurn` import (line 1) and its 3 `it` blocks (lines 16-42); keep `hasPlayerRemainingActions` (out of scope — refactor.md row #2) | tester-a |
| `docs/README.md` | edit | §"src/lib/" (remove the `actions/` bullet, line 70; reword the `__tests__/` bullet, line 69, to the files that remain: `bot-logic.test.ts`, `firebase.test.ts`, `game-initializer.test.ts`, trimmed `turn-progression.test.ts`) and §6.11 (line 429: `handlePlayerExit` path → `src/modules/game-rules/services/player-exit.service.ts`); add a `game-rules/` bullet under the `src/modules/` section (near line 33); reword line 142 ("...executes the `handleMoveAction` reducer from `lib/actions`...") to name `@/modules/game-rules` | implementer-b |

## Contracts
```ts
// src/modules/game-rules/dice.ts
export function rollDice(count: number): number[]; // Math.max(1, count) d6 rolls

// src/modules/game-rules/combat-initiate.reducer.ts
import type { GameState } from '@/lib/types';
export function handleInitiateCombatAction(
  state: GameState,
  payload: {
    attackingArmyId: number;
    target:
      | { type: 'player'; defenderId: number; defendingArmyId: number }
      | { type: 'monster'; monsterName: string };
  }
): GameState; // throws Error on invalid army/target (unchanged from attack.ts:8)

// src/modules/game-rules/combat-player-roll.reducer.ts
export function handleCombatRoll(
  state: GameState,
  payload: { useWarChief?: boolean; useOvercome?: boolean } | boolean
): GameState; // unchanged signature (attack.ts:50); uses rollDice from dice.ts

// src/modules/game-rules/combat-player-resolve.reducer.ts
export function handleCloseCombat(state: GameState): GameState; // unchanged (attack.ts:113)

// src/modules/game-rules/combat-monster-roll.reducer.ts
import type { GameState, Monster } from '@/lib/types';
export function handleMonsterCombatRoll(
  state: GameState,
  payload: {
    monster: Monster;
    useDecideCard: boolean;
    decidedValue: number;
    useOvercomeCard: boolean;
    useWarChief: boolean;
  }
): GameState; // unchanged (attack.ts:200); uses rollDice from dice.ts

// src/modules/game-rules/combat-monster-resolve.reducer.ts
export function handleCloseMonsterCombat(state: GameState): GameState; // unchanged (attack.ts:292)

// src/modules/game-rules/movement.reducer.ts
import type { GameState, Army } from '@/lib/types';
export function getPossibleMoves(state: GameState, army: Army): { x: number; y: number }[]; // unchanged (movement.ts:5)
export function handleMoveAction(
  state: GameState,
  x: number,
  y: number,
  army: Army,
  isTeleport?: boolean
): GameState; // unchanged (movement.ts:92); calls revealIsland from island-discovery.reducer

// src/modules/game-rules/island-discovery.reducer.ts
export function revealIsland(
  state: GameState,
  x: number,
  y: number,
  isScout?: boolean
): GameState; // unchanged (movement.ts:41)

// src/modules/game-rules/card-acquisition.reducer.ts
import type { GameState, AbilityName } from '@/lib/types';
export function handleBuyCardAction(state: GameState): GameState; // unchanged (card.ts:5)
export function handleBuyAbility(state: GameState, abilityName: AbilityName): GameState; // unchanged (card.ts:194)
export function handleRollOnSpecialIsland(state: GameState, payload?: { roll?: number }): GameState; // unchanged (card.ts:215)
export function handleCloseSpecialIslandDialog(state: GameState): GameState; // unchanged (card.ts:252)

// src/modules/game-rules/card-effects.reducer.ts
import type { GameState, CardName, ResourceType } from '@/lib/types';
export function handleUseCard(state: GameState, payload: { cardName: CardName; isScout?: boolean }): GameState; // unchanged (card.ts:46)
export function handleUseProductiveCard(state: GameState, selectedResource: ResourceType | null): GameState; // unchanged (card.ts:78)
export function handleScoutAction(state: GameState, x: number, y: number): GameState; // unchanged (card.ts:256)

// src/modules/game-rules/card-targeted-effects.reducer.ts
import type { GameState, ResourceType } from '@/lib/types';
export function handleSabotagePlayer(state: GameState, targetPlayerId: number): GameState; // unchanged (card.ts:128)
export function handleGainWealth(state: GameState, resource: ResourceType): GameState; // unchanged (card.ts:145)
export function handleStealResource(
  state: GameState,
  payload: { targetPlayerId: number; resource: ResourceType }
): GameState; // unchanged (card.ts:165)

// src/modules/game-rules/player-actions.reducer.ts
import type { GameState, CardName } from '@/lib/types';
export function handleCancelAction(
  state: GameState,
  payload?: { cardName?: CardName; scoutedTiles?: string[] } // replaces the `any` at player.ts:6; shape verified from the one real caller, game-board.hook.types.ts:21 (CancelPayload) — defined locally here, not imported, game-rules does not depend on game-board
): GameState;
export function handleDeployAction(state: GameState): GameState; // unchanged (player.ts:37)
export function handleUpgradeAction(state: GameState): GameState; // unchanged (player.ts:104)

// src/modules/game-rules/player-turn.reducer.ts
export function handleEndTurn(state: GameState): GameState; // unchanged (player.ts:167); private applyAutomaticCollection stays unexported

// src/modules/game-rules/resource-position.reducer.ts
import type { GameState, ResourceType } from '@/lib/types';
export function handleSelectResourceForPosition(
  state: GameState,
  resource: ResourceType,
  armyId: number
): GameState;
// unchanged (resource.ts:4); throws on: army not found (resource.ts:9-11), army already acted without
// an extra move (resource.ts:12-14), tile not found (resource.ts:18-20), resource not available on the
// tile (resource.ts:22-25), spot already occupied (resource.ts:28-31)

// src/modules/game-rules/services/player-exit.service.ts
export async function handlePlayerExit(gameId: string, playerId: string): Promise<void>; // unchanged (player.ts:268); imports db, doc, runTransaction from '@/lib/firebase', and handleEndTurn from '../player-turn.reducer'

// src/modules/game-rules/game-rules.reducer.ts
import type { GameState, ActionHandlerResult, Army, Monster, CardName, AbilityName, ResourceType } from '@/lib/types';
import { GameAction } from '@/lib/types';
export interface HandleActionParams {
  action: GameAction;
  gameState: GameState;
  payload?: unknown; // was `any` at index.ts:16 — `any` is lint-banned once this file lives under
                      // src/modules/** (eslint.config.mjs:65; src/lib/** was exempt as a LEGACY_PATH).
                      // Cast to the exact payload type each handler declares above, inline at its
                      // `case`, e.g. `payload as { resource: ResourceType; armyId: number }` for
                      // GameAction.SelectResourcePosition. A type assertion has no runtime effect,
                      // so dispatch behavior is byte-for-byte unchanged from index.ts:21-99.
}
export function handleGameAction(params: HandleActionParams): ActionHandlerResult;
// unchanged dispatch semantics (index.ts:21-99): deep-clones gameState (lodash cloneDeep), switches on
// `action`, delegates to the one matching reducer imported from this module, catches any handler
// error and returns `{ state: gameState }` (the pre-clone original) instead of throwing, and does the
// same with a console.warn for an action with no case.

// src/modules/game-rules/index.ts (final, end of phase 2)
export { handleInitiateCombatAction } from './combat-initiate.reducer';
export { handleCombatRoll } from './combat-player-roll.reducer';
export { handleCloseCombat } from './combat-player-resolve.reducer';
export { handleMonsterCombatRoll } from './combat-monster-roll.reducer';
export { handleCloseMonsterCombat } from './combat-monster-resolve.reducer';
export { getPossibleMoves, handleMoveAction } from './movement.reducer';
export { handleBuyCardAction, handleBuyAbility, handleRollOnSpecialIsland, handleCloseSpecialIslandDialog } from './card-acquisition.reducer';
export { handleUseCard, handleUseProductiveCard, handleScoutAction } from './card-effects.reducer';
export { handleSabotagePlayer, handleGainWealth, handleStealResource } from './card-targeted-effects.reducer';
export { handleCancelAction, handleDeployAction, handleUpgradeAction } from './player-actions.reducer';
export { handleEndTurn } from './player-turn.reducer';
export { handleSelectResourceForPosition } from './resource-position.reducer';
export { handlePlayerExit } from './services/player-exit.service';
export { handleGameAction, type HandleActionParams } from './game-rules.reducer';
// NOT exported (internal to the module): rollDice, revealIsland, applyAutomaticCollection —
// no call site outside game-rules needs them (verified by grep).
```

Notes for implementer-a (all phases):
- Import domain types/values from `@/lib/types` (not the legacy relative `../types` style). `GameAction`, `CardName`, `ResourceType`, `AbilityName`, `IslandType`, `GameStatus` are runtime objects (value imports), not type-only.
- Drop every dead import listed in Verified context. Don't carry forward `ActionHandlerResult`, `Army` (in `resource.ts`'s case), or any import whose only use was in a function that moved to a different file.
- `rollDice`'s two call sites (`combat-player-roll.reducer.ts`, `combat-monster-roll.reducer.ts`) import it via a relative path: `import { rollDice } from './dice';`.
- `movement.reducer.ts` imports `revealIsland` via `import { revealIsland } from './island-discovery.reducer';`.
- `services/player-exit.service.ts` imports `handleEndTurn` via `import { handleEndTurn } from '../player-turn.reducer';` (one level up from `services/`).
- `game-rules.reducer.ts` imports every handler it dispatches to via its own relative file (not through `index.ts` — inside a module, import siblings directly), one `import { ... } from './<file>.reducer';` per file listed in the Contracts block above.
- Keep all existing error messages and `state.log.push(...)` strings byte-for-byte — tests and, more importantly, players, depend on their exact wording.

## Phases
### Phase 1: attack + movement → game-rules
1. implementer-a creates `dice.ts`, the 5 combat `.reducer.ts` files, `movement.reducer.ts`, `island-discovery.reducer.ts`, and `index.ts` per the File plan and Contracts. (sonnet)
2. implementer-b repoints the 4 direct-import call sites (`bot-logic.ts:5`, `turn-progression.ts:3`, `game-board.state.hook.ts:3`, `CombatDialog.characterization.test.tsx:6`) and the 2 `attack`/`movement` lines in `src/lib/actions/index.ts`; updates the 3 characterization-test movement-mock paths; adds the `.reducer.ts` row to `.claude/skills/component-architecture/SKILL.md`; deletes `attack.ts` and `movement.ts`. (sonnet)
3. tester-a ports `combat.test.ts` and `movement.test.ts` into the 7 new `.reducer.test.ts` files plus `dice.test.ts` (plus the Teleport case copied from `cards.test.ts`), adds new coverage for `handleCloseCombat`, `handleCloseMonsterCombat`, and the untested movement/teleport branches (see Test plan), deletes the 2 old test files. (sonnet)
4. tester-b runs `npm run typecheck`, `npm run lint`, `npm test`, and `npm run test:e2e -- e2e/gameplay.spec.ts`; reports any failure as CHANGES REQUESTED with the exact command output. (sonnet)
5. Commit: `refactor(game-rules): migrate attack and movement reducers to src/modules/game-rules [phase 1/2]`.
6. Stop, ask the user to type `continue`.

Model escalation: all of phase 1 (triage overrides implementer-a/b and tester-a/b to sonnet).

### Phase 2: card + player + resource + dispatcher + player-exit service → game-rules
1. implementer-a creates the 3 card `.reducer.ts` files, `player-actions.reducer.ts`, `player-turn.reducer.ts`, `resource-position.reducer.ts`, `services/player-exit.service.ts`, and `game-rules.reducer.ts`; finalizes `index.ts`. (sonnet)
2. implementer-b deletes `src/lib/actions/index.ts`, `resource.ts`, `card.ts`, `player.ts` (the whole directory is now gone); repoints every remaining barrel call site (`use-game-engine.ts`, `game-board.actions.hook.ts`, `game-board.card-actions.hook.ts`, `game-board.session.hook.ts`, `bot-logic.ts:4`, the 2 `jest.mock('@/lib/actions', ...)` calls, the `gameBoardTestKit.tsx` docstring); updates `docs/README.md`. (sonnet)
3. tester-a ports `cards.test.ts`, deletes `player-actions.test.ts` in full (including porting its "Positioning Action" block to `resource-position.reducer.test.ts`), trims `turn-progression.test.ts`, writes new tests for `player-exit.service.ts`, `game-rules.reducer.ts`, `handleBuyAbility`, `handleRollOnSpecialIsland`, and `resource-position.reducer.ts`'s 5 untested throw paths (see Test plan). (sonnet)
4. tester-b runs `npm run typecheck`, `npm run lint`, `npm test`, and `npm run test:e2e -- e2e/gameplay.spec.ts`. (sonnet)
5. architect-b final review: confirm every call site resolves (including the ones found in this revision), confirm no reducer behavior changed (diff the ported test assertions against the originals), confirm the `.reducer.ts` rename was applied consistently and the `payload: unknown` casts in `game-rules.reducer.ts` match each handler's declared shape.
6. Commit: `refactor(game-rules): migrate card, player and resource reducers, add the dispatcher and player-exit service, delete src/lib/actions [phase 2/2]`.

Model escalation: all of phase 2.

## Test plan
- tester-a (logic, first):
  - `dice.test.ts`: `rollDice(0)`/`rollDice(-1)` return 1 die (clamped); `rollDice(3)` returns 3 dice; every value is between 1 and 6.
  - `combat-initiate.reducer.test.ts`: PvP target sets `combatState` with `phase: 'rolling'`; monster target sets `monsterCombatState`; throws when the army already acted and has no extra move; throws when the target monster isn't on the tile.
  - `combat-player-roll.reducer.test.ts`: rolls produce non-empty arrays and a `winnerId`; Overcome card auto-wins and discards the card; War Chief adds +2 power and discards the card; a second card can't be used the same turn (`actionsThisTurn` already has `UseCard`).
  - `combat-player-resolve.reducer.test.ts` (new): winner gets +5 VP; loser's army respawns at their base with `hasActed: false`; loser's `positionedBy` entry is cleared; sets `state.winner`/`GameStatus.Finished` when VP goal reached; returns `combatState: null` when phase isn't `'results'`.
  - `combat-monster-roll.reducer.test.ts`: ported "resolves monster combat roll"; Overcome card wins unconditionally; Decide-Dice-Roll card forces `attackerRolls[0]` to the clamped `decidedValue`; throws if Overcome is requested but not held.
  - `combat-monster-resolve.reducer.test.ts` (new): winner gets the level-indexed VP (`[0,2,5,7,10]`); cleared island becomes `IslandType.Resource` with 1-2 resource spots; loser's army respawns at base; sets winner/Finished at VP goal.
  - `movement.reducer.test.ts`: ported "calculates valid adjacent moves", "returns empty if acted", "moves army to new tile"; ported Teleport test from `cards.test.ts:84-98` (has the card, moves to a far non-base tile); new coverage: teleporting onto the player's own base succeeds, onto an opponent's base throws, and attempting teleport without the Teleport card throws (`movement.ts:99-112`).
  - `island-discovery.reducer.test.ts`: ported "reveals new islands and awards discovery VP"; add a case for a special-island tile drawing a card into `specialCards`.
  - `card-acquisition.reducer.test.ts`: ported "draws a card spending gold"; new: `handleBuyAbility` deducts gold and sets the passive flag, throws if already owned or not available; `handleRollOnSpecialIsland` with a forced `payload.roll` of 3/6 draws a card, any other roll doesn't.
  - `card-effects.reducer.test.ts`: ported Extra Move activation/consumption test, both Productive-card cases (doubles the positioned resource, doesn't double an un-positioned one).
  - `card-targeted-effects.reducer.test.ts`: ported Wealthy, Sabotage, Steal Resource cases.
  - `player-actions.reducer.test.ts`: ported Deploy (success + insufficient food), Upgrade (success + power cap), and the "cancels active card" case.
  - `player-turn.reducer.test.ts`: ported "generates resources from positions", "rotates to next player", "skips sabotaged player", "detects winner at VP goal".
  - `resource-position.reducer.test.ts` (ported case + new): ported "positions an army on a resource node to gain yield each turn" (`player-actions.test.ts:78-88`); new: throws when the army isn't found, when the army already acted without an extra move, when the resource isn't available on the tile, and when the spot is already occupied by another player.
  - `services/player-exit.service.test.ts` (new, mock `@/lib/firebase` as `bot-logic.test.ts:5-10` does, plus a `runTransaction` mock that invokes its callback with a fake transaction): host leaves mid-game → deletes the document; last human leaves (bots remain) → deletes the document; ≤1 player remains after a host leaves → deletes the document; a non-host, non-last player leaves → `players`/`baseTiles`/`map` are reindexed and the document is `set`, not deleted; the departing player was the current player → `handleEndTurn` runs as part of the same transaction (next player's `currentPlayerIndex`).
  - `game-rules.reducer.test.ts` (new, no existing coverage — only mocked away in characterization tests): dispatching `GameAction.Deploy`, `GameAction.Move`, `GameAction.SelectResourcePosition`, and `GameAction.BuyAbility` each produce the same result as calling the underlying handler directly (confirms the per-case `payload` casts forward the right fields); a handler throwing (e.g. Deploy with 0 food) is caught and returns `{ state: gameState }` — the pre-clone original, not a partially-mutated clone — without the error propagating; an action with no `case` returns `{ state: gameState }` unchanged.
- tester-b (integration, no view layer on this task): after each phase, run `npm run typecheck`, `npm run lint`, `npm test` (full suite) and `npm run test:e2e -- e2e/gameplay.spec.ts`; report the exact summary line of each. A failure not present before the phase started is CHANGES REQUESTED back to implementer-a/b or tester-a with the command output as evidence.

## Preview states
- None. No component, no view, no visual state (triage dropped preview-a/preview-b).

## Risks
- **Line-count split drifts the behavior apart**: splitting one function's logic across files could accidentally change order-of-operations (e.g., a `state.log.push` before vs. after a mutation). Mitigation: each new file gets exactly the functions listed in the File plan, copy-pasted body unchanged; only imports and dead code are touched.
- **`rollDice` extraction changes call order relative to other mutations**: `handleCombatRoll`/`handleMonsterCombatRoll` call `rollDice` after mutating `attackingArmy.hasActed`/discard piles — preserve that exact call order, only the function's *definition* moves, not its call site.
- **Both `src/lib/actions/index.ts` and `@/modules/game-rules` exist mid-migration (end of phase 1)**: a stray import of `attack.ts`/`movement.ts` anywhere not caught by this plan's grep would break the build immediately at `npm run typecheck` — that's an acceptable fast-fail, not a silent risk.
- **`handlePlayerExit` and `handleGameAction` tests are genuinely new**: there's no characterization baseline beyond the mocked-away characterization tests. Mitigation: tester-a reads each function body directly (`player.ts:268-351` / `index.ts:21-99`, to be re-read at their new paths once moved) for every branch rather than inferring behavior from existing tests.
- **A concurrent task already depends on a file this plan deletes**: `CombatDialog.characterization.test.tsx` (untracked, created by the in-progress `2026-10-03-migrate-dialog-components` task) deep-imports `attack.ts` — missed by the original call-site inventory. Mitigation: added to Phase 1's File plan (implementer-b, see Verified context); if that task has moved further by the time Phase 1 runs, re-check with `grep -rln "from '@/lib/actions" src/features/game/dialogs/` before deleting `attack.ts`.
- **`payload: unknown` + per-case casts in `game-rules.reducer.ts` trade one lint error for a silent-cast risk**: a wrong cast would compile but pass the wrong shape at runtime, exactly as a wrong `any` usage would have — no stricter safety than before, only lint compliance. Mitigation: each cast must match the exact payload type already declared for that handler elsewhere in this Contracts block, not a newly-invented shape.

## Review (architect-b)
VERDICT: CHANGES REQUESTED

Fact-checked every path, line number and signature cited in "Verified context" and most of the File plan/Contracts against the actual source (`src/lib/actions/{attack,player,card,movement,resource,index}.ts`, `eslint.config.mjs`, `docs/README.md`, the five legacy test files, the characterization-test mock paths, `game-board.hook.types.ts`, `game-board.reducer.ts`/`game-board.map.ts`/`index.ts`). All of it checked out exactly as cited (line numbers, dead imports, call sites, test line ranges) except the two citation errors folded in directly below. This is an unusually well-verified plan; the remaining findings are two design calls, not hallucinations.

1. **Resolve the Math.random()/Date.now() tension with a rename, not a documented exception** (blocks). The plan's Decisions section flags that these reducers use `Math.random()`/`Date.now()` (dice rolls, deck shuffles, monster loot, death-animation timestamps — confirmed at `attack.ts:143,147,309,313,327,330,335,337,352,356`, `player.ts:261`, `card.ts:24,37,228,236`, `movement.ts:72,79`) and proposes to override component-architecture's explicit "`.map.ts` Never: `Date.now()`, `Math.random()`" rule by declaration, asking me to confirm or send back an alternative. There is a cleaner alternative already precedented in this repo: `src/modules/game-board/game-board.reducer.ts` is a pure `(state, action) => state` reducer, named `.reducer.ts`, distinct from `game-board.map.ts` (a view-model helper with no randomness). docs/README.md:70 itself already calls these functions "**Pure reducer functions**" — they compute next `GameState` from an action, they don't map source data to a view model, so `.map.ts` is the wrong file type for them regardless of the randomness question.
   - Fix: rename every file in the File plan/Contracts whose export is `handleX(state: GameState, ...): GameState` from `*.map.ts`/`*.map.test.ts` to `*.reducer.ts`/`*.reducer.test.ts`: `combat-initiate`, `combat-player-roll`, `combat-player-resolve`, `combat-monster-roll`, `combat-monster-resolve`, `movement`, `island-discovery`, `card-acquisition`, `card-effects`, `card-targeted-effects`, `player-actions`, `player-turn`. Update `services/player-exit.service.ts`'s relative import accordingly (`'../player-turn.reducer'`, not `'../player-turn.map'`).
   - `dice.map.ts` doesn't fit `.reducer.ts` either (it takes no `GameState`) — name it `dice.ts` (a plain stateless RNG helper, not a view-model mapper and not a state reducer).
   - Add a `.reducer.ts` row to `.claude/skills/component-architecture/SKILL.md`'s "What each file may do" table (pure `(state, payload) => state`; domain randomness/timestamps allowed because this is game-rule logic, not a view-model transform; never React, never Firestore) in the same phase — this is the first time the repo needs this file type outside `game-board`, and principle 6 requires the skill/doc to stay true when an architecture pattern is formalized.
   - This is a plan-stage, mechanical rename (no logic changes) — cheaper to do now than after 15 files and their tests exist.

2. **`progress.md` schedules a Phase 1 final review that `plan.md` never runs** (should fix, not blocking on its own, but confusing if left). `progress.md:14` has an unticked `- [ ] final review (architect-b)` under "Phase 1", but `plan.md`'s Phase 1 steps (1-6) never include an architect-b final-review stage — only Phase 2 step 5 does, which matches `triage.md`'s Pipeline line (`architect-b:final-review` appears once, at the end). Architect-a: either add a final-review step to Phase 1 here (and say so explicitly, since Phase 1 would then need its own `review.md`), or flag to the coordinator that `progress.md`'s Phase 1 checkbox should be dropped — I can't edit `progress.md` myself. Left as-is, the SessionStart hook will flag that box as perpetually unticked.

Folded in directly (no re-review needed):
- File plan row for `movement.map.test.ts` (phase 1) and the matching Test plan bullet cited the Teleport test at `cards.test.ts:103-113`; the actual test is at `cards.test.ts:84-98` (lines 103-113 belong to the unrelated "Extra Move" test). Fixed both citations, and reworded the Test plan bullet: the existing test only covers "has the card, moves to a far non-base tile" — the "onto own base succeeds / onto an opponent's base throws / without the card throws" branches (`movement.ts:99-112`) have zero existing coverage and are new tests, not ported ones. tester-a should scope accordingly.
- `docs/README.md` edit row cited line 83 (`bot-logic.ts: AI bot decision engine.`), which is unrelated to this migration. Corrected to lines 69-70 (the two bullets that actually describe `actions/`/`__tests__/`) plus line 429, and added line 142 (the "`handleMoveAction` reducer from `lib/actions`" sentence in §3's flow walkthrough) to the scope implementer-b must reconcile — it's the only other `lib/actions` reference in the doc and becomes imprecise once the reducers physically move.

Everything else — the two-phase split, the flat no-`components/` layout, the `services/player-exit.service.ts` classification, the dropped `.types.ts`/`.fixtures.ts`, the dead-import list, the call-site inventory, the Contracts' signatures, and the test redistribution for every other file — checked out against the code. Re-review once the rename and the progress.md mismatch are addressed; I don't expect another full pass to be needed.

### Revision (architect-a, 2026-10-03)
Both review points addressed, plus the triage-approved scope expansion folded in:
1. **`.reducer.ts` rename** — done across both phases: all 12 reducer files + their tests renamed `*.map.ts`/`*.map.test.ts` → `*.reducer.ts`/`*.reducer.test.ts`; `dice.map.ts`/`dice.map.test.ts` → `dice.ts`/`dice.test.ts`; `services/player-exit.service.ts`'s relative import fixed to `'../player-turn.reducer'`; a `.reducer.ts` row added to Phase 1's File plan for `.claude/skills/component-architecture/SKILL.md` (implementer-b).
2. **`progress.md` mismatch** — fixed directly in `progress.md` (removed Phase 1's stray `final review (architect-b)` line; the single final-review stage stays at the end of Phase 2, matching `triage.md`'s Pipeline).
3. **Scope expansion (`resource.ts`, `index.ts`)** — both folded into Phase 2 (dependency reasons: the dispatcher needs every other reducer first). New files: `resource-position.reducer.ts` (+test), `game-rules.reducer.ts` (+test, the former `handleGameAction`/`HandleActionParams`). This forced two further fixes, documented in Decisions and Verified context: `HandleActionParams.payload` must become `unknown` with per-case casts (literal `any` is lint-banned under `src/modules/**`, unlike the `LEGACY_PATHS`-exempt `src/lib/**` it's leaving), and every former "barrel-only, no change needed" call site now needs a real edit because the barrel file itself is moving, not just its internals. Also found and fixed a gap in the original call-site inventory: `CombatDialog.characterization.test.tsx:6` (untracked, belongs to the concurrent, dependent `migrate-dialog-components` task) deep-imports `attack.ts` and would have broken at the end of Phase 1 — added to Phase 1's File plan.

### Re-review (architect-b, 2026-10-03)
VERDICT: APPROVED

Re-verified the four areas flagged for this pass, against current source (time has passed since the first review):
1. **`.reducer.ts` rename** — consistent. Grepped `plan.md` for any remaining `.map.ts`/`.map.test.ts` reference among the renamed files: none found outside the explanatory prose describing the rename itself and the `game-board.map.ts` precedent citation (a different, intentionally-kept `.map.ts` file in `game-board`, not part of this rename). File plan, Contracts and the Decisions section all use `.reducer.ts`/`.reducer.test.ts` for the 12 renamed files and `dice.ts`/`dice.test.ts` for the RNG helper; `services/player-exit.service.ts`'s relative import is written as `'../player-turn.reducer'` in both the Decisions bullet and the Contracts/Notes blocks.
2. **`progress.md` fix** — confirmed. `progress.md`'s Phase 1 block (lines 9-14) no longer has a `final review (architect-b)` line; the single final-review stage is at Phase 2 (line 21), matching `triage.md`'s Pipeline (`architect-b:final-review` once, at the end).
3. **`resource.ts`/`index.ts` scope expansion** — the new `resource-position.reducer.ts` and `game-rules.reducer.ts` files are correctly scoped to Phase 2 for the dependency reason given. Checked every payload-bearing `case` in the real `src/lib/actions/index.ts:21-99` against the Contracts block's per-handler signatures (`attack.ts`, `card.ts`, `movement.ts`, `resource.ts` read in full this session): all 14 cases resolve unambiguously — for handlers whose Contract signature is itself one payload object (`handleInitiateCombatAction`, `handleCombatRoll`'s `{...} | boolean` union, `handleMonsterCombatRoll`, `handleUseCard`, `handleStealResource`, `handleCancelAction`, `handleRollOnSpecialIsland`), the cast is the signature verbatim; for handlers taking separate positional params that the dispatcher destructures off `payload` (`handleMoveAction`'s `x,y,army,isTeleport`, `handleScoutAction`'s `x,y`, `handleSelectResourceForPosition`'s `resource,armyId`, `handleUseProductiveCard`'s `selectedResource`, `handleSabotagePlayer`'s `targetPlayerId`, `handleGainWealth`'s `resource`, `handleBuyAbility`'s `abilityName`), the cast shape is derivable without ambiguity by bundling exactly the fields the existing `index.ts` dispatch code already accesses (e.g. `payload as { x: number; y: number; army: Army; isTeleport?: boolean }` for `Move` — `Army` is already imported in the Contract's type-only import list). Minor, non-blocking: the Decisions section's claim that "the exact payload shape is given in this plan's Contracts" slightly overstates it for this second group — the shape comes from combining the handler's Contract signature with the field-access pattern already in `index.ts`, not from a single quoted object type. Not worth a revision cycle: `game-rules.reducer.test.ts`'s own test plan (dispatching `Deploy`, `Move`, `SelectResourcePosition`, `BuyAbility` and comparing to calling the handler directly) will catch a wrong cast immediately, and `index.ts:21-99` is explicitly named as the byte-for-byte reference implementer-a works from.
4. **`CombatDialog.characterization.test.tsx` Phase 1 fix** — re-verified against the file as it stands now, not as architect-a last read it: `grep -n "from '@/lib/actions" src/features/game/dialogs/__tests__/CombatDialog.characterization.test.tsx` still shows exactly one hit, line 6, `import { handleInitiateCombatAction, handleCombatRoll } from '@/lib/actions/attack';` (confirmed by direct read of the 632-line file). `grep -rln "@/lib/actions" src/features/game/dialogs/` returns only this one file — no other dialog test gained a deep import since architect-a's revision. The concurrent `migrate-dialog-components` task (`docs/ai/tasks/2026-10-03-migrate-dialog-components/progress.md`) has only "plan approved" ticked for both phases; its own Phase 1 step 1 is "write `CombatDialog.characterization.test.tsx` against the CURRENT `../CombatDialog`" — the file already exists untracked, consistent with that task having started but not yet reached implementation. The fix is still correct and still necessary: if this task's Phase 1 runs before that task's Phase 1 finishes, deleting `attack.ts` without this edit breaks that task's characterization baseline exactly as described.

Everything else re-checked this session and unchanged from the first review's conclusion: `docs/README.md:33,68-70,142,429` citations match current content exactly; `.claude/skills/component-architecture/SKILL.md`'s file table (lines 32-39 today) has no `.reducer.ts` row yet, confirming Phase 1's addition is real and not a duplicate; `game-board.reducer.ts:1-8` precedent confirmed; the three characterization-test mock-path citations (`GameBoardContext.characterization.test.tsx:13,18`, `.handlers.characterization.test.tsx:18,23`, `gameBoardTestKit.tsx:6-9,11`) all match current line numbers and content exactly; `eslint.config.mjs` confirms `src/lib/**` in `LEGACY_PATHS` (line 13) and `no-explicit-any`/`max-lines` as global rules (lines 69, 73); `player-actions.test.ts:7,78,83` confirms the "Positioning Action" describe-block and its `resource.ts` import, supporting the Phase 2 test-redistribution claim.

Status: APPROVED. Tick "plan approved" in `progress.md` for both phases (the single checkbox at Phase 1, since Phase 2 has none per the fix in finding 2 above — confirmed: `progress.md` has no "plan approved" line under Phase 2 itself, matching the one-approval-per-plan model used elsewhere in this task).
