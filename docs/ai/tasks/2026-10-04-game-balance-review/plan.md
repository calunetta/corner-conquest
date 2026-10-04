# Plan: Game balance fixes (deck wiring, War Chief, persistent positioning) + 3 ready HUD/lobby polish items

Status: APPROVED
Inputs: triage.md (re-triaged below), game-design.md (Final spec), ui-design.md (proposal only — no
ui-designer-b review; see Decisions)

## Goal and acceptance criteria
- [ ] `game-setup.reducer.ts` builds the deck from `SPECIAL_CARDS` (19 cards, weighted), not doubled `BASE_CARDS` (26 cards, flat).
- [ ] War Chief adds a flat `+2` to the combat score total (not an extra die) in both PvP and monster combat; card description text says "+2 to your combat score", not "+2 attack power".
- [ ] A positioned army keeps yielding its resource every turn without re-clicking Position, until it moves, loses a fight it was in (as attacker or defender), or dies — with no stale `positions`/`positionedBy` entry left behind on any loss path.
- [ ] `GameBoardHeader` shows the local player's own food/wood/gold as a compact always-visible strip when `isPlaying`.
- [ ] `ActionsPanel`'s `mainGrid` buttons get a visible ring/emphasis when `hasSelectedArmy` is true.
- [ ] `LobbyGameRow` shows a `VP Goal` badge in its info row.
- [ ] `npm run typecheck`, `npm run lint`, `npm test` all pass after every phase.

## Re-triage
`triage.md` sized tier **S** for a design-review-only deliverable (no code). The combined scope now
approved in `game-design.md`'s Final spec plus the 3 ready items in `ui-design.md` touches 6 game-rule
files (2 phases) and 3 HUD/lobby components (~15 files across view/logic/tests/previews), with one
required ui-designer-b challenger pass that didn't run yet. That is tier **L**: more than 6 files, more
than one sitting, phases with real sequencing constraints. **Tier changed from S to L.** `triage.md` is
updated accordingly (see below); this `plan.md` supersedes its "Type: gameplay, no implementation" line.

