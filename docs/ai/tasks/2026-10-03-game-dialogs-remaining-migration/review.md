# Final review: Migrate the remaining 13 game dialogs into src/modules, phase 1/5

VERDICT: APPROVED

## Checks run (second pass, after implementer-b deleted the 4 legacy files and tester-a deleted the 4 characterization tests)
- `npm run typecheck`: clean, no errors anywhere in the repo.
- `npm run lint`: 2 remaining errors, both in the sibling `game-map-migration` task's files (`src/modules/map/components/MapGrid/MapGrid.pan.hook.ts:168` max-lines; `src/modules/map/components/MapZoomControls/MapZoomControls.test.tsx:1` unused-var) — none in `src/modules/cards/**` or `GameDialogManager.tsx`. The two `hud` unused-var errors seen in my first pass are gone (fixed by the sibling `game-panels-migration` task between checks, not this phase's doing).
- `npm test` (scoped to this phase: `src/modules/cards`, `src/features/game/dialogs/__tests__`, `GameDialogManager`): `Test Suites: 15 passed, 15 total` / `Tests: 91 passed, 91 total` (down from 19/117 in the first pass, matching the removal of the 4 characterization-test suites and the trimmed `ResourceDialogs.test.tsx`).
- `git status --porcelain -uall -- src/features/game/dialogs/`: confirms `D` (deleted) for `AbilitiesDialog.tsx`, `CardsDialog.tsx`, `ProductiveCardDialog.tsx`, `SpecialIslandRollDialog.tsx`; `ls src/features/game/dialogs/__tests__/` no longer lists any of the 4 characterization test files. `grep -rln` for the 4 legacy import paths across `src/` returns nothing.
- ui-verify: trusted the coordinator's report (4 previews, desktop+mobile, all PASS) — not re-run in this session; `src/testbed/registry.ts` diff confirms all 4 previews (`cardsDialogPreview`, `productiveCardDialogPreview`, `specialIslandRollDialogPreview`, `abilitiesDialogPreview`) are imported and registered.

## Plan adherence
- All 4 components (`CardsDialog`, `ProductiveCardDialog`, `SpecialIslandRollDialog`, `AbilitiesDialog`) exist under `src/modules/cards/components/` with the exact file set the File plan calls for (`.types.ts`, `.map.ts`, `.fixtures.ts`, `index.ts`, `.styles.ts`, `.tsx`, tests, preview + preview test); `AbilitiesDialog` and `ProductiveCardDialog` additionally have `.hook.ts`/`.hook.test.ts` per the Decisions table — met.
- Spot-checked `AbilitiesDialog` end to end against `git show`-equivalent (read both old and new `.tsx`): view-model split is behavior-preserving, including the `catch (e: any)` → `catch (e: unknown)` + `e instanceof Error ? e.message : 'Unknown error'` change mandated by Decisions (`AbilitiesDialog.hook.ts:21-24`); every Tailwind class in `AbilitiesDialog.styles.ts` matches the legacy file verbatim — met.
- `GameDialogManager.tsx` diff: only the import lines for these 4 dialogs changed, now from `@/modules/cards`; no other line changed — met (`git diff` reviewed in full).
- `ResourceDialogs.test.tsx` edit: only the `ProductiveCardDialog` `it(...)` block was removed; the other two tests (`WealthyDialog`, `StealResourceDialog`) are untouched — met, matches Decisions' phase-1/phase-2 split.
- All files under the 150-line cap (checked all of `src/modules/cards/components/*/*`, largest is 129 lines) — met.
- **Legacy file deletion: now met.** All 4 legacy `.tsx` files and all 4 characterization test files are deleted (confirmed via `git status` showing `D` and via directory listing). No remaining references anywhere in `src/`.

## Findings
| # | File:line | Problem | Owner | Blocking? |
|---|---|---|---|---|
| — | — | First-pass findings (legacy files and characterization tests not deleted) resolved; no new findings this pass. | — | No |

## Docs
- `docs/README.md`: not expected this phase (Phase 5 owns the doc update per the File plan); diff shows `docs/README.md` modified in the working tree but that's outside this phase's scope to judge here — not reviewed, deferred to Phase 5's final review.

## progress.md
- Phase 1's boxes (plan approved, implementation, tests, previews, checks, UI verified) are confirmed by this review's checks. "final review (architect-b)" can now be ticked by the coordinator; "committed" is the coordinator's to fill in once Phase 1 is committed.

---

# Final review: Migrate the remaining 13 game dialogs into src/modules, phase 2/5

VERDICT: APPROVED (second pass, after implementer-b deleted the 3 legacy .tsx files and tester-a deleted all 4 legacy test files)

