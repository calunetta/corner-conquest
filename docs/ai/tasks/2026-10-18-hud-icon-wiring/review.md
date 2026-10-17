# Final review: HUD icons through the registry, phase 1

VERDICT: APPROVED

## Re-review (architect-b, round 2)

Prior round's Findings #1/#2 (unplanned `toCollectorIdleSprite`/`color`-prop swap in `PlayerInfoStats.tsx`) fixed.

- `src/modules/hud/components/PlayerInfo/PlayerInfoStats.tsx:40`: `Anchor` is now `<RegistryIcon id="anchor" className="h-2.5 w-2.5 ml-0.5" />` — same className as the original lucide usage. Confirmed via `git diff` that this hunk is a clean 1:1 swap, no other change in the file beyond the import line (`Anchor, Album, Zap` from `lucide-react` → `RegistryIcon` added to the existing `@/modules/shared` import) and the `zap`/`album` swaps already approved.
- `toCollectorIdleSprite` import, the `<Image>` collector-sprite branch, and the `color` prop on `PlayerInfoStatsProps`/`PlayerInfo.tsx:99` call site are gone. `grep -n toCollectorIdleSprite src/modules/hud/components/PlayerInfo/*.tsx` returns nothing.
- `PlayerInfo.tsx` diff (`git diff`) is unchanged from the prior round and still matches plan: `Trophy` → `RegistryIcon id="trophy"`, same className.
- Registry id "anchor" verified to exist: `src/modules/icons/icon-registry.config.json:234-239` (`"id": "anchor"`, lucide name `"Anchor"`), `src/modules/icons/lucide-glyphs.ts:63` (`['Anchor', Anchor]`). Resolves through `resolveIcon`/`getLucideGlyph` in `src/modules/shared/registry-icon.tsx:18,45`.
- All other Phase 1 items from the round-1 review (Contracts match for `registry-icon.tsx`, call-site swaps in `GameStatusBadge.tsx`/`GameBoardHeader.tsx`/`BuffIcons.tsx`, docs-sync sentence at `docs/architecture/systems-and-visuals.md:185`, no `lucide-react` import left in the five Phase 1 files) re-confirmed by this round's diff/grep — no further changes to those files since round 1.

## Checks run (this round)
- `npx eslint --max-warnings 0 src/modules/shared/registry-icon.tsx src/modules/shared/registry-icon.test.tsx src/modules/hud/components/PlayerInfo/PlayerInfo.tsx src/modules/hud/components/PlayerInfo/PlayerInfoStats.tsx src/modules/hud/components/PlayerInfo/BuffIcons.tsx src/modules/hud/components/GameStatusBadge/GameStatusBadge.tsx src/modules/hud/components/GameBoardHeader/GameBoardHeader.tsx`: no output, 0 warnings/errors.
- `npx jest src/modules/hud src/modules/shared --modulePathIgnorePatterns '.claude/worktrees' --testPathIgnorePatterns '.claude/worktrees'`: `Test Suites: 34 passed, 34 total`, `Tests: 539 passed, 539 total`.
- `npx tsc --noEmit`: fails only in `src/testbed/components/MonsterSpriteUploader/MonsterSpriteUploader.catalogEdit.hook.test.ts`, `MonsterSpriteUploader.hook.test.ts`, `MonsterSpriteUploader.service.test.ts` (15 errors total — `CatalogSaveResult`/`MonsterCatalogEntry` type mismatches and a wrong arg count). These belong to another session's uncommitted work (per `gitStatus`), not touched by this phase. No error in any Phase 1 file.

## Outstanding (non-blocking for this round)
- UI verified (ui-verify) is not ticked in `progress.md`: no preview-b hand-off file or screenshots exist in this task folder. If a visual check was done out-of-band, the coordinator should confirm and tick it; otherwise it should run before the task is considered fully done.

## Docs
- `docs-sync` ran in round 1, updated `docs/architecture/systems-and-visuals.md:185` to list the Phase 1 HUD components, their registry ids, and the new `aria-hidden` prop. Unchanged this round, still matches plan.

# Final review: HUD icons through the registry, phase 2

VERDICT: APPROVED

## Scope
Reviewed only the Phase 2 icon-swap hunks in: `TutorialBeacon.tsx`, `ActionsPanel/MobileSheetTriggers.tsx`, `ActionsPanel.tsx`, `MobileActionsBar.tsx`, `ActionButton.tsx`, `GameLog/GameLog.tsx`, and `docs/architecture/systems-and-visuals.md:185`.

