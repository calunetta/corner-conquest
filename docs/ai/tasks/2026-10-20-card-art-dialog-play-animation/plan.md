# Plan: Card art in CardsDialog, card-play animation, card icons in the game log

Status: APPROVED
Inputs: triage.md, ui-design.md (Final spec)

## Goal and acceptance criteria
Final-spec criteria in `ui-design.md` apply verbatim. Mapped to phases:
- [ ] P1: CardsDialog shows framed art 80x120 (2:3) per card, no zap icon; name + `x{n}` on one row; description; Use only for `USABLE_CARDS`, `aria-label="Use {name}"`, `h-9`; art error placeholder with `layers` icon.
- [ ] P1: Testbed previews: `CardFace` all 13 cards x 3 sizes, CardsDialog (existing 4 states keep their indexes).
- [ ] P2: Use closes dialog and mounts overlay (same tick); gone at 1100 ms (full) / 1000 ms (reduced); root `pointer-events-none`, `z-40`; card 150 px wide at mobile, 200 px desktop; persistent status region with `You played {name}.`; only the acting client mounts it.
- [ ] P2: Reduced motion: opacity-only animation, no transform class.
- [ ] P3: card-use log entries carry `cardName`; GameLog shows `CARD_ART[name].icon` at `h-4 w-4` only when viewer passes `canViewerReadLogEntry`; otherwise category icon; legacy strings unchanged.
- [ ] P3: docs updated; no game rule changed.

## Verified context
| Symbol or file | Location | Why it matters |
|---|---|---|
| `CARD_ART`, `ABILITY_ART`, `CardArt` | `src/modules/cards/card-art.ts:15`, `:22`; exported `src/modules/cards/index.ts:8-9` (uncommitted, exists) | `CARD_ART[cardName].card` = 400x600 PNG, `.icon` = 128 PNG. Typed `Record<CardName, CardArt>`: every card has art. Phase 1 commit includes it. |
| `CardsDialog` view | `src/modules/cards/components/CardsDialog/CardsDialog.tsx:20-89` | Pure props view (`player, onClose, onUseCard, canUseCards`). Zap icon at line 47. 89 lines now. |
| `CardsDialog.styles.ts` | `.../CardsDialog.styles.ts:1-30` | `zapIcon` (l.16), `cardHeader`, `cardTitleRow`, `badgeRow`, `useButton` (`h-7`, l.21), `cardContent` get replaced. |
| `toCardsDialogViewModel` | `.../CardsDialog.map.ts:9-27` | Builds `SpecialCardViewModel {name,count,description,isUsable}`; add `useLabel`. |
| CardsDialog tests | `.../CardsDialog.test.tsx:36,44,59,68` use `getByRole('button', {name: /use/i})`; `getByText(CardName.X)` | Must keep passing: `aria-label="Use X"` matches `/use/i`; alt is `""`, so names are not duplicated as text. `CardsDialog.preview.test.tsx` uses `states[0..3]` indexes: do not reorder. |
| `cardsDialogPreview` | `.../CardsDialog.preview.tsx:30`; registered `src/testbed/registry.ts:91` | `ComponentPreview { slug, title, group, states[{name, render}] }`. |
| `GameDialogManager` onUseCard | `src/features/game/components/GameDialogManager.tsx:277-286` (legacy, 289 lines) | `dispatch TOGGLE_CARDS_DIALOG` then `onLocalAction(GameAction.local_UseCard, {cardName})`. Only wiring point; `GameDialogManager` is always mounted in `GameBoardContent` (`GameBoard.tsx:83`). |
| `handleUseCard` (card actions) | `src/modules/game-board/game-board.card-actions.hook.ts:42-101` | Runs the rule. Not changed. Throws toast on failure; the overlay still plays (accepted: the Use button is disabled when use is illegal). |
| `gameBoardReducer`, `RESET_TURN_UI` | `src/modules/game-board/game-board.reducer.ts:8`, `:~150` resets to `initialUIState` | Reason overlay state is NOT put in `uiState` (a turn reset would cut it). |
| `useIsMobile` | `src/modules/shared/use-is-mobile.ts:5`, exported `src/modules/shared/index.ts:5` | `window.innerWidth < 768`. |
| `RegistryIcon` | `src/modules/shared/registry-icon.tsx:15` | `id="layers"` for placeholder. |
| `StructuredLogEntry` | `src/lib/types/game.ts:46-72`; imports `CardName` from `./cards` at l.1 | Add optional `cardName?: CardName`. |
| `pushLogEntry`, `LogEntryInput = Omit<StructuredLogEntry,'kind'|'turn'>` | `src/modules/game-rules/log-entry.ts:3-8` | `cardName` flows through with no change to this file. |
| `canViewerReadLogEntry` | `src/modules/game-rules/log-visibility.ts:13` | Used by `GameLog.hook.ts:11-13`; passed as `canRead` into `toLogEntryViewModels` (`GameLog.map.ts:17-21`). Redaction is decided in the map. |
| GameLog files | `src/modules/hud/components/GameLog/` `GameLog.tsx` (`EntryIcon` l.26-34), `.map.ts`, `.types.ts` (`LogEntryViewModel`), `.styles.ts` (`entryIcon` l.37), `.fixtures.ts` (`toFixture` l.10-21), `.preview.tsx` | Phase 3 edit targets. |
| Card-use log pushes | `card-effects.reducer.ts:24,30,37,94`; `card-targeted-effects.reducer.ts:16,42,77,85`; `combat-monster-roll.reducer.ts:56,75,89`; `player-actions.reducer.ts:50,61`; `movement.reducer.ts:68` | Phase 3 sets `cardName`. Buy/found (`card-acquisition.reducer.ts:59,137`) are NOT uses and already `visibility: owner`: no `cardName`. |
| Tailwind keyframes | `tailwind.config.ts:81-120` (`keyframes`, `animation`) | Add card-play keyframes here. |
| `jest.setup.js:32-45` | stubs `window.matchMedia` with `matches:false` | Hooks may call `matchMedia` in tests; reduced-motion tests override it. |
| `IslandTile.hook.ts:8` | `REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'` | Existing precedent for the query string; no shared hook exists. |
| Z layers | `alert-dialog.tsx:21,39` use `z-50`; HUD `z-20`/`z-30` (`GameBoard.tsx:45`) | Overlay `z-40`. |
| Docs | `docs/architecture/systems-and-visuals.md:101` (log visibility), `:153` (resource-gain animation) | docs-sync targets. |