## Checks run (second pass)
- `ls src/features/game/dialogs/`: no longer lists `SabotageDialog.tsx`, `WealthyDialog.tsx`, `StealResourceDialog.tsx`; `ls src/features/game/dialogs/__tests__/` is empty. `git status --porcelain -uall -- src/features/game/dialogs/` shows `D` for all 4 files (3 `.tsx` + `ResourceDialogs.test.tsx`).
- `grep -rn "dialogs/SabotageDialog\|dialogs/WealthyDialog\|dialogs/StealResourceDialog" src/`: no matches — nothing in the tree still references the deleted legacy paths.
- `npm run typecheck`: errors confined to `src/modules/map/**` (`IslandTile.map.test.ts`, `TileBoats.hook.test.ts`, `TileBoats.map.test.ts`), sibling `game-map-migration` task; none in `src/modules/cards`, `src/modules/shared`, or `src/features/game/**`.
- `npm run lint`: remaining error is in `src/modules/game-rules/player-join.reducer.test.ts`, sibling `game-rules-core-migration`-adjacent file, not in this phase's scope.
- `npx jest src/modules/cards src/modules/shared src/features/game/dialogs/__tests__ src/features/game/components/GameDialogManager`: `Test Suites: 25 passed, 25 total` / `Tests: 142 passed, 142 total` (down from 29/154 in the first pass, matching removal of the 4 legacy test suites).
- Confirmed the 2 ported `ResourceDialogs.test.tsx` cases are covered, with more rigor, in the new module tests: `WealthyDialog.test.tsx` ("renders all 3 resources... with their testids", "calls onSelectResource with the clicked resource") and `StealResourceDialog.test.tsx` ("starts on the player-selection step...", "calls onSteal with the selected player id and resource when confirmed") — same assertions (testids, resource names, callback args) as the deleted legacy cases, not weakened.

## Findings (second pass)
All three blocking findings from the first pass are resolved. No new findings.

## Earlier findings (first pass, resolved)
VERDICT at first pass: CHANGES REQUESTED

## Checks run
- `npm run typecheck`: errors present, all confined to `src/modules/map/**` (sibling `game-map-migration` task: `IslandTile.map.test.ts`, `TileBoats.hook.test.ts`, `TileBoats.map.test.ts`, `TileOccupants.hook.test.ts`, `TileResources.hook.test.ts`), none in `src/modules/cards/**`, `src/modules/shared/**`, or `GameDialogManager.tsx` — matches the coordinator's report for this phase's scope.
- `npm run lint`: 10 errors, all in `src/modules/game-rules/player-join.reducer.ts` and `src/modules/map/components/**` (sibling tasks), none in this phase's files.
- `npx jest src/modules/cards src/modules/shared src/features/game/dialogs/__tests__ src/features/game/components/GameDialogManager`: `Test Suites: 29 passed, 29 total` / `Tests: 154 passed, 154 total` — this phase's scope is green, including the still-present legacy characterization tests.
- `npm test` (full repo, this session): `Test Suites: 1 failed, 121 passed, 122 total` / `Tests: 1201 passed, 1201 total` — one failing suite, `src/modules/map/components/IslandTile/IslandTile.map.test.ts` (`PlayerColor` used as a value where the fixture expects a type shape; a `TS2352`-class issue, same family as the typecheck errors above). This differs from the coordinator's reported "122/122 suites, 1224/1224 tests" — the sibling `game-map-migration` task's working tree has moved since that check and now has a real failing suite. **Out of this phase's scope** (file plan touches only `cards`, `shared`, `GameDialogManager.tsx`, `testbed`), but flagging it since it contradicts the checks quoted to me; it blocks `game-map-migration`'s own final review, not this one.

