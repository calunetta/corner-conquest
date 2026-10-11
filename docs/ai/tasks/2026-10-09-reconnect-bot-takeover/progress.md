# Progress: Replace a leaving player with a bot; restrict reconnect to their own match

Tier: L · Phases: 3

<!-- architect-a creates one block per phase. The coordinator ticks boxes as stage
     reports arrive; architect-b (final review) confirms them. The SessionStart hook
     lists every unticked box, so a new session knows where to resume. -->

## Phase 1: bot takeover on exit (in-progress matches only)
- [x] plan approved (architect-b)
- [x] implementation (implementer-a)
- [x] tests (tester-a)
- [x] checks: typecheck, lint, unit tests
- [x] final review (architect-b)
- [x] committed: 6cc1b05

## Phase 2: heartbeat and staleness detection
- [x] implementation (implementer-a)
- [x] tests (tester-a)
- [x] checks: typecheck, lint, unit tests
- [x] final review (architect-b)
- [x] committed: 1849e8d

## Phase 3: reconnect-and-reclaim
- [x] implementation (implementer-a, implementer-b)
- [x] tests (tester-a, tester-b)
- [x] previews (preview-a)
- [x] checks: typecheck, lint, unit tests
- [x] UI verified (ui-verify)
- [x] final review (architect-b)
- [x] committed: a6f87c5

