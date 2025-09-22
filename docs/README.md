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
