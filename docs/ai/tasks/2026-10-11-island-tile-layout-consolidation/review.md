# Final review: Island tile layout consolidation, phase 1

VERDICT: APPROVED

## Checks run
- `npm run typecheck`: clean, no output (`tsc --noEmit`).
- `npm run lint` (scoped to every file this phase touched or created — the repo-wide `npm run lint` fails with ~15,500 pre-existing errors from legacy files and a stray `.claude/worktrees/inspiring-kare-ee7f7f/` duplicate checkout that are unrelated to this task): `npx eslint <15 touched files> --max-warnings 0` → no output, 0 problems.
- `npm test` equivalent, excluding the same stray worktree directory (not in jest's own `testPathIgnorePatterns`, so default `npm test` also fails on ~578 unrelated tests from that duplicate checkout): `npx jest --testPathIgnorePatterns '/node_modules/' '/e2e/' 'firestore.rules.test.ts' 'src/features/game/context/__tests__/test-utils/' '/.agents/' '/.claude/worktrees/'` → `Test Suites: 193 passed, 193 total` / `Tests: 2289 passed, 2289 total`. Scoped run for this module alone: `npx jest src/modules/map --testPathIgnorePatterns ... '/.claude/worktrees/'` → `Test Suites: 28 passed, 28 total` / `Tests: 388 passed, 388 total`.
- ui-verify: reviewed preview-a's existing screenshots in the session scratchpad (`.../scratchpad/ui/testbed-island-tile-state-*-{desktop,mobile}.png`) for all 4 new states — no visible overlap between resource nodes/grove trees and the corner boats, no console error reported. Independently re-ran a full-page Playwright capture of the same 4 states against a live `npm run dev` server (`http://localhost:9002/testbed/island-tile?state=...`, properly percent-encoded URLs) and confirmed zero console errors (`errors: []`) and correct non-overlapping layout.

## Plan adherence
- Shared slot/corner table is the single source of truth: `src/modules/map/island-tile-slots.types.ts` holds every table; `TileResources.map.ts:1-9`, `TileBoats.types.ts:1-8` (re-export), `TileForest.types.ts:1-4` (re-export) + `TileForest.map.ts:1-12`, `TileOccupants.hook.ts:5` all import from it, no component defines its own slot/corner literal anymore (confirmed by reading each file's diff). Met.
- Corrected values match the contract exactly: `DUAL_RESOURCE_SLOTS` left/right 14%→24% (`island-tile-slots.types.ts:52-55`), `TRIPLE_RESOURCE_SLOTS` slot 1 left 12%→24% (`:59-63`, slots 2-3 unchanged at 12%), `EMPTY_GROVE_SLOTS` trees 1/2 22%→24% (`:94-98`, tree 3 unchanged). All other tables (`SINGLE_RESOURCE_SLOT`, `BASE_RESOURCE_SLOTS`, `BASE_FOREST_SLOTS`, `SPECIAL_FOREST_SLOT`, all 4 `BOAT_CORNER_POSITIONS`/`CORNER_TRANSFORMS` entries) are byte-for-byte identical to the pre-move values (diffed against `git show HEAD:<old path>` via the `git diff`). Met.
- `Base island with resources and occupants` preview state: its fixture (`baseIslandWithResourcesAndOccupants`) and the `BASE_RESOURCE_SLOTS`/`BASE_FOREST_SLOTS` tables it renders from are untouched — confirmed no diff touches either. Met (regression-safe).
- 4 new preview states added to `IslandTile.preview.tsx` (17 total, up from 13), each showing the corrected slots clear of the `tl`/`tr` boat boxes — verified visually in both preview-a's screenshots and my own independent capture. Met.
- All 17 `IslandTile.preview.tsx` states render with no console error at 1280×720/390×844: preview-a's screenshot set covers all 17 states at both viewports; no errors reported. Met.
- `docs/architecture/systems-and-visuals.md` §6.13 rewritten to describe one shared slot table (new bullet plus two inline mentions of the corrected 24% insets) instead of four separately-tuned coordinate sets. Met.

## Findings
| # | File:line | Problem | Owner | Blocking? |
|---|---|---|---|---|
| 1 | `src/testbed/components/PreviewStage/PreviewStage.tsx:43` | Pre-existing, out-of-scope bug (not in this task's File plan): the state-list `href` is built as `` `/testbed/${slug}?state=${state.name}` `` with no `encodeURIComponent`. A state name containing `+` (already true of `TileOccupants.preview.tsx`'s `'Boat + rider, same corner'` states, and now also true of this task's 4 new states, e.g. `'Resource island, 2 nodes + occupants on all corners'`) breaks real-browser click navigation: Next's query parsing decodes the raw `+` back to a space, so the page reports "No state named ...". `ui-verify`'s `snapshot.mjs` doesn't catch this because it builds URLs via `new URL(href, base).href`, which percent-encodes `+` to `%2B` before navigating. Reproduced live against `npm run dev` by clicking the sidebar link instead of hitting the direct URL. | not assigned (file outside this task's File plan) | No — doesn't block this task; recommend a follow-up task to add `encodeURIComponent` in `PreviewStage.tsx`. Logged in `docs/ai/lessons-learned.md` under "Testbed previews". |

## Docs
- `docs-sync`: ran, updated `docs/architecture/systems-and-visuals.md` §6.13 as described above.
- `docs/ai/lessons-learned.md`: appended one entry under "Testbed previews" documenting the `PreviewStage.tsx` href-encoding gap found above (non-obvious, a future preview-state name with `+`/`&`/`#`/`%` would repeat it).
