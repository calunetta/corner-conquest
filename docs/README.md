# Corner Conquest - Application Architecture

This document outlines the architecture and key logic flows of the "Corner Conquest" application. It serves as a shared context for AI-assisted development to ensure consistency and accuracy.

## 1. Core Technologies

- **Framework:** Next.js with App Router
- **Language:** TypeScript
- **UI:** React, ShadCN UI Components, Tailwind CSS
- **State Management (Client):** React Hooks (`usePlayer`, `useToast`)
- **State Management (Game):** Firestore real-time listeners (`useGameEngine`)
- **Backend/Database:** Firebase (Firestore)

## 2. Project Structure

- `src/app/`: Core application, pages, and layout.
- `src/components/`: Reusable, generic UI components (mostly from ShadCN).
- `src/features/`: Contains domain-specific components and logic.
  - `game/`: All components, dialogs, and panels related to the active game board.
  - `lobby/`: Components for creating and joining games.
- `src/hooks/`: Custom React hooks for managing client-side state and browser events.
- `src/lib/`: Core application logic, type definitions, and Firebase configuration.
  - `actions/`: The "brain" of the game. Pure functions that take the current game state and an action, and return the new game state.
  - `game-initializer.ts`: Logic for creating the initial game state, including map generation.
  - `game-logic.ts`: Higher-level logic, such as adding a player to a game.
  - `bot-logic.ts`: The AI logic for bot players.
  - `types.ts`: Central repository for all TypeScript types used in the application.

## 3. Game State Management & Logic Flow

The application uses a "state machine" pattern where the game state is managed centrally in Firestore and modified by pure functions.

1.  **Central State:** The entire `GameState` object is stored as a single document in a Firestore collection named `games`.

2.  **Client-Side Subscription:** The `useGameEngine` hook (`src/hooks/use-game-engine.ts`) is the primary connection to the game state. It subscribes to real-time updates for the current game document in Firestore. When the document changes, it updates the local React state, causing the UI to re-render.

3.  **User Actions:**
    - A user interaction (e.g., clicking a tile) in a component like `GameBoard.tsx` triggers an action.
    - It calls `handleGameAction` in `src/lib/actions/index.ts`. This is the **single entry point** for all game logic modifications.

4.  **Action Handlers:**
    - `handleGameAction` acts as a router, delegating the action to a specific, more granular function (e.g., `handleMoveAction`, `handleAttackAction`).
    - These functions are **pure**: they receive the current `GameState` and a payload, perform calculations, and return a **new `GameState` object**. They **do not** modify the state directly.

5.  **State Update:**
    - The new `GameState` object is returned to `GameBoard.tsx`.
    - The `setGameState` function (which is an alias for `updateGameState` from `useGameEngine`) is called. This function writes the entire new state object back to Firestore, overwriting the old one.

6.  **Real-Time Propagation:** The write to Firestore triggers the `onSnapshot` listener in the `useGameEngine` hook for **all connected players**, ensuring their UIs are updated in real-time with the new state.

This architecture ensures that the game logic is predictable, testable, and decoupled from the UI. UI components are responsible for *displaying* the state and *dispatching* actions, while the `lib/actions` files are responsible for *calculating* state changes.

## 4. Core Game Mechanics & Match Flow

### 4.1. Objective & Winning
The first player to reach the `victoryPointGoal` (default: 30 VP) wins the game. When this occurs, the game `status` changes to 'finished', a `winner` is declared in the game state by creating a deep copy of the winning player object, and a dialog appears announcing the winner. Victory Points (VP) are earned from:
- **Winning Battles:** +5 VP for defeating another player's army.
- **Defeating Monsters:** Variable VP based on monster level (2 for Lvl 1, 5 for Lvl 2, etc.).
- **Island Discovery:** +`vpPerIslandDiscovery` VP for being the first player in the game to reveal a new island.
- **Passive Abilities:** The `Explorer` ability grants VP each turn for every island you occupy.

### 4.2. The Map & Islands
The game is played on a grid of islands. Each player starts at their **Base** in a corner. The rest of the map is hidden by Fog of War until a player's army moves to a tile, revealing it.
- **Base:** Your starting point. Where you deploy new armies and where defeated armies respawn. Bases also generate all three resource types.
- **Resource Islands:** Contain **Wheat**, **Iron**, or **Gems**.
- **Monster Islands:** Inhabited by hostile creatures that must be defeated. When monsters are present, they are rendered with a dynamic idle animation within the `IslandTile` component. Their sprites randomly shift left and right and have a chance to play their `attack` animation to make them feel alive.
- **Special Islands:** Discovering these grants the player a random Special Card. On subsequent landings on the same island, a dialog appears prompting the player to roll a die. On a roll of 3 or 6, they receive another card.

### 4.3. Resources & Progression
- **Wheat:** Used to **Deploy** new armies. The cost increases with each new army.
- **Iron:** Used to **Upgrade** the Attack Power of all your armies permanently.
- **Gems:** Used to **Buy Special Cards** or purchase permanent **Passive Abilities**.

