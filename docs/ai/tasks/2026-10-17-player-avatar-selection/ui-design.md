# UI design: Player avatar selection from built-in Human Avatars

## Spec (ui-designer-a)

### Purpose and user story
As a player (logged-in or guest), I want to pick a face for my commander from the 25 bundled Human Avatars, so other players recognize me in the lobby, HUD and victory screen instead of seeing a plain initial letter.

### Verified current state
- `LobbyGameRow.tsx:74-78` renders each player as an `Avatar`/`AvatarFallback` (`h-8 w-8`) showing `p.name.charAt(0)` on the player's color.
- `PlayerInfo.tsx:31-41`, `PlayerInfo.styles.ts:31-32` render `viewModel.spriteSrc` (the color army sprite) in a `h-9 w-9 rounded-xl bg-black/50 p-0.5 border border-white/15 ring-1` box, `playerRingColors[color]` for the ring.
- `VictoryDialog.tsx:46-55`, `VictoryDialog.styles.ts:8-9` render the same pattern at `h-16 w-16`, `ring-2`.
- `CreateGameDialog.tsx:64-76`, `CreateGameDialog.styles.ts:24-29` already has a reusable "pick one of N images in a grid" pattern (`factionGrid`: `grid grid-cols-2 sm:grid-cols-4 gap-2`, each option a bordered button that highlights amber when selected) for choosing the faction color. This is the pattern to reuse for the avatar grid, not invent a new one.
- `Lobby.tsx:38-47` is the account-level header area: commander name, `LinkGoogleAccountButtonView` (shown only for guests), Logout. This is the only existing "account settings" surface — there is no separate settings page.
- Joining a game (`LobbyGameRow.tsx:121-129`, `Lobby.tsx:122-129`) is a single click on "Join", no dialog in between. So a picker gated behind a join dialog would not exist for joiners; the avatar must be chosen before that, in the lobby header, so it is already set by the time either Create or Join fires.
- Looked at `Avatars_01.png`, `Avatars_13.png`, `Avatars_25.png` (256×256): each is a character head on a translucent teal diamond plaque, generous padding, high-contrast chunky shapes. They read fine down to the existing 32px (`LobbyGameRow`) and 36px (`PlayerInfo`) boxes with `object-contain`; legible at 64px (`VictoryDialog`). No avatar needs to be excluded for illegibility.
- `globals.css` dark tokens (`.dark`): `--primary` 190 90% 50% (cyan), `--accent` 45 100% 55% (gold), `--background` 230 40% 6%, `--border` 230 30% 25%, `--ring` 190 90% 50%.

### Placement and layout
One picker, one surface: the Lobby header (`Lobby.tsx` `styles.headerRight`), next to the existing commander greeting. This is reachable for every player, logged-in or guest, before they create or join, which covers both "create/join flow" and "account settings" with a single control — there is no separate settings page to duplicate it in.

- A new **"Change Avatar" button** sits in `styles.headerRight`, between the commander name/greeting block and the `LinkGoogleAccountButtonView`/Logout buttons. It shows the player's current avatar (or the existing fallback) at 28px plus the label "Change Avatar" on desktop, icon-only with `aria-label` on mobile (see below).
- Clicking it opens an **Avatar Picker Dialog** (shadcn `Dialog`, same chrome as `CreateGameDialog`: `bg-background/90 backdrop-blur-2xl border border-white/15 max-w-lg`).
- `CreateGameDialog` additionally shows a **read-only preview** of the current avatar next to "Choose Faction Army" (small thumbnail + "This is your commander's face — change it from the lobby header" caption), so the host sees what will appear without a second editable grid. No second picker is built inside `CreateGameDialog`; this avoids a duplicate interaction for the same stored value.

Desktop (1280×720):
- Lobby header: avatar button is `h-9` tall, inline with existing `styles.logoutButton`/`LinkGoogleAccountButtonView`, same gap (`gap-3`, matching `styles.headerRight` pattern — verify exact token in `Lobby.styles.ts` before implementing, since it was not read in this pass; reuse whatever gap class the header already uses).
- Dialog: centered, `max-w-lg` like `CreateGameDialog`, grid of 25 avatars `grid-cols-5` (5×5, clean square, no partial row), each cell ~64×64 with 8px gap, scroll not needed at this size.