## Decisions
- `CardFace` is one pure view in its own folder; hover lift lives in the `tile` size variant only; sizes `tile` 80x120, `hero` 200x300, `hero-compact` 150x225. Dimensions come from one map function used for both `next/image` width/height and the wrapper `style` (runtime numbers allowed in `style`). Rejected: Tailwind size classes plus separate numbers (numbers duplicated).
- Image failure state lives in a `useCardFace` hook (`failedSrc` state compared to current `src`, so changing the card resets it without an effect). Rejected: effect that resets on prop change.
- Overlay state lives in a `useCardPlay()` hook (`useState` + ref counter) called from `GameDialogManager`, not in `uiState`, because `RESET_TURN_UI` replaces the whole `uiState` and the overlay is purely transient. Rejected: new `SET_CARD_PLAY` reducer action (reset hazard, touches reducer, types and `GameBoardContext` re-exports).
- `CardPlayOverlay` = connected component (hook reads viewport and `matchMedia`); `CardPlayOverlayView` pure with `isMobile`, `isReducedMotion` props so previews/tests show both modes. Rejected: `motion-reduce:` variants only (not testable in jsdom, duration for unmount would still need JS).
- Animation via CSS keyframes in `tailwind.config.ts` (`card-play` 1100 ms, `card-play-vignette` 1100 ms, `card-play-fade` 1000 ms); unmount via `setTimeout` in the hook with the same duration constants from `CardPlayOverlay.map.ts`. Rejected: JS frame-by-frame phases (more code), new animation library.
- Restart: overlay animated wrapper gets `key={play.playId}`; the timer effect depends on `playId`, so a new play clears the old timer.
- Persistent status region: `CardPlayOverlayView` always renders the root and `<span role="status" aria-live="polite" className="sr-only">`; its text is `''` when `play` is null. The root and region stay mounted for the life of `GameDialogManager`.
- Log: add `cardName?: CardName` to `StructuredLogEntry` (additive, optional, no migration). Old documents lack it and fall back to the category icon. Redaction: card-use entries are public; the gate is still `canRead` in `toLogEntryViewModels`, which resolves `cardIconSrc` only when `canRead(entry)` is true. Rejected: new `cardIconSrc` stored in the document (static path in state), looking up `CARD_ART` in the view (view would need the gate).
- `GameLog.map.ts` imports `CARD_ART` via `@/modules/cards` (public index, allowed by the boundary rule; cards does not import hud). Rejected: copying paths.
- No `cardName` on buy/found/draw entries or on the Extra Move movement line (`movement.reducer.ts:113`): the user asked for card-use entries; the icon appears on the activation/consumption line of each use. Reinforce and Efficient log twice (activation at `card-effects.reducer.ts:24`, deploy at `player-actions.reducer.ts:50,61`) and both lines carry the icon, accepted.
- No `NameView` for `CardsDialog` or `CardFace`: they take props only.
- docs-sync runs once in phase 3 and documents all three phases (UI-only for 1-2, log shape for 3).