### 4.4. Turn Structure & Actions
A player's turn consists of a series of actions. The game automatically ends a player's turn if they have no more possible moves or actions.

1.  **Start of Turn (Automatic Collection):**
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

### 4.5. Combat
- Combat is resolved through dice rolls. Each player rolls a number of dice equal to their **Attack Power + 1**.
- **Player vs. Player:** The player with the higher total roll wins the battle. In case of a tie, the **defender** wins.
- **Player vs. Monster:** The player with the higher total roll wins the battle. In case of a tie, the **monster** wins.
- Defeated armies are not destroyed; they are sent back to their owner's Base tile to regroup.
- **Combat Dialog Animations:** During the `rolling` phase, both combatants show their `attack` sprite. In the `results` phase, the winner remains in their attack pose, while the loser's sprite changes to the `death` animation.

## 5. Detailed System Explanations

### 5.1. Special Cards
When a player uses a card, it is removed from their hand and placed in the `discardPile`. The `Use Card` action is consumed for the turn. Cards relevant to a specific action (e.g., `War Chief` for combat) will appear as an option within that action's dialog.
- **Starting a Match:** In a standard Player-vs-Player match, all players start with **zero** Special Cards. In a Player-vs-Bot match, the human player is in `Debug Mode` and starts with one of every available Special Card.
- **Hand Limit & Card Acquisition:** A player can hold a maximum of **7** Special Cards. If a player discovers a Special Island or buys a card while their hand is full, they do not receive a new card. If the main deck runs out of cards, the discard pile is shuffled to create a new deck.
- **Extra Move:** Grants the player an extra move action. One army that has already acted can move again.
- **Teleport:** Initiates a two-step action. First, select an army. Second, select *any* tile on the map to move it to.
- **Scout:** Initiates a multi-step action. The player can click on 3 different hidden tiles to reveal them. This does not involve any army movement.
- **Sabotage:** Opens a dialog to choose an opponent. That opponent will miss their next turn.
- **Reinforce:** The player's next `Deploy` action this turn is free.
- **Efficient:** The player's next `Deploy` action this turn costs 50% less Wheat.
- **Master Builder:** The player's next `Upgrade` action this turn costs 50% less Iron.
- **Steal Resource:** Opens a dialog to choose a player, then a resource type. Steals 2 of that resource from the target.
- **Wealthy:** Opens a dialog to choose a resource type. The player gains 5 of that resource.
- **Overcome:** Automatically win the next combat encounter (vs. player or monster). Appears as a checkbox in the combat dialog.
- **War Chief:** Gain +2 to your attack power for the next combat encounter. Appears as a checkbox in the combat dialog.
- **Decide Dice Roll:** In the next *monster* combat, you can choose the value of one of your dice. Appears as a checkbox and slider in the monster combat dialog.
- **Productive:** A passive card. At the start of your turn, if you are positioned to collect resources, a dialog opens allowing you to spend this card to double the yield of one resource type.

### 5.2. UI/UX and Interactions

#### 5.2.1. Dialogs and Player Scope
- **Local Dialogs:** Most dialogs for actions (`Sabotage`, `Wealthy`, `Position`, etc.) are rendered **only for the current player**. This is managed by the `isMyTurn` flag within `GameDialogs.tsx`.
- **Global Dialogs:** The `CombatDialog` is an exception. It shows an interactive view to the attacker and a read-only "results" view to all other players, ensuring everyone can follow the action.

#### 5.2.2. Army and Tile Selection
- **Auto-Selection:** If a player has only one army at the start of their turn, it is automatically selected.
- **Manual Selection:** Clicking a tile containing one of your armies selects it.
- **Multi-Army Selection:** Clicking a tile with multiple friendly armies opens the `ArmySelectionDialog` to choose a specific unit.
- **Deselection:** An army can be deselected by:
    1.  Clicking the "Deselect Army" button.
    2.  Clicking on any tile that is not a valid move for the currently selected army.

#### 5.2.3. Visual Feedback
- **Selected Army:** The tile of a selected army gets a prominent glowing shadow (`shadow-2xl shadow-primary/80`).
- **Player-Owned Tiles:** Tiles occupied by the local player's armies have a subtle, color-coded glow (`shadow-blue-500/50`, `shadow-red-500/50`, etc.) for easy identification.
- **Possible Moves:** Valid move destinations for a selected army are highlighted with a dashed border (`border-accent/70`).
- **Teleport Action:** When `Teleport` is active, all tiles on the map are highlighted with a purple border (`border-purple-500`) to indicate they are valid destinations.
- **Animations & Scenery:**
    - Game sprites (armies, monsters, death animations) are located in `public/sprites/`.
    - The water background and island terrain textures are defined in `tailwind.config.ts`.
    - Decorative rocks in the water are procedurally placed by `MapGrid.tsx` for visual variety.

