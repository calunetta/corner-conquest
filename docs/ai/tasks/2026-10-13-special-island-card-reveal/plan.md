# Plan: Special island idle art + card-reveal animation

Status: APPROVED
Inputs: triage.md, ui-design.md (Final spec)

## Goal and acceptance criteria
- [ ] `IslandType.Special` tile shows `special_island_idle.png` instead of the `Star` icon, always, except mid-reveal.
- [ ] A reveal-animation entry on `GameState` plays `special_island_reveal.gif` once (~1.4s) on the exact tile, for every viewer, only when a card is actually drawn: first-ever discovery success (`island-discovery.reducer.ts`) or a later roll success (`card-acquisition.reducer.ts`).
- [ ] No animation on scout-no-card, roll-no-card, hand-full, or empty-deck branches.
- [ ] Fog still shows `HelpCircle`, takes precedence over idle/reveal, unchanged.
- [ ] `prefers-reduced-motion: reduce` skips the GIF outright; idle PNG shows the whole window.
- [ ] Reveal entries auto-clear (engine-scheduled Firestore clear + turn-boundary safety net), mirroring `deathAnimations` exactly.
- [ ] `/testbed/island-tile` has idle, mid-reveal, reveal-finished states at desktop+mobile; `/testbed/card-reveal-effect` exists mirroring `/testbed/death-effect`.

## Verified context
| Symbol or file | Location | Why it matters |
|---|---|---|
| `DeathAnimation` | `src/lib/types/combat.ts:26-31` | Shape to mirror for the new type (`id`,`x`,`y`,`createdAt`). |
| `GameState.deathAnimations` | `src/lib/types/game.ts:63` | Sibling field; new field sits next to it. |
| `revealIsland` success branch | `src/modules/game-rules/island-discovery.reducer.ts:60-69` | Push point 1. `x`/`y` already params; guarded by `!isScout` (`:38`), hand-full (`:39-44`), empty-deck (`:70-76`). |
| `handleRollOnSpecialIsland` success branch | `src/modules/game-rules/card-acquisition.reducer.ts:118-128` | Push point 2. Current signature `payload?: { roll?: number }` (`:90`) has no `x`/`y`. |
| `SpecialIslandRollDialogState` | `src/lib/types/dialogs.ts:14-18` | `{isOpen, roll, cardDrawn}` — needs `x`,`y`. |
| Dialog opened on tile click | `src/modules/game-board/game-board.tile-click.hook.ts:84` | Sets dialog state; `x`,`y` already in scope as function params. |
| `onRoll` dispatches the action | `src/features/game/components/GameDialogManager.tsx:138-144` | Legacy wiring; must forward `x`/`y` from `dialogs.specialIslandRoll`. |
| `DeathEffect` (`.tsx`/`.hook.ts`/`.types.ts`/`.styles.ts`) | `src/modules/map/components/DeathEffect/` | Exact mechanism to mirror: key-remount + cache-bust query param, `createdAt`-based elapsed math, `setTimeout` hide. `DeathEffect.tsx:19-20` hardcodes `width={64} height={64}` — wrong for this tile-filling art (ui-design finding 6), new component uses `fill`+`object-contain` instead. |
| `deathAnimationOnTile` matching | `src/modules/map/components/IslandTile/IslandTile.hook.ts:26-33` | Pattern to mirror for `cardRevealAnimationOnTile`. |
| `getTileCenterContent` Special case | `src/modules/map/components/IslandTile/IslandTile.tsx:66-67`, style `IslandTile.styles.ts:57` | `Star` icon swap point. |
| Engine-side clear | `src/modules/game-board/game-board.engine.hook.ts:125-153` | Scheduled `setTimeout` per animation `id`, then Firestore clear. Mirror with a second ref/effect. |
| `clearDeathAnimations` | `src/modules/game-board/services/game-board.engine.service.ts:34-37` | Sibling service fn to add (`clearCardRevealAnimations`). |
| Turn-boundary safety net | `src/modules/game-rules/player-turn.reducer.ts:7,119-124` | `DEATH_ANIMATION_DURATION_MS = 2000` local const, filters stale entries on `handleEndTurn`. Mirror with own `REVEAL_ANIMATION_DURATION_MS`. |
| `initializeGame` | `src/modules/game-rules/game-setup.reducer.ts:109-129` | Initial `GameState` literal; needs `cardRevealAnimations: []`. |
| `buildGameState` | `src/modules/map/board-context.fixtures.ts:35-56` | Shared fixture scaffold for IslandTile/TileBoats/TileOccupants; needs `cardRevealAnimations: []` default. |
| `REDUCED_MOTION_QUERY` pattern | `src/modules/lobby/components/LobbyBackground/LobbyBackground.hook.ts:13-17` | Reduced-motion convention to mirror (`window.matchMedia('(prefers-reduced-motion: reduce)').matches`), per ui-design.md final-spec note. |
| `realTimeActions` includes `RollOnSpecialIsland` | `src/modules/game-board/game-board.actions.hook.ts:42-52` | Confirms both the acting player (optimistic local state) and other viewers (Firestore subscription) get the new array entry; no extra sync work needed. |
| `MapGrid` tile sizing | `src/modules/map/components/MapGrid/MapGrid.tsx:50` | `clamp(94px,12.5vh,136px)` desktop / `clamp(46px,13.5vw,68px)` mobile — confirms `fill`+`object-contain` is the right sizing call, not fixed px. |
| Existing "star icon" test | `src/modules/map/components/IslandTile/IslandTile.test.tsx:131-149` | Must update: add new viewModel fields, assert idle image not icon. |
| `game-board.map.test.ts` dialog literals | `src/modules/game-board/game-board.map.test.ts:86,152` | `specialIslandRoll: { isOpen, roll, cardDrawn }` literals need `x`,`y`. |
| `SpecialIslandRollDialog.fixtures.ts` | `src/modules/cards/components/SpecialIslandRollDialog/SpecialIslandRollDialog.fixtures.ts:5-23` | 3 state literals need `x`,`y`. |
| `handleRollOnSpecialIsland` existing call sites | `src/modules/game-rules/card-acquisition.reducer.test.ts:141,148,156,164,171`, `src/modules/game-rules/game-rules.reducer.test.ts:273` | All call `{ roll }` only; break once payload requires `x`,`y` — tester-a updates. |
| `DeathEffect.preview.tsx` + registry entry | `src/modules/map/components/DeathEffect/DeathEffect.preview.tsx`, `src/testbed/registry.ts:3,52` | Pattern for `CardRevealEffect.preview.tsx` + its own registry entry. |
| `IslandTile.preview.shared.tsx` `createViewModel` | `src/modules/map/components/IslandTile/IslandTile.preview.shared.tsx:17-31` | Needs new defaults `cardRevealAnimationOnTile: undefined`, `prefersReducedMotion: false`. |
| Sprites on disk | `public/sprites/special_island_idle.png` (185×173), `public/sprites/special_island_reveal.gif` (186×179, 3 frames) | Verified this session by ui-designer-b; already copied in. |