## File plan
| File | New / Edit | Responsibility | Owner |
|---|---|---|---|
| `src/modules/cards/components/CardFace/CardFace.types.ts` | new | `CardFaceSize`, `CardFaceProps`, `CardFaceViewModel` | implementer-a |
| `src/modules/cards/components/CardFace/CardFace.map.ts` | new | `toCardFaceDimensions(size)` | implementer-a |
| `src/modules/cards/components/CardFace/CardFace.hook.ts` | new | `useCardFace(cardName)`: art src + failure state | implementer-a |
| `src/modules/cards/components/CardFace/CardFace.styles.ts` | new | cva classes | implementer-b |
| `src/modules/cards/components/CardFace/CardFace.tsx` | new | framed art view + placeholder | implementer-b |
| `src/modules/cards/components/CardFace/index.ts` | new | public API | implementer-a |
| `src/modules/cards/components/CardFace/CardFace.map.test.ts` | new | dimension tests | tester-a |
| `src/modules/cards/components/CardFace/CardFace.hook.test.ts` | new | hook tests | tester-a |
| `src/modules/cards/components/CardFace/CardFace.test.tsx` | new | view tests | tester-b |
| `src/modules/cards/components/CardFace/CardFace.preview.tsx` | new | testbed states | preview-a |
| `src/modules/cards/components/CardsDialog/CardsDialog.types.ts` | edit | add `useLabel` to `SpecialCardViewModel` | implementer-a |
| `src/modules/cards/components/CardsDialog/CardsDialog.map.ts` | edit | set `useLabel` | implementer-a |
| `src/modules/cards/components/CardsDialog/CardsDialog.map.test.ts` | edit | `useLabel` case | tester-a |
| `src/modules/cards/components/CardsDialog/CardsDialog.styles.ts` | edit | tile layout classes, drop `zapIcon`/`cardHeader`/`cardTitleRow`/`badgeRow`/`cardContent` | implementer-b |
| `src/modules/cards/components/CardsDialog/CardsDialog.tsx` | edit | render tile with `CardFace` | implementer-b |
| `src/modules/cards/components/CardsDialog/CardsDialog.test.tsx` | edit | art, aria-label, no zap | tester-b |
| `src/modules/cards/components/CardsDialog/CardsDialog.fixtures.ts` | edit | add `playerWithManyCards` fixture | implementer-a |
| `src/modules/cards/components/CardsDialog/CardsDialog.preview.tsx` | edit | append state "Many cards (scroll)" at index 4 | preview-a |
| `src/modules/cards/index.ts` | edit | export `CardFace`, `CardPlayOverlay`, `useCardPlay` and their types | implementer-a |
| `src/modules/cards/components/CardPlayOverlay/CardPlayOverlay.types.ts` | new | `CardPlay`, props, view model | implementer-a |
| `src/modules/cards/components/CardPlayOverlay/CardPlayOverlay.map.ts` | new | durations, `toPlayDurationMs`, `toStatusText` | implementer-a |
| `src/modules/cards/components/CardPlayOverlay/CardPlayOverlay.hook.ts` | new | `useCardPlay`, `useCardPlayOverlay` | implementer-a |
| `src/modules/cards/components/CardPlayOverlay/CardPlayOverlay.fixtures.ts` | new | `CardPlay` samples | implementer-a |
| `src/modules/cards/components/CardPlayOverlay/CardPlayOverlay.styles.ts` | new | overlay classes | implementer-b |
| `src/modules/cards/components/CardPlayOverlay/CardPlayOverlay.tsx` | new | `CardPlayOverlayView` + `CardPlayOverlay` | implementer-b |
| `src/modules/cards/components/CardPlayOverlay/index.ts` | new | public API | implementer-a |
| `src/modules/cards/components/CardPlayOverlay/CardPlayOverlay.map.test.ts` | new | map tests | tester-a |
| `src/modules/cards/components/CardPlayOverlay/CardPlayOverlay.hook.test.ts` | new | hook tests (fake timers) | tester-a |
| `src/modules/cards/components/CardPlayOverlay/CardPlayOverlay.test.tsx` | new | view tests | tester-b |
| `src/modules/cards/components/CardPlayOverlay/CardPlayOverlay.preview.tsx` | new | testbed states with replay | preview-a |
| `tailwind.config.ts` | edit | keyframes + animation entries | implementer-b |
| `src/features/game/components/GameDialogManager.tsx` | edit (legacy wiring) | call `useCardPlay`, `startPlay` in `onUseCard`, render `<CardPlayOverlay>` | implementer-b |
| `src/testbed/registry.ts` | edit | import and register `cardFacePreview`, `cardPlayOverlayPreview` | preview-a |
| `src/lib/types/game.ts` | edit | `StructuredLogEntry.cardName?: CardName` | implementer-a |
| `src/modules/game-rules/card-effects.reducer.ts` | edit | `cardName` on 4 pushes | implementer-a |
| `src/modules/game-rules/card-targeted-effects.reducer.ts` | edit | `cardName` on 4 pushes | implementer-a |
| `src/modules/game-rules/combat-monster-roll.reducer.ts` | edit | `cardName` on 3 pushes | implementer-a |
| `src/modules/game-rules/player-actions.reducer.ts` | edit | `cardName` on 2 pushes (Efficient, Reinforce) | implementer-a |
| `src/modules/game-rules/movement.reducer.ts` | edit | `cardName` on teleport push | implementer-a |
| `src/modules/game-rules/card-effects.reducer.test.ts`, `card-targeted-effects.reducer.test.ts`, `combat-monster-roll.reducer.test.ts`, `player-actions.reducer.test.ts`, `movement.reducer.test.ts` | edit | assert `cardName`; fix any exact `toEqual` on log entries | tester-a |
| `src/modules/hud/components/GameLog/GameLog.types.ts` | edit | `cardIconSrc?: string` on `LogEntryViewModel` | implementer-a |
| `src/modules/hud/components/GameLog/GameLog.map.ts` | edit | resolve `cardIconSrc` behind `canRead` | implementer-a |
| `src/modules/hud/components/GameLog/GameLog.fixtures.ts` | edit | add `cardUseLog` | implementer-a |
| `src/modules/hud/components/GameLog/GameLog.styles.ts` | edit | `cardIcon` class | implementer-b |
| `src/modules/hud/components/GameLog/GameLog.tsx` | edit | `EntryIcon` shows card icon | implementer-b |
| `src/modules/hud/components/GameLog/GameLog.map.test.ts` | edit | cardIconSrc cases | tester-a |
| `src/modules/hud/components/GameLog/GameLog.test.tsx` | edit | card icon render cases | tester-b |
| `src/modules/hud/components/GameLog/GameLog.preview.tsx` | edit | append states "Card uses", "Card use, redacted" | preview-a |
| `docs/architecture/systems-and-visuals.md` | edit | log `cardName`, CardsDialog art, play overlay | docs-sync |