Mobile (390×844):
- Login/lobby screens are not the map screen, so the "whole map grid stays visible" rule does not apply here (no `MapGrid` is mounted on the lobby route). The Lobby header already stacks/wraps on narrow widths; the avatar button becomes icon-only (current avatar thumbnail, 32×32, no visible text) to fit next to Logout without wrapping to a third row.
- Dialog becomes a `DialogContent` that is `max-w-[calc(100vw-2rem)]` (same safe-area pattern already implied by other dialogs — verify against `CreateGameDialog.styles.ts:2`'s `max-w-lg`, which Radix's `Dialog` already clamps to viewport width by default) with the grid at `grid-cols-5` still, cells shrinking to ~52×52 with 6px gap, so all 25 stay visible without an inner scroll area on a 390px-wide screen (5 × 52 + 4 × 6 = 284px, fits with dialog padding).

### States
| State | What the player sees | Trigger |
|---|---|---|
| Default (no avatar chosen) | Lobby header button, `PlayerInfo`, `LobbyGameRow`, `VictoryDialog` all show today's existing fallback unchanged: color sprite in HUD/victory, first letter of name in the lobby row avatar stack. No new element appears until a player opens the picker and chooses. | Player has never opened the picker (new account or guest who hasn't picked this session). |
| Picker closed, avatar chosen | Header button thumbnail shows the chosen avatar image instead of the fallback glyph. `LobbyGameRow`, `PlayerInfo`, `VictoryDialog` render that avatar image in place of the fallback, keeping the existing color ring/border. | Avatar id is set on the account (logged-in) or in this match's session (guest). |
| Dialog open, loading | Dialog opens immediately (the 25 images are static bundled assets, not fetched); no loading spinner state is needed for the grid itself. If the save-to-account write is in flight after a click, the clicked cell shows a small spinner overlay and the dialog's close ("Done") action is disabled until it resolves. | Player clicks "Change Avatar". |
| Dialog open, selected | The chosen cell has a gold ring and raised scale, mirroring `factionButtonSelected` (`border-amber-400 bg-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.4)] scale-105`). Exactly one cell is selected at a time. | Player clicks a cell (or arrows to it and presses Enter/Space). |
| Dialog open, hover/focus (unselected cell) | `border-white/10 bg-black/30` → `hover:border-white/20 hover:bg-black/50` (same as `factionButtonUnselected`), plus `focus-visible:ring-2 focus-visible:ring-ring` for keyboard focus. | Mouse hover or keyboard focus. |
| Save error | Inline text below the grid: "Couldn't save your avatar. Try again." in `text-destructive`, dialog stays open, previous selection (if any) is restored as the visual selection. | The account write (`accounts/{uid}.avatarId`) fails. |
| Guest player | Same dialog and grid; selection is kept only in this browser session (no `accounts/{uid}` doc exists for a guest), applied to `Player.avatarId` on create/join. No special copy change — the guest never sees an error about missing an account because nothing is written there. | Player is in guest mode (`mode === 'guest'` per `Login.tsx:38`, i.e., no linked account). |

### Components and tokens
- Reuse: `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter` (`@/components/ui/dialog`, pattern from `CreateGameDialog.tsx:4`); `Button` (`@/components/ui/button`); `RegistryIcon` (`@/modules/shared`) for a user/face icon on the header button (verify an appropriate id such as `user` or `smile` exists in the icon registry before implementation — not confirmed in this pass); `next/image` with `unoptimized` for every avatar thumbnail, matching `PlayerInfo.tsx:33-40` and `VictoryDialog.tsx:47-54`.
- New visual pattern: none. The picker grid reuses `CreateGameDialog`'s faction-grid button pattern (`factionGrid`/`factionButton*` classes, renamed for avatars, e.g. `avatarGrid`/`avatarButton*`) at `grid-cols-5` instead of `grid-cols-2 sm:grid-cols-4`.
- Tokens: `bg-background/90`, `border-white/15`, `border-white/10`, `bg-black/30`, `bg-black/50`, `border-amber-400`, `bg-amber-500/20`, `text-destructive`, `text-muted-foreground`, `focus-visible:ring-ring` — all already used in `CreateGameDialog.styles.ts`. No raw hex values.

