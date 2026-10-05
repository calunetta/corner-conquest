# Plan: Mobile actions-panel reachability (sticky bottom bar + sheet)

Status: APPROVED
Inputs: triage.md, ui-design.md (Final spec)

## Goal and acceptance criteria
Implement `ui-design.md`'s Final spec: on mobile (`useIsMobile()`, `<768px`), `ActionsPanel` renders as a fixed bottom bar (Position/Attack/Deploy/End Turn always visible, Cancel/Deselect/extra-move banner when relevant) plus a `Sheet` for secondary actions (Upgrade/Buy Card/Cards/Abilities). Desktop (`ActionsPanelView`) is byte-for-byte unchanged. Acceptance criteria are `ui-design.md`'s Final-spec checklist (lines 148-159), restated here for traceability:
- [ ] At 390×844, End Turn, Position, Attack, Deploy are all visible with no scrolling.
- [ ] At 390×844 default (sheet closed), no element of the bar covers `MapGrid`.
- [ ] Every Row 2 button ≥44×44px, full label (incl. "Deploy (0 Food)", "End Turn (0:45)") renders with no clipping, at `myTurnNoSelection` and `extraMoveActive`.
- [ ] "More Actions" opens a Sheet with Upgrade/Buy Card/Cards/Abilities + "Cards left in deck: N" + info beacon.
- [ ] Closing the Sheet (X / outside tap / Escape) returns focus to the trigger and restores bar-only view.
- [ ] `prefers-reduced-motion: reduce` suppresses the Sheet's slide transition.
- [ ] `cardActionInProgress`: Cancel in the bar; Position/Attack/Deploy/End Turn disabled, each showing its `disabledReason` as visible text.
- [ ] `armySelectedCanAttack`: Deselect in the bar; Attack enabled; disabled Position shows its reason as visible text.
- [ ] `extraMoveActive`: banner renders in Row 1, one line, not truncated to meaninglessness.
- [ ] `isMyTurn: false`: no End Turn/Cancel/Deselect; Position/Attack/Deploy disabled with visible-text reasons.
- [ ] At 1280×720, `ActionsPanel` is visually identical to today (no diff attributable to this change).
- [ ] Scrolling to `GameLog` never hides its content behind the fixed bar.

