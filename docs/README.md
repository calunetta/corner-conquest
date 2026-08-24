

# Corner Conquest - Application Architecture

This document outlines the architecture and key logic flows of the "Corner Conquest" application. It serves as a shared context for AI-assisted development to ensure consistency and accuracy.

**Development Directives for the AI Assistant:**
1.  **Synchronized Documentation:** For every code change I make, I **must** also update this `docs/README.md` file in the same transaction to reflect those changes. The code and the documentation will always be kept in sync.
2.  **Blueprint-First Validation:** Before I implement any change, I **must** first analyze the request against the established architecture and logic documented here. If the request conflicts with our blueprint, I will notify you of the discrepancy and await your confirmation before proceeding.
3.  **Comprehensive Automated & E2E Testing:** Every new feature, UI mechanic, or bug fix **must** be tested and tracked with both unit tests (`npm test`) and Playwright E2E browser tests (`npm run test:e2e`).

## 1. Core Technologies

- **Framework:** Next.js with App Router
- **Language:** TypeScript
- **UI:** React, ShadCN UI Components, Tailwind CSS
- **State Management (Local/UI):** React Context + Reducer (`src/features/game/context/GameBoardContext.tsx` consuming `useGameBoard()`)
- **State Management (Shared Game):** Firestore real-time listeners (`useGameEngine`)
- **Testing:** Jest (`npm test`) for unit/reducer tests & Playwright (`npm run test:e2e`) for browser E2E tests
- **Backend/Database:** Firebase (Firestore)

## 2. Project Structure & Development Guide

Understanding the project's structure is key to making changes efficiently and correctly.

- `e2e/`: Playwright End-to-End browser test suites (`auth-and-lobby.spec.ts`, `gameplay.spec.ts`, `map-viewport.spec.ts`, `tutorial-beacons.spec.ts`).
- `src/app/`: Core application, pages, and layout.
- `src/components/`: Reusable, generic UI components (mostly from ShadCN).
- `src/features/`: Contains domain-specific components and logic structured according to the **SOLID paradigm** (Single Responsibility Principle):
  - `game/`: All components, dialogs, hooks, context, and panels related to the active game board.
    - `context/`:
      - `GameBoardContext.tsx`: Centralized React Context and pure `gameBoardReducer` managing local UI state (`selectedArmyId`, `possibleMoves`, `pendingAction`, and 12+ dialog states). Exposes `useGameBoard()`.
    - `components/`:
      - `GameBoard.tsx`: High-level layout orchestrator (<80 lines) composing atomic subcomponents with `<GameBoardProvider>`.
      - `GameBoardHeader.tsx`: Navigation, match status, VP goal, and start game controls with **0 props**.
      - `PlayerInfoBar.tsx`: Collapsible player cards list, goal badge, and tutorial beacon with **0 props**.
      - `GameStatusBadge.tsx`: Turn indicator and player queue badge with **0 props**.
      - `GameDialogManager.tsx`: Dedicated container for mounting all 15+ modal dialogs with **zero prop-drilling**.
      - `MapGrid.tsx`: Lightweight terrain board orchestrator (<70 lines, **0 props**) with pan and pinch-to-zoom support.
      - `MapZoomControls.tsx`: Glassmorphic zoom controls HUD (+ / - / Reset 100%) with **0 props or callback props**.
      - `MapDecorations.tsx`: Deterministic fixed rock placement in perimeter water margins with mobile responsive filtering.
      - `IslandTile.tsx`: Island tile rendering, selection borders, and 3D hover effects with **1 prop (`{ island }`)**.
      - `AnimatedMonster.tsx`: Monster sprite animation and interval tracking.
      - `TileOccupants.tsx`: Fog-of-war aware army sprites and death animations with **1 prop (`{ island }`)**.
      - `TileResources.tsx`: Resource icons and player position indicators with **1 prop (`{ island }`)**.
    - `panels/`:
      - `ActionsPanel.tsx`: Action buttons, shop triggers, and turn countdown timer with **0 props**.
      - `GameLog.tsx`: Reverse-chronological match action log with **0 props**.
      - `PlayerInfo.tsx`: Individual player HUD card.
    - `hooks/`:
      - `useMapPanZoom.ts`: Pure pan, pinch-to-zoom, mouse wheel zoom, and drag handler hook.
      - `useTurnTimer.ts`: Turn countdown timer, interval tracking, and auto-timeout dispatch.
    - `types.ts`: Re-exports domain dialog types from `@/lib/types/dialogs`.
  - `lobby/`: Components for creating and joining games (`Lobby.tsx` with 2-column command center and scrollable match list, `LobbyBackground.tsx` with animated battle diorama and 4 faction bases, `LobbyGameRow.tsx`, `CreateGameDialog.tsx`, `CustomSettingsSheet.tsx`).
    > [!IMPORTANT]
    > **Visual Parity Rule:** The Login page (`src/app/page.tsx`) must always share the exact same aesthetic theme, background (`<LobbyBackground />`), glassmorphism, and color palette as the Game Lobby. Any updates to the Lobby's visual presentation must be mirrored in the Login view.
