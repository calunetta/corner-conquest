# Corner Conquest - Application Architecture

This document outlines the architecture and key logic flows of the "Corner Conquest" application. It serves as a shared context for AI-assisted development to ensure consistency and accuracy.

**Development Directives for the AI Assistant:**
1.  **Synchronized Documentation:** For every code change I make, I **must** also update this `docs/README.md` file in the same transaction to reflect those changes. The code and the documentation will always be kept in sync.
2.  **Blueprint-First Validation:** Before I implement any change, I **must** first analyze the request against the established architecture and logic documented here. If the request conflicts with our blueprint, I will notify you of the discrepancy and await your confirmation before proceeding.

## 1. Core Technologies

- **Framework:** Next.js with App Router
- **Language:** TypeScript
- **UI:** React, ShadCN UI Components, Tailwind CSS
- **State Management (Client):** React Hooks (`usePlayer`, `useToast`)
- **State Management (Game):** Firestore real-time listeners (`useGameEngine`)
- **Backend/Database:** Firebase (Firestore)

## 2. Project Structure & Development Guide

Understanding the project's structure is key to making changes efficiently and correctly.

- `src/app/`: Core application, pages, and layout.
- `src/components/`: Reusable, generic UI components (mostly from ShadCN).
- `src/features/`: Contains domain-specific components and logic.
  - `game/`: All components, dialogs, and panels related to the active game board.
  - `lobby/`: Components for creating and joining games.
- `src/hooks/`: Custom React hooks for managing client-side state and browser events. The most important are `useGameEngine` (Firestore sync) and `usePlayer` (session management).
- `src/lib/`: Core application logic, type definitions, and Firebase configuration.
  - `actions/`: **The "brain" of the game.** Contains pure functions that take the current game state and an action, and return the new game state. *All new game mechanics must be implemented here.*
  - `game-initializer.ts`: Logic for creating the initial game state, including map generation.
  - `game-logic.ts`: Higher-level logic, such as adding a player to a game.
  - `bot-logic.ts`: The AI logic for bot players.
  - `types.ts`: Central repository for all TypeScript types used in the application. This is a critical file for maintaining type safety.

### 2.1. The Importance of Enums
The project uses TypeScript `enum`s extensively (e.g., `GameAction`, `IslandType`, `CardName`), all defined in `src/lib/types.ts`.
- **Why?** Enums prevent bugs caused by typos and ensure that actions and types are used consistently across the entire codebase. Using `GameAction.Deploy` is safe; typing `"deploi"` is not.
- **Critical Note:** A common source of hard-to-debug errors has been incorrect enum imports. **Always double-check that you are importing the correct enum** from `types.ts` when implementing new logic.

## 3. Game State Management & Firebase Logic

The application uses a "state machine" pattern where the game state is managed centrally in Firestore and modified by pure functions.

1.  **Central State:** The entire `GameState` object is stored as a single document in a Firestore collection named `games`.

2.  **Client-Side Subscription (Reading):** The `useGameEngine` hook (`src/hooks/use-game-engine.ts`) is the primary connection to the game state. It subscribes to real-time updates for the current game document in Firestore using `onSnapshot`. When the document changes on the backend, it automatically updates the local React state, causing the UI to re-render for **all connected players**.

3.  **User Actions & State Updates (Writing):**
    - A user interaction (e.g., clicking a tile) in a component like `GameBoard.tsx` triggers an action.
    - It calls `handleGameAction` in `src/lib/actions/index.ts`. This is the **single entry point** for all game logic modifications.
    - `handleGameAction` acts as a router, delegating the action to a specific, more granular function (e.g., `handleMoveAction`, `handleAttackAction`).
    - These granular functions are **pure**: they receive the current `GameState` and a payload, perform calculations, and return a **new `GameState` object**. They **do not** modify the state directly.
    - The new `GameState` object is returned up the chain to `GameBoard.tsx`.
    - The `setGameState` function (which is an alias for `updateGameState` from `useGameEngine`) is called. This function writes the entire new state object back to Firestore, overwriting the old one in a single transaction.

