# UI Systems, Bot Logic & Visual Architecture

Part of the architecture & game-rules docs. Index and directives: [`docs/README.md`](../README.md).

## 6.7. UI/UX and Other Interactions

#### **UI Dialogs and Player Scope**
- **Local Dialogs:** Most dialogs for actions (`Sabotage`, `Wealthy`, `Position`, `My Cards`, `Abilities Shop`, `ProductiveCardDialog`, `SpecialIslandRollDialog`) are rendered **only for the current player**. Their open/closed state is managed locally in the `GameBoard` component and is not part of the shared `GameState`.
- **Global Dialogs:** The `CombatDialog` and `MonsterCombatDialog` are exceptions. Their state (`combatState`, `monsterCombatState`) is stored in `GameState` because all players need to see the outcome or have the potential to be involved.

#### **Army and Tile Selection**
- **Manual Selection:** Clicking a tile containing one of your armies selects it. This is a local UI action.
- **Multi-Army Selection:** Clicking a tile with multiple friendly armies opens a local `ArmySelectionDialog` to choose a specific unit.
- **Deselection:** An army can be deselected locally by:
    1.  Clicking the "Deselect Army" button. This is a "hard reset" that clears the selected army and any pending card action.
    2.  Clicking on any tile that is not a valid move for the currently selected army.

## 6.8. Fog of War & Debug Mode

-   **Fog of War (Enabled):** This is the default, tactical experience.
    -   Each player has their own, independent visibility of the map stored in `player.revealedTiles`.
    -   Tiles (and any armies on them) are only revealed to a player when they move one of their armies to an adjacent tile.
    -   Opponent armies are only visible on their starting Base or on personally explored islands.
-   **Fog of War (Disabled):** This mode provides a more open, chess-like experience.
    -   Map visibility is shared. When any player reveals a tile, it becomes visible to *all* players for the rest of the game.
-   **Debug Mode:** This is a special mode intended for testing, which is automatically enabled for "Player vs. Bot" games started from the lobby.
    -   **Complete Map Visibility:** It overrides any Fog of War setting, making the entire map and all armies visible from the start of the match.
    -   **All Special Cards & 20 Starting Resources:** The human player begins the game with one of every available Special Card and **20 Food, 20 Wood, and 20 Gold**, allowing for immediate testing of all strategic and army mechanics.