### Copy
- Header button (desktop): "Change Avatar" (label text) next to the thumbnail.
- Header button (mobile, icon-only): `aria-label="Change your avatar"`.
- Dialog title: "Choose Your Avatar"
- Dialog description: "Pick the face your commander shows to other players."
- Each grid cell: `aria-label="Avatar {n} of 25"` (e.g. "Avatar 1 of 25" for `human-01`) — the assets have no in-game names, so an ordinal label is the honest, verifiable copy.
- Footer button: "Done" (closes the dialog; the selection already saved on click, same as the existing faction/format pickers in `CreateGameDialog` which save on click, not on a separate submit).
- Save error text: "Couldn't save your avatar. Try again."
- `CreateGameDialog` avatar preview caption: "This is your commander's face — change it from the lobby header."

### Interactions and motion
- Click/tap a grid cell: selects it immediately (no separate "confirm" step), persists via the account/session write, updates the header thumbnail and is live everywhere `Player.avatarId` is read once the match document reflects it.
- Keyboard: grid is a `role="group"` (matching `CreateGameDialog.tsx:45`'s `role="group" aria-labelledby`) of 25 `<button type="button">` cells, reachable by Tab in sequence or arrow keys if a roving-tabindex grid pattern is implemented (optional refinement; plain sequential Tab + Enter/Space is the minimum bar and is what `CreateGameDialog`'s existing grids already do — no arrow-key grid navigation exists there today, so none is required here either).
- Selecting a cell: `scale-105` transition (`transition-all duration-200`, matching `factionButton`), respects `motion-reduce:transition-none motion-reduce:scale-100` as `formatCardSelected` already does (`CreateGameDialog.styles.ts:15`).
- Closing the dialog (Escape, outside click, or "Done") always keeps the last clicked avatar; there is no cancel.