## Log
<!-- One line per stage: YYYY-MM-DD agent: DONE | BLOCKER, short summary -->
2026-10-10 architect-a: DONE, plan.md revised — resolved Open Questions, reconciled identity model with persistent-account-auth's shipped Firebase-Auth-uid playerId, added heartbeat/staleness-check mechanism as its own Phase 2, split handlePlayerExit's scope to playing-status only, added deferred-reclaim-at-turn-boundary design. Status set to PLANNED.
2026-10-10 architect-b: CHANGES REQUESTED — writeHeartbeat's dotted-array-index updateDoc path is invalid Firestore syntax; lobby-restriction risk needed verifying against actual routing; CreateGameDialog needed gating against vacantMatch; anon-to-Google limitation needed explicit surfacing.
2026-10-10 architect-a: DONE, plan.md revised — writeHeartbeat now a runTransaction whole-array read-modify-write; confirmed no /game/[id] route exists (src/app/page.tsx uses root useState, not a URL param), Risk replaced with that fact; added CreateGameDialog gating to File plan and Phase 3 steps 4/6; added a "Known limitations" section surfacing the no-backend and no-anon-to-Google-linking limitations. Resubmitted for second architect-b pass.
2026-10-10 architect-b: APPROVED (round 2). plan.md Status set to APPROVED.
2026-10-10 user: confirmed both Known-limitations items (no-backend fallback, no anon-to-Google reclaim) acceptable to ship as-is.
2026-10-10 implementer-a: DONE, Phase 1 — Player gained isVacant/lastSeenAt/reclaimRequested; handlePlayerExit's playing-status branch now converts the exiting seat to a bot in place instead of splicing/deleting; waiting-status behavior unchanged. Typecheck broke in 4 unrelated fixture/test files needing the new fields — coordinator fixed directly (mechanical, not implementer-a's file plan).
2026-10-10 tester-a: DONE, rewrote player-exit.service.test.ts (59 tests, all passing) for the new playing-status contract.
2026-10-10 coordinator: checks — typecheck clean, eslint clean on all 8 changed files, npx jest src (excluding .claude/.agents) 2010/2010 passed (1 pre-existing unrelated failure, gameBoardTestKit.tsx, predates this task).
2026-10-10 docs-sync: DONE, updated docs/architecture/systems-and-visuals.md §6.9/§6.12 and docs/README.md's index row. Flagged stale unindexed src/docs/README.md (describes old pre-takeover behavior) — not touched, out of scope.
2026-10-10 architect-b: APPROVED (final review). Flagged two stray unrelated uncommitted files (e2e/e2e-cleanup.ts, Login.styles.ts) to exclude from the commit, and a leftover .claude/worktrees/inspiring-kare-ee7f7f duplicate checkout that breaks repo-root npm run lint/test (pre-existing, not from this task).
2026-10-10 coordinator: committed 6cc1b05, excluding the two stray files and all other tasks' pre-existing uncommitted changes.
2026-10-10 implementer-a: DONE, Phase 2 — writeHeartbeat (runTransaction whole-array read-modify-write), useHeartbeat (15s cadence), useStalenessCheck (20s tick, 45s threshold, broadcast), isSessionDriver replacing isHost in the bot-turn-trigger/death-animation-clearing effects only.
2026-10-10 tester-a: DONE, 13+17 new hook tests plus writeHeartbeat/session-driver cases; found and the fix was routed back to implementer-a: staleness hook's fire-and-forget handlePlayerExit call had no .catch (unhandled rejection) — fixed with an async wrapper + .catch.
2026-10-10 coordinator: checks — typecheck clean, eslint clean, npx jest src (excluding .claude/.agents) 2054/2054 passed (same pre-existing unrelated failure as Phase 1).
2026-10-10 docs-sync: DONE, added systems-and-visuals.md §6.14, updated §6.9/§6.12 cross-refs, docs/README.md index row, structure-and-state.md §2.
2026-10-10 architect-b: CHANGES REQUESTED — §6.14 was inserted physically before the pre-existing §6.13, confusing reading order. Coordinator fixed directly (pure relocation, no content change) and resubmitted.
2026-10-10 architect-b: APPROVED (round 2, final review).
2026-10-10 coordinator: committed 1849e8d, excluding the same stray files plus the unrelated new docs/ai/tasks/2026-10-10-link-google-account/ folder.
2026-10-11 implementer-a (sonnet) + implementer-b: DONE, Phase 3 — handleSeatReclaim (service, Promise<boolean>), applyDeferredReclaim in handleEndTurn, subscribeToVacantSeat, Lobby.hook.ts wiring, RejoinMatchPanel (view+styles+types+fixtures). Cross-review round 1 found and fixed two bugs: handleSeatReclaim originally swallowed errors so a failed reclaim still navigated the player in (now returns Promise<boolean>, errors propagate); isCreateDialogOpen wasn't reset when vacantMatch was set (now useEffect-reset). Also one style-boundary fix (raw Tailwind class moved to .styles.ts).
2026-10-11 tester-a: DONE, player-reclaim.service.test.ts (10) + handleEndTurn deferred-reclaim block (5) + Lobby.hook.test.ts fixes/additions (subscribeToVacantSeat mock, onReclaimSeat-false case).
2026-10-11 tester-b: DONE (retried once after a session rate-limit failure on the first attempt, not a reported blocker), RejoinMatchPanel.test.tsx (6), Lobby.test.tsx additions (4), new e2e/reconnect-bot-takeover.spec.ts (not run: no Java 21 locally, same documented limitation as prior phases). VERDICT APPROVED with non-blocking notes.
2026-10-11 preview-a: DONE, RejoinMatchPanel.preview.tsx (Default, Reclaiming/disabled), registered in testbed, self-verified via snapshot script.
2026-10-11 coordinator: added data-testid to the reclaim spinner (trivial a11y/testability fix, not worth a revise round).
2026-10-11 preview-b: DONE, VERDICT APPROVED. One non-blocking cosmetic nit (reclaim button stretched full-width at desktop) — coordinator fixed directly and re-verified in the browser pane at desktop and mobile.
2026-10-11 coordinator: checks — typecheck clean, npx jest src (excluding .claude/.agents) 2083/2083 passed (same pre-existing unrelated failure as Phases 1-2).
2026-10-11 docs-sync: DONE, extended systems-and-visuals.md §6.14 with Seat Reclaim / Deferred Reclaim / Lobby Restriction bullets, updated docs/README.md index row.
2026-10-11 architect-b: CHANGES REQUESTED (final review) — two blocking findings: (1) real bug, isMyTurn in game-board.engine.hook.ts had no isBot check, so reclaiming during your own seat's bot turn would route you into GameBoard with live controls rendering while the bot's turn effect could still independently fire, racing a non-transactional write; (2) docs-sync missed structure-and-state.md's Firestore-exceptions count and lobby component list for Phase 3's new files.
2026-10-11 implementer-a: DONE, fixed isMyTurn to also require !currentPlayer.isBot, added a regression test for the deferred-reclaim window.
2026-10-11 docs-sync: DONE, fixed both structure-and-state.md gaps.
2026-10-11 architect-b: APPROVED (round 2, final review). Task complete pending commit.
2026-10-11 coordinator: committed a6f87c5, excluding the same stray files, the unrelated link-google-account task folder, and a newly-noticed untracked github-actions-key.json (looks like a credential file — left untouched, flagged to the user, never staged).