## Plan adherence
- `src/modules/shared/player-sprite.ts` (+ `.test.ts`, `index.ts`): matches the Contract exactly — `toPlayerIdleSprite(color)` mirrors `PLAYER_DATA[color]?.sprite.idle || '/sprites/blue_idle.gif'` (`src/modules/shared/player-sprite.ts:11-13`). Met.
- `SabotageDialog`, `WealthyDialog`, `StealResourceDialog`: each has its full File-plan file set; spot-checked `SabotageDialog.tsx`/`.map.ts` against the legacy file (`src/features/game/dialogs/SabotageDialog.tsx`) — markup, classes (moved to `.styles.ts`), and sprite fallback are pixel-for-pixel equivalent, now using `toPlayerIdleSprite` from `@/modules/shared` per Decisions. Met.
- `StealResourceDialog` split into shell + `PlayerSelectionStep.tsx` + `ResourceSelectionStep.tsx`, all under the 150-line cap (largest is 148 lines, `StealResourceDialog.preview.tsx`). Met.
- `GameDialogManager.tsx` diff: only the import block changed, now pulling `SabotageDialog`, `WealthyDialog`, `StealResourceDialog` from `@/modules/cards` alongside the Phase-1 imports; no other line changed. Met.
- `src/testbed/legacy/SabotageDialog.preview.tsx` / `.preview.test.tsx`: deleted, replaced by the module preview registered in `src/testbed/registry.ts`. Met.
- **Legacy deletion: NOT met — same gap as Phase 1's first pass, explicitly called out to watch for.**
  - `src/features/game/dialogs/{SabotageDialog,WealthyDialog,StealResourceDialog}.tsx` all still exist (`ls src/features/game/dialogs/` lists all three).
  - `src/features/game/dialogs/__tests__/{SabotageDialog,WealthyDialog,StealResourceDialog}.characterization.test.tsx` still exist; plan.md's File plan marks each "new (deleted end of phase)" (plan.md:130,142,152).
  - `src/features/game/dialogs/__tests__/ResourceDialogs.test.tsx` still exists and still imports the legacy `WealthyDialog`/`StealResourceDialog` directly (`../WealthyDialog`, `../StealResourceDialog`); plan.md's File plan calls for it to be `deleted` this phase, "All 3 of its subjects now migrated and ported" (plan.md:165).
  - Net effect: `GameDialogManager.tsx` now renders the new module components, but the legacy files are dead code sitting unused in the tree, and a test file still directly exercises the legacy implementation instead of the module one — exactly the pattern Phase 1 was corrected for.