## Verified context
| Symbol or file | Location | Why it matters |
|---|---|---|
| `ActionsPanelView` (desktop view, unchanged) | `src/modules/hud/components/ActionsPanel/ActionsPanel.tsx:19-121` | Stays untouched except the `ActionsPanelViewProps` interface moves out (see File plan). |
| `ActionsPanel` connected component | `ActionsPanel.tsx:124-127` | Adds the `useIsMobile()` branch here. |
| `interface ActionsPanelViewProps` (local, to be moved) | `ActionsPanel.tsx:14-16` | Currently `ActionsPanelViewModel & { infoBeacon?: ReactNode }`; `MobileActionsBar` needs the identical shape — move to `.types.ts` and reuse, don't duplicate. |
| `ActionsPanelViewModel`, `ActionViewModel`, `ActionsPanelData`, `ActionsPanelHandlers` | `ActionsPanel.types.ts:6-36` | Full view model already carries every field both the bar and the sheet need. No `.map.ts`/`.hook.ts` logic change required. |
| `useActionsPanel()` | `ActionsPanel.hook.ts:6-67` | Unchanged; both desktop and mobile views consume its return value as-is. |
| `toActionsPanelData()` | `ActionsPanel.map.ts:17-162` | Unchanged; already computes `disabledReason` for every action (line 144-148) and `hasExtraMoveBanner`/`isCancellableActionInProgress`/`isEndTurnDisabled`. |
| `ActionButton` | `ActionButton.tsx:28-51` | Reused unchanged in spirit; gets one new optional prop (see Contracts). Current nesting: `Tooltip > TooltipTrigger(asChild) > div.w-full > Button`. |
| `styles.buttonVariant`, `styles.card`, `styles.endTurnButton`/`endTurnButtonExpiring`/`endTurnProgress*`/`endTurnLabel`/`endTurnTime`, `styles.cancelButton`, `styles.deselectButton`, `styles.extraMoveBanner`, `styles.mainGrid`, `styles.secondaryGrid` | `ActionsPanel.styles.ts:3-41` | `buttonVariant({isMain:true})` gives `h-16 text-xs` (line 31) — spec forbids going below `h-14` for Row 2. **`styles.endTurnButton` itself is `h-7` (line 13, 28px)** — that token is desktop-only and must NOT be reused for mobile Row 2's End Turn cell (see Decisions: new mobile-only container token). The internal tokens (`endTurnProgress*`/`endTurnLabel`/`endTurnTime`/`endTurnButtonExpiring`) stay reusable since they don't encode height. |
| `ActionsPanel.fixtures.ts`: `myTurnNoSelection`, `armySelectedCanAttack`, `cardActionInProgress`, `extraMoveActive` | `ActionsPanel.fixtures.ts:4-135` | Reused verbatim by the new preview/tests; one new fixture (`notMyTurn`) is added, derived from `myTurnNoSelection`. |
| `getDisabledReason` → `"It's not your turn."` | `ActionsPanel.disabledReasons.ts:31` | Exact string for the new `notMyTurn` fixture. Checked first, before any other branch, for every action id — so it applies to `secondaryActions` too, not just main/always-available (see Decisions and Phase step 2). |
| `GameAction.local_ShowCards` ("Cards") not gated on `isMyTurn` | `ActionsPanel.map.ts:123,127` (`disabled: localPlayer.specialCards.length === 0`) | The one secondary action that must stay exactly as in `myTurnNoSelection` in the `notMyTurn` fixture — everything else in `secondaryActions` gets `"It's not your turn."`. |
| `GameBoard.tsx` scroll container / `GameLog` position | `GameBoard.tsx:22` (`overflow-y-auto`), `GameBoard.tsx:64` (`<GameLog />`) | Confirms ui-design's corrected citations; **no edit to this file** — see Decisions. |
| `<aside>` wrapping `ActionsPanel` + `GameLog` | `GameBoard.tsx:53-65` | On mobile this is a normal flex-col block in the page's own `overflow-y-auto` (line 22); nothing here independently clips scroll, so a spacer placed where `ActionsPanel` mounts reserves the room `GameLog` needs. |
| `useIsMobile()` | `src/modules/shared/use-is-mobile.ts:5-19`, exported `src/modules/shared/index.ts:3` | `MOBILE_BREAKPOINT = 768` (line 3). Already called directly inside a `.tsx` elsewhere: `src/features/game/components/PlayerInfoBar.tsx:13`, `src/components/ui/sidebar.tsx:70` — calling it directly in the connected `ActionsPanel()` matches precedent. |
| `Sheet`, `SheetContent` (`side="bottom"`), `SheetHeader`, `SheetTitle` | `src/components/ui/sheet.tsx:10-140`; `side: bottom` variant lines 39-40; no `motion-reduce` anywhere in this file (grepped) | Confirms ui-design Fix 2's claim: reduced motion must be added locally on this feature's own `<SheetContent>`, not inherited. |
| `TooltipProvider` wraps the whole app | `src/app/layout.tsx:29-31` | Previews and the live app never need their own `TooltipProvider`; only test files do (`ActionsPanel.test.tsx:10`). |
| `previews` registry, `ComponentPreview` type | `src/testbed/registry.ts:39-79`, `src/testbed/testbed.types.ts:10-17` | New preview registers here. |
| ESLint `max-lines` (150, blanks/comments excluded) | `eslint.config.mjs:68` | Drives the bar/sheet file split below. |