- `src/hooks/`: Custom React hooks (`useGameEngine`, `usePlayer`, `useIsMobile`, `useToast`).
- `src/lib/`: Core application logic, type definitions, and Firebase configuration.
  - `__tests__/`: Comprehensive Jest test suites covering all game mechanics (movement, combat, cards, turn progression, player actions, bot AI).
  - `actions/`: **The "brain" of the game.** Pure reducer functions that calculate next `GameState` given an action.
  - `types/`: **Domain-specific Modular Types** with central barrel export (`index.ts`):
    - `actions.ts`: `GameAction`, `MAP_ROWS`, `MAP_COLS`, `HAND_LIMIT`
    - `cards.ts`: `CardName`, `AbilityName`, `ResourceType`, `PassiveAbilities`
    - `monsters.ts`: `MonsterName`, `Monster`
    - `map.ts`: `IslandType`, `IslandResource`, `PlayerPosition`, `Island`, `BaseTileInfo`
    - `player.ts`: `PlayerColor`, `Army`, `Player`
    - `combat.ts`: `CombatPhase`, `CombatState`, `MonsterCombatState`, `DeathAnimation`
    - `game.ts`: `GameStatus`, `GameSettings`, `GameState`, `ActionHandlerResult`
    - `dialogs.ts`: `PendingAction`, `ProductiveCardDialogState`, `SpecialIslandRollDialogState`, `ArmySelectionDialogState`, etc.
    - `index.ts`: Barrel export aggregating all domain types.
  - `game-initializer.ts`: Map generation and initial match setup.
  - `game-logic.ts`: Higher-level room management and player joins.
  - `bot-logic.ts`: AI bot decision engine.

## 3. State Management & Session Logic

