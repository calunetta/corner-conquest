# Special Card Interactions

Part of the architecture & game-rules docs. Index and directives: [`docs/README.md`](../README.md). Turn structure and combat: [`game-mechanics.md`](game-mechanics.md).

## 6.6. Special Card Interactions
-   **Starting a Match:** In a standard Player-vs-Player match, all players start with **zero** Special Cards. In a Player-vs-Bot match, if `Debug Mode` is enabled, the human player starts with one of every available Special Card.
-   **Hand Limit & Card Acquisition:** A player can hold a maximum of **7** Special Cards. If a player discovers a Special Island or buys a card while their hand is full, they do not receive a new card. If the main deck runs out of cards, the discard pile is shuffled to create a new deck.
-   **Deck Composition (`src/modules/game-rules/card-data.ts`):** `BuyCard`, Special Island discovery, and the Special Island re-roll all draw from the same 19-card weighted deck (`SPECIAL_CARDS`), not an even split of the 13 unique cards. Copy counts: Extra Move ×3; Steal Resource, Reinforce, Wealthy, Productive ×2 each; Efficient, Master Builder, War Chief, Decide Dice Roll, Scout, Overcome, Sabotage, Teleport ×1 each. A separate 13-card unique list (`BASE_CARDS`, one of every card) is used only for Debug Mode's starting hand, never for drawing.
-   **Using a Card:** When a player uses a card, it is removed from their hand and placed in the `discardPile`. The `Use Card` action is consumed for the turn — every card below marks `actionsThisTurn` with `UseCard` once its effect actually completes (not when the card is first activated, for cards with a follow-up step), which is also what blocks using a second card the same turn. Cards relevant to a specific action (e.g., `War Chief` or `Overcome` for combat) appear as mutually exclusive options within that action's dialog.
-   **Canceling a Card:** If a player activates a card like "Extra Move", "Teleport", "Reinforce", "Efficient", or "Master Builder" but chooses not to proceed, they can click "Cancel". This restores the card to their hand, clears active modifiers, and refunds the 'Use Card' action for the turn.

-   **Card Art (`src/modules/cards/card-art.ts`):** `CARD_ART` (typed `Record<CardName, CardArt>`, so a new card fails typecheck until it has art) and `ABILITY_ART` map each card and ability to `{ icon, card }` public paths under `/sprites/cards`: a 128x128 transparent icon and a 400x600 framed portrait with no text (the game draws the name and description). `CardFace` (`src/modules/cards/components/CardFace/`) renders the portrait at size `tile` (80x120), `hero` (200x300) or `hero-compact` (150x225), with a `layers` placeholder if the image fails to load. `CardsDialog` shows each held card as a `CardFace` `tile` with a per-card Use button aria-label.
-   **Card-Play Animation (`CardPlayOverlay`, `src/modules/cards/components/CardPlayOverlay/`):** `GameDialogManager` calls `startPlay(cardName)` from `useCardPlay` when the player presses Use. The state is local, so only the acting player sees it; a new play replaces the current one. The card rises, glows and fades over the board for 1100 ms (opacity-only, 1000 ms, under `prefers-reduced-motion`), is click-through, and is announced through a polite status region. Keyframes live in `tailwind.config.ts`.
-   **Card Icon in the Event Log:** Every log entry that records a card being used (activation, the resolution of a targeted or combat card, Teleport, and the Reinforce/Efficient deploy entries) sets `StructuredLogEntry.cardName` (`src/lib/types/game.ts`). `GameLog` (`GameLog.map.ts`) turns it into `cardIconSrc` from `CARD_ART[cardName].icon` and draws a 20 px icon in the entry's icon slot in place of the category icon. The icon is shown only when the viewer may read the entry (`canViewerReadLogEntry`); a redacted entry shows no card icon, so it never reveals which card was used. Entries without `cardName`, including those from older documents, are unchanged.

-   **Extra Move:**
    1.  **Trigger:** Player uses the card from the `CardsDialog`.
    2.  **Resolution (Shared):** A `GameAction.UseCard` action is dispatched. The card is consumed and the player's `hasExtraMove` flag is set to `true` in `GameState`. No army's `hasActed` flag is changed.
    3.  **Effect & UI Flow:** All actions in the UI remain fully enabled. A prominent glowing banner informs the player that Extra Move is active and prompts them to select a soldier on the map to continue. Can be cancelled before moving.
    4.  **Bonus Action (Shared):** The next Move, Position, or Attack (player or monster) by any army consumes `hasExtraMove` and is allowed even if that army has already acted. The bonus action does not change the army's `hasActed` flag: an army that had not acted keeps its normal action for the turn, and an army that had acted stays acted.

