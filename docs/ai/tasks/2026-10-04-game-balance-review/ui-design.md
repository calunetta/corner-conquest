# UI design: AoE / Catan / Diluvium-inspired HUD and lobby proposals

Note on scope: this task's `triage.md` tier is S, pipeline `game-designer-a` only (game-balance review,
no ui-designer stage). This file is written at the invoking agent's explicit direction, not by the
triage/swarm pipeline. It is a **design proposal only** — no code, plan, or `progress.md` changes — and
does not carry a `Spec (ui-designer-a)` / `Review (ui-designer-b)` / `Final spec` structure, since no
ui-designer-b review was requested. Treat every "Proposed" item below as a candidate for a future,
properly-triaged UI task.

## Method
- Read `docs/ai/skills/ui-design` conventions and `docs/README.md` §2–3 for the current visual language.
- Read source for the components discussed: `src/modules/hud/components/ActionsPanel/ActionsPanel.tsx`,
  `src/modules/hud/components/PlayerInfo/PlayerInfo.tsx` and `PlayerInfoStats.tsx`,
  `src/modules/hud/components/GameBoardHeader/GameBoardHeader.tsx`,
  `src/modules/lobby/components/Lobby/Lobby.tsx`, `src/features/game/components/GameBoard.tsx`.
- Reused the prior audit's evidence (`docs/ai/tasks/2026-10-04-ui-ux-review/ui-design.md`) rather than
  re-screenshotting every screen — its screenshots were taken this same session's dev server.
- Screenshotted fresh in this session: `testbed-lobby-main-state-With-20open-20games--desktop.png`
  (`node .claude/skills/ui-verify/scripts/snapshot.mjs "http://localhost:9002/testbed/lobby-main?state=With%20open%20games"`).
  The dev server (port 9002) dropped mid-session before a `map-grid` capture could be taken; that
  proposal below is grounded in source only, flagged as such.
- Reference research (Age of Empires HUD, Colonist.io/Catan visuals) was supplied by the invoking agent
  from this session's prior research, not independently re-verified by me; Diluvium's specifics were
  explicitly flagged by the invoker as unverified (BGG blocked), so I did not use it beyond the two
  verified references.

---

## Proposal 1 — AoE-style always-visible resource readout in `PlayerInfo`'s own card (not a new global bar)

**Reference:** Age of Empires' top-edge resource bar: icon + live count per resource, always visible,
no hover required.

**Current Corner Conquest state:** `PlayerInfoStats.tsx:84-101` already renders a `resourcesGrid` of
food/wood/gold chips (`ResourceIcon` + numeric value, `src/modules/shared/resource-icon`), one row per
player card inside `PlayerInfoBar` (left rail, `GameBoard.tsx:30`, already commented in code as
"Colonist-style Players HUD", `GameBoard.tsx:29`). The numbers are already always-visible, not
hover-gated — the prior audit's finding 6 (`docs/ai/tasks/2026-10-04-ui-ux-review/ui-design.md`) flagged
ambiguity, but `PlayerInfoStats.tsx:86-98` shows each chip already has a `Tooltip` with the resource's
full label. So the chips are not unlabeled; they are icon + number with a label on hover, which is the
AoE pattern already, just per-player-card rather than in one global bar.

**Gap vs. AoE:** AoE's bar is for *your own* economy only, pinned to one fixed top-edge location,
independent of whichever unit is selected. Corner Conquest's resource numbers live inside the scrollable
`PlayerInfoBar` list, which collapses by default on mobile (`PlayerInfoBar.tsx:12-16`) and requires
finding your own card among 2–4 in the list on desktop. There is no fast, fixed-position answer to "how
much wood do I have right now" while focused on the map.

