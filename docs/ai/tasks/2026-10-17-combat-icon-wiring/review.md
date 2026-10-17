# Final review: Lucide-capable icon resolver and combat icon wiring, phase 1

VERDICT: APPROVED

## Checks run
- `npm run typecheck`: clean, no errors (`tsc --noEmit`).
- `npx eslint --max-warnings 0` on the 15 changed/new files (`src/modules/icons/{resolve-icon.ts,resolve-icon.test.ts,lucide-glyphs.ts,lucide-glyphs.test.ts,index.ts}`, `src/modules/shared/{registry-icon.tsx,registry-icon.test.tsx,fight-icon.tsx,info-icon.tsx,resource-icon.tsx,fight-icon.test.tsx,info-icon.test.tsx,resource-icon.test.tsx,index.ts}`, `src/testbed/components/IconEditor/IconEditorRow.tsx`): 0 errors, 0 warnings.
- `npx jest --testPathPatterns="^src/modules/icons/(resolve-icon|lucide-glyphs)\.test\.ts$|^src/modules/shared/(registry-icon|fight-icon|info-icon|resource-icon)\.test\.tsx$|^src/testbed/components/IconEditor/"`: `Test Suites: 11 passed, 11 total`, `Tests: 224 passed, 224 total`.
- Repo-wide `npm run lint`/`npm test` intentionally not run (pre-existing failures outside this task, per instructions).
- ui-verify: not run — Phase 1's `progress.md` marks previews/UI-verify "none planned, skip" (no visible change: overrides stay empty in production).

## Plan adherence
- `resolveIcon(id)` resolves both kinds, override `src` wins regardless of kind, default otherwise — met: `src/modules/icons/resolve-icon.ts:39-53`, matches Contracts block in `plan.md:88-99` exactly. Verified by `resolve-icon.test.ts`'s image/lucide/override-src/override-src-on-lucide/empty-src cases.
- `FightIcon`/`InfoIcon`/`ResourceIcon` render through the new resolver contract with unchanged DOM, alt and classes — met: all three are now one-line wrappers around `RegistryIcon` (`src/modules/shared/fight-icon.tsx`, `info-icon.tsx`, `resource-icon.tsx`), reproducing the exact markup the plan's Contracts section specifies (`plan.md:110-117`); their tests pass unchanged in intent, only the mock shape updated.
- `RegistryIcon` new in `src/modules/shared` — met: `registry-icon.tsx`, exported from `src/modules/shared/index.ts:11-12`.
- `IconEditorRow`'s `IconGlyph` now calls `getLucideGlyph` instead of its local `lucideGlyphsByName`, dropping the now-unused `LucideIcon` import — met (`IconEditorRow.tsx:6,18`).
- `docs/architecture/systems-and-visuals.md`'s icon-resolver bullet rewritten to describe the new `{source, transform}` contract, `getLucideGlyph`, `RegistryIcon`, and that `IconEditorRow`'s thumbnail still uses `toIconTransform` on draft values rather than `resolveIcon` — met and accurate against the code read in this review.
- `npm run typecheck`, lint, scoped tests pass — met, see Checks above.