`CLAUDE.md`: no edit. `eslint.config.mjs`: no change; all new files are under `src/modules` (150-line limit applies). Legacy `GameDialogManager.tsx` is under `LEGACY_PATHS`; keep the edit to about 10 lines.

## Contracts
```ts
// ===== Phase 1 =====

// src/modules/cards/components/CardFace/CardFace.types.ts
import type { CardName } from '@/lib/types';

export type CardFaceSize = 'tile' | 'hero' | 'hero-compact';

export interface CardFaceProps {
  cardName: CardName;
  size: CardFaceSize;
  /** Default "" (decorative: a visible name is always adjacent). Pass text for standalone use. */
  alt?: string;
  className?: string;
}

export interface CardFaceViewModel {
  /** `CARD_ART[cardName].card` */
  src: string;
  /** true after the image fired onError for the current `src` */
  hasFailed: boolean;
  onError: () => void;
}

// src/modules/cards/components/CardFace/CardFace.map.ts
export function toCardFaceDimensions(size: CardFaceSize): { width: number; height: number };
// tile -> 80x120, hero -> 200x300, hero-compact -> 150x225 (always 2:3)

// src/modules/cards/components/CardFace/CardFace.hook.ts
export function useCardFace(cardName: CardName): CardFaceViewModel;

// src/modules/cards/components/CardFace/CardFace.tsx
export function CardFace(props: CardFaceProps): JSX.Element;
// Wrapper <div style={{width,height}} className={styles.root({size})}>:
//   hasFailed ? <div className={styles.placeholder}><RegistryIcon id="layers" className={styles.placeholderIcon} /></div>
//             : <Image src alt={alt ?? ''} width height className={styles.image} onError={onError} />
// Root has data-testid="card-face" and data-card={cardName}.

// src/modules/cards/components/CardFace/CardFace.styles.ts
export const styles: {
  root: (opts: { size: CardFaceSize }) => string;   // cva; tile variant adds hover:scale-105 transition-transform duration-150 motion-reduce:transform-none
  image: string;                                    // 'h-full w-full rounded-lg object-contain drop-shadow-lg select-none'
  placeholder: string;                              // 'flex h-full w-full items-center justify-center rounded-lg bg-muted/40'
  placeholderIcon: string;                          // 'h-6 w-6 text-muted-foreground'
};

// src/modules/cards/components/CardFace/index.ts
export { CardFace } from './CardFace';
export type { CardFaceProps, CardFaceSize } from './CardFace.types';

// CardsDialog.types.ts: SpecialCardViewModel gains
//   useLabel: string;   // `Use ${name}`

// CardsDialog.styles.ts additions (all other keys unchanged; remove zapIcon, cardHeader, cardTitleRow, badgeRow, cardContent)
//   card:        keep existing string
//   tile:        'flex gap-3 p-3'
//   tileBody:    'flex min-w-0 flex-1 flex-col gap-1.5'
//   nameRow:     'flex items-center justify-between gap-2'
//   cardTitle:   keep ('text-sm font-bold text-foreground truncate')
//   countBadge:  keep
//   descriptionText: keep
//   useButton:   existing string with 'h-7' replaced by 'h-9'
//   useRow:      'mt-auto pt-1'
// Grid stays 'grid grid-cols-1 gap-3 sm:grid-cols-2'.
// CardsDialog.tsx per card:
//   <Card key className={styles.card}><div className={styles.tile}>
//     <CardFace cardName={card.name} size="tile" />
//     <div className={styles.tileBody}>
//       <div className={styles.nameRow}><CardTitle className={styles.cardTitle}>{card.name}</CardTitle><Badge ...>x{card.count}</Badge></div>
//       <p className={styles.descriptionText}>{card.description}</p>
//       {card.isUsable && <div className={styles.useRow}><Button size="sm" aria-label={card.useLabel} ...>Use</Button></div>}
//     </div></div></Card>
// Remove the imports CardContent, CardHeader (keep Card, CardTitle). `RegistryIcon` stays (sparkles, play, shield).

// src/modules/cards/components/CardsDialog/CardsDialog.fixtures.ts addition
export const playerWithManyCards: Player; // specialCards: all of StealResource, Sabotage, Overcome, WarChief, ExtraMove, Wealthy (one each)

// ===== Phase 2 =====

// src/modules/cards/components/CardPlayOverlay/CardPlayOverlay.types.ts
import type { CardName } from '@/lib/types';

export interface CardPlay {
  cardName: CardName;
  /** Increments on every start; React key and timer dependency. */
  playId: number;
}

export interface CardPlayOverlayProps {
  play: CardPlay | null;
  /** Called once, after the animation duration, unless `play` changes first. */
  onFinished: () => void;
}

export interface CardPlayOverlayViewProps {
  play: CardPlay | null;
  isMobile: boolean;
  isReducedMotion: boolean;
}

// src/modules/cards/components/CardPlayOverlay/CardPlayOverlay.map.ts
export const CARD_PLAY_DURATION_MS = 1100;
export const CARD_PLAY_REDUCED_DURATION_MS = 1000;
export function toPlayDurationMs(isReducedMotion: boolean): number;
export function toStatusText(play: CardPlay | null): string; // `You played ${cardName}.` or ''

// src/modules/cards/components/CardPlayOverlay/CardPlayOverlay.hook.ts
export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'; // not exported from the index
/** Local-only state owner. startPlay replaces any current play (new playId). */
export function useCardPlay(): { play: CardPlay | null; startPlay: (cardName: CardName) => void; endPlay: () => void };
/** isMobile from useIsMobile(); isReducedMotion from matchMedia (false when matchMedia is absent);
 *  `const playId = play?.playId;` effect on [playId, isReducedMotion, onFinished] (lint: exhaustive-deps is a zero-warning rule; `onFinished` is the stable `endPlay`):
 *  if playId !== undefined, setTimeout(onFinished, toPlayDurationMs(isReducedMotion)); cleanup clears it. */
export function useCardPlayOverlay(props: CardPlayOverlayProps): CardPlayOverlayViewProps;

// src/modules/cards/components/CardPlayOverlay/CardPlayOverlay.tsx
export function CardPlayOverlayView(props: CardPlayOverlayViewProps): JSX.Element;
export function CardPlayOverlay(props: CardPlayOverlayProps): JSX.Element; // <CardPlayOverlayView {...useCardPlayOverlay(props)} />
// View DOM:
//  <div data-testid="card-play-overlay" className={styles.root}>              // fixed inset-0 z-40 pointer-events-none flex items-center justify-center
//    <span role="status" aria-live="polite" className="sr-only">{toStatusText(play)}</span>
//    {play && <>
//      <div aria-hidden className={styles.vignette({ isReducedMotion })} />
//      <div key={play.playId} aria-hidden data-testid="card-play-stage" className={styles.stage({ isReducedMotion })}>
//        <CardFace cardName={play.cardName} size={isMobile ? 'hero-compact' : 'hero'} />
//        <p className={styles.name({ isMobile })}>{play.cardName}</p>
//      </div></>}
//  </div>

// CardPlayOverlay.styles.ts
export const styles: {
  root: string;
  vignette: (o: { isReducedMotion: boolean }) => string; // 'absolute inset-0 bg-black/30' + (reduced ? 'animate-card-play-fade' : 'animate-card-play-vignette')
  stage: (o: { isReducedMotion: boolean }) => string;    // 'relative flex flex-col items-center gap-3' + (reduced ? 'animate-card-play-fade' : 'animate-card-play')
  name: (o: { isMobile: boolean }) => string;            // 'font-black tracking-wide bg-gradient-to-r from-amber-300 via-yellow-400 to-primary bg-clip-text text-transparent' + (mobile ? 'text-base' : 'text-lg')
};
// Reduced stage class must contain NO translate/scale/transform/drop-shadow class.

// tailwind.config.ts additions (inside theme.extend)
//  keyframes:
//   'card-play': {
//     '0%':   { opacity: '0', transform: 'translateY(40px) scale(0.85)' },
//     '27%':  { opacity: '1', transform: 'translateY(0) scale(1)', filter: 'drop-shadow(0 0 0 hsl(var(--primary) / 0))' },
//     '50%':  { opacity: '1', transform: 'translateY(0) scale(1)', filter: 'drop-shadow(0 0 24px hsl(var(--primary) / 0.8))' },
//     '73%':  { opacity: '1', transform: 'translateY(0) scale(1)', filter: 'drop-shadow(0 0 0 hsl(var(--primary) / 0))' },
//     '100%': { opacity: '0', transform: 'translateY(-20px) scale(1.08)' },
//   },
//   'card-play-vignette': { '0%': {opacity:'0'}, '27%': {opacity:'1'}, '73%': {opacity:'1'}, '100%': {opacity:'0'} },
//   'card-play-fade':     { '0%': {opacity:'0'}, '15%': {opacity:'1'}, '85%': {opacity:'1'}, '100%': {opacity:'0'} },
//  animation:
//   'card-play': 'card-play 1100ms ease-out forwards',
//   'card-play-vignette': 'card-play-vignette 1100ms linear forwards',
//   'card-play-fade': 'card-play-fade 1000ms linear forwards',
// (implementer-b: confirm `--primary` is an `H S% L%` triplet in src/app/globals.css before using `hsl(var(--primary) / a)`; if not, use `rgba(...)`-free fallback `drop-shadow(0 0 24px hsl(var(--primary)))` for the 50% frame.)

// src/modules/cards/components/CardPlayOverlay/CardPlayOverlay.fixtures.ts
export const warChiefPlay: CardPlay;   // { cardName: CardName.WarChief, playId: 1 }
export const extraMovePlay: CardPlay;  // { cardName: CardName.ExtraMove, playId: 2 }

// src/modules/cards/components/CardPlayOverlay/index.ts
export { CardPlayOverlay } from './CardPlayOverlay';
export { useCardPlay } from './CardPlayOverlay.hook';
export type { CardPlay, CardPlayOverlayProps } from './CardPlayOverlay.types';

// src/modules/cards/index.ts additions
export { CardFace } from './components/CardFace';
export type { CardFaceProps, CardFaceSize } from './components/CardFace';
export { CardPlayOverlay, useCardPlay } from './components/CardPlayOverlay';
export type { CardPlay, CardPlayOverlayProps } from './components/CardPlayOverlay';
// (the CardFace index must also re-export the types it lists above)

// GameDialogManager.tsx wiring (legacy; exactly this)
//   import { ..., CardPlayOverlay, useCardPlay } from '@/modules/cards';
//   const { play: cardPlay, startPlay: startCardPlay, endPlay: endCardPlay } = useCardPlay();   // top of component, before any early return
//   onUseCard={(cardName: CardName) => {
//     dispatch({ type: 'TOGGLE_CARDS_DIALOG', playerId: null });
//     startCardPlay(cardName);
//     onLocalAction(GameAction.local_UseCard, { cardName });
//   }}
//   <CardPlayOverlay play={cardPlay} onFinished={endCardPlay} />   // last child of the fragment, outside `{playerForCardsDialog && ...}`

// ===== Phase 3 =====

// src/lib/types/game.ts: StructuredLogEntry gains (place after `redactedMessage`)
//   /** Set on log entries that record a special card being used; GameLog shows that card's icon. Absent on every other entry and on old documents. */
//   cardName?: CardName;

// Reducer edits: add `cardName: <value>,` to the pushLogEntry object. Values:
//   card-effects.reducer.ts      :24 cardName | :30 CardName.ExtraMove | :37 cardName | :94 CardName.Productive
//   card-targeted-effects.reducer.ts :16 CardName.Sabotage | :42 CardName.Wealthy | :77 CardName.StealResource | :85 CardName.StealResource
//   combat-monster-roll.reducer.ts   :56 CardName.Overcome | :75 CardName.WarChief | :89 CardName.DecideDiceRoll
//   player-actions.reducer.ts        :50 CardName.Efficient | :61 CardName.Reinforce   (import CardName already present: l.~47 uses CardName.Efficient)
//   movement.reducer.ts              :68 CardName.Teleport
// Messages, categories, and every other field stay byte-for-byte.

// GameLog.types.ts: LogEntryViewModel gains
//   cardIconSrc?: string; // CARD_ART[entry.cardName].icon; only when the viewer may read the entry and the card is known

// GameLog.map.ts: in toLogEntryViewModels, structured branch:
//   const canReadEntry = canRead(entry);
//   const message = canReadEntry ? entry.message : entry.redactedMessage;
//   ...
//   cardIconSrc: canReadEntry && entry.cardName ? CARD_ART[entry.cardName]?.icon : undefined,
//   import { CARD_ART } from '@/modules/cards';
// Legacy string entries: no cardIconSrc.

// GameLog.styles.ts: add   cardIcon: 'h-4 w-4 mt-0.5 shrink-0 object-contain',

// GameLog.tsx EntryIcon order: milestone -> trophy; else cardIconSrc -> <Image src={entry.cardIconSrc} alt="" width={16} height={16} className={styles.cardIcon} />
//   (import Image from 'next/image'); else category icon; else null. data-testid="log-card-icon" on the Image.
// DisplayedLogEntry extends LogEntryViewModel, so it carries cardIconSrc with no type change.

// GameLog.fixtures.ts addition
export const cardUseLog: GameLogViewModel; // toFixture of 3 entries: Ada used War Chief (cardName WarChief, category 'combat'), Bo activated Reinforce (cardName Reinforce, 'cards'), Ada bought a card (no cardName)
```

