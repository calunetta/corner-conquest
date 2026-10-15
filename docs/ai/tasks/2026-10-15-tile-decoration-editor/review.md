# Final review: Tile decoration editor, phase 2

VERDICT: APPROVED

## Checks run
- `npm run typecheck`: clean (`tsc --noEmit`, no output, exit 0), repo-wide.
- `npx eslint src/testbed/components/TileDecorationEditor src/app/api/tile-decoration-editor`: clean, no output.
- `npm run lint` (full repo, `eslint . --max-warnings 0`): fails, but every one of the 23549 errors is under `.claude/worktrees/*` (other parallel tasks' worktrees — `grep -c worktrees` on the output accounts for all hits; a filter removing worktrees paths produces zero error/warning lines). Nothing in `src/testbed/components/TileDecorationEditor`, `src/app/api/tile-decoration-editor`, or any other file this phase touched.
- `npx jest src/testbed/components/TileDecorationEditor src/app/api/tile-decoration-editor`: `Test Suites: 4 passed, 4 total. Tests: 54 passed, 54 total.`
- `npm test` (full repo): 197 suites fail, but a rerun restricted to every test file outside `.claude/worktrees/*` still shows 10 pre-existing failures (`e2e/*.spec.ts` picked up by Jest instead of Playwright, `firestore.rules.test.ts` needing the emulator, `gameBoardTestKit.tsx`, two `.agents/skills/caveman-*` skill-file tests) — none touch this task's files, none are new; `git status` shows the touched production files (`game-board.staleness.hook.ts`, `game-board.engine.service.ts`, `e2e/bot-vs-bot-ui.spec.ts`) belong to the unrelated, already-in-progress `2026-10-13-bot-ui-position-stall` task.
- ui-verify: not applicable — Phase 2 has no view (File plan, Phase 2 row "no UI yet, no ui-verify this phase"), confirmed no `.tsx` file exists yet under `TileDecorationEditor/`.

## Plan adherence
- Contracts: `TileDecorationEditorViewModel`, `EditorScenarioOption`, `EditorStatus`, `useTileDecorationEditor()` signature — all match `plan.md`'s Contracts verbatim (`TileDecorationEditor.types.ts:1-53`, `.hook.ts:1-153`). Two additional types (`SaveDecorationLayoutsRequestBody`, `ListDecorationImagesResponseBody`) support the service/route contracts also specified in Contracts; not scope creep.
- `.map.ts` pure helpers (`clampPercent`, `toPointerPercent`, `createInstance`, `nudgeInstance`, `renameLayout`, `duplicateLayout`, `removeInstance`, `removeLayout`, `toScenarioOptions`) all present, pure, match the Contracts/Test-plan names and behavior (`TileDecorationEditor.map.ts:1-102`).
- `.service.ts` is the only file calling `fetch`; `GET /api/tile-decoration-editor/images` and `POST .../layouts` match the Contracts' routes exactly, including the `NODE_ENV === 'production'` 404 gate and the 10-key completeness validation (`route.ts` x2).
- `@/modules/map` exports `decorationLayoutsConfig`, `DECORATION_SCENARIO_KEYS`, `DECORATION_LAYOUTS_CONFIG_PATH` (`src/modules/map/index.ts:4,11`), confirmed — no deep import from `src/testbed` or `src/app/api` into `src/modules/map/*` internals.
- Test plan coverage verified by reading `.map.test.ts`, `.hook.test.ts`, both `route.test.ts` files: every bullet in plan.md's Test plan for Phase 2 (clamp edges, nudge clamp, createInstance defaults, duplicateLayout new ids, scenario/variant reset behavior, isDirty flows, save success/error transitions, image-list success/fallback, route 200/400/404 cases) has a corresponding `it(...)`.
- Acceptance criteria in `plan.md`'s Goal section are Phase-1/3-scoped (production migration, `/testbed/...` live flow); none apply to Phase 2's logic-only scope.

## Findings
| # | File:line | Problem | Owner | Blocking? |
|---|---|---|---|---|
| 1 | `TileDecorationEditor.hook.ts` split into `.hook.ts` + `TileDecorationEditor.layouts.hook.ts` (`useLayoutActions`) + `TileDecorationEditor.ids.ts` (`createId`) | Deviation from File plan's one-hook-file row, to stay under the 150-line lint cap | implementer-a | Not blocking — accepted. `useTileDecorationEditor()`'s public contract (`TileDecorationEditorViewModel`) is unchanged (verified: `.hook.ts:31-153` returns exactly the shape in Contracts); precedent for splitting one component's hook by topic confirmed real: `src/modules/map/components/MapGrid/MapGrid.pan.hook.ts` and `src/modules/lobby/components/LobbyBackground/LobbyBackground.monster.hook.ts` both exist alongside their component's main hook file. `createId` in its own file is correctly reasoned (needs `Date.now()`/`Math.random()`, forbidden in `.map.ts` per `component-architecture` skill) and is shared by both hook files, avoiding duplication. |
| 2 | `index.ts` does not export a `TileDecorationEditor` view component | Flagged by implementer-a as a heads-up | implementer-a | Not blocking — correct. The view component doesn't exist until Phase 3 (File plan's Phase 3 rows, owner implementer-b); confirmed no `.tsx` file exists yet in this directory. `index.ts:1-7` exports exactly what Phase 2 owns: the hook, the two service functions, and the view-model types — nothing missing from this phase's own scope. |

## Docs
- `docs-sync`: not needed this phase — no game rule, architecture, or documented behavior changed; Phase 2 is dev-tool logic behind a `NODE_ENV==='production'` 404 gate with no production behavior change. Confirmed against `plan.md`'s File plan: the only `docs-sync` row belongs to Phase 1, already committed (`f20bd92`).