This architecture ensures that the game logic is predictable, testable, and decoupled from the UI. UI components are responsible for *displaying* the state and *dispatching* actions, while the `lib/actions` files are responsible for *calculating* state changes.

### 3.1. Turn Change Logic
When `handleEndTurn` is called, a sequence of events occurs:
1.  The `currentPlayerIndex` is incremented.
2.  The new current player's armies have their `hasActed` status reset to `false`, and their `actionsThisTurn` array is cleared.
3.  Any temporary statuses (like `hasExtraMove`) are reset.
4.  Passive abilities for the *outgoing* player (like `Explorer`) are calculated and applied.
5.  A check is performed to see if the *new* player is sabotaged. If so, their turn is skipped.
6.  A check for the *new* player's pre-turn actions is performed (e.g., Automatic Resource Collection). If they are positioned on resources, the appropriate collection logic or dialog (`ProductiveCardDialog`) is triggered.
7.  A log message announces the new turn.
8.  All temporary dialog states (`combatState`, `positionDialogState`, etc.) are reset to `null`.

### 3.2. Firebase & React/Next.js Common Pitfalls
- **Firestore Cannot Store `undefined`:** A recurring critical bug is caused by attempting to write a `GameState` object with `undefined` properties. Firestore will silently strip these properties, causing the `GameState` read by clients to have a different shape than expected, leading to crashes. **Rule: Always use `null` instead of `undefined`** for optional or empty state properties.
- **React's Rules of Hooks:** You **cannot** call hooks (`useState`, `useEffect`, `useMemo`, etc.) inside loops, conditions, or nested functions. A common mistake is trying to use `useMemo` inside a `.map()` function. Hooks must always be called at the top level of your component.

### 3.3. Estimated Firestore Usage
A full 4-player game to 30 Victory Points is highly variable, but a rough estimate can be made:
- **Assumptions:** ~10 turns per player, ~2 actions (writes) per turn.
- **Writes:** `4 players * 10 turns/player * 2 writes/turn` = **~80 writes**.
- **Reads:** Every write triggers a read for all connected clients. `80 writes * 4 players` = **~320 reads**.
This is an efficient model, as it ensures all players have the latest state with minimal reads per action.

## 4. Core Game Mechanics & Match Flow

### 4.1. Objective & Winning
The first player to reach the `victoryPointGoal` (default: 30 VP) wins the game. When this occurs, the game `status` changes to 'finished', a `winner` is declared in the game state by creating a deep copy of the winning player object, and a dialog appears announcing the winner. Victory Points (VP) are earned from:
- **Winning Battles:** +5 VP for defeating another player's army.
- **Defeating Monsters:** Variable VP based on monster level (2 for Lvl 1, 5 for Lvl 2, etc.).
- **Island Discovery:** +`vpPerIslandDiscovery` VP for being the first player in the game to reveal a new island.
- **Passive Abilities:** The `Explorer` ability grants VP each turn for every island you occupy.

### 4.2. The Map & Islands
The game is played on a grid of islands. Each player starts at their **Base** in a corner. The rest of the map is hidden by Fog of War until a player's army moves to a tile, revealing it. The procedural generation of the map is governed by the `game-initializer.ts` file and can be tweaked via the "Customize Match" settings in the lobby.
- **Base:** Your starting point. Where you deploy new armies and where defeated armies respawn. Bases also generate all three resource types. The Base's appearance is a castle sprite specific to the player's color, defined in `src/lib/player-data.ts`.
- **Resource Islands:** Contain **Wheat**, **Iron**, or **Gems**. The generation logic is as follows:
    - An island can have one or two types of resources, determined by its distance from the map's center.
    - If an island has **one** resource type, it will always have **two** collection spots for that resource.
    - If an island has **two** resource types, each type will have a random number of collection spots (either one or two).