## 6.9. Bot Logic
The AI behavior is defined in `src/modules/game-rules/bot-turn.reducer.ts` and `services/bot-turn.service.ts`. `decideBotTurn` deep-clones the incoming state (lodash `cloneDeep` — pure, never mutates the caller's object) and runs the three steps below, in that fixed order, before dispatching `EndTurn`:

> [!IMPORTANT]
> **Balance Simulator:** `scripts/balance-simulator/` plays many complete bot-vs-bot matches through this real logic (Firestore stubbed, zero writes) and reports win rates, match length, resource and card economy, combat accuracy, and bot-health signals (does a seat ever leave its own Base, get stuck on Productive, etc.). See `docs/balance-simulator-guide.md` for how to run it and read its report, including its known limitations and the bot quirks it already confirmed.

1.  **Strategic Pre-computation** (`bot-card-strategy.reducer.ts` → `bot-purchases.reducer.ts`):
    - Activates `Reinforce`, `Efficient`, and `MasterBuilder` **unconditionally** whenever held and no card has been used yet this turn — with no check that the bot will actually go on to deploy or upgrade that turn. If it doesn't, the flag simply lapses at the next turn-start reset (§6.1) and the card stays in hand, having used up the turn's one card-action for nothing.
    - `Wealthy`, when held, targets whichever resource the bot is short of, in a fixed priority order: Food (if it can't afford its next deploy and has room for more armies) → else Wood (if it can't afford its upgrade and isn't attack-capped) → else Gold (default).
    - `Sabotage`, when held, **always targets a human opponent, never another bot** — in a multi-bot match, bots never sabotage each other.
    - Purchases run in a fixed order — Ability → Upgrade → Deploy → Buy Card — each re-checking affordability against the state left by the previous purchase in the same turn, so an earlier buy can block a later one.
2.  **Army Action Evaluation & Execution** (`bot-army-actions.reducer.ts`): across all unacted armies on the board, every possible action is scored and the single highest-scoring one executed, repeated until no unacted army has a move left:
    - **Positioning on a resource:** flat priority **9** — the bot's primary way to build its economy.
    - **Attacking a player:** priority **`8 + (bot's attackPower − target's attackPower)`** — relative, not fixed, and has no floor: a bot will pick a fight it's likely to lose if nothing else scores higher that loop.
    - **Attacking a monster:** flat priority **7**, regardless of the monster's level.
    - **Moving onto an unrevealed fog-of-war tile:** priority **6**. **Moving onto an unoccupied resource/Base tile:** priority **4**. **Moving onto a Special island:** priority **3**. Any other move: priority **2**.
    - Any resulting combat (player or monster) is auto-resolved within the same loop — dice rolled with no card options (`useWarChief`/`useOvercome`/`useDecideCard` all `false`), then immediately closed.
3.  **Guaranteed Turn Transition:** the bot calls `handleEndTurn` and the service writes the resulting state to Firestore in a single `setDoc` — **this is a plain write, not a Firestore transaction**: there is no optimistic-concurrency check against the document's current version. If a human action and a bot turn race on the same match document, the later write silently wins and the earlier one is lost; this differs from `handlePlayerExit`, which does use `runTransaction`.

Bots are created at match setup only for a solo-vs-bot lobby game (`maxPlayers === 1`, `game-setup.reducer.ts`). A human seat can also become a bot mid-match when that player leaves a playing match: `handlePlayerExit` sets `isBot: true` and `isVacant: true` on the seat (see §6.12 Match Dismantling Rules), and the session driver's bot-turn effect (`game-board.engine.hook.ts`, see the session driver in §6.14) drives it from then on like any other bot seat.

## 6.10. UI Components and Mobile Responsiveness
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
  - **In-Memory Turn Buffering:** Only while `gameState.status === 'playing'` and it is the local human player's turn (`isMyTurn` in `src/modules/game-board/game-board.engine.hook.ts`, which is `false` during `'waiting'`), all human player actions within the turn (`Move`, `Deploy`, `Upgrade`, `BuyCard`, `UseCard`, `SelectResourcePosition`, `CancelAction`) execute entirely in local client memory (`localGameState`, cloned from `serverGameState` in `src/modules/game-board/game-board.state.hook.ts`), generating **zero Firestore writes** until turn completion. In the pre-game lobby (`'waiting'`) the displayed game state always tracks the live `serverGameState`, so joining players appear on the host's screen immediately.
  - **Atomic Turn Writes:** A single `setDoc` write is dispatched when ending a turn (`handleEndTurn`), keeping total writes per player to ~1 write per round.
  - **Atomic Bot Loops:** AI bot turns execute completely in memory and commit only once per round via a single atomic `setDoc`.
  - **Zero Redundant Reads:** Host cleanup routines for animations and events use in-memory state references (`gameStateRef`) instead of performing `getDoc` calls before updating documents.
  - **Firestore Free Tier Sustainability:** A standard 20-turn match requires only ~20–30 document writes and ~40–60 document reads across all connected clients combined, allowing hundreds of complete multiplayer games per day on Firebase's free quota.

## 6.11. Tutorial System
- **Overview**: The game includes both a skippable tutorial overlay (`TutorialOverlay.tsx`) and contextual help beacons (`TutorialBeacon` / `TutorialBeacon.tsx`) that explain the UI area they sit next to. Together they cover the core loop: Goals, Deploying, Moving & Positioning, Resources & Shop, Combat, and Special Cards.
- **Interactive Info Beacons**: Contextual helper beacons throughout the HUD render high-contrast pixel icons (`/sprites/icon_info.png`) and open informative popovers on click. Current beacons include `map-info`, `player-info`, and `actions-info`.
- **State Management**: The tutorial overlay remembers whether a player has seen it via `localStorage` (`'corner-conquest-tutorial'`), while each beacon stores a separate `beacon-seen-<id>` flag so input stays calm after first open. Players can reopen either flow from the 'Help' button or by clicking a beacon.
- **Maintenance Rule**: Whenever core mechanics, UI layouts, or game rules are added or modified, update the matching tutorial copy or beacon description (or add a new beacon) so the new-player guidance stays accurate.

## 6.12. End-to-End (E2E) Testing & Match Cleanup Lifecycle
- **Firestore and Auth Emulators**: E2E runs never touch the real project. `playwright.config.ts` starts the Firestore and Auth emulators together (`npx firebase emulators:start --only firestore,auth`, both declared in `firebase.json`, project `demo-corner-conquest`). It builds the app with `NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST` and `NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST` (`AUTH_EMULATOR_HOST` = `127.0.0.1:9099`), which makes `src/lib/firebase.ts` connect both SDKs to their emulators. Each run starts with an empty database and no Auth users.
- **Mandatory Teardown Hook (`safeCleanupGame`)**:
  - Every Playwright test suite (`e2e/*.spec.ts`) **MUST** register `safeCleanupGame` inside `test.afterEach(async ({ page }) => { await safeCleanupGame(page); });`.
  - **Guaranteed Cleanup Regardless of Test Outcome:** Even if an assertion throws an error or times out midway through test execution, `test.afterEach` is guaranteed to execute, dismissing any open modals and clicking the GameBoard exit button to dismantle the match.
- **Match Dismantling Rules (`handlePlayerExit` in `src/modules/game-rules/services/player-exit.service.ts`)**:
  - **Leaving a Match In Progress (`status === 'playing'`):** Triggered by an explicit exit, or by the staleness check in §6.14. The leaving player's seat is never removed. It is converted in place to a bot (`isBot: true`, `isVacant: true`), keeping its index, armies, resources and board state. A log entry records the takeover, and if it was that seat's turn, `handleEndTurn` runs. Player indices, `baseTiles`, `map` references and `combatState`/`monsterCombatState` are not renumbered.
  - **Already-Bot Seat:** Calling `handlePlayerExit` for a seat that is already a bot is a no-op, so a repeated exit cannot convert the same seat twice.
  - **No Human Players Remaining:** If no real (non-bot) players remain in a match in progress, the game room is deleted immediately (`transaction.delete(gameDocRef)`), so no all-bot match is left behind.
  - **Leaving a Pre-Game Lobby (`status === 'waiting'`):** The room is deleted if no real players remain, or if the host leaves while they are the only player. Otherwise the player is removed: the seat is spliced out, the remaining `players` ids are renumbered 0..n-1, and `baseTiles`, map occupants/`positionedBy`, `combatState` and `monsterCombatState` references are shifted to match. If the leaving player was the current player, the turn ends.
  - **Writes:** Both paths run in one `runTransaction` on the match document.
- **Lobby Hygiene:** Adhering to these rules prevents test runs and player abandonments from cluttering Firestore and ensures the game lobby only ever lists active, joinable rooms.

## 6.13. Island Tile Visual Layout & Animated Sprite Architecture
- **Shared Slot Table (`src/modules/map/island-tile-slots.types.ts`)**:
  - Every sprite-placement coordinate on an island tile lives in this one file: resource node slots (`SINGLE_RESOURCE_SLOT`, `DUAL_RESOURCE_SLOTS`, `TRIPLE_RESOURCE_SLOTS`, `BASE_RESOURCE_SLOTS`), forest tree slots (`BASE_FOREST_SLOTS`, `SPECIAL_FOREST_SLOT`, `EMPTY_GROVE_SLOTS`), and the boat/occupant corner anchors (`BOAT_CORNER_POSITIONS`, `CORNER_TRANSFORMS`).
  - `TileResources.map.ts`, `TileForest.map.ts`, `TileBoats.map.ts` and `TileOccupants.hook.ts` read these tables and define no slot or corner literals of their own. Each component keeps only its selection logic (for example `getSlot` in `TileResources.map.ts`).
  - All percentages are of the tile's own side length. A non-corner slot must clear the 0–22% and 78–100% bands on at least one axis for every corner it is near: 22% is the boat's 21% half-box plus a 1-point gap.
- **Deterministic Tree Forests (`TileForest.tsx`)**:
  - Small forests of 2–3 trees of **strictly identical type** (`pine_tree.gif`, `spring_tree.gif`, `autmn_tree.gif`, `tree.gif`) are rendered on Base islands (upper-left cluster, kept clear of the boat's top-left corner anchor and the top base resource slot) and empty islands (dedicated natural clearing; trees 1 and 2 are inset 24% from their side edge, tree 3 sits at bottom 26% / left 44%).
  - The tree type is deterministically hashed from island coordinates (`island.x * 7 + island.y * 13 + (isBase ? 3 : 0)`), ensuring 100% visual consistency across clients.
  - **Resource Island Forest Suppression Rule:** On `IslandType.Resource` islands, decorative trees are completely suppressed so commanders only see genuine resource nodes and never confuse background trees with wood nodes.
- **Animated Resource Representations (`TileResources.tsx`)**:
  - Replaces vector icons with rich animated pixel art sprites positioned at elevated layer `z-35`:
    - **Wheat / Food:** Grazing livestock pasture (`/sprites/sheep.gif`, dialog/HUD icons: `/sprites/icon_meat.png` / `/sprites/meat.png`).
    - **Iron / Wood:** Timber forest (`/sprites/tree.gif`, dialog/HUD icons: `/sprites/icon_wood.png` / `/sprites/wood.png`).
    - **Gems / Gold:** Gold mine (`/sprites/mine.png` idle, `/sprites/mine_active.png` when farmed, dialog/HUD icons: `/sprites/icon_gold.png` / `/sprites/gold.gif`).
  - **Deterministic Node Placement (`TileResources.map.ts`):** Resource nodes sit in three vertical bands (top 20%, middle 46%, bottom 70%). A single node is centred in the middle band; two nodes take the top-left and bottom-right slots, inset 24% from their side edge; three nodes take the top-left, middle-right and bottom-left slots, with the top-left slot inset 24%. The layout is a pure function of the node index, so it is identical on every client.
  - **Individual Multi-Sprite Rendering (No x2 Badges):** Islands with multiple resources of the same type render distinct individual animated sprites side-by-side (e.g. 2 sheep, 2 trees, 2 mines) instead of number badges.
- **Active Collector Farming:** A collector (`/sprites/farm_${player.color}.gif`) assigned to a resource node is drawn as a badge beside that node, not on top of it. The badge is 55% of the node's reference size, floored at 22px, and sits to the right of the node, or to its left when the node is anchored to the right edge (`FarmingCollectorViewModel.side`/`offset`, set in `toTileResourcesViewModel` in `TileResources.map.ts`). The soldier remains stationed on the island.
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
  - When an army is occupying an island without being positioned on a resource, an idle faction collector (`/sprites/collector_${player.color}_idle.gif`) waits docked at the shoreline boat. Player Base tiles start with the owner's boat anchored in the water canal and idle collector. The base boat is not a permanent fixture: it is drawn only while one of the owner's armies is physically on the Base tile (`toTileBoatsViewModel` in `TileBoats.map.ts`), so it disappears once the owner's last army leaves.
  - When an army is landed on an island, their boat docks at the first available corner on that tile. Multiple players or armies occupying the same island receive separate corners without visual collision.
- **Perimeter Map Clouds & Atmosphere (`MapDecorations.tsx`)**:
  - Outer ocean margins surrounding the playable board are decorated with fixed atmospheric cloud formations (`/sprites/cloud_small.png`, `/sprites/cloud_medium.png`, `/sprites/cloud_big.png`) along margins and outer corners, framing uncharted waters.
- **Rebalanced Base Tile Layout (`IslandTile.tsx`)**:
  - Base castles (`/sprites/castle_{color}.png`) are sized to 44% of the base content box, floored at 18px (`IslandTile.tsx`), creating a balanced landscape that cleanly accommodates the castle, tree forest, base resource nodes, idle collectors, and, while an army of the owner is stationed there, the anchored shoreline boat.

## 6.14. Disconnect Detection & Seat Takeover
- **Heartbeat (`useHeartbeat`, `game-board.heartbeat.hook.ts`)**: While a match is `playing`, each client whose local player is a human (not a bot) writes `players[seat].lastSeenAt = Date.now()` immediately on start and then every **15 s** (`HEARTBEAT_INTERVAL_MS`). The write is `writeHeartbeat` in `services/game-board.engine.service.ts`: a `runTransaction` that re-reads the match document, stamps the one seat, and writes the document back, so a concurrent heartbeat from another seat is not lost. A failed heartbeat is logged to the console and retried on the next tick; it shows no toast.
- **Staleness Check (`useStalenessCheck`, `game-board.staleness.hook.ts`)**: While a match is `playing`, **every** connected client runs the check every **20 s** (`STALENESS_CHECK_INTERVAL_MS`) on the latest snapshot. Any seat that is not a bot, is not the client's own player, and has a non-null `lastSeenAt` older than **45 s** (`STALE_THRESHOLD_MS`) is converted with `handlePlayerExit` (§6.12). A seat whose `lastSeenAt` is still `null` (no heartbeat yet) is never converted by this check.
- **Detection Window:** A client that drops silently (closed tab, lost network, no `beforeunload`) is therefore converted to a bot between 45 s and 65 s after its last heartbeat, whichever check tick first sees it stale.
- **No Elected Driver for Conversion:** The staleness check does not depend on a single host or driver, because the driver can be the seat that went dark. Two clients converting the same seat is harmless: each conversion is a transaction, and an already-bot seat is a no-op (§6.12).
- **Converted Seats:** The takeover sets `isBot: true`, `isVacant: true` and `lastSeenAt: null` on the seat (`convertSeatToBot` in `src/modules/game-rules/services/player-exit.service.ts`), so a converted seat stops being checked and stops heartbeating.
- **Seat Reclaim (`handleSeatReclaim`, `src/modules/game-rules/services/player-reclaim.service.ts`)**: A player whose seat was converted can take it back. The call is one `runTransaction` that finds the caller's seat by `playerId` with `isVacant: true`. If there is none, it resolves `false` and writes nothing. If the seat is not the current player (`currentPlayerIndex`), it sets `isBot: false` and `isVacant: false` immediately. If it is that seat's turn, it sets `reclaimRequested: true` and the bot keeps the turn. Reclaim does not touch `lastSeenAt`, which stays `null` until the reclaimed client's heartbeat starts when the board mounts.
- **Deferred Reclaim (`applyDeferredReclaim`, `src/modules/game-rules/player-turn.reducer.ts`)**: `handleEndTurn` applies a pending `reclaimRequested` to the outgoing player just before turn rotation, so the seat flips exactly when its bot turn ends, never mid-turn. It logs `<name> has reclaimed their seat.` Until then the seat stays vacant and bot-controlled.
- **Lobby Restriction (`subscribeToVacantSeat`, `src/modules/lobby/services/lobby.service.ts`; `RejoinMatchPanel`)**: While the signed-in player holds a vacant seat in a `playing` match, the lobby (`Lobby.tsx`) renders `RejoinMatchPanel` in place of the create/join UI. The open-rooms list is not rendered, and `CreateGameDialog` is forced closed (`open={isCreateDialogOpen && !vacantMatch}`). The panel's Resume button calls `handleSeatReclaim`: on `true` the lobby opens that match, on `false` or error it shows a "Could Not Rejoin" toast. A deferred reclaim also returns `true`, so the player enters the match while the bot still holds the current turn. The restriction lifts once the seat is no longer vacant.
- **Session Driver (`isSessionDriver`, `game-board.engine.hook.ts`)**: The single client that performs the bot-turn trigger and death-animation clearing is the one holding the lowest seat id among non-bot players. The returned `isHost` value (seat `0`) is unchanged for other consumers. The driver is not `isHost` because seat 0 can be a bot mid-match, and a host-gated effect would never fire once the host is the one who disconnected. These effects use a single driver because their Firestore writes are not transactional.
- **Scope:** Heartbeats and staleness checks run only while `status === 'playing'`. The pre-game lobby has no heartbeats and no takeover.