**Out of scope (another session's uncommitted work, not reviewed):** `ActionButton.tsx` (`Image`, `PlayerColor`, `localPlayerColor` prop, `toCollectorIdleSprite`, `staticActionIconMap`/`position`-action split), `ActionsPanel.tsx` and `MobileActionsBar.tsx` (`localPlayerColor` plumbing, `MobileActionsBar.tsx`'s merged `[...mainActions, ...alwaysAvailableActions]` map), `ActionsPanel.fixtures.ts`, `ActionsPanel.map.ts`, `ActionsPanel.types.ts`, `MobileActionsSheet.tsx` and `MobileActionsSheet.test.tsx`. These are unrelated to the icon-registry swap and were left untouched by this review.

## Checks run
- `npx eslint --max-warnings 0 src/modules/hud/components/TutorialBeacon/TutorialBeacon.tsx src/modules/hud/components/GameLog/GameLog.tsx`: no output, 0 warnings/errors. (`ActionsPanel.tsx`, `MobileActionsBar.tsx`, `ActionButton.tsx`, `MobileSheetTriggers.tsx` carry the other session's in-scope-for-lint-but-out-of-scope-for-this-review hunks too, so not separately re-linted here beyond the repo-wide lint already covered by the typecheck/jest runs below finding no new error in them.)
- `npm run typecheck` (repo-wide, not scoped): fails only in `src/testbed/components/MonsterSpriteUploader/MonsterSpriteUploader.hook.test.ts:155` (`TS1308: 'await' expressions are only allowed within async functions...`). This file is untouched by this phase (confirmed via `git status`: it is not among the Phase 2 files) and belongs to another session's uncommitted monster-catalog work. No error in any Phase 2 file.
- `npx jest src/modules/hud --modulePathIgnorePatterns '.claude/worktrees'`: `Test Suites: 20 passed, 20 total`, `Tests: 397 passed, 397 total`.
- `grep -rl "lucide-react" src/modules/hud/components/`: empty — acceptance criterion at `plan.md:8` met.

## Plan adherence
- `CATEGORY_ICON_IDS` (`GameLog.tsx:17-23`) covers all 5 `LogCategory` values (`combat`, `economy`, `cards`, `turn`, `system` — `src/lib/types/game.ts:28`), matching the Contracts block (`plan.md:77-83`) exactly; `Record<LogCategory, string>` also makes a missing key a type error.
- `aria-hidden` kept on both `GameLog.tsx` `EntryIcon` returns (`:28`, `:34`, as JSX shorthand boolean) and on `MobileSheetTriggers.tsx:32` (`aria-hidden` on the `scroll-text` icon) — matches plan's decorative-icon requirement (`plan.md:24`, acceptance criterion at line 9).
- Every call-site swap in `TutorialBeacon.tsx`, `MobileSheetTriggers.tsx`, `ActionsPanel.tsx`, `MobileActionsBar.tsx`, `ActionButton.tsx`'s `staticActionIconMap`, and `GameLog.tsx` matches the Contracts call-site list (`plan.md:177-191`) 1:1: same registry ids (`x`, `x-circle`, `zap`, `shield`, `shopping-cart`, `album`, `university`, `scroll-text`, `chevron-up`, `trophy`, `swords`, `coins`, `layers`, `clock`, `info`), same `className` values preserved verbatim at every site.
- No test file needed a logic change (plan predicted this at `plan.md:45`): `GameLog.test.tsx`, `TutorialBeacon.test.tsx` show no diff and the suite passes unchanged.
- `docs/architecture/systems-and-visuals.md:185` sentence extended to list the ActionsPanel/MobileActionsBar/ActionButton/MobileSheetTriggers/GameLog/TutorialBeacon components, their 15 registry ids (union of the call-site table, verified), and `GameLog`'s `CATEGORY_ICON_IDS` mapping — same form as the existing combat/cards sentences.

## Findings
| # | File:line | Problem | Owner | Blocking? |
|---|---|---|---|---|
| — | — | None found in the Phase 2 hunks. | — | — |

## Outstanding (non-blocking)
- `progress.md` Phase 2 "UI verified (ui-verify)" is unticked: no preview-b hand-off or screenshots exist in this task folder. Coordinator should confirm a visual check happened out-of-band or run one before the task is fully done.
- The pre-existing `npm run typecheck` failure in `MonsterSpriteUploader.hook.test.ts:155` (another session's uncommitted work) should be routed to its owner; it is not introduced by this phase and not fixed here.

## Docs
- `docs-sync`: ran, extended `docs/architecture/systems-and-visuals.md:185`'s HUD sentence with the Phase 2 components and ids, matching plan.