- **Monster Islands:** Inhabited by hostile creatures that must be defeated. When monsters are present, they are rendered with a dynamic idle animation within the `IslandTile` component. Their sprites randomly shift left and right and have a chance to play their `attack` animation to make them feel alive. All monster sprites are animated GIFs. When the last monster on an island is defeated, the island's type changes to `Resource`, but **note:** no new resources are currently generated on it.
- **Special Islands:** Discovering these grants the player a random Special Card. On subsequent landings on the same island, a dialog appears prompting the player to roll a die. On a roll of 3 or 6, they receive another card.
- **Island Distribution:** The balance between Resource, Monster, and Special islands is controlled by the `resourceDensity` setting (default 60%). This value roughly corresponds to the probability that a tile will be a resource island. The remaining percentage is split between Monster and Special islands, with Special islands being rarer. The distribution also changes based on distance from the map's center, with more valuable and dangerous islands appearing closer to the middle.

### 4.3. Resources & Progression
- **Wheat:** Used to **Deploy** new armies. The cost increases with each new new army.
- **Iron:** Used to **Upgrade** the Attack Power of all your armies permanently.
- **Gems:** Used to **Buy Special Cards** or purchase permanent **Passive Abilities**.

### 4.4. Turn Structure & Actions
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

### 4.5. Combat
- Combat is resolved through dice rolls. Each player rolls a number of dice equal to their **Attack Power + 1**.
- **Player vs. Player:** The player with the higher total roll wins the battle. In case of a tie, the **defender** wins.
- **Player vs. Monster:** The player with the higher total roll wins the battle. In case of a tie, the **monster** wins.
- Defeated armies are not destroyed; they are sent back to their owner's Base tile to regroup.
- **Combat Dialog Animations:** During the `rolling` phase of combat, both combatants show their `attack` sprite. In the `results` phase, the winner's sprite remains in the `attack` pose, while the loser's sprite changes to the `death` animation. All army and monster sprites are animated GIFs defined in `src/lib/player-data.ts` and `src/lib/game-initializer.ts`, respectively. To ensure combatants face each other, the sprite for the combatant on the right side of the dialog (the defender/monster) is horizontally flipped.

## 5. Detailed System Explanations

### 5.1. Player Login & Username Uniqueness
The application ensures that every player has a unique username.
- When a user enters a username in the `Login` component (`src/app/page.tsx`), it calls the `setUsername` function from the `usePlayer` hook.
- This function queries a `usernames` collection in Firestore to check if a document with that name already exists.
- If the document exists and is associated with a different player's ID, `setUsername` returns `false`.
- The `Login` component then displays an "Username Taken" dialog, prompting the user to choose a different name. This prevents duplicate usernames in the lobby and game.

### 5.2. Special Cards
- **Starting a Match:** In a standard Player-vs-Player match, all players start with **zero** Special Cards. In a Player-vs-Bot match, if `Debug Mode` is enabled, the human player starts with one of every available Special Card.
- **Hand Limit & Card Acquisition:** A player can hold a maximum of **7** Special Cards. If a player discovers a Special Island or buys a card while their hand is full, they do not receive a new card. If the main deck runs out of cards, the discard pile is shuffled to create a new deck.
- **Using a Card:** When a player uses a card, it is removed from their hand and placed in the `discardPile`. The `Use Card` action is consumed for the turn. Cards relevant to a specific action (e.g., `War Chief` for combat) will appear as an option within that action's dialog.
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

### 5.3. UI/UX and Interactions

#### 5.3.1. Dialogs and Player Scope
- **Local Dialogs:** Most dialogs for actions (`Sabotage`, `Wealthy`, `Position`, etc.) are rendered **only for the current player**. This is managed by the `isMyTurn` flag within `GameDialogs.tsx`.
- **Global Dialogs:** The `CombatDialog` is an exception. It shows an interactive view to the attacker and a read-only "results" view to all other players, ensuring everyone can follow the action.

#### 5.3.2. Army and Tile Selection
- **Auto-Selection:** If a player has only one army at the start of their turn, it is automatically selected.
- **Manual Selection:** Clicking a tile containing one of your armies selects it.
- **Multi-Army Selection:** Clicking a tile with multiple friendly armies opens the `ArmySelectionDialog` to choose a specific unit.
- **Deselection:** An army can be deselected by:
    1.  Clicking the "Deselect Army" button.
    2.  Clicking on any tile that is not a valid move for the currently selected army.

