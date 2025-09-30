

# Corner Conquest - Application Architecture

This document outlines the architecture and key logic flows of the "Corner Conquest" application. It serves as a shared context for AI-assisted development to ensure consistency and accuracy.

**Development Directives for the AI Assistant:**
1.  **Synchronized Documentation:** For every code change I make, I **must** also update this `docs/README.md` file in the same transaction to reflect those changes. The code and the documentation will always be kept in sync.
2.  **Blueprint-First Validation:** Before I implement any change, I **must** first analyze the request against the established architecture and logic documented here. If the request conflicts with our blueprint, I will notify you of the discrepancy and await your confirmation before proceeding.

## 1. Core Technologies

- **Framework:** Next.js with App Router
- **Language:** TypeScript
- **UI:** React, ShadCN UI Components, Tailwind CSS
- **State Management (Client):** React Hooks (`useState`, `useMemo`, `useCallback`)
- **State Management (Game):** A hybrid model using a local-first approach for the active player's turn and Firestore real-time listeners for synchronization between turns.
- **Backend/Database:** Firebase (Firestore)

## 2. Project Structure & Development Guide

Understanding the project's structure is key to making changes efficiently and correctly.

- `src/app/`: Core application, pages, and layout.
- `src/components/`: Reusable, generic UI components (mostly from ShadCN).
- `src/features/`: Contains domain-specific components and logic.
  - `game/`: All components, dialogs, and panels related to the active game board.
    - `types.ts`: **(Local UI State)** Type definitions for client-side UI state (dialogs, pending actions).
  - `lobby/`: Components for creating and joining games.
- `src/hooks/`: Custom React hooks for managing client-side state and browser events. The most important are `useGameEngine` (Firestore sync) and `usePlayer` (session management).
- `src/lib/`: Core application logic, type definitions, and Firebase configuration.
  - `actions/`: **The "brain" of the game.** Contains pure functions that take the current `GameState` and an action, and return the new `GameState`.
  - `game-initializer.ts`: Logic for creating the initial game state, including map generation.
  - `game-logic.ts`: Higher-level logic, such as adding a player to a game.
  - `bot-logic.ts`: The AI logic for bot players.
  - `types.ts`: **(Shared State)** Central repository for the `GameState` object and its constituent types, which are synchronized with Firestore.

## 3. State Management & Session Logic

The application's architecture is built on a **local-first, end-of-turn batching** model. This is critical to understand. It ensures a responsive UI, reduces database operations, and eliminates a whole class of state synchronization bugs.

### 3.1. Player Session Management (`usePlayer` Hook)
The player's session (their identity) is managed through a combination of browser `localStorage` and Firestore, orchestrated by the `usePlayer` hook. This logic remains unchanged.

1.  **First Visit:** A unique `playerId` is generated and stored in `localStorage`.
2.  **Login (`setUsername`):** The user's chosen `username` is "locked" in a Firestore `usernames` collection, linking it to their `playerId`. The username is also saved to `localStorage`.
3.  **Session Persistence (Page Reload):** The `usePlayer` hook re-validates the `playerId` and `username` from `localStorage` against the Firestore record to ensure the session is still valid.
4.  **Logout / Tab Close (`logout`):** The `username` lock is removed from Firestore and `localStorage`, freeing it up for others.

### 3.2. Shared Game State vs. Local Turn State

This distinction is the most important part of the architecture.

#### **Shared State (`serverGameState`)**
-   **What It Is:** The authoritative `GameState` object stored in Firestore. This is the source of truth for all players at the **start and end of each turn**.
-   **Synchronization:** All players subscribe to this document via the `useGameEngine` hook. When a turn ends, the `serverGameState` is updated once, and this single update is pushed to all clients.
-   **When It's Modified:**
    1.  At the end of a player's turn, when their final `localGameState` is written to Firestore.
    2.  During real-time combat sequences (`combatState`, `monsterCombatState`), which require immediate synchronization between participants.

#### **Local Turn State (`localGameState`)**
-   **What It Is:** A complete, deep-cloned copy of the `serverGameState`, created in the browser's memory at the exact moment a player's turn begins.
-   **Synchronization:** **It is never directly synchronized with Firebase.** It exists *only* on the current player's client.
-   **When It's Modified:** Every action the current player takes (moving an army, using a card, spending resources) instantly modifies this `localGameState` object. This is why the UI feels instantaneous.

