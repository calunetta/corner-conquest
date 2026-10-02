# Triage: Migrate GameBoardContext.tsx into src/modules

Request: GameBoardContext.tsx (699 lines) is the first legacy component worth migrating into the new src/modules structure.
Type: refactor
Tier: L
Pipeline: architect-a architect-b implementer-a implementer-b tester-a tester-b architect-b:final-review
Overrides: implementer-a=sonnet, implementer-b=sonnet, tester-a=sonnet
Phases: 3

## Why this tier
- Highest-risk file in the app: central reducer + context driving every player action, 12+ dialog states, timers, and the bridge between local UI state and shared `GameState`. A regression here breaks the whole game. Escalated to sonnet per the triage skill's risk signal (game-rule-adjacent state, concurrency between local/shared state).
- Touches one legacy file consumed by ~10 other legacy components (`GameBoard.tsx`, `GameDialogManager.tsx`, `ActionsPanel.tsx`, `PlayerInfoBar.tsx`, panels, dialogs) — a straight rewrite-in-place is too large for one phase.
- No gameplay or visible UI change (pure refactor: same behavior, new file layout), so no designers and no preview stage. UI only changes if a bug surfaces, which is out of scope.

## Scope
- In: split `GameBoardContext.tsx` into `src/modules/game-board/` following component-architecture: `.types.ts` (UI state & action types, already partly separated), `.reducer.ts` (pure `gameBoardReducer`, currently inline), `.hook.ts` (the effects currently inside `GameBoardProvider`: turn timer wiring, action dispatch, tile click handling), and a thin `GameBoardProvider` + `useGameBoard()` that keep their current import path (`@/features/game/context/GameBoardContext`) as a re-export, so none of the ~10 consumers change. Characterization tests first (tester-a, before any split), then the split, verified against them.
- Out: changing any behavior, prop, or the public `useGameBoard()` shape; migrating the consumers themselves (`GameBoard.tsx` etc. stay in `src/features` and keep importing from the same path); changing dialog components.

## Open questions
None — recommended approach: keep `@/features/game/context/GameBoardContext.tsx` as a thin re-export of the new module so this is a pure internal refactor with zero risk to the ~10 files that import it today.

## Phases
1. Characterization tests for `useGameBoard()` / `gameBoardReducer` behavior (tester-a), against the current file, all passing — this is the safety net.
2. Extract `.types.ts` and pure `.reducer.ts` into `src/modules/game-board/`; `GameBoardContext.tsx` imports the reducer instead of defining it inline; characterization tests still pass unmodified.
3. Extract the effects/handlers into `.hook.ts` and `.service.ts` (none needed — no direct Firestore access here, that's in `useGameEngine`); `GameBoardContext.tsx` becomes a thin re-export; characterization tests still pass unmodified; update `docs/README.md` §2 and §3.
