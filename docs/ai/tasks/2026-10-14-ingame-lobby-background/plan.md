# Plan: In-game lobby-style background + toggle

Status: APPROVED
Inputs: triage.md, ui-design.md (Final spec)

## Review (architect-b)
VERDICT: APPROVED

Verified against code before approving (every path/symbol in Verified context and File plan):
- `GameBoard.tsx:21-25` — `GameBoardContent` root div, current off-class `bg-gradient-to-b from-background via-background/95 to-black/90`; `GameBoardSandbox.tsx` reuses `GameBoardContent` itself, no second copy to touch.
- `grep` for the gradient's hex stops and for the dark-gradient literal repo-wide: each appears in exactly one file (`LobbyBackground.styles.ts:3`, `GameBoard.tsx:25`) — File plan's two edit sites are complete, no third duplicate site missed.
- `GameBoardHeader.tsx:1-76`, `.styles.ts:1-37`, `.types.ts:1-21`, `.hook.ts:1-23`, `.map.ts:1-28`, `.fixtures.ts`, `.preview.tsx`, `.hook.test.ts`, `.test.tsx` — all read in full; `rightGroup`/`turnIndicatorWrapper` shapes, the `ViewModel`/`ViewProps` split, and every existing fixture/test/preview entry match the plan's description exactly (line numbers are close enough that no cited claim is wrong).
- `toast-store.ts:99-167`, `use-toast.ts:1-21` — listener-array + dispatch + subscribe-on-mount shape confirmed; the new store/hook is a faithful structural copy, not a new pattern.
- `TutorialBeacon.tsx:19-38`, `player.hook.ts:67,158` — default-then-correct-in-effect and plain-string `localStorage` convention both confirmed as cited.
- `GameLog.tsx:53-57`, `ActionButton.tsx:34-51`, `switch.tsx:1-29`, `tooltip.tsx:1-30`, `layout.tsx:6,29` — `Switch`+`aria-label` precedent, `Tooltip`/`TooltipTrigger asChild` wrapping the focusable element precedent, primitive internals (no forced disabled, built-in focus ring and thumb transform), and the app-level `TooltipProvider` all confirmed.
- `lucide-react/dist/esm/icons/image.js` exists. `eslint.config.mjs:12-24` confirms `src/features/**` is in `LEGACY_PATHS` (unlinted, still typechecked) as claimed.
- `game-board.types.ts:44-64`, `.reducer.ts:126-129` — `RESET_TURN_UI` spreading back to `initialUIState` every turn confirmed; correctly rules out `GameBoardUIState` as the preference's home.
- `docs/architecture/structure-and-state.md:14` — the `shared/` description sentence is exactly where docs-sync's edit lands.
- `src/modules/shared/index.ts:1-9`, `use-is-mobile.ts:1-19` — confirmed `useIsMobile` has no cross-component persistence, so it isn't a simpler existing mechanism the plan overlooked in favor of a new store; `toast-store.ts` is the right model given two unrelated call sites (header, legacy board) need the same live value.

Design: no simpler option available — a new Context provider would be heavier than reusing the proven listener-array shape, and would require threading through the legacy `GameBoard.tsx`, a bigger edit than two independent hook calls. Responsibilities split cleanly (store/hook pure logic vs. view wiring vs. docs), owners don't overlap. Phases are small (4 new/edited files in phase 1, all logic; HUD wiring + legacy touch + docs in phase 2). The "hydrate once" risk (two `useBoardBackground()` call sites) is explicitly named with its test coverage. Preview states (on/off) and acceptance criteria map 1:1 to the ui-design.md spec. No invented paths found.

## Goal and acceptance criteria
- [ ] On first load with no stored preference, the in-game board's root background shows the lobby's sky gradient (`#2a1b3d` → `#5c2f3a` → `#a85a3b` → `#d98b4c`) and the header's toggle Switch is checked/on.
- [ ] Clicking the toggle Switch switches the board's root background to today's dark gradient (`from-background via-background/95 to-black/90`) and the Switch moves to unchecked/off, with no change to the map, HUD panels, or any other element.
- [ ] Reloading the page after toggling off keeps the background off (persists across reloads, device-local).
- [ ] At 390px width, the toggle's text label `Background` is hidden but the Switch and its icon are visible, and the full `MAP_COLS` x `MAP_ROWS` map grid stays unobstructed.
- [ ] Tabbing to the Switch shows a visible focus ring; pressing Space toggles it.
- [ ] The Switch's accessible name is `Toggle sky background` at both breakpoints.

