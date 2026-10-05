# UI design: Match Format mode-selection cards in CreateGameDialog

## Spec (ui-designer-a)

### Purpose and user story
As a host setting up a new game, I want to see each match format (Solo vs. Bot AI, 2/3/4 Players) as a
distinct labeled card instead of a text dropdown, so I can scan and pick a format at a glance the same
way I already pick a faction army right below it.

### Placement and layout
Replaces the "Match Format" `Select` only (`CreateGameDialog.tsx:43-56`). Same `formGroup` slot, same
`Label htmlFor`/`id` pairing, same position in the form (between Game Name and Choose Faction Army).
No other part of the dialog changes.

- **Desktop (1280×720, dialog `max-w-lg` ≈ 512 px, verified in
  `test-results/ui-verify/testbed-lobby-create-dialog-state-Multiplayer--desktop.png`):** a 2-column,
  2-row grid of 4 cards, `grid-cols-2 gap-2` — same `gap-2` already used by `factionGrid`
  (`CreateGameDialog.styles.ts:15`). Each card ~240×64 px: icon-in-circle on the left, title + meta
  stacked on the right (horizontal "Colonist.io row" inside a grid cell, not a single full-width list —
  a full-width 4-row list was considered and rejected, see Notes).
- **Mobile (390×844, dialog fills near-full width inside the `Dialog` primitive's own responsive
  padding, verified in `test-results/ui-verify/testbed-lobby-create-dialog-state-Multiplayer--mobile.png`):**
  same `grid-cols-2`, 2 rows. This is a dialog, not the map/HUD, so the "whole map grid stays visible"
  rule does not apply here (the dialog already covers the map on mobile, as the current Select-based
  version does). Card min height 56 px keeps the icon circle and two lines of text off each other; no
  text wraps past 2 lines at 390 px (verify "Archipelago Skirmish" and "Solo vs. Bot AI" at the chosen
  font size during implementation — shrink to `text-[10px]` meta if it wraps).

### States
| State | What the player sees | Trigger |
|---|---|---|
| Default / unselected | Card border `border-white/10`, fill `bg-black/30`, icon circle `bg-black/40 border-white/10 text-muted-foreground` | Not the current `maxPlayers` value |
| Selected | Card border `border-amber-400`, fill `bg-amber-500/20`, glow `shadow-[0_0_15px_rgba(245,158,11,0.4)]`, `scale-105`; icon circle `bg-amber-500/20 border-amber-500/30 text-amber-400` (same amber family as the dialog header icon, `CreateGameDialog.styles.ts:5`) | `maxPlayers === opt.value` |
| Hover (unselected) | `hover:border-white/20 hover:bg-black/50` | Pointer over an unselected card |
| Focus | `focus-visible:ring-2 focus-visible:ring-ring` on the card button, visible regardless of selection state | Keyboard Tab |
| Disabled | Not used — all 4 formats are always selectable, matching current `Select` behavior (no disabled `SelectItem` today) | — |

Selecting the "Solo vs. Bot AI" card still reveals the existing Debug Training Mode row
(`CreateGameDialog.tsx:70-90`, `vm.maxPlayers === 1` condition) directly below the faction grid —
unchanged, no new state to design there.