#### 5.2.4. Confirmation Dialogs
- `ConfirmExitDialog`: Appears if a player attempts to leave a match that is in progress.
- `HostLeaveDialog`: A special dialog for the host, warning them that leaving will delete the game room and end the match for all players.

### 5.3. Player Info Panel
This UI element provides a real-time summary for each player in the game, displaying:
- Player Name and Army Sprite
- **Victory Points (VP)**
- **Army Count:** Total number of armies on the board.
- **Attack Power:** Global modifier for all armies.
- **Resources:** Current count of Wheat, Iron, and Gems.
- **Special Cards:** Total number of cards in hand.
- **Status Effects:** Icons for `Sabotage` (miss next turn) or `Extra Move`.
- **Layout:** The panel uses a responsive grid (`grid-cols-2 lg:grid-cols-4`), accommodating up to 4 players. Empty slots are filled with "Waiting for player..." placeholders in the lobby.

### 5.4. Player Exiting the Game
- **Normal Player:** If a non-host player leaves, their armies are removed from the board, they are removed from the `players` array in the game state, and a log message is generated. The game continues for the remaining players.
- **Host Player:** If the host leaves, the entire game document is **deleted from Firestore**. The game ends for all players, and they are returned to the lobby.

### 5.5. Game Customization
From the Lobby, players can create a new game and access a "Customize Match" sheet with the following options:
- **General:** Victory Point goal, enable/disable Fog of War, set VP for island discovery, and adjust the density of resource islands vs. monster islands.
- **Costs:** Set the initial cost for deploying armies, the cost increment for subsequent deployments, and the costs for upgrades and passive abilities.
- **Content:** Selectively enable or disable which Special Cards and Passive Abilities are available to be drawn or purchased during the match.

### 5.6. Game Log
The game log is a running, public history of major events in the match, displayed to all players. It records:
- Players joining or leaving.
- Game start and end.
- Turn progression (`It's now Player X's turn.`).
- Key actions like deploying armies, upgrading power, and buying cards.
- Combat outcomes (`Player A defeated Player B!`).
- Resource collection and VP gains.
- Special card usage (`Player X used 'Teleport'!`).

This log provides crucial context and a narrative for the unfolding game.

### 5.7. Fog of War & Debug Mode

-   **Fog of War (Enabled):** This is the default, tactical experience.
    -   Each player has their own, independent visibility of the map.
    -   Tiles (and any armies on them) are only revealed to a player when they move one of their armies to an adjacent tile.
    -   Opponent armies are only visible on their starting Base or on islands you have personally explored.
-   **Fog of War (Disabled):** This mode provides a more open, chess-like experience.
    -   Map visibility is shared. When any player reveals a tile, it becomes visible to *all* players for the rest of the game.
-   **Debug Mode:** This is a special mode intended for testing, which is automatically enabled for "Player vs. Bot" games started from the lobby.
    -   **Complete Map Visibility:** It overrides any Fog of War setting, making the entire map and all armies visible from the start of the match.
    -   **All Special Cards:** The player begins the game with one of every available Special Card, allowing for immediate testing of card mechanics.

## 6. Bot Logic
The AI behavior is defined in `src/lib/bot-logic.ts`. It uses a dynamic, priority-based system to make decisions.
1.  At the start of its turn, the bot evaluates all possible strategic and army actions.
2.  Each action is assigned a numeric `priority` based on the current game state.
    - **Positioning on a resource:** Very high priority (9). This is the bot's primary way to build its economy.
    - **Attacking:** High priority, especially if the bot has a power advantage or if it needs to clear a monster from a valuable island.
    - **Using Strategic Cards:** The bot will intelligently use cards like `Wealthy` if it is low on a resource needed for a high-priority action (like deploying an army). It will also use `Reinforce`, `Efficient`, and `Master Builder` to save resources.
    - **Upgrading Attack Power:** Medium priority, which decreases as its power level increases to avoid over-investing.
    - **Deploying a new Army:** Medium priority, which decreases as its army count increases to maintain a balanced force.
    - **Exploring:** The bot now has a higher priority to explore new tiles, preventing it from getting stuck and encouraging expansion.
3.  The bot executes the single action with the highest priority score. After that action, its turn ends. This creates a focused but adaptable AI opponent that balances long-term strategy with opportunistic plays.

## 7. Blueprint for Future Development
- **Always Modify State via `handleGameAction`:** All new features must be implemented as actions that flow through the central `handleGameAction` reducer.
- **Keep Action Handlers Pure:** Functions in `src/lib/actions/` should not have side effects. They take a game state and a payload and return a *new* game state object.
- **Use Dialogs for Multi-Step Actions:** For actions that require choices (like `Teleport` or `Sabotage`), create a new state property (e.g., `sabotageDialogState`) and a corresponding dialog component. The action handler sets this state, and the dialog component dispatches further actions.
- **Decouple UI from Logic:** UI components should only read from the `GameState` and dispatch actions. They should never contain complex game rule calculations.
- **Update This Document:** When a new feature is added, this `README.md` file must be updated to reflect the new mechanics to maintain it as our source of truth.
