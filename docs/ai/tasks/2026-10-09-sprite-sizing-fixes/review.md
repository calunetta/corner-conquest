# Final review: Idle-collector-vs-knight layering fix + FightIcon size audit, phase 1

VERDICT: APPROVED

## Checks run
- `npm run typecheck`: clean, no errors (`tsc --noEmit`).
- `npm run lint`: clean, `eslint . --max-warnings 0` — no output, no violations.
- `npm test`: `Test Suites: 2 failed, 181 passed, 183 total` / `Tests: 2055 passed, 2055 total`. The 2 failing suites are `.agents/skills/caveman-*` ("Your test suite must contain at least one test" — empty-suite config issue), untouched by this task, pre-existing per implementer-b's summary; confirmed they are outside `src/`.
- ui-verify: live screenshots taken this session (dev server on :9002, `node .claude/skills/ui-verify/scripts/snapshot.mjs`), re-verifying all four `FightIcon` sites plus the collector fix, not just trusting the hand-off summary:
  - `testbed/tile-occupants?state=Boat + rider, same corner (136px tile)` — cropped/zoomed 4x (`/tmp/crop1.png`): collector (farmer) sprite sits fully outside the hull at the boat's bottom-right, fully visible, clearly smaller than the rider but legible. Confirms preview-b's pixel measurement.
  - `testbed/hud-player-info?state=Current player with buffs` — `statIcon` (sword, 24x24) reads flush and same size as the lucide Zap/flag icons beside it in the stat chip row.
  - `testbed/combat-army-selection-dialog?state=All ready` — header icon proportionate inside its colored badge, consistent with the dialog style.
  - `testbed/combat-combat-dialog?state=Rolling — attacker, both cards` — header icon and "vs" icon both read proportionate inside their circular badges; no oversized outlier.
  - `testbed/hud-actions-panel?state=Army selected, can attack` — Attack button's sword icon (`ActionButton.tsx`'s inline `h-4 w-4`) matches the size of its sibling action icons (anchor, shield, zap, cart, archive, home) in the same grid.
  - No console errors observed in any snapshot (snapshot script reports 0 failing across all requests).

## Plan adherence
- "idle collector sprite ... clearly visible and reasonably sized relative to the boat and the soldier sprite — not hidden behind or dwarfed by the soldier": met. `TileBoats.styles.ts` `collectorOverlay` moved from `top-0 left-0`/14% to `bottom-0 right-0`/40% of the hull box — verified by direct screenshot (not just the hand-off's numeric claim) that the farmer sprite is fully visible and outside the rider's box.
- "`FightIcon` renders at a visually consistent, non-oversized scale in all four ... call sites": met. `PlayerInfo.styles.ts` `statIcon` given explicit `h-6 w-6` (was unsized `shrink-0`, inheriting a too-large intrinsic/fill size) — now flush with sibling lucide icons, confirmed by screenshot. The other three sites (`CombatDialog`, `ArmySelectionDialog`, `ActionButton`) were left unchanged; this session's own screenshots, not just implementer-b's sibling-comparison reasoning, confirm none of the three reads oversized against its neighbors.
- Scope held to the File plan's owner (implementer-b) and files; no prop/type changes, matching the plan's Contracts section.
- Tier-S task, no docs-sync required (pure CSS, no documented game-rule/architecture behavior changed) — correct call, confirmed no `docs/architecture/*.md` section describes collector sizing or icon sizing as a numeric rule.

## Findings
| # | File:line | Problem | Owner | Blocking? |
|---|---|---|---|---|

None. No findings.

## Docs
- `docs-sync`: not needed — purely cosmetic Tailwind class changes (sprite size/position percentages, icon size), no documented game rule or architecture behavior changed.

## Note on the question raised in the handoff
Whether leaving `ArmySelectionDialog`/`ActionButton` unverified by screenshot (vs. sibling-comparison reasoning only) was acceptable: resolved by taking the screenshots directly in this review rather than deferring on it. Both read correctly sized against their siblings (see ui-verify above). For a tier-S cosmetic task, sibling-comparison reasoning alone would have been a thin basis to approve on without the architect also looking at the pixels — now done.
