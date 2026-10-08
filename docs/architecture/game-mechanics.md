# Core Game Mechanics & Turn Actions

Part of the architecture & game-rules docs. Index and directives: [`docs/README.md`](../README.md).

This document provides a meticulous, step-by-step breakdown of the core match flow and every per-turn interaction. It is the definitive blueprint for expected behavior, especially concerning action consumption (`hasActed`).

## 5. Core Game Mechanics & Match Flow

### 5.1. Objective & Winning
The first player to reach the `victoryPointGoal` (default: 30 VP) wins the game. When this occurs, the game `status` changes to 'finished', a `winner` is declared in the game state by creating a deep copy of the winning player object, and a dialog appears announcing the winner. Victory Points (VP) are earned from:
- **Winning Battles:** +5 VP for defeating another player's army.
- **Defeating Monsters:** Variable VP based on monster level (2 for Lvl 1, 5 for Lvl 2, etc.).
- **Island Discovery:** +`vpPerIslandDiscovery` VP for being the first player in the game to reveal a new island. This is only awarded for army movement, not for the 'Scout' card.
- **Passive Abilities:** The `Explorer` ability grants VP each turn for non-base islands you occupy.

### 5.2. The Map & Islands
The game is played on a grid of islands with configurable dimensions (`settings.gridSize.cols` by `settings.gridSize.rows`). Each player starts at their **Base** in a corner. The rest of the map is hidden by Fog of War until a player's army moves to a tile, revealing it. The procedural generation of the map is governed by `src/modules/game-rules/game-setup.reducer.ts` and `map-generation.ts`, and can be tweaked via the "Customize Match" settings in the lobby.
- **Base:** Your starting point. Where you deploy new armies and where defeated armies respawn. Bases also generate all three resource types. The Base's appearance is a castle sprite specific to the player's color, defined in `src/modules/game-rules/player-data.ts`.
- **Resource Islands:** Contain **Food**, **Wood**, or **Gold**. The generation logic is as follows:
    - An island can have one or two types of resources, determined by its distance from the map's center.
    - If an island has **one** resource type, it will always have **two** collection spots for that resource.
    - If an island has **two** resource types, each type will have a random number of collection spots (either one or two).
- **Monster Islands:** Inhabited by hostile creatures that must be defeated. When monsters are present, they are rendered with a dynamic idle animation within the `IslandTile` component. Their sprites randomly shift left and right and have a chance to play their `attack` animation to make them feel alive. All monster sprites are animated GIFs. When the last monster on an island is defeated, the island's type changes to `Resource` and it immediately spawns new resources, following the same generation rules as other resource islands. This makes them valuable strategic targets.
- **Special Islands:** Discovering these grants the player a random Special Card. On subsequent landings on the same island, a dialog appears prompting the player to roll a die. On a roll of 3 or 6, they receive another card.
- **Island Distribution:** The balance between Resource, Monster, and Special islands is controlled by the `resourceDensity` setting (default 60%). This value corresponds to the probability that a tile will be a resource island. The remaining percentage is split between Monster and Special islands, with Special islands being rarer. The distribution also changes based on distance from the map's center, with more valuable and dangerous islands appearing closer to the middle.

### 5.3. Resources & Progression
- **Food (`ResourceType.Food`):** Represented on tiles by grazing livestock pasture (`/sprites/sheep.gif`) and in HUD/dialogs by meat icons (`/sprites/icon_meat.png`). Used to **Deploy** new armies. The cost increases with each new army.
- **Wood (`ResourceType.Wood`):** Represented on tiles by timber trees (`/sprites/tree.gif`) and in HUD/dialogs by wood icons (`/sprites/icon_wood.png`). Used to **Upgrade** the Attack Power of all your armies permanently.
- **Gold (`ResourceType.Gold`):** Represented on tiles by gold mines (`/sprites/mine.png` / `/sprites/mine_active.png`) and in HUD/dialogs by gold icons (`/sprites/icon_gold.png` / `/sprites/gold.gif`). Used to **Buy Special Cards** or purchase permanent **Passive Abilities**.
- **Collecting:** An army positioned on a resource (see **Position** in §6.3) yields that resource at the start of each of its owner's turns until the position is removed.

## 6.1. Turn Structure & The `hasActed` Flag

A player's turn consists of a series of actions. The game automatically ends a player's turn if they have no more possible moves or actions. The core rule is that each army can perform **one** major action per turn (`Attack`, `Position`, or `Move`). This is controlled by the `hasActed` flag on each army object.