## Phases
### Phase 1: CardFace + CardsDialog tile layout
1. Verify `public/sprites/cards/*-card.png` all exist (run `npx jest src/modules/cards/card-art.test.ts`). (implementer-a)
2. Create `CardFace.types.ts`, `CardFace.map.ts`, `CardFace.hook.ts` per contracts. Hook: `src = CARD_ART[cardName].card` imported from `../../card-art`; `useState<string | null>` for `failedSrc`; `hasFailed = failedSrc === src`; `onError = () => setFailedSrc(src)`. (implementer-a)
3. Create `CardFace/index.ts`. (implementer-a)
4. Edit `CardsDialog.types.ts` and `.map.ts` (`useLabel: \`Use ${name}\``); add `playerWithManyCards` to fixtures. (implementer-a)
5. Create `CardFace.styles.ts` and `CardFace.tsx` per contracts. `'use client'` at top (hook). (implementer-b)
6. Edit `CardsDialog.styles.ts` and `CardsDialog.tsx` per contracts; the file must stay under 150 non-blank lines; no `zap` anywhere in the dialog. (implementer-b)
7. Add `CardFace` exports to `src/modules/cards/index.ts` (the CardPlayOverlay lines wait for phase 2). (implementer-a)
8. Tests: `CardFace.map.test.ts`, `CardFace.hook.test.ts`, `CardsDialog.map.test.ts` edit (tester-a); `CardFace.test.tsx`, `CardsDialog.test.tsx` edit (tester-b).
9. Previews: `CardFace.preview.tsx`, `CardsDialog.preview.tsx` append state; register `cardFacePreview` in `src/testbed/registry.ts` next to `cardsDialogPreview` (preview-a). Slug `cards-card-face`, title `Card Face`, group `Cards`.
10. Checks: `npm run typecheck`, `npm run lint`, `npm test`; ui-verify at `/testbed` for CardFace and CardsDialog desktop 1280x720 and mobile 390x844.

