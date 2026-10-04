# Triage: Shared hooks migration

Request: migrate `src/hooks/use-game-engine.ts`, `use-player.tsx`, `use-toast.ts` into `src/modules/<domain>/`; dedupe `use-is-mobile.ts` vs `use-mobile.ts` (refactor.md row #10).
Type: refactor
Tier: M
Pipeline: architect-a architect-b implementer-a implementer-b tester-a tester-b architect-b:final-review
Overrides: implementer-a=sonnet, implementer-b=sonnet
Phases: 1

<!-- The Pipeline and Overrides lines are read by scripts/claude-swarm-runner.sh. Keep their format. -->

## Why this tier
- 5 files in scope, all currently in `src/hooks/`, no single consuming domain:
  - `src/hooks/use-game-engine.ts` (153 lines) — imported only by `src/features/game/components/GameBoard.tsx:6`, a legacy `.tsx` that stays at its legacy path by design (`docs/ai/tasks/2026-10-03-game-map-migration/plan.md`'s Decisions: it directly renders still-legacy siblings `ActionsPanel`, `GameLog`, `PlayerInfoBar`, `GameDialogManager`, and a module `.tsx` can never import `@/features/*`). Legacy→module imports are allowed, so this can still move into a module even though its only caller doesn't.
  - `src/hooks/use-player.tsx` (149 lines) — imported by `src/app/layout.tsx:5`, `src/app/page.tsx:6`, `src/features/game/components/GameBoard.tsx:5`, `src/modules/lobby/components/Lobby/Lobby.hook.ts:2` (+ its test, with a `jest.mock`).
  - `src/hooks/use-toast.ts` (208 lines) — imported by `src/components/ui/toaster.tsx:11`, `src/hooks/use-game-engine.ts:6`, `src/modules/game-board/game-board.hook.ts:2`, `src/modules/game-board/game-board.hook.types.ts:3` (type-only), `src/modules/cards/components/AbilitiesDialog/AbilitiesDialog.hook.ts:1`, `src/modules/lobby/components/Lobby/Lobby.hook.ts:3` (+ 4 characterization/unit test files that `jest.mock('@/hooks/use-toast', ...)`).
  - `src/hooks/use-is-mobile.ts` (20 lines) — imported by `src/features/game/components/PlayerInfoBar.tsx:7` (legacy, stays legacy per row #7's Decisions) and `src/modules/map/components/MapGrid/MapGrid.hook.ts:4` (+ test).
  - `src/hooks/use-mobile.ts` (4 lines) — only re-exports `use-is-mobile.ts`; `grep -rn "use-mobile'" src` (excluding the re-export line itself and `use-is-mobile` matches) finds **zero** importers. Confirmed dead — delete, not migrate. Flagged as a duplicate in `.claude/skills/kiss-dry-solid/SKILL.md:32`.
- `eslint.config.mjs:73` caps new/non-legacy files at 150 lines (`max-lines`). `use-toast.ts` is 208 lines and loses its `LEGACY_PATHS` exemption once moved — the architect must plan a split (likely the toast reducer/state vs. the `useToast` hook), not a straight file move.
- No gameplay, Firestore shape, or visible-UI change — this is a pure code-location refactor; multiple call sites and one eslint-forced split make it more than a 1-3-file single-layer tweak (ruling out tier S), but it doesn't touch `GameState`/Firestore shape or game-rule reducers (ruling out L).
- `preview-a`/`preview-b` dropped: no component is created and no visual state changes (two of these are hooks with no JSX, `use-toast` renders nothing itself, `use-player` is a context provider with no visual change).
- `implementer-a`/`implementer-b` escalated to sonnet per the "cross-module refactor" override rule — call sites span `src/app`, `src/features/game`, `src/modules/game-board`, `src/modules/cards`, `src/modules/lobby`, `src/modules/map`, and `src/components/ui`.

## Scope
- In: relocate `use-game-engine.ts`, `use-player.tsx`, `use-toast.ts`, `use-is-mobile.ts` into the `src/modules/<domain>/` of whichever module most owns each one (architect decides domain placement and the `use-toast.ts` split); repoint every call site listed above; delete `src/hooks/use-mobile.ts`; update `docs/README.md` if it documents these hooks' locations.
- Out: changing hook behavior, toast API shape, player/session logic, or `useIsMobile`'s breakpoint; migrating `GameBoard.tsx`, `PlayerInfoBar.tsx`, or `GameDialogManager.tsx` themselves (out of scope per prior rows' Decisions).

## Open questions
- None.