## Decisions
- New type `CardRevealAnimation` (`{id, x, y, createdAt?}`) lives in `src/lib/types/cards.ts`, not `combat.ts`, because this isn't combat and doesn't need a `sprite` field (one fixed asset) — mirrors `DeathAnimation`'s *pattern*, not its type. Rejected: reuse `DeathAnimation` directly (carries an unused `sprite` field, wrong domain).
- New component `CardRevealEffect` (sibling of `DeathEffect`, not a parameterized `DeathEffect`) because `DeathEffect`'s `sprite` prop and fixed `64×64` sizing are both wrong here (ui-design finding 6) and it has exactly one caller. Rejected: add a `size`/`sprite` variant prop to `DeathEffect` — turns one component into two behaviors behind a flag for a single caller, violates open/closed more than a sibling file does.
- `handleRollOnSpecialIsland(state, payload?: { roll?: number; x: number; y: number })`: payload stays optional (defensive/test-friendly), but `x`/`y` are required *inside* it since the one real caller (`GameDialogManager`) always supplies them once threaded. Rejected: make the whole payload require `x`/`y` unconditionally — forces every existing defensive/test call site to supply dummy coords for no behavioral gain.
- Engine-side clear (`game-board.engine.hook.ts`) hardcodes its own ms buffer (mirroring `deathAnimations`'s existing `anim.createdAt + 1250 - Date.now()` inline pattern, not importing `DeathEffect.types.ts`'s constant) — matches today's precedent exactly, not a new inconsistency to fix here.
- Turn-boundary safety net uses its own `REVEAL_ANIMATION_DURATION_MS` local constant in `player-turn.reducer.ts`, separate from `DEATH_ANIMATION_DURATION_MS` — mirrors the existing precedent of a reducer-local duration constant decoupled from the UI component's constant.
- Reduced motion decided once in `IslandTile.hook.ts` (`useState(() => window.matchMedia(...).matches)`), exposed as `prefersReducedMotion` on the view model; `IslandTile.tsx` picks idle art vs `<CardRevealEffect>` based on it. Rejected: put the check inside `CardRevealEffect` itself (would still need the parent to also know, to decide whether to mount it at all — no simplification).
- No new Playwright e2e spec for reduced motion. Covered at hook level (`IslandTile.hook.test.ts`) and view level (`IslandTile.test.tsx`, mocking `window.matchMedia`) — matches the existing `LobbyBackground` reduced-motion precedent, which also ships with no e2e spec.
- `CombatDialog.fixtures.ts` / `MonsterCombatDialog.fixtures.ts` / `AbilitiesDialog.fixtures.ts` are NOT touched: all three cast their `GameState` literal with `as unknown as GameState` and never read `.cardRevealAnimations`, so the new required field doesn't break their typecheck and nothing in those dialogs reads the array. Only `board-context.fixtures.ts` (actually read by `IslandTile`/`TileOccupants`/`TileBoats`) and `game-setup.reducer.ts` (real initial state) get the new field.

