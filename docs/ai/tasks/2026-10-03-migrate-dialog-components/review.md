# Final review: Migrate CombatDialog to src/modules/combat, phase 1/3

VERDICT: APPROVED

## Checks run
- `npm run typecheck` → `tsc --noEmit`, no output, exit 0. Clean.
- `npm run lint` → full repo run (`eslint .`) surfaces 146 errors / 7 warnings, but every single one is inside `.claude/worktrees/angry-burnell-93c06f/**` — a second git worktree (branch `claude/angry-burnell-93c06f`, confirmed via `git worktree list`) nested under `.claude/`. `eslint.config.mjs`'s `LEGACY_PATHS` ignores (`src/features/**`, `src/lib/**`, …) are written relative to repo root and don't match that nested prefix, so the worktree's legacy files leak into the flat glob `eslint . `. This is a pre-existing environment artifact, not caused by this diff: rerunning `npx eslint . --max-warnings 0 --no-error-on-unmatched-pattern --ignore-pattern '.claude/worktrees/**'` → no output, exit 0 (clean). Also ran `npx eslint src/modules/combat src/testbed/registry.ts --max-warnings 0` directly → no errors. All files this phase touches or created are lint-clean.
- `npm test` (scoped: `npx jest src/modules/combat src/features/game/components`) → `Test Suites: 13 passed, 13 total`, `Tests: 121 passed, 121 total`.
- ui-verify: `test-results/ui-verify/testbed-combat-combat-dialog-*` — 5 states × desktop/mobile = 10 screenshots present. Viewed "Results — attacker wins" and "Rolling — attacker, both cards" (desktop): dice cells, amber winner highlight, gradient roll/confirm buttons, tactical-card radio group, VS divider all render as expected and match the legacy styling verbatim.

## Plan adherence
- `src/modules/combat/` exists with `CombatDialog` built per types/map/hook/styles/view split (`CombatDialog.types.ts`, `.map.ts`, `.hook.ts`, `.styles.ts`, `.tsx`, plus a `CombatantCard.tsx` sub-component — see Findings #1). Met.
- `CombatDialog.map.ts:6-71` mirrors the legacy component's logic (`git show HEAD:src/features/game/dialogs/CombatDialog.tsx`) field-for-field: `isAttacker`, `isCombatOver`, `loserId`, sprite resolution, `hasWarChiefCard`/`hasOvercomeCard`, `canPerformAction`, `canUseCard`, totals, `canSelectCard` formula — identical. Met.
- `CombatDialog.styles.ts` — every literal class string quoted in plan.md's Contracts (content wrapper, `diceCell` cva variants, `combatantBox` cva variants, roll/confirm button gradients) matches byte-for-byte, plus the rest of the legacy file's classes carried over. Met.
- `GameDialogManager.tsx:8` now imports `CombatDialog` from `@/modules/combat`; diff confirms no other line changed. Met.
- Legacy `src/features/game/dialogs/CombatDialog.tsx` deleted (confirmed via `git status`: `deleted: src/features/game/dialogs/CombatDialog.tsx`). Its characterization test (`src/features/game/dialogs/__tests__/CombatDialog.characterization.test.tsx`) was never committed (plan step 1 writes it as a throwaway file against the legacy component, step 12 deletes it) — it does not exist on disk now (`ls src/features/game/dialogs/__tests__/` shows only the pre-existing `ResourceDialogs.test.tsx`) and never appears in `git status`, consistent with an untracked create-then-delete. Correct per plan step 12.
- `grep -rn "dialogs/CombatDialog" src e2e` → no hits in source. The only remaining hits repo-wide are prose in `docs/ai/tasks/2026-10-03-migrate-dialog-components/{plan,triage}.md` and `docs/ai/refactor.md` (expected, historical/task-tracking text) and the unrelated nested worktree's own copy of the pre-refactor branch. No dangling code reference. Met.
- Preview: `CombatDialog.preview.tsx` registers exactly the 5 states plan.md's "Preview states" section lists (Rolling/no-cards, Rolling/both-cards, Rolling/spectator, Results/win, Results/draw), registered in `src/testbed/registry.ts`. Met.
- `npm run typecheck`, `npm run lint`, `npm test` pass (see Checks above). `npm run build` and `docs/README.md` are Phase 3 scope per the plan, correctly not touched here.

## Findings
| # | File:line | Problem | Owner | Blocking? |
|---|---|---|---|---|
| 1 | `src/modules/combat/components/CombatDialog/CombatantCard.tsx` (new, not in plan's File plan) | `implementer-b` split the attacker/defender box into a `CombatantCard` sub-component, not listed in plan.md's File plan. Justified: `CombatDialog.tsx` + `CombatantCard.tsx` together are 178 raw lines, over the 150-line cap, and plan.md explicitly allows "If any file exceeds 150 counted lines, the owner splits it by responsibility … and reports the added file." The split is along a real responsibility boundary (one reusable attacker/defender box, used twice) and the two call sites (`CombatDialog.tsx:83,90`) pass narrow, well-typed props. No behavior or style change — confirmed by diffing against the legacy attacker/defender box blocks. | none | No — permitted by plan.md's own split-file rule; not a deviation needing rework. |
| 2 | `src/testbed/registry.ts:3` | Imports `combatDialogPreview` via the deep path `@/modules/combat/components/CombatDialog/CombatDialog.preview`, not through the module's public index (`@/modules/combat` only exports `CombatDialog`/`MonsterCombatDialog`, not previews). `eslint.config.mjs`'s `deepModuleImport` rule only applies to files matching `src/modules/**/*.{ts,tsx}` (`eslint.config.mjs:42,78`), and `src/testbed/registry.ts` is outside that glob, so it isn't lint-enforced here — same pattern as the existing `src/testbed/legacy/*.preview.tsx` registrations, which are also direct file imports with no module index to go through. Not a violation of the stated boundary ("another module only through its index") in the way the rule intends, since previews are legitimately outside `index.ts`'s public API; flagging only as a non-blocking note for consistency if a later task wants to add preview re-exports. | none | No |

## Docs
- `docs/README.md`: not updated — correctly deferred to Phase 3 per plan.md's File plan (`docs/README.md | edit | … | implementer-b (Phase 3)`).

## Progress
- Ticked in `progress.md` for Phase 1: characterization test (implied by verified deletion pairing), implementation, tests, preview, checks, UI verified, legacy file+test deleted. This review itself is the final-review box.
