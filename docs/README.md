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

## 4. Core Game Mechanics

This section describes the rules and flow of a typical match.

### Objective

The first player to reach the `victoryPointGoal` (default: 30 VP) wins the game. Victory Points are primarily earned by:
- Winning battles against other players or powerful monsters.
- Being the first to discover a new island (`vpPerIslandDiscovery`).
- Passive abilities like `Explorer`.

### The Map & Islands

The game is played on a grid of islands. Each player starts at their **Base** in a corner. The rest of the map is hidden by Fog of War until a player's army moves to an adjacent tile.

- **Base:** Your starting point. Where you deploy new armies and where defeated armies respawn. Bases also generate all three resource types.
- **Resource Islands:** Contain **Wheat**, **Iron**, or **Gems**.
- **Monster Islands:** Inhabited by hostile creatures that must be defeated to claim the island and its resources.
- **Special Islands:** Discovering these grants the player a random Special Card.

### Resources & Player Progression

- **Wheat:** Used to **Deploy** new armies. The cost increases with each new army.
- **Iron:** Used to **Upgrade** the Attack Power of all your armies permanently.
- **Gems:** A valuable resource used to **Buy Special Cards** or purchase permanent **Passive Abilities**.

### Turn Structure & Actions

A player's turn consists of a series of actions. The game automatically ends a player's turn if they have no more possible moves or actions.

1.  **Start of Turn (Automatic Collection):**
    - If a player has armies "positioned" on resources from a previous turn, they are automatically collected.
    - If the player has the **"Productive"** card, a dialog appears, allowing them to double the yield of one resource.

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

### Combat

- Combat is resolved through dice rolls. Each player rolls a number of dice equal to their **Attack Power + 1**.
- The player with the higher total roll wins the battle.
- Defeated armies are not destroyed; they are sent back to their owner's Base tile to regroup.

### Special Cards & Abilities

- **Special Cards:** Provide powerful, one-time effects like moving an army anywhere (`Teleport`), getting a free army (`Reinforce`), or forcing an opponent to miss their turn (`Sabotage`).
- **Passive Abilities:** Players can spend Gems to buy permanent upgrades from the "Abilities Shop", such as `Explorer` (gain 1 VP per turn for each island you occupy) or `Collector` (automatically gather 1 of each resource from every island you occupy at the end of your turn).