## Judged points
- **Lucide `Map` covers all 51 `kind: 'lucide'` registry names, not only the 9 combat ones**: necessary, not scope creep. `getLucideGlyph` replaces `IconEditorRow`'s old `lucideGlyphsByName`, which indexed the full `lucide-react` namespace for the editor's thumbnail across every registry entry, not just combat's. Confirmed by extracting `icon-registry.config.json`'s `kind: 'lucide'` names: exactly the same 51 names as the `Map`. `lucide-glyphs.test.ts:33-36` adds a guard (`registryLucideNames()`) that fails if a future registry entry's name is missing from the map.
- **`RegistryIcon`'s `alt` default `''` and inline Tailwind classes**: acceptable. The inline markup is specified verbatim in `plan.md`'s Contracts block (lines 110-117) and matches the pattern already used by the sibling files it replaces (`fight-icon.tsx`, `info-icon.tsx`, `resource-icon.tsx` inlined classes the same way before this change — none of the four live in a `components/<Name>/` folder with a `.styles.ts`, consistent with the component-architecture skill's exemption for files outside that layout). `alt` defaulting to `''` is the Decisions section's explicit, justified choice (plan.md:38) to keep combat's decorative lucide glyphs alt-free while image-kind consumers keep real alt text.
- **`jest.unmock('lucide-react')` in `lucide-glyphs.test.ts` and `registry-icon.test.tsx`**: acceptable. `jest.setup.js:19-25` globally mocks `lucide-react` with a stub-per-property Proxy; both tests need the real exports (identity checks against `lucide.Swords`, and a real `<svg>` with a real `lucide-*` class), and both carry a comment explaining why.
- **`IconEditorRow` still applies `toIconTransform` to draft values, not `resolveIcon`**: consistent with the plan. `plan.md`'s Verified context (line 21) and Decisions (line 37) explicitly call out that the editor resolves its live draft state, a different input than `resolveIcon`'s saved-config input, and that only the lucide-name lookup moves, not the whole resolution path. The docs update states this explicitly.

## Findings
None blocking. No invented paths or symbols found; every file in the plan's Phase 1 File plan is accounted for.

Out of scope, flagged for awareness only (not this task's doing): the working tree also has untracked `src/modules/shared/collector-sprite.ts` / `.test.ts` and unrelated dev-tools-token edits in the same `systems-and-visuals.md` diff (Icon Editor / Monster Sprite Uploader paragraphs, 401/403/503). These predate this task (present in the session's initial `git status`) and are outside Phase 1's file plan; not reviewed here.

## Docs
- `docs-sync`: ran, updated `docs/architecture/systems-and-visuals.md`'s "Icon resolver" bullet (line 184 before edit) to match the new `resolveIcon`/`RegistryIcon`/`getLucideGlyph` contract.

---

# Final review: Lucide-capable icon resolver and combat icon wiring, phase 2

VERDICT: APPROVED (UI verification still pending — see below)

## Re-review note
Previous round (CHANGES REQUESTED) flagged the `positioned`-status icon being swapped for an unrelated in-flight collector-sprite feature, with unauthorized edits to `AttackSelectionDialog.map.ts`/`.map.test.ts`/`.types.ts`. Since then:
- `anchor` was registered in `src/modules/icons/icon-registry.config.json` (`id: "anchor"`, `module: "combat"`, verified at line 234) and mapped in `src/modules/icons/lucide-glyphs.ts:4,63` (`['Anchor', Anchor]`).
- `ArmySelectionDialog.tsx` and `AttackSelectionDialog.tsx` now use `STATUS_ICON_ID: Record<ArmyStatus, string> = { acted: 'check-circle', positioned: 'anchor', ready: 'clock' | 'crosshair' }`, rendered via `<RegistryIcon id={statusIconId} className={styles.statusIcon} />` — same pattern as `acted`/`ready`, same `className`, `lucide-react` import dropped. This is now a complete, uniform port of all three statuses, matching the acceptance criterion ("same visible icon... as before": `anchor` is the same lucide glyph, same size/color classes, now routed through the registry like every other combat icon).
- The sprite-swap (`toCollectorIdleSprite`, `Image`, `aria-hidden` branch) is fully removed from both files; `git diff` on `AttackSelectionDialog.map.ts`, `AttackSelectionDialog.types.ts`, `AttackSelectionDialog.map.test.ts` is empty — byte-identical to `HEAD`, no residual hunks from the unrelated feature or from this task.
- `docs/architecture/systems-and-visuals.md`'s diff is unchanged from the prior round (3 lines: the Icon resolver bullet plus the pre-existing, unrelated dev-tools-password wording) — still accurate, no update needed since the `positioned` case is now a normal registry id like the others, nothing new to document beyond what the bullet already says ("for example `skull`, `swords`, ... `crosshair`").

## Checks run (this round)
- `npx tsc --noEmit`: clean, no errors.
- `npx eslint --max-warnings 0` on the 8 Phase 2 combat `.tsx` files plus `src/modules/icons/lucide-glyphs.ts`: 0 errors, 0 warnings.
- `npx jest --testPathPatterns="^src/modules/combat"` (anchored — the unanchored `src/modules/combat` pattern also matches `.claude/worktrees/*/src/modules/combat/...` from unrelated parallel sessions and gives false failures, do not use it): `Test Suites: 20 passed, 20 total`, `Tests: 292 passed, 292 total` (one fewer than the prior round's 293 — the reverted `defendingPlayerColor` test is gone, as expected).
- `npx jest --testPathPatterns="^src/modules/icons/lucide-glyphs"`: `Test Suites: 1 passed, 1 total`, `Tests: 60 passed, 60 total` (guards the new `anchor` map entry).
- Registry ids confirmed present: `check-circle`, `clock`, `crosshair`, `anchor` all found exactly once each in `icon-registry.config.json`.
- Repo-wide `npm run lint`/`npm test` intentionally not run per instructions.

## Plan adherence
All 8 Phase 2 files plus `ArmySelectionDialog.tsx`/`AttackSelectionDialog.tsx`'s `STATUS_ICON_ID` maps now match `plan.md`'s File plan and Contracts. `PositionDialog.tsx` remains untouched by this phase (confirmed in the prior round by mtime, unchanged since). No out-of-scope files remain touched.

## Findings
None blocking.

**Still open, not blocking this verdict:** the `animate-spin` class (`CombatDialog.styles.ts:58` `loaderIcon`) now sits on `RegistryIcon`'s outer wrapper `<span>` instead of directly on the `<svg>` (`CombatDialog.tsx:106,123`) — pre-approved by plan.md's Risks section as a mechanical, same-effect change. The browser check is still blocked by an unrelated build error in `src/modules/game-board/game-board.animation-cleanup.hook.ts` (not this task's file). Given the plan's explicit pre-approval, Phase 1's prior visual verification of `RegistryIcon`'s wrapper markup at other call sites, and the purely mechanical nature of this change (wrapping, not re-flowing), this is low enough risk not to withhold approval of the code change itself. However: do not tick `progress.md`'s "UI verified" box and do not commit Phase 2 until (a) the unrelated build error is fixed and (b) one combat dialog with `isRolling: true` and `MonsterSpectatorScreen`'s loader are checked in a browser.

## Owner routing
- Whoever fixes `game-board.animation-cleanup.hook.ts`'s build error (separate, unrelated task) unblocks preview-b's ui-verify step for this task; then preview-b/architect-b confirm the spin and the `anchor` glyph visually before commit.

## Docs
- `docs-sync`'s Phase 2 edit to `docs/architecture/systems-and-visuals.md`'s Icon resolver bullet remains accurate; no further change needed for the `anchor` fix.