-   **Teleport:**
    1.  **Trigger:** Player uses the card from the `CardsDialog`.
    2.  **UI Flow (Local):** A `pendingAction` of `{ type: 'teleport' }` is set in local state. The `GameBoard` UI indicates that the player must first select an army, and then a destination. Any selected army is deselected. Teleporting directly onto enemy base tiles is prohibited.
    3.  **Input:** Player clicks one of their armies, then clicks *any* non-enemy-base tile on the map.
    4.  **Resolution (Shared):** A `GameAction.Move` action with an `isTeleport: true` flag is dispatched. The `Teleport` card is consumed, the turn's `UseCard` action is marked used, the army is moved, and its `hasActed` flag is set to `true`. This action does not award discovery VP.

-   **Scout:**
    1.  **Trigger:** Player uses the card from the `CardsDialog`.
    2.  **UI Flow (Local):** A `pendingAction` of `{ type: 'scout', count: 3 }` is set in local state. The UI prompts the player to click on 3 hidden tiles.
    3.  **Input:** Player clicks on a hidden tile. A local `GameAction.Scout` is dispatched to reveal it. This is repeated three times.
    4.  **Resolution (Shared):** After the third tile is revealed, a `GameAction.UseCard` action with an `isScout: true` flag is dispatched to consume the card from the player's hand and mark the turn's `UseCard` action used. This action does not award discovery VP.

-   **Sabotage:**
    1.  **Trigger:** Player uses the card from the `CardsDialog`.
    2.  **UI Flow (Local):** A local `SabotageDialog` opens, listing all opponent players.
    3.  **Input:** Player clicks on an opponent's name.
    4.  **Resolution (Shared):** A `GameAction.SabotagePlayer` action is dispatched. The `Sabotage` card is consumed, the turn's `UseCard` action is marked used, and the target player's `isSabotaged` flag is set to `true` in `GameState`.

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
    4.  **Resolution (Shared):** A `GameAction.StealResource` action is dispatched. The `Steal Resource` card is consumed, the turn's `UseCard` action is marked used, and resources (guarded against NaN) are transferred between players in `GameState`.

-   **Wealthy:**
    1.  **Trigger:** Player uses the card from the `CardsDialog`.
    2.  **UI Flow (Local):** A local `WealthyDialog` opens, showing the three resource types.
    3.  **Input:** Player clicks a resource icon.
    4.  **Resolution (Shared):** A `GameAction.GainWealth` action is dispatched. The `Wealthy` card is consumed, the turn's `UseCard` action is marked used, and the player gains 5 of the selected valid resource.

-   **Overcome:**
    1.  **Trigger:** This card is used contextually during combat. It appears as a mutually exclusive checkbox in the `CombatDialog` or `MonsterCombatDialog`.
    2.  **Input:** Player checks the "Use Overcome" box before initiating the roll.
    3.  **Resolution (Shared):** The combat is automatically won by the player. The `Overcome` card is consumed and the turn's `UseCard` action is marked used during the combat resolution action.

-   **War Chief:**
    1.  **Trigger:** Appears as a mutually exclusive checkbox in the combat dialogs.
    2.  **Input:** Player checks the "Use War Chief" box before rolling.
    3.  **Resolution (Shared):** The player's combat score gets a flat +2 added to the dice total for that single combat. It is not extra dice, and it does not change the permanent attack power. The `War Chief` card is consumed and the turn's `UseCard` action is marked used during combat resolution.

-   **Decide Dice Roll:**
    1.  **Trigger:** Appears as a mutually exclusive checkbox and slider in the *monster* combat dialog.
    2.  **Input:** Player checks the box and uses the slider to pick a dice value (1–6).
    3.  **Resolution (Shared):** One of the player's dice rolls is forced to the chosen value. The `Decide Dice Roll` card is consumed and the turn's `UseCard` action is marked used during combat resolution.

-   **Productive:**
    1.  **Trigger:** Passive card. At the start of a player's turn, if they have active resource positions **and still hold the `Productive` card**, the normal automatic collection (§5.3) is skipped entirely and a local `ProductiveCardDialog` opens instead — collection for that turn only happens once the dialog is resolved. If the player has positions but no longer holds the card, automatic collection runs immediately as usual.
    2.  **UI Flow:** The dialog strictly displays resource options where the player currently has positioned collectors (`player.positions`), preventing doubling of un-positioned resources.
    3.  **Input:** Player can select one positioned resource type and click "Collect" (or skip).
    4.  **Resolution (Shared):** A `GameAction.UseProductiveCard` is dispatched. If a valid positioned resource was selected, the `Productive` card is consumed and the turn's `UseCard` action is marked used, and the yield for that resource is doubled. Resources are added to the player's total either way (doubled or not). Every positioned spot the dialog collects from is then cleared, the same as automatic collection (§5.3), so those armies must be re-positioned to collect again.
    5.  **Bots:** A bot's seat never opens the dialog. Its pre-turn card strategy (§6.9) dispatches the same `GameAction.UseProductiveCard` for its own seat, picking Food → Wood → Gold by first positioned resource, or no selection if it has none. The end state matches a human's selection or skip.