## File plan
| File | New / Edit | Responsibility | Owner |
|---|---|---|---|
| `src/lib/types/cards.ts` | edit | Add `CardRevealAnimation` type | implementer-a |
| `src/lib/types/game.ts` | edit | Add `cardRevealAnimations: CardRevealAnimation[]` to `GameState`, import the type | implementer-a |
| `src/lib/types/dialogs.ts` | edit | Add `x: number; y: number` to `SpecialIslandRollDialogState` | implementer-a |
| `src/modules/game-rules/island-discovery.reducer.ts` | edit | Push reveal-animation entry in the card-drawn branch only | implementer-a |
| `src/modules/game-rules/card-acquisition.reducer.ts` | edit | Thread `x`/`y` into `handleRollOnSpecialIsland`'s payload type; push entry in the card-drawn branch only | implementer-a |
| `src/modules/game-rules/game-setup.reducer.ts` | edit | Initialize `cardRevealAnimations: []` | implementer-a |
| `src/modules/game-rules/player-turn.reducer.ts` | edit | Turn-boundary safety-net filter for stale `cardRevealAnimations`, new `REVEAL_ANIMATION_DURATION_MS` const | implementer-a |
| `src/modules/game-board/game-board.tile-click.hook.ts` | edit | Thread `x`,`y` into the `SET_SPECIAL_ISLAND_ROLL_DIALOG` dispatch (`:84`) | implementer-a |
| `src/modules/game-board/game-board.engine.hook.ts` | edit | Mirror the `deathAnimations` scheduled-clear effect for `cardRevealAnimations` | implementer-a |
| `src/modules/game-board/services/game-board.engine.service.ts` | edit | Add `clearCardRevealAnimations(gameId, remaining)` | implementer-a |
| `src/modules/map/board-context.fixtures.ts` | edit | Add `cardRevealAnimations: []` default in `buildGameState` | implementer-a |
| `src/modules/cards/components/SpecialIslandRollDialog/SpecialIslandRollDialog.fixtures.ts` | edit | Add `x`,`y` to the 3 state fixtures | implementer-a |
| `src/modules/map/components/IslandTile/IslandTile.types.ts` | edit | Add `cardRevealAnimationOnTile: CardRevealAnimation \| undefined` and `prefersReducedMotion: boolean` to `IslandTileViewModel` | implementer-a |
| `src/modules/map/components/IslandTile/IslandTile.hook.ts` | edit | Match `cardRevealAnimationOnTile` by `x`/`y`+elapsed time (mirrors `deathAnimationOnTile`); compute `prefersReducedMotion` once | implementer-a |
| `src/modules/map/components/CardRevealEffect/CardRevealEffect.types.ts` | new | `CardRevealEffectProps`/`State`, `REVEAL_ANIMATION_DURATION`, `REVEAL_SPRITE_PATH` | implementer-a |
| `src/modules/map/components/CardRevealEffect/CardRevealEffect.hook.ts` | new | Elapsed-time visibility + cache-busted src, mirrors `useDeathEffect` | implementer-a |
| `src/modules/map/components/CardRevealEffect/index.ts` | new | Public API of the component | implementer-a |
| `src/modules/map/components/CardRevealEffect/CardRevealEffect.tsx` | new | View: `next/image` with `fill`, `object-contain` | implementer-b |
| `src/modules/map/components/CardRevealEffect/CardRevealEffect.styles.ts` | new | `wrapper` (mirrors `DeathEffect.styles.ts`), `image: 'object-contain'` | implementer-b |
| `src/modules/map/components/IslandTile/IslandTile.tsx` | edit | Special-case content: idle `Image` vs `<CardRevealEffect>`, remove `Star` import/usage | implementer-b |
| `src/modules/map/components/IslandTile/IslandTile.styles.ts` | edit | Remove `specialIcon`; add `specialContent` (relative wrapper) and `specialImage` (`object-contain`) | implementer-b |
| `src/features/game/components/GameDialogManager.tsx` | edit | Forward `x`,`y` from `dialogs.specialIslandRoll` into the `RollOnSpecialIsland` action payload (`:138`) | implementer-b |
| `src/modules/game-rules/island-discovery.reducer.test.ts` | edit | Cases: card-drawn pushes entry; scout/hand-full/empty-deck don't | tester-a |
| `src/modules/game-rules/card-acquisition.reducer.test.ts` | edit | Update existing `{roll}` calls to `{roll, x, y}`; add cases: success pushes entry with correct `x`/`y`; no-card/hand-full/empty-deck don't | tester-a |
| `src/modules/game-rules/game-rules.reducer.test.ts` | edit | Update `:273` call site with `x`,`y` | tester-a |
| `src/modules/game-rules/player-turn.reducer.test.ts` | edit | Safety-net filter removes stale `cardRevealAnimations`, keeps fresh ones | tester-a |
| `src/modules/game-board/game-board.map.test.ts` | edit | Update `:86`,`:152` `specialIslandRoll` literals with `x`,`y` | tester-a |
| `src/modules/game-board/game-board.engine.hook.test.ts` | edit | Add `cardRevealAnimations: []` to base fixture (`:113`); mirror death-animation scheduling tests (`:535-618`) for `cardRevealAnimations` | tester-a |
| `src/modules/game-board/services/game-board.engine.service.test.ts` | edit | Mirror `clearDeathAnimations` tests (`:192-235`) for `clearCardRevealAnimations` | tester-a |
| `src/modules/map/components/IslandTile/IslandTile.hook.test.ts` | edit | Mirror death-animation-matching tests for `cardRevealAnimationOnTile`; add `prefersReducedMotion` tests (mock `window.matchMedia`) | tester-a |
| `src/modules/map/components/CardRevealEffect/CardRevealEffect.hook.test.ts` | new | Mirror `DeathEffect.hook.test.ts` exactly, using `REVEAL_ANIMATION_DURATION` | tester-a |
| `src/modules/map/components/CardRevealEffect/CardRevealEffect.test.tsx` | new | Mirror `DeathEffect.test.tsx`: renders sprite, cache-bust query param, dimensions via `fill` (assert `alt` + `src`, not fixed width/height) | tester-b |
| `src/modules/map/components/IslandTile/IslandTile.test.tsx` | edit | Update `:131-149` test (idle image, not Star); add: `CardRevealEffect` renders when `cardRevealAnimationOnTile` set and not reduced motion; idle shows instead when `prefersReducedMotion` true even with an active entry; fog still wins | tester-b |
| `src/modules/map/components/IslandTile/IslandTile.preview.shared.tsx` | edit | Add `cardRevealAnimationOnTile: undefined`, `prefersReducedMotion: false` to `createViewModel` | preview-a |
| `src/modules/map/components/IslandTile/IslandTile.preview.tsx` | edit | Add "Special island, mid-reveal" and "Special island, reveal finished" states | preview-a |
| `src/modules/map/components/CardRevealEffect/CardRevealEffect.preview.tsx` | new | Mirror `DeathEffect.preview.tsx`: fresh / halfway / near-end / no-createdAt states | preview-a |
| `src/testbed/registry.ts` | edit | Import + register `cardRevealEffectPreview` (mirrors `deathEffectPreview`, `:3`,`:52`) | preview-a |
| `docs/architecture/game-mechanics.md` | edit | Update the "Special Islands" bullet (`:35`) to mention the idle temple art and one-shot reveal feedback | docs-sync |