Model escalation: none (overrides already set to sonnet for all builders).

### Phase 2: CardPlayOverlay + local trigger
1. Create `CardPlayOverlay.types.ts`, `.map.ts`, `.hook.ts`, `.fixtures.ts`, `index.ts` per contracts. `useCardPlay`: `useRef(0)` counter, `startPlay` sets `{cardName, playId: ++ref.current}`, `endPlay` sets `null`, all `useCallback`. `isReducedMotion`: `useState(false)` initialised in an effect from `window.matchMedia?.(REDUCED_MOTION_QUERY).matches`, with a `change` listener removed on cleanup. (implementer-a)
2. Edit `tailwind.config.ts` (keyframes + animation, per contracts). (implementer-b)
3. Create `CardPlayOverlay.styles.ts`, `CardPlayOverlay.tsx` per contracts. (implementer-b)
4. Add overlay exports to `src/modules/cards/index.ts`. (implementer-a)
5. Edit `GameDialogManager.tsx` exactly as in contracts (imports, hook call at top of `GameDialogManager`, `startCardPlay(cardName)` inside `onUseCard`, overlay as last fragment child). (implementer-b)
6. Tests: map, hook (fake timers: unmount callback at 1100/1000 ms, restart on new `playId`, cleanup on unmount, `useCardPlay` increments) (tester-a); view tests (tester-b).
7. Previews: `CardPlayOverlay.preview.tsx` with states "Full motion", "Reduced motion", "Mobile", each with a "Replay" button that bumps `playId` (preview wrapper uses `CardPlayOverlayView` for static states and a local `useState` replay for animation); register `cardPlayOverlayPreview` (slug `cards-card-play-overlay`) in `src/testbed/registry.ts` (preview-a).
8. Checks + ui-verify: overlay appears on Use in a real match (`npm run dev`), disappears by 1.2 s, map click-through works, reduced-motion emulation fades only.