**Proposed change:** Add a **slim resource strip inside `GameBoardHeader`**, visible only when
`isPlaying` (same gating as the existing VP Goal badge at `GameBoardHeader.tsx:34-39`), showing the
*local* player's three resources (food/wood/gold) as compact icon+number pairs, reusing the exact
`ResourceIcon` component already used in `PlayerInfoStats.tsx:90`. Placement: immediately right of the
`VP Goal` badge, before the `rightGroup` turn indicator, inside `leftGroup`
(`GameBoardHeader.tsx:23-40`). Token-level: a `rounded-lg border border-white/10 bg-black/40 px-2.5 py-1
flex items-center gap-2.5` wrapper matching the existing `vpGoalBadge` glass-chip style (verify exact
classes in `GameBoardHeader.styles.ts`, not read this session — flag for implementer to confirm against
the real file rather than guessing values). Each resource: `ResourceIcon` (`h-3.5 w-3.5`) + `<span
className="text-xs font-bold text-foreground">{value}</span>`, separated by `gap-2`. No new component —
this is a 3-icon inline block, below the "one new visual pattern" budget.

**Mobile:** collapses the same way the VP Goal badge presumably does (unverified — read
`GameBoardHeader.styles.ts` and the mobile screenshot before sizing); if VP Goal survives on mobile, the
resource strip should too, since both communicate "my current status," which is exactly AoE's bar
purpose. If screen width forces a choice, resource strip wins over VP Goal (VP is in `PlayerInfo`'s own
card already visible when `PlayerInfoBar` expands; resources only duplicate there).