### 3.3. Purely Local UI State (`GameBoard.tsx`)

This is the third tier of state, representing a single player's temporary UI status. It is irrelevant to other players and is never sent to the server. It is managed entirely within the `GameBoard.tsx` component using React hooks like `useState`.

-   **Key Local UI State Variables:**
    -   `selectedArmyId: number | null`: The ID of the army the local player has clicked on.
    -   `possibleMoves: {x, y}[]`: The array of valid move locations for the selected army.
    -   `pendingAction: PendingAction | null`: The state for a multi-step local action (e.g., waiting for the player to select a teleport destination).
    -   **All Dialog States:** The open/closed status of any dialog (`armySelectionDialog`, `cardsDialogPlayerId`, etc.) is purely a local concern.

### 3.4. The Action Flow: From Click to Update (The New Model)

This new flow is the key to the app's stability.

1.  **Turn Start:** It's your turn. `GameBoard.tsx` creates `localGameState = cloneDeep(serverGameState)`. The UI now renders based on `localGameState`.
2.  **Local Action:** You click a valid tile to move an army.
3.  **Local State Mutation:** `handleTileClick` calls `handleMoveAction`. This pure function takes your *current* `localGameState`, calculates the new army position, sets `hasActed: true`, and returns a *brand new* `localGameState` object. `GameBoard.tsx` updates its state with this new object.
4.  **Instant UI Update:** The UI re-renders instantly to show the army in its new position. **No Firebase write has occurred.**
5.  **More Local Actions:** You use a card, upgrade your attack power, and deploy a new army. Each action synchronously repeats Step 3 and 4 on the `localGameState`.
6.  **End of Turn:** You click the "End Turn" button.
7.  **Shared State Update (The Batch Write):** The `handleEndTurn` action handler is called. It takes your final, modified `localGameState` object and writes the entire thing to the Firestore document in a **single operation**.
8.  **Synchronization:** Firestore pushes this complete update to all other players. Their `useGameEngine` hooks receive the new `serverGameState`, and their UIs re-render to show the final result of your turn.

This architecture ensures responsiveness, reduces database costs, and eliminates state-synchronization bugs by design.

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
- **Island Distribution:** The balance between Resource, Monster, and Special islands is controlled by the `resourceDensity` setting (default 60%). This value corresponds to the probability that a tile will be a resource island. The remaining percentage is split between Monster and Special islands, with Special islands being rarer. The distribution also changes based on distance from the map's center, with more valuable and dangerous islands appearing closer to the middle.

### 5.3. Resources & Progression
- **Wheat:** Used to **Deploy** new armies. The cost increases with each new new army.
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

2.  **Performing an Army Action:**
    - When an army successfully completes a `Move`, `Attack`, or `Position` action, its `hasActed` flag is immediately set to `true`.
    - Once `hasActed` is `true`, that army cannot initiate another major action for the rest of the turn. The UI will show the army as faded, and buttons for these actions will be disabled when that army is selected.
    - The `getPossibleMoves` function will return an empty array `[]` for an army where `hasActed` is `true`.

3.  **End of Turn:**
    - The `hasActed` flags are **not** reset when a player ends their turn. They persist until the start of that player's next turn.

### 6.2. Army Actions

#### **Position**
1.  **Trigger:** Player clicks the "Position" button in the `ActionsPanel` while a valid, un-acted army is selected on a resource island with no monsters.
2.  **UI Flow:** A local `PositionDialog` opens, showing the available resource spots on the current island.
3.  **Input:** Player clicks on a resource button in the dialog.
4.  **Resolution (Local):** A `GameAction.SelectResourcePosition` action is dispatched on the `localGameState`.
    -   The `localGameState` is updated to mark the army as positioned on that resource.
    -   **The army's `hasActed` flag is set to `true`.**
    -   This action ends the army's turn. The army will collect that resource at the start of the player's next turn.

#### **Attack**
1.  **Trigger:** Player clicks the "Attack" button in the `ActionsPanel` while a valid, un-acted army is selected on an island with a valid target (enemy army or monster).
2.  **UI Flow (vs. Player):**
    -   If there is one target army, a `GameAction.Attack` is dispatched. This is a **real-time action**. It writes to Firestore to set the shared `combatState`, and the `CombatDialog` opens for both attacker and defender.
    -   If there are multiple target armies, a local `AttackSelectionDialog` opens for the attacker. Upon selection, a `GameAction.SelectDefender` action sets the shared `combatState`, and the `CombatDialog` opens.
