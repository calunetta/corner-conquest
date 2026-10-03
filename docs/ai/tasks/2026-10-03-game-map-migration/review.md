# Final review: Migrate game map/board visuals to src/modules/map, phase 1

VERDICT: APPROVED

## Re-review (second pass)
Both findings from the first pass are fixed, verified directly against the code and by re-running checks:
- **Finding 1 (drag-start-on-interactive-element regression)**: `MapGrid.drag-gesture.hook.ts:35-49,75-89` — `handleMouseDown`/`handleTouchStart` now unconditionally set `isMouseDownRef`/`dragStartRef`/`initialPanRef`, gating only `isDraggingRef`/`options.onDragStateChange(true)` on `!isInteractive`, matching legacy `useMapPanZoom.ts:88-101,148-159` exactly. The new test `MapGrid.pan.hook.test.ts:108-139` ("isDragging becomes true when mousedown on button then dragged past 4px threshold (legacy semantics)") drives the exact scenario I reproduced in the first pass (mousedown with an interactive `target`, then mousemove past the 4px threshold) and asserts `isDragging` becomes `true` — ran it in isolation (`npx jest ... -t "legacy semantics"`): 1 passed.
- **Finding 2 (dead `isDragging` field)**: `DragGestureResult` (lines 13-23) no longer declares an `isDragging` field; `useDragGesture`'s return is just `{ dragHandlers }`. Confirmed no remaining reference to `dragGesture.isDragging` anywhere in `src/modules/map` — `usePan` (`MapGrid.pan.hook.ts:91-98`) still returns its own `useState`-backed `isDragging`, unaffected.

Re-ran full checks after the fix:
- `npm run typecheck` → clean.
- `npm run lint` → clean (0 errors/warnings).
- `npm test` → `Test Suites: 97 passed, 97 total`, `Tests: 1021 passed, 1021 total` (1021 = prior 1020 + the 1 new regression test).

No new issues found. Phase 1 is approved.

## First pass (superseded by the re-review above)
VERDICT: CHANGES REQUESTED

