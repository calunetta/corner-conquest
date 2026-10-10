# Project Structure & State Management

Part of the architecture & game-rules docs. Index and directives: [`docs/README.md`](../README.md).

## 2. Project Structure & Development Guide

Understanding the project's structure is key to making changes efficiently and correctly.

> [!IMPORTANT]
> **New code vs. legacy code:** all new components and features go in `src/modules/<domain>/`, one folder per component with separate view (`.tsx`), hook (`.hook.ts`), styles (`.styles.ts`), mappers (`.map.ts`), types, tests and testbed preview (see `.claude/skills/component-architecture/SKILL.md`). The folders described below (`src/features/`, `src/lib/`) are legacy: kept working, changed only for bug fixes, wiring, or explicit migrations.

- `docs/ai/`: AI workflow guide, task record templates, and one folder per task under `docs/ai/tasks/` (see `docs/ai/README.md`).
- `e2e/`: Playwright End-to-End browser test suites (`auth-and-lobby.spec.ts`, `gameplay.spec.ts`, `map-viewport.spec.ts`, `tutorial-beacons.spec.ts`).
- `src/modules/`: New code, organised by domain (created with the first module). `game-board/` holds the `GameBoardContext`/provider implementation (§3.3); `game-rules/` holds the pure game-rule reducers that compute the next `GameState` for each `GameAction` (`*.reducer.ts`), the root dispatcher (`game-rules.reducer.ts`), match setup (`game-setup.reducer.ts`, `player-join.reducer.ts`, `turn-progression.ts`), the card/player static catalogs (`card-data.ts`, `player-data.ts`, `monster-catalog.ts`, `player-factory.ts`, `map-generation.ts`), the bot AI decision tree (`bot-helpers.ts`, `bot-card-strategy.reducer.ts`, `bot-purchases.reducer.ts`, `bot-army-actions.reducer.ts`, `bot-turn.reducer.ts`), and the two Firestore-touching exceptions, `services/player-exit.service.ts` (§6.12) and `services/bot-turn.service.ts`; `map/components/` holds terrain visuals (`MapGrid`, `MapDecorations`) and 8 island-tile children (`IslandTile`, `TileForest`, `TileResources`, `TileBoats`, `TileOccupants`, `AnimatedMonster`, `DeathEffect`, and the pan/zoom hook split across `MapGrid.pan.hook.ts`, `MapGrid.zoom-state.hook.ts`, `MapGrid.pan-zoom.hook.ts`), each split per `component-architecture` and `MapZoomControls`, all migrated from `src/features/game/components/` — see `docs/ai/tasks/2026-10-03-game-map-migration/`; `cards/components/` holds 7 card-and-ability dialogs (`CardsDialog`, `ProductiveCardDialog`, `SpecialIslandRollDialog`, `AbilitiesDialog`, `SabotageDialog`, `WealthyDialog`, `StealResourceDialog`), each split per `component-architecture`, migrated from `src/features/game/dialogs/` — see `docs/ai/tasks/2026-10-03-game-dialogs-remaining-migration/`; `combat/components/` holds pre-combat squad and target selection (`ArmySelectionDialog`, `AttackSelectionDialog`, `MonsterSelectionDialog`, `PositionDialog`) and the core combat (`CombatDialog`, `MonsterCombatDialog`), each split per `component-architecture`, migrated from `src/features/game/dialogs/` — see `docs/ai/tasks/2026-10-03-game-dialogs-remaining-migration/` and `docs/ai/tasks/2026-10-03-migrate-dialog-components/`; `session/components/` holds session lifecycle (`ConfirmExitDialog`, `HostLeaveDialog`), each split per `component-architecture`, migrated from `src/features/game/dialogs/` — see `docs/ai/tasks/2026-10-03-game-dialogs-remaining-migration/`; `session/` also holds the player-identity provider (`player.provider.tsx`'s `PlayerProvider`/`usePlayer`, `player.hook.ts`'s `usePlayerProvider`, `services/player-session.service.ts` for guest usernames, `services/account.service.ts` for Firebase Auth sign-in and the `accounts` lookup, §3.1), migrated from `src/hooks/use-player.tsx` — see `docs/ai/tasks/2026-10-04-shared-hooks-migration/`; `shared/` holds cross-module utilities (`toPlayerIdleSprite`) and the shared hooks `useToast` (`toast-store.ts` + `use-toast.ts`) and `useIsMobile` (`use-is-mobile.ts`), migrated from `src/hooks/use-toast.ts` and `use-is-mobile.ts` — see `docs/ai/tasks/2026-10-04-shared-hooks-migration/`; `hud/components/` holds `GameBoardHeader`, `GameStatusBadge`, `GameLog`, `PlayerInfo`, `ActionsPanel`, and `TutorialBeacon` (contextual help popover, localStorage-backed "seen" state), each migrated per `component-architecture` with sub-components extracted for line-count compliance (`PlayerInfoStats.tsx`, `BuffIcons.tsx`, `ActionButton.tsx`, `ActionsPanel.disabledReasons.ts`); `game-board/turn-timer.hook.ts` holds the migrated `useTurnTimer` (turn countdown, auto-timeout dispatch), consumed by `game-board.hook.ts`; `game-board/game-board.engine.hook.ts` holds the migrated `useGameEngine` (Firestore game-doc subscription, bot-turn trigger, death-animation cleanup), with Firestore I/O in `services/game-board.engine.service.ts`, migrated from `src/hooks/use-game-engine.ts` — see `docs/ai/tasks/2026-10-04-shared-hooks-migration/`.
- `src/testbed/` and `src/app/testbed/`: Dev-only component testbed at `/testbed`. `registry.ts` lists every preview (`*.preview.tsx`); previews of legacy components live in `src/testbed/legacy/`. Hidden in production builds unless `NEXT_PUBLIC_ENABLE_TESTBED=true` at build time.
- `src/app/`: Core application, pages, and layout.
- `src/components/`: Reusable, generic UI components (mostly from ShadCN).
- `src/features/`: Contains domain-specific components and logic structured according to the **SOLID paradigm** (Single Responsibility Principle):
  - `game/`: All components, dialogs, hooks, context, and panels related to the active game board.
    - `context/`:
      - `GameBoardContext.tsx`: a thin re-export of `src/modules/game-board/` under the original names, kept so the legacy consumers (`GameBoard.tsx`, `GameDialogManager.tsx`, and other panels) need no changes. The actual UI-state types, pure `gameBoardReducer`, `GameBoardProvider`, and `useGameBoard()` all live in `src/modules/game-board/`, which composes the provider's effects and handlers out of focused hooks (`game-board.state.hook.ts`, `.actions.hook.ts`, `.card-actions.hook.ts`, `.local-actions.hook.ts`, `.tile-click.hook.ts`, `.session.hook.ts`) assembled by `game-board.hook.ts` — see `docs/ai/tasks/2026-10-02-gameboardcontext-migration/`.
    - `components/`:
      - `GameBoard.tsx`: High-level layout orchestrator (<80 lines) composing atomic subcomponents with `<GameBoardProvider>`; imports `MapGrid` from `@/modules/map`.
      - `GameBoardHeader`: Navigation, match status, VP goal, and start game controls with **0 props** (migrated to `src/modules/hud/components/GameBoardHeader` per `component-architecture`).
      - `PlayerInfoBar.tsx`: Collapsible player cards list, goal badge, and tutorial beacon with **0 props**; imports `PlayerInfo` and `TutorialBeacon` from `@/modules/hud`. Both JSX children are now migrated (`PlayerInfo` row #5, `TutorialBeacon` row #8 in `docs/ai/refactor.md`); `PlayerInfoBar` itself can move to `src/modules/hud` in a future pass — see `docs/ai/tasks/2026-10-03-game-header-migration/plan.md` Decisions.
      - `GameStatusBadge`: Turn indicator and player queue badge with **0 props** (migrated to `src/modules/hud/components/GameStatusBadge` per `component-architecture`).
      - `GameDialogManager.tsx`: Dedicated container for mounting all 15+ modal dialogs with **zero prop-drilling**. Imports all 13 game dialogs from `src/modules/cards` (7), `src/modules/combat` (4), and `src/modules/session` (2); also imports `CombatDialog` and `MonsterCombatDialog` from `src/modules/combat`. It stays at this legacy path itself — it renders those dialogs directly, which `src/modules/**` is not allowed to import (see `component-architecture`'s import boundaries).
    - `types.ts`: Re-exports domain dialog types from `@/lib/types/dialogs`.
  - `src/modules/lobby/`: Lobby domain with game creation and joining flows (migrated per `component-architecture`): `Lobby` (2-column command center and scrollable match list), `LobbyBackground` (animated battle diorama and 4 faction bases), `LobbyGameRow` (room preview with settings popover), `CreateGameDialog` (game setup with faction, format, and advanced settings), `CustomSettingsSheet` (tabbed settings for rules, costs, and content).
    > [!IMPORTANT]
    > **Visual Parity Rule:** The Login page (`src/app/page.tsx` renders `src/modules/session/components/Login/Login.tsx`) must always share the exact same aesthetic theme, background (`<LobbyBackground />`), glassmorphism, and color palette as the Game Lobby. Any updates to the Lobby's visual presentation must be mirrored in the Login view.
- `src/lib/`: Core application logic, type definitions, and Firebase configuration.
  - `__tests__/`: Jest test suites for what's left at this legacy path (`firebase.test.ts`). The game-rule reducers themselves — and their tests — moved to `src/modules/game-rules/` (see below).
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

## 3. State Management & Session Logic

The application's architecture is built on a strict separation between **Shared State** (the game's source of truth) and **Local State** (a single player's UI status). Understanding this distinction is critical.

### 3.1. Player Session Management (`usePlayer` Hook)
The player's session (their identity) is held by Firebase Auth, with the chosen username kept in browser `localStorage` and Firestore. It is orchestrated by the `usePlayer` hook (`usePlayerProvider` in `src/modules/session/player.hook.ts`). Every client has a Firebase Auth `uid` before it does anything else, and that `uid` is its `playerId`. A player is either a **guest** (an anonymous Firebase Auth session, no sign-in, disposable identity, bullets 1-4 below) or a **signed-in account** (Google sign-in, stable identity, bullets 5-9 below). `isGuest` is true only when Firebase Auth has finished loading and the current user is anonymous (`AuthAccount.isAnonymous`, `src/modules/session/services/account.service.ts`).

**Guest path:**

1.  **First Visit:**
    *   The `usePlayer` auth listener sees no Firebase session and calls `signInAnonymously()`. Firebase creates an anonymous user; its `uid` becomes the guest's `playerId`.
    *   No `playerId` is generated or stored in `localStorage`. Firebase Auth persists the anonymous session in the browser, so the same `uid` returns on page reloads.

2.  **Login (`setUsername`):**
    *   When a user enters a username, the `setUsername` function creates a document in a Firestore collection named `usernames`. The document's ID is the chosen username (e.g., `usernames/Alice`).
    *   The content of this document is the guest's Firebase `uid`. This acts as a "lock," ensuring no one else with a different `uid` can claim the username "Alice".
    *   The chosen username is also saved to `localStorage`.

3.  **Session Persistence (Page Reload):**
    *   When the page is reloaded, Firebase Auth restores the anonymous session, so the `uid` is available again without a new sign-in. `usePlayer` loads only the `username` from `localStorage`.
    *   **Crucially, it then re-validates this session with Firestore.** It checks if the `usernames/Alice` document still exists and if the `playerId` inside it matches the restored `uid`.
    *   If it matches, the session is restored. If it doesn't match (e.g., the document was deleted or taken by another player), the local session is cleared, and the user is returned to the login screen.

4.  **Logout / Tab Close (`logout`, guest):**
    *   When a guest logs out or closes the tab, a cleanup function is triggered.
    *   It deletes the `usernames/Alice` document from Firestore, freeing up the username for others.
    *   It also clears the `username` from `localStorage`. The anonymous Firebase session is not signed out, so the guest keeps the same `uid` after logout.

**Signed-in account path:**

5.  **Sign-in (`signInWithGoogle`):**
    *   The Login screen's Google button opens a Firebase Auth Google popup (`signInWithGoogle` in `src/modules/session/services/account.service.ts`). The popup signs in as the Google user rather than linking it to the guest's anonymous `uid`, so the account's Firebase Auth `uid` becomes the player's `playerId` for the rest of the session and the guest's `uid` is dropped.
    *   Once sign-in succeeds, a guest's username reservation (if one was made) is released, so it isn't orphaned. An account's reservation is never released by this path.

6.  **Account Username Restore:**
    *   On every auth state change, `usePlayer` reads `accounts/{uid}` (`findAccountUsername`). If the document exists, its `username` is restored into the session. Otherwise the player has no username yet and must pick one.
    *   The `accounts` collection is the reverse lookup: `accounts/{authUid}` holds `{ username }`. It is written once, and the document is never updated or deleted.

7.  **Picking a Username (`setUsername` while signed in):**
    *   `claimAccountUsername` rejects the name if another identity owns it. Otherwise `bindUsernameToAccount` commits `usernames/{name}` (`{ playerId: authUid, authUid }`) and `accounts/{authUid}` (`{ username }`) in one Firestore batch.
    *   Firestore rules enforce "pick once, keep forever": a `usernames` create with an `authUid` requires that `accounts/{authUid}` does not yet exist, and account reservations cannot be updated or deleted. `localStorage` is not used for account usernames.

8.  **Logout (`logout` while signed in):**
    *   Calls Firebase `signOut` only. The username reservation and the `accounts` document are kept, so signing back in restores the same username.
    *   The auth listener then sees no session and signs a new anonymous guest in, so the client is a guest with a new `uid` again.

9.  **Tab Close:**
    *   The `beforeunload` handler releases a reservation only while the current user is anonymous (`account?.isAnonymous`, a guest). A signed-in account survives tab close, because Firebase Auth persists its session in the browser.

### 3.2. Shared Game State: The `GameState` Object

-   **Definition File:** `src/lib/types/game.ts` (import it from the `@/lib/types` barrel)
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

-   **Definition Files:** `src/modules/game-board/` holds the real implementation — `game-board.types.ts` (state and action types), `game-board.reducer.ts` (the pure `gameBoardReducer`), `game-board.map.ts` (pure helpers like `hasActiveDialogOrPendingAction`), `game-board.provider.tsx` (the `GameBoardProvider`), and the hook files that make up the provider's behavior: `game-board.state.hook.ts`, `game-board.actions.hook.ts`, `game-board.card-actions.hook.ts`, `game-board.local-actions.hook.ts`, `game-board.tile-click.hook.ts`, `game-board.session.hook.ts`, composed by `game-board.hook.ts`. `src/features/game/context/GameBoardContext.tsx` is a thin re-export of all of it under the original names, for backward compatibility with legacy consumers.
-   **What It Is:** Local UI state refers to temporary interaction data for a single player (selected armies, valid movement indicators, pending multi-step card effects like teleport/scout, and modal dialog open/closed states).
-   **Architecture:** Managed via a pure `gameBoardReducer` and exposed through `GameBoardProvider` and the `useGameBoard()` hook. Each hook owns one responsibility (state, dispatching shared actions, card-specific multi-step flows, local-only UI actions, tile clicks, session/turn handling); `game-board.hook.ts` calls them in a fixed order and assembles the single `contextValue` the provider exposes.
-   **Zero Prop-Drilling:** Components such as `GameDialogManager`, `GameBoardHeader`, and (mostly) `ActionsPanel` consume `useGameBoard()` directly, eliminating massive prop interfaces and state fragmentation. (`ActionsPanel` takes an optional `infoBeacon` prop for the tutorial beacon, passed by the parent `GameBoard` component.)
-   **Key Local State Variables (`GameBoardUIState`):**
    -   `selectedArmyId: number | null`: The ID of the army the local player has clicked on.
    -   `possibleMoves: {x, y}[]`: The array of valid move locations for the selected army, used for highlighting tiles.
    -   `pendingAction: PendingAction | null`: State for multi-step local actions (e.g., scout, teleport).
    -   `dialogs`: Sub-state grouping all 12+ dialog states (`abilitiesShopOpen`, `cardsPlayerId`, `position`, `sabotage`, `wealthy`, `stealResource`, `confirmExit`, etc.).

### 3.4. The Action Flow: From Click to Update

1.  **Local Intent:** A player clicks on an army. `handleTileClick` dispatches `SET_SELECTED_ARMY` in `GameBoardContext`. The UI re-renders instantly to show the selection. **No Firebase write occurs.**
2.  **Local Validation:** The player clicks a valid destination tile. `handleTileClick` verifies this is a possible move against `settings.gridSize.cols` and `settings.gridSize.rows`.
3.  **Shared Action Dispatch:** Now that the action is confirmed, `handleTileClick` calls `onAction(GameAction.Move, ...)`. This is the crossover from local to shared.
4.  **Shared State Update:** The `onAction` handler calls the `setGameState` function, which executes the `handleMoveAction` reducer from `@/modules/game-rules`. This pure function calculates the new army position dynamically and returns a brand new `GameState` object.
5.  **Synchronization:** `setGameState` writes the new `GameState` object to Firestore. Firestore then pushes this update to all connected players, who see the army move on their screens.

This architecture ensures the UI is fast and responsive for local interactions, while maintaining a single, consistent source of truth for the game itself.

## 4. Root Cause Analysis & Debugging Philosophy
A guiding principle for this project is to **fix the root cause of a bug, not just its symptoms**. A recurring bug often indicates a flaw in the underlying architecture or state management logic.
-   **Symptom:** An observable, incorrect behavior (e.g., "The 'Deselect Army' button doesn't work.").
-   **Root Cause:** The fundamental reason the symptom occurs (e.g., "A `useEffect` hook for auto-selection is incorrectly re-selecting an army immediately after it was deselected, creating a state race condition.").
-   **Our Approach:** When a bug is identified, especially a recurring one, the first step is to analyze the entire data and action flow related to the feature. We must resist the urge to apply a "quick fix" that only patches the symptom. Instead, we must identify the core conflict in the logic and refactor it. This prevents the bug from reappearing in a different form later and leads to a more robust and maintainable codebase.
