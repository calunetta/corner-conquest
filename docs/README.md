

# Corner Conquest - Application Architecture

This document outlines the architecture and key logic flows of the "Corner Conquest" application. It serves as a shared context for AI-assisted development to ensure consistency and accuracy.

**Development Directives for the AI Assistant:**
The working rules for AI agents (workflow, code layout, testing, verification) live in `CLAUDE.md` and `.claude/`; see `docs/ai/README.md`. This document stays the source of truth for architecture and game rules:
1.  **Synchronized Documentation:** Every change to game rules or architecture updates this `docs/README.md` in the same phase, so code and documentation stay in sync. For code changes, I also update this file in the same transaction.
2.  **Blueprint-First Validation:** Before implementing a change, analyze it against the architecture and rules documented here. If the request conflicts with them, report the discrepancy and wait for confirmation before proceeding.
3.  **Automated Testing:** Every feature, UI mechanic, or bug fix ships with unit tests (`npm test`). User flows also get Playwright E2E specs (`npm run test:e2e`); see the `testing` skill for when and how they run.
4.  **Mandatory Verification Pipeline:** After every fix or enhancement, run the project checks in order: TypeScript (`npm run typecheck`), lint (`npm run lint`), unit tests (`npm test`), and E2E where relevant (`npm run test:e2e`).

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

> [!IMPORTANT]
> **New code vs. legacy code:** all new components and features go in `src/modules/<domain>/`, one folder per component with separate view (`.tsx`), hook (`.hook.ts`), styles (`.styles.ts`), mappers (`.map.ts`), types, tests and testbed preview (see `.claude/skills/component-architecture/SKILL.md`). The folders described below (`src/features/`, `src/lib/`) are legacy: kept working, changed only for bug fixes, wiring, or explicit migrations.