3.  **UI Flow (vs. Monster):**
    -   If there is one monster, a `GameAction.Attack` is dispatched, setting the shared `monsterCombatState` in Firestore and opening the `MonsterCombatDialog` for the attacker.
    -   If there are multiple monsters, a local `MonsterSelectionDialog` opens. Upon selection, the chosen monster is set, and the `MonsterCombatDialog` opens.
4.  **Resolution (Shared):** When the attacker clicks "Roll Dice" in the dialog, the `handleCombatRoll` or `handleMonsterCombatRoll` action is dispatched.
    -   **The attacking army's `hasActed` flag is immediately set to `true` upon the dice roll.** This is the moment the action is committed.
    -   Combat is resolved, updating the `GameState` with the result. This action ends the army's turn.

#### **Move**
1.  **Trigger:** Player has a valid, un-acted army selected and clicks on a highlighted tile on the map that is a valid move destination.
2.  **UI Flow:** No dialogs. The army's sprite appears to move to the new tile instantly.
3.  **Resolution (Local):** A `GameAction.Move` action is dispatched on the `localGameState`.
    -   The `localGameState` is updated with the army's new `position`.
    -   **The army's `hasActed` flag is set to `true`** (unless "Extra Move" is used on a fresh army).
    -   If the destination tile was previously unrevealed by this player, `revealIsland` logic is triggered.

### 6.3. Strategic Actions
These actions are available once per turn each and do not set the `hasActed` flag on any army. They are all processed on the `localGameState`.

#### **Deploy**
1.  **Trigger:** Player clicks the "Deploy" button.
2.  **Resolution (Local):** A `GameAction.Deploy` action is dispatched. The `localGameState` is updated:
    -   Wheat is subtracted.
    -   A new army is added to the player's Base tile with `hasActed: true`.
    -   The `deploy` action is marked as used for the turn.

#### **Upgrade**
1.  **Trigger:** Player clicks the "Upgrade" button.
2.  **Resolution (Local):** A `GameAction.Upgrade` action is dispatched. The `localGameState` is updated:
    -   Iron is subtracted.
    -   The player's global `attackPower` is increased.
    -   The `upgrade` action is marked as used for the turn.

#### **Buy Card**
1.  **Trigger:** Player clicks the "Buy Card" button.
2.  **Resolution (Local):** A `GameAction.BuyCard` action is dispatched. The `localGameState` is updated:
    -   Gems are subtracted.
    -   A random card is moved from the `specialCardsDeck` to the player's hand.
    -   The `buy-card` action is marked as used for the turn.

#### **Use Card**
1.  **Trigger:** Player clicks "My Cards", then clicks "Use" on a specific card.
2.  **Resolution (Local):** Varies by card. See "Special Card Interactions" below.

### 6.4. Combat Flow
- Combat is resolved through dice rolls. Each player rolls a number of dice equal to their **Attack Power + 1**.
- **Player vs. Player:** The player with the higher total roll wins the battle. In case of a tie, the **defender** wins.
- **Player vs. Monster:** The player with the higher total roll wins the battle. In case of a tie, the **monster** wins.
- **Defeated armies are not destroyed.** They are sent back to their owner's Base tile to regroup, and their `hasActed` status is **reset to `false`**, making them ready for action on their next turn.
- **Combat Dialog Animations:** During the `rolling` phase of combat, both combatants show their `attack` sprite. In the `results` phase, the winner's sprite remains in the `attack` pose, while the loser's sprite changes to the `death` animation. All army and monster sprites are animated GIFs. To ensure combatants face each other, the sprite for the combatant on the right side of the dialog (the defender/monster) is horizontally flipped.

### 6.5. Special Card Interactions
-   **Starting a Match:** In a standard Player-vs-Player match, all players start with **zero** Special Cards. In a Player-vs-Bot match, if `Debug Mode` is enabled, the human player starts with one of every available Special Card.
-   **Hand Limit & Card Acquisition:** A player can hold a maximum of **7** Special Cards. If a player discovers a Special Island or buys a card while their hand is full, they do not receive a new card. If the main deck runs out of cards, the discard pile is shuffled to create a new deck.
-   **Using a Card:** When a player uses a card, it is removed from their hand and placed in the `discardPile`. The `Use Card` action is consumed for the turn. Cards relevant to a specific action (e.g., `War Chief` for combat) will appear as an option within that action's dialog.
-   **Canceling a Card:** If a player activates a card like "Teleport" but then decides not to use it, they can click "Deselect Army" or trigger the "Cancel" button. This is a local UI action that resets the pending UI state. It also dispatches a `GameAction.CancelAction`, which refunds the 'Use Card' action for the turn, allowing them to use a different card.