## Contracts
```ts
// src/lib/types/cards.ts — new
export type CardRevealAnimation = {
  id: string; // `card-${x}-${y}-${createdAt}`
  x: number;
  y: number;
  createdAt?: number;
};

// src/lib/types/game.ts — GameState gains:
export type GameState = {
  // ...unchanged fields...
  cardRevealAnimations: CardRevealAnimation[];
};

// src/lib/types/dialogs.ts — SpecialIslandRollDialogState gains x,y:
export type SpecialIslandRollDialogState = {
  isOpen: boolean;
  roll: number | null;
  cardDrawn: CardName | null;
  x: number;
  y: number;
} | null;

// src/modules/game-rules/card-acquisition.reducer.ts — signature change:
export function handleRollOnSpecialIsland(
  state: GameState,
  payload?: { roll?: number; x: number; y: number },
): GameState;
// Pushes a CardRevealAnimation to state.cardRevealAnimations only in the card-drawn
// branch (today's :118-128), only when payload is present, using payload.x/payload.y.

// src/modules/game-rules/island-discovery.reducer.ts — revealIsland unchanged signature;
// pushes a CardRevealAnimation to state.cardRevealAnimations only in the card-drawn
// branch (today's :60-69), using the function's own x/y params.

// src/modules/game-board/services/game-board.engine.service.ts — new sibling fn:
export async function clearCardRevealAnimations(
  gameId: string,
  remaining: CardRevealAnimation[],
): Promise<void>;
// Body identical in shape to clearDeathAnimations, writing { cardRevealAnimations: remaining }.

// src/modules/map/components/CardRevealEffect/CardRevealEffect.types.ts — new
export interface CardRevealEffectProps {
  id: string;
  createdAt?: number;
}
export const REVEAL_ANIMATION_DURATION = 1400; // ms, matches the GIF's real run time
export const REVEAL_SPRITE_PATH = '/sprites/special_island_reveal.gif';
export interface CardRevealEffectState {
  isVisible: boolean;
  freshSpriteSrc: string;
}

// src/modules/map/components/CardRevealEffect/CardRevealEffect.hook.ts — new
export function useCardRevealEffect(props: CardRevealEffectProps): CardRevealEffectState;
// Identical shape to useDeathEffect: setIsVisible(true) on mount/id-or-createdAt-change,
// setTimeout(Math.max(100, REVEAL_ANIMATION_DURATION - elapsed)) to hide,
// freshSpriteSrc = `${REVEAL_SPRITE_PATH}?anim=${props.id}`.

// src/modules/map/components/CardRevealEffect/CardRevealEffect.tsx — new
export function CardRevealEffect(props: CardRevealEffectProps): JSX.Element | null;
// <div className={styles.wrapper}><Image key={props.id} src={freshSpriteSrc}
//   alt="Card revealed" fill className={styles.image} unoptimized priority /></div>
// or null when !isVisible.

// src/modules/map/components/IslandTile/IslandTile.types.ts — IslandTileViewModel gains:
export interface IslandTileViewModel extends IslandTileStaticViewModel {
  // ...unchanged fields...
  cardRevealAnimationOnTile: CardRevealAnimation | undefined;
  prefersReducedMotion: boolean;
}

// src/modules/map/components/IslandTile/IslandTile.hook.ts — useIslandTile additions:
// const cardRevealAnimationOnTile = gameState.cardRevealAnimations.find(
//   (anim) => anim.x === island.x && anim.y === island.y &&
//     (!anim.createdAt || now - anim.createdAt < REVEAL_ANIMATION_DURATION));
// const [prefersReducedMotion] = useState(
//   () => typeof window !== 'undefined' &&
//     window.matchMedia('(prefers-reduced-motion: reduce)').matches);
// (import REVEAL_ANIMATION_DURATION from '../CardRevealEffect')

// src/modules/game-board/game-board.tile-click.hook.ts:84 — dispatch gains x,y:
// dispatch({ type: 'SET_SPECIAL_ISLAND_ROLL_DIALOG', state: { isOpen: true, roll: null, cardDrawn: null, x, y } });

// src/features/game/components/GameDialogManager.tsx:138 — payload gains x,y:
// await onAction(GameAction.RollOnSpecialIsland, {
//   roll, x: dialogs.specialIslandRoll!.x, y: dialogs.specialIslandRoll!.y,
// });
```