## Decisions
- Reuse the existing `ActionsPanelViewModel` for the mobile bar and sheet, with zero changes to `.hook.ts`/`.map.ts`, because every field both need (`mainActions`, `alwaysAvailableActions`, `secondaryActions`, `disabledReason`, `turnTimer`, etc.) is already computed. Rejected: a parallel mobile-specific hook/map (duplicates logic the desktop view already has — violates DRY).
- The fixed bar reserves its own scroll space with a sibling spacer `div` (rendered in `MobileActionsBar`'s own natural DOM position, sized to the bar's measured height) instead of lifting the bar's height up into `GameBoard.tsx`. `GameBoard.tsx` renders `<ActionsPanel/>` in the same place as today (inside `<aside>`, right before `<GameLog/>`); the spacer occupies that slot, the bar itself paints `fixed` on top of the viewport. This needs **zero edits to `GameBoard.tsx`**. Rejected: a `ResizeObserver` in `MobileActionsBar` reporting height to `GameBoard.tsx` via a new prop/context (adds a cross-module coupling point — `GameBoard.tsx` doesn't need to know the bar's height, only reserve equivalent space, and it already does by rendering the component where it always has).
- Split the new mobile UI into `MobileActionsBar.tsx` (spacer + fixed bar: Row 1 + Row 2 + "More Actions" trigger) and `MobileActionsSheet.tsx` (the Sheet's content: header + secondary grid) rather than one file, for single responsibility and to stay well under the 150-line lint cap. Rejected: one combined `MobileActions.tsx` (two responsibilities — persistent bar vs. on-demand overlay — in one file; closer to the line cap for no benefit).
- Give `ActionButton` one new optional prop, `disabledReasonVisible?: boolean` (default `false`, so desktop is unaffected), rather than a separate mobile button component, because the spec requires the *same* `ActionButton` for icon/label/variant logic in both the bar and the sheet (ui-design.md "Components and tokens": "the existing `ActionButton`... unchanged for every button in both the bar and the sheet"). Rejected: a `MobileActionButton` wrapper duplicating `actionIconMap`/`buttonVariant` usage (diverges from the spec's explicit reuse instruction, violates DRY).
- `useIsMobile()` is called directly inside the connected `ActionsPanel()` function (not wrapped in a new hook), matching the precedent in `PlayerInfoBar.tsx:13` and `sidebar.tsx:70`. Rejected: a `useActionsPanelViewMode()` pass-through hook (forbidden by kiss-dry-solid: "no files, wrappers or layers that only pass data through").
- Sheet open/closed state is local UI state (`useState`, no app/legacy data), so it lives in a small hook (`useMobileActionsBar`) alongside the height-measurement effect, per component-architecture's "hook manages UI state derived from props" rule — no `NameView`/connected split is needed for `MobileActionsBar` itself, since it already receives its data as props (it IS the pure view for the mobile case, analogous to `ActionsPanelView`).
- One combined `notMyTurn` fixture is added to `ActionsPanel.fixtures.ts` (not invented ad hoc per test file) so the new preview and the new tests share one source of truth, per `kiss-dry-solid`'s "tests and previews share fixtures." It must match real reducer output: `getDisabledReason` returns `"It's not your turn."` first, before any other check, for every action id (`ActionsPanel.disabledReasons.ts:31`) — so `secondaryActions` (Upgrade, BuyCard, Abilities) get `disabled: true, disabledReason: "It's not your turn."` too, same as `mainActions`/`alwaysAvailableActions`. The one exception is Cards (`GameAction.local_ShowCards`), whose `disabled` is `localPlayer.specialCards.length === 0` with no `isMyTurn` check at all (`ActionsPanel.map.ts:123,127`) — it stays exactly as in `myTurnNoSelection` (enabled, 2 cards in hand).
- End Turn is not an `ActionViewModel`/`ActionButton` (`isEndTurnDisabled` is a plain boolean, `ActionsPanel.types.ts:25`; `ActionsPanel.map.ts` computes no `disabledReason` for it) and its only existing style, `styles.endTurnButton`, is `h-7` (28px, `ActionsPanel.styles.ts:13`) — far under the 44px/`h-14` floor Fix 1 requires for the whole Row 2 grid. Mobile Row 2 therefore duplicates the End Turn JSX (`ActionsPanel.tsx:71-94`: the `Button` + progress `span` + label `span`s) inside `MobileActionsBar.tsx`, giving it a new mobile-only container token (`MobileActionsBar.styles.ts`'s `endTurnButtonMobile`, built from `styles.buttonVariant({isMain:true, isPendingMatch:false})` so it matches Row 2's other cells exactly) while reusing the existing internal tokens (`styles.endTurnProgress*`/`endTurnLabel`/`endTurnTime`/`endTurnButtonExpiring`) unchanged from `ActionsPanel.styles.ts`. Rejected: extracting a shared `EndTurnButton` component used by both `ActionsPanelView` and `MobileActionsBar` — it would remove the duplication, but it means editing `ActionsPanelView`'s working desktop JSX for a change that is purely about enabling reuse, which trades a real desktop-regression risk (verified only by screenshot diffing) against saving ~15 lines; with only two call sites that will likely need to diverge further (desktop's `ml-auto` single-row layout vs. mobile's grid-cell layout), `kiss-dry-solid`'s "extract... at the third copy" threshold isn't met, and keeping `ActionsPanelView` byte-for-byte untouched (this plan's explicit goal) outweighs the duplication.

## File plan
| File | New / Edit | Responsibility | Owner |
|---|---|---|---|
| `src/modules/hud/components/ActionsPanel/ActionsPanel.types.ts` | edit | Move the `infoBeacon`-extended view-props interface here as `ActionsPanelViewProps` (exported); add `MobileActionsSheetProps`. | implementer-a |
| `src/modules/hud/components/ActionsPanel/ActionsPanel.fixtures.ts` | edit | Add `notMyTurn` fixture, derived from `myTurnNoSelection`. | implementer-a |
| `src/modules/hud/components/ActionsPanel/MobileActionsBar.hook.ts` | new | Local UI state: measured bar height (`ResizeObserver`) + sheet open/closed. | implementer-a |
| `src/modules/hud/components/ActionsPanel/ActionButton.tsx` | edit | Add optional `disabledReasonVisible` prop; restructure so `Tooltip` wraps only the `Button` (not the outer `div`), and render the static caption as a sibling of the `Tooltip` inside that `div` when `disabledReasonVisible && action.disabled`. | implementer-b |
| `src/modules/hud/components/ActionsPanel/ActionsPanel.styles.ts` | edit | Add `disabledReasonCaption` token, shared by `ActionButton` on mobile and in the sheet. | implementer-b |
| `src/modules/hud/components/ActionsPanel/ActionsPanel.tsx` | edit | Import `ActionsPanelViewProps` from `.types.ts` instead of declaring it locally; connected `ActionsPanel()` calls `useIsMobile()` and renders `MobileActionsBar` or `ActionsPanelView`. | implementer-b |
| `src/modules/hud/components/ActionsPanel/MobileActionsBar.styles.ts` | new | Every Tailwind class for the fixed bar, its rows/grid, the mobile-only `endTurnButtonMobile` container token (≥44px floor), and (imported by) the sheet's motion-reduce override. | implementer-b |
| `src/modules/hud/components/ActionsPanel/MobileActionsBar.tsx` | new | Spacer + fixed bottom bar: Row 1 (Cancel/Deselect/banner, conditional) + "More Actions" trigger + Row 2 (Position/Attack/Deploy ActionButtons + duplicated, mobile-sized End Turn button). Renders `MobileActionsSheet`. | implementer-b |
| `src/modules/hud/components/ActionsPanel/MobileActionsSheet.tsx` | new | The Sheet: header (title + infoBeacon + deck count) + secondary-actions grid. | implementer-b |
| `src/modules/hud/components/ActionsPanel/MobileActionsBar.hook.test.ts` | new | Tests for `useMobileActionsBar` (height measurement, sheet toggle). | tester-a |
| `src/modules/hud/components/ActionsPanel/MobileActionsBar.test.tsx` | new | View tests for the bar (Row 1/Row 2 conditionals, captions, grid column count). | tester-b |
| `src/modules/hud/components/ActionsPanel/MobileActionsSheet.test.tsx` | new | View tests for the sheet (header content, secondary grid, captions, close callback). | tester-b |
| `src/modules/hud/components/ActionsPanel/ActionsPanel.test.tsx` | edit | Add: mobile-branch test (mocking `@/modules/shared`'s `useIsMobile`) asserting `ActionsPanel()` renders `MobileActionsBar` vs `ActionsPanelView`; a desktop regression case confirming no caption renders for a disabled action (ActionButton default `disabledReasonVisible=false`). | tester-b |
| `src/modules/hud/components/ActionsPanel/MobileActionsBar.preview.tsx` | new | Testbed states for the bar+sheet: `myTurnNoSelection`, `armySelectedCanAttack`, `cardActionInProgress`, `extraMoveActive`, `notMyTurn`. | preview-a |
| `src/testbed/registry.ts` | edit | Import + register `mobileActionsBarPreview` (slug `hud-mobile-actions-bar`, group `HUD`). | preview-a |

No `GameBoard.tsx` edit (see Decisions). No `index.ts` edit (`MobileActionsBar`/`MobileActionsSheet` are internal to the `ActionsPanel` folder, not part of the module's public API — only `ActionsPanel` is, unchanged).

### Grep confirmation (no stale references)
`grep -rn "ActionsPanelViewProps" src` today only matches `ActionsPanel.tsx:14`, so moving it to `.types.ts` has exactly one call site to update, in `ActionsPanel.tsx` itself.

## Contracts
```ts
// ActionsPanel.types.ts — add these two exports (ActionsPanelData/Handlers/ViewModel/ActionViewModel unchanged)
export interface ActionsPanelViewProps extends ActionsPanelViewModel {
  infoBeacon?: ReactNode;
}

export interface MobileActionsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  secondaryActions: ActionViewModel[];
  deckCount: number;
  infoBeacon?: ReactNode;
  onActionClick: (id: GameAction) => void;
}

// MobileActionsBar.hook.ts
export interface MobileActionsBarState {
  /** Attach to the fixed bar's own root element (not the spacer). */
  barRef: React.RefObject<HTMLDivElement>;
  /** 0 until the first measurement effect runs; feeds the spacer's inline height. */
  barHeightPx: number;
  isSheetOpen: boolean;
  onSheetOpenChange: (open: boolean) => void;
}
export function useMobileActionsBar(): MobileActionsBarState;
// Behavior: useLayoutEffect creates one ResizeObserver on barRef.current, calling
// setBarHeightPx(entry.contentRect.height) on mount and on every resize; disconnects on unmount.
// isSheetOpen starts false; onSheetOpenChange = setIsSheetOpen.

// ActionButton.tsx — add one optional prop, default false; everything else unchanged
interface ActionButtonProps {
  action: ActionViewModel;
  isMain: boolean;
  onActionClick: (id: GameAction) => void;
  /** Mobile bar/sheet only: render `action.disabledReason` as static text under the button
   *  instead of relying on hover/focus Tooltip. Desktop never passes this (stays false). */
  disabledReasonVisible?: boolean;
}
// Nesting changes from Tooltip > TooltipTrigger(asChild) > div > Button
// to: div(isMain ? 'w-full' : '') > Tooltip > TooltipTrigger(asChild) > Button, with the caption
// as a second child of that same outer div, after the Tooltip:
//   {disabledReasonVisible && action.disabled && (
//     <p className={styles.disabledReasonCaption} title={action.disabledReason}>{action.disabledReason}</p>
//   )}

// MobileActionsBar.tsx
export function MobileActionsBar(props: ActionsPanelViewProps): JSX.Element;
// Row 2 button count: isMyTurn ? 4 columns (Position, Attack, Deploy, End Turn)
//                                : 3 columns (Position, Attack, Deploy; no End Turn, matching
//                                  ActionsPanelView's `{isMyTurn && <EndTurnButton/>}` gate).
// Every Row 2 ActionButton passes isMain and disabledReasonVisible={true}.
// End Turn (only when isMyTurn) is NOT an ActionButton — duplicate ActionsPanel.tsx:71-94's
// Button/progress-span/label-spans structure, with a new container className
// (MobileActionsBar.styles.ts's `endTurnButtonMobile`, built from
// `actionsPanelStyles.buttonVariant({ isMain: true, isPendingMatch: false })` so its height/width
// match the other three Row 2 cells) and the existing `actionsPanelStyles.endTurnProgress*`/
// `endTurnLabel`/`endTurnTime`/`endTurnButtonExpiring` tokens (imported from
// './ActionsPanel.styles' (same folder), unchanged) for everything inside it. Same
// data-testid="actions-panel-end-turn", same disabled={props.isEndTurnDisabled}, same
// onClick={props.onEndTurn}, same turnTimer-driven progress width/expiring styling as desktop.
// "More Actions" button (data-testid="actions-panel-more-actions") always renders, calls
// onSheetOpenChange(true); renders <MobileActionsSheet open={isSheetOpen} onOpenChange={onSheetOpenChange}
// secondaryActions={props.secondaryActions} deckCount={props.deckCount} infoBeacon={props.infoBeacon}
// onActionClick={props.onActionClick} />.
// Root bar element: role="region" aria-label="Turn actions".

// MobileActionsSheet.tsx
export function MobileActionsSheet(props: MobileActionsSheetProps): JSX.Element;
// <Sheet open={props.open} onOpenChange={props.onOpenChange}>
//   <SheetContent side="bottom" className={styles.sheetContent /* motion-reduce overrides, Fix 2 */}>
//     header: SheetTitle "Actions" + props.infoBeacon; "Cards left in deck: {props.deckCount}"
//     body: 2-col grid of props.secondaryActions via <ActionButton isMain={false}
//           disabledReasonVisible onActionClick={props.onActionClick} />
```

## Phases
### Phase 1: mobile bar, sheet, disabled-reason captions, reduced motion
1. `ActionsPanel.types.ts`: move `ActionsPanelViewProps` in, add `MobileActionsSheetProps`. (implementer-a)
2. `ActionsPanel.fixtures.ts`: add `notMyTurn` fixture, `{ ...myTurnNoSelection, isMyTurn: false, hasExtraMoveBanner: false, isCancellableActionInProgress: false }`, with `disabled: true, disabledReason: "It's not your turn."` (`ActionsPanel.disabledReasons.ts:31`) applied to **every** `mainActions`, `alwaysAvailableActions`, AND `secondaryActions` entry **except** Cards (`local_ShowCards`), which stays exactly as in `myTurnNoSelection` (`disabled: false`, no `isMyTurn` gate — `ActionsPanel.map.ts:123,127`). (implementer-a)
3. `MobileActionsBar.hook.ts`: `useMobileActionsBar()` per Contracts. (implementer-a)
4. `ActionButton.tsx`: add `disabledReasonVisible`, restructure the Tooltip/div nesting per Contracts, keep every existing behavior (icon map, variant, click, disabled, tooltip content) identical. (implementer-b)
5. `ActionsPanel.styles.ts`: add `disabledReasonCaption: 'mt-1 block w-full truncate text-[10px] text-destructive/90'`. (implementer-b)
6. `MobileActionsBar.styles.ts`: bar container (`fixed inset-x-0 bottom-0 z-30`, top border + upward shadow per ui-design "Components and tokens", reusing `styles.card`'s background/blur tokens from `ActionsPanel.styles.ts`), Row 1 flex row, Row 2 grid (3- and 4-column variants via `cva`), "More Actions" button, sheet header/body classes, and the Fix-2 motion-reduce className for `SheetContent`. **Row 2 button height (applies to Position/Attack/Deploy AND End Turn alike): start at `styles.buttonVariant({isMain:true})`'s existing `h-16` (`ActionsPanel.styles.ts:31`); only drop to `h-14` if `ui-verify` at 390×844 shows the header+bar eating too much vertical budget. Never introduce an `h-11` or smaller variant (ui-design.md Fix 1).** Also add `endTurnButtonMobile`: the same height/width as `buttonVariant({isMain:true})` (literally compose from it, e.g. `cn(styles.buttonVariant({isMain:true, isPendingMatch:false}), 'relative overflow-hidden')`, imported from `./ActionsPanel.styles` (same folder) — not a hand-copied height number) so End Turn's mobile cell is never `h-7` and never drifts out of sync with the other three cells' height. (implementer-b)
7. `MobileActionsSheet.tsx` per Contracts. (implementer-b)
8. `MobileActionsBar.tsx` per Contracts, importing `MobileActionsSheet`. Row 2's End Turn button is the duplicated Button/progress-span/label-spans structure from `ActionsPanel.tsx:71-94`, styled with `endTurnButtonMobile` (step 6) instead of `styles.endTurnButton` (`h-7`, desktop-only) — confirm in review that the rendered End Turn cell is the same height as the Position/Attack/Deploy cells beside it, not the desktop `h-7`. (implementer-b)
9. `ActionsPanel.tsx`: remove the local `ActionsPanelViewProps` interface (now imported from `.types.ts`); `ActionsPanel()` calls `useIsMobile()` from `@/modules/shared` and renders `MobileActionsBar` when true, `ActionsPanelView` when false. `ActionsPanelView` itself is untouched. (implementer-b)
10. `MobileActionsBar.hook.test.ts`, then `MobileActionsBar.test.tsx` and `MobileActionsSheet.test.tsx`, then the two added `ActionsPanel.test.tsx` cases — written only after steps 1-9 land. (tester-a logic first, then tester-b)
11. `MobileActionsBar.preview.tsx` + `src/testbed/registry.ts` registration. (preview-a)
12. `ui-verify`: screenshot `/testbed/hud-mobile-actions-bar` (all 5 states) and `/testbed/hud-actions-panel` (regression) at both sizes; force `prefers-reduced-motion: reduce` and verify the Sheet opens/closes without a slide animation; click "More Actions" and `Escape`/outside-tap to confirm focus returns to the trigger. (preview-b or whichever agent runs the UI check per swarm skill)

Model escalation: none — no Firestore, timers or concurrency touched.

## Test plan
- tester-a (logic, first):
  - `MobileActionsBar.hook.test.ts`: mock `window.ResizeObserver` (constructor capturing its callback, `observe`/`disconnect` as `jest.fn()`); invoke the captured callback with a fake `ResizeObserverEntry`-like `{ contentRect: { height: 72 } }` and assert `barHeightPx` becomes `72`; assert `onSheetOpenChange(true)` flips `isSheetOpen` to `true` and `onSheetOpenChange(false)` flips it back; assert `disconnect` is called on unmount.
- tester-b (view, after tester-a):
  - `MobileActionsBar.test.tsx`: for each of `myTurnNoSelection`/`armySelectedCanAttack`/`cardActionInProgress`/`extraMoveActive`/`notMyTurn` — Row 1 shows exactly the expected subset of Cancel/Deselect/banner; Row 2 renders 4 buttons when `isMyTurn` is true and 3 (no End Turn) when false; a disabled Row 2 button renders its `disabledReason` as visible text (`screen.getByText`), not only in a tooltip; clicking "More Actions" (`data-testid="actions-panel-more-actions"`) opens the sheet (assert sheet content becomes visible, e.g. `screen.getByText('Actions')` inside the sheet, or query via `role="dialog"`). Add: End Turn's rendered className includes `endTurnButtonMobile`, not `styles.endTurnButton` (guards against silently reusing the `h-7` desktop token); the full label `"End Turn (0:45)"` (or the fixture's `turnTimer.formattedTime`) is present as one text match, not split/clipped.
  - `MobileActionsSheet.test.tsx`: renders title "Actions", `infoBeacon`, "Cards left in deck: N"; renders all 4 secondary actions with their testids; a disabled secondary action (e.g. `cardActionInProgress`'s Upgrade) shows its `disabledReason` as visible text; with the `notMyTurn` fixture, Upgrade/BuyCard/Abilities show `"It's not your turn."` as visible text while Cards stays enabled; calling the close affordance invokes `onOpenChange(false)`.
  - `ActionsPanel.test.tsx` additions: `jest.mock('@/modules/shared', () => ({ ...jest.requireActual('@/modules/shared'), useIsMobile: jest.fn() }))`; with the mock returning `true`, render `<ActionsPanel/>` (mocking `useActionsPanel` too, as the existing hook test file does) and assert `MobileActionsBar`'s bar renders (e.g. `getByRole('region', { name: 'Turn actions' })`); with `false`, assert the `Card`/`ActionsPanelView` structure renders instead. Add one case: with `disabledReasonVisible` defaulted (desktop `ActionButton` call sites), a disabled action's caption text (`disabledReasonCaption`) is absent — only the Tooltip's content holds it.
  - e2e: none added — no new Firestore-backed flow; the existing `e2e/gameplay.spec.ts` is unaffected since `ActionsPanelView`'s desktop markup/testids are unchanged.

## Preview states
- `MobileActionsBar` (new preview, slug `hud-mobile-actions-bar`): `My turn, no selection`, `Army selected, can attack`, `Card action in progress`, `Extra Move active`, `Not my turn` — same fixture names as `hud-actions-panel`'s existing preview, plus the new `notMyTurn` fixture.
- `hud-actions-panel` (existing, unchanged): re-screenshot as a regression check; no new states needed since `ActionsPanelView` doesn't change.

## Risks
- Row 2's two-line label wrapping at `h-16`/`h-14` is a real layout risk the spec itself flags (ui-design.md Fix 1) — `ui-verify` must visually confirm no clipped/overflowing text for `"Deploy (0 Food)"` and `"End Turn (0:45)"` before accepting `h-14`; if either wraps badly, stay at `h-16`.
- The spacer-based scroll-padding (Decisions) assumes `MobileActionsBar` always mounts in the same DOM slot `ActionsPanel` does today (inside `<aside>`, before `<GameLog/>`) — true as of `GameBoard.tsx:53-65` and unchanged by this plan; if a future change reorders `<GameLog/>` relative to `<ActionsPanel/>`, the spacer stops protecting it. Flagged, not mitigated further here (out of this task's scope).
- `jsdom` has no real `ResizeObserver`; `MobileActionsBar.hook.test.ts` must mock it (precedent: `CustomSettingsSheet.test.tsx`'s `window.ResizeObserver` mock) — the view tests (`MobileActionsBar.test.tsx`) need the same mock available (e.g. via a shared `beforeAll` in that file, or import order) or they will throw on mount.
- `ui-verify`'s testbed screenshots can confirm the bar/sheet component's own correctness and desktop's non-regression, but the full integration claim ("map tiles not obscured on a live game") depends on real `GameState`-driven map height, which the testbed preview doesn't reproduce. Precedent (`docs/ai/tasks/2026-10-04-ui-ux-review/ui-design.md:39`) diagnosed the original bug the same way — via the `hud-actions-panel` testbed preview's mobile screenshot — so this plan follows the same verification method; flag to the user if a live-game mobile screenshot is wanted in addition.

## Review (architect-b)
VERDICT: APPROVED

Re-review of architect-a's revision. Verified the fix for the one blocking finding from the prior round:
- `plan.md:31` now correctly flags `styles.endTurnButton` as `h-7` (28px), desktop-only, must not be reused for mobile Row 2.
- Decisions (`plan.md:51`) and Contracts (`plan.md:129-137`) give `MobileActionsBar.tsx` a concrete, buildable path: duplicate the End Turn JSX (`ActionsPanel.tsx:71-94`), style its container with a new `endTurnButtonMobile` token composed from `styles.buttonVariant({isMain:true, isPendingMatch:false})` (`MobileActionsBar.styles.ts`, step 6, `plan.md:160`) so it matches the other three Row 2 cells' height, while reusing the unchanged internal tokens (`endTurnProgress*`/`endTurnLabel`/`endTurnTime`/`endTurnButtonExpiring`). The rejected alternative (extracting a shared `EndTurnButton`) is justified against `kiss-dry-solid`'s third-copy threshold and the plan's explicit goal of a byte-for-byte-untouched `ActionsPanelView` — reasonable at this scope.
- Test plan (`plan.md:174`) now asserts the End Turn cell carries `endTurnButtonMobile`, not `styles.endTurnButton`, and that the full `"End Turn (0:45)"` label isn't clipped — this is the regression guard the original gap was missing.
- Citation fixed: `ActionsPanel.disabledReasons.ts:31` (was `:29`) for `"It's not your turn."` (verified: `if (!isMyTurn) return "It's not your turn.";` is at line 31).
- `notMyTurn` fixture now correctly extends `disabled: true, disabledReason: "It's not your turn."` to `secondaryActions` (Upgrade/BuyCard/Abilities) while leaving Cards untouched, matching `getDisabledReason`'s actual short-circuit order (`disabledReasons.ts:31`) and `ActionsPanel.map.ts:123,127`'s no-`isMyTurn`-gate on Cards. Phase step 2 (`plan.md:156`) and the sheet test plan (`plan.md:175`) spell this out concretely.

No new issues found in the revision. Plan is buildable as written.

Status set to APPROVED.