## Verified context
| Symbol or file | Location | Why it matters |
|---|---|---|
| `GameBoardContent` root div | `src/features/game/components/GameBoard.tsx:25` | Current "off" class `bg-gradient-to-b from-background via-background/95 to-black/90`; this is where the conditional swap happens. Legacy, in `LEGACY_PATHS` (`eslint.config.mjs:13`), so edits here aren't linted but must still typecheck. |
| `GameBoardHeader` `rightGroup` | `src/modules/hud/components/GameBoardHeader/GameBoardHeader.tsx:54-69` | New toggle pill is inserted here, before `turnIndicatorWrapper`'s `div` (line 56), not gated by `isPlaying`. |
| `styles.turnIndicatorWrapper` / `styles.rightGroup` / `styles.turnLabel` | `src/modules/hud/components/GameBoardHeader/GameBoardHeader.styles.ts:13-15` | Pill reuses `turnIndicatorWrapper`'s classes verbatim; `rightGroup` has no `flex-wrap` itself — `root` (`GameBoardHeader.styles.ts:4`) is what wraps on narrow widths (ui-designer-b's correction). |
| `GameBoardHeaderViewProps` / `GameBoardHeaderViewModel` | `src/modules/hud/components/GameBoardHeader/GameBoardHeader.types.ts:6-21` | `ViewProps` is where hook-sourced, non-gameState fields live (`isExiting`, `onExitClick`, `onStartGame` already follow this shape) — `isBackgroundOn`/`onToggleBackground` join them here, not in the `ViewModel` (which is a pure map of `GameState`). |
| `useGameBoardHeader` | `src/modules/hud/components/GameBoardHeader/GameBoardHeader.hook.ts:5-23` | Assembles `ViewProps`; adds the new fields from the shared hook. |
| `GameBoardHeader.fixtures.ts` / `GameBoardHeader.preview.tsx` | same folder | Every `...Props` fixture needs the two new fields; preview registers 2 more states. |
| `styles.sky` | `src/modules/lobby/components/LobbyBackground/LobbyBackground.styles.ts:3` | Literal `bg-[linear-gradient(180deg,#2a1b3d_0%,#5c2f3a_42%,#a85a3b_70%,#d98b4c_100%)]` — the exact "on" value, extracted to a shared constant. No test or preview asserts on this literal's text (`LobbyBackground.test.tsx`, `LobbyBackground.preview.tsx` both grep-clean of `sky`/`gradient`). |
| `toast-store.ts` + `use-toast.ts` | `src/modules/shared/toast-store.ts:99-167`, `src/modules/shared/use-toast.ts:1-21` | Module-level `listeners` array + `dispatch`, consumed by a hook that `useState`s the module's current value and resubscribes in an effect — the pattern the new store/hook pair follows, for cross-component sync between `GameBoardHeader` and `GameBoard.tsx` without a new context. |
| `TutorialBeacon` | `src/modules/hud/components/TutorialBeacon/TutorialBeacon.tsx:19-38` | Default-then-correct-in-effect: `useState(true)`, then `useEffect` reads `localStorage.getItem` and corrects. Same shape for the new hook's hydration step. |
| `username` key | `src/modules/session/player.hook.ts:67,158` | Plain-string `localStorage` value (not JSON) is the repo's convention for a single preference; the new key follows it. |
| `GameLog` Switch | `src/modules/hud/components/GameLog/GameLog.tsx:51-57` | `Switch` + adjacent text label + `aria-label`, no visible label needed for a11y — exact precedent for the new pill's `Switch`. |
| `ActionButton` Tooltip | `src/modules/hud/components/ActionsPanel/ActionButton.tsx:34-46` | `Tooltip`/`TooltipTrigger asChild`/`TooltipContent` wraps the focusable element directly, not a wrapping `div` — same wiring for the new `Switch`. |
| `Switch` primitive | `src/components/ui/switch.tsx:8-29` | `focus-visible:ring-2`, `data-[state=checked]`/`data-[state=unchecked]` thumb transform, no forced `disabled` — no overrides needed. |
| `TooltipProvider` | `src/app/layout.tsx:29` | Already wraps the whole app — the new `Tooltip` needs no extra provider in the app, only in its own test file (`GameBoardHeader.test.tsx`), matching `ActionsPanel.test.tsx:14-16`'s render-wrapper pattern. |
| `GameBoardHeader.hook.test.ts` | `src/modules/hud/components/GameBoardHeader/GameBoardHeader.hook.test.ts:6-9` | Already `jest.mock`s `@/modules/game-board`; needs a second `jest.mock('@/modules/shared', ...)` for `useBoardBackground`. |
| `GameBoardHeader.test.tsx` | `src/modules/hud/components/GameBoardHeader/GameBoardHeader.test.tsx:1-23` | Renders `GameBoardHeaderView` with no `TooltipProvider` wrapper today — must add one once the view renders a `Tooltip`. |
| `GameBoardUIState` / `RESET_TURN_UI` | `src/modules/game-board/game-board.types.ts:44-64`, `src/modules/game-board/game-board.reducer.ts:126-129` | Confirms the per-turn UI reducer is the wrong home for this preference: `RESET_TURN_UI` spreads back to `initialUIState` every turn, which would silently discard the player's choice. |
| `shared/` module description | `docs/architecture/structure-and-state.md:14` | Lists `shared/`'s current contents (`toPlayerIdleSprite`, `useToast`, `useIsMobile`) — needs the new files added (docs-sync). |
| `Image` icon | `node_modules/lucide-react/dist/esm/icons/image.js` | Verified present (ui-designer-b); used as the pill's icon. |

