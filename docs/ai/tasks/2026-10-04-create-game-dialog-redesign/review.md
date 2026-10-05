# Final review: Match Format mode-selection cards in CreateGameDialog, phase 1/1

VERDICT: APPROVED

## Checks run
- `npm run typecheck` → clean, no output (tsc --noEmit exits 0).
- `npm run lint` → clean, no output (`eslint . --max-warnings 0` exits 0).
- `npx jest src/modules/lobby/components/CreateGameDialog` → `Test Suites: 3 passed, 3 total`, `Tests: 38 passed, 38 total`.
- Project-wide `npm test` already run by the coordinator: 1896/1896 passed (2 pre-existing unrelated failing/empty suites in `.agents/skills/*`, not part of this task).
- ui-verify: viewed all four required screenshots in `test-results/ui-verify/`:
  `testbed-lobby-create-dialog-state-Multiplayer--desktop.png`, `...--mobile.png`,
  `testbed-lobby-create-dialog-state-Solo-20vs-20bot--desktop.png`, `...--mobile.png`.
  Both states render the 2x2 card grid with correct icons (Bot/Swords/Users/Crown), the selected card
  has the amber border/glow, no clipped or wrapped text at either viewport, "Solo vs. Bot AI" state
  correctly reveals the Debug Training Mode row. No console errors reported in the screenshots capture.

## Plan adherence
- Match Format `Select` replaced by 2x2 card grid in both `CreateGameDialog.tsx:43-61` and
  `CreateGameDialog.preview.tsx:49-67` (`CreateGameDialogView`'s own copy) — met, verified by direct diff
  of commit `4217516` plus the current working tree.
- Selected/unselected card styling, icon circle, focus-visible ring, `motion-reduce` — met:
  `CreateGameDialog.styles.ts:15-24` has `formatCard` ending in
  `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`, `formatCardSelected` has
  `scale-105 motion-reduce:transition-none motion-reduce:scale-100`, `formatIconSize: 'h-4 w-4'` used via
  `styles.formatIconSize` (not an inline class string) — both of architect-b's plan-review fixes landed.
- `role="group" aria-labelledby="maxPlayers"` + `Label id="maxPlayers"` — met, both files.
- No `Select`/`SelectContent`/`SelectItem`/`SelectTrigger`/`SelectValue` remain for Match Format — met,
  confirmed by grep: no `Select` import or usage left in either `.tsx` file.
- `npm run typecheck`, `npm run lint`, `npm test` pass — met (see Checks above).
- Testbed preview screenshots, desktop + mobile, both states — met (see Checks above).

## Findings
| # | File:line | Problem | Owner | Blocking? |
|---|---|---|---|---|
| 1 | `CreateGameDialog.map.test.ts:43-58` | The `toFormatOptions` "correct icon component reference" test no longer checks the value→icon mapping (`value 1 → Bot`, etc.) — it only asserts each `icon` is a function and that the 4 return values are mutually distinct object references. Both checks pass unconditionally regardless of whether `map.ts` has the icons in the right order, because `jest.setup.js`'s `lucide-react` mock returns a fresh function on every property access (verified independently: `Bot === Bot` is `false` even within one file). The comment in the test correctly explains why reference equality can't be used, but doesn't replace the lost coverage with the one approach that would work (render the icon and assert on its mock `data-testid`, e.g. `lucide-icon-bot`, in `CreateGameDialog.test.tsx`). Screenshots confirm the current mapping is visually correct, so this is a coverage gap, not a live bug. | tester-a / tester-b | No |
| 2 | `CreateGameDialog.styles.ts:13-14` | `selectTrigger`/`selectContent` tokens are now dead code — grepped the whole `CreateGameDialog/` folder, no remaining usage in either `.tsx` file. The File plan explicitly called for removing them "only if nothing else in the file still references them (verify first)"; nothing does. | implementer-b | No |

Added a lesson to `docs/ai/lessons-learned.md` ("Testing / Jest" section) documenting the `lucide-react` mock's non-reference-stable `Proxy` behavior, since it's exactly the kind of trap that looks like working coverage and would be hit again by any future icon-mapping test.

## Docs
- `docs/README.md`: not needed — grepped for "Match Format"/"SelectItem"/"maxPlayers", no hits; pure presentation change, no game-rule or architecture change.
