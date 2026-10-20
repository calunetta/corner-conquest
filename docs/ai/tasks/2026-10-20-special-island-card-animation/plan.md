# Plan: Card animation when a card is found on a special island

Status: APPROVED
Inputs: triage.md

## Goal and acceptance criteria
- [ ] When the local player's special-island roll draws a card, the card-play overlay plays for that card after the roll dialog closes, for every card including Overcome, War Chief and Decide Dice Roll.
- [ ] The overlay status text reads `You found {card}.` for a found play; `You played {card}.` is unchanged for used plays.
- [ ] Finding a card then using it in the same turn plays twice (no shared dedupe with the use key).
- [ ] No play while the dialog is open (existing `isCardPlayBlocked` gate); no play when no card is drawn (roll miss, hand full, empty deck: `cardDrawn` is null).
- [ ] No GameState, Firestore, reducer or log change. Bought cards unchanged (no animation).
- [ ] Card play sandbox has a "find a card" control; overlay preview has a found state.
- [ ] `docs/architecture/special-cards.md` §6.6 "Card-Play Animation" bullet documents found plays.

## Verified context
| Symbol or file | Location | Why it matters |
|---|---|---|
| `CardPlay { cardName; playId }` | `src/modules/cards/components/CardPlayOverlay/CardPlayOverlay.types.ts:3` | gains optional `isFound` |
| `CardPlayTriggerArgs` | same file, `:36` | gains optional `foundCard` |
| `useCardPlay` / `startPlay(cardName)` | `CardPlayOverlay.hook.ts:14-31` | gains optional 2nd arg `isFound` |
| `useCardPlayTrigger` (queue `CardName[]`, selection effect, start effect) | `CardPlayOverlay.hook.ts:41-85` | queue becomes `QueuedPlay[]`; new `foundCard` effect |
| `NO_PLAY_CARDS`, `findNewCardPlays` | `CardPlayOverlay.map.ts:9`, `:23` | found path never goes through them, so combat cards animate; unchanged |
| `toStatusText(play)` | `CardPlayOverlay.map.ts:16` | found copy |
| `CardPlayOverlayView` uses `toStatusText(play)` | `CardPlayOverlay.tsx:11-14` | no view edit needed |
| `warChiefPlay`, `extraMovePlay` fixtures | `CardPlayOverlay.fixtures.ts:4-5` | add `foundExtraMovePlay` |
| Overlay preview `OverlayDemo` (hardcoded `warChiefPlay`, replay spreads it) | `CardPlayOverlay.preview.tsx:15-33` | parameterize by base play, add state |
| Public API | `src/modules/cards/components/CardPlayOverlay/index.ts`, `src/modules/cards/index.ts:15-21` | no new export needed |
| `isCardPlayBlocked` blocks on `dialogs.specialIslandRoll` via `hasActiveDialogOrPendingAction` | `src/modules/game-board/game-board.map.ts:11` (`specialIslandRoll?.isOpen`), `:21-30` | gate waits for dialog close |
| `SpecialIslandRollDialogState { isOpen, roll, cardDrawn: CardName \| null, x, y } \| null` | `src/lib/types/dialogs.ts:14` | source of `foundCard` |
| `chooseSpecialIslandCard` returns null when hand full or no deck | `src/modules/game-rules/special-island-card.ts:9-16` | `cardDrawn` null means no animation |
| `onRoll` sets `cardDrawn` into the dialog state after the action | `src/features/game/components/GameDialogManager.tsx:136-153` | dialog state is the signal; no edit there |
| Trigger call site | `GameDialogManager.tsx:45-50` | one prop added (legacy wiring) |
| `SET_SPECIAL_ISLAND_ROLL_DIALOG` UI action | `src/modules/game-board/game-board.types.ts:80`, reducer `game-board.reducer.ts:102` | sandbox opens/closes dialog with it |
| `SpecialIslandRollDialog` props `{state, onRoll, onClose}`, exported from `@/modules/cards` | `SpecialIslandRollDialog.types.ts`, `src/modules/cards/index.ts:3` | sandbox renders it |
| Sandbox hook / types / dialogs / tsx | `src/testbed/components/CardPlaySandbox/CardPlaySandbox.hook.ts:15-24`, `.types.ts:22-44`, `CardPlaySandboxDialogs.tsx`, `CardPlaySandbox.tsx:44-80` | add find control |
| Existing tests asserting `play` with `toEqual({cardName, playId})` | `CardPlaySandbox.hook.test.ts:34,60,72,82,130`; `CardPlayOverlay.hook.test.ts:33-35`; `CardPlayOverlay.map.test.ts:37-43` | stay valid: `isFound` is only set (to `true`) on found plays, never `false` |
| max-lines 150 (non-blank, non-comment) | `eslint.config.mjs:70`; hook currently 90 lines | headroom OK |