## Decisions
- New preference lives in a module-level store (`board-background-store.ts`) + hook (`use-board-background.ts`) in `src/modules/shared`, mirroring `toast-store.ts`/`use-toast.ts`, because `GameBoardHeader` (reads `useGameBoard()` context) and `GameBoard.tsx` (legacy, renders the root div) are not parent/child in a way that lets one `useState` serve both without new plumbing. Rejected: a new React Context provider for one boolean (more code than reusing the proven listener-array shape, and `GameBoard.tsx` is legacy — adding a provider there is a bigger, riskier edit than two independent hook calls).
- Preference stored as a plain `'true'`/`'false'` string under one `localStorage` key (`board-background-enabled`), not JSON — matches the `username` convention (`player.hook.ts:67,158`). Rejected: `JSON.stringify`/`JSON.parse` (unneeded for a single boolean, inconsistent with repo convention).
- Gradient literal extracted to `src/modules/shared/sky-gradient.ts` as a single exported string constant (`SKY_GRADIENT_CLASS`), imported by both `LobbyBackground.styles.ts` and the legacy `GameBoard.tsx`. Rejected: duplicating the literal in `GameBoard.tsx` (exactly the drift risk the triage flagged).
- The preference is not added to `GameBoardUIState`/`GameState` — confirmed wrong home (see `RESET_TURN_UI` above) and explicitly out of scope per triage (no Firestore field, no per-match setting).
- `isBackgroundOn`/`onToggleBackground` are added to `GameBoardHeaderViewProps` (hook-assembled), not `GameBoardHeaderViewModel` (pure `GameState` map) — same split `isExiting`/`onExitClick`/`onStartGame` already use.

