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

---

# Final review: Filename-driven monster sprite system, phase 2

VERDICT: APPROVED (after re-check below; original verdict kept for the record)

## Re-check (architect-b)
Both fixes verified:
1. **Preview-order fix**: `src/modules/combat/components/MonsterCombatDialog/MonsterCombatDialog.preview.tsx` now appends the two new "no attack sprite" states after "Spectator — waiting" (index 4) instead of inserting them before it — re-read the file in full, states are `[attackScreenNoCards, attackScreenAllCards, resultsPlayerWins, resultsMonsterWins, spectatorWaiting, attackScreenMonsterNoAttackSprite, resultsMonsterWinsNoAttackSprite]`. `MonsterCombatDialog.preview.test.tsx:30`'s `states[4]` resolves to the spectator state again. `npx jest src/modules/combat/components/MonsterCombatDialog --testPathIgnorePatterns='/node_modules/' '/\.claude/worktrees/'` passes (part of the full scoped run below).
2. **`[canAttack]` deps-array deviation**: `plan.md`'s Decisions section (line ~393a) now records it as an intentional implementer-a deviation: `react-hooks/exhaustive-deps` (via `next/core-web-vitals` → `plugin:react-hooks/recommended`, confirmed present at `node_modules/eslint-config-next/index.js:~19` `'plugin:react-hooks/recommended'`) flags a `[]` deps array that reads `monster.sprite.attack` inside the effect, which fails `npm run lint`'s `--max-warnings 0`. Verified empirically this session: temporarily reverted `AnimatedMonster.hook.ts`'s deps to `[]` and ran `npx eslint --max-warnings 0` on it — produced `43:6 warning React Hook useEffect has a missing dependency: 'canAttack' ... react-hooks/exhaustive-deps`, confirming `[]` is not lint-clean; reverted the file back immediately (`git diff --stat` on it afterward shows only the original phase diff, no stray changes). My original Finding #2 was wrong — it relied on the plan's Verified-context claim that no `exhaustive-deps` rule was configured, which the plan itself now corrects. `[canAttack]` is required, not a deviation to flag.
3. **ui-verify**: `test-results/ui-verify-phase2/` contains desktop + mobile screenshots of all three new "no attack sprite" states — `Animated Monster → "No attack sprite"`, `Monster Combat Dialog → "Attack screen — no attack sprite"`, `Monster Combat Dialog → "Results — monster wins, no attack sprite"`. Opened two of them this session: the Animated Monster state renders the idle Bear sprite (small, wandering-ready, no broken image); the Monster Combat Dialog attack screen renders the Bear's idle picture as the monster's combat portrait, not broken/missing. Matches the plan's preview-state requirement.

Checks re-run this session:
- `npm run typecheck` → exit 0, empty output, 0 errors.
- `npx eslint --max-warnings 0` on the same 13 Phase 2 files as the original review → 0 errors, 0 warnings.
- `npx jest src/modules/map/components/AnimatedMonster src/modules/lobby/components/LobbyBackground src/modules/combat/components/MonsterCombatDialog src/modules/game-rules/monster-catalog.test.ts src/testbed/registry.test.ts --testPathIgnorePatterns='/node_modules/' '/\.claude/worktrees/'` → `Test Suites: 13 passed, 13 total`, `Tests: 251 passed, 251 total`.

Both Findings #1 and #2 from the original review are resolved (the second turned out to be a correction to the plan, not a code defect). Finding #3 (ui-verify) is resolved — screenshots exist and were checked. Phase 2 is approved.

## Original review (superseded verdict kept below for the record)
VERDICT: CHANGES REQUESTED

