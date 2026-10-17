# Core Game Mechanics & Turn Actions

Part of the architecture & game-rules docs. Index and directives: [`docs/README.md`](../README.md).

This document provides a meticulous, step-by-step breakdown of the core match flow and every per-turn interaction. It is the definitive blueprint for expected behavior, especially concerning action consumption (`hasActed`).

## 5. Core Game Mechanics & Match Flow

### 5.0. Lobby & Starting a Match
A match stays in `GameStatus.Waiting` once created, even after every seat is filled (`addPlayerToGame`, `src/modules/game-rules/player-join.reducer.ts`) — filling the lobby does not auto-start it. The host starts the match manually with the "Start Game" button (`src/modules/hud/components/GameBoardHeader/GameBoardHeader.tsx`, wired to `startGame` in `src/modules/game-rules/game-setup.reducer.ts`), which is enabled once `status === 'waiting'` and there are 2+ players (`GameBoardHeader.map.ts`'s `canStartGame`) — the host may start early with an open seat, or wait until the lobby is full. The sole exception is solo-vs-bots: `src/modules/lobby/components/Lobby/Lobby.hook.ts` calls `startGame` immediately after `initializeGame`, since there is no second human to wait on.

### 5.1. Objective & Winning
The first player to reach the `victoryPointGoal` (default: 30 VP) wins the game. When this occurs, the game `status` changes to 'finished', a `winner` is declared in the game state by creating a deep copy of the winning player object, and a dialog appears announcing the winner. Victory Points (VP) are earned from:
- **Winning Battles:** +5 VP for defeating another player's army.
- **Defeating Monsters:** VP by monster level, fixed table (`combat-monster-resolve.reducer.ts`): Lvl 1 (Lancer) = 2, Lvl 2 (Bear) = 5, Lvl 3 (Ogre) = 7, Lvl 4 (Minotaur) = 10.
- **Island Discovery:** +`vpPerIslandDiscovery` VP (default 1) for being the first player in the game to reveal a new island. This is only awarded for army movement, not for the 'Scout' card (and not for Teleport either — see [`special-cards.md`](special-cards.md)).
- **Passive Abilities:** The `Explorer` ability grants VP each turn for non-base islands you occupy. See §5.3 for the exact amount.

The win check itself is duplicated across four independent call sites, each immediately after that specific VP grant, every one guarded by `!state.winner` so only the first to cross the threshold is declared: `combat-player-resolve.reducer.ts`, `combat-monster-resolve.reducer.ts`, `island-discovery.reducer.ts`, and `handleEndTurn`'s passive-ability step (§6.1). There is no single centralized win check — a new VP source needs its own guarded check, not a hook into one shared function.

**Victory screen.** While `status === 'finished'`, the match view is replaced by `VictoryDialog` (`src/modules/session/components/VictoryDialog/`), rendered from `GameDialogManager.tsx` when `status === GameStatus.Finished` and `winner` is set. `GameBoard.tsx` does not render the header, board, map or log for that status. The dialog shows "Victory!" to the client whose local player is `winner` and "Game Over" with the winner's name to everyone else; a bot winner gets a `BOT` badge. Its only control is a "Return to Lobby" button, which calls the same `handleConfirmExit` as the in-game exit (so `handlePlayerExit` runs for the finished match, see §6.12). Escape and outside clicks do nothing.

### 5.2. The Map & Islands
The game is played on a grid of islands with configurable dimensions (`settings.gridSize.cols` by `settings.gridSize.rows`). Each player starts at their **Base** in a corner. The rest of the map is hidden by Fog of War until a player's army moves to a tile — this reveals exactly that one tile (`revealIsland`, `src/modules/game-rules/island-discovery.reducer.ts`); there is no radius or neighbor-reveal effect. The procedural generation of the map is governed by `src/modules/game-rules/game-setup.reducer.ts` and `map-generation.ts`, and can be tweaked via the "Customize Match" settings in the lobby, including restricting which special cards (`settings.availableCards`) and passive abilities (`settings.availableAbilities`) are in play at all for that match (defaults: all 13 unique cards, both abilities — see §5.3 and [`special-cards.md`](special-cards.md)).
- **Base:** Your starting point. Where you deploy new armies and where defeated armies respawn. Bases also generate all three resource types. The Base's appearance is a castle sprite specific to the player's color, defined in `src/modules/game-rules/player-data.ts`. A Base tile never carries monsters, regardless of when its seat is filled: the creator's and bots' Base tiles are marked before `generateIslandTerrain` runs, so the generator skips them (`map-generation.ts`). A human guest's Base tile is still terrain-rolled when the match is created, so it may start as a Monster island; `addPlayerToGame` (`src/modules/game-rules/player-join.reducer.ts`) converts it to a Base and clears its `monsters` array at that moment, so the guest's turn starts with no monsters on their Base.
- **Resource Islands:** Contain **Food**, **Wood**, or **Gold**. The generation logic is as follows:
    - An island can have one or two types of resources, determined by its distance from the map's center — but only within a **3-tile radius** of center (Manhattan distance); every resource island beyond that radius is single-type, 100% of the time.
    - If an island has **one** resource type, it will always have **two** collection spots for that resource (`2 × baseResourceAmount`).
    - If an island has **two** resource types (40% chance when within the 3-tile radius, 0% beyond it), each type independently gets 1 or 2 collection spots at 50/50 odds (`baseResourceAmount` or `2 × baseResourceAmount`).
- **Monster Islands:** Inhabited by hostile creatures that must be defeated. When monsters are present, they are rendered with a dynamic idle animation within the `IslandTile` component. Their sprites randomly shift left and right and have a chance to play their `attack` animation to make them feel alive. All monster sprites are animated GIFs. When the last monster on an island is defeated, the island's type changes to `Resource` and it immediately spawns new resources, following the same generation rules as other resource islands. This makes them valuable strategic targets.
    - **The exact center tile of the map is always a solo boss** (`map-generation.ts`): a uniform random pick among catalog entries tagged `isBoss` (`pickBossMonster`, `monster-catalog.ts`), at any level. It is not subject to `resourceDensity` or any roll. The seed Minotaur (level 4) is always in the pool, so it is the default when no other boss exists.
    - For every other Monster island, the possible monster levels are gated by Manhattan distance from center (`monster-catalog.ts`): distance ≤ 1 (the ring immediately around the boss) → levels {3, 4} only; distance ≤ 3 → {1, 2, 3}; distance > 3 → {1, 2} only.
    - If the tile's possible levels include a "big" monster (3 or 4), there's a 30% chance it gets one, always paired with exactly one "little" monster (60% level 1, 40% level 2) — confirming big monsters are always accompanied by a little one. When level 4 is possible (distance ≤ 1), there's a further 25% chance the big roll targets level 4 instead of level 3. Level, then name, is rolled: the name is a uniform pick among the non-boss catalog entries at the rolled level. Non-boss monsters only exist at levels 1–3, so a level-4 roll finds no candidate and falls back to a level-3 monster on ring 1. A level with no candidates falls back to its sibling level (3↔4 where that level is allowed on the tile, 1↔2 for little monsters).
    - Otherwise (no big monster): 70% chance of exactly 1 little monster, 30% chance of 2, each independently rolled from the eligible little-monster levels. A final dedupe step removes an accidental duplicate of the same monster name, so an island never has two of the same monster, even though the roll itself could produce that before dedupe.
    - If no monster can be spawned for a Monster slot, the tile becomes a Resource tile using the normal resource roll (`map-generation.ts`).
    - **Sprites and catalog:** monster art is data-driven from `public/monster/`. Filenames follow `<name>-lvl<N>-idle.gif` (required) and an optional `<name>-lvl<N>-attack.gif`; a `boss-` prefix (`boss-<name>-lvl<N>-idle.gif`) tags the monster as a boss. `<name>` is lowercase letters and digits, hyphen-separated, and becomes the Title Case monster name. Levels are capped at 1–3 for non-boss and 1–4 for boss; a higher level is skipped with a console warning. `npm run generate:monster-catalog` (`scripts/generate-monster-catalog.ts`, parser in `monster-catalog-generator.ts`) writes `monster-catalog.generated.ts` and `src/lib/types/monsters.generated.ts` (the `MonsterName` union). The four seeds (Lancer 1, Bear 2, Ogre 3, Minotaur 4 boss) are always in the catalog. A monster with no attack GIF uses its idle sprite as the attack sprite (`toMonster`); all monsters share `/sprites/death.gif`.
- **Special Islands:** Discovering these grants the player a random Special Card. On subsequent landings on the same island, a dialog appears prompting the player to roll a die. On a roll of 3 or 6, they receive another card. The tile shows the idle temple art (`/sprites/special_island_idle.png`) in place of a generic icon. Each time a card is actually drawn (first discovery or a successful roll), the tile plays a one-shot reveal GIF (`/sprites/special_island_reveal.gif`, 1.4 s) for every viewer. No reveal plays when no card is drawn (scout, failed roll, full hand, empty deck). Fog of war takes precedence over both art states (see [`systems-and-visuals.md`](systems-and-visuals.md) §6.13).
- **Island Distribution:** The balance between Resource, Monster, and Special islands is controlled by the `resourceDensity` setting (default 60%), the probability a tile is Resource. The remaining percentage splits between Monster and Special, and that split itself depends on distance from center (`map-generation.ts`): within the 1-tile ring around the center boss, resource odds are *lower* than normal (`resourceDensity - 0.1`) and the remainder skews **70% Special / 30% Monster** — Special islands are deliberately front-loaded near the center. Beyond that ring, the remainder skews **95% Monster / 5% Special** — Special islands are rare everywhere else, matching the "more dangerous islands cluster toward the middle" intuition, but Special-island odds specifically do the opposite of Monster odds near the center.

### 5.3. Resources & Progression
- **Food (`ResourceType.Food`):** Represented on tiles by grazing livestock pasture (`/sprites/sheep.gif`) and in HUD/dialogs by meat icons (`/sprites/icon_meat.png`). Used to **Deploy** new armies. Cost starts at `initialDeployCost` (default 6) and rises by `deployCostIncrement` (default 2) after each deploy — 6, 8, 10, 12, 14 for a player's 2nd through 5th army by default.
- **Wood (`ResourceType.Wood`):** Represented on tiles by timber trees (`/sprites/tree.gif`) and in HUD/dialogs by wood icons (`/sprites/icon_wood.png`). Used to **Upgrade** the Attack Power of all your armies permanently. Flat cost (`settings.upgradeCost`, default 6) per level, capped at attack power 4.
- **Gold (`ResourceType.Gold`):** Represented on tiles by gold mines (`/sprites/mine.png` / `/sprites/mine_active.png`) and in HUD/dialogs by gold icons (`/sprites/icon_gold.png` / `/sprites/gold.gif`). Used to **Buy Special Cards** (flat 10 gold) or purchase permanent **Passive Abilities** (flat `settings.abilityCost`, default 15 gold each).
- **Collecting:** An army positioned on a resource (see **Position** in §6.3) yields that resource once, at the start of its owner's next turn. The collected position is then cleared, so the army must be re-positioned each turn to keep collecting. Each collection spot on a tile yields `baseResourceAmount` (default 1) per collection. Automatic collection (`applyAutomaticCollection`) and the Productive card's collection (`handleUseProductiveCard`) both clear the spots they credit, via `clearCollectedPositions` (`src/modules/game-rules/resource-collection.ts`).
- **Default economy settings** (`src/modules/game-rules/game-settings.ts`, all overridable per match via the lobby's "Customize Match"): `victoryPointGoal: 30`, `vpPerIslandDiscovery: 1`, `initialDeployCost: 6`, `deployCostIncrement: 2`, `upgradeCost: 6`, `abilityCost: 15`, `baseResourceAmount: 1`, `resourceDensity: 0.6`.
- **Passive Abilities** (`src/lib/types/cards.ts` — only two exist, there is no larger ability catalog): bought once each, non-stacking, via `BuyAbility` (flat `abilityCost`, blocked if the player already owns it or if it's not in `settings.availableAbilities` for this match). Both are evaluated at the start of each of the owning player's own turns (`handleEndTurn`, deduped per tile so multiple armies on the same island don't multiply the effect):
    - **Explorer:** +1 VP per distinct non-Base island one of the player's armies currently occupies.
    - **Collector:** +1 of *every* resource type present on each distinct Resource-type island one of the player's armies occupies — this is separate from, and stacks with, the normal auto-collection from Positioned armies.

## 6.1. Turn Structure & The `hasActed` Flag

A player's turn consists of a series of actions. The game automatically ends a player's turn if they have no more possible moves or actions. The core rule is that each army can perform **one** major action per turn (`Attack`, `Position`, or `Move`). This is controlled by the `hasActed` flag on each army object.

1.  **Start of Turn:**
    - `handleEndTurn` (`src/modules/game-rules/player-turn.reducer.ts`) first rotates `currentPlayerIndex` to the next seat, then **skips every consecutive Sabotaged player in the same call** — bounded by a loop that never exceeds `players.length` iterations, so a fully-sabotaged table can't hang. Each skipped player's `isSabotaged` flag is cleared and a log line is written as it's skipped; `handleEndTurn` only finishes landing on, and fully processing, the first non-sabotaged seat it reaches.
    - `state.turn` increments on whichever of two mutually-exclusive moments the rotation wraps back to seat 0: mid-skip-loop (if a sabotage-skip lands on seat 0) or once after the loop exits (if the final landing seat is 0 with no skips) — never both for the same wrap.
    - Once landed, this function resets `hasActed` to `false` for all of the **new current player's** armies.
    - The player's `actionsThisTurn` array is reset to empty, along with `hasExtraMove`, `efficientActive`, `masterBuilderActive`, and `reinforceActive` — any of these left active from an uncompleted card use this same call simply lapses (the card itself stays in hand; see [`special-cards.md`](special-cards.md) "Canceling a Card").
    - Resource yields are collected and passive abilities (`Collector` and `Explorer`) are calculated — see §5.3 for their exact effects.
    - Any leftover `combatState`/`monsterCombatState` is unconditionally cleared, and expired death animations (older than 2000ms) and card-reveal animations (older than 1400ms) are pruned, regardless of whether this turn change came from a sabotage skip.

2.  **Performing an Army Action:**
    - When an army successfully completes a `Move`, `Attack`, or `Position` action, its `hasActed` flag is immediately set to `true`.
    - Once `hasActed` is `true`, that army cannot initiate another major action for the rest of the turn. The UI will show the army as faded, and buttons for these actions will be disabled when that army is selected.
    - The `getPossibleMoves` function will return an empty array `[]` for an army where `hasActed` is `true`.

3.  **End of Turn:**
- The `hasActed` flags are **not** reset when a player ends their turn. They persist until the start of that player's next turn.

4.  **Turn Timer:** Every turn is capped at **120 seconds** (`TURN_DURATION`, `src/modules/game-board/turn-timer.hook.ts`) for the active local player. The countdown resets whenever it becomes that player's turn, and if it reaches zero it **automatically dispatches `GameAction.EndTurn`** for them — no confirmation. The last 20 seconds trigger an `isExpiring` warning state, rendered in four places: the header countdown (`GameBoardHeader`), the status badge (`GameStatusBadge`, `data-testid="turn-countdown-timer"`), and the desktop and mobile End Turn controls (`ActionsPanel`, `MobileActionsBar`). **This timer is purely client-side** — it only runs inside the active player's own open browser tab, so a player who disconnects without that tab cleanly closing (no `beforeunload` firing) does not get their turn ended by it; nothing today ends a genuinely dropped player's turn automatically.

## 6.2. Army Selection and Deselection
- **Single-Army Tile Click:** Clicking an army tile selects the army and highlights all valid move tiles. Clicking that same selected army again immediately **toggles and deselects** the army.
- **Multi-Army Tile Click:** Clicking a tile with multiple friendly armies opens the `ArmySelectionDialog`, which displays all armies on that tile, marks the currently selected army with an `Active` badge and primary highlight ring, and allows selecting or toggling deselection.
- **Deselection Triggers:**
  - Clicking any unoccupied or invalid map tile deselects the active army and clears non-modal pending actions.
  - Clicking the **"Deselect Army"** button in the `ActionsPanel` header. If a card action is pending (a pending action, or an active Reinforce, Efficient, Master Builder or Extra Move), it is cancelled too, the same as the Cancel button (see [`special-cards.md`](special-cards.md) §6.6).
  - Pressing the **Escape** key deselects the active army and cancels any pending card actions.

## 6.3. Army Actions

#### **Position**
1.  **Trigger:** Player clicks the "Position" button in the `ActionsPanel` while a valid, un-acted army is selected on a resource island with no monsters.
2.  **UI Flow:** A local `PositionDialog` opens, showing the available unoccupied resource spots on the current island.
3.  **Input:** Player clicks on a resource button in the dialog.
4.  **Resolution (Shared):** A `GameAction.SelectResourcePosition` action is dispatched.
    -   The `GameState` is updated to mark the army as positioned on that resource spot.
    -   **The army's `hasActed` flag is set to `true`** (unless the position is an Extra Move bonus action; see [`special-cards.md`](special-cards.md) §6.6).
    -   Without Extra Move, this action ends the army's turn. The army collects that resource once, at the start of the player's next turn (§5.3). That collection clears the position, so the army must click Position again on a later turn to collect again.
    -   A position is also removed when the army moves (plain move or Teleport), loses a fight it was in (as attacker or defender), or is defeated. Winning a fight from its tile keeps the position until the next collection.

#### **Attack**
1.  **Trigger:** Player clicks the "Attack" button in the `ActionsPanel` while a valid, un-acted army is selected on an island with a valid target (enemy army or monster).
2.  **UI Flow (vs. Player):**
    -   If there is one target army, the shared `combatState` is set in `GameState`, and the `CombatDialog` opens for both attacker and defender.
    -   If there are multiple target armies, a local `AttackSelectionDialog` opens for the attacker. Upon selection, the shared `combatState` is set, and the `CombatDialog` opens.
3.  **UI Flow (vs. Monster):**
    -   If there is one monster, the shared `monsterCombatState` is set in `GameState`, and the `MonsterCombatDialog` opens for the attacker.
    -   If there are multiple monsters, a local `MonsterSelectionDialog` opens for the attacker. Upon selection, the shared `monsterCombatState` is set, and the `MonsterCombatDialog` opens.
4.  **Resolution (Shared):** When the attacker clicks "Roll Dice" in the dialog, the `handleCombatRoll` or `handleMonsterCombatRoll` action is dispatched.
    -   **The attacking army's `hasActed` flag is immediately set to `true` upon the dice roll** (unless the attack is an Extra Move bonus action; see [`special-cards.md`](special-cards.md) §6.6).
    -   Combat is resolved via dice rolls, updating the `GameState` with the result. Without Extra Move, this action ends the army's turn.

#### **Move**
1.  **Trigger:** Player has a valid, un-acted army selected and clicks on a highlighted tile on the map that is a valid move destination.
2.  **UI Flow:** No dialogs. The army's sprite appears to move to the new tile.
3.  **Resolution (Shared):** A `GameAction.Move` action is dispatched.
    -   The `GameState` is updated with the army's new `position`.
    -   **The army's `hasActed` flag is set to `true`** (unless "Extra Move" is used on a fresh army).
    -   If the destination tile was previously unrevealed by this player, `revealIsland` logic is triggered.

## 6.4. Strategic Actions
These actions are available once per turn each and do not set the `hasActed` flag on any army.

#### **Deploy**
1.  **Trigger:** Player clicks the "Deploy" button in the `ActionsPanel`. This is enabled only if the player has enough Wheat (or the `Reinforce` card is active), has fewer than 5 armies, and has not already used this action this turn.
2.  **UI Flow:** No dialog.
3.  **Resolution (Shared):** A `GameAction.Deploy` action is dispatched. The `GameState` is updated:
    -   Wheat is subtracted (or reduced to 0/50% if `Reinforce` or `Efficient` was active).
    -   A new army is added to the player's Base tile with `hasActed: true` (since it cannot act on the turn it is deployed).
    -   The `deploy` action is marked as used for the turn by adding it to `player.actionsThisTurn`.
    -   If `Reinforce` or `Efficient` was used, that card is consumed.

#### **Upgrade**
1.  **Trigger:** Player clicks the "Upgrade" button in the `ActionsPanel`. Enabled only if the player has enough Iron (or `MasterBuilder` card is active), their attack power is less than the max, and they haven't used this action this turn.
2.  **UI Flow:** No dialog.
3.  **Resolution (Shared):** A `GameAction.Upgrade` action is dispatched. `GameState` is updated:
    -   Iron is subtracted.
    -   The player's global `attackPower` is increased.
    -   The `upgrade` action is marked as used for the turn.
    -   If `Master Builder` was used, that card is consumed.

#### **Buy Card**
1.  **Trigger:** Player clicks the "Buy Card" button in the `ActionsPanel`. Enabled if the player has >= 10 Gems, their hand is not full (< 7), either the deck or discard pile has cards, and they haven't used this action this turn.
2.  **UI Flow:** No dialog. A message appears in the game log.
3.  **Resolution (Shared):** A `GameAction.BuyCard` action is dispatched. `GameState` is updated:
    -   Gems are subtracted.
    -   A random card is drawn from the `specialCardsDeck` (reshuffling the discard pile if the deck is empty) to the player's hand.
    -   The `buy-card` action is marked as used for the turn.

#### **Use Card**
1.  **Trigger:** Player clicks the "My Cards" button to open the local `CardsDialog`, then clicks the "Use" button on a specific card. The "Use" button is only enabled if the player has not already used a card this turn.
2.  **UI Flow & Resolution:** Varies by card. See [`special-cards.md`](special-cards.md).

## 6.5. Combat Flow
- Combat is resolved through dice rolls. Each player rolls a number of dice equal to their **Attack Power + 1** without an arbitrary ceiling.
- **Monsters roll dice equal to their Level:** Level 1 (Lancer) rolls 1 die, Level 2 (Bear) rolls 2 dice, Level 3 (Ogre) rolls 3 dice, and Level 4 (Minotaur) rolls 4 dice.
- **Card Selection in Combat:** In both Player and Monster combat preparation dialogs, available combat cards are rendered as a mutually exclusive `RadioGroup` (`None`, `Overcome`, `War Chief`, `Decide Dice Roll`). When a card is selected and the combat roll is executed, the card is immediately consumed from `player.specialCards`, added to `discardPile`, and recorded in `player.actionsThisTurn`.
- **Player vs. Player:** The player with the higher total roll wins the battle. In case of a tie, the **defender** wins.
- **Player vs. Monster:** The player with the higher total roll wins the battle. In case of a tie, the **monster** wins.
- **Defeated armies are not destroyed.** They are sent back to their owner's Base tile to regroup with `hasActed` set to **`true`**, so they cannot act again during the rest of the turn in which they were defeated. Their `hasActed` flag is cleared by the normal start-of-turn reset (§6.1) on their owner's next turn.
- **Death Animations:** Upon defeat, an animated death sprite is placed on the tile with a `createdAt` timestamp. The host engine automatically removes the animation from Firestore after 1.5s using persistent timer tracking, tiles prune expired animations locally after 2s, and `handleEndTurn` prunes stale animations on turn changes.
- **Combat Dialog Animations:** During the `rolling` phase of combat, both combatants show their `attack` sprite. In the `results` phase, the winner's sprite remains in the `attack` pose, while the loser's sprite changes to the `death` animation. All army and monster sprites are animated GIFs. To ensure combatants face each other, the sprite for the combatant on the right side of the dialog (the defender/monster) is horizontally flipped.