-   **Extra Move:**
    1.  **Trigger:** Player uses the card from the `CardsDialog`.
    2.  **Resolution (Local):** A `GameAction.UseCard` action is dispatched. The card is consumed from the hand, and the player's `hasExtraMove` flag is set to `true` in `localGameState`.
    3.  **Effect:** This flag allows any one army to perform one `Move` action. If used on an army that has **not yet acted**, that army remains "fresh" (`hasActed: false`) after the move and can perform a subsequent action. If used on an army that **has already acted**, it gets to move, but remains exhausted. The `hasExtraMove` flag is consumed after the move is completed.

-   **Teleport:**
    1.  **Trigger:** Player uses the card from the `CardsDialog`.
    2.  **UI Flow (Local):** A `pendingAction` of `{ type: 'teleport' }` is set in local UI state. The UI prompts for army and destination selection.
    3.  **Input:** Player clicks one of their armies, then clicks any tile on the map.
    4.  **Resolution (Local):** A `GameAction.Move` with `isTeleport: true` is dispatched on the `localGameState`. The card is consumed, the army moves, and its `hasActed` is set to `true`.

-   **Scout:**
    1.  **Trigger:** Player uses the card from the `CardsDialog`.
    2.  **UI Flow (Local):** A `pendingAction` of `{ type: 'scout', count: 3 }` is set.
    3.  **Input:** Player clicks on 3 hidden tiles. A local `GameAction.Scout` is dispatched for each click to reveal them in `localGameState`.
    4.  **Resolution (Local):** After the third tile is revealed, a `GameAction.UseCard` with `isScout: true` is dispatched to consume the card from the player's hand.

-   **Sabotage, Wealthy, Steal Resource:** These cards open a local dialog (`SabotageDialog`, `WealthyDialog`, `StealResourceDialog`). Upon final selection, they dispatch a corresponding action (`GameAction.SabotagePlayer`, etc.) on the `localGameState` which consumes the card and applies the effect.

-   **Reinforce, Efficient, Master Builder:** Using these cards sets a temporary flag (`reinforceActive`, etc.) on the player in `localGameState`. The next corresponding action (`Deploy` or `Upgrade`) within the same turn will consume the flag and the card, applying the cost reduction.

-   **Overcome, War Chief, Decide Dice Roll:** These cards are used contextually during combat. They appear as options in the `CombatDialog` or `MonsterCombatDialog` and are consumed as part of the shared `handleCombatRoll` actions.

-   **Productive:** At the start of a turn, if the player has positioned armies, a local `ProductiveCardDialog` opens. Selecting a resource dispatches `GameAction.UseProductiveCard`, which doubles the yield and consumes the card.

### 6.6. UI/UX and Other Interactions

#### **UI Dialogs and Player Scope**
- **Local Dialogs:** Most dialogs for actions (`Sabotage`, `Wealthy`, `Position`, `My Cards`, `Abilities Shop`) are rendered **only for the current player** and manage their own local UI state.
- **Global Dialogs:** The `CombatDialog` and `MonsterCombatDialog` are exceptions. Their state (`combatState`, `monsterCombatState`) is stored in the shared `serverGameState` because all players need to see the outcome.

#### **Army and Tile Selection**
- **Selection/Deselection:** Clicking armies or tiles are local UI actions that update local UI state like `selectedArmyId`. Deselecting an army also cancels any pending card action.

### 6.7. Fog of War & Debug Mode

-   **Fog of War (Enabled):** The default tactical experience. Each player has their own `revealedTiles` array.
-   **Fog of War (Disabled):** An open, chess-like experience where revealed tiles are visible to everyone.
-   **Debug Mode:** A testing mode for "Player vs. Bot" games. It disables Fog of War and gives the human player one of every Special Card at the start.

