# UI design: In-game lobby-style background + toggle

## Spec (ui-designer-a)

### Purpose and user story
As a player, I want the in-game board to use the same warm sky-gradient look as the lobby, with a toggle to turn it off, so that the match screen feels visually consistent with the lobby and I can still revert to the plain dark background if I prefer less visual noise.

### Placement and layout
- Desktop (1280x720): background applies to the root div of `GameBoardContent` (`src/features/game/components/GameBoard.tsx:25`), replacing its gradient class conditionally. The toggle lives in `GameBoardHeader`'s `rightGroup` (`src/modules/hud/components/GameBoardHeader/GameBoardHeader.tsx:54`), placed to the left of the turn-indicator pill, in its own pill matching `styles.turnIndicatorWrapper` (`rounded-md bg-black/40 border border-white/10 px-2.5 py-1`). Order in `rightGroup`: background toggle pill, then turn-indicator pill, then Start Game button (unchanged) — the toggle is a standing preference, not a per-turn status, so it sits first/outermost.
- Mobile (390x844): the whole `MAP_COLS` x `MAP_ROWS` map grid stays visible and untouched — this change touches only the header and the page background, nothing overlays the map. In `rightGroup`, the toggle's text label collapses (`hidden sm:inline`, the same technique already used for `styles.turnLabel` at `GameBoardHeader.styles.ts:15`), leaving only the icon and the Switch so the pill stays narrow. `rightGroup` already wraps (`flex flex-wrap`, `GameBoardHeader.styles.ts:4`), so the added pill drops to its own line under narrow widths without covering anything.

### States
| State | What the player sees | Trigger |
|---|---|---|
| Background on (default) | Board root div uses the lobby's sky gradient (`LobbyBackground.styles.ts:3`'s `linear-gradient(180deg,#2a1b3d_0%,#5c2f3a_42%,#a85a3b_70%,#d98b4c_100%)`, extracted to a shared constant) behind the HUD panels; toggle Switch is in the checked/on position. | Default for every player on first load (no stored preference yet). |
| Background off | Board root div uses today's gradient (`bg-gradient-to-b from-background via-background/95 to-black/90`, `GameBoard.tsx:25`) as the "off" state; Switch is unchecked. | Player clicks/taps the Switch, or it was already off from a previous session (persisted). |
| Hover / Focus (Switch) | Visible focus ring (`focus-visible:ring-2 focus-visible:ring-ring`, already built into `src/components/ui/switch.tsx:14`); no custom hover state needed beyond the primitive's own. | Keyboard tab or mouse hover onto the Switch. |
| Disabled | Not applicable — the toggle has no disabled state; it is always interactive once the header renders. | n/a |