Model escalation: none.

### Phase 3: `cardName` on card-use log entries + GameLog icon + docs
1. First failing tests (tester-a): add `cardName` assertions to the five reducer test files and `GameLog.map.test.ts`; confirm they fail. Run `npx jest src/modules/game-rules src/modules/hud/components/GameLog` and note failures.
2. `src/lib/types/game.ts`: add `cardName?: CardName`. (implementer-a)
3. Edit the five reducers per the contracts table: 14 pushes (4 effects + 4 targeted + 3 combat + 2 player-actions + 1 movement). After editing, `grep -rn "cardName" src/modules/game-rules/{card-effects,card-targeted-effects,combat-monster-roll,player-actions,movement}.reducer.ts` must show each push. (implementer-a)
4. GameLog `.types.ts`, `.map.ts`, `.fixtures.ts` (`cardUseLog`) per contracts. (implementer-a)
5. GameLog `.styles.ts` + `.tsx` per contracts. (implementer-b)
6. Fix any exact `toEqual` on log entries broken by the new field (adding only `cardName`, never loosening). (tester-a)
7. View tests in `GameLog.test.tsx` (tester-b). Previews: append "Card uses" and "Card use, redacted" states to `GameLog.preview.tsx` (preview-a). For redacted, fixture entry `{ cardName, visibility: { scope: 'owner' }, redactedMessage }` run through `toLogEntryViewModels(logs, players, () => false)`.
8. docs-sync: `docs/architecture/systems-and-visuals.md` near line 101 (log `cardName`: public card-use entries; icon gated by `canViewerReadLogEntry`) and near line 153 (new "Card play overlay": local-only, `useCardPlay`, 1100/1000 ms, `z-40`), plus CardsDialog art mention. Report any drift found. (docs-sync)
9. Checks + ui-verify: log at 16 px legible (else change `cardIcon` to `h-5 w-5`), desktop panel and mobile sheet.

Model escalation: none.

## Test plan
- tester-a (logic, first):
  - `CardFace.map.test.ts`: `toCardFaceDimensions` returns 80x120, 200x300, 150x225; every result has `height/width === 1.5`.
  - `CardFace.hook.test.ts`: `src` equals `CARD_ART[name].card` for all `CardName` values (`it.each`); `hasFailed` false initially; true after `onError`; resets to false when rerendered with another `cardName`.
  - `CardsDialog.map.test.ts`: `useLabel === 'Use Sabotage'` for a Sabotage card; present for non-usable cards too.
  - `CardPlayOverlay.map.test.ts`: `toPlayDurationMs(false) === 1100`, `(true) === 1000`; `toStatusText(null) === ''`; `toStatusText({cardName: WarChief, playId: 1}) === 'You played War Chief.'`.
  - `CardPlayOverlay.hook.test.ts` (jest fake timers): `useCardPlay` starts null; `startPlay` sets cardName and playId 1; second `startPlay` gives playId 2; `endPlay` nulls. `useCardPlayOverlay`: with play, `onFinished` not called at 1099 ms, called once at 1100 ms; with `matchMedia` mocked `matches: true`, called at 1000 ms and `isReducedMotion` true; new `playId` before expiry restarts the timer (not called at original deadline); unmount clears (no call); `play: null` sets no timer; `isMobile` true when `window.innerWidth = 390` (set and restore).
  - Reducer tests (one case per push, assert `state.log` last entry `toMatchObject({ cardName })`): Reinforce, Efficient, MasterBuilder (`:24` uses payload name), Extra Move, Scout (`isScout: true`), Productive (with a collected resource), Sabotage, Wealthy, Steal (success and "none to steal"), Overcome, War Chief, Decide Dice Roll, deploy with Efficient, deploy with Reinforce, Teleport. Negative: `handleBuyCardAction` log entry has no `cardName`.
  - `GameLog.map.test.ts`: entry with `cardName: WarChief` and `canRead` true gives `cardIconSrc === CARD_ART[WarChief].icon`; same entry with `canRead` false and `redactedMessage` gives `cardIconSrc === undefined`; entry without `cardName` gives undefined; unknown name (`'Nope' as CardName`) gives undefined; legacy string entry gives undefined.