### Addendum (Phase 2, revise): local-hide race between CardRevealEffect's own timer and the Firestore clear

preview-b found this live, with screenshots: `CardRevealEffect`'s own `setTimeout` makes it return `null` at `t+~1400ms`, but `IslandTile` only re-evaluates `cardRevealAnimationOnTile` on its own re-render — nothing forces that re-render at the same instant, so the tile goes blank (idle art not shown either) for the gap between "GIF's local timer hides it" and "the array entry is actually cleared and a new snapshot arrives" (100-500ms+, every single reveal, every viewer).

Fix: `CardRevealEffect` reports its own hide via an `onHidden` callback; `IslandTile` tracks which animation `id`s have already reported hidden and falls back to idle art for those immediately, without waiting on `gameState.cardRevealAnimations` to actually lose the entry.

```ts
// src/modules/map/components/CardRevealEffect/CardRevealEffect.types.ts — CardRevealEffectProps gains:
export interface CardRevealEffectProps {
  id: string;
  createdAt?: number;
  onHidden?: () => void;
}
// REVEAL_ANIMATION_DURATION, REVEAL_SPRITE_PATH, CardRevealEffectState unchanged.

// src/modules/map/components/CardRevealEffect/CardRevealEffect.hook.ts — useCardRevealEffect:
// the existing setTimeout callback that calls setIsVisible(false) also calls props.onHidden?.()
// in that same callback, after setIsVisible(false). No new effect, no new dependency —
// onHidden is read from props at fire time, not added to the timer effect's dependency array
// (mirrors how props.sprite/props.id already aren't re-derived mid-timer in useDeathEffect).

// src/modules/map/components/IslandTile/IslandTile.types.ts — IslandTileViewModel gains:
export interface IslandTileViewModel extends IslandTileStaticViewModel {
  // ...cardRevealAnimationOnTile, prefersReducedMotion unchanged...
  onCardRevealHidden: (id: string) => void;
}

// src/modules/map/components/IslandTile/IslandTile.hook.ts — useIslandTile additions:
// const [locallyHiddenRevealIds, setLocallyHiddenRevealIds] = useState<Set<string>>(new Set());
// const onCardRevealHidden = useCallback((id: string) => {
//   setLocallyHiddenRevealIds((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
// }, []);
// cardRevealAnimationOnTile's existing .find(...) predicate gains one more condition,
// ANDed with the existing x/y/elapsed-time checks: !locallyHiddenRevealIds.has(anim.id)
// A new reveal on the same tile later has a different id (`card-${x}-${y}-${createdAt}`),
// so it is never pre-suppressed by an older id already in the set.
// locallyHiddenRevealIds needs no manual cleanup: it is component state scoped to one
// IslandTile instance (one per tile, keyed by coordinates in MapGrid), so it resets on unmount.

// src/modules/map/components/IslandTile/IslandTile.tsx — Special case, CardRevealEffect call site gains onHidden:
// <CardRevealEffect
//   id={cardRevealAnimationOnTile.id}
//   createdAt={cardRevealAnimationOnTile.createdAt}
//   onHidden={() => onCardRevealHidden(cardRevealAnimationOnTile.id)}
// />
```

Rejected: having `IslandTile` poll/re-render on a `setTimeout` of its own sized to `REVEAL_ANIMATION_DURATION` — duplicates the timing logic `CardRevealEffect` already owns, and two independent timers (one per component) can drift relative to each other in a way a single callback can't. Rejected: clearing the Firestore entry faster (shrinking the engine-hook buffer) — doesn't fix the underlying bug, a slow network still reproduces the gap, and it was already the minimum-safe buffer mirroring `deathAnimations`.

File plan: no new files, no new owners. `CardRevealEffect.hook.ts`/`IslandTile.hook.ts` stay implementer-a; `CardRevealEffect.tsx`/`IslandTile.tsx` stay implementer-b — same rows as above, this addendum is additional scope on files already in their columns.