No loading or error state: the preference is read from `localStorage` synchronously after mount (default-then-correct-in-effect, matching `TutorialBeacon.tsx:19-38`'s pattern), so there is a single frame where the board shows the "on" default before any stored "off" preference is applied — acceptable, the same flash pattern already shipped for other local-storage-backed UI in this codebase.

### Components and tokens
- Reuse: `Switch` from `src/components/ui/switch.tsx` (already used with an adjacent text label + matching `aria-label` in `src/modules/hud/components/GameLog/GameLog.tsx:53-57` — follow that exact pattern here). `Tooltip`/`TooltipTrigger`/`TooltipContent` from `src/components/ui/tooltip.tsx` (same primitives already used for icon-bearing controls in `ActionButton.tsx:5`) to carry the accessible label on mobile where the text is hidden. `Image` icon from `lucide-react` (verified present at `node_modules/lucide-react/dist/esm/icons/image.js`) for the pill's icon.
- New pattern count: one — a small "preference pill" matching the existing `turnIndicatorWrapper` shape. This is the one new visual pattern allowed per feature; no second new pattern is introduced.
- Tokens: pill wrapper `bg-black/40 border border-white/10` (token-for-token copy of `styles.turnIndicatorWrapper`, `GameBoardHeader.styles.ts:14`); icon `text-muted-foreground`; label text `text-xs font-semibold text-muted-foreground`, `hidden sm:inline` on mobile. No raw hex in the toggle control itself — the gradient value it switches to is reused verbatim from `LobbyBackground.styles.ts:3` (an existing literal, not a new one authored here).

### Copy
- Label text (desktop, next to the Switch): `Background`
- `aria-label` / Tooltip content (always, shown on mobile where the label text is hidden): `Toggle sky background`
- No other copy changes.

### Interactions and motion
- Click/tap the Switch (or its pill, via `asChild`/label association) to flip the preference instantly — no confirmation step, no animation beyond the Switch thumb's existing `transition-transform` (`switch.tsx:22`).
- The background class swap itself is an instant class change, not an animated transition — the lobby's own background has no entrance animation either (`LobbyBackground.styles.ts` has no transition on `sky`), so there is nothing to make `prefers-reduced-motion`-aware here.
- Keyboard: Switch is reachable by Tab, toggled with Space/Enter (native Radix `Switch` behavior, already relied on everywhere else it's used).

### Accessibility
- The Switch carries `aria-label="Toggle sky background"` directly (matching the `GameLog.tsx:56` precedent), so it is self-describing even where the text label is visually hidden on mobile — do not rely on the Tooltip alone for the accessible name, only for the hover/focus hint.
- Radix `Switch` reports `role="switch"` and `aria-checked` automatically; no extra ARIA needed.
- Visible focus ring is inherited from the primitive (`switch.tsx:14`), no override required.
- Contrast: `text-muted-foreground` label text sits on the same `bg-black/40` pill already used for `turnIndicatorWrapper` elsewhere in this header — no new contrast risk since it's a direct reuse.
- Color is never the only signal: the Switch's thumb position plus its `aria-checked` state communicate on/off; the sky-gradient background itself is also directly visible as confirmation.

### Acceptance criteria
- [ ] On first load with no stored preference, the in-game board's root background shows the lobby's sky gradient (`#2a1b3d` → `#5c2f3a` → `#a85a3b` → `#d98b4c`) and the header's toggle Switch is in the checked/on position.
- [ ] Clicking the toggle Switch switches the board's root background to the current dark gradient (`from-background via-background/95 to-black/90`) and the Switch moves to unchecked/off, with no change to the map, HUD panels, or any other element.
- [ ] Reloading the page after toggling off keeps the background off (preference persists across reloads).
- [ ] At 390px width, the toggle's text label `Background` is not visible but the Switch and its icon are, and the map grid (all `MAP_COLS` x `MAP_ROWS` tiles) remains fully visible and unobstructed.
- [ ] Tabbing to the Switch shows a visible focus ring, and pressing Space toggles it.
- [ ] The Switch's accessible name (inspected via the accessibility tree or `aria-label`) reads "Toggle sky background" at both breakpoints.

## Review (ui-designer-b)
VERDICT: APPROVED

Verified against code before approving:
- `GameBoardHeader.tsx:54-68`, `GameBoardHeader.styles.ts:13-14` — `rightGroup`/`turnIndicatorWrapper` shapes match as described; `turnIndicatorWrapper` only renders `isPlaying && ...`, the new pill is not gated the same way (toggle is a standing preference, visible pre-game too) — consistent with spec intent, not a defect.
- `LobbyBackground.styles.ts:3` — gradient literal `linear-gradient(180deg,#2a1b3d_0%,#5c2f3a_42%,#a85a3b_70%,#d98b4c_100%)` matches the spec's "on" value exactly.
- `GameBoard.tsx:25` — current "off" class `bg-gradient-to-b from-background via-background/95 to-black/90` matches.
- `switch.tsx:8-29` — Radix `Switch` has built-in `focus-visible:ring-2`, checked/unchecked thumb transform, no disabled state forced on; spec's accessibility claims hold without overrides.
- `GameLog.tsx:53-57` — `Switch` + `aria-label` pattern (no visible label needed for a11y) is an exact precedent for this spec's Switch usage.
- `ActionButton.tsx:34-51`, `tooltip.tsx:30` — `Tooltip`/`TooltipTrigger`/`TooltipContent` precedent exists for icon-bearing controls.
- `node_modules/lucide-react/dist/esm/icons/image.js` — `Image` icon exists.
- Contrast: `GameBoardHeader` sits at the top of the page; the gradient's top stop is `#2a1b3d` (dark purple), the darkest point of the ramp — the new pill (`bg-black/40` over that) keeps at least the same contrast the existing `turnIndicatorWrapper` already has today. No contrast regression.
- Mobile: `rightGroup: 'flex items-center gap-2'` — spec says it already wraps; actual class has no `flex-wrap`, only `root` (`GameBoardHeader.styles.ts:4`) has `flex-wrap`. Since `rightGroup` is a flex child of `root`, the wrap happens at the `root` level (whole `rightGroup` block drops below `leftGroup`, not pill-by-pill inside `rightGroup`). This still satisfies "doesn't cover the map" (header stays above `main`), but the spec's wording "`rightGroup` already wraps... so the added pill drops to its own line" misattributes which element wraps. Fix folded into Final spec below — no behavior change, just corrects the cited class.
- Icon placement order (icon vs. label vs. Switch) and which element is `asChild` for `TooltipTrigger` were unspecified — resolved in Final spec for implementer determinism, since the Tooltip's trigger must be the focusable `Switch` itself (one tab stop), not the whole pill, to avoid adding a second, non-interactive tab stop.

No missing states, no mobile/map overlap, no contrast or keyboard gaps, all primitives verified present. Two clarifications folded in below; no redesign needed.

## Final spec
Purpose, copy, tokens, interactions, motion and acceptance criteria: unchanged from the Spec (ui-designer-a) section above — adopt it as written, with these two corrections:

1. **Wrap mechanics (correction):** `GameBoardHeader.styles.ts:4`'s `root` class (`flex flex-wrap items-center justify-between gap-2`) is what wraps on narrow widths, not `rightGroup` (`GameBoardHeader.styles.ts:13`, no `flex-wrap`). In practice this still means the new background-toggle pill plus the turn-indicator pill plus Start Game button (the whole `rightGroup` block) drop below `leftGroup` on narrow widths without covering the map — same outcome the original spec described, just attributed to the correct class. No new wrap class needed.
2. **Tooltip/Switch wiring:** `TooltipTrigger asChild` wraps the `Switch` element directly (matching `ActionButton.tsx:34-46`), not the whole pill `div`. The pill's icon and `hidden sm:inline` label stay as plain sibling markup outside the `Tooltip`. This keeps exactly one tab stop in the pill (the Switch itself carries both the tooltip and the `aria-label`), avoiding a second, non-interactive focus stop that assistive tech would announce with no accessible name.

Pill internal order (left to right, for implementer determinism, not tested by acceptance criteria but needed for a consistent build): `Image` icon, then `span.turnLabel`-style label (text `Background`, `hidden sm:inline`), then the `Switch` (wrapped in `Tooltip`/`TooltipTrigger asChild`/`TooltipContent` carrying "Toggle sky background"). Pill wrapper: `styles.turnIndicatorWrapper`'s exact classes (`flex items-center gap-1.5 rounded-md bg-black/40 border border-white/10 px-2.5 py-1 text-xs font-semibold`), placed before `turnIndicatorWrapper` in `rightGroup`'s markup order, per the original spec.

All acceptance criteria from the Spec section apply unchanged and are screenshot/test-observable as written.
