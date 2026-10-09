# Plan: Idle-collector-vs-knight layering fix + FightIcon size audit

Status: APPROVED
Inputs: triage.md

## Goal and acceptance criteria
- [ ] When an army occupies an island without being positioned on a resource, the idle collector (farmer) sprite docked at its boat is clearly visible and reasonably sized relative to the boat and the soldier sprite — not hidden behind or dwarfed by the soldier.
- [ ] `FightIcon` renders at a visually consistent, non-oversized scale in all four of its current call sites (`CombatDialog` header + "vs" icon, `ArmySelectionDialog`, `PlayerInfoStats`, `ActionButton`).

## Verified context
| Symbol or file | Location | Why it matters |
|---|---|---|
| idle collector overlay | `src/modules/map/components/TileBoats/TileBoats.styles.ts` — `collectorOverlay: 'absolute z-[26] w-[14%] h-[14%] top-0 left-0 ...'` | Sized at 14% of the boat hull box, which is itself 42% of the tile (`boatEntry: 'w-[42%] h-[42%]'`) — net ~5.9% of the tile. This is the "way smaller than it should be" from the audit. |
| soldier/army sprite slot | `src/modules/map/components/TileOccupants/TileOccupants.styles.ts` — `slot: cva('absolute w-[29%] h-[29%]', ...)`, container `z-30` | The code comment at line 5-7 states this is **deliberately** "Centered on the same corner as the boat ... so the rider's box always sits inside the boat's box." At 29% of the tile and `z-30` (above the boat's `z-[25]` container and the collector's `z-[26]`), the soldier sprite visually sits on top of and is larger than the collector — this is the root cause of "knight instead of farmer." Persistent-visibility rule: `docs/architecture/systems-and-visuals.md` §6.13 (Island Tile Visual Layout & Animated Sprite Architecture). |
| `FightIcon` | `src/modules/shared/fight-icon.tsx:4-16` | Renders `/sprites/icon_fight.png` at a size entirely controlled by the caller's `className` (no default size baked in beyond the `Image`'s `width={32} height={32}` intrinsic hint, overridden by `h-full w-full` + the wrapping `span`'s className). |
| call sites | `CombatDialog.tsx:35,86` (`styles.headerIconSvg`, `styles.vsIconSvg`), `ArmySelectionDialog.tsx:50` (`styles.icon`), `PlayerInfoStats.tsx:36` (`styles.statIcon`), `ActionButton.tsx:13` (inline `h-4 w-4`) | Four independent size tokens, each defined in that component's own `.styles.ts` — no shared sizing, so drift across contexts is expected; need a side-by-side browser check to find which is oversized relative to its sibling icons/buttons. |

## Root cause
- **Collector/knight overlap**: both sprites are deliberately anchored to the same tile corner (the boat's corner), but their relative sizes and z-index were chosen independently — the soldier (gameplay-critical, must always be visible per `docs/README.md` §6.12) was sized generously (29%, top layer) while the collector (decorative/secondary) was sized small (14% of a 42% box) and placed one z-layer below. The result: the soldier sprite visually covers or dwarfs the collector whenever both occupy the same tile corner.
- **FightIcon**: no shared sizing contract between call sites — each consumer picked its own className, so any one of them being "too big" is a per-site CSS value, not a shared bug. Needs a visual pass to identify the outlier(s), most likely `CombatDialog`'s `vsIconSvg` or `headerIconSvg` given the audit's phrasing ("sword, in some places rendered too big").

## Decisions
- Fix the collector/knight overlap by moving the collector overlay to a corner of the boat box that the soldier slot doesn't also claim (both are currently anchored `top-0 left-0`-equivalent on the same corner per `TileBoats.types.ts`'s `CORNER_TRANSFORMS` and `TileOccupants`' `slotStyle`) and increasing its size enough to read clearly at typical tile sizes, while keeping it visibly smaller than the soldier (it's secondary flavor, the soldier is the gameplay-critical sprite per existing doc rules) — exact target % to be tuned against a live preview, not guessed here.
  - Rejected: raising the collector's z-index above the soldier's — would hide the gameplay-critical soldier sprite behind a decorative one, violating the existing "persistently visible" rule for army sprites (`docs/architecture/systems-and-visuals.md` §6.13).
- Audit all four `FightIcon` sites against their immediate siblings in the same component (e.g. compare `vsIconSvg` against the dice/roll icon next to it in `CombatDialog`) rather than picking one global size — these are different UI contexts (a dialog header vs. a small stat row vs. a toolbar button) and a single shared size would likely be wrong for at least one of them.

