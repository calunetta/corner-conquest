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