1.  **Start of Turn:**
    - When a player's turn begins, the `handleEndTurn` function is called.
    - This function resets `hasActed` to `false` for all of the **new current player's** armies.
    - The player's `actionsThisTurn` array is reset to empty.
    - Resource yields are collected and passive abilities (such as `Collector` and `Explorer`) are calculated.

2.  **Performing an Army Action:**
    - When an army successfully completes a `Move`, `Attack`, or `Position` action, its `hasActed` flag is immediately set to `true`.
    - Once `hasActed` is `true`, that army cannot initiate another major action for the rest of the turn. The UI will show the army as faded, and buttons for these actions will be disabled when that army is selected.
    - The `getPossibleMoves` function will return an empty array `[]` for an army where `hasActed` is `true`.

3.  **End of Turn:**
- The `hasActed` flags are **not** reset when a player ends their turn. They persist until the start of that player's next turn.

## 6.2. Army Selection and Deselection
- **Single-Army Tile Click:** Clicking an army tile selects the army and highlights all valid move tiles. Clicking that same selected army again immediately **toggles and deselects** the army.
- **Multi-Army Tile Click:** Clicking a tile with multiple friendly armies opens the `ArmySelectionDialog`, which displays all armies on that tile, marks the currently selected army with an `Active` badge and primary highlight ring, and allows selecting or toggling deselection.
- **Deselection Triggers:**
  - Clicking any unoccupied or invalid map tile deselects the active army and clears non-modal pending actions.
  - Clicking the **"Deselect Army"** button in the `ActionsPanel` header.
  - Pressing the **Escape** key deselects the active army and cancels any pending card actions.

## 6.3. Army Actions

#### **Position**
1.  **Trigger:** Player clicks the "Position" button in the `ActionsPanel` while a valid, un-acted army is selected on a resource island with no monsters.
2.  **UI Flow:** A local `PositionDialog` opens, showing the available unoccupied resource spots on the current island.
3.  **Input:** Player clicks on a resource button in the dialog.
4.  **Resolution (Shared):** A `GameAction.SelectResourcePosition` action is dispatched.
    -   The `GameState` is updated to mark the army as positioned on that resource spot.
    -   **The army's `hasActed` flag is set to `true`.**
    -   This action ends the army's turn. The army collects that resource at the start of the player's next turn, and keeps collecting it every turn after that without re-clicking Position.
    -   The position is removed only when the army moves (plain move or Teleport), loses a fight it was in (as attacker or defender), or is defeated. Winning a fight from its tile keeps the position.

#### **Attack**
1.  **Trigger:** Player clicks the "Attack" button in the `ActionsPanel` while a valid, un-acted army is selected on an island with a valid target (enemy army or monster).
2.  **UI Flow (vs. Player):**
    -   If there is one target army, the shared `combatState` is set in `GameState`, and the `CombatDialog` opens for both attacker and defender.
    -   If there are multiple target armies, a local `AttackSelectionDialog` opens for the attacker. Upon selection, the shared `combatState` is set, and the `CombatDialog` opens.
3.  **UI Flow (vs. Monster):**
    -   If there is one monster, the shared `monsterCombatState` is set in `GameState`, and the `MonsterCombatDialog` opens for the attacker.
    -   If there are multiple monsters, a local `MonsterSelectionDialog` opens for the attacker. Upon selection, the shared `monsterCombatState` is set, and the `MonsterCombatDialog` opens.
4.  **Resolution (Shared):** When the attacker clicks "Roll Dice" in the dialog, the `handleCombatRoll` or `handleMonsterCombatRoll` action is dispatched.
    -   **The attacking army's `hasActed` flag is immediately set to `true` upon the dice roll.**
    -   Combat is resolved via dice rolls, updating the `GameState` with the result. This action ends the army's turn.

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
- **Defeated armies are not destroyed.** They are sent back to their owner's Base tile to regroup, and their `hasActed` status is **reset to `false`**, making them ready for action on their next turn.
- **Death Animations:** Upon defeat, an animated death sprite is placed on the tile with a `createdAt` timestamp. The host engine automatically removes the animation from Firestore after 1.5s using persistent timer tracking, tiles prune expired animations locally after 2s, and `handleEndTurn` prunes stale animations on turn changes.
- **Combat Dialog Animations:** During the `rolling` phase of combat, both combatants show their `attack` sprite. In the `results` phase, the winner's sprite remains in the `attack` pose, while the loser's sprite changes to the `death` animation. All army and monster sprites are animated GIFs. To ensure combatants face each other, the sprite for the combatant on the right side of the dialog (the defender/monster) is horizontally flipped.
