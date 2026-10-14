# Final review: Resource-gain animations (HUD + island tile), phase 1

VERDICT: APPROVED

## Checks run
- `npm run typecheck`: clean, no output (exit 0). Re-ran after tester-b's follow-up edit: still clean.
- `npm run lint` (full repo command): 23781 problems, but every one traced to pre-existing, unrelated environment pollution (`.claude/worktrees/*` stray duplicate worktrees and a `.next` build artifact bundle being linted, plus two pre-existing `e2e/*.ts` `no-console` warnings) — none in a File-plan file. Re-ran `npx eslint` scoped to every file this phase touched (`src/lib/types/game.ts` excluded — it's a `LEGACY_PATHS` ignore, confirmed by eslint's own "File ignored" warning) with `--max-warnings 0`: 0 errors, 0 warnings, including `PlayerInfo.test.tsx` after the follow-up edit.
- `npm test` (full repo command): 180 failed suites / 1607 failed tests, same root cause (stray `.claude/worktrees/*` copies of the whole repo, including duplicate `e2e/*.spec.ts` Playwright specs that `jest.config.js`'s `testPathIgnorePatterns` only anchors to `<rootDir>/e2e/`, not the worktree copies — pre-existing, unrelated to this diff). Scoped run with `--testPathIgnorePatterns='(node_modules|\.claude/worktrees)'` across every phase-1 test file: `Test Suites: 14 passed, 14 total` / `Tests: 220 passed, 220 total`. Re-ran `src/modules/hud/components/PlayerInfo` alone after tester-b's follow-up: `Test Suites: 3 passed, 3 total` / `Tests: 71 passed, 71 total` (29 in `PlayerInfo.test.tsx` as reported).
- ui-verify: `test-results/ui-verify/testbed-hud-player-info-state-Gold-20gain-20active--desktop.png` and `--mobile.png` reviewed — the gold chip shows a small round overlay anchored below the chip, food/wood chips show none, grid unchanged. `test-results/ui-verify/testbed-hud-player-info-state-Gold-gain-active--reduced-motion.png` reviewed — the gold chip shows the `ring-2 ring-accent` outline, no GIF overlay beneath it, other two chips unaffected; no console errors reported.

## Plan adherence
- Criterion 1 (one chip animates, others don't): met — `PlayerInfo.map.ts:83-90` only produces a `gainPulse` for the matching type; `PlayerInfo.hook.ts:16-24` gates the whole trigger list on `isLocalPlayerCard`; confirmed in the preview screenshot and `PlayerInfo.test.tsx`'s "gain overlay inside the gold chip only" test.
- Criterion 4 (Collector tick animates two chips concurrently): met — `PlayerInfo.hook.test.ts:223-240` asserts exactly `[false, true, true]`.
- Criterion 6 (chips never change size/position): met by construction — `PlayerInfo.styles.ts:56` keeps the overlay `absolute`/`top-full` under a `relative` chip, grid (`resourcesGrid`) untouched.
- Criterion 8 (GIF removed from DOM after one loop, not just hidden): met for the HUD chip — `PlayerInfo.test.tsx`'s "removes the overlay from the DOM" test, backed by `use-transient-pulses.test.ts`'s exact-`durationMs` clearing test.
- Criterion 9 (repeat gain restarts from frame 1, no stack): met — `key={gainPulse.token}` (`PlayerInfoStats.tsx:100`) plus `PlayerInfo.test.tsx`'s "mounts a new overlay element when the token changes" test (asserts a different DOM node, not just a different `src`) and `use-transient-pulses.test.ts`'s "leaves no stacked timers" test (`jest.getTimerCount()` === 1).
- Criterion 10 (only local player's card animates): met — `PlayerInfo.hook.test.ts:242-251` ("never pulses a card that belongs to another player").
- Criterion 5 (reduced-motion ring-flash fallback, CSS-only, no GIF frame): met — `PlayerInfo.styles.ts:58,60` (`motion-reduce:ring-2 motion-reduce:ring-accent` / `motion-reduce:hidden`), now guarded by `PlayerInfo.test.tsx:311-317` ("carries the reduced-motion ring on the chip and hides the GIF overlay under reduced motion") and confirmed visually in the reduced-motion emulation screenshot. Criteria 2, 3, 7 are phase-2 (map tile) scope, not applicable here.

## Findings
Both findings from the prior pass are resolved:
1. `src/modules/hud/components/PlayerInfo/PlayerInfo.test.tsx:311-317` now asserts `goldChip` has `motion-reduce:ring-2`/`motion-reduce:ring-accent` and the overlay has `motion-reduce:hidden`. Verified by reading the file and re-running the suite (71/71 passing, scoped `npx eslint` clean).
2. `test-results/ui-verify/testbed-hud-player-info-state-Gold-gain-active--reduced-motion.png` captured via a one-off Playwright `page.emulateMedia` script and reviewed: gold chip shows the accent ring, GIF overlay absent, no console errors.

No new findings.

## Plan corrections made this review (folded in directly, not routed)
- File plan was missing a row for `src/modules/hud/components/GameBoardHeader/GameBoardHeader.map.test.ts`, which tester-a *did* correctly edit (confirmed real, necessary: `ResourceStatViewModel.gainPulse` is a required field independent of `gainPulses`'s optionality) — added as a tester-a row, and the "Verified context" row that incorrectly claimed this file was unchanged is corrected in place.
- `useResourceGainEvents`'s contract said "otherwise `[]`"; the shipped implementation (`resource-gain-events.hook.ts:14-18`, `useMemo` keyed on `log`'s reference) instead returns the exact same array reference — which can be a non-empty previous batch — on a re-render with an unchanged `log`. This is deliberate and safe: `PlayerInfo.hook.ts:18-24`'s `pulseTriggers` memo is keyed on that same reference, so an unchanged reference means no re-filter and no re-pulse, regardless of the stale array's contents; the pinned test (`resource-gain-events.hook.test.ts:73-85`, "returns the same batch reference on a re-render with an unchanged log") confirms this is intentional, not a bug. Forcing a literal fresh `[]` every quiescent render would need extra state-clearing machinery for no behavioral difference (callers already guard on `triggers.length === 0`). Amended the contract's doc comment in plan.md to describe the actual, simpler, reference-stable behavior and flagged it as the pattern a phase-2 `TileResources.hook.ts` caller must also follow (gate on the array's reference, not assume non-empty means "new").

## Docs
- `docs-sync`: not needed this phase — scheduled for phase 2 per the File plan (`systems-and-visuals.md` update is a phase-2 row), and no game rule or architecture-documented behavior changed in phase 1 beyond what phase 2's docs-sync entry already covers.

## Progress
Ticked in `progress.md` for Phase 1: implementation, tests, previews, checks (typecheck/lint/unit tests), UI verified (ui-verify), final review (architect-b). "committed: <hash>" left for the coordinator.