## Decisions
- Trigger input is `foundCard?: CardName | null`, passed as `dialogs.specialIslandRoll?.cardDrawn ?? null`, because the dialog state already holds the exact card for exactly the local player's own roll (dialog renders only when `isMyTurn`). Rejected: a new log field or GameState flag (cross-client data, out of scope); a `{cardName, key}` object (the effect dep on the card value already fires once per null to card transition, and the dialog goes back to null on close between finds).
- Found effect enqueues unconditionally, with no `queuedKeys` entry, because a found card must not collide with the `${turn}:${card}` use key (find then use same turn plays twice) and has no log entry to dedupe. Rejected: reusing `queuedKeys` (would swallow the later use play).
- Combat cards bypass `NO_PLAY_CARDS` for free: the found path never calls `findNewCardPlays`. Rejected: a flag on `NO_PLAY_CARDS` filtering (extra code).
- `CardPlay.isFound?: true` is optional and only set when found. Rejected: `kind: 'used' | 'found'` required (breaks 8 existing `toEqual` assertions for no gain).
- Start waits for `isCardPlayBlocked` already, so the play begins after the dialog closes. No gate change.
- Hand full or empty deck: `cardDrawn` is null, so no play, matching "no card found".

## File plan
| File | New / Edit | Responsibility | Owner |
|---|---|---|---|
| `src/modules/cards/components/CardPlayOverlay/CardPlayOverlay.types.ts` | edit | `CardPlay.isFound`, `CardPlayTriggerArgs.foundCard`, `QueuedPlay` | implementer-a |
| `src/modules/cards/components/CardPlayOverlay/CardPlayOverlay.map.ts` | edit | `toStatusText` found copy | implementer-a |
| `src/modules/cards/components/CardPlayOverlay/CardPlayOverlay.hook.ts` | edit | `startPlay(cardName, isFound?)`, queue of `QueuedPlay`, found effect | implementer-a |
| `src/modules/cards/components/CardPlayOverlay/CardPlayOverlay.fixtures.ts` | edit | add `foundExtraMovePlay` | implementer-a |
| `src/features/game/components/GameDialogManager.tsx` | edit (legacy wiring, one line) | pass `foundCard` to `useCardPlayTrigger` | implementer-b |
| `src/testbed/components/CardPlaySandbox/CardPlaySandbox.types.ts` | edit | `handleFindCard`, `handleCloseFoundCard` on state | implementer-a |
| `src/testbed/components/CardPlaySandbox/CardPlaySandbox.hook.ts` | edit | implement handlers, pass `foundCard` | implementer-a |
| `src/testbed/components/CardPlaySandbox/CardPlaySandbox.fixtures.ts` | edit | `SANDBOX_FOUND_CARDS` | implementer-a |
| `src/testbed/components/CardPlaySandbox/CardPlaySandboxDialogs.tsx` | edit | render `SpecialIslandRollDialog` | implementer-b |
| `src/testbed/components/CardPlaySandbox/CardPlaySandbox.tsx` | edit | "Special island finds" panel with Find buttons | implementer-b |
| `src/modules/cards/components/CardPlayOverlay/CardPlayOverlay.map.test.ts` | edit | `toStatusText` found cases | tester-a |
| `src/modules/cards/components/CardPlayOverlay/CardPlayOverlay.hook.test.ts` | edit | `startPlay` isFound, `foundCard` trigger cases | tester-a |
| `src/testbed/components/CardPlaySandbox/CardPlaySandbox.hook.test.ts` | edit | find handlers cases | tester-a |
| `src/modules/cards/components/CardPlayOverlay/CardPlayOverlay.test.tsx` | edit | view announces found text | tester-b |
| `src/testbed/components/CardPlaySandbox/CardPlaySandbox.test.tsx` | edit | find flow click-through | tester-b |
| `src/modules/cards/components/CardPlayOverlay/CardPlayOverlay.preview.tsx` | edit | found state | preview-a |
| `docs/architecture/special-cards.md` | edit | §6.6 "Card-Play Animation" bullet | docs-sync |

