# Progress: Victory screen with return-to-lobby

Tier: M · Phases: 1

<!-- architect-a creates one block per phase. The coordinator ticks boxes as stage
     reports arrive; architect-b (final review) confirms them. The SessionStart hook
     lists every unticked box, so a new session knows where to resume. -->

## Phase 1: Victory dialog + finished-exit fix
- [x] plan approved (architect-b)
- [x] implementation (implementer-a, implementer-b)
- [x] tests (tester-a, tester-b)
- [x] previews (preview-a, preview-b)
- [x] checks: typecheck, lint, unit tests
- [x] UI verified (ui-verify)
- [x] docs updated (docs-sync: `systems-and-visuals.md` §6.12, `game-mechanics.md` §5.1, `structure-and-state.md` §2)
- [x] final review (architect-b)
- [ ] committed: <hash>

## Log
<!-- One line per stage: YYYY-MM-DD agent: DONE | BLOCKER, short summary -->
2026-10-13 implementer-a/b: DONE, VictoryDialog component + GameDialogManager/player-exit.service wiring (found already in working tree this session, verified against plan).
2026-10-13 tester-a: DONE, 17 VictoryDialog.map.test.ts tests + 4 player-exit.service.test.ts Finished-branch tests, all passing.
2026-10-13 tester-b: DONE, 11 VictoryDialog.test.tsx tests; found a real bug — Radix AlertDialogContent doesn't auto-focus the button when there's no AlertDialogCancel, so initial focus silently failed.
2026-10-13 coordinator: DONE, fixed the focus bug with an explicit onOpenAutoFocus handler + button ref in VictoryDialog.tsx; all tests pass.
2026-10-13 preview-a: DONE, VictoryDialog.preview.tsx (4 states, close/reopen wrapper) + testbed/registry.ts entry.
2026-10-13 coordinator: DONE, wrote VictoryDialog.preview.test.tsx (6 tests, uses `{ hidden: true }` for the Close-preview button per the existing CombatDialog.preview.test.tsx pattern for Radix aria-hidden background content).
2026-10-13 coordinator (ui-verify): DONE, browser-checked all 4 states at desktop and 390×844. Found a real bug — the `py-5` class in the approved plan's styles contract doesn't override the Button component's default `h-10` (border-box sizing), so the button measured 40px instead of the ≥44px the acceptance criteria require. Fixed by adding `h-11` to `styles.returnButton` in VictoryDialog.styles.ts (44px, confirmed in browser). Tab-focus ring and close/reopen flow also confirmed working in all 4 states.
2026-10-13 docs-sync: DONE, updated systems-and-visuals.md §6.12 (new Finished-leave bullet), game-mechanics.md §5.1 (victory screen paragraph), structure-and-state.md §2 (file list).
2026-10-13 coordinator: DONE, full checks — `npm run typecheck` clean, `npx eslint` on touched files clean, `npx jest src/modules/session/components/VictoryDialog/ src/modules/game-rules/services/player-exit.service.test.ts` → 70/70 passing. Repo-wide `npm test` has 7 pre-existing failing suites in `src/modules/map/*`, unrelated to this task (already modified/uncommitted in the working tree before this session started) — not touched here.
