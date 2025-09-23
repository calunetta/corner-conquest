

# Corner Conquest - Application Architecture

This document outlines the architecture and key logic flows of the "Corner Conquest" application. It serves as a shared context for AI-assisted development to ensure consistency and accuracy.

**Development Directives for the AI Assistant:**
1.  **Synchronized Documentation:** For every code change I make, I **must** also update this `docs/README.md` file in the same transaction to reflect those changes. The code and the documentation will always be kept in sync.
2.  **Blueprint-First Validation:** Before I implement any change, I **must** first analyze the request against the established architecture and logic documented here. If the request conflicts with our blueprint, I will notify you of the discrepancy and await your confirmation before proceeding.

## 1. Core Technologies

- **Framework:** Next.js with App Router
- **Language:** TypeScript
- **UI:** React, ShadCN UI Components, Tailwind CSS
- **State Management (Client):** React Hooks (`useState`, `useMemo`, `useCallback` within `GameBoard.tsx`)
- **State Management (Game):** Firestore real-time listeners (`useGameEngine`)
- **Backend/Database:** Firebase (Firestore)

## 2. Project Structure & Development Guide

Understanding the project's structure is key to making changes efficiently and correctly.

- `src/app/`: Core application, pages, and layout.
- `src/components/`: Reusable, generic UI components (mostly from ShadCN).
- `src/features/`: Contains domain-specific components and logic.
  - `game/`: All components, dialogs, and panels related to the active game board.
    - `types.ts`: **(Local State)** Type definitions for client-side UI state (dialogs, pending actions).
  - `lobby/`: Components for creating and joining games.
- `src/hooks/`: Custom React hooks for managing client-side state and browser events. The most important are `useGameEngine` (Firestore sync) and `usePlayer` (session management).
- `src/lib/`: Core application logic, type definitions, and Firebase configuration.
  - `actions/`: **The "brain" of the game.** Contains pure functions that take the current `GameState` and an action, and return the new `GameState`.
  - `game-initializer.ts`: Logic for creating the initial game state, including map generation.
  - `game-logic.ts`: Higher-level logic, such as adding a player to a game.
  - `bot-logic.ts`: The AI logic for bot players.
  - `types.ts`: **(Shared State)** Central repository for the `GameState` object and its constituent types, which are synchronized with Firestore.

## 3. State Management: A Clear Separation