#### 5.3.3. Visual Feedback
- **Selected Army:** The tile of a selected army gets a prominent glowing shadow (`shadow-2xl shadow-primary/80`).
- **Player-Owned Tiles:** Tiles occupied by the local player's armies have a subtle, color-coded glow (`shadow-blue-500/50`, `shadow-red-500/50`, etc.) for easy identification.
- **Possible Moves:** Valid move destinations for a selected army are highlighted with a dashed border (`border-accent/70`).
- **Teleport Action:** When `Teleport` is active, all tiles on the map are highlighted with a purple border (`border-purple-500`) to indicate they are valid destinations.
- **Fog of War Indicator:** When Fog of War is active, undiscovered islands display a '?' icon (`HelpCircle` from lucide-react) instead of their true contents. This is rendered in `IslandTile.tsx`.
- **Animations & Scenery:**
    - Game sprites (armies, monsters, death animations) are animated GIFs located in `public/sprites/`. The specific sprites for each player's army are defined in `src/lib/player-data.ts`. The castle base sprites are high-quality PNGs.
    - **Note on Animated GIFs and Next.js:** When using animated GIFs with the Next.js `<Image>` component, the `unoptimized` prop **must** be used. Next.js's default image optimization can break GIF animations or remove transparency. Using `unoptimized` serves the original file, ensuring it renders correctly. This may slightly increase initial load times as the file size is not reduced, but it is necessary for functionality. The blurriness seen in some animations is a result of using low-resolution source images in larger display containers, a trade-off for correct animation playback. The ideal solution is to use higher-resolution source GIFs.
    - The water background (`bg-water-pattern`) and island terrain textures (`bg-terrain`) are defined in `tailwind.config.ts` and applied in their respective components.
    - An animated border appears at the bottom of each island tile to give the illusion of water movement. This is created in `IslandTile.tsx` by combining three separate GIF images (`island_edge_1.gif`, `island_edge_2.gif`, `island_edge_3.gif`) in a randomized sequence.
    - Decorative rocks in the water are procedurally placed by `MapGrid.tsx` for visual variety. This is disabled on mobile for performance and clarity.

#### 5.3.4. Confirmation Dialogs
- `ConfirmExitDialog`: Appears if a player attempts to leave a match that is in progress.
- `HostLeaveDialog`: A special dialog for the host, warning them that leaving will delete the game room and end the match for all players.

### 5.4. Player Info Panel
This UI element provides a real-time summary for each player in the game, displaying:
- Player Name and Army Sprite
- **Victory Points (VP)**
- **Army Count:** Total number of armies on the board.
- **Attack Power:** Global modifier for all armies.
- **Resources:** Current count of Wheat, Iron, and Gems.
- **Special Cards:** Total number of cards in hand.
- **Status Effects:** Icons for `Sabotage` (miss next turn) or `Extra Move`.
- **Layout:** The panel uses a responsive grid (`grid-cols-2 lg:grid-cols-4`), accommodating up to 4 players. Empty slots are filled with "Waiting for player..." placeholders in the lobby.

### 5.5. Player Exiting the Game
- **Normal Player:** If a non-host player leaves, their armies are removed from the board, they are removed from the `players` array in the game state, and a log message is generated. The game continues for the remaining players.
- **Host Player:** If the host leaves, the entire game document is **deleted from Firestore**. The game ends for all players, and they are returned to the lobby.

### 5.6. Game Customization
From the Lobby, players can create a new game and access a "Customize Match" sheet with the following options:
- **General:** Victory Point goal, enable/disable Fog of War, set VP for island discovery, and adjust the density of resource islands vs. monster islands.
- **Costs:** Set the initial cost for deploying armies, the cost increment for subsequent deployments, and the costs for upgrades and passive abilities.
- **Content:** Selectively enable or disable which Special Cards and Passive Abilities are available to be drawn or purchased during the match.

### 5.7. Game Log
The game log is a running, public history of major events in the match, displayed to all players. It records:
- Players joining or leaving.
- Game start and end.
- Turn progression (`It's now Player X's turn.`).
- Key actions like deploying armies, upgrading power, and buying cards.
- Combat outcomes (`Player A defeated Player B!`).
- Resource collection and VP gains.
- Special card usage (`Player X used 'Teleport'!`).