Not touched: `CardPlayOverlay.tsx`, `index.ts`, `src/modules/cards/index.ts`, reducers, `CLAUDE.md`. Grep: no file or path is moved or deleted.

## Contracts
```ts
// CardPlayOverlay.types.ts
export interface CardPlay {
  cardName: CardName;
  playId: number;
  /** Set to true only for a card found on a special island; absent for a used card. */
  isFound?: true;
}

/** A play waiting for the gate. */
export interface QueuedPlay {
  cardName: CardName;
  isFound?: true;
}

export interface CardPlayTriggerArgs {
  log: GameState['log'];
  localPlayerId: string;
  isBlocked: boolean;
  selectionPlay?: SelectionPlay | null;
  /**
   * Card drawn by the local player's special-island roll (SpecialIslandRollDialogState.cardDrawn).
   * Queues one found play each time it changes to a non-null card. Omit or null for none.
   */
  foundCard?: CardName | null;
}

// CardPlayOverlay.map.ts
export function toStatusText(play: CardPlay | null): string;
// '' for null; play.isFound ? `You found ${play.cardName}.` : `You played ${play.cardName}.`

// CardPlayOverlay.hook.ts
export function useCardPlay(): {
  play: CardPlay | null;
  startPlay: (cardName: CardName, isFound?: true) => void; // sets { cardName, playId } plus isFound: true only when given
  endPlay: () => void;
};
// useCardPlayTrigger signature unchanged: ({ log, localPlayerId, isBlocked, selectionPlay, foundCard }) => { play; endPlay }

// CardPlayOverlay.fixtures.ts
export const foundExtraMovePlay: CardPlay; // { cardName: CardName.ExtraMove, playId: 3, isFound: true }

// CardPlaySandbox.fixtures.ts
export const SANDBOX_FOUND_CARDS: CardName[]; // [CardName.ExtraMove, CardName.WarChief]

// CardPlaySandbox.types.ts: add to CardPlaySandboxState
handleFindCard: (cardName: CardName) => void;   // opens the special-island dialog already rolled with that card
handleCloseFoundCard: () => void;               // closes it (play starts after this)
```

Hook body, in words:
1. `useCardPlay.startPlay = useCallback((cardName, isFound) => { lastPlayId.current += 1; setPlay({ cardName, playId: lastPlayId.current, ...(isFound && { isFound }) }); }, [])`.
2. In `useCardPlayTrigger` change `useState<CardName[]>` to `useState<QueuedPlay[]>`. The log effect enqueues `fresh.map(({ cardName }) => ({ cardName }))`. The selection effect enqueues `{ cardName: selectionCard }`.
3. New effect after the selection effect: `useEffect(() => { if (!foundCard) return; setQueue((current) => [...current, { cardName: foundCard, isFound: true }]); }, [foundCard]);` No `queuedKeys` use.
4. Start effect: `const next = queue[0]; startPlay(next.cardName, next.isFound);` then `setQueue((c) => c.slice(1))`.
5. Update the doc comment above `useCardPlayTrigger` with one sentence on `foundCard`.