## File plan
| File | New / Edit | Responsibility | Owner |
|---|---|---|---|
| `src/modules/shared/sky-gradient.ts` | new | Exports `SKY_GRADIENT_CLASS`, the single source for the lobby/board sky gradient | implementer-a |
| `src/modules/shared/board-background-store.ts` | new | Module-level store: `getBoardBackgroundEnabled`, `hydrateBoardBackgroundFromStorage`, `setBoardBackgroundEnabled`, `subscribeToBoardBackgroundState` | implementer-a |
| `src/modules/shared/use-board-background.ts` | new | `useBoardBackground()` hook: subscribes to the store, hydrates from `localStorage` once per mount | implementer-a |
| `src/modules/shared/index.ts` | edit | Export `useBoardBackground` and `SKY_GRADIENT_CLASS` | implementer-a |
| `src/modules/lobby/components/LobbyBackground/LobbyBackground.styles.ts` | edit | Replace the inline gradient literal in `sky` with `SKY_GRADIENT_CLASS` | implementer-b |
| `src/modules/shared/board-background-store.test.ts` | new | Store tests: default `true`, `set` persists and notifies listeners, `hydrate` reads a stored `'false'`, subscribe/unsubscribe | tester-a |
| `src/modules/shared/use-board-background.test.ts` | new | Hook tests: initial value, `setBackgroundOn` updates every subscribed instance, hydration from `localStorage` on mount | tester-a |
| `src/modules/hud/components/GameBoardHeader/GameBoardHeader.types.ts` | edit | Add `isBackgroundOn: boolean` and `onToggleBackground: (enabled: boolean) => void` to `GameBoardHeaderViewProps` | implementer-a |
| `src/modules/hud/components/GameBoardHeader/GameBoardHeader.hook.ts` | edit | Call `useBoardBackground()`; add its fields to the returned `ViewProps` | implementer-a |
| `src/modules/hud/components/GameBoardHeader/GameBoardHeader.fixtures.ts` | edit | Add `isBackgroundOn`/`onToggleBackground` to every `...Props` export; add `backgroundOnProps`/`backgroundOffProps` for the new preview states | implementer-a |
| `src/modules/hud/components/GameBoardHeader/GameBoardHeader.tsx` | edit | Add the background-toggle pill (icon, label, `Switch` wrapped in `Tooltip`) to `rightGroup`, before `turnIndicatorWrapper`, ungated by `isPlaying` | implementer-b |
| `src/modules/hud/components/GameBoardHeader/GameBoardHeader.styles.ts` | edit | Add `backgroundIcon` class (`h-3.5 w-3.5 text-muted-foreground`, matching `turnTimerIcon`'s size) | implementer-b |
| `src/features/game/components/GameBoard.tsx` | edit | Call `useBoardBackground()`; swap the root div's background class conditionally via `cn()` | implementer-b |
| `src/modules/hud/components/GameBoardHeader/GameBoardHeader.preview.tsx` | edit | Add "Background on" / "Background off" preview states | preview-a |
| `src/modules/hud/components/GameBoardHeader/GameBoardHeader.hook.test.ts` | edit | `jest.mock('@/modules/shared', ...)` for `useBoardBackground`; assert `isBackgroundOn`/`onToggleBackground` pass through unchanged | tester-a |
| `src/modules/hud/components/GameBoardHeader/GameBoardHeader.test.tsx` | edit | Wrap renders in `TooltipProvider`; add toggle tests (checked/unchecked rendering, click calls `onToggleBackground`, accessible name, label hidden under `sm`) | tester-b |
| `docs/architecture/structure-and-state.md` | edit | Line 14: add `board-background-store.ts`/`use-board-background.ts`/`sky-gradient.ts` to the `shared/` description; note `GameBoard.tsx`'s conditional background | docs-sync |

## Contracts
```ts
// src/modules/shared/sky-gradient.ts
/** The lobby's sky-gradient Tailwind background class — the in-game board's "on" state reuses it verbatim. */
export const SKY_GRADIENT_CLASS: string; // 'bg-[linear-gradient(180deg,#2a1b3d_0%,#5c2f3a_42%,#a85a3b_70%,#d98b4c_100%)]'

// src/modules/shared/board-background-store.ts
/** localStorage key holding 'true' | 'false'. */
export const BOARD_BACKGROUND_STORAGE_KEY = 'board-background-enabled';

/** Current in-memory value (module default: true, corrected by hydrateBoardBackgroundFromStorage). */
export function getBoardBackgroundEnabled(): boolean;

/** Reads localStorage once (no-op after the first call, and a no-op on the server); if the stored
 *  value differs from the in-memory default, updates it and notifies subscribers. Called from the
 *  hook's mount effect, not at module load (avoids a server/client hydration mismatch). */
export function hydrateBoardBackgroundFromStorage(): void;

/** Sets the in-memory value, persists it to localStorage, and notifies every subscriber. */
export function setBoardBackgroundEnabled(enabled: boolean): void;

/** Subscribes `listener` to every change (mirrors subscribeToToastState); returns an unsubscribe function. */
export function subscribeToBoardBackgroundState(listener: (enabled: boolean) => void): () => void;

// src/modules/shared/use-board-background.ts
export interface UseBoardBackgroundResult {
  isBackgroundOn: boolean;
  setBackgroundOn: (enabled: boolean) => void;
}

/** useState(getBoardBackgroundEnabled()); on mount, calls hydrateBoardBackgroundFromStorage() then
 *  re-reads the current value, and subscribes for the component's lifetime. */
export function useBoardBackground(): UseBoardBackgroundResult;

// src/modules/shared/index.ts — add these two exports to the existing list
export { useBoardBackground } from './use-board-background';
export { SKY_GRADIENT_CLASS } from './sky-gradient';

// src/modules/hud/components/GameBoardHeader/GameBoardHeader.types.ts — GameBoardHeaderViewProps gains:
export interface GameBoardHeaderViewProps extends GameBoardHeaderViewModel {
  isExiting: boolean;
  onExitClick: () => Promise<void>;
  onStartGame: () => Promise<void>;
  isBackgroundOn: boolean; // new
  onToggleBackground: (enabled: boolean) => void; // new — passed directly as Switch's onCheckedChange
}

// src/modules/hud/components/GameBoardHeader/GameBoardHeader.hook.ts — useGameBoardHeader additionally:
// const { isBackgroundOn, setBackgroundOn } = useBoardBackground();
// ...returns { ...existing, isBackgroundOn, onToggleBackground: setBackgroundOn }
```

### `GameBoardHeaderView` markup contract (implementer-b)
**Amended during phase 2 build (deviation from ui-design.md's Final spec, reviewed and approved — see progress.md's log):** drop the `Tooltip`/`TooltipTrigger`/`TooltipContent` wrapping. Radix `TooltipTrigger`'s own `data-state="closed"` attribute overwrites the Radix `Switch`'s `data-state` (`checked`/`unchecked`), which the `Switch` primitive uses to pick its track color (`switch.tsx:14`'s `data-[state=checked]:bg-primary`/`data-[state=unchecked]:bg-input`) — with the wrapper, the track rendered transparent in both states, confirmed by preview-a's headless screenshots of both the "Background on" and "Background off" testbed states. Fixed by removing the `Tooltip` wrapper entirely rather than the alternative (a non-Tooltip `span` wrapper to carry a hover title): no acceptance criterion requires the hover/focus hint, only the accessible name, which `aria-label="Toggle sky background"` on the `Switch` itself already satisfies (ui-design.md's Accessibility section already frames the Tooltip as "only for the hover/focus hint, not... the accessible name"). `docs/architecture/systems-and-visuals.md` §6.7 and `structure-and-state.md`'s `shared/`/`GameBoardHeader` entries correctly document the toggle without mentioning a tooltip (confirmed in phase 2's final review).

Inside `rightGroup`, before the existing `isPlaying && <div className={styles.turnIndicatorWrapper}>...` block, add (ungated by `isPlaying`):
```tsx
<div className={styles.turnIndicatorWrapper}>
  <ImageIcon className={styles.backgroundIcon} aria-hidden="true" />
  <span className={styles.turnLabel}>Background</span>
  <Switch
    checked={isBackgroundOn}
    onCheckedChange={onToggleBackground}
    aria-label="Toggle sky background"
  />
</div>
```
Imports to add in `GameBoardHeader.tsx`: `ImageIcon` from `lucide-react` (alongside the existing `ArrowLeft, Play, Trophy, Loader2, Timer` — `ImageIcon` over the contract's original `Image`, since `Image` would shadow the DOM global; `lucide-react` exports both as aliases of the same icon), `Switch` from `@/components/ui/switch`. No `Tooltip` import.

### `GameBoard.tsx` wiring contract (implementer-b)
```tsx
import { cn } from '@/lib/utils';
import { useBoardBackground, SKY_GRADIENT_CLASS } from '@/modules/shared';
// ...
const { isBackgroundOn } = useBoardBackground();
// root div:
className={cn(
  'relative flex min-h-screen lg:h-screen lg:max-h-screen w-full flex-col gap-2 overflow-y-auto lg:overflow-hidden p-2 sm:p-3',
  isBackgroundOn ? SKY_GRADIENT_CLASS : 'bg-gradient-to-b from-background via-background/95 to-black/90',
)}
```

## Phases
### Phase 1: Shared preference + gradient constant
1. Create `src/modules/shared/sky-gradient.ts` exporting `SKY_GRADIENT_CLASS` (implementer-a).
2. Create `src/modules/shared/board-background-store.ts` per the contract (implementer-a).
3. Create `src/modules/shared/use-board-background.ts` per the contract (implementer-a).
4. Add both exports to `src/modules/shared/index.ts` (implementer-a).
5. Edit `LobbyBackground.styles.ts`'s `sky` to use `SKY_GRADIENT_CLASS` (implementer-b).
6. Write `board-background-store.test.ts` (tester-a, first — logic before view).
7. Write `use-board-background.test.ts` (tester-a).
8. Run `npm run typecheck`, `npm run lint`, `npx jest src/modules/shared src/modules/lobby/components/LobbyBackground`.
9. Commit, then stop and ask the user to type `continue`.

Model escalation: none — straight pattern reuse of `toast-store.ts`/`use-toast.ts`, no new logic shape.

### Phase 2: HUD toggle + legacy wiring
1. Edit `GameBoardHeader.types.ts` to add the two new `ViewProps` fields (implementer-a).
2. Edit `GameBoardHeader.hook.ts` to call `useBoardBackground()` and return the new fields (implementer-a).
3. Edit `GameBoardHeader.fixtures.ts`: add the two fields to every existing `...Props` export, plus `backgroundOnProps`/`backgroundOffProps` (implementer-a).
4. Edit `GameBoardHeader.styles.ts` to add `backgroundIcon` (implementer-b).
5. Edit `GameBoardHeader.tsx` per the markup contract (implementer-b).
6. Edit `src/features/game/components/GameBoard.tsx` per the wiring contract (implementer-b).
7. Edit `GameBoardHeader.hook.test.ts`: mock `@/modules/shared`'s `useBoardBackground`, assert passthrough (tester-a, first).
8. Edit `GameBoardHeader.test.tsx`: add the toggle's view tests (tester-b). No `TooltipProvider` wrapper needed — amended, see the markup contract above.
9. Edit `GameBoardHeader.preview.tsx`: register the two new states, using the new fixtures (preview-a).
10. Run `npm run typecheck`, `npm run lint`, `npx jest src/modules/hud/components/GameBoardHeader`.
11. `docs-sync` edits `docs/architecture/structure-and-state.md:14`.
12. UI-verify at 1280x720 and 390x844 (both acceptance criteria breakpoints) with the testbed's "Background on"/"Background off" states, and the live board if feasible.
13. Commit, then stop and ask the user to type `continue`.

Model escalation: none — reuses the existing `Switch` precedent (`GameLog.tsx`), no new visual pattern beyond the approved pill. (The `Tooltip` precedent from `ActionButton.tsx` was dropped during the build — see the markup contract's amendment note.)

## Test plan
- tester-a (logic, first):
  - `board-background-store.test.ts`: `getBoardBackgroundEnabled()` defaults to `true`; `setBoardBackgroundEnabled(false)` updates the in-memory value, writes `'false'` to `localStorage`, and notifies subscribers; `subscribeToBoardBackgroundState` returns a working unsubscribe; `hydrateBoardBackgroundFromStorage()` with a stored `'false'` flips the value and notifies once, is a no-op on a second call.
  - `use-board-background.test.ts`: `renderHook(() => useBoardBackground())` returns `{ isBackgroundOn: true, setBackgroundOn }` by default; calling `setBackgroundOn(false)` updates `result.current.isBackgroundOn`; a second `renderHook` instance picks up a change made via the first instance's `setBackgroundOn` (cross-instance sync); with `localStorage` pre-seeded to `'false'` before mount, the hook settles on `false` after its effect runs.
  - `GameBoardHeader.hook.test.ts`: mocked `useBoardBackground` returning `{ isBackgroundOn: false, setBackgroundOn: fn }` surfaces as `result.current.isBackgroundOn === false` and `result.current.onToggleBackground === fn`.
- tester-b (view and e2e):
  - `GameBoardHeader.test.tsx` (no `TooltipProvider` needed — amended, see markup contract): Switch is checked when `isBackgroundOn` is `true`, unchecked when `false`; clicking the Switch calls `onToggleBackground` with the opposite boolean; the Switch's accessible name is `Toggle sky background` (`getByRole('switch', { name: 'Toggle sky background' })`); the `Background` text label is present (desktop fixture renders it, since `hidden sm:inline` is a CSS class, not conditional markup — assert the text node exists in the DOM, not visibility, matching how `turnLabel` is already tested if at all — otherwise skip a visibility assertion jsdom can't evaluate).
  - No e2e spec: out of scope per triage (client-only cosmetic preference, no documented game-rule flow to add to `e2e/`).

## Preview states
- `GameBoardHeader`: add "Background on" (`backgroundOnProps`, reuses `waitingCanStartViewModel`/`...Props` base with `isBackgroundOn: true`) and "Background off" (`backgroundOffProps`, same base with `isBackgroundOn: false`) to the existing 8 states.

## Risks
- `hydrateBoardBackgroundFromStorage` running from two independent `useBoardBackground()` call sites (header + legacy board) must guard itself (an internal "already hydrated" flag) so it reads `localStorage` once, not twice, and doesn't double-notify; covered by the store's own test ("second call is a no-op").
- ~~`GameBoardHeader.test.tsx`'s existing renders will throw once the view renders a bare `Tooltip` without a `TooltipProvider` ancestor~~ — moot: the `Tooltip` wrapper was dropped during the phase 2 build (Radix `Tooltip`/`Switch` `data-state` conflict; see the markup contract's amendment note), so no `TooltipProvider` wrapper is needed anywhere in this component.