### 6.8. Bot Logic
The AI behavior is defined in `src/lib/bot-logic.ts`. It uses a dynamic, priority-based system to make decisions.
1.  At the start of its turn, the bot evaluates all possible strategic and army actions.
2.  Each action is assigned a numeric `priority` based on the current game state.
    - **Positioning on a resource:** Very high priority (9). This is the bot's primary way to build its economy.
    - **Attacking:** High priority, especially if the bot has a power advantage or if it needs to clear a monster from a valuable island.
    - **Using Strategic Cards:** The bot will intelligently use cards like `Wealthy` if it is low on a resource needed for a high-priority action (like deploying an army). It will also use `Reinforce`, `Efficient`, and `MasterBuilder` to save resources.
    - **Upgrading Attack Power:** Medium priority, which decreases as its power level increases to avoid over-investing.
    - **Deploying a new Army:** Medium priority, which decreases as its army count increases to maintain a balanced force.
    - **Exploring:** The bot now has a higher priority to explore new tiles, preventing it from getting stuck and encouraging expansion.
3.  The bot executes the single action with the highest priority score. If no action is possible or an error occurs, it will safely end its turn as a fallback.

## 7. Future Feature Ideas & Architectural Evaluation

This section outlines potential new features to enhance the game, along with a high-level evaluation of their architectural impact and complexity.

### 7.1. Increase Player Interaction & Drama 🎭
Right now, player interaction is mostly direct combat. We can add layers of negotiation, alliance, and betrayal.

**Bounties:** When a player gets a significant lead (e.g., 10 VP more than the next player), the game could automatically place a bounty on them. The next player to defeat one of their armies in battle steals some of their resources or earns bonus Victory Points.

*   **Why it's fun:** It’s a natural comeback mechanic that creates a "king of the hill" scenario. It makes being in the lead more exciting and dangerous, and it gives trailing players a clear objective.
*   **Architectural Impact (Low):** This is relatively simple to add. The `GameState` could have a `bountyOnPlayerId: number | null` field. The logic would be checked in the `handleEndTurn` function.

### 7.2. Create a Dynamic & Living World 🌍
A static board can become predictable. Introducing elements that change the state of the map keeps players on their toes.

**Global Events:** At the start of every full round of turns (e.g., when the first player starts their turn again), a random global event could occur that lasts for one round.

*   **Examples:** "Bumper Harvest" (+1 to all resource collection), "Monsoon Season" (army movement is reduced by 1), "Monster Uprising" (monsters on the board get +1 attack power for the round).
*   **Why it's fun:** Events force players to adapt their strategies on the fly and can turn a bad situation into a good one (and vice-versa), creating memorable moments.
*   **Architectural Impact (Low):** You'd add a `currentEvent: GameEvent | null` to the `GameState`. A new function would be called by `handleEndTurn` when a full round completes to draw a new event.

### 7.3. Deepen Strategic Choices & Customization 💡
Giving players more ways to develop their faction makes each game feel different and allows for more personal playstyles.

**Asymmetric Player Factions:** Instead of just a color, each player chooses a faction at the start of the game with a small, unique passive bonus.

*   **Examples:** A "Seafarer" faction that can move armies one extra tile, a "Merchant" faction that gets a discount when buying cards, a "Warlord" faction whose armies start with slightly more power, an "Engineer" faction that can deploy armies for less Wheat.
*   **Why it's fun:** This dramatically increases replayability. A strategy that works for one faction won't work for another, encouraging players to experiment.
*   **Architectural Impact (Medium):** A `faction` property would be added to the `Player` object. Your core logic functions in `lib/actions` would then simply check for the player's faction before applying costs or calculating moves. It's more work, but requires no major architectural changes.

### 7.4. Improve Game Pacing & Tension ⚖️
Ensure the game has a clear beginning, middle, and end, without a mid-game "drag" or a runaway leader problem.

**Secret Objectives:** At the start of the game, give each player two private, secret objectives (e.g., "Occupy 3 Gem islands," "Win a battle against every opponent," "Discover 5 islands"). Completing one could grant a big chunk of VP (e.g., 7 VP).

*   **Why it's fun:** It keeps everyone guessing who is really in the lead. A player who seems behind on the public VP track might suddenly surge to victory, creating suspense until the very end. It also gives players direction if they are unsure what to do.
*   **Architectural Impact (High):** This is the most architecturally challenging idea. Player objectives would need to be stored in a way that is hidden from other players, which would require a private sub-collection in Firestore for each player in the game (e.g., `games/{gameId}/privateData/{playerId}`).
