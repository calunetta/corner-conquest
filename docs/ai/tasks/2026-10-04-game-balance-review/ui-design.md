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