Sandbox hook, in words:
- `handleFindCard = useCallback((cardName) => dispatchUi({ type: 'SET_SPECIAL_ISLAND_ROLL_DIALOG', state: { isOpen: true, roll: 6, cardDrawn: cardName, x: 0, y: 0 } }), [])`.
- `handleCloseFoundCard = useCallback(() => dispatchUi({ type: 'SET_SPECIAL_ISLAND_ROLL_DIALOG', state: null }), [])`.
- Pass `foundCard: uiState.dialogs.specialIslandRoll?.cardDrawn ?? null` to `useCardPlayTrigger`.
- Return both handlers.

GameDialogManager edit: add `foundCard: uiState.dialogs.specialIslandRoll?.cardDrawn ?? null,` after `selectionPlay` at `:49`. Nothing else.

Sandbox dialogs: add `{dialogs.specialIslandRoll?.isOpen && (<SpecialIslandRollDialog state={dialogs.specialIslandRoll} onRoll={() => undefined} onClose={state.handleCloseFoundCard} />)}`; import `SpecialIslandRollDialog` from `@/modules/cards`. Dialog shows the rolled state because `roll` is non-null (verified: `isRolled: roll !== null`, `SpecialIslandRollDialog.map.ts:12`).

Sandbox tsx: new `<section className={styles.panel} aria-label="Special island">` titled "Special island finds (always animate)", one `Button variant="outline"` per `SANDBOX_FOUND_CARDS`, label `Find {cardName}`, `onClick={() => state.handleFindCard(cardName)}`. Place after the Combat cards panel. Update `INTRO_BY_VARIANT.desktop` no change. Keep `CardPlaySandbox.tsx` under 150 lines (now 96).

## Phases
### Phase 1: Found-card play
1. Edit `CardPlayOverlay.types.ts` per Contracts (implementer-a).
2. Edit `CardPlayOverlay.map.ts` `toStatusText` (implementer-a).
3. Edit `CardPlayOverlay.hook.ts` per the hook steps (implementer-a).
4. Add `foundExtraMovePlay` fixture (implementer-a).
5. Edit sandbox `.fixtures.ts`, `.types.ts`, `.hook.ts` (implementer-a).
6. Edit `GameDialogManager.tsx` one line (implementer-b).
7. Edit `CardPlaySandboxDialogs.tsx` and `CardPlaySandbox.tsx` (implementer-b).
8. Logic tests (tester-a), then view tests (tester-b). Run `npx jest src/modules/cards src/testbed/components/CardPlaySandbox src/modules/game-board`.
9. Preview state (preview-a): in `CardPlayOverlay.preview.tsx`, make `OverlayDemo` take a `basePlay: CardPlay` prop used for the initial state and in `replay`; keep existing three states passing `warChiefPlay`; add `{ name: 'Found card', render: () => <OverlayDemo basePlay={foundExtraMovePlay} isMobile={false} isReducedMotion={false} /> }`. Sandbox preview needs no edit.
10. docs-sync: edit §6.6 Card-Play Animation bullet in `docs/architecture/special-cards.md`: add that a special-island roll that draws a card (`dialogs.specialIslandRoll.cardDrawn`, set in `GameDialogManager`) is passed as `foundCard`, queues a found play that is exempt from `NO_PLAY_CARDS` and the turn+card dedupe, starts once the roll dialog closes, reads "You found {card}.", is local only, and that bought cards do not animate. Also mention the sandbox "Special island finds" panel.
11. Checks: `npm run typecheck`, `npm run lint`, `npm test`. ui-verify the sandbox at http://localhost:9002/testbed (Find War Chief: overlay plays only after closing the dialog; status text "You found War Chief.").

Model escalation: none beyond triage overrides (all builders already sonnet-5-5).

