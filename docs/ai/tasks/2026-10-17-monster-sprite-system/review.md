# Final review: Filename-driven monster sprite system, phase 1

VERDICT: APPROVED

## Re-check (architect-b)
tester-a added `src/modules/game-rules/map-generation.test.ts` (7 tests). Verified against plan.md's Test plan ("center-tile boss pick, boss-pool-empty fallback, Monster-degrades-to-Resource path"):
- Center tile holds exactly the boss-tagged monster, with full sprite shape (`describe('center tile')`, test 1).
- Uniform pick among every boss regardless of level, not just level 4 (test 2, `Dragon` lvl1 / `Hydra` lvl3 both bosses).
- Boss-pool-empty fallback to the distance-1 big-monster roll, both a deterministic single case (test 3) and a 100-iteration never-empty stress case (test 4).
- Monster tile with zero spawnable monsters degrades to `IslandType.Resource` with populated `resources` (test 5), plus a 20-iteration invariant that a Monster tile is never left without monsters nor a Resource tile without resources (test 6), and a control case confirming a tile stays Monster when a monster does spawn (test 7).
All assertions are exact values (monster names, sprite paths, resource type/amount), not ranges — matches the testing skill's "assert the exact observable outcome" rule. `jest.mock('./monster-catalog.generated', ...)` + `MONSTER_CATALOG.splice` mirrors the established pattern already used in `monster-catalog.test.ts`. Path `./game-settings` for `defaultGameSettings` verified to exist and export it (also re-exported via `game-setup.reducer.ts` and `index.ts`).

Checks re-run this session:
- `npx jest src/modules/game-rules/map-generation.test.ts` → `Tests: 7 passed, 7 total`.
- `npx jest src/modules/game-rules src/modules/lobby/components/LobbyBackground` → `Test Suites: 228 passed, 228 total`, `Tests: 2705 passed, 2705 total`.
- `npm run typecheck` → passes, 0 errors.
- `npx eslint src/modules/game-rules/map-generation.test.ts` → 0 errors, 0 warnings.

Finding #1 (missing test file) is resolved. Findings #2-#4 were non-blocking and stand as recorded (out-of-scope/other-task attribution notes only). Phase 1 is approved.

## Original review (superseded verdict kept below for the record)
VERDICT: CHANGES REQUESTED