Phase 2 steps 2-4 gain: step 2 (implementer-a) also adds `onHidden` to `CardRevealEffect.hook.ts`/`.types.ts` and `locallyHiddenRevealIds`/`onCardRevealHidden` to `IslandTile.hook.ts`/`.types.ts`; step 3 (implementer-b) also wires `onHidden` in `CardRevealEffect.tsx`; step 4 (implementer-b) also passes `onCardRevealHidden` through in `IslandTile.tsx`. Model escalation for step 4 already called sonnet; this addendum doesn't change that.

Test plan addition:
- tester-a: `CardRevealEffect.hook.test.ts` — `onHidden` is called exactly once, at the same timer fire as `isVisible` flipping to `false`; not called before the timer fires; not called again on an unrelated re-render. `IslandTile.hook.test.ts` — once `onCardRevealHidden(id)` is invoked for an animation still present in `gameState.cardRevealAnimations` (simulating the pre-clear gap), `cardRevealAnimationOnTile` becomes `undefined` on the next render even though the array entry is untouched; a *different* id on the same tile is unaffected.
- tester-b: `IslandTile.test.tsx` — with fake timers, render with an active `cardRevealAnimationOnTile` and advance past `REVEAL_ANIMATION_DURATION`; assert the idle image reappears (not a blank tile) even though the view model's `cardRevealAnimationOnTile` prop/gameState never changed — this is the regression test for preview-b's exact defect.

Risk: this is Phase 2, already in progress (preview-b flagged it during the previews stage) — implementer-a and implementer-b should treat this addendum as part of their current phase 2 work, not a new phase.


## Phases
### Phase 1: GameState field, reducers, engine sync, dialog threading
1. Add `CardRevealAnimation` to `cards.ts`; add field to `GameState`; add `x`/`y` to `SpecialIslandRollDialogState`. (implementer-a)
2. Push the animation entry in `island-discovery.reducer.ts`'s card-drawn branch. (implementer-a)
3. Thread `x`/`y` into `handleRollOnSpecialIsland`; push the entry in its card-drawn branch. (implementer-a, sonnet — signature change touches 3 call sites)
4. Init `cardRevealAnimations: []` in `game-setup.reducer.ts`; add the turn-boundary safety-net filter in `player-turn.reducer.ts`. (implementer-a)
5. Thread `x`/`y` through `tile-click.hook.ts:84` and `GameDialogManager.tsx:138`. (implementer-a for the hook, implementer-b for the legacy wiring)
6. Mirror the `deathAnimations` scheduled-clear effect in `game-board.engine.hook.ts`; add `clearCardRevealAnimations` in `game-board.engine.service.ts`. (implementer-a, sonnet — must not disturb the existing death-animation effect it sits beside)
7. Add `cardRevealAnimations: []` default to `board-context.fixtures.ts`; add `x`/`y` to `SpecialIslandRollDialog.fixtures.ts`'s 3 states. (implementer-a)
8. Update every broken test call site: `card-acquisition.reducer.test.ts`, `game-rules.reducer.test.ts:273`, `game-board.map.test.ts:86,152`; add new reducer/engine test cases per Test plan. (tester-a, sonnet)
9. Checks: `npm run typecheck`, `npm run lint`, `npm test`.
10. Commit, stop, ask the user to type `continue`.

Model escalation: steps 3, 6, 8 need sonnet (signature ripple across call sites; engine-hook edit sits beside existing untouched logic that must not regress).

### Phase 2: IslandTile rendering, CardRevealEffect component, previews, docs
1. Add `cardRevealAnimationOnTile`/`prefersReducedMotion` to `IslandTile.types.ts` and compute them in `IslandTile.hook.ts`. (implementer-a)
2. Build `CardRevealEffect.types.ts`, `.hook.ts`, `index.ts`. (implementer-a)
3. Build `CardRevealEffect.tsx`, `.styles.ts`. (implementer-b)
4. Edit `IslandTile.tsx`/`.styles.ts`: idle `Image` vs `<CardRevealEffect>`, remove `Star`/`specialIcon`. (implementer-b, sonnet — the fog/idle/reveal precedence must stay exactly right)
5. Tests: `CardRevealEffect.hook.test.ts` (tester-a), `IslandTile.hook.test.ts` additions (tester-a), `CardRevealEffect.test.tsx` (tester-b), `IslandTile.test.tsx` updates (tester-b, sonnet — must cover the reduced-motion branch correctly)
6. Previews: `CardRevealEffect.preview.tsx` + registry entry, `IslandTile.preview.shared.tsx`/`.preview.tsx` new states. (preview-a)
7. `ui-verify` on `/testbed/island-tile` and `/testbed/card-reveal-effect` at desktop+mobile. (preview-b)
8. `docs-sync`: update `docs/architecture/game-mechanics.md:35`.
9. Checks: `npm run typecheck`, `npm run lint`, `npm test`.
10. Commit, stop, ask the user to type `continue`.

Model escalation: steps 4, 5 need sonnet (precedence logic, reduced-motion branch).