The application's architecture is built on a strict separation between **Shared State** (the game's source of truth) and **Local State** (a single player's UI status). Understanding this distinction is critical to preventing bugs and maintaining performance.

### 3.1. Shared State: The `GameState` Object

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

### 3.2. Local State: The `GameBoard.tsx` Component

-   **Definition File:** `src/features/game/types.ts`
-   **What It Is:** Local state refers to any variable that represents the temporary UI status for a single player. It is irrelevant to other players and is never sent to the server.
-   **Synchronization:** It is managed entirely within the `GameBoard.tsx` component using React hooks like `useState` and `useMemo`. It is never written to Firestore.
-   **Key Local State Variables (`GameBoard.tsx`):**
    -   `selectedArmyId: number | null`: The ID of the army the local player has clicked on.
    -   `possibleMoves: {x, y}[]`: The array of valid move locations for the selected army, used for highlighting tiles.
    -   `pendingAction: PendingAction | null`: The state for a multi-step local action (e.g., after clicking the "Teleport" card, the `pendingAction` is set to `{ type: 'teleport' }`, waiting for the player to select an army and then a destination).
    -   **All Dialog States:** `armySelectionDialog`, `attackSelectionDialog`, `positionDialog`, `sabotageDialog`, `wealthyDialog`, `stealResourceDialog`, `cardsDialogPlayerId`, `abilitiesShopOpen`, `productiveCardDialog`, `specialIslandRollDialog`. The open/closed status of these dialogs is purely a local concern.

### 3.3. The Action Flow: From Click to Update

1.  **Local Intent:** A player clicks on an army. `handleTileClick` in `GameBoard.tsx` updates the local `selectedArmyId` state. The UI re-renders instantly to show the selection. **No Firebase write occurs.**
2.  **Local Validation:** The player clicks a valid destination tile. `handleTileClick` verifies this is a possible move.
3.  **Shared Action Dispatch:** Now that the action is confirmed, `handleTileClick` calls `onAction(GameAction.Move, ...)`. This is the crossover from local to shared.
4.  **Shared State Update:** The `onAction` handler calls the `setGameState` function, which executes the `handleMoveAction` reducer from `lib/actions`. This pure function calculates the new army position and returns a brand new `GameState` object.
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
- **Passive Abilities:** The `Explorer` ability grants VP each turn for every island you occupy.

### 5.2. The Map & Islands
The game is played on a grid of islands. Each player starts at their **Base** in a corner. The rest of the map is hidden by Fog of War until a player's army moves to a tile, revealing it. The procedural generation of the map is governed by the `game-initializer.ts` file and can be tweaked via the "Customize Match" settings in the lobby.
- **Base:** Your starting point. Where you deploy new armies and where defeated armies respawn. Bases also generate all three resource types. The Base's appearance is a castle sprite specific to the player's color, defined in `src/lib/player-data.ts`.
- **Resource Islands:** Contain **Wheat**, **Iron**, or **Gems**. The generation logic is as follows:
    - An island can have one or two types of resources, determined by its distance from the map's center.
    - If an island has **one** resource type, it will always have **two** collection spots for that resource.
    - If an island has **two** resource types, each type will have a random number of collection spots (either one or two).
- **Monster Islands:** Inhabited by hostile creatures that must be defeated. When monsters are present, they are rendered with a dynamic idle animation within the `IslandTile` component. Their sprites randomly shift left and right and have a chance to play their `attack` animation to make them feel alive. All monster sprites are animated GIFs. When the last monster on an island is defeated, the island's type changes to `Resource` and it immediately spawns new resources, following the same generation rules as other resource islands. This makes them valuable strategic targets.
- **Special Islands:** Discovering these grants the player a random Special Card. On subsequent landings on the same island, a dialog appears prompting the player to roll a die. On a roll of 3 or 6, they receive another card.
- **Island Distribution:** The balance between Resource, Monster, and Special islands is controlled by the `resourceDensity` setting (default 60%). This value roughly corresponds to the probability that a tile will be a resource island. The remaining percentage is split between Monster and Special islands, with Special islands being rarer. The distribution also changes based on distance from the map's center, with more valuable and dangerous islands appearing closer to the middle.

### 5.3. Resources & Progression
- **Wheat:** Used to **Deploy** new armies. The cost increases with each new new army.
- **Iron:** Used to **Upgrade** the Attack Power of all your armies permanently.
- **Gems:** Used to **Buy Special Cards** or purchase permanent **Passive Abilities**.

### 5.4. Turn Structure & Actions
A player's turn consists of a series of actions. The game automatically ends a player's turn if they have no more possible moves or actions.

1.  **Start of Turn (Automatic Collection):**
    - This mechanic triggers at the beginning of a player's turn, *after* the first turn of the game. It does not run at the very start of the match, as no armies could be positioned yet.
    - If a player has armies "positioned" on resources from a previous turn, they are automatically collected.
    - If the player has the **"Productive"** card, a dialog appears, allowing them to spend this card to double the yield of one resource type. Otherwise, collection is instant.

2.  **Player Actions:** A player can perform several actions per turn, with some limitations:
    - **Army Actions:** Each army can perform **one** major action per turn (either `Attack`/`Position` OR `Move`).
        - **Position:** Move an army to an unoccupied resource spot on its current island. The army will collect that resource at the start of your next turn. This action ends the army's turn.
        - **Attack:** Initiate combat with a monster or another player's army on the same island. This action ends the army's turn.
        - **Move:** Move an army to a new island within its move radius. This can only be done if the army has not attacked or positioned this turn.
    - **Strategic Actions (once per turn each):**
        - **Deploy:** Spend Wheat to create a new army at your Base.
        - **Upgrade:** Spend Iron to increase your global Attack Power.
        - **Buy Card:** Spend Gems to draw a Special Card.
        - **Use Card:** Play one Special Card from your hand.

### 5.5. Combat
- Combat is resolved through dice rolls. Each player rolls a number of dice equal to their **Attack Power + 1**.
- **Player vs. Player:** The player with the higher total roll wins the battle. In case of a tie, the **defender** wins.
- **Player vs. Monster:** The player with the higher total roll wins the battle. In case of a tie, the **monster** wins.
- Defeated armies are not destroyed; they are sent back to their owner's Base tile to regroup, and their `hasActed` status is reset.
- **Combat Dialog Animations:** During the `rolling` phase of combat, both combatants show their `attack` sprite. In the `results` phase, the winner's sprite remains in the `attack` pose, while the loser's sprite changes to the `death` animation. All army and monster sprites are animated GIFs defined in `src/lib/player-data.ts` and `src/lib/game-initializer.ts`, respectively. To ensure combatants face each other, the sprite for the combatant on the right side of the dialog (the defender/monster) is horizontally flipped.

## 6. Detailed System Explanations

### 6.1. Special Cards
- **Starting a Match:** In a standard Player-vs-Player match, all players start with **zero** Special Cards. In a Player-vs-Bot match, if `Debug Mode` is enabled, the human player starts with one of every available Special Card.
- **Hand Limit & Card Acquisition:** A player can hold a maximum of **7** Special Cards. If a player discovers a Special Island or buys a card while their hand is full, they do not receive a new card. If the main deck runs out of cards, the discard pile is shuffled to create a new deck.
- **Using a Card:** When a player uses a card, it is removed from their hand and placed in the `discardPile`. The `Use Card` action is consumed for the turn. Cards relevant to a specific action (e.g., `War Chief` for combat) will appear as an option within that action's dialog. If a player activates a card like "Extra Move" or "Teleport" but cannot or chooses not to use it, they can use the "Cancel" button. This is a local action that resets the UI and **refunds the 'Use Card' action**, allowing them to use a different card during the same turn.
- **Extra Move:** This card provides a flexible move action. The effect is consumed for the turn once used.
    - If used on an army that has **not yet acted** this turn, it allows that army to move. After the move, the army is still considered "fresh" and can perform a subsequent action (like Attack or Position).
    - If used on an army that **has already acted**, it allows that army to perform one final move action. After this move, the army's turn is over. The "Extra Move" effect is a single-use-per-turn benefit.
- **Teleport:** Initiates a two-step local action. Using this card will automatically deselect any currently selected army, forcing the player to choose the army they wish to teleport. First, select an army. Second, select *any* tile on the map to move it to. This action does not award discovery VP.
- **Scout:** Initiates a multi-step local action where the player can click on 3 different hidden tiles to reveal them. This action does not involve any army movement and does not select an army. Because no army moves, no Victory Points are awarded for island discovery during a scout action.
- **Sabotage:** Opens a local dialog to choose an opponent. That opponent will miss their next turn.
- **Reinforce:** The player's next `Deploy` action this turn is free. The card is only consumed upon a successful deployment.
- **Efficient:** The player's next `Deploy` action this turn costs 50% less Wheat. The card is only consumed upon a successful deployment.
- **Master Builder:** The player's next `Upgrade` action this turn costs 50% less Iron. The card is only consumed upon a successful upgrade.
- **Steal Resource:** Opens a local dialog to choose a player, then a resource type. Steals 2 of that resource from the target.
- **Wealthy:** Opens a local dialog to choose a resource type. The player gains 5 of that resource.
- **Overcome:** Automatically win the next combat encounter (vs. player or monster). Appears as a checkbox in the combat dialog.
- **War Chief:** Gain +2 to your attack power for the next combat encounter. Appears as a checkbox in the combat dialog.
- **Decide Dice Roll:** In the next *monster* combat, you can choose the value of one of your dice. Appears as a checkbox and slider in the monster combat dialog.
- **Productive:** A passive card. At the start of your turn, if you are positioned to collect resources, a local dialog opens allowing you to spend this card to double the yield of one resource type.

### 6.2. UI/UX and Interactions

#### 6.2.1. Dialogs and Player Scope
- **Local Dialogs:** Most dialogs for actions (`Sabotage`, `Wealthy`, `Position`, `My Cards`, `Abilities Shop`) are rendered **only for the current player**. Their open/closed state is managed locally in the `GameBoard` component and is not part of the shared `GameState`.
- **Global Dialogs:** The `CombatDialog` and `MonsterCombatDialog` are exceptions. Their state (`combatState`, `monsterCombatState`) is stored in `GameState` because all players need to see the outcome or have the potential to be involved.

#### 6.2.2. Army and Tile Selection
- **Auto-Selection:** If a player has only one army at the start of their turn, it is automatically selected for them locally by the `GameBoard` component.
- **Manual Selection:** Clicking a tile containing one of your armies selects it. This is a local UI action.
- **Multi-Army Selection:** Clicking a tile with multiple friendly armies opens a local `ArmySelectionDialog` to choose a specific unit.
- **Deselection:** An army can be deselected locally by:
    1.  Clicking the "Deselect Army" button.
    2.  Clicking on any tile that is not a valid move for the currently selected army.

### 6.3. Fog of War & Debug Mode

-   **Fog of War (Enabled):** This is the default, tactical experience.
    -   Each player has their own, independent visibility of the map stored in `player.revealedTiles`.
    -   Tiles (and any armies on them) are only revealed to a player when they move one of their armies to an adjacent tile.
    -   Opponent armies are only visible on their starting Base or on islands you have personally explored.
-   **Fog of War (Disabled):** This mode provides a more open, chess-like experience.
    -   Map visibility is shared. When any player reveals a tile, it becomes visible to *all* players for the rest of the game.
-   **Debug Mode:** This is a special mode intended for testing, which is automatically enabled for "Player vs. Bot" games started from the lobby.
    -   **Complete Map Visibility:** It overrides any Fog of War setting, making the entire map and all armies visible from the start of the match.
    -   **All Special Cards:** The player begins the game with one of every available Special Card, allowing for immediate testing of card mechanics.

### 6.4. Bot Logic
The AI behavior is defined in `src/lib/bot-logic.ts`. It uses a dynamic, priority-based system to make decisions.
1.  At the start of its turn, the bot evaluates all possible strategic and army actions.
2.  Each action is assigned a numeric `priority` based on the current game state.
    - **Positioning on a resource:** Very high priority (9). This is the bot's primary way to build its economy.
    - **Attacking:** High priority, especially if the bot has a power advantage or if it needs to clear a monster from a valuable island.
    - **Using Strategic Cards:** The bot will intelligently use cards like `Wealthy` if it is low on a resource needed for a high-priority action (like deploying an army). It will also use `Reinforce`, `Efficient`, and `Master Builder` to save resources.
    - **Upgrading Attack Power:** Medium priority, which decreases as its power level increases to avoid over-investing.
    - **Deploying a new Army:** Medium priority, which decreases as its army count increases to maintain a balanced force.
    - **Exploring:** The bot now has a higher priority to explore new tiles, preventing it from getting stuck and encouraging expansion.
3.  The bot executes the single action with the highest priority score. If no action is possible or an error occurs, it will safely end its turn as a fallback.