## Checks run
- `npm run typecheck`: passes, 0 errors (`tsc --noEmit`, exit 0, empty output).
- `npm run lint` (targeted, this phase's files — `src/lib/types/monsters.ts`, `monsters.generated.ts`, `src/modules/game-rules/monster-catalog.ts`, `.types.ts`, `.generated.ts`, `monster-catalog-generator.ts` + test, `monster-catalog.test.ts`, `map-generation.ts`, `index.ts`, `LobbyBackground.map.ts` + test, `scripts/generate-monster-catalog.ts`): `✖ 2 problems (0 errors, 2 warnings)` — both warnings are "File ignored because of a matching ignore pattern" for the two `src/lib/types` files (that directory is in `LEGACY_PATHS`, pre-existing exemption, not caused by this phase). Zero lint errors.
- `npm run lint` (full repo, as literally commanded): fails with ~23.5k pre-existing errors, all inside `.claude/worktrees/**` (other tasks' isolated worktrees — confirmed git-ignored via `.git/info/exclude:12: **/.claude/worktrees/`, not excluded by `eslint.config.mjs`'s `IGNORED_PATHS`) plus Turbopack build-artifact chunks (`__TURBOPACK__imported__module__...`) that are not source files. None reference this phase's files in a way that indicates a new error — grepped the full log for `monster|LobbyBackground|map-generation|game-rules/index`, every hit is a `.next`-style compiled chunk with a mangled module name, not a real lint finding on source. Not this phase's responsibility to fix; full-repo lint in this shared working tree is not a meaningful signal right now.
- `npx jest src/modules/game-rules src/modules/lobby/components/LobbyBackground`: `Test Suites: 227 passed, 227 total`, `Tests: 2698 passed, 2698 total`.
- `scripts/generate-monster-catalog.ts` re-run against `public/monster/` (4 files, verified via `ls`): output byte-for-byte identical to the checked-in `monster-catalog.generated.ts` and `monsters.generated.ts` (diffed before/after, no changes) — confirms plan step 3's drift check.
- ui-verify: n/a, no view files in this phase (confirmed: `git status` shows no `.tsx`/`.styles.ts` touched by this phase's files).

## Plan adherence
- Pure parser + generator script writing both generated files: met. `monster-catalog-generator.ts` (parser/renderer, no fs) + `scripts/generate-monster-catalog.ts` (fs I/O) match the contract; script re-run matches checked-in output exactly.
- Catalog always contains the 4 seed entries even on an empty/partial scan: met. `buildMonsterCatalogEntries` merges `SEED_MONSTER_CATALOG` for any missing seed (`monster-catalog-generator.ts:94-102`); `monster-catalog-generator.test.ts:128-156` covers empty scan, all-invalid scan, and a missing single seed.
- `generateMonsters` level-then-name, never two same name, never throws/returns undefined: met. `monster-catalog.ts:81-100`; `monster-catalog.test.ts` has extensive coverage including empty-pool and degenerate-pool cases (`describe('empty and degenerate pools', …)`), explicit "never throws" assertion, and dedupe tests.
- Center tile uniform boss pick, deterministic today (single boss candidate): met. `pickBossMonster` (`monster-catalog.ts:102-107`) + `map-generation.ts:37-44`; `monster-catalog.test.ts` `pickBossMonster` describe block verifies the seed Minotaur result.
- Monster tile with zero monsters after fallback becomes Resource via the normal resource rule: **implemented but untested.** `map-generation.ts:63-72` wires it exactly per the contract (`generateTileResources(distance, settings.baseResourceAmount)` reused from the Resource branch). But no test exists for this behavior or for `generateIslandTerrain` at all — see Findings #1.
- `LobbyBackground`'s deterministic accessor, stable across repeated calls, unaffected by a future multi-boss level 4: met. `LobbyBackground.map.ts:63-65` (`toMonster(getFirstMonsterAtLevel(4) ?? LOBBY_MONSTER_FALLBACK)`); `LobbyBackground.map.test.ts` has an explicit `Math.random` spy asserting zero calls and determinism across 10 calls, plus a "fresh objects on every call" test (`toMonster` always returns a new object, satisfying "no shared mutable state" even though determinism is already proven).
- `npm run typecheck`, `npm run lint`, `npm test` pass, full repo, not leaving Phase 2/3 files broken: typecheck and the scoped lint pass; full-repo lint's failures are pre-existing and outside this phase's files (see Checks). `npm test` not run full-repo in this review (scoped per the coordinator's instruction to `src/modules/game-rules`, `LobbyBackground`, and diff test files) — recommend the implementer/coordinator also runs `npm test` project-wide before the phase is called done, since the acceptance criterion is explicit about "full repo."
- Docs-sync, same phase, both files: met. See Docs below.

## Findings
| # | File:line | Problem | Owner | Blocking? |
|---|---|---|---|---|
| 1 | `src/modules/game-rules/map-generation.ts` (whole file) | File plan and Test plan both require a new `src/modules/game-rules/map-generation.test.ts` ("Tests for center-tile boss pick, boss-pool-empty fallback, Monster-degrades-to-Resource path"). It does not exist — `find`/`grep` confirm no test file anywhere exercises `generateIslandTerrain`. The new behavior this phase adds (center tile falling back to `generateMonsters` when the boss pool is empty, and a Monster tile with zero rolled monsters degrading to `IslandType.Resource` with populated `resources`) is completely untested. This is a game-rule/spawn-logic change (triage flagged this file as highest-risk, requiring sonnet) shipping with zero coverage of its own new branches. | tester-a | Yes |
| 2 | `docs/architecture/systems-and-visuals.md` (TileVariants §, lines below the monster edit) | The diff to this file also rewrites the "Slots and resolution" / "Save route" / "Testbed editor" section (variant pools, `PlacedVariantImage`, read-only testbed) — this is a different task's (tile-variants) in-flight edit in the same shared working tree, not part of this phase's plan or File plan (which only names lines 21-22). Not this phase's fault and not blocking it, but flagging so the coordinator doesn't attribute it to this task's commit or docs-sync report. | coordinator (attribution only) | No |
| 3 | `src/modules/lobby/components/LobbyBackground/LobbyBackground.test.tsx:29` | Not listed in the File plan, but a necessary one-line fix (`MONSTER_IDLE_SRC` literal updated from `/sprites/minotaur_idle.gif` to `/monster/boss-minotaur-lvl4-idle.gif`) — without it this test would fail against the new `LobbyBackground.map.ts` sprite path. Correct and minimal; the File plan should have listed it. Not worth reverting or blocking on. | — | No |
| 4 | `src/modules/map/components/IslandTile/IslandTile.monsters.tsx` | Modified in the working tree (switches `MonsterIcons`'s background prop from a raw `src` string to a `TileVariant` + `PlacedVariantImage`), but this is the tile-variants task's change, unrelated to this phase's File plan and not touched by any file this phase's diff lists as an edit path. Confirmed out of scope: no monster-catalog or sprite-path content in the diff. | — | No (out of scope, do not attribute to this phase) |

## Docs
- `docs-sync`: ran. `docs/architecture/game-mechanics.md` (center-tile boss-pool mechanism, level-then-name roll, sibling fallback, monster-degrades-to-resource, filename convention and level caps — all verified against the actual code) and `docs/architecture/systems-and-visuals.md` §"Home Islands Login & Lobby Background" (monster sprite source now `getFirstMonsterAtLevel(4)`/`toMonster`, deterministic, with the defense-in-depth fallback) both updated accurately and match the shipped code. The same `systems-and-visuals.md` diff also carries an unrelated tile-variants rewrite — see Finding #2, not this phase's docs-sync's fault, just noting it so the phase's own docs-sync scope stays clear (lines 21-22 plus the "Islands:"/"Monster (lobby-owned...)" bullets is the actual scope here).

## Summary
Implementation is careful and well-tested everywhere except one real gap: `generateIslandTerrain`'s two new branches (boss-pool-empty fallback at the center tile, Monster-tile-degrades-to-Resource) have zero test coverage because the File plan's `map-generation.test.ts` was never created. Everything else — the generator, the reworked `monster-catalog.ts`, the `LobbyBackground` accessor, docs-sync — matches the approved plan and contracts, passes typecheck, scoped lint, and the targeted test run, and the regenerate script reproduces the checked-in generated files byte-for-byte. Route the missing test file back to tester-a; re-review once added.

DONE
