# Progress: Migrate GameBoardContext.tsx into src/modules

Tier: L · Phases: 3 (triage.md's original plan; see "Scope note" below for what actually shipped)

## Note on process
architect-a, architect-b and the implementer/tester pairs never ran: Agent-spawning tools (Agent,
SendMessage, ListAgents, TaskUpdate) became unavailable mid-session during the bot-balance-simulator
task and never recovered (see that task's progress.md). I (the coordinator) did this task directly.

## Scope note: narrowed from the original 3-phase plan
Given the real risk here — this is the highest-traffic file in the app, with ~10 legacy consumers,
and **no independent architect/tester review is available this session** — I chose not to attempt
the full extraction (reducer, types, *and* the ~440-line provider body's effects/handlers into a
`.hook.ts`) solo. The provider body has 15+ interdependent closures (`localGameState`, `localPlayer`,
`toast`, `onAction`, dispatch, …); splitting it correctly without a reviewer checking the dependency
arrays and closure captures is exactly the kind of change that looks right and breaks gameplay in a
way unit tests might not catch. What shipped instead is the safe subset of the original plan:

1. **Characterization tests** (as originally planned) — the real safety net, regardless of what
   else lands.
2. **Extract the pure reducer and all types/constants** into their own files. Zero behavioral risk:
   a pure function and type declarations, moved verbatim, re-exported from the original path so
   every one of the ~10 consumers (`GameBoard.tsx`, `GameDialogManager.tsx`, `ActionsPanel.tsx`,
   the panels and dialogs) needs no change and the existing `GameBoardContext.test.ts`'s import
   (`import { gameBoardReducer, GameBoardUIState } from '../GameBoardContext'`) keeps working
   unmodified.
3. **Not done this session**: extracting the provider's effects and handlers into `.hook.ts`. This
   is real, deferred work — not abandoned. See "Next steps" below.

## Phase 1: Characterization tests
- [x] `GameBoardContext.characterization.test.tsx`: 6 new tests (army selection, toggle-deselect,
  multi-army dialog, deselect-on-empty-tile-click, `onLocalAction local_DeselectArmy`, UI reset
  when `isMyTurn` flips false), alongside the pre-existing 4 reducer tests. 10/10 pass against
  today's unmodified `GameBoardContext.tsx`.
- [x] `npm run typecheck`, `npm run lint`: clean.

## Phase 2 (recalibrated): extract types and the pure reducer
- [x] `src/modules/game-board/game-board.types.ts`: `GameBoardUIState`, `GameBoardUIAction`,
  `initialUIState`, `GameBoardContextType`, `GameBoardProviderProps` — moved verbatim; the dialog
  state types (`PendingAction`, `ArmySelectionDialogState`, etc.) import from `@/lib/types/dialogs`
  directly rather than through the legacy `src/features/game/types.ts` re-export, since that's
  where they're actually defined and it avoids a `src/modules` → `@/features` boundary violation.
  The two `any` payload parameters stayed `any` (verbatim from the legacy interface) with a scoped
  `eslint-disable` and a comment pointing at this file — tightening them is separate, future work.
- [x] `src/modules/game-board/game-board.reducer.ts`: `gameBoardReducer`, moved verbatim (139
  lines, same switch statement, same cases, same logic — only the imports changed).
- [x] `src/modules/game-board/index.ts`: the module's public API.
- [x] `GameBoardContext.tsx` imports both and re-exports them under their original names. The file
  dropped from 699 to 473 lines; its ~10 consumers and `GameBoardContext.test.ts` needed zero
  changes.
- [x] All 10 characterization + reducer tests pass, unmodified (verified before and after).
- [x] `npm run typecheck`, `npm run lint`, `npm test` (33/33 suites, 173/173 tests), `npm run
  build` all pass after the extraction.
- [x] `docs/README.md` §2 and §3.3 updated to describe the new split.

## Phase 3: not attempted this session (unchanged from the plan)
Extracting the provider's effects/handlers into a `.hook.ts`. Left for a future session with the
swarm's usual architect-a/architect-b planning and review available. See "Next steps".

## Next steps for a future session
- Plan the `.hook.ts` extraction with architect-a/b: each closure's dependency array needs to be
  re-derived, not copy-pasted, since moving code across files changes what's in scope.
- Before attempting it, add characterization tests for the remaining `handleLocalAction` branches
  this session didn't cover (`local_Attack`'s single-vs-multi-target split, `local_Position`,
  `local_UseCard`'s multi-step cards, the Escape-key handler, `handleStartGame`,
  `handleExitClick`/`handleConfirmExit`/`handleConfirmHostLeave`) — this session's 6 tests cover
  the highest-traffic path (army selection) but not the whole surface.
- Keep the re-export at `@/features/game/context/GameBoardContext` for as long as any legacy file
  imports from it; only delete it once every consumer is migrated, per `component-architecture`'s
  migration steps.

## Log
- 2026-10-02 coordinator (as tester-a): wrote and verified characterization tests against the
  current, unmodified file.