## Checks run
- `npm run typecheck`: passes, 0 errors (`tsc --noEmit`, exit 0, empty output). Confirms the known-unrelated `IconEditor` typecheck issue mentioned in the brief is not currently reproducing against this working tree state.
- `npx eslint --max-warnings 0` on every file this phase's plan lists as edited/added (excluding `src/lib/types/monsters.ts`, which is in `LEGACY_PATHS` and correctly ignored by ESLint — confirmed by the "File ignored because of a matching ignore pattern" warning when included, same pre-existing exemption Phase 1's review already noted): `monster-catalog.ts`, `monster-catalog.test.ts`, `AnimatedMonster.hook.ts`, `AnimatedMonster.hook.test.ts`, `AnimatedMonster.preview.tsx`, `LobbyBackground.monster.hook.ts`, `LobbyBackground.monster.hook.test.ts`, `LobbyBackground.map.ts`, `LobbyBackground.map.test.ts`, `MonsterCombatDialog.map.ts`, `MonsterCombatDialog.map.test.ts`, `MonsterCombatDialog.fixtures.ts`, `MonsterCombatDialog.preview.tsx` → 0 errors, 0 warnings.
- `npx jest src/modules/map/components/AnimatedMonster src/modules/lobby/components/LobbyBackground src/modules/combat/components/MonsterCombatDialog src/modules/game-rules/monster-catalog.test.ts src/testbed/registry.test.ts --testPathIgnorePatterns='/node_modules/' '/\.claude/worktrees/'` (per instructions, `.claude/worktrees` ignored — a first run without the ignore pattern showed 69 failures, every one inside `.claude/worktrees/**` copies of these same files with a duplicate-React/Radix error, unrelated to this phase's source tree): `Test Suites: 1 failed, 12 passed, 13 total`, `Tests: 1 failed, 250 passed, 251 total`. The one failure is real — see Findings #1.
- ui-verify: not run this session (no browser check performed); the plan requires `ui-verify` screenshots of "No attack sprite" (`AnimatedMonster`) and "Attack screen — no attack sprite" (`MonsterCombatDialog`) before the phase can be called checked (plan.md:362-363, 578). Flagging as a gap for the coordinator — final-review mode here only covers code/test checks and the preview.test.tsx failure found while running jest; it did not include a live browser pass.

## Plan adherence
- `Monster.sprite.attack` → `attack?: string`, `toMonster()` passes it through unresolved (no `?? idle`): met exactly. `src/lib/types/monsters.ts:10`, `src/modules/game-rules/monster-catalog.ts:29-40`; test replaced correctly (`monster-catalog.test.ts`: `sprite.attack` asserted `undefined`, not idle-fallback).
- `AnimatedMonster.hook.ts` never rolls into/renders the attack pose without an attack sprite, always wanders: met. `canAttack` short-circuits `Math.random() < 0.25`; `spriteSrc` falls back to idle defense-in-depth. New tests confirm zero attacks even under an always-0 `Math.random()` mock and confirm the exact draw count (1/step, not 2) per the plan's risk note.
- `useLobbyMonster` has the identical guarantee: met. `rollWander(canAttack)` mirrors the contract exactly; new tests cover the same no-attack/draw-count cases as `AnimatedMonster`.
- `MonsterCombatDialog`'s attack and results screens show idle when no attack sprite: met. `toMonsterAttackViewModel`/`toMonsterResultsViewModel` both do `monster.sprite.attack ?? monster.sprite.idle`, matching the contract verbatim; `.map.test.ts` asserts both screens plus a "still shows attack sprite when one exists" control case.
- `MonsterSelectionDialog.map.ts`, `MonsterAttackScreen.tsx`, `CombatDialog.map.ts` unchanged: met — confirmed via `git diff --stat`, none of the three appear in the diff.
- `npm run typecheck`, `npm run lint`, `npm test` pass full-repo: typecheck and scoped lint pass (see Checks). `npm test` does **not** pass: `MonsterCombatDialog.preview.test.tsx` fails because this phase's two new preview states were inserted into the middle of `monsterCombatDialogPreview.states` (between "Results — monster wins" and "Spectator — waiting"), shifting the spectator state from index 4 to index 6; the pre-existing, unmodified `MonsterCombatDialog.preview.test.tsx:30` still reads `states[4]` and now gets the wrong state. **Not met** — see Findings #1.
- New preview states for "No attack sprite" (`AnimatedMonster`) and "Attack screen — no attack sprite" (`MonsterCombatDialog`) exist: met, plus an extra unplanned-but-harmless "Results — monster wins, no attack sprite" state, consistent with the `resultsMonsterWinsNoAttackSprite` fixture the File plan already required. Not independently confirmed in a browser this session — see Checks.
- `canAttack` computed once per mount, not added to the effect's dependency array (plan.md:393, 462-490 contracts: "unchanged deps array"): **not met as specified.** Both `AnimatedMonster.hook.ts:43` and `LobbyBackground.monster.hook.ts:487` add `[canAttack]` to the effect's deps array, the exact alternative the plan's Decisions section considered and rejected ("would restart the timer on a change that never happens in practice, and changes the documented... behavior for no reason"). See Findings #2 — non-blocking because `monster` is built once per component instance at both call sites today (re-verified: `AnimatedMonster({ monster })`'s prop, `LobbyBackground.tsx`'s module-level `const MONSTER = createMonsterIslandMonster();`), so `canAttack` cannot actually change mid-lifecycle and no behavior differs from the plan's intent in practice.
- `docs/architecture/game-mechanics.md:30,36` and `systems-and-visuals.md:22` updated per the plan: met. Diffed lines match exactly the plan's required before/after text; line numbers unchanged (30, 36, 22).
- Known-unrelated items confirmed by path: `src/testbed/components/IconEditor/*` is mid-edit from another task (`IconEditor.service.test.ts`, `index.ts` modified; `IconEditor.tsx`, `.styles.ts`, `.preview.tsx`, `.test.tsx`, `IconEditorField.tsx`, `IconEditorRow.tsx` untracked) — none of it is in this phase's File plan, confirmed out of scope. `docs/architecture/systems-and-visuals.md`'s working-tree diff against this phase is exactly the one line (22) the plan specifies — no tile-variant rewrite is present in the current diff (it may have already landed in a prior commit); either way nothing here attributes tile-variant content to this phase. Stash incident: `git stash list` shows one unrelated stash (`heartbeat-contention-fix`, a different task), nothing pending for this task.

## Findings
| # | File:line | Problem | Owner | Blocking? |
|---|---|---|---|---|
| 1 | `src/modules/combat/components/MonsterCombatDialog/MonsterCombatDialog.preview.tsx` (new states inserted at the position shown in the diff, before "Spectator — waiting") / `MonsterCombatDialog.preview.test.tsx:30` | Inserting the two new preview states before "Spectator — waiting" shifts that state from index 4 to index 6. `MonsterCombatDialog.preview.test.tsx:30`'s pre-existing `monsterCombatDialogPreview.states[4]` now resolves to "Results — monster wins, no attack sprite" instead of the spectator state, so the test's own assertion (`getByText('Waiting for combat resolution...')`) fails. Confirmed: `git show HEAD:...MonsterCombatDialog.preview.tsx` lists "Spectator — waiting" at position 4 before this phase's edit; `npx jest` reproduces the failure. Fix: append the two new states at the end of `monsterCombatDialogPreview.states` (after "Spectator — waiting") instead of in the middle — avoids touching the unowned `.preview.test.tsx` and keeps every existing index stable. | preview-a | Yes |
| 2 | `AnimatedMonster.hook.ts:43`, `LobbyBackground.monster.hook.ts:487` | Effect deps changed from `[]` to `[canAttack]`, contradicting the plan's explicit Decision and Contract ("not added to its dependency array" / "unchanged deps array"), which the plan rejected this exact alternative for ("would restart the timer on a change that never happens in practice"). Harmless today because `monster` is built once per component instance at both real call sites, but it is a silent deviation from an approved, reasoned design choice. Fix: revert both deps arrays to `[]` to match the approved contract, or if there's a reason to keep `[canAttack]`, it needs to go back through the plan for a documented decision change, not ship silently. | implementer-a | No (no observable behavior difference in current usage, but should be corrected or justified before sign-off) |
| 3 | — | ui-verify (browser screenshots of the two new "no attack sprite" preview states) was not performed in this review session; the plan requires it before the phase is complete. | ui-verify / coordinator | Yes (plan.md:363, 578 require it; not yet satisfied) |

## Docs
- `docs-sync`: ran correctly. `game-mechanics.md:30,36` and `systems-and-visuals.md:22` both updated to describe the skip behavior instead of the old idle-substitution/unconditional-roll text, matching the plan's required before/after wording exactly.

## Summary
Logic, types, and test coverage for the optional-attack-sprite behavior are solid and match the approved contracts closely, including the trickier draw-count assertions the plan's Risks section called out. Two things block sign-off: (1) a real regression — the new `MonsterCombatDialog` preview states were inserted mid-array and broke an existing, unmodified test (`MonsterCombatDialog.preview.test.tsx:30`) via a hardcoded index; fix is to append instead of insert. (2) `ui-verify` hasn't been run yet for the two new preview states, which the plan requires before this phase is done. Non-blocking: both wander hooks' effect deps arrays were changed to `[canAttack]` against the plan's explicit, reasoned decision to leave them `[]` — harmless in current usage but should be reverted or re-justified. Route Finding #1 to preview-a, Finding #2 to implementer-a, re-run `npm test` and `ui-verify` after both land, then re-review.

DONE

## Phase 3 review

### Checks run
- `npx jest src/testbed/components/MonsterSpriteUploader src/app/api/monster-catalog src/modules/game-rules` -> `Test Suites: 216 passed, 216 total`, `Tests: 2600 passed, 2600 total`.
- `npm run typecheck` -> `tsc --noEmit` exit clean, no errors.
- Full-repo `npm run lint` / `npm test` not run, per instructions (`.claude/worktrees` copies). Scoped lint exit 0 and view tests/preview APPROVED taken from the progress.md log, not re-run.

### Required checks
- Route writes only inside `public/monster` and the two generated files: met. `src/app/api/monster-catalog/route.ts:62-81` writes only to `MONSTER_SPRITE_PUBLIC_DIRECTORY_FS` (`public/monster`), `MONSTER_CATALOG_GENERATED_PATH` and `MONSTER_NAMES_GENERATED_PATH` (`monster-catalog-generator.ts:10-13`). Filenames come from `buildMonsterSpriteFilename` (`monster-catalog-generator.ts:76-83`), built from a `[a-z0-9-]` slug, so no path traversal is possible from the name field.
- 404 in production: met. `route.ts:43-45` returns 404 before reading the body; `route.test.ts:80-85` asserts 404 and no writes.
- No delete/edit control for seed or uploaded entries: met. `MonsterSpriteUploaderCatalogList.tsx` renders read-only rows (thumbnail, name, badges); grep for delete/remove/edit across the component finds only the doc comment and a styles import.
- Level picker: met. `MonsterSpriteUploader.map.ts:26-32` `getLevelOptions` filters 1..`getMaxLevelForBossFlag(isBoss)` (3 non-boss, 4 boss); the server enforces the same cap (`validation.ts:41-44`). Toggling boss off clamps the level (`MonsterSpriteUploader.map.ts:41-43`).
- Docs: `docs/architecture/systems-and-visuals.md:182` documents the uploader and route.

### Non-blocking observations
1. `MonsterSpriteUploaderCatalogList.tsx` name span truncates "Minotaur" on mobile widths (cosmetic, accepted).
2. `MonsterSpriteUploaderForm.tsx:56` file-input reset key is `catalogRows.length`; correct because the catalog only grows on success. It would break only if rows could be removed, which no control allows.
3. `MonsterSpriteUploader.service.ts` `addMonster` (fetch) has no unit test; the plan did not require one. Hook tests cover it through a mocked service.
4. `progress.md` Phase 3 boxes (tests, previews, etc.) are still unticked in the file at review time; the coordinator updates them.

### Findings
| # | File:line | Problem | Owner | Blocking? |
|---|---|---|---|---|
| none | | | | |

VERDICT: APPROVED
