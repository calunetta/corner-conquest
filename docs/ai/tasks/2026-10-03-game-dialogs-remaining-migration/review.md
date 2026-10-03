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