## Test plan
- tester-a (logic, first):
  - `CardPlayOverlay.map.test.ts`: `toStatusText({cardName: ExtraMove, playId: 1, isFound: true})` is `You found Extra Move.`; found War Chief is `You found War Chief.`; used plays unchanged; input not mutated.
  - `CardPlayOverlay.hook.test.ts` `useCardPlay`: `startPlay(WarChief, true)` gives `{cardName, playId: 1, isFound: true}`; `startPlay(WarChief)` has no `isFound` key.
  - `useCardPlayTrigger` (follow existing helpers in that file): (a) `foundCard` rerendered from null to `Overcome`, `isBlocked` false: play starts with `isFound: true` (combat card not filtered). (b) `isBlocked` true then false: starts only after false. (c) Mount with `foundCard` null and a log containing a local use entry: no play (seeding unchanged). (d) Find `ExtraMove` then, after `endPlay`, a log entry for `ExtraMove` same turn: second play starts and has no `isFound` (no shared key). (e) `foundCard` goes `ExtraMove`, null, `ExtraMove`: two found plays queued in order. (f) `foundCard` null throughout: no play.
  - `CardPlaySandbox.hook.test.ts`: `handleFindCard(WarChief)` sets `uiState.dialogs.specialIslandRoll` open with `cardDrawn` WarChief, `isBlocked` true, `play` null; after `handleCloseFoundCard`, `play` is `{cardName: WarChief, playId: 1, isFound: true}` and `isBlocked` false; game log unchanged.
- tester-b (view):
  - `CardPlayOverlay.test.tsx`: view with `foundExtraMovePlay` has role status text `You found Extra Move.`.
  - `CardPlaySandbox.test.tsx` (existing fake-timer helpers): click `Find War Chief`: dialog open, status empty, `sandbox-gate` blocked; close dialog (Escape or its close control, as the existing tests close dialogs), status `You found War Chief.`, advance 1100 ms, status empty. Then open Cards, use Extra Move: still `You played Extra Move.` (existing tests keep passing).
  - No e2e: no Firestore path changes.

## Preview states
- Card play overlay: Full motion, Reduced motion, Mobile size (existing, `warChiefPlay`), plus Found card (`foundExtraMovePlay`, desktop, full motion).
- Card play sandbox (desktop, mobile): unchanged states; new Find buttons reachable in both.

## Risks
- `isFound` typed `true` not `boolean` so the key is absent on used plays and old `toEqual` assertions pass; builders must not write `isFound: false`.
- Dialog state `cardDrawn` also exists for a rolled miss as null: no play. If the reducer rejects the card server-side while the dialog shows one, the animation still plays; same as the dialog text today, acceptable.
- Remote players never see it: state is local by design.
- Hook file must stay under 150 lines (now 90); lint will tell.

## Review (architect-b)
VERDICT: APPROVED
- Paths and symbols verified (hook lines 14-85, `game-board.map.ts:11,21-30`, `GameDialogManager.tsx:45-50,135-157`, `game-board.reducer.ts:102`, tile-click `:82`). No path moves; nothing to grep.
- Re-roll question (architect-a): every route to a second find passes through `specialIslandRoll` null or `cardDrawn: null`. Opening the dialog (`game-board.tile-click.hook.ts:82`) sets `cardDrawn: null`; `onRoll` runs only from the unrolled Roll button (`SpecialIslandRollDialog.tsx` shows only Close once `roll !== null`); Close and Escape (`onOpenChange={onClose}`) dispatch `state: null`. So the `foundCard` effect dep always sees card to null to card between finds, including the same card twice.
- Queued-while-open question: a found play is enqueued while the dialog is open (state set at `GameDialogManager.tsx:150-153` with `isOpen: true`). `isCardPlayBlocked` is true via `specialIslandRoll?.isOpen` (`game-board.map.ts:11`), so the start effect (`hook.ts:76-80`) waits and fires after Close sets state null.
- Residual, non-blocking: a double-click on Roll during `await onAction` can run `onRoll` twice (pre-existing; it already double-grants). Same card twice gives one play, a different card gives two. Out of scope.