The application's architecture is built on a strict separation between **Shared State** (the game's source of truth) and **Local State** (a single player's UI status). Understanding this distinction is critical.

### 3.1. Player Session Management (`usePlayer` Hook)
The player's session (their identity) is managed through a combination of browser `localStorage` and Firestore, orchestrated by the `usePlayer` hook.

1.  **First Visit:**
    *   The `usePlayer` hook generates a unique `playerId` (e.g., `player_1678886400000_abcdef`).
    *   This `playerId` is immediately stored in `localStorage`. This ID persists across page reloads and browser sessions, uniquely identifying the user's browser.

2.  **Login (`setUsername`):**
    *   When a user enters a username, the `setUsername` function creates a document in a Firestore collection named `usernames`. The document's ID is the chosen username (e.g., `usernames/Alice`).
    *   The content of this document is the user's unique `playerId`. This acts as a "lock," ensuring no one else with a different `playerId` can claim the username "Alice".
    *   The chosen username is also saved to `localStorage`.

3.  **Session Persistence (Page Reload):**
    *   When the page is reloaded, `usePlayer` loads both the `playerId` and `username` from `localStorage`.
    *   **Crucially, it then re-validates this session with Firestore.** It checks if the `usernames/Alice` document still exists and if the `playerId` inside it matches the one stored in the browser.
    *   If it matches, the session is restored. If it doesn't match (e.g., the document was deleted or taken by another player), the local session is cleared, and the user is returned to the login screen.

4.  **Logout / Tab Close (`logout`):**
    *   When the user logs out or closes the tab, a cleanup function is triggered.
    *   It deletes the `usernames/Alice` document from Firestore, freeing up the username for others.
    *   It also clears the `username` from `localStorage`.

### 3.2. Shared Game State: The `GameState` Object

-   **Definition File:** `src/lib/types.ts`
-   **What It Is:** The `GameState` object is the single, authoritative state of the match. It contains only the data that **must** be synchronized across all players.
-   **Synchronization:** It is stored as a single document in Firestore. The `useGameEngine` hook subscribes to this document, and any change to it is automatically pushed to all connected clients, causing a UI re-render.
-   **Key `GameState` Variables:**
    -   `players: Player[]`: The array of all player objects, including their resources, victory points, army positions, and status effects.
    -   `map: Island[]`: The array representing the game board, including island types, resources, and occupants.
    -   `currentPlayerIndex: number`: The index of the player whose turn it is.
    -   `turn: number`: The current turn number.
    -   `log: string[]`: The public history of game events.
    -   `combatState`, `monsterCombatState`: Shared state for combat encounters, so all players can see the results.
-   **When to Modify:** Only when an action occurs that irrevocably changes the game for **all** players (e.g., an army moves, a resource is spent, a turn ends).

### 3.3. Local UI State: The `GameBoardContext` & Reducer Pattern

-   **Definition File:** `src/features/game/context/GameBoardContext.tsx`
-   **What It Is:** Local UI state refers to temporary interaction data for a single player (selected armies, valid movement indicators, pending multi-step card effects like teleport/scout, and modal dialog open/closed states).
-   **Architecture:** Managed via a pure `gameBoardReducer` and exposed through `GameBoardProvider` and the `useGameBoard()` hook.
-   **Zero Prop-Drilling:** Components such as `GameDialogManager`, `GameBoardHeader`, and `ActionsPanel` consume `useGameBoard()` directly, eliminating massive prop interfaces and state fragmentation.
-   **Key Local State Variables (`GameBoardUIState`):**
    -   `selectedArmyId: number | null`: The ID of the army the local player has clicked on.
    -   `possibleMoves: {x, y}[]`: The array of valid move locations for the selected army, used for highlighting tiles.
    -   `pendingAction: PendingAction | null`: State for multi-step local actions (e.g., scout, teleport).
    -   `dialogs`: Sub-state grouping all 12+ dialog states (`abilitiesShopOpen`, `cardsPlayerId`, `position`, `sabotage`, `wealthy`, `stealResource`, `confirmExit`, etc.).

### 3.4. The Action Flow: From Click to Update

1.  **Local Intent:** A player clicks on an army. `handleTileClick` dispatches `SET_SELECTED_ARMY` in `GameBoardContext`. The UI re-renders instantly to show the selection. **No Firebase write occurs.**
2.  **Local Validation:** The player clicks a valid destination tile. `handleTileClick` verifies this is a possible move against `settings.gridSize.cols` and `settings.gridSize.rows`.
3.  **Shared Action Dispatch:** Now that the action is confirmed, `handleTileClick` calls `onAction(GameAction.Move, ...)`. This is the crossover from local to shared.
4.  **Shared State Update:** The `onAction` handler calls the `setGameState` function, which executes the `handleMoveAction` reducer from `lib/actions`. This pure function calculates the new army position dynamically and returns a brand new `GameState` object.
5.  **Synchronization:** `setGameState` writes the new `GameState` object to Firestore. Firestore then pushes this update to all connected players, who see the army move on their screens.

This architecture ensures the UI is fast and responsive for local interactions, while maintaining a single, consistent source of truth for the game itself.

## 4. Root Cause Analysis & Debugging Philosophy
A guiding principle for this project is to **fix the root cause of a bug, not just its symptoms**. A recurring bug often indicates a flaw in the underlying architecture or state management logic.
-   **Symptom:** An observable, incorrect behavior (e.g., "The 'Deselect Army' button doesn't work.").
-   **Root Cause:** The fundamental reason the symptom occurs (e.g., "A `useEffect` hook for auto-selection is incorrectly re-selecting an army immediately after it was deselected, creating a state race condition.").
-   **Our Approach:** When a bug is identified, especially a recurring one, the first step is to analyze the entire data and action flow related to the feature. We must resist the urge to apply a "quick fix" that only patches the symptom. Instead, we must identify the core conflict in the logic and refactor it. This prevents the bug from reappearing in a different form later and leads to a more robust and maintainable codebase.

## 5. Core Game Mechanics & Match Flow

### 5.1. Objective & Winning
The first player to reach the `victoryPointGoal` (default: 30 VP) wins the game. When this occurs, the game `status` changes to 'finished', a `winner` is declared in the game state by creating a deep copy of the winning player object, and a dialog appears announcing the winner. Victory Points (VP) are earned from:
- **Winning Battles:** +5 VP for defeating another player's army.
- **Defeating Monsters:** Variable VP based on monster level (2 for Lvl 1, 5 for Lvl 2, etc.).
- **Island Discovery:** +`vpPerIslandDiscovery` VP for being the first player in the game to reveal a new island. This is only awarded for army movement, not for the 'Scout' card.
- **Passive Abilities:** The `Explorer` ability grants VP each turn for non-base islands you occupy.

### 5.2. The Map & Islands
The game is played on a grid of islands with configurable dimensions (`settings.gridSize.cols` by `settings.gridSize.rows`). Each player starts at their **Base** in a corner. The rest of the map is hidden by Fog of War until a player's army moves to a tile, revealing it. The procedural generation of the map is governed by the `game-initializer.ts` file and can be tweaked via the "Customize Match" settings in the lobby.
- **Base:** Your starting point. Where you deploy new armies and where defeated armies respawn. Bases also generate all three resource types. The Base's appearance is a castle sprite specific to the player's color, defined in `src/lib/player-data.ts`.
- **Resource Islands:** Contain **Wheat**, **Iron**, or **Gems**. The generation logic is as follows:
    - An island can have one or two types of resources, determined by its distance from the map's center.
    - If an island has **one** resource type, it will always have **two** collection spots for that resource.
    - If an island has **two** resource types, each type will have a random number of collection spots (either one or two).
- **Monster Islands:** Inhabited by hostile creatures that must be defeated. When monsters are present, they are rendered with a dynamic idle animation within the `IslandTile` component. Their sprites randomly shift left and right and have a chance to play their `attack` animation to make them feel alive. All monster sprites are animated GIFs. When the last monster on an island is defeated, the island's type changes to `Resource` and it immediately spawns new resources, following the same generation rules as other resource islands. This makes them valuable strategic targets.
- **Special Islands:** Discovering these grants the player a random Special Card. On subsequent landings on the same island, a dialog appears prompting the player to roll a die. On a roll of 3 or 6, they receive another card.
- **Island Distribution:** The balance between Resource, Monster, and Special islands is controlled by the `resourceDensity` setting (default 60%). This value corresponds to the probability that a tile will be a resource island. The remaining percentage is split between Monster and Special islands, with Special islands being rarer. The distribution also changes based on distance from the map's center, with more valuable and dangerous islands appearing closer to the middle.

### 5.3. Resources & Progression
- **Wheat:** Used to **Deploy** new armies. The cost increases with each new army.
- **Iron:** Used to **Upgrade** the Attack Power of all your armies permanently.
- **Gems:** Used to **Buy Special Cards** or purchase permanent **Passive Abilities**.

## 6. Detailed Interaction Flows: The Turn and Action Lifecycle

This section provides a meticulous, step-by-step breakdown of every interaction in the game. It serves as the definitive blueprint for expected behavior, especially concerning action consumption (`hasActed`).

### 6.1. Turn Structure & The `hasActed` Flag

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

### 6.2. Army Selection and Deselection
- **Single-Army Tile Click:** Clicking an army tile selects the army and highlights all valid move tiles. Clicking that same selected army again immediately **toggles and deselects** the army.
- **Multi-Army Tile Click:** Clicking a tile with multiple friendly armies opens the `ArmySelectionDialog`, which displays all armies on that tile, marks the currently selected army with an `Active` badge and primary highlight ring, and allows selecting or toggling deselection.
- **Deselection Triggers:**
  - Clicking any unoccupied or invalid map tile deselects the active army and clears non-modal pending actions.
  - Clicking the **"Deselect Army"** button in the `ActionsPanel` header.
  - Pressing the **Escape** key deselects the active army and cancels any pending card actions.

### 6.3. Army Actions

#### **Position**
1.  **Trigger:** Player clicks the "Position" button in the `ActionsPanel` while a valid, un-acted army is selected on a resource island with no monsters.
2.  **UI Flow:** A local `PositionDialog` opens, showing the available unoccupied resource spots on the current island.
3.  **Input:** Player clicks on a resource button in the dialog.
4.  **Resolution (Shared):** A `GameAction.SelectResourcePosition` action is dispatched.
    -   The `GameState` is updated to mark the army as positioned on that resource spot.
    -   **The army's `hasActed` flag is set to `true`.**
    -   This action ends the army's turn. The army will collect that resource at the start of the player's next turn.

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

### 6.3. Strategic Actions
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
2.  **UI Flow & Resolution:** Varies by card. See "Special Card Interactions" below.

### 6.4. Combat Flow
- Combat is resolved through dice rolls. Each player rolls a number of dice equal to their **Attack Power + 1** without an arbitrary ceiling.
- **Monsters roll dice equal to their Level:** Level 1 (Lancer) rolls 1 die, Level 2 (Bear) rolls 2 dice, Level 3 (Ogre) rolls 3 dice, and Level 4 (Minotaur) rolls 4 dice.
- **Card Selection in Combat:** In both Player and Monster combat preparation dialogs, available combat cards are rendered as a mutually exclusive `RadioGroup` (`None`, `Overcome`, `War Chief`, `Decide Dice Roll`). When a card is selected and the combat roll is executed, the card is immediately consumed from `player.specialCards`, added to `discardPile`, and recorded in `player.actionsThisTurn`.
- **Player vs. Player:** The player with the higher total roll wins the battle. In case of a tie, the **defender** wins.
- **Player vs. Monster:** The player with the higher total roll wins the battle. In case of a tie, the **monster** wins.
- **Defeated armies are not destroyed.** They are sent back to their owner's Base tile to regroup, and their `hasActed` status is **reset to `false`**, making them ready for action on their next turn.
- **Death Animations:** Upon defeat, an animated death sprite is placed on the tile with a `createdAt` timestamp. The host engine automatically removes the animation from Firestore after 1.5s using persistent timer tracking, tiles prune expired animations locally after 2s, and `handleEndTurn` prunes stale animations on turn changes.
- **Combat Dialog Animations:** During the `rolling` phase of combat, both combatants show their `attack` sprite. In the `results` phase, the winner's sprite remains in the `attack` pose, while the loser's sprite changes to the `death` animation. All army and monster sprites are animated GIFs. To ensure combatants face each other, the sprite for the combatant on the right side of the dialog (the defender/monster) is horizontally flipped.

### 6.5. Special Card Interactions
-   **Starting a Match:** In a standard Player-vs-Player match, all players start with **zero** Special Cards. In a Player-vs-Bot match, if `Debug Mode` is enabled, the human player starts with one of every available Special Card.
-   **Hand Limit & Card Acquisition:** A player can hold a maximum of **7** Special Cards. If a player discovers a Special Island or buys a card while their hand is full, they do not receive a new card. If the main deck runs out of cards, the discard pile is shuffled to create a new deck.
-   **Using a Card:** When a player uses a card, it is removed from their hand and placed in the `discardPile`. The `Use Card` action is consumed for the turn. Cards relevant to a specific action (e.g., `War Chief` or `Overcome` for combat) appear as mutually exclusive options within that action's dialog.
-   **Canceling a Card:** If a player activates a card like "Extra Move", "Teleport", "Reinforce", "Efficient", or "Master Builder" but chooses not to proceed, they can click "Cancel". This restores the card to their hand, clears active modifiers, and refunds the 'Use Card' action for the turn.

-   **Extra Move:**
    1.  **Trigger:** Player uses the card from the `CardsDialog`.
    2.  **Resolution (Shared):** A `GameAction.UseCard` action is dispatched. The card is consumed and the player's `hasExtraMove` flag is set to `true` in `GameState`.
    3.  **Effect:** This flag allows any one army to perform one `Move` action. The flag is consumed (`false`) after the move is completed. If used on an army that has **not yet acted**, that army remains "fresh" (`hasActed: false`) after the move and can perform a subsequent action (Attack/Position). If used on an army that **has already acted**, it gets to move, and that's its final action. Can be cancelled before moving.

-   **Teleport:**
    1.  **Trigger:** Player uses the card from the `CardsDialog`.
    2.  **UI Flow (Local):** A `pendingAction` of `{ type: 'teleport' }` is set in local state. The `GameBoard` UI indicates that the player must first select an army, and then a destination. Any selected army is deselected. Teleporting directly onto enemy base tiles is prohibited.
    3.  **Input:** Player clicks one of their armies, then clicks *any* non-enemy-base tile on the map.
    4.  **Resolution (Shared):** A `GameAction.Move` action with an `isTeleport: true` flag is dispatched. The `Teleport` card is consumed, the army is moved, and its `hasActed` flag is set to `true`. This action does not award discovery VP.

-   **Scout:**
    1.  **Trigger:** Player uses the card from the `CardsDialog`.
    2.  **UI Flow (Local):** A `pendingAction` of `{ type: 'scout', count: 3 }` is set in local state. The UI prompts the player to click on 3 hidden tiles.
    3.  **Input:** Player clicks on a hidden tile. A local `GameAction.Scout` is dispatched to reveal it. This is repeated three times.
    4.  **Resolution (Shared):** After the third tile is revealed, a `GameAction.UseCard` action with an `isScout: true` flag is dispatched to consume the card from the player's hand. This action does not award discovery VP.

-   **Sabotage:**
    1.  **Trigger:** Player uses the card from the `CardsDialog`.
    2.  **UI Flow (Local):** A local `SabotageDialog` opens, listing all opponent players.
    3.  **Input:** Player clicks on an opponent's name.
    4.  **Resolution (Shared):** A `GameAction.SabotagePlayer` action is dispatched. The `Sabotage` card is consumed, and the target player's `isSabotaged` flag is set to `true` in `GameState`.

-   **Reinforce:**
    1.  **Trigger:** Player uses the card from the `CardsDialog`.
    2.  **Resolution (Shared):** A `GameAction.UseCard` action is dispatched. The player's `reinforceActive` flag is set to `true`.
    3.  **Effect:** The next "Deploy" action this turn has its cost reduced to 0. The `Reinforce` card is **consumed upon successful deployment**. If cancelled before deploying, the card is returned and the flag cleared.

-   **Efficient:**
    1.  **Trigger:** Player uses the card from the `CardsDialog`.
    2.  **Resolution (Shared):** A `GameAction.UseCard` action is dispatched. The player's `efficientActive` flag is set to `true`.
    3.  **Effect:** The next "Deploy" action this turn costs 50% less Wheat. The `Efficient` card is **consumed upon successful deployment**. If cancelled before deploying, the card is returned and the flag cleared.

-   **Master Builder:**
    1.  **Trigger:** Player uses the card from the `CardsDialog`.
    2.  **Resolution (Shared):** A `GameAction.UseCard` action is dispatched. The player's `masterBuilderActive` flag is set to `true`.
    3.  **Effect:** The next "Upgrade" action this turn costs 50% less Iron. The `Master Builder` card is **consumed upon successful upgrade**. If cancelled before upgrading, the card is returned and the flag cleared.

-   **Steal Resource:**
    1.  **Trigger:** Player uses the card from the `CardsDialog`.
    2.  **UI Flow (Local):** A local `StealResourceDialog` opens. First, it lists opponents to choose from. After selecting a player, it shows which resources can be stolen.
    3.  **Input:** Player selects a target player, then a resource type.
    4.  **Resolution (Shared):** A `GameAction.StealResource` action is dispatched. The `Steal Resource` card is consumed, and resources (guarded against NaN) are transferred between players in `GameState`.

-   **Wealthy:**
    1.  **Trigger:** Player uses the card from the `CardsDialog`.
    2.  **UI Flow (Local):** A local `WealthyDialog` opens, showing the three resource types.
    3.  **Input:** Player clicks a resource icon.
    4.  **Resolution (Shared):** A `GameAction.GainWealth` action is dispatched. The `Wealthy` card is consumed, and the player gains 5 of the selected valid resource.

-   **Overcome:**
    1.  **Trigger:** This card is used contextually during combat. It appears as a mutually exclusive checkbox in the `CombatDialog` or `MonsterCombatDialog`.
    2.  **Input:** Player checks the "Use Overcome" box before initiating the roll.
    3.  **Resolution (Shared):** The combat is automatically won by the player. The `Overcome` card is consumed during the combat resolution action.

-   **War Chief:**
    1.  **Trigger:** Appears as a mutually exclusive checkbox in the combat dialogs.
    2.  **Input:** Player checks the "Use War Chief" box before rolling.
    3.  **Resolution (Shared):** The player gains +2 attack power for that single combat. The `War Chief` card is consumed during combat resolution.

-   **Decide Dice Roll:**
    1.  **Trigger:** Appears as a mutually exclusive checkbox and slider in the *monster* combat dialog.
    2.  **Input:** Player checks the box and uses the slider to pick a dice value (1–6).
    3.  **Resolution (Shared):** One of the player's dice rolls is forced to the chosen value. The `Decide Dice Roll` card is consumed during combat resolution.

-   **Productive:**
    1.  **Trigger:** Passive card. At the start of a player's turn, if they are positioned to collect resources, a local `ProductiveCardDialog` opens.
    2.  **UI Flow:** The dialog shows which resources will be collected and allows the player to select one to double.
    3.  **Input:** Player can select one resource type and click "Collect".
    4.  **Resolution (Shared):** A `GameAction.UseProductiveCard` is dispatched. If a resource was selected, the `Productive` card is consumed, and the yield for that resource is doubled. Resources are added to the player's total.

### 6.6. UI/UX and Other Interactions

#### **UI Dialogs and Player Scope**
- **Local Dialogs:** Most dialogs for actions (`Sabotage`, `Wealthy`, `Position`, `My Cards`, `Abilities Shop`, `ProductiveCardDialog`, `SpecialIslandRollDialog`) are rendered **only for the current player**. Their open/closed state is managed locally in the `GameBoard` component and is not part of the shared `GameState`.
- **Global Dialogs:** The `CombatDialog` and `MonsterCombatDialog` are exceptions. Their state (`combatState`, `monsterCombatState`) is stored in `GameState` because all players need to see the outcome or have the potential to be involved.

#### **Army and Tile Selection**
- **Manual Selection:** Clicking a tile containing one of your armies selects it. This is a local UI action.
- **Multi-Army Selection:** Clicking a tile with multiple friendly armies opens a local `ArmySelectionDialog` to choose a specific unit.
- **Deselection:** An army can be deselected locally by:
    1.  Clicking the "Deselect Army" button. This is a "hard reset" that clears the selected army and any pending card action.
    2.  Clicking on any tile that is not a valid move for the currently selected army.

### 6.7. Fog of War & Debug Mode

-   **Fog of War (Enabled):** This is the default, tactical experience.
    -   Each player has their own, independent visibility of the map stored in `player.revealedTiles`.
    -   Tiles (and any armies on them) are only revealed to a player when they move one of their armies to an adjacent tile.
    -   Opponent armies are only visible on their starting Base or on personally explored islands.
-   **Fog of War (Disabled):** This mode provides a more open, chess-like experience.
    -   Map visibility is shared. When any player reveals a tile, it becomes visible to *all* players for the rest of the game.
-   **Debug Mode:** This is a special mode intended for testing, which is automatically enabled for "Player vs. Bot" games started from the lobby.
    -   **Complete Map Visibility:** It overrides any Fog of War setting, making the entire map and all armies visible from the start of the match.
    -   **All Special Cards:** The player begins the game with one of every available Special Card, allowing for immediate testing of card mechanics.

### 6.8. Bot Logic
The AI behavior is defined in `src/lib/bot-logic.ts`. It executes as a complete, atomic turn loop to eliminate timeout debouncing, state deadlocks, or dangling combat states:
1.  **Strategic Pre-computation:** The bot pre-activates relevant strategic cards (`Reinforce`, `Efficient`, `MasterBuilder`), intelligently uses `Wealthy` or `Sabotage` when beneficial, and purchases affordable passive abilities, attack upgrades (up to cap 4), new armies (up to cap 5), or special cards.
2.  **Army Action Evaluation & Execution:** Across all unacted armies on the board:
    - **Positioning on a resource:** Very high priority (9). The bot's primary way to build its economy.
    - **Attacking:** High priority (7–8). Attacks enemy players or monsters on the same tile, automatically rolling dice and closing combat within the turn cycle.
    - **Movement:** Evaluates valid moves (prioritizing unexplored Fog of War islands and unoccupied resource/special islands) and executes the highest-scoring move.
3.  **Guaranteed Turn Transition:** Upon completing all valid army actions, the bot calls `handleEndTurn` and writes the resulting state to Firestore in a single atomic update, cleanly advancing the turn to the next player.

### 6.9. UI Components and Mobile Responsiveness
- **Map Rendering & Colonist.io Mobile Strategy:**
  - **Desktop Starting Zoom:** Initial zoom on desktop defaults to **85% (`0.85`)**, giving players an optimal tactical overview of the archipelago, centered with margin for the sidebars and HUD.
  - **Zoom Controls:** Zoom in/out operates in 15% intervals with a quick-reset button that returns to the 85% default zoom.
  - **Mobile Auto-Fitting Layout (Colonist.io Paradigm):** On mobile devices, the entire 5x5 archipelago grid is scaled to fit within the viewport width (`clamp(46px, 13.5vw, 68px)` tile size with `clamp(4px, 1.2vw, 8px)` gaps and reduced frame padding). This ensures all 4 corner bases (Blue, Red, Yellow, Purple) are visible at a glance on initial load without clipping or requiring panning.
  - **Touch Interactions:** Supports smooth single-finger panning and two-finger pinch-to-zoom (up to `2.0x`) for close inspection of individual islands and armies.
- **Player Stats Display:** The `PlayerInfo` panel renders `armies.length` accurately and displays the base `attackPower` stat with an informative tooltip detailing the `Attack Power + 1` combat dice formula, while prioritizing sprite image loading.
- **Combat & Monster Dialog Flow:**
  - Real-time combat actions (`MonsterCombatRoll`, `CloseMonsterCombat`, `CombatRoll`, `CloseCombat`) update both local client state and Firestore synchronously, ensuring instantaneous UI transitions between preparation, rolling, and results screens.
  - `MonsterCombatDialog` includes a dedicated spectator view during `phase === 'rolling'` that displays a waiting status without interactive buttons, preventing spectator interference or accidental cancellation.
- **Standardized Dialogs:** All game dialogs (`CombatDialog`, `MonsterCombatDialog`, `ArmySelectionDialog`, `AttackSelectionDialog`, `StealResourceDialog`, `SabotageDialog`, `WealthyDialog`, `AbilitiesDialog`, `SpecialIslandRollDialog`, `PositionDialog`) follow standardized ShadCN styling with outline action cancellations and synchronized dice/card payloads.
- **Turn Progression Safety:** `handleEndTurn` utilizes bounded iterative turn advancement to process multiple simultaneous sabotaged players safely without recursion stack risks, and safely validates tile data before passive ability execution.
- **Hook Architecture & Firestore Economics:**
  - Custom hooks in `src/hooks/` (`useIsMobile`, `useGameEngine`, `usePlayer`) provide consolidated viewport detection, resilient session validation, and real-time Firestore synchronization.
  - **In-Memory Turn Buffering:** All human player actions within a turn (`Move`, `Deploy`, `Upgrade`, `BuyCard`, `UseCard`, `SelectResourcePosition`, `CancelAction`) execute entirely in local client memory (`localGameState`), generating **zero Firestore writes** until turn completion.
  - **Atomic Turn Writes:** A single `setDoc` write is dispatched when ending a turn (`handleEndTurn`), keeping total writes per player to ~1 write per round.
  - **Atomic Bot Loops:** AI bot turns execute completely in memory and commit only once per round via a single atomic `setDoc`.
  - **Zero Redundant Reads:** Host cleanup routines for animations and events use in-memory state references (`gameStateRef`) instead of performing `getDoc` calls before updating documents.
  - **Firestore Free Tier Sustainability:** A standard 20-turn match requires only ~20–30 document writes and ~40–60 document reads across all connected clients combined, allowing hundreds of complete multiplayer games per day on Firebase's free quota.

### 6.10. Tutorial System
- **Overview**: An optional, skippable tutorial system (`TutorialOverlay.tsx`) automatically displays to new players to explain core mechanics (Goals, Deploying, Moving & Positioning, Resources & Shop, Combat, Special Cards).
- **State Management**: The tutorial uses `localStorage` (`'corner-conquest-tutorial'`) to remember if a player has seen it, preventing annoyance in subsequent sessions. It can also be manually re-triggered via the 'Help' button in the game board header.
- **Maintenance Rule**: Whenever core mechanics, UI layouts, or game rules are added or modified, the steps inside `TutorialOverlay.tsx` MUST be updated to reflect the new changes to keep the new player experience accurate.

### 6.11. End-to-End (E2E) Testing & Match Cleanup Lifecycle
- **Mandatory Teardown Hook (`safeCleanupGame`)**:
  - Every Playwright test suite (`e2e/*.spec.ts`) **MUST** register `safeCleanupGame` inside `test.afterEach(async ({ page }) => { await safeCleanupGame(page); });`.
  - **Guaranteed Cleanup Regardless of Test Outcome:** Even if an assertion throws an error or times out midway through test execution, `test.afterEach` is guaranteed to execute, dismissing any open modals and clicking the GameBoard exit button to dismantle the match.
- **Match Dismantling Rules (`handlePlayerExit` in `src/lib/actions/player.ts`)**:
  - **Host Departure During Active Match:** When a host leaves a game in progress (`status === 'playing'`), the Firestore room document is deleted (`transaction.delete(gameDocRef)`), preventing orphaned games.
  - **No Human Players Remaining:** If the last human player exits a match (leaving only AI bots), the game room is deleted immediately.
  - **Single/Solo Player Departure:** If total remaining players are `<= 1` when the host leaves, the game document is dismantled from Firestore.
- **Lobby Hygiene:** Adhering to these rules prevents test runs and player abandonments from cluttering Firestore and ensures the game lobby only ever lists active, joinable rooms.

