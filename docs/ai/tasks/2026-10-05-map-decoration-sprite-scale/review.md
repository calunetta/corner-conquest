# Final review: Map decoration sprite scale (boats, riders, trees), phase 1/1

VERDICT: APPROVED

## Checks run
- `npm run typecheck`: clean, no output, exit 0.
- `npm run lint`: `eslint . --max-warnings 0 --no-error-on-unmatched-pattern` → clean, no output, exit 0.
- `npx jest src/modules/map/components/TileBoats`: `Test Suites: 3 passed, 3 total` / `Tests: 43 passed, 43 total` (after tester-b's fix, including the new `mobile collector gating` block).
- `npm test` (full repo): `Test Suites: 2 failed, 179 passed, 181 total` / `Tests: 1965 passed, 1965 total`. The 2 failing suites are `.agents/skills/caveman-explore/tests/skill-file.test.mjs` and `.agents/skills/caveman-learn/tests/skill-file.test.mjs`, both "must contain at least one test" — pre-existing, unrelated to this task's files (`.agents/` is Antigravity config per CLAUDE.md, not touched by this task). All 1965 real tests pass.
- ui-verify: not run by me this pass (no screenshots or preview-b report were persisted to the task folder — only `plan.md`, `progress.md`, `triage.md`, `ui-design.md` exist, `find` confirms no other files). I could not independently look at the screenshots the instructions ask for; per the coordinator's context, preview-a and preview-b already re-verified clean. Approval here rests on source/test verification, which is complete.

## Re-review of tester-b's fix for Finding #1 (2026-10-09)
`src/modules/map/components/TileBoats/TileBoats.test.tsx`: the stale `describe('viewport handling', …)` block (CSS-only comment, matchMedia-not-called assertion against the pure view) is deleted. Replaced by:
- `jest.mock('@/modules/game-board', () => ({ useGameBoard: jest.fn() }))` and `jest.mock('@/modules/shared', () => ({ useIsMobile: jest.fn() }))`, matching the existing repo pattern (`MapGrid.hook.test.ts:15-17`).
- `describe('mobile collector gating (connected TileBoats container)', …)`: renders the actual connected `TileBoats` component (not just the pure view) with `useGameBoard` mocked to a shape matching `useTileBoats`'s real destructuring (`gameState.players`, `gameState.debugMode`, `gameState.settings.fogOfWar`, `localPlayer` — confirmed against `TileBoats.hook.ts:6-13`), and `useIsMobile` mocked `true`/`false`:
  - `true` → asserts `docked-boat` present, `collector-idle-blue` absent (`queryByTestId`, not `getByTestId`, correctly allows the negative case).
  - `false` → asserts `collector-idle-blue` present and contained inside `docked-boat`.
- This is exactly the Addendum's updated acceptance criterion (`ui-design.md:136`, DOM-absence below 768px) with real regression coverage, exercising the real `useIsMobile()` wiring instead of a stale, misleading comment.
Verified in this session: `npx jest src/modules/map/components/TileBoats` → 43/43 passed; `npm run typecheck` and `npm run lint` clean; full suite 1965/1965 (up from 1964, the 2 new tests). Finding #1 is resolved. Finding #2 (non-blocking, `isOverflow` styling split) stands as recorded, no action needed.

## Coordinator's specific questions
1. **Does current `TileBoats.tsx`/`TileBoats.styles.ts` match what `ui-design.md`'s Addendum now documents, with no drift?** Yes, confirmed by reading both.
   - `TileBoats.tsx:4,52,54`: imports `useIsMobile` from `@/modules/shared`, calls it in the connected `TileBoats()`, passes `showIdleCollectors={!isMobile}` into `TileBoatsView`. Matches the Addendum's "Implementation (current)" mechanism paragraph (`ui-design.md:131`) verbatim.
   - `TileBoats.styles.ts`: `collectorOverlay` carries no `hidden`/`md:` responsive-visibility class — confirmed by reading the file in full. No trace anywhere in `src/modules/map` of the superseded `hidden md:block` approach (`grep -rn "hidden md:block"` over `src/modules/map` returns nothing).
   - `ui-design.md:130` itself correctly labels the old approach `**SUPERSEDED mechanism (do not implement):**` — this is the one place the string still exists in the repo, and it's there on purpose as a withdrawal notice, not a drift.
2. **Did anything else drift during the incident that wasn't caught?** Yes — one real gap, not re-caught yet (see Findings #1). Everything else checked clean:
   - Full diffed file set (`git status --porcelain -- src/modules/map docs/ai/tasks/2026-10-05-map-decoration-sprite-scale`) is exactly the 24 files plan.md's File plan lists (9 TileBoats, 8 TileOccupants, 7 TileForest) — no extra file touched, none missing.
   - `TileBoats.hook.ts` / `TileBoats.hook.test.ts`: confirmed untouched (`git diff --stat` empty), matching the plan's explicit "No change to `TileBoats.hook.ts`" note.
   - Collector sizing: `TileBoats.styles.ts`'s `collectorOverlay` (`w-[14%] h-[14%] top-0 left-0`) matches plan.md's Contracts section and `ui-design.md`'s Correction section exactly — no drift between the three places this number appears.
   - `TileOccupants.hook.ts`/`.tsx`: local mismatched `positions` array (the original bug) is gone from both files, replaced by a single shared import of `BOAT_CORNER_POSITIONS`/`CORNER_TRANSFORMS` from `../TileBoats/TileBoats.types`, as the plan specifies.
   - `TileForest.map.ts`/`.types.ts`: `size` is now a percent string (`'28%'`/`'16%'`) in all three layouts, matching the sizing table.

## Plan adherence
- Corner sharing (boat/rider same corner): met. `TileBoats.map.ts` and `TileOccupants.hook.ts` both build `cornerStyle`/`slotStyle` from the same `BOAT_CORNER_POSITIONS[index % 4]` + `CORNER_TRANSFORMS[corner.id]`. Verified by both logic tests (`TileBoats.map.test.ts`'s `cornerStyle shape per entry index`, `TileOccupants.hook.test.ts`'s `corner alignment with TileBoats`) and a composed view test (`TileOccupants.test.tsx`'s `rider and boat composition` describe block, rendering `TileBoatsView` + `TileOccupantsView` together and asserting identical inline anchor/transform styles) — this is exactly the regression test the plan called for.
- Percentage sizing (boat 42%, rider 29%, collector 14%-of-hull, grove tree 28%, accent tree 16%): met, confirmed in `TileBoats.styles.ts`, `TileOccupants.styles.ts`, `TileForest.map.ts` and their matching tests.
- `next/image` `fill` swap: met in `TileBoats.tsx`, `TileOccupants.tsx`, `TileForest.tsx`.
- Collector mobile-hide (Addendum): met for the connected-component wiring (see question 1 above) and for the preview (`TileBoats.preview.tsx`'s `ViewportTileBoats` and `TileOccupants.preview.tsx`'s `ViewportBoatAndRider` both call `useIsMobile()` the same way the real container does, so `ui-verify` at a real viewport width exercises the real mechanism). **Not met at the unit-test level** — see Findings #1: no test anywhere renders the connected `TileBoats` component (or otherwise exercises `showIdleCollectors={false}`) and asserts `collector-idle-${color}` is absent from the DOM, which is the Addendum's own updated acceptance criterion (`ui-design.md:136`).
- No regression on `tile-boats`/`docked-boat`/`collector-idle-${color}`/`tile-forest`/`tile-forest-tree` test ids: met, all five are asserted present (and, for the forest ones, counted) across the three `.test.tsx` files.

## Findings
| # | File:line | Problem | Owner | Blocking? |
|---|---|---|---|---|
| 1 | `src/modules/map/components/TileBoats/TileBoats.test.tsx` (was `:187-203`, `describe('viewport handling', …)`) | **RESOLVED (2026-10-09, tester-b).** Original problem: comment claimed the mobile hide was "CSS-only," the one test asserted `matchMedia` was *not* called against the pure view, and no test exercised the connected `TileBoats` component or `showIdleCollectors={false}`. Fixed: stale block deleted; new `describe('mobile collector gating (connected TileBoats container)', …)` mocks `@/modules/game-board` and `@/modules/shared` (`useIsMobile`), renders the real connected `TileBoats`, and asserts `collector-idle-blue` absent when `useIsMobile` returns `true`, present and contained in `docked-boat` when `false` — directly covering `ui-design.md:136`'s DOM-absence criterion. Verified: `npx jest src/modules/map/components/TileBoats` → 43/43 passed; full suite 1965/1965; typecheck/lint clean. | tester-b | No — resolved. |
| 2 | `src/modules/map/components/TileOccupants/TileOccupants.styles.ts:8-25` | `isOverflow` styling is split differently than plan.md's Contracts (`slot: cva(..., { isOverflow: { true: 'scale-90 opacity-90', false: '' } })`): the implementation keeps `opacity-90` on `.slot` but moves `scale-90` to `.image`, with a comment explaining why (`slotStyle` now carries an inline `transform`, which an element's own Tailwind `scale-90` class would be overridden by, since inline `style` transform wins over a class-applied one). This is a real, correctly-identified conflict the plan's literal contract didn't anticipate, and all overflow tests still pass. | implementer-b / tester-b | No — flagging only so the deviation is recorded; the reasoning is sound and verified (inline style transform beats a class-level transform), tests cover both `isOverflow: true/false` states, and the visual effect (scaled-down, faded 5th+ occupant) is preserved, just via the image instead of the slot. No action needed. |

## Docs
- `docs/README.md`: not needed. This task is a view-only sizing/alignment correction to three existing map decoration components; no game rule, write economics, or architecture behavior changed.