## Findings
| # | File:line | Problem | Owner | Blocking? |
|---|---|---|---|---|
| 1 | `src/features/game/dialogs/SabotageDialog.tsx`, `WealthyDialog.tsx`, `StealResourceDialog.tsx` | Legacy files not deleted after their module replacements were verified working (per plan.md File plan, "deleted — End of phase"). | implementer-b | Yes |
| 2 | `src/features/game/dialogs/__tests__/SabotageDialog.characterization.test.tsx`, `WealthyDialog.characterization.test.tsx`, `StealResourceDialog.characterization.test.tsx` | Characterization tests not deleted once their assertions were ported (plan.md marks each "deleted end of phase"). | tester-a | Yes |
| 3 | `src/features/game/dialogs/__tests__/ResourceDialogs.test.tsx` | Not deleted; still imports and tests the legacy `WealthyDialog`/`StealResourceDialog` directly instead of the module components. plan.md File plan: "deleted — All 3 of its subjects now migrated and ported." | tester-a | Yes |
| 4 | (repo-wide, sibling task) `src/modules/map/components/IslandTile/IslandTile.map.test.ts` | `npm test` now reports this suite failing (`PlayerColor` value/type mismatch), contradicting the coordinator's quoted "122/122 suites, 1224/1224 tests." Not in this phase's file plan — belongs to `game-map-migration`. | game-map-migration task | No (out of scope here; report to that task's coordinator) |

## Docs
- `docs/README.md`: not expected this phase (Phase 5 owns it per the File plan) — not reviewed here.

## progress.md
- Not ticking any Phase 2 boxes. "final review (architect-b)" stays unticked until the legacy files, characterization tests, and `ResourceDialogs.test.tsx` are deleted and re-verified (typecheck/lint/test scoped to this phase, plus a `grep` confirming no remaining references to the three legacy dialog paths).

## Required fix before re-review
1. implementer-b: delete `src/features/game/dialogs/{SabotageDialog,WealthyDialog,StealResourceDialog}.tsx`.
2. tester-a: delete the 3 new characterization test files and `ResourceDialogs.test.tsx` (confirm its 2 remaining cases — `WealthyDialog`, `StealResourceDialog` — are already ported into `src/modules/cards/components/{WealthyDialog,StealResourceDialog}/*.test.tsx`, per plan.md's Decisions; both already have `.test.tsx` files in the diff, so this should just be a deletion, not new porting work).
3. Re-run `npm run typecheck`, `npm run lint`, and `npx jest src/modules/cards src/modules/shared src/features/game/dialogs/__tests__ src/features/game/components/GameDialogManager` scoped to this phase, plus `grep -rn "dialogs/SabotageDialog\|dialogs/WealthyDialog\|dialogs/StealResourceDialog" src/` to confirm zero remaining references.

---

# Final review: Migrate the remaining 13 game dialogs into src/modules, phase 3/5

VERDICT: CHANGES REQUESTED

## Checks run
- `npm run typecheck`: errors confined to `src/modules/map/**` (`IslandTile.map.test.ts`, `TileBoats.hook.test.ts`, `TileBoats.map.test.ts`), sibling `game-map-migration` task — confirmed via `npm run typecheck 2>&1 | grep -E "error TS" | grep -v "src/modules/map"` returning no output. Zero errors in this phase's scope.
- `npm run lint`: `eslint . --max-warnings 0 --no-error-on-unmatched-pattern` → clean, zero output, zero errors/warnings across the whole repo.
- `npx jest src/modules/combat src/features/game/dialogs/__tests__ src/features/game/components/GameDialogManager`: `Test Suites: 20 passed, 20 total` / `Tests: 295 passed, 295 total`.
- `npm test` (full repo): `Test Suites: 138 passed, 138 total` / `Tests: 1381 passed, 1381 total`.
- `ui-verify`: trusted the coordinator's report (3 components × 3 preview states, desktop+mobile, status colors/icons/mobile layout all verified) — not re-run in this session; `src/testbed/registry.ts` diff confirms `armySelectionDialogPreview`, `attackSelectionDialogPreview`, `monsterSelectionDialogPreview` are imported and registered (`src/testbed/registry.ts:4-6,26-28`).

## Legacy deletion: NOT met — same gap flagged going into this review, confirmed still present
- `ls src/features/game/dialogs/` still lists `ArmySelectionDialog.tsx`, `AttackSelectionDialog.tsx`, `MonsterSelectionDialog.tsx` (alongside the untouched `PositionDialog.tsx`/`ConfirmExitDialog.tsx`/`HostLeaveDialog.tsx`, correctly still legacy — those are Phase 4's).
- `src/features/game/dialogs/__tests__/{ArmySelectionDialog,AttackSelectionDialog,MonsterSelectionDialog}.characterization.test.tsx` still exist (`git status --porcelain -uall` shows all 3 as untracked `??`, i.e. never even committed, let alone deleted).
- plan.md's File plan (`plan.md:174,184,194,205`) marks each characterization test "new (deleted end of phase)" and the 3 legacy `.tsx` files + their characterization tests "deleted — End of phase." Neither happened.
- This is the exact pattern architect-b's Phase 1 and Phase 2 final reviews both caught and required fixed (`review.md` phase 1 and phase 2 sections above) — the coordinator's brief for this review named it as "the recurring lesson from Phase 1/2" and asked me to confirm it before approving. It has recurred a third time. Added a `docs/ai/lessons-learned.md` entry under "Refactors" for this pattern (source: this task, 2026-10-04), since "deletion deferred to end-of-phase" in a hand-back has now proven, twice, not to mean the deletion happens before the phase reaches final review.

## Plan adherence (everything else)
- All 3 components (`ArmySelectionDialog`, `AttackSelectionDialog`, `MonsterSelectionDialog`) exist under `src/modules/combat/components/` with the File plan's exact file set (`.types.ts`, `.map.ts`, `.fixtures.ts`, `index.ts`, `.styles.ts`, `.tsx`, `.map.test.ts`, `.test.tsx`, `.preview.tsx` + `.preview.test.tsx`); none needed a `.hook.ts` per Decisions (all three are pure, prop-driven) — met.
- Read each new `.tsx`/`.map.ts`/`.styles.ts` in full against the corresponding legacy file:
  - `ArmySelectionDialog`: `toArmySelectionViewModel` (`ArmySelectionDialog.map.ts:12-29`) mirrors the legacy `getArmyStatus`/`isSelectable`/sprite-fallback logic exactly, now via `toPlayerIdleSprite` from `@/modules/shared` per the Phase 2 extraction; every Tailwind class in `ArmySelectionDialog.styles.ts` matches the legacy file's inline classes verbatim — met.
  - `AttackSelectionDialog`: `toAttackSelectionViewModel` (`AttackSelectionDialog.map.ts:16-34`) correctly keeps the uniform `!isMyTurn` disable (no per-army `hasExtraMove` exception, unlike `ArmySelectionDialog`), with an explicit comment explaining why `isMyTurn` isn't folded into the view model — matches Decisions' documented difference between the two dialogs — met.
  - `MonsterSelectionDialog`: `toMonsterSelectionViewModel` (`MonsterSelectionDialog.map.ts:5-18`) matches `getMonsterName`/power-label exactly; the view keeps the legacy's `key={index}` (not `monster.name`) with a comment explaining why (monsters on one tile can share a name) — a deliberate, justified preservation of existing behavior, not an oversight — met.
- `src/modules/shared/player-sprite.ts`'s `toPlayerIdleSprite` is reused by both new components crossing the `cards`/`combat` boundary as planned, no reimplementation — met.
- `GameDialogManager.tsx` diff (`git diff`): only the import block changed — `ArmySelectionDialog`, `AttackSelectionDialog`, `MonsterSelectionDialog` moved into the existing `@/modules/combat` import, out of `../dialogs/*`; no other line changed — met.
- `src/modules/combat/index.ts`: three new exports added, alongside the untouched `CombatDialog`/`MonsterCombatDialog` — met.
- All new files under the 150-line cap (largest, `ArmySelectionDialog.test.tsx`, 146 lines) — met, also implied by lint's clean max-lines pass.

## Findings
| # | File:line | Problem | Owner | Blocking? |
|---|---|---|---|---|
| 1 | `src/features/game/dialogs/ArmySelectionDialog.tsx`, `AttackSelectionDialog.tsx`, `MonsterSelectionDialog.tsx` | Legacy files not deleted after their module replacements were verified working (plan.md: "deleted — End of phase"). | implementer-b | Yes |
| 2 | `src/features/game/dialogs/__tests__/ArmySelectionDialog.characterization.test.tsx`, `AttackSelectionDialog.characterization.test.tsx`, `MonsterSelectionDialog.characterization.test.tsx` | Characterization tests not deleted once ported into the module `.test.tsx` files (plan.md marks each "deleted end of phase"). | tester-a | Yes |

## Docs
- `docs/README.md`: not expected this phase (Phase 5 owns it per the File plan) — not reviewed here.

## progress.md
- Not ticking "final review (architect-b)" for Phase 3. Checks (typecheck, lint, unit tests, UI verified) are independently confirmed in this session and may stay ticked; "final review" and "committed" stay unticked until the legacy files and characterization tests are deleted and re-verified.

## Required fix before re-review
1. implementer-b: delete `src/features/game/dialogs/{ArmySelectionDialog,AttackSelectionDialog,MonsterSelectionDialog}.tsx`.
2. tester-a: delete the 3 characterization test files (`src/features/game/dialogs/__tests__/{ArmySelectionDialog,AttackSelectionDialog,MonsterSelectionDialog}.characterization.test.tsx`); confirm `grep -rn "dialogs/ArmySelectionDialog\|dialogs/AttackSelectionDialog\|dialogs/MonsterSelectionDialog" src/` returns nothing afterward.
3. Re-run `npm run typecheck`, `npm run lint`, and `npx jest src/modules/combat src/features/game/dialogs/__tests__ src/features/game/components/GameDialogManager` scoped to this phase.

---

## Second pass (after implementer-b deleted the 3 legacy files and tester-a deleted the 3 characterization tests)

VERDICT: APPROVED

## Checks run (second pass)
- `ls src/features/game/dialogs/`: no longer lists `ArmySelectionDialog.tsx`, `AttackSelectionDialog.tsx`, `MonsterSelectionDialog.tsx`; the remaining `ConfirmExitDialog.tsx`, `HostLeaveDialog.tsx`, `PositionDialog.tsx` are correctly untouched (Phase 4's). `git status --porcelain -uall -- src/features/game/dialogs/` shows `D` for all 3 deleted files. `src/features/game/dialogs/__tests__/` is empty.
- `grep -rn "dialogs/ArmySelectionDialog\|dialogs/AttackSelectionDialog\|dialogs/MonsterSelectionDialog" src/`: no matches anywhere in the tree.
- `npm run typecheck` filtered to exclude `src/modules/map/**` (sibling `game-map-migration` task): zero errors.
- `npm run lint`: clean, zero errors/warnings repo-wide.
- `npx jest src/modules/combat src/features/game/dialogs/__tests__ src/features/game/components/GameDialogManager`: `Test Suites: 17 passed, 17 total` / `Tests: 275 passed, 275 total` (down from 20/295 in the first pass, matching removal of the 3 characterization-test suites).
- `npm test` (full repo): `Test Suites: 1 failed, 134 passed, 135 total` / `Tests: 23 failed, 1338 passed, 1361 total`. The single failing suite is `src/modules/map/components/IslandTile/IslandTile.map.test.ts` — confirmed via `grep FAIL` on the full run output, same file already flagged by `npm run typecheck` as belonging to the sibling `game-map-migration` task (`PendingAction`/`IslandTileContext` type mismatches). Zero failures in this phase's files.

## Findings (second pass)
Both blocking findings from the first pass are resolved. No new findings.

## progress.md
- Ticked "final review (architect-b)" for Phase 3; "committed" is the coordinator's to fill in once Phase 3 is committed.

---

# Final review: Migrate the remaining 13 game dialogs into src/modules, phase 4/5

VERDICT: CHANGES REQUESTED

## Checks run
- `npm run typecheck`: clean, zero errors repo-wide (`tsc --noEmit` → no output).
- `npm run lint`: clean, zero errors/warnings repo-wide (`eslint . --max-warnings 0 --no-error-on-unmatched-pattern` → no output).
- `npx jest src/modules/combat/components/PositionDialog src/modules/session src/features/game/dialogs/__tests__ src/features/game/components/GameDialogManager`: `Test Suites: 11 passed, 11 total` / `Tests: 48 passed, 48 total`.
- `npm test` (full repo): `Test Suites: 146 passed, 146 total` / `Tests: 1423 passed, 1423 total` — matches the coordinator's reported numbers exactly.
- ui-verify: trusted the coordinator's report (PositionDialog single/multiple resources, ConfirmExitDialog default, HostLeaveDialog's 3 branches, destructive-variant styling on "Confirm & Leave") — not re-run in this session; `src/testbed/registry.ts` diff confirms `positionDialogPreview`, `confirmExitDialogPreview`, `hostLeaveDialogPreview` are imported and registered.

## Plan adherence
- `PositionDialog` moved into `src/modules/combat/components/PositionDialog/` with the File plan's exact file set (`.types.ts`, `.map.ts`, `.fixtures.ts`, `index.ts`, `.styles.ts`, `.tsx`, `.map.test.ts`, `.test.tsx`, preview + preview test); no `.hook.ts`, matching Decisions (pure, prop-driven) — met.
- Read `PositionDialog.tsx`/`.map.ts`/`.styles.ts` against the legacy file in full: `toPositionDialogViewModel` (`PositionDialog.map.ts:8-17`) mirrors `RESOURCE_SPRITES[type] || '/sprites/mine.png'` and `getResourceDisplayName` exactly; every Tailwind class in `.styles.ts` matches the legacy inline classes verbatim, including the "max-w-md" (no `sm:` variant, unlike the Contract's `CardsDialog` example — this dialog's legacy file never had one); `data-testid={`position-resource-btn-${type}`}` preserved (`PositionDialog.tsx:44`) — met. Confirmed all classes route through `styles.*`, no inline className — the mid-build cross-review fix is in place and holds.
- New `session` domain: `ConfirmExitDialog` and `HostLeaveDialog` exist under `src/modules/session/components/` with the File plan's file sets (`ConfirmExitDialog`: no `.map.ts`/`.hook.ts` per Decisions, static content; `HostLeaveDialog`: `.map.ts` with `toHostLeaveDescription`, no `.hook.ts`) — met.
- `toHostLeaveDescription` (`HostLeaveDialog.map.ts`) is byte-for-byte the same three branches/strings as the legacy `description()` closure — met.
- `src/modules/session/index.ts` created, exports both components per the Contract — met.
- `GameDialogManager.tsx` diff: only the import block changed — `PositionDialog` moved into the existing `@/modules/combat` import, `ConfirmExitDialog`/`HostLeaveDialog` added as a new `@/modules/session` import; no other line changed (`git diff` reviewed in full) — met.
- `src/modules/combat/index.ts`: one new export (`PositionDialog`) added, alongside the untouched prior three — met.
- All new files under the 150-line cap, implied by lint's clean max-lines pass — met.

## Legacy deletion: NOT met — the third-time-flagged pattern, confirmed still present
- `ls src/features/game/dialogs/` still lists `ConfirmExitDialog.tsx`, `HostLeaveDialog.tsx`, `PositionDialog.tsx`.
- `ls src/features/game/dialogs/__tests__/` still lists `ConfirmExitDialog.characterization.test.tsx`, `HostLeaveDialog.characterization.test.tsx`, `PositionDialog.characterization.test.tsx` — all three are untracked (`??` in `git status --porcelain -uall`), i.e. never even committed, let alone deleted.
- plan.md's File plan (`plan.md:212,222,229`) marks each characterization test "new (deleted end of phase)" and the three legacy `.tsx` files + their characterization tests "deleted — End of phase... this empties `src/features/game/dialogs/` of all 13 target files" (`plan.md:240`). None of this happened.
- This is the exact gap the coordinator's brief and `docs/ai/lessons-learned.md`'s "Refactors" entry (source: this task, 2026-10-04) both explicitly named going into this review — it has now recurred a fourth time across this task's four phases (Phase 1 first pass, Phase 2 first pass, Phase 3 first pass, now Phase 4). The hand-back's claim that deletion was "pending" does not make it done; `ls`/`git status` on the exact paths is the only check that confirms it.
- Net effect: `GameDialogManager.tsx` now renders the new module components correctly, but all three legacy files and their characterization tests are dead code sitting unused in the tree — and per plan.md's acceptance criteria and step 11 of Phase 4 ("Confirm `src/features/game/dialogs/` now contains no file from the original 13"), this phase is not complete until they're gone.

## Findings
| # | File:line | Problem | Owner | Blocking? |
|---|---|---|---|---|
| 1 | `src/features/game/dialogs/ConfirmExitDialog.tsx`, `HostLeaveDialog.tsx`, `PositionDialog.tsx` | Legacy files not deleted after their module replacements were verified working (plan.md: "deleted — End of phase"). | implementer-b | Yes |
| 2 | `src/features/game/dialogs/__tests__/ConfirmExitDialog.characterization.test.tsx`, `HostLeaveDialog.characterization.test.tsx`, `PositionDialog.characterization.test.tsx` | Characterization tests not deleted once ported into the module `.test.tsx` files (plan.md marks each "deleted end of phase"). | tester-a | Yes |

## Docs
- `docs/README.md`: not expected this phase (Phase 5 owns it per the File plan) — not reviewed here.

## progress.md
- Not ticking "final review (architect-b)" for Phase 4. Checks (typecheck, lint, unit tests, UI verified) are independently confirmed in this session and may stay ticked; "final review" and "committed" stay unticked until the three legacy files and their characterization tests are deleted and re-verified.

## Required fix before re-review
1. implementer-b: delete `src/features/game/dialogs/{ConfirmExitDialog,HostLeaveDialog,PositionDialog}.tsx`.
2. tester-a: delete the 3 characterization test files (`src/features/game/dialogs/__tests__/{ConfirmExitDialog,HostLeaveDialog,PositionDialog}.characterization.test.tsx`); confirm `grep -rn "dialogs/ConfirmExitDialog\|dialogs/HostLeaveDialog\|dialogs/PositionDialog" src/` returns nothing afterward, and `ls src/features/game/dialogs/` shows the directory now contains no file from the original 13 (only `__tests__/`, which should then also be empty).
3. Re-run `npm run typecheck`, `npm run lint`, and `npx jest src/modules/combat/components/PositionDialog src/modules/session src/features/game/dialogs/__tests__ src/features/game/components/GameDialogManager` scoped to this phase.

---

## Second pass (after implementer-b deleted the 3 legacy files and tester-a deleted the 3 characterization tests)

VERDICT: APPROVED

## Checks run (second pass)
- `ls -la src/features/game/dialogs/`: contains only the `__tests__/` subfolder, no `.tsx` file. `ls -la src/features/game/dialogs/__tests__/`: empty. `git status --porcelain -uall -- src/features/game/dialogs/` shows `D` (deleted) for all 3 `.tsx` files — verified directly via `ls`/`git status`, not trusted from the hand-back, per the lessons-learned entry this phase triggered.
- `grep -rn "dialogs/ConfirmExitDialog\|dialogs/HostLeaveDialog\|dialogs/PositionDialog" src/ e2e/ docs/ .claude/ CLAUDE.md` (excluding this task's own `plan.md`/`review.md`, which cite the old paths historically): no matches.
- `npm run typecheck`: clean, zero errors repo-wide.
- `npm run lint`: clean, zero errors/warnings repo-wide.
- `npx jest src/modules/combat/components/PositionDialog src/modules/session src/features/game/dialogs/__tests__ src/features/game/components/GameDialogManager`: `Test Suites: 8 passed, 8 total` / `Tests: 33 passed, 33 total` (down from 11/48 in the first pass, matching removal of the 3 characterization-test suites).
- `npm test` (full repo): first run showed `Test Suites: 1 failed, 142 passed, 143 total` with `src/modules/hud/components/ActionsPanel/ActionsPanel.test.tsx` failing with `signal=SIGSEGV` (a crashed jest worker, not an assertion failure). Re-ran `npx jest src/modules/hud/components/ActionsPanel` alone: `Test Suites: 3 passed, 3 total` / `Tests: 92 passed, 92 total`. Re-ran the full suite again: `Test Suites: 143 passed, 143 total` / `Tests: 1408 passed, 1408 total` — matches tester-a's reported numbers exactly. The SIGSEGV was a one-off worker crash under parallel load, not a real failure, and `ActionsPanel` belongs to the sibling `hud` migration task, not this phase's files regardless.

## Findings (second pass)
Both blocking findings from the first pass are resolved. No new findings.

## progress.md
- Ticked "final review (architect-b)" for Phase 4; "committed" is the coordinator's to fill in once Phase 4 is committed.

---

# Final review: Migrate the remaining 13 game dialogs into src/modules, phase 5/5

VERDICT: APPROVED

## Checks run
- `npm run typecheck`: clean, zero errors repo-wide (`tsc --noEmit` → no output).
- `npm run lint`: clean, zero errors/warnings repo-wide (`eslint . --max-warnings 0 --no-error-on-unmatched-pattern` → no output).
- `npx jest src/modules/cards src/modules/combat src/modules/session src/modules/shared src/features/game/components/GameDialogManager`: `Test Suites: 50 passed, 50 total` / `Tests: 450 passed, 450 total`.
- `npm test` (full repo): `Test Suites: 149 passed, 149 total` / `Tests: 1472 passed, 1472 total`.
- `npm run build`: `✓ Compiled successfully`, static pages generated, no type or lint errors during build.
- ui-verify: trusted the coordinator's report for this phase (26/26 screenshots across all 13 components, no console errors) — not re-run in this session.

## Plan adherence
- All 13 dialogs confirmed present under `src/modules/<domain>/components/`: `cards` has `AbilitiesDialog, CardsDialog, ProductiveCardDialog, SabotageDialog, SpecialIslandRollDialog, StealResourceDialog, WealthyDialog` (7); `combat` has `ArmySelectionDialog, AttackSelectionDialog, MonsterSelectionDialog, PositionDialog` alongside the pre-existing `CombatDialog, MonsterCombatDialog`; `session` has `ConfirmExitDialog, HostLeaveDialog` (2) — 7+4+2 = 13, met.
- `src/features/game/dialogs/`: `ls -la` shows only an empty `__tests__/` subfolder, zero `.tsx` files — all 13 legacy files and their characterization tests are gone. `grep -rn` for each legacy dialog path across `src/`, `e2e/`, `docs/`, `.claude/`, `scripts/` returns no production-code hits (only historical mentions in other tasks' own `plan.md`/`triage.md` files and `docs/ai/refactor.md`'s row #4, none of which are code) — met.
- `src/modules/shared/player-sprite.ts`'s `toPlayerIdleSprite` is used in exactly the 4 places the plan names, crossing the `cards`/`combat` boundary: `SabotageDialog.map.ts`, `StealResourceDialog.map.ts`, `ArmySelectionDialog.map.ts`, `AttackSelectionDialog.map.ts` — met.
- `StealResourceDialog` split into `StealResourceDialog.tsx` (32 lines) + `PlayerSelectionStep.tsx` + `ResourceSelectionStep.tsx` (84 lines), all well under the 150-line cap; only `StealResourceDialog` exported from `src/modules/cards/components/StealResourceDialog/index.ts` — met.
- `AbilitiesDialog.hook.ts:21` uses `catch (e: unknown)` per the mandated behavior-preserving fix — met.
- `src/features/game/components/GameDialogManager.tsx` imports all 13 dialogs from `@/modules/cards` (7) and `@/modules/combat` (4) and `@/modules/session` (2), plus the already-migrated `CombatDialog`/`MonsterCombatDialog` from `@/modules/combat`; `git log` shows this file was last touched at the Phase 4 commit (`7d4fb51`) and has no further changes in this phase — met, no further edit needed since Phase 4 already completed the import swap.
- `docs/README.md`: diff reviewed. The `src/modules/` bullet now documents `cards/` (7 dialogs), the extended `combat/` (adds `ArmySelectionDialog, AttackSelectionDialog, MonsterSelectionDialog, PositionDialog`), new `session/` (`ConfirmExitDialog, HostLeaveDialog`), and new `shared/` (`toPlayerIdleSprite`) — matches the actual file tree confirmed above. The `GameDialogManager.tsx` bullet is updated from "the other 13 dialogs still live under `src/features/game/dialogs/`" to naming all 13 by their new module imports — met, satisfies the acceptance criterion.
- All files under the 150-line cap, confirmed by both direct line counts on the largest files and lint's clean `max-lines` pass — met.

## Findings
| # | File:line | Problem | Owner | Blocking? |
|---|---|---|---|---|
| 1 | `docs/README.md` | The working tree's diff to this file currently interleaves this task's hunks (cards/combat/session/shared bullet, `GameDialogManager.tsx` bullet) with unrelated, still-in-progress sibling tasks' hunks (`game-map-migration`'s `MapGrid`/`IslandTile`/tile-children bullets removed, bot-logic migration's bullets). Content of this task's hunks is correct and verified above, but committing the whole file as-is would bundle unrelated, not-yet-reviewed sibling work into this phase's commit. | coordinator | Yes, for the commit step only — stage only this task's hunks of `docs/README.md` (`git add -p` or equivalent), not the full file, when committing Phase 5. Not a content defect. |
| 2 | `docs/ai/refactor.md:33` | Row #4 ("Game dialogs — remaining") still reads `in-progress (phase 1/5 committed 1cb8ac3)`, stale since Phase 2. | coordinator | No — update to `done` with all 5 commit hashes once Phase 5 is committed, per that file's own "How an agent should use this file" step 2. Routine end-of-task housekeeping, not a defect in this phase's diff. |

## Docs
- `docs/README.md`: updated, content verified correct for this task's scope (see Plan adherence and Finding 1 for the staging caveat).

## progress.md
- Ticked "final review (architect-b)" for Phase 5; "committed" is the coordinator's to fill in once Phase 5 is committed (with the hunk-staging caveat in Finding 1 applied to `docs/README.md`).
