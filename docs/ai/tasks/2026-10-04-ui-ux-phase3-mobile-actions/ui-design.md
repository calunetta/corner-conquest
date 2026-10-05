# UI design: Mobile actions reachability (audit finding 3)

## Spec (ui-designer-a)

### Purpose and user story
As a player on a mobile phone, I want End Turn and my core per-turn actions (Position, Attack, Deploy) reachable without scrolling, so that every turn doesn't require a scroll round-trip past the map and player bar to find the controls.

### Direction chosen, and why
Three directions were on the table (from `docs/ai/tasks/2026-10-04-ui-ux-review/ui-design.md`'s "Design inspiration"): Colonist's persistent bottom bar, `PlayerInfoBar`'s collapsible pattern, and Polytopia's single-always-visible-primary-button.

`ActionsPanel` (`src/modules/hud/components/ActionsPanel/ActionsPanel.tsx:103-118`, `ActionsPanel.map.ts:54-140`) is not a single end-turn control. Per turn it exposes 7 distinct action buttons (Position, Attack, Deploy in the main grid; Upgrade, Buy Card, Cards, Abilities in the secondary grid) plus conditional Cancel/Deselect buttons and an End Turn button with a countdown. **Polytopia's single-button simplification doesn't fit this action set** — collapsing Attack/Deploy/Position into "one button" would hide core, frequently-used actions, not optional chrome.

Chosen: **Colonist-style persistent bottom bar for the high-frequency controls (Position/Attack/Deploy/End Turn/Cancel/Deselect), combined with `PlayerInfoBar`'s existing collapse-affordance pattern for the low-frequency controls (Upgrade/Buy Card/Cards/Abilities), surfaced through a Sheet instead of growing in place.**

Why a Sheet and not an in-place expand: the mobile layout rule requires the whole map grid to stay visible. A bottom bar that grows upward in `position: fixed` space can overlap the map regardless of scroll position, because `fixed` ignores scroll. A Sheet (`src/components/ui/sheet.tsx`, already used by `CustomSettingsSheet`) is a deliberate, dismissible, user-invoked overlay — the same mechanism every other secondary screen in the game already uses (Cards dialog, Combat dialog, Custom Settings sheet) when it needs more room than the HUD. It only appears when the player taps "More Actions", and closing it returns to the steady state where the map is fully visible. This keeps the *default* mobile state map-safe, which is what the layout rule is protecting.

### Placement and layout

**Desktop (1280×720): unchanged.** `ActionsPanel` keeps rendering exactly as it does today, inside `<aside>` in `src/features/game/components/GameBoard.tsx:52-66` — the Card with header controls, 3-col main grid, separator, 2-col secondary grid, in the right column next to the map. No desktop-facing change. Verified the audit found no desktop reachability problem for this finding.

**Mobile (390×844, `useIsMobile()` breakpoint `<768px`, `src/modules/shared/use-is-mobile.ts:3`): `ActionsPanel` renders as a persistent bottom bar instead of an in-flow Card.**

- The bar is `fixed inset-x-0 bottom-0 z-30`, full width, sitting on top of the mobile viewport, independent of the page's scroll position (the page itself keeps `overflow-y-auto` per `GameBoard.tsx:21`).
- The scrollable mobile column (`GameBoardHeader` → `PlayerInfoBar` collapsed header → map → `GameLog`) gets bottom padding equal to the bar's rendered height (measured, not a hardcoded guess) so `GameLog`'s content is never hidden behind the fixed bar.
- `GameLog` keeps its current position below the map (`GameBoard.tsx:63`) — out of scope for this finding, audit finding 3 is specifically about the actions panel.
- The bar itself never grows upward into the map: tapping "More Actions" opens a `Sheet` (`side="bottom"`) that overlays the viewport, exactly like existing dialogs already do on mobile. It does not push or resize the bar or the map underneath.
- Layering: bar at `z-30` (same layer as `GameStatusBadge`/`MapZoomControls`-style HUD chrome per `MapZoomControls.tsx`'s pattern), Sheet above it at its own overlay layer (Radix default, already above `z-30` in every existing Sheet usage).

Bar content, collapsed (default, always visible, no scroll required):
- **Row 1 (conditional, renders only when relevant):** Cancel button (when `isCancellableActionInProgress`), Deselect button (when `hasSelectedArmy`), the extra-move banner text (when `hasExtraMoveBanner`) — same buttons/copy as today (`ActionsPanel.tsx:47-70`, `:96-100`), restyled to fit a compact single row (`h-7` buttons, banner truncated to one line with icon).
- **Row 2 (always rendered):** the main grid — Position, Attack, Deploy buttons (same `ActionViewModel`s as `mainActions` + `alwaysAvailableActions` today, `ActionsPanel.map.ts:54-90`) — plus the End Turn button with its countdown, same component and styles as `ActionsPanel.tsx:71-94` (`styles.endTurnButton` etc., `ActionsPanel.styles.ts:13-19`). On a 390px-wide screen this row does not fit 4 full-width buttons at `h-16`; shrink to a compact variant (see Components and tokens) so all 4 fit one row.
- **Row 2 trigger:** a "More Actions" button/chevron docked at the end of Row 1 (or its own small row above Row 2 if Row 1 is empty) that opens the Sheet. Shows deck count is dropped from the always-visible bar (moved into the Sheet header, see below) to save width.

Sheet content (opens on "More Actions" tap):
- Header: title "Actions" + `infoBeacon` (identical to today's `CardTitle`, `ActionsPanel.tsx:40-43`) + "Cards left in deck: {deckCount}" (identical copy, `ActionsPanel.tsx:44`).
- Body: the secondary grid — Upgrade, Buy Card, Cards, Abilities — same `ActionViewModel`s and `ActionButton` component as today (`ActionsPanel.map.ts:92-140`), laid out 2 columns as today (`styles.secondaryGrid`).
- No footer actions duplicated here — Cancel/Deselect/End Turn stay only in the bottom bar so there is one place to find them, not two.

### States
Verified against the real fixtures in `ActionsPanel.fixtures.ts` (not invented) and `ActionsPanel.map.ts`.

| State | What the player sees (mobile bar / sheet) | Trigger / fixture |
|---|---|---|
| My turn, no selection | Row 2 shows Position + Attack disabled (`disabledReason: 'You must select an army first.'`), Deploy enabled, End Turn enabled with timer. No Row 1. Sheet (if opened) shows all 4 secondary actions enabled per their own resource checks. | `myTurnNoSelection` |
| Army selected, can attack | Row 2: Position disabled (`'This tile has no resources to position on.'`), Attack enabled, Deploy enabled. Row 1 appears: Deselect button. | `armySelectedCanAttack` |
| Army selected, can't attack / can't position (not in fixtures as a named case, but same shape) | Row 2 buttons individually disabled per `ActionsPanel.map.ts:29-41`'s `canPosition`/`canAttack` checks, each showing its own `disabledReason` in the button's tooltip-equivalent — see Accessibility for the mobile no-hover-tooltip problem this exposes. | derived from `ActionsPanel.map.ts` |
| Card action in progress (cancellable) | Row 1 appears: Cancel button. Row 2: Position/Attack/Deploy disabled (`'Complete or cancel the current card action first.'`), End Turn disabled (`isEndTurnDisabled: true`). Sheet: Upgrade disabled with same reason, Buy Card disabled + highlighted as pending match, Cards unaffected, Abilities disabled. | `cardActionInProgress` |
| Extra Move active | Row 1 appears: the extra-move banner ("Extra Move active! Select a soldier on the map to continue.") in compact one-line form, plus a Cancel affordance (`isCancellableActionInProgress: true` for this fixture too). Deploy cost shown as "Deploy (0 Food)". | `extraMoveActive` |
| Not my turn (`isMyTurn: false`) | Row 1 never renders (all its buttons are gated on `isMyTurn` in `ActionsPanel.tsx:47,59,71`). Row 2 still renders Position/Attack/Deploy/End Turn but all disabled (every `disabled` check in `ActionsPanel.map.ts` includes `!isMyTurn`). No End Turn button shown at all, since it's wrapped in `isMyTurn &&` (`ActionsPanel.tsx:71`) — bar's Row 2 drops to 3 buttons (Position/Attack/Deploy) only. | derived from `isMyTurn: false` |
| Turn timer expiring (`turnTimer.isExpiring: true`) | End Turn button gets the destructive ring + red progress fill, same as today (`styles.endTurnButtonExpiring`, `styles.endTurnProgressExpiring`) — unchanged visual, just now always on-screen instead of requiring a scroll to notice. | derived from `turnTimer.isExpiring` |
| Sheet closed (default) | Bottom bar only; map fully visible above it. | default |
| Sheet open | Bottom sheet overlays the lower portion of the viewport with the secondary actions; bottom bar remains visible underneath or is covered by the sheet (sheet renders on top, same z-order as every other mobile Sheet in this codebase) — map visibility is not required while the sheet is open, same as it isn't required while any other dialog (Cards, Combat, Attack Selection) is open. | tap "More Actions"; close via `X`, outside tap, or `Escape` |

### Components and tokens
- Reuse: `Button` (`src/components/ui/button.tsx`), `Sheet`/`SheetContent`/`SheetHeader`/`SheetTitle` (`src/components/ui/sheet.tsx`), `Separator` (`src/components/ui/separator.tsx`), the existing `ActionButton` (`src/modules/hud/components/ActionsPanel/ActionButton.tsx`) unchanged for every button in both the bar and the sheet, `ChevronUp`/`ChevronDown` from `lucide-react` (same icons `PlayerInfoBar.tsx:4` already uses for its collapse affordance), `XCircle`/`Zap` icons already used in `ActionsPanel.tsx:8`.
- New: a compact variant of `styles.buttonVariant` (`ActionsPanel.styles.ts:26-40`) for the 4-across Row 2 on mobile — same `cva`, add an `isCompact` variant (`h-11 text-[11px] px-1`) rather than a new component. This is a token/variant addition inside the existing style object, not a new visual pattern.
- Tokens: bar background reuses the existing glass-panel tokens already defined as `styles.card` (`bg-background/40 backdrop-blur-xl border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)]`, `ActionsPanel.styles.ts:4`), flipped to a top border (`border-t border-white/10`) and a shadow cast upward (`shadow-[0_-8px_32px_rgba(0,0,0,0.5)]`) since it now anchors to the bottom edge instead of sitting as a card. End Turn / Cancel / Deselect / extra-move-banner tokens are reused unchanged from `ActionsPanel.styles.ts:13-21`. Sheet uses its own existing tokens (`sheet.tsx`), unchanged.

### Copy
No new user-facing strings for action buttons, tooltips, or disabled reasons — every label in the bar and sheet is copied verbatim from the existing `ActionViewModel`s in `ActionsPanel.map.ts` (Position, Attack, "Deploy ({cost} Food)", "Upgrade ({cost} Wood)", "Buy Card (10 Gold)", "Cards ({n}/{HAND_LIMIT})", "Abilities", "Cancel", "Deselect", "End Turn ({time})", "Extra Move active! Select a soldier on the map to continue.").
- New copy, mobile only: the Sheet trigger button label — **"More Actions"**. If space allows, append the always-reachable deck count is dropped from the trigger itself (deck count lives in the Sheet header, see Placement and layout) — trigger stays exactly "More Actions", no dynamic count badge (KISS: avoids a second disabled-vs-enabled counting rule that doesn't exist today).
- Sheet header copy: "Actions" (title, verbatim from `ActionsPanel.tsx:41`), "Cards left in deck: {deckCount}" (verbatim from `ActionsPanel.tsx:44`).

### Interactions and motion
- Tapping any Row 2 action button behaves identically to today — same `onActionClick` handler, same disabled/tooltip semantics (`ActionsPanel.hook.ts:29-46`, unchanged).
- Tapping "More Actions" opens the Sheet sliding up from the bottom edge, using the Sheet's existing built-in transition (already used by `CustomSettingsSheet` on mobile, per the prior audit's note that it "becomes full-bleed" there) — no new animation authored, and it already respects `prefers-reduced-motion` via Radix's standard behavior (unchanged from existing Sheet usages elsewhere in the app).
- Closing the Sheet (`X` button, tap outside, `Escape`) returns focus to the "More Actions" trigger button (Radix `Dialog`/`Sheet` default focus-return behavior).
- The fixed bar itself has no entrance/exit animation — it is always present on mobile while `gameState.status !== 'finished'`, matching how `GameBoardHeader`/`PlayerInfoBar` are always present.
- No change to desktop interactions.

### Accessibility
- Touch targets: every button in Row 2's compact 4-across layout must stay at least 44×44 px (WCAG 2.5.5) — at 390px viewport width with 4 buttons plus bar padding, this requires the compact variant's 4 columns to each get at minimum `44px` height even if label text wraps to two lines; if the arithmetic doesn't clear 44px with the chosen gaps/padding, drop to 3-across (Position/Attack/Deploy) and put Deploy's End Turn pairing on its own second row rather than shrinking below the 44px floor. Verify the final rendered sizes in the browser (`ui-verify`) before calling this met — do not assume the CSS numbers alone clear it.
- Icon-only elements: none added — the "More Actions" trigger carries a text label, not just a chevron, so it doesn't need a supplementary `aria-label` the way icon-only zoom controls did (per the prior audit's finding 4).
- Keyboard/focus: the bar's buttons sit in normal DOM tab order after the map region and before `GameLog` (matching their visual position at the bottom of the mobile stack); the Sheet, when open, traps focus per Radix's standard `Dialog` behavior (already relied on elsewhere in this app) and returns focus to the trigger on close.
- Contrast: all text in the bar and sheet reuses existing token combinations already verified elsewhere in this panel (`text-xs`/`text-sm` on `bg-background/40` dark glass) — no new color combinations introduced.
- Screen readers: the fixed bar should carry a `role="region"` with an accessible name (e.g. `aria-label="Turn actions"`) so it's announced as a distinct landmark separate from the Sheet's own `aria-modal` dialog role when open.

### Acceptance criteria
<!-- Checked in the browser by the ui-verify skill, mobile viewport 390×844 unless noted. -->
- [ ] On initial load of a live game at 390×844, with no scrolling, the End Turn button is fully visible on screen.
- [ ] On initial load of a live game at 390×844, with no scrolling, Position, Attack, and Deploy buttons are fully visible on screen.
- [ ] At 390×844 in the default (sheet closed) state, all 5×6 map tiles (`MapGrid`) render fully on screen, with none obscured by the bottom bar.
- [ ] Tapping "More Actions" opens a Sheet showing Upgrade, Buy Card, Cards, and Abilities buttons, plus the "Cards left in deck: N" text and the info beacon.
- [ ] Closing the Sheet (X button, outside tap, or Escape key) returns focus to the "More Actions" button and restores the default bottom-bar-only view.
- [ ] In the `cardActionInProgress` state, the Cancel button appears in the bottom bar (not inside the Sheet), and Position/Attack/Deploy/End Turn render disabled with the same disabled reasons as today's desktop tooltips.
- [ ] In the `armySelectedCanAttack` state, the Deselect button appears in the bottom bar and the Attack button renders enabled.
- [ ] In the `extraMoveActive` state, the extra-move banner text renders in the bottom bar's Row 1, one line, not truncated to the point of losing meaning.
- [ ] When `isMyTurn` is false, no End Turn, Cancel, or Deselect button renders in the bottom bar; Position/Attack/Deploy render disabled.
- [ ] At 1280×720 (desktop), `ActionsPanel` renders identically to its current Card-in-aside layout — same testbed screenshot as `hud-actions-panel`'s existing states, no visual diff attributable to this change.
- [ ] Every button in the mobile bar's Row 2 measures at least 44×44 px in the rendered DOM (checked via browser dev tools in the `ui-verify` pass, not assumed from CSS).
- [ ] Scrolling the mobile page to `GameLog` at the bottom does not hide any of `GameLog`'s content behind the fixed bar (bottom padding confirmed sufficient).

## Review (ui-designer-b)
VERDICT: CHANGES REQUESTED

Verified against source: `ActionsPanel.tsx`, `ActionsPanel.styles.ts`, `ActionsPanel.map.ts`, `ActionsPanel.hook.ts`, `ActionsPanel.fixtures.ts`, `ActionButton.tsx`, `GameBoard.tsx`, `use-is-mobile.ts`, `sheet.tsx`, `button.tsx`, and a repo-wide grep for `motion-reduce`.

### What checks out
- Every line citation in `ActionsPanel.tsx` (40-44 title/deckCount, 47-70 Cancel/Deselect, 71-94 End Turn, 96-101 extra-move banner, 103-118 content grids) is exact.
- Every citation in `ActionsPanel.map.ts` (29-41 `canPosition`/`canAttack`, 54-90 `mainActions`/`alwaysAvailableActions`, 92-140 `secondaryActions`) is exact.
- `ActionsPanel.styles.ts:4` (`card` token), `:13-19` (end-turn tokens), `:26-40` (`buttonVariant` cva) are exact.
- `ActionsPanel.hook.ts:29-46` (`onActionClick` switch) is exact.
- The States table's five fixture-backed rows (`myTurnNoSelection`, `armySelectedCanAttack`, `cardActionInProgress`, `extraMoveActive`) match `ActionsPanel.fixtures.ts` verbatim, including the `extraMoveActive` fixture's `Deploy (0 Food)` cost override (`fixtures.ts:134`). Rows marked "derived" (`isMyTurn: false`, expiring timer) are correctly labeled as not-a-fixture.
- `use-is-mobile.ts:3`'s 768px breakpoint, `sheet.tsx`'s `side="bottom"` variant (lines 39-40), and `CustomSettingsSheet`'s existence (`src/modules/lobby/components/CustomSettingsSheet/`) are all real — the Sheet mechanism is buildable with existing primitives as claimed. `PlayerInfoBar.tsx:4` really does import `ChevronUp`/`ChevronDown`.
- Scope boundary holds: `GameLog`'s own content is untouched; only a bottom-padding compensation is added to avoid the new fixed bar covering it. That's a layout accommodation this task owns, not the Phase 4 redesign.
- Cognitive load: sticky bar (new placement, same buttons) + Sheet (reused idiom, already used by `CustomSettingsSheet`) is net one new UI concept for the player, not two. The Sheet is structurally necessary — without it, the only way to show 4 secondary actions without ever covering the map (mobile layout rule) is an overlay, and this is the overlay the app already uses elsewhere. No fix needed here, confirming this held up under challenge.

### Findings (must fix)

**1. The touch-target arithmetic in the spec checks the wrong dimension and the real content doesn't fit the floor it proposes.**
Did the math the spec asked for, for the 4-across Row 2 at 390px width, using the real tokens: `CardContent`'s `p-3` padding (`ActionsPanel.styles.ts:22`, 12px each side) and `gap-1.5` (`ActionsPanel.styles.ts:23`, 6px per gap, ×3 gaps for 4 columns):
`(390 - 24 padding - 18 gaps) / 4 = 87px average column width.`
Width clears 44px with huge margin — the 4-across layout was never at risk on the width axis the spec worried about ("does not fit 4 full-width buttons… shrink… so all 4 fit one row" conflates fitting-in-a-row with touch-target width; it's not the same problem).
The real problem is height, and it's the opposite of what the spec checked: the proposed compact variant (`h-11 text-[11px] px-1`) sits exactly at the 44px floor, but `ActionButton` renders an icon (`h-4 w-4` = 16px) + `gap-1` (4px) + label text, inside `buttonVariant`'s base `p-2` padding (8px top + 8px bottom = 16px). That's `16 + 4 + 16 = 36px` of fixed overhead before any text, leaving 8px for a label line — not enough for any text at `text-[11px]` (≈14px line-height). Multi-word labels that exist in the real fixtures (`"Deploy (0 Food)"`, `"End Turn (0:45)"`) won't fit on one line at 87px average column width either, so they'll wrap to two lines (`whitespace-normal`, `ActionButton.tsx:41`): `36 + 28 (two lines) = 64px` needed vs. 44px available. Result: clipped or visually overflowing button content in production, not a WCAG violation (the hit target itself is still 44px) but a broken-looking button.
Fix: don't shrink Row 2 below the height the existing `isMain:true` variant already uses (`h-16`, `ActionsPanel.styles.ts:31`) unless `ui-verify` shows a real vertical-budget problem. Width was never the constraint — 4 columns at ~87px average is fine at any of `h-14`/`h-16`. Drop the "shrink to h-11, fall back to 3-across if it doesn't clear 44px" framing entirely; it solves a width problem that doesn't exist while creating a height problem that does. See Final spec for the corrected sizing.

**2. The reduced-motion claim is false, and must be fixed, not just asserted.**
Spec text: "it already respects `prefers-reduced-motion` via Radix's standard behavior (unchanged from existing Sheet usages elsewhere in the app)." Grepped the repo for `motion-reduce`: it exists only in `src/testbed/components/{TestbedSidebar,PreviewStage}/*.styles.ts` — nowhere in `src/components/ui/sheet.tsx` and nowhere in any Sheet consumer, including `CustomSettingsSheet`. Radix's `Dialog`/`Sheet` primitives don't strip animation on their own; `sheetVariants` (`sheet.tsx:34-50`) applies `data-[state=open]:animate-in`/`slide-in-from-bottom` unconditionally, with no `motion-reduce:` variant anywhere in the chain. So today, no existing Sheet in this app respects reduced motion, and this spec's claim that it inherits that compliance is wrong because the compliance doesn't exist to inherit.
Fix: since skill `ui-design` requires "Motion respects `prefers-reduced-motion`" for new UI, and this spec introduces a new Sheet-trigger flow, add a scoped override on this feature's own `<SheetContent>` instance only (e.g. `className` with `motion-reduce:duration-0 motion-reduce:data-[state=open]:animate-none motion-reduce:data-[state=closed]:animate-none`) — a local className override, not a change to the shared `sheet.tsx` primitive (fixing every Sheet in the app is a separate, broader task). Note for the record, non-blocking: the reused `extraMoveBanner`'s `animate-pulse` (`ActionsPanel.styles.ts:21`) is now permanently on-screen during the whole turn instead of scrolled past — pre-existing motion, out of this task's scope, but worth a backlog line since this spec increases its exposure.

**3. The states table promises an accessibility fix that the Accessibility section never delivers.**
The States table's third row says "see Accessibility for the mobile no-hover-tooltip problem this exposes," but the Accessibility section only covers touch target size, icon-only labels, keyboard/focus order, contrast, and a screen-reader landmark name — no mention of tooltips at all. The problem is real: every button, including disabled ones, is wrapped by a Radix `Tooltip`/`TooltipTrigger` (`ActionButton.tsx:30-48`) that only reveals `disabledReason` on hover or focus. The `TooltipTrigger` wraps the outer `div` (`ActionButton.tsx:32`), which has no `tabIndex`, so it can't be focused by tap either. On a touchscreen, a player who taps a disabled Position/Attack/Deploy/Upgrade/etc. button gets no feedback at all about why — a capability desktop players have today that mobile players lose entirely under this redesign, on the exact buttons this spec is making permanently visible and central to the turn.
Fix: make `disabledReason` visible as static text, not hover-gated, for disabled buttons in the mobile bar and sheet — e.g. a one-line caption rendered directly under/near the button whenever `action.disabled` is true, independent of hover/focus/tap. This is also the only version of this fix that is screenshot-testable (a hover-dependent tooltip isn't observable by the `ui-verify` skill's static screenshots, which the skill's own criteria for testability requires).

### Minor (fold in, non-blocking)
- `GameBoard.tsx:21` (cited for the `overflow-y-auto` scroll container) is actually line 22; `GameBoard.tsx:63` (cited for `GameLog`'s position) is actually line 64. Off-by-one citations, fixed below.
- The mechanism for measuring the bar's rendered height to pad `GameLog` ("measured, not a hardcoded guess") isn't named — no ref/`ResizeObserver`/hook is specified. Not a design concern, but the architect needs to assign this as a concrete implementation step, not leave it as prose.

## Final spec

Everything in "Spec (ui-designer-a)" stands except the three fixes below, folded in directly (no redesign — same direction, same components, same states).

### Fix 1 — Row 2 sizing (replaces "Components and tokens" compact-variant paragraph and the touch-target paragraph under Accessibility)
Row 2 (Position, Attack, Deploy, End Turn) renders as a 4-column grid, same `grid grid-cols-4 gap-1.5` pattern as today's `mainGrid` (`ActionsPanel.styles.ts:23`) extended from 3 to 4 columns, inside the same `p-3`-padded container (`ActionsPanel.styles.ts:22`). At 390px viewport width this gives each column ≈87px average width `((390 - 24 padding - 18 gaps) / 4)` — comfortably over the 44px floor, so no width-driven shrink is needed.
Button height: keep the existing `isMain: true` variant's `h-16` (`ActionsPanel.styles.ts:31`), or an intermediate `h-14` if `ui-verify` at 390×844 shows the full stack (header + bar) eating too much vertical budget — but do not go below `h-14` (56px), and never introduce an `h-11` variant: at `h-11`, the icon (16px) + `gap-1` (4px) + `p-2` padding (16px) already consume 36px before any label text, and the real fixture labels (`"Deploy (0 Food)"`, `"End Turn (0:45)"`) wrap to two lines at this column width, needing ≈64px total — 20px more than `h-11` provides. No new `isCompact` cva variant; reuse `isMain: true` as-is, or add a single `h-14` step between `h-16` and the current `min-h-12` base if vertical budget turns out tight in `ui-verify`. The "fall back to 3-across + second row" idea from the draft is dropped — it fixed the wrong axis (width was never the problem) and doesn't fix the real one (two-line labels still need ≈64px of height whether there are 3 or 4 columns).

### Fix 2 — Reduced motion (adds to "Interactions and motion")
The Sheet used for "More Actions" gets a local className addition on its `SheetContent` usage (this feature's own JSX, not an edit to `src/components/ui/sheet.tsx`): `motion-reduce:duration-0 motion-reduce:data-[state=open]:animate-none motion-reduce:data-[state=closed]:animate-none`, so the slide-in-from-bottom transition is suppressed for users with `prefers-reduced-motion: reduced`. Drop the claim that this is inherited "for free" from Radix or from other Sheet usages — verified false by grep (`motion-reduce` appears nowhere in `sheet.tsx` or any existing Sheet consumer). This is the one new CSS rule this task adds; it does not touch the shared primitive or any other Sheet instance.

### Fix 3 — Visible disabled reasons on mobile (adds to "Accessibility")
In the mobile bar and sheet only (desktop keeps the existing hover tooltip unchanged), when `action.disabled` is true, render `action.disabledReason` as a static one-line caption (`text-[10px] text-destructive/90`, truncated with `title` attribute as a fallback for the full text) directly beneath the button, instead of relying on the Radix `Tooltip`'s hover/focus trigger. This applies to every disabled button surfaced by the bar (Row 2: Position/Attack/Deploy/End Turn) and the sheet (Upgrade/Buy Card/Abilities; Cards has no disabled-reason text today per `ActionsPanel.map.ts:127-129`, unchanged). The desktop `Tooltip` path in `ActionButton.tsx` is untouched; this is additive, mobile-only presentation reusing the same `disabledReason` string already computed in `ActionsPanel.map.ts:146`.

### Corrected citations
- The scrollable mobile column's `overflow-y-auto` is `GameBoard.tsx:22` (not 21).
- `GameLog`'s current position below the map is `GameBoard.tsx:64` (not 63).

### Acceptance criteria (supersedes the draft's list; all still checked via `ui-verify` at 390×844 unless noted)
- [ ] On initial load of a live game at 390×844, with no scrolling, End Turn, Position, Attack, and Deploy are all fully visible on screen.
- [ ] At 390×844 in the default (sheet closed) state, all 5×6 `MapGrid` tiles render fully on screen, none obscured by the bottom bar.
- [ ] Every button in Row 2 measures at least 44×44px in the rendered DOM (dev-tools measurement, not assumed from CSS) AND its icon + full label text (including cost/timer suffixes, e.g. "Deploy (0 Food)", "End Turn (0:45)") renders fully inside the button's visible bounds with no clipped or overflowing text, at both `myTurnNoSelection` and `extraMoveActive` fixture states.
- [ ] Tapping "More Actions" opens a Sheet showing Upgrade, Buy Card, Cards, and Abilities, plus "Cards left in deck: N" and the info beacon.
- [ ] Closing the Sheet (X, outside tap, Escape) returns focus to the "More Actions" button and restores the bar-only view.
- [ ] With `prefers-reduced-motion: reduce` set, opening/closing the Sheet shows no slide transition (instant appear/disappear), verified in the browser with that media feature forced.
- [ ] In `cardActionInProgress`, the Cancel button appears in the bottom bar; Position/Attack/Deploy/End Turn render disabled, each showing its `disabledReason` as visible on-screen text (not only on hover/tap) — specifically "Complete or cancel the current card action first." under each.
- [ ] In `armySelectedCanAttack`, Deselect appears in the bottom bar, Attack renders enabled, and disabled Position shows "This tile has no resources to position on." as visible text.
- [ ] In `extraMoveActive`, the extra-move banner text renders in Row 1, one line, not truncated to the point of losing meaning.
- [ ] When `isMyTurn` is false, no End Turn/Cancel/Deselect renders in the bar; Position/Attack/Deploy render disabled with no visible-text regression (same disabled-reason-caption rule applies).
- [ ] At 1280×720, `ActionsPanel` renders identically to its current Card-in-aside layout — no visual diff attributable to this change.
- [ ] Scrolling to `GameLog` at the bottom of the mobile page does not hide any of its content behind the fixed bar.

Status: APPROVED with the three fixes above folded in. No further design round needed; ready for the architect to turn into a phased implementation plan.