- `docs/ai/`: AI workflow guide, task record templates, and one folder per task under `docs/ai/tasks/` (see `docs/ai/README.md`).
- `e2e/`: Playwright End-to-End browser test suites (`auth-and-lobby.spec.ts`, `gameplay.spec.ts`, `map-viewport.spec.ts`, `tutorial-beacons.spec.ts`).
- `src/modules/`: New code, organised by domain (created with the first module). `game-board/` holds the `GameBoardContext`/provider implementation (§3.3); `game-rules/` holds the pure game-rule reducers that compute the next `GameState` for each `GameAction` (`*.reducer.ts`), the root dispatcher (`game-rules.reducer.ts`), match setup (`game-setup.reducer.ts`, `player-join.reducer.ts`, `turn-progression.ts`), the card/player static catalogs (`card-data.ts`, `player-data.ts`, `monster-catalog.ts`, `player-factory.ts`, `map-generation.ts`), the bot AI decision tree (`bot-helpers.ts`, `bot-card-strategy.reducer.ts`, `bot-purchases.reducer.ts`, `bot-army-actions.reducer.ts`, `bot-turn.reducer.ts`), and the two Firestore-touching exceptions, `services/player-exit.service.ts` (§6.11) and `services/bot-turn.service.ts`; `map/components/` holds terrain visuals (`MapGrid`, `MapDecorations`) and 8 island-tile children (`IslandTile`, `TileForest`, `TileResources`, `TileBoats`, `TileOccupants`, `AnimatedMonster`, `DeathEffect`, and the pan/zoom hook split across `MapGrid.pan.hook.ts`, `MapGrid.zoom-state.hook.ts`, `MapGrid.pan-zoom.hook.ts`), each split per `component-architecture` and `MapZoomControls`, all migrated from `src/features/game/components/` — see `docs/ai/tasks/2026-10-03-game-map-migration/`; `cards/components/` holds 7 card-and-ability dialogs (`CardsDialog`, `ProductiveCardDialog`, `SpecialIslandRollDialog`, `AbilitiesDialog`, `SabotageDialog`, `WealthyDialog`, `StealResourceDialog`), each split per `component-architecture`, migrated from `src/features/game/dialogs/` — see `docs/ai/tasks/2026-10-03-game-dialogs-remaining-migration/`; `combat/components/` holds pre-combat squad and target selection (`ArmySelectionDialog`, `AttackSelectionDialog`, `MonsterSelectionDialog`, `PositionDialog`) and the core combat (`CombatDialog`, `MonsterCombatDialog`), each split per `component-architecture`, migrated from `src/features/game/dialogs/` — see `docs/ai/tasks/2026-10-03-game-dialogs-remaining-migration/` and `docs/ai/tasks/2026-10-03-migrate-dialog-components/`; `session/components/` holds session lifecycle (`ConfirmExitDialog`, `HostLeaveDialog`), each split per `component-architecture`, migrated from `src/features/game/dialogs/` — see `docs/ai/tasks/2026-10-03-game-dialogs-remaining-migration/`; `session/` also holds the player-identity provider (`player.provider.tsx`'s `PlayerProvider`/`usePlayer`, `player.hook.ts`'s `usePlayerProvider`, `services/player-session.service.ts`), migrated from `src/hooks/use-player.tsx` — see `docs/ai/tasks/2026-10-04-shared-hooks-migration/`; `shared/` holds cross-module utilities (`toPlayerIdleSprite`) and the shared hooks `useToast` (`toast-store.ts` + `use-toast.ts`) and `useIsMobile` (`use-is-mobile.ts`), migrated from `src/hooks/use-toast.ts` and `use-is-mobile.ts` — see `docs/ai/tasks/2026-10-04-shared-hooks-migration/`; `hud/components/` holds `GameBoardHeader`, `GameStatusBadge`, `GameLog`, `PlayerInfo`, `ActionsPanel`, and `TutorialBeacon` (contextual help popover, localStorage-backed "seen" state), each migrated per `component-architecture` with sub-components extracted for line-count compliance (`PlayerInfoStats.tsx`, `BuffIcons.tsx`, `ActionButton.tsx`, `ActionsPanel.disabledReasons.ts`); `game-board/turn-timer.hook.ts` holds the migrated `useTurnTimer` (turn countdown, auto-timeout dispatch), consumed by `game-board.hook.ts`; `game-board/game-board.engine.hook.ts` holds the migrated `useGameEngine` (Firestore game-doc subscription, bot-turn trigger, death-animation cleanup), with Firestore I/O in `services/game-board.engine.service.ts`, migrated from `src/hooks/use-game-engine.ts` — see `docs/ai/tasks/2026-10-04-shared-hooks-migration/`.
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
    2.  **Resolution (Shared):** A `GameAction.UseCard` action is dispatched. The card is consumed, the player's `hasExtraMove` flag is set to `true` in `GameState`, and **all friendly armies are reactivated (`hasActed: false`)**.
    3.  **Effect & UI Flow:** All actions in the UI remain fully enabled. A prominent glowing banner informs the player that Extra Move is active and prompts them to select a soldier on the map to continue. Can be cancelled before moving.

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
    3.  **Resolution (Shared):** The player's combat score gets a flat +2 added to the dice total for that single combat. It is not extra dice, and it does not change the permanent attack power. The `War Chief` card is consumed during combat resolution.

-   **Decide Dice Roll:**
    1.  **Trigger:** Appears as a mutually exclusive checkbox and slider in the *monster* combat dialog.
    2.  **Input:** Player checks the box and uses the slider to pick a dice value (1–6).
    3.  **Resolution (Shared):** One of the player's dice rolls is forced to the chosen value. The `Decide Dice Roll` card is consumed during combat resolution.

-   **Productive:**
    1.  **Trigger:** Passive card. At the start of a player's turn, if they are positioned to collect resources, a local `ProductiveCardDialog` opens.
    2.  **UI Flow:** The dialog strictly displays resource options where the player currently has positioned collectors (`player.positions`), preventing doubling of un-positioned resources.
    3.  **Input:** Player can select one positioned resource type and click "Collect" (or skip).
    4.  **Resolution (Shared):** A `GameAction.UseProductiveCard` is dispatched. If a valid positioned resource was selected, the `Productive` card is consumed, and the yield for that resource is doubled. Resources are added to the player's total.

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
    -   **All Special Cards & 20 Starting Resources:** The human player begins the game with one of every available Special Card and **20 Food, 20 Wood, and 20 Gold**, allowing for immediate testing of all strategic and army mechanics.

