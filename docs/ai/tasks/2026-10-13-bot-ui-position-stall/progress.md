# Progress: bot-vs-bot-ui.spec.ts stalls on the Position action button

Tier: M · Phases: 1

<!-- architect-a creates one block per phase. The coordinator ticks boxes as stage
     reports arrive; architect-b (final review) confirms them. The SessionStart hook
     lists every unticked box, so a new session knows where to resume. -->

## Phase 1: Root-cause and fix
- [x] plan approved (architect-b)
- [x] failing reproduction test (tester-a)
- [x] implementation (implementer-a; implementer-b had no files on this plan)
- [ ] tests (tester-b)
- [ ] checks: typecheck, lint, unit tests, one real `test:e2e` run of `e2e/bot-vs-bot-ui.spec.ts` (full pass)
- [ ] docs updated (docs-sync, if needed)
- [ ] final review (architect-b)
- [ ] committed: <hash>

## Log
<!-- One line per stage: YYYY-MM-DD agent: DONE | BLOCKER, short summary -->
2026-10-13 tester-b: BLOCKER - the possibleMoves-staleness fix (implementer-a) does not clear the real e2e stall. `npm run test:e2e -- e2e/bot-vs-bot-ui.spec.ts` still times out at 10.1m on action-button-local:position staying disabled. Root cause unconfirmed; needs a fresh trace against the actual failing run, not a repeat of the same hypothesis.
2026-10-13 coordinator: Added a new testbed tool to check this without Java/the Firestore emulator — `src/features/game/components/GameBoardSandbox.{tsx,fixtures.ts,preview.tsx}`, registered as `/testbed/game-board-position-race-sandbox`. It runs the real interactive `GameBoard` UI (via a newly-exported `GameBoardContent`, `GameBoard.tsx`) against a local-only `GameState` built from the real `initializeGame`/`startGame` reducers, with a second army placed two tiles (inside `MOVE_RADIUS`) from the first — the exact setup the plan's root-cause section describes. (Needed one unrelated fix along the way: the shared `PreviewStage` canvas is `max-w-5xl`, but `GameBoard`'s 3-column layout switches at Tailwind's `lg:` *viewport* breakpoint regardless, which overlapped the columns and silently ate all clicks; fixed by wrapping this preview's own state in a `min-w-[1400px]` div, not by changing the shared `PreviewStage` — the canvas already scrolls horizontally.)
2026-10-13 coordinator: Used the sandbox to replay the exact race by hand — selected army 0, positioned it on Gold, then clicked army 1's tile with zero delay (two `browser_batch` clicks, tighter than Playwright can produce). It did **not** reproduce: `[DEBUG tileClick]` showed `possibleMoves: []` already at click time (the `useMemo` fix closed the window correctly), army 1 selected cleanly, `canPosition: true`. So the implemented fix is correct for the exact race the plan's root-cause section describes — but that means it is **not** what's still stalling the real `bot-vs-bot-ui.spec.ts` run. The real stall has a different or additional cause (more players, real Firestore round-trips between two browser contexts, or something else the 2-army/1-player sandbox doesn't exercise) that still needs a fresh trace against the actual failing e2e run, per tester-b's note above. BLOCKER stands; narrowed, not resolved.