## Test plan
- tester-a (logic, first):
  - `island-discovery.reducer.test.ts`: first-ever discovery with a card drawn pushes one `CardRevealAnimation` with the tile's `x`/`y`; scout reveal, hand-full, and empty-deck branches push none.
  - `card-acquisition.reducer.test.ts`: roll of 3/6 with a card drawn pushes one entry with `payload.x`/`payload.y`; roll without 3/6, hand-full, and empty-deck branches push none; existing `{roll}`-only calls updated to `{roll, x, y}`.
  - `game-rules.reducer.test.ts:273`: updated call site compiles and still asserts its existing behavior.
  - `player-turn.reducer.test.ts`: `handleEndTurn` filters out a `cardRevealAnimations` entry older than `REVEAL_ANIMATION_DURATION_MS`, keeps a fresh one.
  - `game-board.map.test.ts`: updated `specialIslandRoll` literals still pass `hasActiveDialogOrPendingAction`.
  - `game-board.engine.hook.test.ts`: schedules a card-reveal cleanup after the remaining time; does not schedule the same id twice; the lowest human seat clears it via `clearCardRevealAnimations`, a higher seat does not.
  - `game-board.engine.service.test.ts`: `clearCardRevealAnimations` calls `updateDoc` with `{ cardRevealAnimations: remaining }`; empty array; resolves; propagates errors; preserves `id`/`createdAt`.
  - `IslandTile.hook.test.ts`: finds `cardRevealAnimationOnTile` at matching coords within duration; not at different coords; not when expired; `prefersReducedMotion` reflects `window.matchMedia` (mock `matches: true` and `false`).
  - `CardRevealEffect.hook.test.ts`: starts visible; hides after `REVEAL_ANIMATION_DURATION`; computes remaining time from `createdAt`; min-100ms floor; `freshSpriteSrc` includes `?anim=<id>`; resets on `id`/`createdAt` change; clears timeout on unmount.
- tester-b (view and e2e):
  - `CardRevealEffect.test.tsx`: renders `/sprites/special_island_reveal.gif?anim=<id>` with `alt="Card revealed"`; not in document once hidden.
  - `IslandTile.test.tsx`: Special island with no active entry shows `alt="Special island"` idle image, not a `Star`/icon; with an active `cardRevealAnimationOnTile` and `prefersReducedMotion: false`, renders `CardRevealEffect` and not the idle image; with an active entry and `prefersReducedMotion: true`, renders only the idle image; fogged special island still shows `HelpCircle`, not idle or reveal art.
  - No new Playwright spec (see Decisions).