### 6.8. Bot Logic
The AI behavior is defined in `src/modules/game-rules/bot-turn.reducer.ts` and `services/bot-turn.service.ts`. It executes as a complete, atomic turn loop to eliminate timeout debouncing, state deadlocks, or dangling combat states:

> [!IMPORTANT]
> **Balance Simulator:** `scripts/balance-simulator/` plays many complete bot-vs-bot matches through this real logic (Firestore stubbed, zero writes) and reports win rates, match length, resource and card economy, combat accuracy, and bot-health signals (does a seat ever leave its own Base, get stuck on Productive, etc.). See `docs/balance-simulator-guide.md` for how to run it and read its report, including its known limitations and the bot quirks it already confirmed.

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
  - **Mobile Auto-Fitting Layout (Colonist.io Paradigm):** On mobile devices, the entire archipelago grid (`MAP_COLS` × `MAP_ROWS`, 5 × 6, from `src/lib/types/actions.ts`) is scaled to fit within the viewport width (`clamp(46px, 13.5vw, 68px)` tile size with `clamp(4px, 1.2vw, 8px)` gaps and reduced frame padding). This ensures all 4 corner bases (Blue, Red, Yellow, Purple) are visible at a glance on initial load without clipping or requiring panning.
  - **Touch Interactions:** Supports smooth single-finger panning and two-finger pinch-to-zoom (up to `2.0x`) for close inspection of individual islands and armies.
- **Mobile Actions Bar:** On mobile, `ActionsPanel` (`src/modules/hud/components/ActionsPanel`) renders a fixed bottom `MobileActionsBar` instead of the desktop `Card` — Row 1 holds context actions (Cancel/Deselect/extra-move banner) plus a "More Actions" trigger, Row 2 holds the primary turn actions (Position/Attack/Deploy/End Turn) sized to a 44px+ touch-target floor. Secondary actions (Upgrade/Buy Card/Cards/Abilities) open in a `MobileActionsSheet` bottom sheet. Disabled-action reasons render as a static caption on mobile (no hover tooltip, since touch has no hover) instead of the desktop `Tooltip`. Desktop rendering (`ActionsPanelView`) is unchanged.
- **Player Stats Display:** The `PlayerInfo` panel renders `armies.length` accurately and displays the base `attackPower` stat with an informative tooltip detailing the `Attack Power + 1` combat dice formula, while prioritizing sprite image loading.
- **Combat & Monster Dialog Flow:**
  - Real-time combat actions (`MonsterCombatRoll`, `CloseMonsterCombat`, `CombatRoll`, `CloseCombat`) update both local client state and Firestore synchronously, ensuring instantaneous UI transitions between preparation, rolling, and results screens.
  - `MonsterCombatDialog` includes a dedicated spectator view during `phase === 'rolling'` that displays a waiting status without interactive buttons, preventing spectator interference or accidental cancellation.
- **Standardized Dialogs:** All game dialogs (`CombatDialog`, `MonsterCombatDialog`, `ArmySelectionDialog`, `AttackSelectionDialog`, `StealResourceDialog`, `SabotageDialog`, `WealthyDialog`, `AbilitiesDialog`, `SpecialIslandRollDialog`, `PositionDialog`) follow standardized ShadCN styling with outline action cancellations and synchronized dice/card payloads.
- **Turn Progression Safety:** `handleEndTurn` utilizes bounded iterative turn advancement to process multiple simultaneous sabotaged players safely without recursion stack risks, and safely validates tile data before passive ability execution.
- **Automatic Turn Completion:** When the active player has exhausted all possible army moves, attacks, positions, and cannot afford any remaining strategic actions (`Deploy`, `Upgrade`, `BuyCard`, `UseCard`, `BuyAbility`), the game automatically completes and transitions the turn.
- **Hook Architecture & Firestore Economics:**
  - Custom hooks in `src/modules/` (`useIsMobile` in `shared/`, `useGameEngine` in `game-board/`, `usePlayer` in `session/`) provide consolidated viewport detection, resilient session validation, and real-time Firestore synchronization.
  - **In-Memory Turn Buffering:** All human player actions within a turn (`Move`, `Deploy`, `Upgrade`, `BuyCard`, `UseCard`, `SelectResourcePosition`, `CancelAction`) execute entirely in local client memory (`localGameState`), generating **zero Firestore writes** until turn completion.
  - **Atomic Turn Writes:** A single `setDoc` write is dispatched when ending a turn (`handleEndTurn`), keeping total writes per player to ~1 write per round.
  - **Atomic Bot Loops:** AI bot turns execute completely in memory and commit only once per round via a single atomic `setDoc`.
  - **Zero Redundant Reads:** Host cleanup routines for animations and events use in-memory state references (`gameStateRef`) instead of performing `getDoc` calls before updating documents.
  - **Firestore Free Tier Sustainability:** A standard 20-turn match requires only ~20–30 document writes and ~40–60 document reads across all connected clients combined, allowing hundreds of complete multiplayer games per day on Firebase's free quota.