### Accessibility
- Grid container: `role="group"` with `aria-label="Avatar picker"` (no separate visible `<Label>` is needed since the `DialogTitle` already names it, but the group gets a label so screen readers announce it apart from the title when focus moves inside).
- Each cell: `<button aria-pressed={isSelected} aria-label="Avatar {n} of 25">` with the image marked `alt=""` (decorative; the button's `aria-label` already carries the accessible name) — same pattern as `aria-pressed` already used on `CreateGameDialog.tsx:49` for format cards.
- Visible focus ring on every cell (`focus-visible:ring-2 focus-visible:ring-ring`), contrast of the gold selection border/glow against the dark panel exceeds 4.5:1 for the accompanying "selected" state communicated by more than color (it is also the only cell with the elevated `scale-105` and glow shadow).
- Header button: `aria-label="Change your avatar"` on mobile; on desktop the visible text "Change Avatar" is itself the accessible name.
- Touch targets: grid cells are at minimum 52×52px (mobile) and 64×64px (desktop), both above the 44×44 WCAG 2.5.5 target; header icon-only button on mobile is at least 36×36 with adequate hit padding — round up to 44×44 hit area via padding if the visual button is smaller, per the design-language's touch-target rule.
- Motion: selection scale/glow transition has a `motion-reduce:` variant (see above); no auto-playing animation.

### Acceptance criteria
- [ ] Lobby header shows a "Change Avatar" control (desktop: labeled; mobile: icon-only with `aria-label="Change your avatar"`) next to the commander greeting.
- [ ] Clicking it opens a dialog titled "Choose Your Avatar" with a 5×5 grid of 25 avatar images, each a `<button aria-pressed>` with `aria-label="Avatar {n} of 25"`.
- [ ] Clicking a grid cell visually selects it (amber border, `scale-105`, glow) and no other cell stays selected at the same time.
- [ ] After selecting an avatar and returning to the lobby, the header button's thumbnail reflects the chosen avatar.
- [ ] A player with no avatar chosen still shows today's fallback everywhere (first letter in `LobbyGameRow`, color sprite in `PlayerInfo` and `VictoryDialog`) — no broken image, no empty box.
- [ ] After choosing an avatar and starting/joining a match, `LobbyGameRow`'s avatar stack, `PlayerInfo`'s header avatar, and `VictoryDialog`'s winner avatar (when that player wins) all render the chosen avatar image instead of the fallback, with the existing player-color ring/border unchanged.
- [ ] All 25 grid cells are reachable by Tab and selectable by Enter/Space; the focused cell shows a visible ring.
- [ ] On a 390px-wide viewport, the picker dialog and its 5×5 grid fit without horizontal scroll and without clipping any cell.
- [ ] Forcing the account write to fail (e.g. offline) shows "Couldn't save your avatar. Try again." in `text-destructive` under the grid, and the dialog does not silently close.

## Review (ui-designer-b)

Verified citations against code: `Lobby.styles.ts:14` (`headerRight: 'flex flex-wrap items-center justify-end gap-3 self-end sm:self-center'`), `Lobby.styles.ts:18` (`logoutButton`), `Lobby.tsx:39-47` (header-right block: `playerInfo`, conditional `LinkGoogleAccountButtonView`, `Logout` button). `CreateGameDialog.styles.ts:24-27` (`factionGrid`/`factionButton*`) and `CreateGameDialog.tsx:61-74` (faction grid markup) match as cited. `PlayerInfo.tsx:28-39`/`PlayerInfo.styles.ts:28` (`avatarContainer`, `playerRingColors`), `VictoryDialog.tsx:44-54`/`VictoryDialog.styles.ts:8-9`, and `LobbyGameRow.tsx:70-80` (`Avatar`/`AvatarFallback`, `p.name.charAt(0)`) all match. Asset path confirmed: `public/tiny-swords/UI Elements/UI Elements/Human Avatars/` has exactly 25 files, `Avatars_01.png`..`Avatars_25.png`.

Both open gaps resolved:
- `Lobby.styles.ts:14` `headerRight` is `flex flex-wrap items-center justify-end gap-3 self-end sm:self-center`. The avatar button should use this same `gap-3` rhythm and rely on the existing `flex-wrap` to drop to a second line on narrow widths — no extra wrapping logic needed.
- Icon registry (`src/modules/icons/icon-registry.config.json`) has no `user`/`face`/`smile`/`avatar`/`profile` id. Closest existing id is `users` (already used elsewhere in the codebase via `RegistryIcon`). Use `id="users"` for the header button's icon when no avatar is chosen yet; once an avatar is chosen, the header button shows the avatar thumbnail instead of this icon (see Final spec).

Findings:

1. **Mobile header-button sizing is self-contradictory.** The Mobile layout section says the icon-only button is "32×32, no visible text"; the Accessibility section says it is "at least 36×36... round up to 44×44 via padding if the visual button is smaller." Two different numbers for the same element, and the second is a conditional instruction rather than a spec an implementer can build from. Fix folded into Final spec: a single concrete rule — the button's hit area is `h-11 w-11` (44×44) on mobile, with a 28px thumbnail/icon centered inside. No rounding judgment call left for implementation.

2. **`CreateGameDialog` avatar preview is scope creep.** Triage's confirmed scope (`triage.md` "Scope → In") names exactly three render surfaces — `LobbyGameRow`, `PlayerInfo`, `VictoryDialog` — plus the picker itself. `ui-design.md`'s Placement section adds a fourth touch point: a read-only preview thumbnail and caption inside `CreateGameDialog`. It duplicates information the player already saw seconds earlier in the lobby header (the only place the avatar can be changed, per the spec's own reasoning that joining has no intermediate dialog), adds a fourth file for architect/implementer/tester/docs-sync to touch, and is not required by any acceptance criterion. Cut in Final spec: no changes to `CreateGameDialog.tsx`/`.styles.ts`. If a host wants reassurance, the header button itself already shows the live thumbnail.

3. **Testability of the aria-label decision.** The spec proposes `aria-label="Avatar {n} of 25"` and justifies it as "the assets have no in-game names, so an ordinal label is the honest, verifiable copy" — correct, and ordinal position is the standard pattern for an unnamed-item grid read by a screen reader (announces "Avatar 1 of 25", a generic set description, not a meaningless internal slug like `human-01`). Keep it. But a screen-reader label alone is a weak hook for automated tests, which need to find a specific cell deterministically (e.g. "select `human-07`, confirm it persists"). Resolution folded into Final spec: add `data-avatar-id="human-01"` (etc.) on each cell `<button>` alongside the existing `aria-label`/`aria-pressed`. This doesn't change what's announced or how it looks; it only gives `tester-*` a stable, order-independent query that doesn't depend on counting grid position.

4. **Keyboard cost of a 25-stop sequential Tab grid** (noted by ui-designer-a as an accepted trade-off, matching `CreateGameDialog`'s existing grids which also have no arrow-key nav). This is a real cognitive/motor cost for a keyboard-only user compared to the 2–8 option grids elsewhere in the app, but it is a rarely-visited settings dialog, not a gameplay-critical path, and the spec already flags roving-tabindex as an available future refinement. Non-blocking; no change required for this task.

5. Everything else checked out: color-ring-plus-image preserves the existing color-coding so no information relies on color alone; states table covers default/selected/hover/focus/loading-write/error/guest; all tokens cited (`bg-background/90`, `border-amber-400`, `text-destructive`, etc.) are already in use in `CreateGameDialog.styles.ts`; `motion-reduce:` variant is specified for the selection transition; the 390px math (5×52 + 4×6 = 284px) is correct arithmetic and leaves clear margin inside a `max-w-[calc(100vw-2rem)]` dialog on a 390px viewport (358px available minus dialog padding); no raw hex values; no new visual pattern invented beyond reusing the faction-grid button styles.

VERDICT: APPROVED

## Final spec

Everything in "Spec (ui-designer-a)" above stands, with these changes:

- **Icon**: the header button's icon-only state (shown before any avatar is picked) uses `<RegistryIcon id="users" />` — confirmed id in `src/modules/icons/icon-registry.config.json`. Once an avatar is chosen, the thumbnail image replaces this icon in the same slot; the icon never appears again for that player on that device.
- **Header button sizing, both breakpoints, concrete and final**:
  - Desktop (`sm:` and up): `Button variant="ghost" size="sm"` (same component/size as the existing `Logout` button at `Lobby.tsx:45`), containing a 24px thumbnail/icon plus the label "Change Avatar", placed in `styles.headerRight` between the commander greeting and `LinkGoogleAccountButtonView`/Logout, same `gap-3` rhythm as the rest of that row.
  - Mobile (below `sm:`): the button's hit area is `h-11 w-11` (44×44, meets WCAG 2.5.5 outright, no padding judgment call), icon-only, with a 28px thumbnail/icon centered inside. `aria-label="Change your avatar"`. Relies on `headerRight`'s existing `flex-wrap` (`Lobby.styles.ts:14`) to drop to a second line if the row is full; no new wrapping logic needed.
- **No changes to `CreateGameDialog.tsx` or `CreateGameDialog.styles.ts`.** The preview thumbnail and caption ui-designer-a proposed for that dialog are cut: out of the triage-confirmed scope (`LobbyGameRow`, `PlayerInfo`, `VictoryDialog` are the three confirmed render surfaces), and redundant with the header button's live thumbnail the host already saw. This also means "Choose Faction Army" in `CreateGameDialog` is untouched by this task.
- **Grid cell markup**, final: `<button type="button" aria-pressed={isSelected} aria-label={`Avatar ${n} of 25`} data-avatar-id={id}>` where `id` is the stable catalog id (`human-01`..`human-25`) and `n` is 1-indexed position. The `aria-label` stays ordinal (screen readers announce "Avatar 7 of 25", a standard pattern for an unnamed-item set); `data-avatar-id` is the stable, human-readable hook for `tester-*` and `preview-*` to select a specific avatar without depending on grid order.
- All other copy, states, tokens, interactions, motion, and acceptance criteria from the Spec section above are unchanged and are what `architect-a` and `implementer-*` build against. The acceptance-criteria checklist in the Spec section is the one later stages use; append none for the cut `CreateGameDialog` preview since it was never in that checklist.