## Preview states
- `IslandTile` (`/testbed/island-tile`): existing "Special island" state now shows idle art (no fixture change needed — the `Star` icon removal is enough); new "Special island, mid-reveal" (`cardRevealAnimationOnTile` set, fresh `createdAt`); new "Special island, reveal finished (animation expired)" (`cardRevealAnimationOnTile: undefined` — visually identical to idle, since the hook already filtered the expired entry before producing a view model; the state exists to satisfy ui-design's named acceptance criterion).
- `CardRevealEffect` (`/testbed/card-reveal-effect`, new): Fresh animation / Halfway through / Near end / No creation time (instant visible) — mirrors `DeathEffect`'s 4 states exactly.

## Risks
- Signature change to `handleRollOnSpecialIsland` breaks 5 existing test call sites (`card-acquisition.reducer.test.ts` ×4, `game-rules.reducer.test.ts` ×1) — listed explicitly in the File plan and Test plan so tester-a doesn't miss one and leave `npm test` red.
- The engine-hook edit (`game-board.engine.hook.ts`) sits directly beside the existing, working death-animation effect — a mis-scoped `useEffect` dependency array could break that regression-tested code. Flagged for sonnet in Phase 1.
- Reduced motion is new ground in `map/components` (per ui-design.md) — the `IslandTile.test.tsx` reduced-motion case is the one place correctness is enforced; flagged for sonnet in Phase 2.

## Review (architect-b)

Re-verified every citation in "Verified context" and the File plan against the real files this session (not just grepped for old paths — read each one):

- `DeathAnimation` (`src/lib/types/combat.ts:26-31`), `GameState.deathAnimations` (`src/lib/types/game.ts:63`), `SpecialIslandRollDialogState` (`src/lib/types/dialogs.ts:14-18`) — exact shapes confirmed, no `x`/`y` on the dialog state today as claimed.
- `revealIsland` (`island-discovery.reducer.ts`): card-drawn push point at line 63 (`player.specialCards.push(drawnCardResult)`), inside the `tile.type === IslandType.Special && !isScout` branch, itself inside the hand-full/empty-deck guard chain — matches plan's "success branch only" description exactly.
- `handleRollOnSpecialIsland` (`card-acquisition.reducer.ts:90`) signature `payload?: { roll?: number }` confirmed; card-drawn push point at line 121-122 (`cardDrawn = drawnCardResult`) confirmed inside the `roll === 3 || roll === 6` branch, itself inside the same hand-full/empty-deck guard shape.
- `DeathEffect.tsx/.hook.ts/.types.ts/.styles.ts` read in full: key-remount + cache-bust query param, `createdAt`-elapsed math, `setTimeout` hide, fixed `width={64} height={64}` — all confirmed exactly as plan states, including the 64px sizing problem that justifies the sibling component instead of a parameterized `DeathEffect`.
- `IslandTile.hook.ts:26-33` `deathAnimationOnTile` matching pattern, `IslandTile.tsx:39-67` `getTileCenterContent`'s fog-precedence and `Star` case, `IslandTile.styles.ts` `specialIcon`/`centerContent` — all confirmed at the cited locations.
- `game-board.engine.hook.ts` scheduled-clear effect (`anim.createdAt + 1250 - Date.now()` inline buffer, `scheduledDeathAnimations` ref, `eslint-disable-next-line react-hooks/exhaustive-deps`) and `game-board.engine.service.ts`'s `clearDeathAnimations` — confirmed verbatim.
- `player-turn.reducer.ts:7` `DEATH_ANIMATION_DURATION_MS = 2000` and the `handleEndTurn` filter at `:119-124` — confirmed exact lines.
- `game-setup.reducer.ts`'s initial-state literal and `board-context.fixtures.ts`'s `buildGameState` — both confirmed missing `cardRevealAnimations`, both already carry `deathAnimations: []` as the sibling field to mirror.
- `game-board.tile-click.hook.ts:84` and `GameDialogManager.tsx:138` — exact dispatch/action-payload lines confirmed via grep, matching the plan's contract pseudocode precisely.
- `game-board.actions.hook.ts:42-52` `realTimeActions` already includes `RollOnSpecialIsland` — confirmed, so no extra sync work is needed as the plan states.
- `MapGrid.tsx:50` clamp values, `LobbyBackground.hook.ts:13-17` reduced-motion convention (`REDUCED_MOTION_QUERY`, `window.matchMedia(...).matches`) — confirmed verbatim; the plan correctly reuses this convention instead of inventing a second one.
- `IslandTile.test.tsx:131-149` existing "star icon" test, `game-board.map.test.ts:86,152` and `SpecialIslandRollDialog.fixtures.ts`'s three dialog-state literals (all missing `x`/`y` today) — confirmed.
- `card-acquisition.reducer.test.ts:141,148,156,164,171` and `game-rules.reducer.test.ts:273` — grepped every `handleRollOnSpecialIsland(...)` call site in the repo; exactly these six calls exist and all pass only `{ roll }` or `{ roll: n }`, matching the plan's "5 existing test call sites" risk note (4 + 1, the sixth being the one at `:171` the plan groups with the others).
- `DeathEffect.preview.tsx` and `testbed/registry.ts:3,52` (import + `previews` array entry) — confirmed exact shape to mirror for `CardRevealEffect.preview.tsx`.
- `IslandTile.preview.shared.tsx:17-31` `createViewModel` — confirmed missing `deathAnimationOnTile` default is already present at this shape; needs the two new fields added as stated.
- `docs/architecture/game-mechanics.md:35` — confirmed this is the exact "Special Islands:" bullet to update.
- `CombatDialog.fixtures.ts`, `MonsterCombatDialog.fixtures.ts`, `AbilitiesDialog.fixtures.ts` — confirmed all three cast `as unknown as GameState` and never read `cardRevealAnimations`, so the Decisions section's call to leave them untouched is correct.
- Sprites on disk: `special_island_idle.png` is 185×173 PNG RGBA, `special_island_reveal.gif` is 186×179 GIF — both confirmed with `file`, matching the plan's stated dimensions exactly.
- Repo-wide sweep for any other `deathAnimations:` literal outside the File plan's scope (`grep -rln "deathAnimations:"`) found only the three already-exempted dialog fixtures plus the five files already in the File plan — no missed call site.

No invented paths or symbols found. Design holds up:
- Sibling `CardRevealEffect` component over a parameterized `DeathEffect` is the right call — `DeathEffect` has exactly one caller today and a `sprite`/fixed-`64px` flag would turn one component into two behaviors behind a prop for no reuse benefit.
- Optional `payload` with required inner `x`/`y` on `handleRollOnSpecialIsland` is the minimal signature change that doesn't force dummy coordinates onto defensive/test call sites that don't care about animation.
- Both success-only push points, the turn-boundary safety net, and the engine-side scheduled clear are straight mirrors of the exact, working `deathAnimations` mechanism — no new mechanism invented.
- Phases are correctly sized and split: Phase 1 is pure state/reducer/engine plumbing (verifiable by reducer and hook tests alone, no rendering), Phase 2 is pure rendering (verifiable by view tests and the testbed) — a clean boundary for two sequential test passes (tester-a logic-first, tester-b view-second) matching the `testing` skill's ordering.
- File plan ownership split between implementer-a (types/reducers/hooks/logic) and implementer-b (two view files + one legacy wiring edit) is narrow and avoids overlap; the one shared edit point (`tile-click.hook.ts:84` thread vs. `GameDialogManager.tsx:138` thread) is correctly split by file, not by concern.
- Test plan explicitly lists all 6 call sites that break from the signature change, so tester-a won't leave `npm test` red from a missed one.

One non-blocking observation, not a plan defect: `game-board.tile-click.hook.ts` currently has a stray `console.error('[DEBUG tileClick]', ...)` and a `// TEMP DEBUG — remove before handoff.` comment at lines 75-76, immediately above the line implementer-a will edit (`:84`). This is pre-existing debug code unrelated to this task's scope, not introduced by this plan — flagging so implementer-a notices it while editing nearby lines, but it is not this task's responsibility to remove and is not a reason to request changes here.

VERDICT: APPROVED