## File plan
| File | New / Edit | Responsibility | Owner |
|---|---|---|---|
| `src/modules/map/components/TileBoats/TileBoats.styles.ts` | edit | Reposition/resize `collectorOverlay`/`collectorImage` so the collector clears the soldier's slot and reads at a legible size. | implementer-b |
| `src/modules/map/components/TileOccupants/TileOccupants.styles.ts` | edit (only if repositioning the collector alone isn't enough once previewed) | Adjust `slot` size/position if the soldier's box needs to make room rather than the collector moving. | implementer-b |
| `src/modules/combat/components/CombatDialog/CombatDialog.styles.ts` | edit (as needed per browser check) | Resize `headerIconSvg`/`vsIconSvg` if found oversized. | implementer-b |
| `src/modules/combat/components/ArmySelectionDialog/ArmySelectionDialog.styles.ts` | edit (as needed) | Resize `icon` if found oversized. | implementer-b |
| `src/modules/hud/components/PlayerInfo/PlayerInfo.styles.ts` | edit (as needed) | Resize `statIcon` if found oversized. | implementer-b |
| `src/modules/hud/components/ActionsPanel/ActionButton.tsx` | edit (as needed) | Resize the inline `h-4 w-4` if found oversized/undersized relative to its sibling action icons. | implementer-b |

## Contracts
No prop or type changes anywhere in this task — purely Tailwind class value edits inside existing `.styles.ts` files and one inline className.

## Phases
### Phase 1: fix + verify in browser
1. Open the live game (or `TileBoats`/`TileOccupants` previews) with an army idle on a non-resource island; screenshot current state. (preview-a)
2. Reposition/resize the collector overlay so it's visible and not eclipsed by the soldier sprite; re-screenshot and compare. (implementer-b, preview-b)
3. Open `CombatDialog`, `ArmySelectionDialog`, the HUD `PlayerInfo` panel, and `ActionsPanel`'s attack button in the browser; screenshot each; identify which `FightIcon` instance(s) read as oversized against their neighbors. (preview-a)
4. Resize the identified outlier(s); re-screenshot and confirm visual consistency across all four. (implementer-b, preview-b)
5. `npm run typecheck && npm run lint && npm test`. (implementer-b)

Model escalation: none expected.

## Test plan
- No new unit test coverage needed (pure styling) beyond keeping existing `TileBoats.test.tsx`/`TileOccupants.test.tsx` green. Verification is visual, via `ui-verify` screenshots at desktop and mobile width, mobile with `showIdleCollectors` already `false` (per `TileBoats.tsx`'s mobile branch) so this fix only needs desktop-width verification for the collector half of the task.

## Preview states
- `TileBoats`: ensure the existing "army idle on island, not positioned" preview state is present (add if missing) to drive the before/after screenshot.

## Risks
- Low — cosmetic only. Main risk is picking a collector size that itself now looks disproportionate; mitigate by comparing against the boat and soldier at the same zoom level the player actually sees (85% default desktop zoom per `docs/architecture/systems-and-visuals.md` §6.10, UI Components and Mobile Responsiveness), not at 100% crop.

## Review (architect-b)
VERDICT: CHANGES REQUESTED

1. File plan row for the HUD stat icon (line 34) cites `src/modules/hud/components/PlayerInfo/PlayerInfoStats.styles.ts` — that file does not exist. `PlayerInfoStats.tsx:7` imports `styles` from `./PlayerInfo.styles`, and `statIcon` is defined at `src/modules/hud/components/PlayerInfo/PlayerInfo.styles.ts:50` (`statIcon: 'shrink-0'`). Fix: change the File plan row's path to `PlayerInfo.styles.ts` and note it's shared with `PlayerInfo.tsx`'s own icon classes (don't widen the edit beyond `statIcon`).
2. Two doc citations point at the wrong section. `docs/architecture/systems-and-visuals.md`'s headers (`grep -n '^## 6\.' docs/architecture/systems-and-visuals.md`) show the "Persistent Soldier / Knight Visibility" rule ("Army soldiers / knights remain **persistently visible**...") is under **§6.13** (line 95-96, "Island Tile Visual Layout & Animated Sprite Architecture"), not §6.12 (§6.12 is "End-to-End (E2E) Testing & Match Cleanup Lifecycle", line 71). Fix both occurrences: Verified context row for `slot` (plan line 14) and the Root cause bullet (plan line 19, which paraphrases the rule without citing a section — fine) — and the explicit `docs/README.md §6.12` cite in the "Rejected" bullet (plan line 24) → `docs/architecture/systems-and-visuals.md §6.13`.
3. Risks section (plan line 57) cites "85% default desktop zoom per `docs/README.md` §6.9" — the 85% default is under **§6.10** ("UI Components and Mobile Responsiveness", `docs/architecture/systems-and-visuals.md:43,45-46`); §6.9 is "Bot Logic" (line 30). Also `docs/README.md` has no numbered sections of its own (it's an index per CLAUDE.md); cite `docs/architecture/systems-and-visuals.md §6.10` directly.

Everything else checks out: every symbol and path in Verified context, Root cause, File plan and Contracts matches the code read in this review (`TileBoats.styles.ts:9-10`, `TileOccupants.styles.ts:8,16`, `fight-icon.tsx:4-16`, all four `FightIcon` call sites, `TileBoats.types.ts`'s `BOAT_CORNER_POSITIONS`/`CORNER_TRANSFORMS` shared-corner claim). Scope is tight (pure CSS, no logic/type changes, single owner, tier S), the rejected alternative (raising collector z-index) is correctly rejected against the persistent-visibility rule once the citation above is fixed, and deferring exact collector size/position to a live preview check rather than guessing a percentage here is the right call for a cosmetic tuning task. No simpler design available; no missing File plan rows found via grep for the old `collectorOverlay`/`slot`/`FightIcon` call-site identifiers outside the files already listed.

Fix items 1-3 (wording-only, no re-verification needed beyond what's above) and set Status to APPROVED.
