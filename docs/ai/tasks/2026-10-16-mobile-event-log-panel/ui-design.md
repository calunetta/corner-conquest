# UI design: Mobile Event Log expansion panel

## Spec (ui-designer-a)

### Purpose and user story
As a player on a phone, I want to open the Event Log on demand instead of scrolling past a small fixed-height log block every turn, so the map and action buttons stay the focus of the screen and I can still review combat/economy history when I want it.

### Placement and layout
- **Desktop (1280×720, ≥1024px / `lg:`):** unchanged. `GameLog` keeps rendering inline inside the right `aside` in `src/features/game/components/GameBoard.tsx:75`, below `ActionsPanel`, with its existing `Card` chrome and the fixed `h-32 sm:h-36` scroll area (`src/modules/hud/components/GameLog/GameLog.styles.ts:7`). No change to this file's desktop branch.
- **Mobile (390×844, <768px, matches `useIsMobile`'s `MOBILE_BREAKPOINT` in `src/modules/shared/use-is-mobile.ts:3`):**
  - The inline `<GameLog />` in `GameBoard.tsx` is hidden below 768px (e.g. a `hidden md:block` wrapper around it — `md` is Tailwind's 768px breakpoint, matching `useIsMobile` exactly) and still renders at ≥768px alongside the desktop `ActionsPanelView`. This removes the static block the player currently scrolls past; it does not touch the desktop grid/flex structure.
  - `MobileActionsBar` (`src/modules/hud/components/ActionsPanel/MobileActionsBar.tsx:40`) gains a second always-visible trigger button, **"Log"**, in Row 1, grouped immediately to the left of the existing "More Actions" button (both right-aligned together, so Row 1 reads: conditional Cancel/Deselect/banner on the left, "Log" + "More Actions" as a fixed pair on the right). Same size and variant as "More Actions" (`variant="outline" size="sm"`, `h-7 text-xs px-2`, token `moreActionsButton`-equivalent).
  - Tapping "Log" opens a new bottom sheet (new component, e.g. `MobileEventLogSheet.tsx`, sibling of `MobileActionsSheet.tsx`) built on the same `Sheet`/`SheetContent` primitives (`src/components/ui/sheet.tsx`), `side="bottom"`. Unlike the actions sheet (which uses its own `SheetHeader`/`SheetTitle`), this sheet renders `GameLogView` directly as its content — `GameLogView`'s own `CardHeader` (title "Event Log" + "Show routine activity" switch) becomes the sheet's header, so there is exactly one title, not two.
  - The sheet takes most of the viewport height (e.g. `h-[75vh] max-h-[85vh] flex flex-col`, `SheetContent`'s default `p-6` overridden to `p-0` so `GameLogView`'s own `Card` padding applies) so the log is actually useful full-screen, not the cramped `h-32` box. `GameLogView` gains an optional `variant` prop (`'panel' | 'sheet'`, default `'panel'`) that only changes presentation tokens:
    - `variant="panel"` (default, used by desktop and any future reuse): today's `Card` chrome (`bg-background/40 border-white/10 shadow-...`) and fixed `h-32 sm:h-36` scroll area — unchanged.
    - `variant="sheet"` (used only by `MobileEventLogSheet`): transparent/borderless `Card` (`border-none shadow-none bg-transparent`, since the `Sheet` already supplies the surface) and a scroll area that fills the remaining sheet height (`flex-1 min-h-0` on `CardContent`/`ScrollArea` instead of the fixed `h-32`).
    - No change to `GameLog.hook.ts`, `GameLog.map.ts`, entry content, filtering, or the declutter toggle's logic — `variant` only swaps style tokens in `GameLog.styles.ts`.
  - The whole 5×6 map grid stays fully visible under the sheet's trigger button and under the fixed `MobileActionsBar`; opening the sheet is the only thing that covers the map (as a modal overlay, same as "More Actions" already does), and it closes the same way (swipe/tap-outside/Escape/the sheet's own `X` close button).

### States
| State | What the player sees | Trigger |
|---|---|---|
| Collapsed (default) | Mobile: map + `MobileActionsBar` only; no log visible. "Log" button sits next to "More Actions", always enabled, never shows a count/badge. | Initial render, or after closing the sheet. |
| Open | Bottom sheet slides up over the map, dims it with the standard `SheetOverlay` (`bg-black/80`). Header: "Event Log" title + "Show routine activity" switch (both already defined by `GameLogView`). Body: full scrollable entry list, same icons/turn dividers/colored player names as desktop. | Tap "Log". |
| Empty log | Inside the open sheet, `entries` is empty — renders the (new, scoped-out-of-logic) empty state only if `GameLogView` already has one; since `useGameLog` currently always seeds at least the pre-game/legacy entries, no new empty-state copy is required here. If `entries.length === 0` is in fact reachable, reuse the existing behavior unchanged (`GameLogView` renders nothing extra today — out of scope to add copy for a case `GameLog` doesn't already handle). | N/A — verify against current `GameLog` behavior; do not invent new empty-state copy in this task. |
| Declutter toggled off/on | Identical switch behavior to desktop; entries list re-filters via the existing `useGameLog` hook, inside the sheet exactly as it does inline today. | Tap the "Show routine activity" switch. |
| Closing | Sheet slides down, overlay fades, focus returns to the "Log" button (same pattern already implemented for `MobileActionsSheet`'s "More Actions" button via `triggerRef`). | Tap outside, swipe down, Escape, or the sheet's `X` close button. |
| Both sheets open | Out of scope to allow simultaneously: opening "Log" while "More Actions" is open should close the actions sheet first (or the trigger should be disabled/hidden while the other sheet is open) to avoid stacking two bottom sheets. Pick whichever the `Sheet` primitive makes trivial; do not design a custom stacking behavior. | Tapping "Log" while the actions sheet is already open. |

### Components and tokens
- Reuse: `Sheet`, `SheetContent`, `SheetPortal`, `SheetOverlay`, `SheetPrimitive.Close` (`src/components/ui/sheet.tsx`) — same primitives as `MobileActionsSheet.tsx:4`.
- Reuse: `Button` (`variant="outline"`, `size="sm"`) for the new "Log" trigger — same component/variant as the existing "More Actions" button (`src/modules/hud/components/ActionsPanel/MobileActionsBar.tsx:72`).
- Reuse: `GameLogView` (`src/modules/hud/components/GameLog/GameLog.tsx:48`) as the sheet's entire content — do not re-implement entries/icons/dividers/toggle.
- New: `MobileEventLogSheet.tsx` (sibling of `MobileActionsSheet.tsx`), a thin wrapper that opens/closes the `Sheet` and renders `<GameLogView variant="sheet" {...}/>` inside it. This is the one new visual pattern this feature introduces; everything else reuses the "More Actions" trigger + bottom-sheet pattern already shipped.
- New: `variant` prop on `GameLogView`/`GameLog.types.ts`'s `GameLogViewModel` (or a separate presentation-only prop not part of the view-model, implementer's call) — tokens only, added to `GameLog.styles.ts`.
- Icon: `ScrollText` from `lucide-react` for the "Log" button (verified export: `node_modules/lucide-react/dist/esm/lucide-react.js` exports `ScrollText`). Distinct from the `Clock` icon `GameLogView` already uses for the `turn` category, so the trigger and in-log icons don't collide visually.
- Tokens: button — `h-7 text-xs px-2` (matches sibling buttons in `MobileActionsBar.styles.ts`). Sheet surface — `bg-background` (inherited from `SheetContent`'s own default, no new bg token). Sheet-variant card — `border-none shadow-none bg-transparent`. All existing `text-muted-foreground`, `bg-black/60`, `border-white/10` tokens inside `GameLogView` stay as-is; no new hex values.

### Copy
- Trigger button label: **"Log"** (short, fits the `h-7` button next to "More Actions" without wrapping; distinguishes the button from map tile text).
- Button `aria-label` (if icon-only on very narrow screens — otherwise the visible "Log" text is the accessible name): "Open event log".
- Sheet content copy: unchanged — "Event Log" (title), "Show routine activity" (switch label and its `aria-label`), existing log entry strings produced by `useGameLog`/`GameLog.map.ts`. No new strings beyond the button label and its `aria-label`.

### Interactions and motion
- Tap "Log" → `Sheet` opens with the existing shadcn bottom-sheet slide-in (`data-[state=open]:slide-in-from-bottom`, `sheetVariants` in `src/components/ui/sheet.tsx:34`) — identical motion to "More Actions", so the two triggers feel like the same family of control.
- Respect `prefers-reduced-motion`: reuse the `motion-reduce:duration-0 motion-reduce:data-[state=open]:animate-none motion-reduce:data-[state=closed]:animate-none` override already applied to `MobileActionsSheet` via `styles.sheetContent` (`MobileActionsBar.styles.ts:46`) — apply the same override class to the new sheet's content.
- Scrolling inside the open sheet behaves like today's `ScrollArea` (`src/components/ui/scroll-area.tsx`) — no new scroll/gesture behavior.
- Closing restores focus to the "Log" trigger button, mirroring the `triggerRef` focus-restore already implemented in `MobileActionsSheet.tsx:22`.

### Accessibility
- "Log" button: visible text label ("Log"), so no `aria-label` is strictly required, but add one anyway ("Open event log") for screen readers that might only announce the icon if text wrapping ever truncates it — same defensive pattern other icon+text buttons in this codebase don't currently bother with, but cheap to add here.
- Sheet dialog: `SheetPrimitive.Content` is a Radix Dialog under the hood (`@radix-ui/react-dialog`, `src/components/ui/sheet.tsx:4`) — focus trap, Escape-to-close and `aria-modal` are inherited for free, same as `MobileActionsSheet`.
- Reused `GameLogView` markup already has `role="separator"` turn dividers and `aria-hidden` icons (`GameLog.tsx:33,60,71`) — unchanged.
- "Show routine activity" switch keeps its existing `aria-label="Show routine activity"` (`GameLog.tsx:63`).
- Text contrast: all copy uses the same `text-muted-foreground`/`text-foreground` tokens already verified ≥4.5:1 on this dark theme elsewhere in the codebase; no new color-only signaling (the "Log" button carries a text label, not just an icon).
- Keyboard path: Tab reaches "Log" in the same tab order position "More Actions" already occupies (adjacent button); Enter/Space opens the sheet; Escape or Tab-to-close-button closes it; focus returns to "Log". Touch target: `h-7` (28px) matches the existing sibling buttons (`moreActionsButton`, `cancelButton`, `deselectButton` — all `h-7`) — below the 44px ideal but consistent with the shipped pattern on this bar; not a regression introduced by this feature.

### Acceptance criteria
- [ ] At viewport width ≥1024px (desktop), the right-side `aside` still shows `ActionsPanelView` followed immediately by the inline `GameLog` card with its `h-32 sm:h-36` scroll area — pixel-identical to today's screenshot.
- [ ] At viewport width <768px (mobile), no inline Event Log card is visible anywhere on the page without interaction (confirm by screenshot: only the map, `PlayerInfoBar`, and the fixed `MobileActionsBar` are visible on initial load).
- [ ] At <768px, `MobileActionsBar` Row 1 shows a "Log" button next to "More Actions", visible regardless of whose turn it is.
- [ ] Tapping "Log" opens a bottom sheet showing the "Event Log" title, the "Show routine activity" switch, and the entry list (turn dividers, category icons, colored player names) — same data `useGameLog` already produces, verified against the desktop panel's content for the same game state.
- [ ] The sheet occupies most of the viewport height (visibly taller than the desktop's `h-32`/`h-36` box) and its own entry list scrolls independently of the page.
- [ ] Closing the sheet (tap outside, swipe down, Escape, or its `X`) returns focus to the "Log" button and reveals the map underneath unchanged.
- [ ] The 5×6 map grid remains fully visible at <768px both before and after opening/closing the sheet (only covered transiently while the sheet itself is open, same as "More Actions" already does).
- [ ] `npm run typecheck` and `npm run lint` pass with the new `MobileEventLogSheet.tsx`, the "Log" button, and the `variant` prop on `GameLogView`.

## Review (ui-designer-b)
VERDICT: APPROVED

Reviewed against: desktop/mobile parity requirement, existing `Sheet`/`MobileActionsSheet` pattern, `GameLogView`/`useGameLog` as single source of truth, and the triage scope boundaries.

- Reuse is correct: `Sheet` primitives, the `Button` outline/sm variant, and `GameLogView` itself are the only components touched for visuals; the one new file (`MobileEventLogSheet.tsx`) is the single new pattern the triage allows, and it's a thin wrapper, not a reimplementation of log rendering.
- `variant` prop on `GameLogView` is scoped correctly: it only swaps `GameLog.styles.ts` tokens (card chrome, scroll-area height), never touches `GameLog.hook.ts`/`GameLog.map.ts` — matches the triage's explicit "Out: any change to log content or filtering logic."
- Breakpoint alignment is verified, not assumed: `MOBILE_BREAKPOINT = 768` in `src/modules/shared/use-is-mobile.ts:3` is Tailwind's `md`, so hiding the inline `GameLog` with `hidden md:block` matches exactly the same width where `ActionsPanel` already swaps to `MobileActionsBar` via `useIsMobile()` (`ActionsPanel.tsx:124`). No flicker/mismatch window between a CSS breakpoint and the JS check.
- Desktop is untouched by construction: the spec only adds a `hidden md:block` wrapper around the existing `<GameLog />` call site in `GameBoard.tsx:75` and does not alter `ActionsPanelView` or the flex/grid structure — satisfies triage's "Out: desktop layout in `GameBoard.tsx` ... stays exactly as is" (the wrapper div is presentation-only and resolves to a no-op at ≥768px).
- Accessibility: focus restore on close, Escape-to-close and the Dialog's built-in focus trap are inherited from the already-shipped `MobileActionsSheet` pattern, verified at `src/modules/hud/components/ActionsPanel/MobileActionsSheet.tsx:22` (`triggerRef` focus restore) and `src/components/ui/sheet.tsx:4` (Radix Dialog underneath) — no new a11y surface invented.
- Single source of truth for copy and toggle state: the spec explicitly reuses `GameLogView`'s own header (title + switch) as the sheet's header instead of adding a second `SheetTitle`, avoiding duplicate "Event Log" text and a second toggle wired to the same `useGameLog` state.
- Edge case called out and bounded, not solved with new state: the "both sheets open" case defers to whatever `Sheet` makes trivial (closing one when the other opens) rather than specifying bespoke stacking/z-index logic — correct scope discipline for an M-tier task.
- One gap, non-blocking: the "Empty log" state row admits it couldn't verify whether `entries.length === 0` is reachable without reading `GameLog.hook.ts` end-to-end; it correctly declines to invent new copy for an unverified case rather than guessing. Architect/implementer should confirm this during build and only add copy if the empty case is in fact reachable and currently unhandled.
- Acceptance criteria are each screenshot/DOM-checkable (specific viewport widths, specific visible/hidden elements, focus target after close) and include the mandatory `typecheck`/`lint` gate.

No changes requested.

## Final spec
The "Spec (ui-designer-a)" section above is final, unchanged by review.