### 6.10. Tutorial System
- **Overview**: The game includes both a skippable tutorial overlay (`TutorialOverlay.tsx`) and contextual help beacons (`TutorialBeacon` / `TutorialBeacon.tsx`) that explain the UI area they sit next to. Together they cover the core loop: Goals, Deploying, Moving & Positioning, Resources & Shop, Combat, and Special Cards.
- **Interactive Info Beacons**: Contextual helper beacons throughout the HUD render high-contrast pixel icons (`/sprites/icon_info.png`) and open informative popovers on click. Current beacons include `map-info`, `player-info`, and `actions-info`.
- **State Management**: The tutorial overlay remembers whether a player has seen it via `localStorage` (`'corner-conquest-tutorial'`), while each beacon stores a separate `beacon-seen-<id>` flag so input stays calm after first open. Players can reopen either flow from the 'Help' button or by clicking a beacon.
- **Maintenance Rule**: Whenever core mechanics, UI layouts, or game rules are added or modified, update the matching tutorial copy or beacon description (or add a new beacon) so the new-player guidance stays accurate.

### 6.11. End-to-End (E2E) Testing & Match Cleanup Lifecycle
- **Firestore Emulator**: E2E runs never touch the real project. `playwright.config.ts` starts the Firestore emulator (`firebase.json`, project `demo-corner-conquest`) and builds the app with `NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST`, which makes `src/lib/firebase.ts` call `connectFirestoreEmulator`. Each run starts with an empty database.
- **Mandatory Teardown Hook (`safeCleanupGame`)**:
  - Every Playwright test suite (`e2e/*.spec.ts`) **MUST** register `safeCleanupGame` inside `test.afterEach(async ({ page }) => { await safeCleanupGame(page); });`.
  - **Guaranteed Cleanup Regardless of Test Outcome:** Even if an assertion throws an error or times out midway through test execution, `test.afterEach` is guaranteed to execute, dismissing any open modals and clicking the GameBoard exit button to dismantle the match.
- **Match Dismantling Rules (`handlePlayerExit` in `src/modules/game-rules/services/player-exit.service.ts`)**:
  - **Host Departure During Active Match:** When a host leaves a game in progress (`status === 'playing'`), the Firestore room document is deleted (`transaction.delete(gameDocRef)`), preventing orphaned games.
  - **No Human Players Remaining:** If the last human player exits a match (leaving only AI bots), the game room is deleted immediately.
  - **Single/Solo Player Departure:** If total remaining players are `<= 1` when the host leaves, the game document is dismantled from Firestore.
- **Lobby Hygiene:** Adhering to these rules prevents test runs and player abandonments from cluttering Firestore and ensures the game lobby only ever lists active, joinable rooms.

### 6.12. Island Tile Visual Layout & Animated Sprite Architecture
- **Deterministic Tree Forests (`TileForest.tsx`)**:
  - Small forests of 2–3 trees of **strictly identical type** (`pine_tree.gif`, `spring_tree.gif`, `autmn_tree.gif`, `tree.gif`) are rendered on Base islands (top-right cluster) and empty islands (dedicated natural clearing).
  - The tree type is deterministically hashed from island coordinates (`island.x * 7 + island.y * 13 + (isBase ? 3 : 0)`), ensuring 100% visual consistency across clients.
  - **Resource Island Forest Suppression Rule:** On `IslandType.Resource` islands, decorative trees are completely suppressed so commanders only see genuine resource nodes and never confuse background trees with wood nodes.