## Checks run
- `npm run typecheck`: clean, no output besides the script banner.
- `npm run lint`: clean, `eslint . --max-warnings 0 --no-error-on-unmatched-pattern` produced no output (0 errors/warnings).
- `npm test`: `Test Suites: 97 passed, 97 total` / `Tests: 1020 passed, 1020 total`.
- ui-verify: not re-run by me; progress.md's log records preview-a's and the coordinator's ui-verify pass for the `MapZoomControls` preview's three states as already done. No screenshots were left in the task folder to re-inspect (only `plan.md`/`progress.md`/`triage.md` exist there); taking the logged verification at face value since nothing in the diff touches rendered markup in a way my regression finding below would show up in a static screenshot (it's a drag-gesture behavior, not a visual difference).

## Plan adherence
- `src/modules/map/` now exists with `MapZoomControls` and the `MapGrid` pan/zoom hooks — met.
- `MapZoomControls`: types/styles/view/test/preview all present, `MapZoomControls.tsx` is a byte-for-byte structural match of the legacy component (same JSX, same `Tooltip`/`Button` composition, classes moved verbatim into `.styles.ts`) — met.
- `useMapPanZoom`'s public return shape (`zoom, pan, defaultZoom, isDragging, zoomIn, zoomOut, resetZoom, handlers{...}`) is preserved exactly, per plan Contracts — met (verified field-by-field against `MapGrid.pan-zoom.hook.ts:18-36`).
- `src/testbed/legacy/MapZoomControls.preview.tsx` deleted (File plan row 81) — met, confirmed absent on disk.
- `src/features/game/components/MapZoomControls.tsx` and `src/features/game/hooks/useMapPanZoom.ts` still present, correctly deferred to Phase 3 per the plan's reordering note (Phase 1 step 7) since legacy `MapGrid.tsx` still imports both — met, confirmed both files exist unchanged.
- `src/testbed/registry.ts` updated to import the new preview from `@/modules/map/components/MapZoomControls/MapZoomControls.preview` — met.
- 150-line cap: `MapGrid.pan.hook.ts` (99 lines) and the new `MapGrid.drag-gesture.hook.ts` (122 lines) both under the cap; `MapGrid.zoom-state.hook.ts` (39), `MapGrid.pan-zoom.hook.ts` (125), `MapZoomControls.tsx` (76) all under the cap — met.
- The undocumented `MapGrid.drag-gesture.hook.ts` split (not in plan.md's File plan) is a sound responsibility split in principle — `useDragGesture` owns raw pointer/touch gesture recognition (threshold detection, drag start/end), `usePan` owns pan-state/clamping/scheduling and composes it — but see Finding 1: the split introduced a behavior regression not present in either the legacy hook or the original (pre-split) `MapGrid.pan.hook.ts`.
- Docs: `docs/README.md` is modified in the working tree, but Phase 1's own File plan doesn't call for a docs edit (that's Phase 3, after `MapGrid.tsx`/`GameBoard.tsx` are wired) — not evaluated as part of this phase; the diff on that file reads as being from the concurrent `game-header-migration`/`game-panels-migration` tasks also in progress (`@/modules/hud` additions), not this one.

## Findings
| # | File:line | Problem | Owner | Blocking? |
|---|---|---|---|---|
| 1 | `src/modules/map/components/MapGrid/MapGrid.drag-gesture.hook.ts:36-47,73-84` | `handleMouseDown`/`handleTouchStart` now **return early** when the pointer-down target is interactive (`isInteractiveElement(...)`), skipping `isMouseDownRef`/`dragStartRef`/`initialPanRef` entirely. Legacy `useMapPanZoom.ts:88-101,148-159` only gates the *immediate* `setIsDragging(true)` call on `!isInteractive` — it still sets `isMouseDownRef.current = true` and records the drag-start position unconditionally (for `button === 0 \|\| 1`), so a mouse-down that starts on a button/link/input can still turn into a full pan once the 4px threshold is exceeded in `handleMouseMove` (which has no interactive check at all, legacy `:103-121`). With the new early return, that same drag sequence never pans — `isMouseDownRef` is never set, so `handleMouseMove`'s `if (!isMouseDownRef.current) return;` always bails. **Reproduced**: wrote a throwaway test driving `usePan`'s real handlers — mousedown on a `<button>` target, then mousemove past the threshold — legacy semantics require `isDragging` to become `true`; the current implementation returns `false` (test failed as expected, then deleted; not committed). This is a real behavior regression against the plan's "preserving every value/behavior exactly" instruction and the acceptance criterion of pixel/behavior-identical output, and it is user-reachable in Phase 3 once `MapGrid`'s outer container (which wraps `MapZoomControls` and, later, every clickable `IslandTile` button) uses these handlers — a drag that starts on a button no longer pans the board. The existing test `MapGrid.pan.hook.test.ts:88-106` ("does not set isDragging immediately on interactive elements") only checks the state right after mousedown and doesn't catch this, since it never drives a subsequent mousemove. | implementer-a | Yes |
| 2 | `src/modules/map/components/MapGrid/MapGrid.drag-gesture.hook.ts:13-14,110-111` | `DragGestureResult.isDragging` is derived from a `ref` (`isDraggingRef.current`), not `useState` — reading it from the hook's return value is a snapshot from the render that created the closure and will not reflect post-render mutations the way `usePan`'s own `useState`-backed `isDragging` does. It happens to be harmless today because the sole caller, `usePan`, ignores this field and uses its own `useState` instead (`MapGrid.pan.hook.ts:32,97` sets/returns its own `isDragging`, never reading `dragGesture.isDragging`) — but the field is dead, and anyone wiring `useDragGesture` to a consumer directly would get silently-stale drag state. | implementer-a | No (dead/unused field, but should be dropped from the return type while fixing finding 1 in the same pass, to avoid shipping a footgun) |

## Docs
- `docs/README.md`: not evaluated for this phase — Phase 1's File plan doesn't call for a docs update (that lands in Phase 3 alongside the `GameBoard.tsx`/`MapGrid.tsx` wiring); the working-tree diff on this file belongs to the concurrent header/panels migration tasks.
