# Triage: UI/UX review Phase 1 — bug fixes and quick wins

Request: fix the two confirmed bugs (map-tile SSR/client hydration mismatch, inaccessible zoom controls) and two copy/labeling gaps (ambiguous "Deck: N", unlabeled player stat chips) from the UI/UX audit at docs/ai/tasks/2026-10-04-ui-ux-review/ui-design.md, backlog items 1, 2, 4, 5.
Type: bug (items 1–2), chore (items 3–4)
Tier: S
Pipeline: tester-a implementer-a
Overrides: none
Phases: 1

## Why this tier
- Four independent, single-layer fixes, no shared files, no cross-module dependency:
  1. `src/modules/map/components/IslandTile/IslandTile.hook.ts:28` — `Math.random()` inside `useMemo(..., [])` picks the middle border sprite, differs between SSR and client render → React hydration-mismatch error on every populated map load. Existing test at `IslandTile.hook.test.ts:204-232` already exercises `borderImageSequence` and must be updated for the new deterministic logic.
  2. `src/modules/map/components/MapZoomControls/MapZoomControls.tsx:21-34` — zoom-out/zoom-in `Button`s are icon-only with no `aria-label`; only text is a Radix `Tooltip` (`aria-describedby`, not an accessible name).
  3. `src/modules/hud/components/ActionsPanel/ActionsPanel.tsx:44` — `<div className={styles.deckCount}>Deck: {deckCount}</div>` reads ambiguously next to "Cards (2/7)" one row below. `ActionsPanel.test.tsx:34` asserts on this string and needs updating alongside.
  4. `src/modules/hud/components/PlayerInfo/` — stat chips (army count, AP buff, cards-in-hand, resources) are icon+number only; confirmed (grepped) no existing `TutorialBeacon` or tooltip on this component.
- No gameplay/rule change, no Firestore writes, no `GameState` shape change, no concurrency. Visible UI changes are confined to existing primitives (aria attributes, copy, tooltips) — no new visual pattern, so no `ui-designer` stage needed at this tier.
- Item 1 is a bug with a known root cause (deterministic hash instead of `Math.random()`) → `tester-a` first to lock in a reproduction test before the fix, per the bug ordering rule at tier S.

## Scope
- In: the four items above — deterministic border-sprite selection; `aria-label`s on `MapZoomControls`; "Deck: N" copy rename; tooltips/labels on `PlayerInfo` stat chips (reusing the existing `TutorialBeacon` pattern if a one-time hint is preferred over permanent labels/tooltips — implementer's call, consistent with existing component conventions).
- Out: everything else in the Phase 1–3 plan — Login/Lobby background stacking, game-log player-color accents (needs a `game-rules` change first), mobile actions-panel reachability (needs its own `ui-designer` spec). A project-wide sweep for other icon-only buttons missing `aria-label` (flagged in the audit as unverified beyond `MapZoomControls`) is also out — single-component fix only here.

## Open questions
- None.