- **Animated Resource Representations (`TileResources.tsx`)**:
  - Replaces vector icons with rich animated pixel art sprites positioned at elevated layer `z-35`:
    - **Wheat / Food:** Grazing livestock pasture (`/sprites/sheep.gif`, dialog/HUD icons: `/sprites/icon_meat.png` / `/sprites/meat.png`).
    - **Iron / Wood:** Timber forest (`/sprites/tree.gif`, dialog/HUD icons: `/sprites/icon_wood.png` / `/sprites/wood.png`).
    - **Gems / Gold:** Gold mine (`/sprites/mine.png` idle, `/sprites/mine_active.png` when farmed, dialog/HUD icons: `/sprites/icon_gold.png` / `/sprites/gold.gif`).
  - **Organic Island Clearings:** Resources are distributed organically across island clearings (non-linear 2D scatter) for a natural, rich RPG aesthetic.
  - **Individual Multi-Sprite Rendering (No x2 Badges):** Islands with multiple resources of the same type render distinct individual animated sprites side-by-side (e.g. 2 sheep, 2 trees, 2 mines) instead of number badges.
- **Active Collector Farming:** Stationed collectors (`/sprites/farm_${player.color}.gif`) harvest directly on top of the specific resource node they are assigned to. When an army is positioned to harvest a resource, the active farming collector harvests directly at that specific resource node while the soldier remains stationed on the island.
- **Persistent Soldier / Knight Visibility (`TileOccupants.tsx`)**:
  - Army soldiers / knights remain **persistently visible** on island tiles at all times, ensuring commanders and opponents always have complete situational awareness of garrisoned forces.
- **Extra Move Card Mechanics & Balance (Nerfed to 1 Bonus Action)**:
  - Using the `Extra Move` card activates `hasExtraMove = true` on the player, allowing any 1 selected army on the board to perform a bonus action (`Move`, `Position`, or `Attack`).
  - As soon as that army completes its action, `hasExtraMove` is consumed (`false`) and all other armies that had previously acted remain disabled (`hasActed = true`), preventing whole-fleet multi-move exploits.
- **Automatic Turn Completion (`hasPlayerRemainingActions` & `GameBoardContext.tsx`)**:
  - Automatically transitions the turn when a player has exhausted all valid moves/attacks/positions and cannot afford any strategic actions (`Deploy`, `Upgrade`, `Buy Card`, `Use Card`, `Buy Ability`). Works from Turn 1 throughout the entire game.
- **Unified Sprite Dialogs & UI Presentation**:
  - All interactive dialogs (`ProductiveCardDialog`, `WealthyDialog`, `StealResourceDialog`, `PositionDialog`, `AbilitiesDialog`) feature rich animated preview sprites (`sheep.gif`, `tree.gif`, `gold.gif`), custom icons (`FightIcon`, `ResourceIcon`), and consistent presentation of resources as **Food**, **Wood**, and **Gold**.
- **Shoreline Boat Docking System (`TileBoats.tsx`)**:
  - Each island features 4 discrete shore corner anchors:
    - Corner 0: Bottom-Right
    - Corner 1: Top-Right
    - Corner 2: Top-Left
    - Corner 3: Bottom-Left
  - Every player's expedition boat (`/sprites/boat.gif`) begins anchored to their home Base shoreline.
  - When an army is occupying an island without being positioned on a resource, an idle faction collector (`/sprites/collector_${player.color}_idle.gif`) waits docked at the shoreline boat. Player Base tiles start with the owner's boat anchored in the water canal and idle collector.
  - When an army is landed on an island, their boat docks at the first available corner on that tile. Multiple players or armies occupying the same island receive separate corners without visual collision.
- **Perimeter Map Clouds & Atmosphere (`MapDecorations.tsx`)**:
  - Outer ocean margins surrounding the playable board are decorated with fixed atmospheric cloud formations (`/sprites/cloud_small.png`, `/sprites/cloud_medium.png`, `/sprites/cloud_big.png`) along margins and outer corners, framing uncharted waters.
- **Rebalanced Base Tile Layout (`IslandTile.tsx`)**:
  - Base castles (`/sprites/castle_{color}.png`) are sized to ~48–56px, creating a balanced landscape that cleanly accommodates the castle, tree forest, base resource nodes, idle collectors, and anchored shoreline boat.




