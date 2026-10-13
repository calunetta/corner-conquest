# Final review: Special island idle art + card-reveal animation, phase 2

VERDICT: APPROVED

## Re-review (2026-10-14)
implementer-a fixed Finding #1: `CardRevealEffect.hook.ts:21` now has `// eslint-disable-next-line react-hooks/exhaustive-deps` above the dependency array, with a comment explaining why `onHidden` is intentionally excluded (read at timer-fire time; including it would restart the countdown on every re-render) — matches the precedent at `src/modules/game-board/game-board.engine.hook.ts:78`.
- `npx eslint src/modules/map/components/CardRevealEffect/CardRevealEffect.hook.ts` → no output, 0 errors/0 warnings.
- `npm run typecheck` → clean, no output.
- `npx jest "$(pwd)/src/modules/map/components/CardRevealEffect" "$(pwd)/src/modules/map/components/IslandTile"` → `Test Suites: 5 passed, 5 total; Tests: 84 passed, 84 total`.
All other findings from the original pass already resolved/non-blocking (see below). No new issues found.

## Checks run
- `npm run typecheck`: clean, no output (pass).
- `npm run lint`: repo-wide run is polluted by unrelated parallel-task worktrees under `.claude/worktrees/*` (23782 problems, almost none in this task's files) — pre-existing environment issue, not caused by this phase, not blocking. Scoped `npx eslint` on every file this phase touched/created (`CardRevealEffect.*`, `IslandTile.*`, `src/testbed/registry.ts`) → **1 warning**: `CardRevealEffect.hook.ts:19:6 react-hooks/exhaustive-deps — React Hook useEffect has a missing dependency: 'props'`. `package.json`'s `lint` script is `eslint . --max-warnings 0`, so this single warning fails the gate for new code (CLAUDE.md: "Lint (new code only, zero warnings allowed)"). See Findings.
- `npm test`: repo-wide run is also polluted by the same stray worktrees (180 failed suites, all under `.claude/worktrees/`, including Playwright `.spec.ts` files jest shouldn't even be loading — `jest.config.js`'s `testPathIgnorePatterns` only excludes `<rootDir>/e2e/`, not nested worktree copies). Not this task's bug to fix. Scoped to this task's files with absolute paths (to avoid jest's pattern-matching picking up worktree duplicates of the same relative path): `npx jest "$(pwd)/src/modules/map/components/CardRevealEffect" "$(pwd)/src/modules/map/components/IslandTile"` → **5 passed, 5 total; 84 passed, 84 total**.
- ui-verify: started `npm run dev` on :9002, screenshotted and visually inspected (not just "0 failing" from the snapshot script, actual pixels):
  - `/testbed/card-reveal-effect` → "Fresh animation" state renders the temple + gold starburst reveal GIF, centered and contained in the canvas box. (First pass via the ui-verify script's default `networkidle` wait showed the canvas empty — traced this to the animation's own 1400ms timer already having fired by the time `networkidle` settles, not a bug: a second check with a `load`-only wait confirms the GIF renders correctly when the elapsed time is < `REVEAL_ANIMATION_DURATION`.)
  - `/testbed/island-tile?state=Special%20island` → idle temple PNG renders, no `Star` icon.
  - `/testbed/island-tile?state=Special%20island%2C%20mid-reveal` → the `CardRevealEffect` GIF renders over the tile.
  - `/testbed/island-tile?state=Scout%20target%20(fogged)` → fog `HelpCircle` placeholder renders, confirming fog precedence still holds.
  - No console errors on any of the above.

## Plan adherence
- `IslandType.Special` shows `special_island_idle.png` instead of `Star`, always except mid-reveal: met (`IslandTile.tsx:70-89`, confirmed visually).
- Reveal entry plays `special_island_reveal.gif` once (~1.4s) on the exact tile, for every viewer, only on an actual card draw: met for the rendering half (`IslandTile.hook.ts:42-48`, `CardRevealEffect.hook.ts`); the push points in the reducers were phase 1 and already reviewed/committed (`8c91371`).
- No animation on scout-no-card / roll-no-card / hand-full / empty-deck: phase 1 scope, already reviewed.
- Fog takes precedence over idle/reveal: met, confirmed visually and by `IslandTile.test.tsx`'s "shows the fog icon on a fogged special island even with an active reveal animation" case.
- `prefers-reduced-motion: reduce` skips the GIF, idle PNG shows the whole window: met (`IslandTile.tsx:73`, `IslandTile.hook.ts:50-52`, test "renders only the idle sprite when prefersReducedMotion is true").
- Reveal entries auto-clear: phase 1 scope (engine hook + turn-boundary safety net), already reviewed.
- `/testbed/island-tile` has idle / mid-reveal / reveal-finished states at desktop+mobile; `/testbed/card-reveal-effect` exists mirroring `/testbed/death-effect`: met — both registered in `src/testbed/registry.ts`, states present, confirmed via snapshot script at both viewports and via visual inspection.
- Addendum (local-hide race, `onHidden`/`locallyHiddenRevealIds`): met exactly as specified — `CardRevealEffect.types.ts` has `onHidden?: () => void`, `CardRevealEffect.hook.ts:13-16` fires it in the same timeout callback as `setIsVisible(false)`, `IslandTile.hook.ts:37-48` tracks `locallyHiddenRevealIds`/`onCardRevealHidden` and ANDs it into the `cardRevealAnimationOnTile` predicate exactly as the addendum's pseudocode specifies. `IslandTile.hook.test.ts`'s "suppresses cardRevealAnimationOnTile once onCardRevealHidden(id) is invoked" and "does not suppress a different id on the same tile" are the addendum's required regression tests and both pass.

All File plan paths for this phase exist exactly as planned: `CardRevealEffect.types.ts/.hook.ts/.tsx/.styles.ts/index.ts/.hook.test.ts/.test.tsx/.preview.tsx` (all new), `IslandTile.types.ts/.hook.ts/.tsx/.styles.ts/.test.tsx/.hook.test.ts/.preview.tsx/.preview.shared.tsx` (all edited), `src/testbed/registry.ts`, `docs/architecture/game-mechanics.md`. No invented paths or symbols found; re-verified every one by reading the real file. No file outside the File plan was touched for this task (the large unrelated diff in the working tree — lobby, session, tailwind, e2e, other `docs/ai/tasks/*` — belongs to other in-flight tasks sharing this working tree, not this one).

## Findings
| # | File:line | Problem | Owner | Blocking? |
|---|---|---|---|---|
| 1 | `src/modules/map/components/CardRevealEffect/CardRevealEffect.hook.ts:19` | `useEffect`'s dependency array `[props.id, props.createdAt]` doesn't include `props.onHidden`, which the effect reads at line 15. ESLint's `react-hooks/exhaustive-deps` flags this as a warning. `npm run lint` is configured `--max-warnings 0`, so this single warning fails the project's lint gate for new code (CLAUDE.md: "zero warnings allowed"). The plan's addendum anticipated reading `onHidden` from props without adding it to the deps array, but didn't call out silencing the resulting lint warning. Fix: add `// eslint-disable-next-line react-hooks/exhaustive-deps` above the dependency array, mirroring the existing precedent at `src/modules/game-board/game-board.engine.hook.ts:78` for the same "intentionally not a dependency" pattern. | implementer-a | Yes |

## Docs
- `docs-sync`: ran, updated `docs/architecture/game-mechanics.md`'s "Special Islands" bullet (under §5.2) to describe the idle temple art, the one-shot reveal GIF (asset path and duration), the no-reveal branches, and fog precedence — matches the plan's acceptance criteria. (The rest of that file's diff is unrelated prior work from other in-flight tasks sharing this working tree, already present before this phase and out of this review's scope.)