**Feasibility / files:** `src/modules/hud/components/GameBoardHeader/GameBoardHeader.tsx` (view),
`GameBoardHeader.hook.ts` (needs to read the local player's resources — confirm this hook already has
access to `useGameBoard()`'s local player, likely yes given it already derives `turnPlayerName`),
`GameBoardHeader.styles.ts` (new token for the resource strip, reuse `vpGoalBadge`'s shape values),
`GameBoardHeader.types.ts` (extend `GameBoardHeaderViewProps` with a `resources` field, same shape as
`PlayerInfoViewModel['resources']` in `PlayerInfo.types.ts` — confirm exact type before implementing).
Low complexity: no new primitive, no new dialog, reuses `ResourceIcon`.

---

## Proposal 2 — Colonist.io-style mode cards for `CreateGameDialog`, reusing the lobby's existing card language

**Reference:** Colonist.io's game-mode selection: horizontal cards, icon-in-circle + title + inline meta
row (player-count icons, bot count, a pill-style difficulty/setting selector right on the card).

**Current Corner Conquest state:** unverified in this session — `CreateGameDialog.tsx` was not read.
`Lobby.tsx:50-65` already uses a comparable visual language for its own "New Campaign" hero: an
icon-in-a-badge (`Compass`, `Lobby.tsx:24`), a bold title + inline `Badge` ("Host Match",
`Lobby.tsx:54`), and a short description line — this is structurally the Colonist.io card pattern
already, just used once for the single "create" CTA rather than per-option.

**Proposed change:** If `CreateGameDialog`'s format/faction selection (referenced in `docs/README.md`
§2 as "faction, format, and advanced settings") is currently a `RadioGroup`-of-text-labels or a
`<select>`-style list (needs confirmation — flag for the implementer to check before using this spec
literally), replace it with horizontal option cards matching `LobbyGameRow`'s established room-card
shape (`src/modules/lobby/components/LobbyGameRow/LobbyGameRow.tsx`, not read this session but it's the
existing "room as a card" pattern visible in the lobby screenshot: avatar circle, title, inline meta
badges, a primary action button on the right). Each format/faction option becomes: icon-in-circle
(reuse the `headerIcon`/`createHeroBadge` treatment from `Lobby.styles.ts`) + title + one line of meta
(e.g., player count icons via the existing `Users`-style icon already seen in the room list,
`Lobby` screenshot shows `2/4` with a people icon) + a selected-state ring (`ring-2 ring-primary`,
matching `playerRingColors` token pattern already used in `PlayerInfo.styles.ts:32`).

**Feasibility / files:** `src/modules/lobby/components/CreateGameDialog/CreateGameDialog.tsx` and
`.styles.ts` and `.types.ts` — **not read this session**; this proposal is directional only and must be
re-grounded against the actual current markup (which may already be a card-style selector; AoE/Catan
pattern may already be partially present) before any implementation plan is written. Flag as the
single biggest "verify before building" item in this document.

---

## Proposal 3 — AoE's "one consolidated panel, not icon toggles" applied to `ActionsPanel`

**Reference:** AoE's selected-unit panel is one streamlined stat block; the HUD is contextual, showing
only what's relevant to the current selection, not a wall of always-on icon buttons.

**Current Corner Conquest state:** `ActionsPanel.tsx:103-117` renders `mainActions` +
`alwaysAvailableActions` in one `mainGrid`, then a `Separator`, then `secondaryActions` in a
`secondaryGrid` — all action buttons are shown together regardless of selection state except for their
individual `disabled` prop (per `ActionButton.tsx`, not read this session, inferred from
`ActionsPanelViewModel`'s shape). This is already closer to AoE's "one panel" than to a multi-toggle
HUD — there's no competing panel to merge. The real AoE-pattern gap is **contextual emphasis**, not
panel count: all six-ish action buttons render at equal visual weight whether or not an army is
selected, per the prior audit's screenshot description (`hud-actions-panel`, "Army selected, can
attack" state shows the same button grid shape as "My turn, no selection").

**Proposed change:** When `hasSelectedArmy` is true, visually promote the actions that apply to that
specific army (Move/Attack/Position/Deploy-adjacent, whichever `mainActions` resolves to) by giving
`mainGrid` buttons a `ring-1 ring-primary/40` and slightly larger touch target, while `secondaryActions`
(presumably Buy Card / Abilities / upgrade-style, global actions not tied to the selected army) drop to
a visually quieter row — already partially achieved by the existing `Separator`
(`ActionsPanel.tsx:112`) and `isMain` prop split, so this is a token-weight tweak (add the ring class
conditionally on `hasSelectedArmy`), not a structural change. Keep the AoE principle of "the right panel
content for the current selection" by relying on the **existing** `mainActions`/`secondaryActions` split
already computed in `ActionsPanel.hook.ts` (not read this session, but its output shape is visible via
`ActionsPanel.types.ts`'s `ActionsPanelViewModel`) rather than adding new conditional panels.

**Feasibility / files:** `src/modules/hud/components/ActionsPanel/ActionsPanel.tsx` (add conditional
class to the `mainGrid` wrapper, `ActionsPanel.tsx:104`), `ActionsPanel.styles.ts` (new token,
e.g. `mainGridActive`). No new component, no new primitive. Smallest of the three proposals.

---

## Proposal 4 — Catan-style per-player accent consistency check (no new work found needed)

**Reference:** Colonist.io's board uses strong, consistent per-player accent colors (red/blue/white/
orange) against muted terrain, with the accent carried through pieces, UI chrome, and text.

**Current Corner Conquest state:** already does this. `PlayerColor` (blue/red/purple/yellow, per the
`ui-design` skill) drives `playerBorderColors`, `playerBgGlow`, `playerRingColors` in
`PlayerInfo.styles.ts` (imported at `PlayerInfo.tsx:13`), and the prior audit confirmed Combat Dialog
colors player names by the same palette (`docs/ai/tasks/2026-10-04-ui-ux-review/ui-design.md`, finding
7's evidence). The one gap the prior audit found — `GameLog` entries not colored by player — is already
captured as finding 7 / backlog item 7 in that document; **this proposal does not duplicate it**, it
only confirms the Catan-style per-player accent pattern is otherwise already in place and should be the
template `GameLog`'s fix follows (reuse `playerBorderColors`/text-color equivalents, not a new palette).

**No file changes proposed here** beyond pointing the eventual `GameLog` fix (already tracked in the
`2026-10-04-ui-ux-review` task) at the existing `PlayerInfo.styles.ts` color maps as its source of truth,
so the two tasks don't invent two different player-color token sets.

---

## Proposal 5 — Lobby room cards: Catan-style compact meta row (minor, grounded in the fresh screenshot)

**Reference:** Colonist.io's room/mode cards pack avatar, title, and meta (player count, difficulty) into
one dense horizontal row with a single primary CTA.

**Current Corner Conquest state (verified by screenshot this session,
`test-results/ui-verify/testbed-lobby-main-state-With-20open-20games--desktop.png`):** the lobby already
matches this pattern closely: each room row shows a host avatar initial-circle (color-coded, e.g. the
purple "R" for Rex), the room title, a host-name chip with a trophy icon, a player-count badge
("2 / 4"), and a single `Join` CTA button — structurally identical to the Colonist.io room-card
description. The only visible gap against the reference: Colonist.io's cards show an inline difficulty
or mode pill directly on the card (e.g. "Fast", "Standard"); Corner Conquest's room card shows player
count but no at-a-glance indicator of fog-of-war-on/off, bot count, or VP goal — a player must open the
info icon (the small circled `i` left of each `Join` button, visible in the screenshot) to see those
settings.

**Proposed change:** Add one more inline pill to `LobbyGameRow` for the single most decision-relevant
setting — VP goal (e.g. a small `Badge variant="outline"` reading `30 VP`, reusing the same `Badge`
primitive already used for "2 Open Rooms" in `Lobby.tsx:91`) — so a scanning player can compare rooms
without opening each popover. Keep the existing info-icon popover for the rest (fog of war, bot count,
card settings) — this is additive, not a replacement.

**Feasibility / files:** `src/modules/lobby/components/LobbyGameRow/LobbyGameRow.tsx` and `.types.ts`
(pass `victoryPointGoal` through if not already in `LobbyGameRowProps` — not confirmed this session) and
`.styles.ts` for the new badge token. Small: one `Badge`, no new primitive, matches `Lobby.tsx:91`'s
existing `Badge` usage exactly.

---

## Summary table

| # | Pattern (source) | Target component | Size | Verified this session? |
|---|---|---|---|---|
| 1 | AoE resource bar | `GameBoardHeader` | Small | Yes — source read, resource chips confirmed to already exist in `PlayerInfo` |
| 2 | Colonist.io mode cards | `CreateGameDialog` | Unknown — needs file read first | **No — flagged, do not build from this spec alone** |
| 3 | AoE one-panel contextual emphasis | `ActionsPanel` | Smallest | Yes — source read |
| 4 | Catan per-player accent | `GameLog` (already tracked elsewhere) | N/A (confirms, doesn't add work) | Yes — source read |
| 5 | Colonist.io room-card meta pill | `LobbyGameRow` | Small | Yes — fresh screenshot + `Lobby.tsx` source |

## Handoff note for architects
Every proposal above reuses existing tokens (`ResourceIcon`, `Badge`, the `playerBorderColors`/
`playerRingColors`/`playerBgGlow` maps, the glass-chip shape already used for `vpGoalBadge`) — none
requires a new shadcn primitive or a new visual pattern beyond what `docs/README.md` §2 already
documents. Proposal 2 is the one exception: it cannot be scoped until `CreateGameDialog.tsx` is read,
since its current markup may already partially implement the card pattern. Recommend a follow-up S-tier
triage for Proposal 1 + 3 + 5 together (all three touch only existing components, no new files), and a
separate XS triage to first *read* `CreateGameDialog.tsx` before deciding whether Proposal 2 is worth a
spec at all.

---

## Review (ui-designer-b)

Scope of this review: Proposals 1, 3, 5 only (this task's Phases 4-6; Proposals 2 and 4 are out of
scope per `triage.md`'s Scope section). Read `GameBoardHeader.tsx/.types.ts/.map.ts/.hook.ts/.styles.ts`,
`PlayerInfoStats.tsx`, `PlayerInfo.styles.ts`, `PlayerInfo.types.ts`, `PlayerInfo.map.ts`,
`src/modules/shared/resource-icon.tsx`, `ActionsPanel.tsx/.styles.ts/.types.ts`, `ActionButton.tsx`,
`MobileActionsBar.tsx/.styles.ts`, `ActionsPanel.map.ts`, `LobbyGameRow.tsx/.types.ts/.styles.ts/.map.ts`,
`Lobby.styles.ts`, `GameBoard.tsx`, `PlayerInfoBar.tsx`, `game-board.types.ts`. `ResourceStatViewModel`
export question: resolved by architect-b in `plan.md`'s Decisions/File plan, no action here.

### Proposal 1 — GameBoardHeader resource strip

**Finding 1 (token values wrong, fix required before build).** `vpGoalBadge`'s real classes
(`GameBoardHeader.styles.ts:7`) are:
`'flex items-center gap-2 rounded-md bg-background/70 px-3 py-1 text-sm font-semibold border border-white/5'`
Proposal 1 guessed `rounded-lg border border-white/10 bg-black/40 px-2.5 py-1 flex items-center
gap-2.5` — every token differs (`rounded-lg`→should be `rounded-md`, `border-white/10`→`border-white/5`,
`bg-black/40`→`bg-background/70`, `px-2.5`→`px-3`, `gap-2.5`→`gap-2`). Fix: the new wrapper must copy
`vpGoalBadge`'s exact string, not approximate it — these two chips sit side by side in the same row, so
any mismatch (border opacity, corner radius, background) is immediately visible as inconsistent chrome.

**Finding 2 (mobile-collapse premise is wrong, conclusion happens to be right).** Proposal 1 says the
strip should collapse "the same way the VP Goal badge presumably does" and flags this unverified.
Verified: `vpGoalBadge` has no responsive class at all — `root` is `'flex flex-wrap items-center
justify-between gap-2'` (`GameBoardHeader.styles.ts:4`) and `vpGoalBadge` renders unconditionally
whenever `isPlaying` (`GameBoardHeader.tsx:34-39`), on every breakpoint. It does not collapse; it wraps
to a second line via `flex-wrap` if the row runs out of width. So there is no existing "mobile-collapse
behavior" to match. Fix the spec text: the resource strip should likewise render unconditionally on
`isPlaying`, with no `hidden`/`sm:` class, same as its sibling — not "collapse like VP Goal" but "never
collapse, same as VP Goal."

**Finding 3 (placement is safe against the map-grid rule — confirmed, not assumed).**
`GameBoardHeader` is a normal block-flow child above `PlayerInfoBar`/`MapGrid` (`GameBoard.tsx:22-34`),
never `absolute`/`fixed`, so it cannot overlap the map grid regardless of how many lines it wraps to on
narrow viewports. On mobile the outer page scrolls (`overflow-y-auto`, `GameBoard.tsx:22`); on desktop
the column is `lg:h-screen lg:max-h-screen ... lg:overflow-hidden` with the board row as `flex-1
min-h-0`, so a taller header (e.g. wrapping to 2 lines at 390 px once a 3rd badge is added) shrinks the
map's share of a fixed-height viewport by a few px rather than covering it. Acceptable for a single
small badge; no fix needed, just note it for the implementer so a 2-line header on mobile isn't treated
as a regression.

**Finding 4 (duplication is intentional and correctly justified, not a new gap).** The strip duplicates
`PlayerInfoStats.tsx:84-101`'s resource chips, but that duplication is the point: `PlayerInfoBar`
collapses on mobile by default (`isPlayerInfoOpen` initialised to `!isMobile`, `PlayerInfoBar.tsx:14`),
so the player cards — and the only other place resources render — are hidden until the player taps to
expand. Without the header strip, mobile has zero always-visible resource readout, which is exactly the
gap Proposal 1 set out to close. Keep the strip's visibility independent of `PlayerInfoBar`'s collapsed
state.

**Finding 5 (feasibility, minor DRY gap, not blocking).** `useGameBoard()` exposes `localPlayer: Player`
(`game-board.types.ts:90`), confirming `GameBoardHeader.hook.ts` can read the local player's raw
resources. But the `ResourceStatViewModel[]` mapping logic already exists as `toResources(player)` in
`PlayerInfo.map.ts:81-96` and is **not exported** (no `export` keyword on that function). Implementer
should export it and import into `GameBoardHeader.map.ts` rather than re-deriving the same
`food`/`wood`/`gold` → `ResourceStatViewModel[]` mapping a second time (DRY). Both files live inside the
same `hud` module, so this is an intra-module import, not a boundary violation.

**Finding 6 (states — none missing).** The strip is a static, non-interactive display (no button, no
focus target), gated only by the same boolean (`isPlaying`) as its sibling badges — matching the
existing state model exactly (no loading/error/disabled/selected states apply to either badge). No gap.

**Verdict on Proposal 1: ready to build once Finding 1's token string and Finding 2's wording are fixed.**
Both are folded into the Final spec below.

### Proposal 3 — ActionsPanel contextual ring emphasis

**Finding 7 (file list misses the mobile variant — fix required before build).**
`ActionsPanel.tsx:122-131` branches on `useIsMobile()`: mobile renders `MobileActionsBar`
(`MobileActionsBar.tsx`), not `ActionsPanelView`. `MobileActionsBar.tsx:91` has its own `mainActions`/
`alwaysAvailableActions` grid (`styles.row2(...)`, defined in `MobileActionsBar.styles.ts:17-27`) —
a separate wrapper from `ActionsPanel.styles.ts`'s `mainGrid`. Proposal 3's file list
(`ActionsPanel.tsx`, `ActionsPanel.styles.ts` only) would add the `hasSelectedArmy` ring exclusively on
desktop. Since `mainActions` render on **both** breakpoints (unlike `secondaryActions`, which on mobile
live behind the "More Actions" sheet and are genuinely absent from the main view), the same game state
(`hasSelectedArmy: true`) would look emphasized on desktop and unemphasized on mobile — an inconsistency
the spec doesn't intend. Fix: add `MobileActionsBar.tsx` and `MobileActionsBar.styles.ts` to the file
plan, with an equivalent conditional class on `row2`'s wrapper (or pass the ring class as a `cn()` merge
into the existing `cva` variant the way `MobileActionsBar.styles.ts:43-46` already merges
`actionsPanelStyles.buttonVariant`). The "quieter secondary row" half of Proposal 3 does stay
desktop-only correctly, since `secondaryActions` are already fully hidden on mobile (behind the sheet) —
no fix needed there.

**Finding 8 (interaction with the existing `isPendingMatch` treatment — note, not a fix).**
`ActionButton.tsx:37,40` already gives a per-button visual promotion when `action.isPendingMatch` is
true (`variant="default"` + `buttonVariant({ isPendingMatch: true })` → solid `bg-primary
text-primary-foreground`, `ActionsPanel.styles.ts:36`). That flag means "this specific action is the
currently in-progress pending action" (computed per-button in `ActionsPanel.map.ts:62,71,88,105,120,129,
138` via `isPendingMatch(...)` from `ActionsPanel.disabledReasons.ts`), a narrower and different signal
than Proposal 3's `hasSelectedArmy` (army selected in general, no action chosen yet). The two can be
visually true at once (army selected, and the player has clicked "Attack" so it's now the pending
action) — a solid-fill button inside a `ring-1 ring-primary/40` container reads fine together (container
ring vs. button fill are different visual layers), but call this out explicitly in the implementer's
notes so nobody "fixes" the ring away thinking it duplicates `isPendingMatch`.

**Finding 9 (states, contrast — no gap).** `ring-primary/40` on a `bg-background/40` card
(`ActionsPanel.styles.ts:4`) is a subtle outline, not a text/icon color change, so it doesn't by itself
carry meaning for colorblind users — but it doesn't need to: the panel's actions are still fully labeled
with icon + text (`ActionButton.tsx:43-44`) regardless of ring state, so the ring is a bonus emphasis
layer, not the only signal of "these apply to your selection." No accessibility gap.

**Verdict on Proposal 3: ready to build once Finding 7's mobile file is added to the plan.**

### Proposal 5 — LobbyGameRow VP-goal badge

**Finding 10 (proposal's own "needs confirmation" item resolves cleanly, simplifies the file plan).**
`LobbyGameRowProps.game` is typed as the full `GameState` (`LobbyGameRow.types.ts:4`), and `GameState`
already carries `settings.victoryPointGoal` — confirmed in use at `LobbyGameRow.map.ts:9` (`{ label:
'Victory Point Goal', value: String(settings.victoryPointGoal) }` inside the existing popover's
`toSettingsSummaryRows`). So **no prop plumbing is needed**: `game.settings.victoryPointGoal` is already
reachable in `LobbyGameRow.tsx` without touching `LobbyGameRow.types.ts`. Proposal 5's "pass
`victoryPointGoal` through if not already in `LobbyGameRowProps`" caveat is resolved — drop it from the
file plan.

**Finding 11 (Badge token — confirmed reusable as specified).** `Lobby.tsx:91`'s `Badge` usage
(`styles.roomsCountBadge`, `Lobby.styles.ts:37`: `'bg-primary/20 text-primary border border-primary/30
text-xs font-semibold'`) is the nearby reference the proposal points to; `Badge variant="outline"` as
proposed is a different, lighter treatment (shadcn's default `outline` variant: transparent background,
`border` + `text-foreground`) — both exist in the same codebase's vocabulary (`SettingsDisplay`'s card
badges at `LobbyGameRow.tsx:39,49` already use `variant="secondary"`). Either `outline` or the
`roomsCountBadge`-style primary tint works visually; `outline` is the better choice here specifically
because the row already uses solid-ish `Crown`/`Users` icon+text pairs in `muted-foreground`
(`LobbyGameRow.styles.ts:6-8`) — an `outline` badge reads as a third, quieter data point rather than
competing with the `Join`/`Full` button's visual weight for attention. No fix needed; proposal's choice
stands.

**Finding 12 (states, layout — no gap).** `styles.root` is `flex flex-wrap items-center justify-between
gap-x-4 gap-y-2 ...` (`LobbyGameRow.styles.ts:2`) — already wraps, so one more inline badge in
`infoGroup` (`flex items-center gap-4 text-sm text-muted-foreground`, `LobbyGameRow.styles.ts:6`) has a
safe fallback on narrow viewports; no mobile-specific class is needed, consistent with how
`hostInfo`/`playersInfo` already behave in that flex row. No loading/error/disabled state applies — the
badge is a static read of already-fetched `game.settings`, same as the two existing `infoGroup` chips.

**Verdict on Proposal 5: ready to build as specified, with Finding 10's simplification (no type change).**

VERDICT: CHANGES REQUESTED (Findings 1, 2, 7 are fixes the implementer needs; Findings 3-6, 8-12 are
confirmations folded into the Final spec below, no further back-and-forth needed — this verdict exists
only to carry Findings 1/2/7 forward before build starts).

## Final spec

Supersedes the "Proposed change" paragraphs of Proposals 1, 3, 5 above for implementation purposes;
Proposals 2 and 4's text is unchanged (out of scope, see `triage.md`).

### Proposal 1 — GameBoardHeader resource strip (final)
- New token in `GameBoardHeader.styles.ts`, copied verbatim from `vpGoalBadge` (not approximated):
  `resourceStrip: 'flex items-center gap-2 rounded-md bg-background/70 px-3 py-1 text-sm font-semibold border border-white/5'`.
  Inside it, three `ResourceIcon` (`h-3.5 w-3.5 shrink-0`, same as `PlayerInfoStats.tsx:90`) + `<span
  className="text-xs font-bold text-foreground">{value}</span>` pairs, each pair separated by the chip's
  own `gap-2` (reuse `PlayerInfo.styles.ts:55`'s `resourceValue` class for the span, since it's the exact
  same visual job).
- Placement unchanged from the original proposal: inside `leftGroup`, immediately after `vpGoalBadge`,
  gated by the same `isPlaying` boolean, no separate mobile class — renders unconditionally on every
  breakpoint like `vpGoalBadge` (Finding 2).
- `GameBoardHeaderViewModel` gains `resources: ResourceStatViewModel[]` (type import path per
  architect-b's `plan.md` resolution — not re-specified here). `GameBoardHeader.map.ts` builds it by
  calling the now-exported `toResources(localPlayer)` from `PlayerInfo.map.ts` (Finding 5) rather than
  duplicating the `food`/`wood`/`gold` mapping. `GameBoardHeader.hook.ts` passes `localPlayer` from
  `useGameBoard()` (`game-board.types.ts:90`) into the mapper.
- Acceptance criteria (screenshot-testable): at desktop width, header shows `VP Goal: N` badge followed
  by a second glass chip with three icon+number pairs (food, wood, gold) in that order, both chips using
  identical corner radius/border/background; at 390 px width, the same two chips are both still visible
  (wrapped to a second line is acceptable, hidden is not).

### Proposal 3 — ActionsPanel contextual ring emphasis (final)
- `ActionsPanel.styles.ts`: add `mainGridActive: cn(mainGrid, 'ring-1 ring-primary/40 rounded-lg')`
  (exact merge mechanism — `cn()` vs. a `cva` boolean variant — left to the implementer; either is
  consistent with existing patterns in this file). Applied to `ActionsPanel.tsx`'s `mainGrid` wrapper
  (`ActionsPanel.tsx:102`) when `hasSelectedArmy` is true.
- Mobile parity (Finding 7, required): the equivalent class must also apply to `MobileActionsBar.tsx`'s
  `row2` wrapper (`MobileActionsBar.tsx:91`) under the same `hasSelectedArmy` condition, via a token
  added to `MobileActionsBar.styles.ts` (merge with the existing `cva('grid gap-1.5', { variants:
  { columnCount } })`, e.g. `cn(styles.row2({ columnCount: rowCount }), hasSelectedArmy &&
  'ring-1 ring-primary/40 rounded-lg')`). File plan: `ActionsPanel.tsx`, `ActionsPanel.styles.ts`,
  `MobileActionsBar.tsx`, `MobileActionsBar.styles.ts`.
  `secondaryActions`'s "quieter row" treatment stays desktop-only (`ActionsPanel.tsx`'s `secondaryGrid`
  only) — correct as originally proposed, since mobile already hides secondary actions behind the sheet.
- Acceptance criteria: with an army selected, screenshot shows a visible ring around the main action
  button grid on both a desktop-width and a 390 px-width capture; with no army selected, no ring on
  either.

### Proposal 5 — LobbyGameRow VP-goal badge (final)
- `LobbyGameRow.tsx`: add `<Badge variant="outline">{game.settings.victoryPointGoal} VP</Badge>` inside
  `infoGroup`, after the existing `playersInfo` chip. No `LobbyGameRow.types.ts` change (Finding 10 —
  `game: GameState` already carries `settings.victoryPointGoal`).
- `LobbyGameRow.styles.ts`: optional new token `vpGoalBadge: 'text-xs'` only if the default `Badge`
  sizing needs trimming to match the row's `text-sm` scale; otherwise no new token required.
- Acceptance criteria: lobby screenshot with open games shows a `"N VP"` outline badge on every room row,
  positioned after the player-count chip, without needing to open the info popover.
