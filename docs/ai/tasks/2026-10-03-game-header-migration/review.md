# Final review: Migrate GameBoardHeader and GameStatusBadge to src/modules/hud, phase 1/1

VERDICT: APPROVED

## Checks run
- `npm run typecheck`: clean, no output (passes).
- `npm run lint`: `eslint . --max-warnings 0 --no-error-on-unmatched-pattern`, clean, no output (passes, zero warnings).
- `npm test`: `Test Suites: 143 passed, 143 total` / `Tests: 1408 passed, 1408 total`.
- `npx jest src/modules/hud/components/GameBoardHeader src/modules/hud/components/GameStatusBadge`: `Test Suites: 6 passed, 6 total` / `Tests: 64 passed, 64 total`.
- ui-verify: reviewed existing screenshots `test-results/ui-verify/testbed-hud-game-board-header--desktop.png`, `--mobile.png`, `testbed-hud-game-status-badge--desktop.png`, `--mobile.png`. Desktop screenshots show all 7 GameBoardHeader states (Waiting – host can start with amber Start Game button, Waiting – host cannot start, Waiting – not host, etc.) and the status badge's Waiting/Your-Turn/countdown states rendering with the same classes/colors as the legacy markup. No console errors observed in the captured output.

## Plan adherence
- `src/modules/hud/components/GameBoardHeader/` and `GameStatusBadge/` built with the full types/map/hook/styles/view split and `NameView`/connected split — met. Verified `GameBoardHeader.tsx`, `GameBoardHeader.map.ts`, `GameBoardHeader.hook.ts`, `GameBoardHeader.types.ts`, `GameBoardHeader.styles.ts` byte-match the contracts in `plan.md:84-159` and the legacy logic in `git show HEAD:src/features/game/components/GameBoardHeader.tsx` (same conditions, same classes, same defensive fallbacks nowhere altered).
- `GameStatusBadge` equivalents verified the same way against `git show HEAD:src/features/game/components/GameStatusBadge.tsx` — the `turnTimer?.formattedTime || '02:00'` / `!!turnTimer?.isExpiring` fallbacks are preserved exactly in `GameStatusBadge.map.ts:11-12`, matching the plan's Decisions (plan.md:38).
- `GameBoard.tsx` imports `GameBoardHeader, GameStatusBadge` from `@/modules/hud` (`src/features/game/components/GameBoard.tsx:10`); `PlayerInfoBar.tsx` import and JSX usage untouched — met.
- `PlayerInfoBar.tsx` not migrated, not edited — confirmed, no diff to that file.
- Legacy `GameBoardHeader.tsx` / `GameStatusBadge.tsx` deleted (`git status` shows `D`); no other file under `src/features/game/components/` changed besides the two import lines in `GameBoard.tsx` — met.
- Previews: 7 GameBoardHeader states and 4 GameStatusBadge states registered in `src/testbed/registry.ts:15-16` (import) and the registry array, screenshot-verified — met.
- `npm run typecheck`, `npm run lint`, `npm test` pass as quoted above. `docs/README.md` updated: `src/modules/` bullet (`docs/README.md:33`) now lists `GameBoardHeader`, `GameStatusBadge` under `hud/components/`; the per-file bullets (`:43-45`) updated, including a clear note on why `PlayerInfoBar.tsx` stays legacy pending rows #5/#8 — met.
- `grep -rn "'./GameBoardHeader'\|'./GameStatusBadge'" src` → no hits. `grep -rn "@/modules/hud" src` → `GameBoard.tsx`, `PlayerInfoBar.tsx` (pre-existing `PlayerInfo` import, out of scope), plus the module's own internal files and the testbed registry's deep-path preview imports (consistent with the existing pattern for every other module's previews, e.g. `@/modules/combat/components/CombatDialog/CombatDialog.preview`) — no unexpected import sites.

## Findings
None.

## Docs
- `docs/README.md`: updated (`:33`, `:43-45`) per the File plan; verified by diff.

## Notes
- `src/testbed/registry.ts` and several `src/modules/map/**` test/fixture files in the working tree are unrelated changes from the concurrent `game-map-migration` task (same working tree, different task) — not reviewed here, out of this task's scope.