- tester-b (view and e2e):
  - `CardFace.test.tsx`: renders an `img` with `src` containing `war-chief-card`, `alt=""` by default and given `alt` when passed; wrapper style width/height 80x120 for `tile`; `fireEvent.error(img)` shows the `layers` placeholder (`registry-icon-layers`) and no `img`.
  - `CardsDialog.test.tsx` (edit): one `card-face` per distinct card; no `registry-icon-zap` testid; `getByRole('button', {name: 'Use Steal Resource'})`; Overcome tile has `card-face` but no Use button; `x2` badge shares the row with the name (same parent); still passes existing cases.
  - `CardPlayOverlay.test.tsx`: `play=null` renders root with `role="status"` empty and no stage; with play: status text `You played War Chief.`, name text `War Chief`, `card-face` `data-card="War Chief"`; root class contains `pointer-events-none` and `z-40`; stage has class `animate-card-play` when not reduced and `animate-card-play-fade` with no `translate`/`scale` class when reduced; `isMobile` gives a 150 px wide card, desktop 200 px; stage and vignette are `aria-hidden`; rerender with new `playId` remounts the stage (query node identity differs).
  - `GameLog.test.tsx`: `cardUseLog` shows `log-card-icon` for the two card entries with `src` containing `war-chief-icon` and `reinforce-icon` (Next image URL encoding: match on the file name), the bought-card entry shows its category icon and no `log-card-icon`; redacted fixture shows no `log-card-icon`; existing legacy-only test still passes.
  - e2e: none added (card-use needs a seeded hand; covered by ui-verify). Existing e2e specs must stay green only if run by the coordinator; none reference `zap`.

## Preview states
- `CardFace` (`cardFacePreview`): "All cards, tile" (13 cards from `Object.values(CardName)`), "All cards, hero", "All cards, hero-compact", "Image failure" (a small helper in the preview file dispatches `new Event('error')` on the rendered `img` after mount, so the placeholder shows; no invented asset path).
- `CardsDialog`: keep states 0-3, append "Many cards (scroll)" (`playerWithManyCards`, `canUseCards` true).
- `CardPlayOverlay` (`cardPlayOverlayPreview`): "Full motion", "Reduced motion", "Mobile size" (`isMobile` true), each with Replay button (bumps `playId`) and a dummy underlay (a grid of buttons) to show click-through.
- `GameLog`: append "Card uses" (`cardUseLog`) and "Card use, redacted".

## Risks
- `GameDialogManager.tsx` is legacy: keep the edit to the 3 spots listed; do not reformat.
- `GameLog.map.ts` importing `@/modules/cards` pulls all dialog code into hud tests; if a circular import or slow test appears, report BLOCKER rather than copying paths (alternative: export a `toCardIconSrc` helper from `card-art.ts`, still via the index).
- Existing exact-equality assertions on log entries in reducer tests may fail after adding `cardName`; tester-a fixes by adding the field, never by loosening.
- `hsl(var(--primary) / a)` may not be valid if `--primary` is not an HSL triplet; check `src/app/globals.css` first.
- The overlay plays even if `handleUseCard` later throws (toast). Accepted: the Use button is disabled for every illegal case the dialog can see.
- `next/image` in jest renders `src` as `/_next/image?url=...`; tests must match on the encoded file name, not the raw path.
- Sandbox/debug board (`GameBoardSandbox`) renders `GameBoardContent` and so also gets the overlay; fine.
- Phase 3 touches the game-rules reducers (log payload only). No rule, state transition or message changes; the reducer test suites must stay green unchanged except added assertions.

## Review (architect-b)
VERDICT: APPROVED

Verified: every path in Verified context and File plan exists (or is marked new); `CARD_ART` 13 cards with `-card.png`/`-icon.png` in `public/sprites/cards/` (untracked, committed in P1 as planned); push line numbers match source (card-effects 24/30/37/94, targeted 16/42/77/85, combat 56/75/89, player-actions 50/61, movement 68); `--primary` is `231 48% 48%` (HSL triplet, so `hsl(var(--primary) / a)` is valid); `GameDialogManager` has no early return before the hook spot; `z-50` dialogs vs `z-40` overlay holds. No move or rename, so no old-path grep applies. Design is minimal: reuses `CARD_ART`, `useIsMobile`, `canViewerReadLogEntry`, `pushLogEntry` unchanged; contracts are complete for parallel builders.

Folded in (wording/contract, no design change):
1. `useCardPlayOverlay` effect deps: `next/core-web-vitals` enforces `react-hooks/exhaustive-deps`; `[play?.playId, isReducedMotion]` would warn and lint allows zero warnings. Contract now uses `playId` local plus `onFinished` in deps.
2. Decision on log scope said "one icon per use at activation" but the plan also tags Efficient/Reinforce deploy lines. Wording now states both lines carry the icon.

Non-blocking notes for builders:
- `CardFace` tile `hover:scale-105` inside `ScrollArea` may clip at the edge; check in ui-verify, add padding to `tile` in `CardsDialog.styles.ts` if so.
- Reduced-motion init via effect is fine; `IslandTile.hook.ts:51` reads `matchMedia` lazily, either is acceptable.