### Components and tokens
- Reuse: native `<button type="button">` grid, same primitive choice as the faction grid
  (`CreateGameDialog.tsx:61-67`) — no shadcn `RadioGroup` here, to stay consistent with the sibling
  selector one `formGroup` down in the same dialog (triage's explicit ask: "visual consistency within
  the same dialog"). `Label` (`@/components/ui/label`, already imported). Icons from `lucide-react`
  (already a project dependency, icons verified present at
  `node_modules/lucide-react/dist/esm/icons/{bot,swords,users,crown}.js`): `Bot` (1 player),
  `Swords` (2 players), `Users` (3 players), `Crown` (4 players).
- New tokens in `CreateGameDialog.styles.ts` (naming parallel to the existing `factionButton*` family):
  - `formatGrid`: `grid grid-cols-2 gap-2`
  - `formatCard`: `flex items-center gap-2.5 p-2.5 rounded-xl border transition-all duration-200 text-left`
  - `formatCardSelected`: `border-amber-400 bg-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.4)] scale-105` (identical value to `factionButtonSelected`, `CreateGameDialog.styles.ts:17`)
  - `formatCardUnselected`: `border-white/10 bg-black/30 hover:border-white/20 hover:bg-black/50` (identical value to `factionButtonUnselected`, `CreateGameDialog.styles.ts:18`)
  - `formatIconCircle`: `h-9 w-9 rounded-xl flex items-center justify-center shrink-0 border transition-colors duration-200`
  - `formatIconCircleSelected`: `bg-amber-500/20 border-amber-500/30 text-amber-400`
  - `formatIconCircleUnselected`: `bg-black/40 border-white/10 text-muted-foreground`
  - `formatTextGroup`: `min-w-0`
  - `formatTitle`: `text-xs font-bold text-foreground truncate`
  - `formatMeta`: `text-[10px] text-muted-foreground truncate`
- No new primitive, no new file beyond the existing `.styles.ts`/`.tsx`/`.map.ts` set already owned by this component (per triage scope).

### Copy
Exact text preserved from the current `SelectItem`s (`CreateGameDialog.tsx:50-53`), split into a title
line and a meta line — no words added or removed:

| maxPlayers | Title | Meta |
|---|---|---|
| 1 | Solo vs. Bot AI | Training match |
| 2 | 2 Players | 1v1 Duel |
| 3 | 3 Players | Archipelago Skirmish |
| 4 | 4 Players | Grand Conquest |

`Label` text stays "Match Format" (`CreateGameDialog.tsx:44`, unchanged).

### Interactions and motion
- Click/tap a card → `vm.onMaxPlayersChange(opt.value)`, same handler the `Select` already calls
  (`CreateGameDialog.hook.ts:52`, no hook changes needed beyond its existing
  `onMaxPlayersChange: setMaxPlayers`).
- Keyboard: each card is a focusable `<button>`; `Tab`/`Shift+Tab` moves between the 4 cards in DOM
  order (1, 2, 3, 4 player), `Enter`/`Space` activates the focused card — native button behavior, no
  custom key handling.
- Transition: `transition-all duration-200` on border/background/scale (same duration already used by
  `factionButton`, `CreateGameDialog.styles.ts:16`); respects `motion-reduce:` — add
  `motion-reduce:transition-none motion-reduce:scale-100` to `formatCardSelected` so the `scale-105`
  pop does not trigger under `prefers-reduced-motion`.
- No entrance/exit animation; cards are present from dialog open.

### Accessibility
- Wrap the 4-card grid in a `<div role="group" aria-labelledby="maxPlayers">` and give the existing
  `Label` `id="maxPlayers"` (it already has `htmlFor="maxPlayers"`, `CreateGameDialog.tsx:44`) so
  screen readers announce the group's purpose, replacing the implicit `<select>` semantics being removed.
- Each card button gets `aria-pressed={vm.maxPlayers === opt.value}` so assistive tech announces
  selection state (selection is otherwise conveyed only by color/glow, which fails "never rely on color
  alone").
- Icon is decorative (title text already names the mode) — icons get no `aria-label`; the button's
  accessible name comes from its visible text content (title + meta), which React renders as the
  button's text node, no extra `aria-label` needed.
- Focus ring: default `focus-visible:ring-2 focus-visible:ring-ring` from the shared button/interactive
  pattern — must be visible against both `formatCardSelected`'s amber glow and `formatCardUnselected`'s
  dark fill; verify in the browser screenshot, not just assumed.
- Touch target: card is ~240×64 px desktop, min 56 px tall at any width — clears the 44×44 px WCAG
  2.5.5 target size per `docs/ai/skills/ui-design` layout rules.
- Text contrast: `text-foreground` title and `text-muted-foreground` meta on `bg-black/30`/
  `bg-amber-500/20` — same token pairs already in production use in `factionName`/`debugModeDescription`
  (`CreateGameDialog.styles.ts:20,23`), carrying over their already-verified ≥4.5:1 contrast.

### Acceptance criteria
- [ ] `lobby-create-dialog` testbed preview, "Multiplayer" state, desktop screenshot: 4 cards in a
      2×2 grid replace the dropdown; the "4 Players" card shows the selected (amber border + glow)
      state, the other 3 show the unselected (white/10 border) state.
- [ ] Same preview, "Solo vs bot" state, desktop screenshot: "Solo vs. Bot AI" card shows selected
      state; the Debug Training Mode row still renders below the faction grid.
- [ ] Mobile screenshot (390×844) of the same two states: all 4 cards fully visible with no horizontal
      scroll, no clipped or wrapped-past-2-lines text.
- [ ] Clicking/tapping each of the 4 cards in sequence (Playwright) updates which card carries the
      selected-state classes and, for the "Solo vs. Bot AI" card only, shows the Debug Training Mode
      row.
- [ ] Tabbing through the dialog reaches all 4 cards in order before reaching "Choose Faction Army",
      and each shows a visible focus ring.
- [ ] No `SelectTrigger`/`SelectContent`/`SelectItem` import remains for Match Format in
      `CreateGameDialog.tsx` (the `Select` import itself may still be needed elsewhere — verify before
      removing the import statement).

## Review (ui-designer-b)
VERDICT: APPROVED

Verified against code:
- `CreateGameDialog.tsx:43-56` is exactly the Match Format `Select` block (formGroup open at 43, `</div>` close at 56) — scope boundary correct.
- `CreateGameDialog.styles.ts:15-18`: `factionGrid` is `'grid grid-cols-2 sm:grid-cols-4 gap-2'`, `factionButtonSelected`/`factionButtonUnselected` match the spec's cited values verbatim — new `formatCardSelected`/`formatCardUnselected` tokens are correctly copied.
- `CreateGameDialog.hook.ts:52` is `onMaxPlayersChange: setMaxPlayers,` — matches the claim, no hook change needed.
- `CreateGameDialog.tsx:70-90` is the `vm.maxPlayers === 1` Debug Training Mode block — unaffected by this change, confirmed.
- Icons exist: `node_modules/lucide-react/dist/esm/icons/{bot,swords,users,crown}.js` all present.
- Dialog shell: `CreateGameDialog.styles.ts:2` `dialogContent` is `max-w-lg` — desktop width claim correct.
- Dark theme tokens (`src/app/globals.css:48,57-58`): `--foreground: 210 40% 98%`, `--muted-foreground: 230 20% 70%` on the near-black background — the title/meta contrast pairing mirrors `factionName`/`debugModeDescription`'s already-shipped combination, no new contrast risk.
- Testbed preview `lobby-create-dialog` (`CreateGameDialog.preview.tsx:140-154`) has exactly the two states named in the acceptance criteria, `'Multiplayer'` (maxPlayers 4) and `'Solo vs bot'` (maxPlayers 1) — the criteria's screenshot targets exist.

One gap, folded into the Final spec below rather than sent back (documentation-only, no design change): `CreateGameDialog.preview.tsx:49-62` contains its own copy of the `Select` markup, structurally identical to `CreateGameDialog.tsx:43-56` but a separate literal block (the preview renders `CreateGameDialogView`, not the real `CreateGameDialog`). The acceptance criteria's screenshots are taken from this preview. If only `CreateGameDialog.tsx` is edited, the testbed will keep showing the old dropdown and every screenshot-based acceptance criterion will fail by construction, not by a real regression. Implementer must apply the identical card-grid replacement to both files.

No other issues: states table covers default/selected/hover/focus, explicitly addresses disabled (correctly "not used"), `aria-pressed` plus `role="group"`/`aria-labelledby` covers the lost `<select>` semantics, `motion-reduce` variant is specified on the scale transform, touch targets clear 44×44, mobile fit is checked against the real viewport screenshots already in `test-results/ui-verify/`, and acceptance criteria are each tied to a concrete screenshot or Playwright interaction. Copy table reproduces `CreateGameDialog.tsx:50-53` text exactly, no invented content (no difficulty mechanic, matching triage's correction).

## Final spec
Spec above stands as written, with one addition to "Components and tokens":

- **Preview parity (new):** `CreateGameDialog.preview.tsx:49-62` holds a second, independent copy of the Match Format `Select` inside `CreateGameDialogView`. Apply the exact same replacement (the `formatGrid`/`formatCard*`/`formatIconCircle*` markup, same icon-per-`maxPlayers` mapping, same `aria-pressed`/`role="group"` wiring) there too, driven by `props.maxPlayers`/`props.onMaxPlayersChange` instead of `vm.*`. Without this, the acceptance criteria's screenshots (taken from this preview, `CreateGameDialog.preview.tsx:140-154`) will still show the old dropdown even after `CreateGameDialog.tsx` is fixed.

All other sections (Placement and layout, States, Components and tokens, Copy, Interactions and motion, Accessibility, Acceptance criteria) are approved as written by ui-designer-a — no further changes requested.