This log provides crucial context and a narrative for the unfolding game.

### 5.8. Fog of War & Debug Mode

-   **Fog of War (Enabled):** This is the default, tactical experience.
    -   Each player has their own, independent visibility of the map.
    -   Tiles (and any armies on them) are only revealed to a player when they move one of their armies to an adjacent tile.
    -   Opponent armies are only visible on their starting Base or on islands you have personally explored.
-   **Fog of War (Disabled):** This mode provides a more open, chess-like experience.
    -   Map visibility is shared. When any player reveals a tile, it becomes visible to *all* players for the rest of the game.
-   **Debug Mode:** This is a special mode intended for testing, which is automatically enabled for "Player vs. Bot" games started from the lobby.
    -   **Complete Map Visibility:** It overrides any Fog of War setting, making the entire map and all armies visible from the start of the match.
    -   **All Special Cards:** The player begins the game with one of every available Special Card, allowing for immediate testing of card mechanics.

### 5.9. Responsive Design & Mobile Experience

The application is designed to be fully responsive, with key adjustments made for smaller screens. The core of this is the `useIsMobile` hook, which checks for screen widths below 768px.

-   **Layout Scalability:**
    -   On mobile, the `GameBoard` displays as a single, vertical column to prioritize the map view. The Actions Panel and Game Log appear below the map.
    -   On desktop (or screens wider than 1024px), the layout shifts to a two-column grid, with the Actions Panel and Game Log positioned to the right of the map for easier access.
    -   The `PlayerInfo` panel at the top is collapsed by default on mobile to conserve vertical space and can be expanded by the user.
    -   In the lobby, the main header (containing the "Game Lobby" title and "Create New Game" button) stacks vertically on mobile screens to prevent overflow and improve usability. The list of available games also adjusts, grouping player information more cleanly on smaller screens.

-   **Map & Interaction:**
    -   The `MapGrid` itself scales down for mobile. Tile sizes are reduced from 75px to 120px, and the gap between them shrinks from 16px to 32px.
    -   To improve performance and reduce visual clutter on smaller screens, the decorative rocks in the water background are disabled on the mobile version.

-   **Starting a Game:**
    -   The "Start Game" button's location is consistent across both mobile and desktop. When in a "waiting" lobby, it appears in the header area at the top of the screen. It is only visible to the game's host and only appears once at least one other player has joined. When the game starts, this header is hidden.

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

## 7. Build & Styling Configuration

This section details the project's build and styling setup. Changes to these files can have a significant impact on the application's functionality and appearance.

### 7.1. Next.js Configuration (`next.config.ts`)

-   **Error Handling:** The configuration is currently set to `ignoreBuildErrors: true` for TypeScript and `ignoreDuringBuilds: true` for ESLint. This is for rapid development and should be reviewed before a production deployment.
-   **Image Optimization:** The `images.remotePatterns` array is configured to allow image optimization for URLs from `placehold.co`, `images.unsplash.com`, and `picsum.photos`. If you need to use images from a new, external domain, you **must** add its hostname to this list.

### 7.2. Tailwind CSS Configuration (`tailwind.config.ts`)

-   **Content Scanning:** The `content` array tells Tailwind which files to scan for class names. It is currently set to `['./src/app/**/*.{js,ts,jsx,tsx,mdx}', './src/components/**/*.{js,ts,jsx,tsx,mdx}', './src/features/**/*.{js,ts,jsx,tsx,mdx}']`. If you create a new top-level directory (e.g., `src/new-feature/`) that uses Tailwind classes, you **must** add its path to this array.
-   **Theming:** The theme is built using CSS variables defined in `src/app/globals.css` (e.g., `hsl(var(--background))`). This allows for dynamic theming (like dark/light mode) and should be the preferred way to manage colors, rather than using hard-coded color classes.
-   **Custom Extensions:** The configuration extends Tailwind's default theme with:
    -   `backgroundImage`: Custom patterns for water and terrain textures.
    -   `fontFamily`: A custom font, `Lilita One`, for body and headline text.
    -   `plugins`: `tailwindcss-animate` is included for keyframe animations.