## Verified context
| Symbol or file | Location | Why it matters |
|---|---|---|
| `SPECIAL_CARDS` | `src/modules/game-rules/card-data.ts:12-26` | weighted 19-card list, already correct, currently dead code |
| `BASE_CARDS` | `src/modules/game-rules/card-data.ts:4-9` | 13 unique cards, doubled today to build the live 26-card deck |
| deck build | `src/modules/game-rules/game-setup.reducer.ts:109-111` | `const finalCardDeck = BASE_CARDS.filter(...); const initialDeck = [...finalCardDeck, ...finalCardDeck];` — the line to replace |
| `SPECIAL_CARD_DESCRIPTIONS['War Chief']` | `src/modules/game-rules/card-data.ts:52` | tooltip text, currently "Gain +2 attack power for your next battle." |
| `WAR_CHIEF_BONUS_POWER`, `handleCombatRoll` | `src/modules/game-rules/combat-player-roll.reducer.ts:5,48-63` | today: `attackerBonusPower` added to `rollDice()`'s die-count arg (line 60: `rollDice(attacker.attackPower + 1 + attackerBonusPower)`) |
| `WAR_CHIEF_BONUS_POWER`, `handleMonsterCombatRoll` | `src/modules/game-rules/combat-monster-roll.reducer.ts:5,54-91` | same pattern: `attackerBonusPower` into `rollDice()` at line 83; Decide Dice Roll overrides `attackerRolls[0]` at line 87, must stay before the flat bonus is summed |
| `applyAutomaticCollection` | `src/modules/game-rules/player-turn.reducer.ts:7-32` | collects from `player.positions`, then clears both `player.positions` and each tile's `positionedBy` entry (lines 24-30) every turn — the clear to remove |
| `handleUseProductiveCard` | `src/modules/game-rules/card-effects.reducer.ts:36-74` | the Productive-card dialog path duplicates the exact same "collect then clear all positions" pattern (lines 57-64 collect, 76-82 clear) — **not cited in the Final spec**, but it is the same automatic-collection step under a different trigger (`productiveDialogState` vs. direct end-of-turn), so it needs the identical fix or persistent positioning breaks silently the first time any player holds a Productive card. See Decisions. |
| "defender lost" cleanup | `src/modules/game-rules/combat-player-resolve.reducer.ts:53-61` | already removes `loser.positions`/tile `positionedBy` for the defending army — the pattern the attacker-lost branch must mirror |
| "attacker lost" branch (no cleanup today) | `src/modules/game-rules/combat-player-resolve.reducer.ts:64-86` | `oldPos` is not currently captured before `loserArmy.position` is overwritten (compare to the defender branch's `oldPos` capture at line 48); must add both the capture and the `loser.positions`/`positionedBy` cleanup, keyed on `attackingArmyId` |
| `handleCloseMonsterCombat` loss branch | `src/modules/game-rules/combat-monster-resolve.reducer.ts:64-89` | no position cleanup; Final spec requires confirming reachability (can a positioned army ever occupy a tile with a live monster?) before deciding whether to add the same fix or just a comment |
| `handleMoveAction` | `src/modules/game-rules/movement.reducer.ts:84-93` | already clears the moving army's position on any voluntary move — confirmed unchanged, no edit needed |
| `useGameBoard().localPlayer` | `src/modules/game-board/game-board.engine.types.ts:9`, `game-board.engine.hook.ts:56,148` | `Player \| null`, already computed; source for `GameBoardHeader`'s new resource strip |
| `toResources` / `ResourceStatViewModel` | `src/modules/hud/components/PlayerInfo/PlayerInfo.map.ts:84-98`, `PlayerInfo.types.ts:43` | existing `{type, label, value}[]` shape and transform, read from `player.resources.{food,wood,gold}` — reuse the same shape for `GameBoardHeader`, don't invent a second one |
| `ResourceIcon` | `@/modules/shared` (used at `PlayerInfoStats.tsx:90`) | existing icon component, reused, not recreated |
| `GameBoardHeaderView`, `GameBoardHeaderViewModel`, `toGameBoardHeaderViewModel`, `useGameBoardHeader` | `GameBoardHeader.tsx:9-37`, `.types.ts:4-16`, `.map.ts:4-23`, `.hook.ts` | current full view/map/hook chain; `vpGoalBadge` style (`GameBoardHeader.styles.ts:5`) is the shape to match for the new resource-strip token |
| `ActionsPanelData.hasSelectedArmy`, `styles.mainGrid` | `ActionsPanel.types.ts:20`, `ActionsPanel.styles.ts:21` | `hasSelectedArmy: boolean` already in the view model; `mainGrid: 'grid grid-cols-3 gap-1.5'` is the class to make conditional |
| `LobbyGameRowProps.game: GameState`, `game.settings.victoryPointGoal` | `LobbyGameRow.types.ts:3-8`, `src/lib/types` `GameSettings` | `game` already carries the full settings object; no new prop or type field needed, just read `game.settings.victoryPointGoal` in the view |
| `Badge` usage pattern | `LobbyGameRow.tsx:36-41` (Available Cards badges), `Lobby.tsx:91` (cited in ui-design.md, unread this session) | existing `Badge` primitive usage to copy for the new VP pill |
| finding 7 (GameLog color) | `docs/ai/tasks/2026-10-04-ui-ux-review/ui-design.md:103-124,151` | tracked separately, sized Medium (needs a `game-rules` log-entry shape change) — **out of scope here**, confirmed by ui-design.md Proposal 4 as "confirms, doesn't add work" |
| `LEGACY_PATHS` | `eslint.config.mjs:12` | all touched files are in `src/modules/`, none are legacy-exempt; standard lint rules apply |

## Decisions
- **Fold the Productive-card cleanup into Problem 3's phase**, even though `game-design.md`'s Final spec
  only names `player-turn.reducer.ts` and the two combat-resolve reducers. Reason: `card-effects.reducer.ts:76-82`
  is a second, independent code path that runs the exact same "collect then clear every position" step
  (triggered by `productiveDialogState` instead of direct `handleEndTurn`). Leaving it uncleared would silently
  re-introduce turn-by-turn clearing — and thus the busywork and the bot stall bug — for any player holding a
  Productive card, directly contradicting the approved rule ("persists until the army moves, attacks and loses,
  or is defeated"). This is a correctness gap in the spec's file list, not a deviation from its rule; architect-b
  should confirm this addition. Rejected: leave it as the spec literally lists it (would ship a rule that's true
  only sometimes, depending on whether the player drew one specific card).
- **Run ui-designer-b's challenger pass as step 1 of Phase 4** (the first UI phase), producing a `Spec`/`Review`/`Final
  spec` structure appended to `ui-design.md` for Proposals 1, 3 and 5 only, before any implementer starts on those
  three components. Reason: `ui-design.md` is explicitly a single-pass proposal ("no ui-designer-b review... treat
  every item as a candidate for a future task") per its own header; building against an unchallenged proposal risks
  the same kind of math/edge-case gap game-designer-b caught twice in the logic spec. Rejected: skip the challenger
  pass and build directly from the proposal (the proposal itself recommends a follow-up triage for exactly this
  reason; skipping it contradicts the document's own caveat).
- **Exclude Proposal 2 (CreateGameDialog mode cards) from this plan entirely.** `ui-design.md:82,100-104` states
  `CreateGameDialog.tsx` was never read; the proposal's own summary table marks it "No — flagged, do not build from
  this spec alone" and recommends a separate XS research triage. Planning implementation steps against an unverified
  file would mean asking a builder to invent the current markup. Rejected: scope a "verification step" inside this
  plan's Phase 4 (the instructions allow this, but doing it inside an L-tier plan already carrying 3 other components
  and a logic rewrite adds scope-creep risk for zero benefit — a dedicated XS triage, as the proposal itself
  recommends, is the smaller, more honest unit of work).
- **Exclude Proposal 4 (GameLog color) from this plan.** It is a pointer to an already-tracked, separately-sized
  (Medium) finding in `docs/ai/tasks/2026-10-04-ui-ux-review/`, not new work this task owns. Rejected: fold it in
  here since the color-token source is already decided — no, because the actual fix needs a `game-rules` log-entry
  shape change that has its own task record and shouldn't be re-planned twice.
- **Phase 1 bundles Problems 1 and 2 together** (deck wiring + War Chief). Both are independent of each other and of
  Problem 3, both touch `src/modules/game-rules/` only, and combined they are under 6 files. Rejected: one phase per
  problem (would make Phase 1 trivially small — 2 files — and cost an extra phase-boundary stop for no dependency
  reason).
- **Problem 3 is its own phase (atomic: `player-turn.reducer.ts` + `combat-player-resolve.reducer.ts` + the newly
  decided `card-effects.reducer.ts` fix + the `combat-monster-resolve.reducer.ts` reachability check), run after
  Phase 1** — not because it depends on Phase 1's code, but because `game-design.md`'s Final spec treats it as
  strictly riskier (game-designer-b's Finding 3 caught a live exploit in the original proposal) and keeping it in
  its own phase isolates its review. Phases 1 and 2(UI) could technically run in parallel with Phase 3 since none
  share a file — noted in Phases below.
- **UI phases (4, 5, 6) are independent of the logic phases (1, 3)** — no shared files, no shared contracts — and
  could be built in parallel by a second implementer pair. Numbered sequentially here only because this plan is
  consumed by one pipeline at a time; re-order if the swarm runner is given two tracks.
- **`ResourceStatViewModel` is exported from `PlayerInfo`'s index** (architect-b, resolving the question the
  File plan/Contracts deferred). Verified directly: `PlayerInfo/index.ts` exports only `PlayerInfoProps` and
  `PlayerInfoViewModel`, not `ResourceStatViewModel` (defined at `PlayerInfo.types.ts:17-21`). Per the DRY skill
  ("if it isn't exported, export it with a minimal legacy edit instead of copying it"), the fix is to add
  `ResourceStatViewModel` to `PlayerInfo/index.ts`'s type export line and import it in `GameBoardHeader.types.ts`
  from `@/modules/hud/components/PlayerInfo`. Not duplicated locally. ui-designer-b's Phase 4 step 1 pass no
  longer needs to decide this — only to confirm the resource-strip's token values and mobile behavior, as the
  rest of its scope already says.
- **`combat-monster-resolve.reducer.ts`'s loss branch is confirmed UNREACHABLE for a positioned army**
  (architect-b, resolving game-designer-b's open question). Traced: `map-generation.ts:42-64` only ever sets
  `resources` on a tile when `islandType === IslandType.Resource` (line 61); a `Monster`-type tile only gets
  `monsters` populated (line 63) and keeps the default `resources: []` set at `game-setup.reducer.ts:30`.
  `handleSelectResourceForPosition` (`resource-position.reducer.ts:22-25`) requires `tile.resources.find(...)`
  to find a non-empty matching entry, which a live-monster tile never has. A tile only gains `resources` when
  `handleCloseMonsterCombat` defeats the monster and flips `type` to `Resource` (`combat-monster-resolve.reducer.ts:38-60`),
  at which point `monsters` is cleared (line 35) — resources and a live monster are mutually exclusive on every
  tile, always. Phase 2 step 4 should land as a one-line comment only; no cleanup code and no new test case
  (the conditional rows already in the File plan/Test plan resolve to "no change" branch).

## File plan
| File | New / Edit | Responsibility | Owner |
|---|---|---|---|
| `src/modules/game-rules/game-setup.reducer.ts` | edit | build `initialDeck` from `SPECIAL_CARDS.filter(...)` instead of doubled `BASE_CARDS.filter(...)` | implementer-a |
| `src/modules/game-rules/card-data.ts` | edit | update `SPECIAL_CARD_DESCRIPTIONS['War Chief']` text to "+2 to your combat score" | implementer-a |
| `src/modules/game-rules/combat-player-roll.reducer.ts` | edit | War Chief bonus becomes a flat addition to `attackerScore`, not extra dice | implementer-a |
| `src/modules/game-rules/combat-monster-roll.reducer.ts` | edit | same change, applied after Decide Dice Roll's override | implementer-a |
| `src/modules/game-rules/game-setup.reducer.test.ts` | edit | assert `initialDeck.length === 19` (unfiltered) and matches `SPECIAL_CARDS` weighting | tester-a |
| `src/modules/game-rules/combat-player-roll.reducer.test.ts` | edit | assert dice pool is `attackPower + 1` (no bonus dice) and final score includes flat `+2` only when War Chief used | tester-a |
| `src/modules/game-rules/combat-monster-roll.reducer.test.ts` | edit | same, plus Decide Dice Roll + War Chief composition case | tester-a |
| `src/modules/game-rules/player-turn.reducer.ts` | edit | `applyAutomaticCollection` stops clearing `player.positions`/`positionedBy` after collecting | implementer-a |
| `src/modules/game-rules/card-effects.reducer.ts` | edit | `handleUseProductiveCard` stops clearing `player.positions`/`positionedBy` after collecting (same fix, mirrored) | implementer-a |
| `src/modules/game-rules/combat-player-resolve.reducer.ts` | edit | "Attacker lost" branch: capture `oldPos` before respawn, add the same `loser.positions`/`positionedBy` cleanup the "defender lost" branch already has, keyed on `attackingArmyId` | implementer-a |
| `src/modules/game-rules/combat-monster-resolve.reducer.ts` | comment-only | add a one-line comment at the loss branch recording that a positioned army can never share a tile with a live monster (architect-b confirmed unreachable — see Decisions); no cleanup code | implementer-a |
| `src/modules/game-rules/player-turn.reducer.test.ts` | edit | new case: position survives two consecutive `handleEndTurn` collections | tester-a |
| `src/modules/game-rules/resource-position.reducer.test.ts` | edit | new case: position persists; only cleared by move/loss/death (cross-reference, may be a thin wrapper around the other reducers' own tests) | tester-a |
| `src/modules/game-rules/card-effects.reducer.test.ts` | edit | new case: Productive-card collection no longer clears `player.positions` | tester-a |
| `src/modules/game-rules/combat-player-resolve.reducer.test.ts` | edit | new case: attacker loses while positioned on the attacked tile; assert `loser.positions` and the tile's `positionedBy` no longer contain that army | tester-a |
| `src/modules/game-rules/combat-monster-resolve.reducer.test.ts` | no change | architect-b confirmed the loss branch is unreachable for a positioned army — no new test needed | tester-a |
| `docs/README.md` | edit | §5/§6: deck source (SPECIAL_CARDS, 19 cards), War Chief's new effect text, positioning's persistence rule (§6.3 Position, §6.4 Combat Flow, §6.5 War Chief, §6.10 Tutorial) | implementer-a |
| `docs/ai/tasks/2026-10-04-game-balance-review/ui-design.md` | edit (append) | ui-designer-b's challenger pass + Final spec for Proposals 1, 3, 5 only | ui-designer-b |
| `src/modules/hud/components/PlayerInfo/index.ts` | edit | add `export type { ResourceStatViewModel } from './PlayerInfo.types';` so `GameBoardHeader` can reuse it instead of duplicating the shape (DRY, architect-b decision) | implementer-a |
| `src/modules/hud/components/GameBoardHeader/GameBoardHeader.types.ts` | edit | add `resources: ResourceStatViewModel[]` to `GameBoardHeaderViewModel` | implementer-a |
| `src/modules/hud/components/GameBoardHeader/GameBoardHeader.map.ts` | edit | populate `resources` from `localPlayer` using the same transform shape as `PlayerInfo.map.ts`'s `toResources` | implementer-a |
| `src/modules/hud/components/GameBoardHeader/GameBoardHeader.hook.ts` | edit | pass `localPlayer` into `toGameBoardHeaderViewModel` | implementer-a |
| `src/modules/hud/components/GameBoardHeader/GameBoardHeader.tsx` | edit | render the resource strip in `leftGroup`, right of `vpGoalBadge`, gated on `isPlaying` | implementer-b |
| `src/modules/hud/components/GameBoardHeader/GameBoardHeader.styles.ts` | edit | add `resourceStrip`/`resourceChip` tokens matching `vpGoalBadge`'s shape | implementer-b |
| `src/modules/hud/components/GameBoardHeader/GameBoardHeader.fixtures.ts` | edit | add `resources` fixture data | implementer-a |
| `src/modules/hud/components/GameBoardHeader/GameBoardHeader.map.test.ts` | edit | assert `resources` maps from `localPlayer.resources` correctly | tester-a |
| `src/modules/hud/components/GameBoardHeader/GameBoardHeader.test.tsx` | edit | assert resource strip renders when `isPlaying`, hidden otherwise | tester-b |
| `src/modules/hud/components/GameBoardHeader/GameBoardHeader.preview.tsx` | edit | add a state showing the resource strip | preview-a |
| `src/modules/hud/components/ActionsPanel/ActionsPanel.styles.ts` | edit | add a `mainGrid` `cva` variant keyed on `hasSelectedArmy` (ring emphasis) | implementer-b |
| `src/modules/hud/components/ActionsPanel/ActionsPanel.tsx` | edit | apply `styles.mainGrid({ hasSelectedArmy })` to the main-actions wrapper | implementer-b |
| `src/modules/hud/components/ActionsPanel/ActionsPanel.test.tsx` | edit | assert the ring class/attribute appears only when `hasSelectedArmy` is true | tester-b |
| `src/modules/hud/components/ActionsPanel/ActionsPanel.preview.tsx` | edit | add an "army selected" preview state showing the emphasis | preview-a |
| `src/modules/lobby/components/LobbyGameRow/LobbyGameRow.tsx` | edit | add a `VP Goal` `Badge` to `infoGroup`, reading `game.settings.victoryPointGoal` | implementer-b |
| `src/modules/lobby/components/LobbyGameRow/LobbyGameRow.styles.ts` | edit | add `vpGoalBadge` token (reuse `Badge variant="outline"`, no new primitive) | implementer-b |
| `src/modules/lobby/components/LobbyGameRow/LobbyGameRow.test.tsx` | edit | assert the VP goal badge renders with the game's `victoryPointGoal` value | tester-b |
| `src/modules/lobby/components/LobbyGameRow/LobbyGameRow.preview.tsx` | edit | confirm existing fixtures already exercise the new badge (no new state needed unless `victoryPointGoal` varies) | preview-a |

## Contracts
```ts
// --- game-rules (Problem 1: no type change; see File plan for the deck-build line replacement) ---

// Problem 2 — combat-player-roll.reducer.ts / combat-monster-roll.reducer.ts
// Unchanged constant name, changed meaning: now a flat score bonus, not a dice-count bonus.
const WAR_CHIEF_BONUS_POWER = 2;

// combat-player-roll.reducer.ts: roll attacker.attackPower + 1 dice unconditionally (no bonus dice).
// attackerScore = sum(combatState.attackerRolls) + (warChiefApplied ? WAR_CHIEF_BONUS_POWER : 0)
// combatState.winnerId = attackerScore > defenderScore ? attackerId : defenderId  (unchanged comparison)

// combat-monster-roll.reducer.ts: same pattern, applied AFTER Decide Dice Roll's attackerRolls[0] override:
// attackerRolls = rollDice(attacker.attackPower + 1);               // no bonus dice
// if (canUseDecideCard) attackerRolls[0] = safeDecidedValue;        // existing override, unchanged
// const attackerScore = sum(attackerRolls) + (warChiefApplied ? WAR_CHIEF_BONUS_POWER : 0);
// winnerId = attackerScore > monsterScore ? attacker.id : null;      // unchanged comparison

// Problem 3 — combat-player-resolve.reducer.ts "Attacker lost" branch (mirrors the existing
// "defender lost" branch at lines 48-61; same shape, different id variables):
// capture `const oldPos = loserArmy.position;` BEFORE `loserArmy.position = { x: baseTile.x, y: baseTile.y };`
// then, after the respawn:
function cleanupStalePosition(
  loser: Player,               // from '@/lib/types'
  loserArmyId: number,
  oldPos: { x: number; y: number },
  map: GameState['map'],
  cols: number,
): void {
  const positionIndex = loser.positions.findIndex((p) => p.armyId === loserArmyId);
  if (positionIndex === -1) return;
  const removedPosition = loser.positions.splice(positionIndex, 1)[0];
  const oldTile = map[oldPos.y * cols + oldPos.x];
  if (oldTile?.positionedBy) {
    oldTile.positionedBy = oldTile.positionedBy.filter(
      (p) => !(p.playerId === loser.id && p.resource === removedPosition.resource),
    );
  }
}
// This is not a new exported function — inline the body (it mirrors the existing defender-lost
// branch's inline code at lines 53-61); shown here as a named block only so both reviewers can
// check the exact logic against one contract.

// --- GameBoardHeader (Proposal 1) ---
// GameBoardHeader.types.ts
import type { ResourceStatViewModel } from '@/modules/hud/components/PlayerInfo';
// Exported from PlayerInfo's index.ts per the File plan (architect-b: not exported there today,
// verified; DRY requires exporting it rather than duplicating the 3-field shape).

export interface GameBoardHeaderViewModel {
  gameName: string;
  isPlaying: boolean;
  victoryPointGoal: number;
  canStartGame: boolean;
  turnPlayerName: string | undefined;
  isMyTurn: boolean;
  turnTimer: { formattedTime: string; isExpiring: boolean };
  resources: ResourceStatViewModel[]; // NEW — local player's {type, label, value}[], empty array when no localPlayer
}

// GameBoardHeader.map.ts
export function toGameBoardHeaderViewModel(
  gameState: GameState,
  isHost: boolean,
  isMyTurn: boolean,
  turnTimer: TurnTimer,
  localPlayer: Player | null, // NEW param
): GameBoardHeaderViewModel;

// --- ActionsPanel (Proposal 3) ---
// ActionsPanel.styles.ts — mainGrid becomes a cva variant, not a plain string:
export const styles = {
  // ...unchanged keys...
  mainGrid: cva('grid grid-cols-3 gap-1.5', {
    variants: { hasSelectedArmy: { true: 'ring-1 ring-primary/40 rounded-lg', false: '' } },
  }),
};
// ActionsPanel.tsx usage: <div className={styles.mainGrid({ hasSelectedArmy })}>

// --- LobbyGameRow (Proposal 5) ---
// No type change. LobbyGameRow.tsx reads game.settings.victoryPointGoal (GameSettings, '@/lib/types')
// directly — already in LobbyGameRowProps.game. New styles.ts key: vpGoalBadge (string, Badge className).
```

## Phases

### Phase 1: Deck wiring + War Chief rebalance (Problems 1 and 2, logic only)
1. Edit `game-setup.reducer.ts`: replace the doubled-`BASE_CARDS` deck build with `SPECIAL_CARDS.filter((card) => settings.availableCards.includes(card))`. (implementer-a)
2. Edit `combat-player-roll.reducer.ts` and `combat-monster-roll.reducer.ts` per the Contracts block: flat `+2` score bonus, no extra die. (implementer-a)
3. Edit `card-data.ts`'s `SPECIAL_CARD_DESCRIPTIONS['War Chief']` text. (implementer-a)
4. Update `game-setup.reducer.test.ts`, `combat-player-roll.reducer.test.ts`, `combat-monster-roll.reducer.test.ts` per the File plan. (tester-a)
5. `npm run typecheck && npm run lint && npm test` on every touched file.
6. Commit: `fix(game-rules): wire SPECIAL_CARDS into deck build, rebalance War Chief to flat +2 score [phase 1/6]`.

Model escalation: none — all steps are mechanical edits against an exact, approved spec.

### Phase 2: Persistent positioning (Problem 3, atomic — logic only)
1. Edit `player-turn.reducer.ts`: remove the position-clearing lines from `applyAutomaticCollection`. (implementer-a)
2. Edit `card-effects.reducer.ts`: remove the equivalent position-clearing lines from `handleUseProductiveCard` (Decision above). (implementer-a)
3. Edit `combat-player-resolve.reducer.ts`: add `oldPos` capture + cleanup to the "Attacker lost" branch, mirroring the existing "defender lost" branch. (implementer-a)
4. Add a one-line comment to `combat-monster-resolve.reducer.ts`'s loss branch recording that a positioned army can never share a tile with a live monster (architect-b confirmed unreachable — see Decisions); no cleanup code. (implementer-a)
5. Update `player-turn.reducer.test.ts`, `card-effects.reducer.test.ts`, and `combat-player-resolve.reducer.test.ts` per the File plan. No new case needed in `combat-monster-resolve.reducer.test.ts`. (tester-a)
6. `npm run typecheck && npm run lint && npm test`.
7. Commit: `fix(game-rules): make resource positioning persist across turns, close the attacker-loss position leak [phase 2/6]`.

Model escalation: step 3 and step 4 need sonnet (exploit-sensitive logic, mirrors game-designer-b's Finding 3; a mechanical copy-paste error here reopens the exploit the review caught).

### Phase 3: Docs update
1. Update `docs/README.md` §5.3/§6.3 (Position), §6.4 (Combat Flow dice math text if it names exact numbers), §6.5 (War Chief's description), and §6.10 (Tutorial copy, if the beacon text duplicates the old "+2 attack power"/"re-position each turn" language) to match Phases 1-2. (implementer-a)
2. `npm run lint` (markdown is not linted by `npm run lint`, but confirm no stray code-fence issues by reading the diff).
3. Commit: `docs(game-rules): record deck wiring, War Chief, and persistent-positioning rule changes [phase 3/6]`.

Model escalation: none.

### Phase 4: ui-designer-b challenger pass + GameBoardHeader resource strip (Proposal 1)
1. **ui-designer-b**: read `GameBoardHeader.tsx/.types.ts/.map.ts/.hook.ts/.styles.ts` and the mobile screenshot referenced in `ui-design.md:61-65` (unverified in the proposal). Confirm or revise Proposal 1's placement, exact token values (matching `vpGoalBadge`'s real classes, `GameBoardHeader.styles.ts:7`), and mobile-collapse behavior. Append a `Review (ui-designer-b)` + `Final spec` section to `ui-design.md` covering Proposals 1, 3, 5 only. (The `ResourceStatViewModel` export question is already resolved by architect-b — see Decisions and File plan; no action needed here.)
2. Edit `GameBoardHeader.types.ts`, `.map.ts`, `.hook.ts`, `.fixtures.ts` per the ui-designer-b Final spec and the Contracts block. (implementer-a)
3. Edit `GameBoardHeader.tsx`, `.styles.ts` to render the resource strip. (implementer-b)
4. Update `GameBoardHeader.map.test.ts` (tester-a) and `GameBoardHeader.test.tsx` (tester-b).
5. Add a preview state in `GameBoardHeader.preview.tsx`. (preview-a)
6. `npm run typecheck && npm run lint && npm test`; `ui-verify` snapshot of `/testbed` for `GameBoardHeader`'s new state.
7. Commit: `feat(hud): add always-visible resource strip to GameBoardHeader [phase 4/6]`.

Model escalation: step 1 (ui-designer-b) needs sonnet — this is the challenger pass the task explicitly calls for.

### Phase 5: ActionsPanel contextual ring emphasis (Proposal 3)
1. Edit `ActionsPanel.styles.ts` per ui-designer-b's Final spec (from Phase 4 step 1) and the Contracts block. (implementer-b)
2. Edit `ActionsPanel.tsx` to apply the variant. (implementer-b)
3. Update `ActionsPanel.test.tsx`. (tester-b)
4. Add an "army selected" preview state in `ActionsPanel.preview.tsx`. (preview-a)
5. `npm run typecheck && npm run lint && npm test`; `ui-verify` snapshot comparing "no selection" vs "army selected".
6. Commit: `feat(hud): emphasize ActionsPanel's main actions when an army is selected [phase 5/6]`.

Model escalation: none — smallest proposal, pure token/class change.

### Phase 6: LobbyGameRow VP Goal badge (Proposal 5)
1. Edit `LobbyGameRow.styles.ts` to add the badge token. (implementer-b)
2. Edit `LobbyGameRow.tsx` to render the `Badge` in `infoGroup`. (implementer-b)
3. Update `LobbyGameRow.test.tsx`. (tester-b)
4. Confirm `LobbyGameRow.preview.tsx`'s existing fixtures exercise varying `victoryPointGoal` values; add one if not. (preview-a)
5. `npm run typecheck && npm run lint && npm test`; `ui-verify` snapshot of the lobby list.
6. Commit: `feat(lobby): show VP goal badge on each game row [phase 6/6]`.

Model escalation: none.

## Test plan
- tester-a (logic, first):
  - `game-setup.reducer.test.ts`: `initialDeck` built from `SPECIAL_CARDS`, length 19 unfiltered, respects `settings.availableCards` filtering.
  - `combat-player-roll.reducer.test.ts`: no bonus dice when War Chief used (dice pool stays `attackPower + 1`); final score adds exactly `+2` when War Chief applied and `0` otherwise; Overcome still short-circuits before War Chief is read.
  - `combat-monster-roll.reducer.test.ts`: same dice-pool assertion; War Chief + Decide Dice Roll compose correctly (override happens before the flat bonus is summed).
  - `player-turn.reducer.test.ts`: a position survives two consecutive `handleEndTurn` calls without re-clicking Position.
  - `card-effects.reducer.test.ts`: `handleUseProductiveCard` no longer clears `player.positions` after collecting.
  - `combat-player-resolve.reducer.test.ts`: attacker loses while positioned on the tile they attacked from — assert `loser.positions` and the tile's `positionedBy` no longer reference that army afterward.
  - `combat-monster-resolve.reducer.test.ts`: no new case — architect-b confirmed the scenario is unreachable.
  - `GameBoardHeader.map.test.ts`: `resources` field maps from `localPlayer.resources` with the same `{type, label, value}` shape as `PlayerInfo`'s; empty array when `localPlayer` is `null`.
- tester-b (view and e2e):
  - `GameBoardHeader.test.tsx`: resource strip renders with 3 chips when `isPlaying`; absent when not playing.
  - `ActionsPanel.test.tsx`: ring class present only when `hasSelectedArmy` is true.
  - `LobbyGameRow.test.tsx`: VP goal badge shows `game.settings.victoryPointGoal`'s exact value.
  - No new e2e spec required — none of these six changes alter a user-facing flow's happy path, only visuals and balance numbers already covered by existing e2e combat/positioning specs if any exist (not verified this session; flag for tester-b to check `e2e/` for an existing combat or positioning spec that asserts dice counts or VP, since Phase 1/2's numbers could silently break an existing e2e assertion).

## Preview states
- `GameBoardHeader`: existing states plus one new "Playing, with resources" state showing the strip (fixtures: non-zero food/wood/gold).
- `ActionsPanel`: existing states plus one new "My turn, army selected" state showing the ring emphasis distinct from the existing "My turn, no selection" state.
- `LobbyGameRow`: existing fixtures should already vary `victoryPointGoal`; if every fixture uses the same value, add one with a different VP goal so the preview demonstrates the badge is live data, not a hardcoded string.

## Risks
- Problem 1's deck-size drop (26 → 19) could affect an existing test or e2e spec that hardcodes a deck-length assumption — Phase 1 step 5's full `npm test` run (not scoped to `game-rules/`) is required to catch this.
- The Phase 1/2 numeric changes could break an e2e spec that asserts specific combat outcomes or VP totals — flagged in the Test plan for tester-b to check before Phase 1 closes.

(Two risks originally listed here — the `ResourceStatViewModel` export gap and the monster-resolve reachability
question — are resolved in Decisions above by architect-b and no longer open.)

## Review (architect-b)
VERDICT: APPROVED

Re-triage justified: re-counted the File plan independently — 29 files across 6 phases (6 game-rules
reducers/data files + docs + 4 test files in Phase 1-2, plus ~19 HUD/lobby files across Phases 4-6),
well past the ~6-file/one-sitting threshold. Tier L confirmed, `triage.md` consistent with `plan.md`.

Verified every path and symbol in "Verified context" and the File plan by opening the real file (not
from the architect's citations alone): `card-data.ts`, `game-setup.reducer.ts:109-111`,
`combat-player-roll.reducer.ts`, `combat-monster-roll.reducer.ts`, `player-turn.reducer.ts`,
`card-effects.reducer.ts`, `combat-player-resolve.reducer.ts`, `combat-monster-resolve.reducer.ts`,
`movement.reducer.ts:81-93`, `combat-initiate.reducer.ts`, `resource-position.reducer.ts`,
`map-generation.ts`, `GameBoardHeader.{tsx,types,map,hook,styles}.ts`, `PlayerInfo.{types,map}.ts`
and its `index.ts`, `ActionsPanel.{types,styles}.ts`, `LobbyGameRow.{types,tsx}.ts`,
`src/lib/types/game.ts` (`victoryPointGoal`), `src/lib/types/map.ts` (`Island.resources`),
`eslint.config.mjs`'s `LEGACY_PATHS`. Also re-grepped for every test/preview/fixture file the File
plan lists as "edit" — all exist. No invented path found; no old-path reference missed (checked
`.claude/`, scripts, docs for stale references to the lines being changed — none found beyond what
the plan already lists as needing a `docs/README.md` update).

### Finding 1 — card-effects.reducer.ts duplication: CONFIRMED, correctly folded into Phase 2
Independently read `handleUseProductiveCard` (`card-effects.reducer.ts:39-86`): it collects from
`player.positions` (lines 57-69, no doubling-aware difference from `applyAutomaticCollection`'s
collection loop except the Productive-specific doubling math) then clears `player.positions` and each
tile's `positionedBy` entry (lines 76-82) — byte-for-byte the same clearing pattern as
`player-turn.reducer.ts:24-30`. Leaving it unfixed would reopen exactly the busywork/stall bug Problem
3 exists to close, for any player holding a Productive card. Architect-a's addition is correct and
necessary; already in the File plan, Phases, Decisions, and Test plan. No change needed here.

### Finding 2 — combat-monster-resolve.reducer.ts reachability: RESOLVED, unreachable
Traced independently (not relying on the proposal's own flag): `map-generation.ts:42-64` only
populates `resources` on tiles typed `IslandType.Resource` (line 61); a `Monster`-typed tile only gets
`monsters` populated (line 63) and keeps the all-tiles default `resources: []` set at
`game-setup.reducer.ts:30`. `handleSelectResourceForPosition` (`resource-position.reducer.ts:22-25`)
requires a non-empty `tile.resources` match to position at all. A tile only gains `resources` when
`handleCloseMonsterCombat` defeats the monster, flips `type` to `Resource`, and sets `resources`
(`combat-monster-resolve.reducer.ts:38-60`) — at which point `monsters` is cleared (line 35) in the
same step. Resources and a live monster are mutually exclusive on every tile, always: the loss branch
(lines 64-89) can never fire for a positioned army. Edited `plan.md` to change Phase 2 step 4,
its File plan row, and its Test plan rows from "conditional" to a fixed outcome: a one-line comment,
no cleanup code, no new test.

### Finding 3 — `ResourceStatViewModel` export gap: RESOLVED, export don't duplicate
The plan explicitly deferred this decision to architect-b. Verified: `PlayerInfo/index.ts` exports
only `PlayerInfoProps` and `PlayerInfoViewModel`, not `ResourceStatViewModel`
(`PlayerInfo.types.ts:17-21`). Per the DRY skill ("if it isn't exported, export it with a minimal
legacy edit instead of copying it"), decided: export it from `PlayerInfo/index.ts` and import from
`@/modules/hud/components/PlayerInfo` in `GameBoardHeader.types.ts`. Added a File plan row
(`PlayerInfo/index.ts`, implementer-a), fixed the Contracts block's import, and narrowed ui-designer-b's
Phase 4 step 1 scope to token values and mobile behavior only — the export question is no longer open.

### Design review
- KISS/DRY/SOLID: sound. Every proposal reuses an existing primitive or token shape (`ResourceIcon`,
  `Badge`, `vpGoalBadge`'s shape, `cva` variants) — no new abstraction, no speculative options. The one
  DRY gap found (`ResourceStatViewModel`) is fixed above. The two-copy "collect then clear" duplication
  between `player-turn.reducer.ts` and `card-effects.reducer.ts` is correctly left as two inline fixes
  rather than extracted into a shared helper — the KISS skill's own threshold ("extract at the third
  copy") isn't met, and the two functions differ (Productive's doubling math), so forcing a shared
  function now would be speculative.
- Phase sizing: Phase 1 (6 files) and Phase 2 (8-9 files, one conditional row now fixed to "no
  change") are each under or near the one-sitting budget and have a real sequencing reason (Phase 2 is
  isolated because it is exploit-sensitive, not because it depends on Phase 1's code) — reasonable.
  Phases 4-6 scale with component count (1 component each), matching the project's usual per-component
  phase size.
- Test plan: adequate. Exact-value assertions throughout (dice-pool size, exact VP, exact flat bonus),
  not ranges; logic tests (tester-a) ordered before view tests (tester-b), matching the `testing` skill.
  The one soft spot — "flag for tester-b to check `e2e/` for an existing combat/positioning spec" — is
  acceptable as a flagged check, not a gap, since no new e2e spec is actually required by this plan's
  acceptance criteria.
- Phases 1-3 (logic) vs 4-6 (UI) independence: confirmed by file-path inspection — zero overlap between
  `src/modules/game-rules/*` + `docs/README.md` (Phases 1-3) and `src/modules/hud/*` +
  `src/modules/lobby/*` (Phases 4-6, plus the one `PlayerInfo/index.ts` row added above, also hud-only).
  Correctly parallelizable as the plan claims.
- Gating Phase 4 on an inline ui-designer-b challenger pass (step 1 of the phase) rather than a separate
  phase: reasonable given this task's shape. It preserves the project's normal invariant — no
  implementer builds against an unreviewed proposal — without adding a 7th phase purely for a
  challenger pass whose scope (3 small, already-concrete proposals) doesn't need its own sitting.
  Phases 5 and 6 already make their implementation steps conditional on "per ui-designer-b's Final spec
  (from Phase 4 step 1)", so the Contracts block's concrete code for those two proposals is correctly
  treated as a draft baseline, not a binding spec, until ui-designer-b's Final spec confirms or revises
  it.

### Minor, non-blocking
- `resource-position.reducer.test.ts`'s File plan row ("may be a thin wrapper... cross-reference") is
  vague; tester-a should confirm during Phase 2 whether this file needs a new case at all or whether
  `player-turn.reducer.test.ts`'s new case already covers the persistence assertion. Not worth blocking
  the plan over — a one-line call tester-a can make.

Phase 1 execution can start now: implementer-a on `game-setup.reducer.ts`, `card-data.ts`,
`combat-player-roll.reducer.ts`, `combat-monster-roll.reducer.ts`; tester-a on the matching
`.reducer.test.ts` files; then `npm run typecheck && npm run lint && npm test` per the plan.
