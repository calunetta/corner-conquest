# Progress: Host never sees the bot playing a departed guest's seat

Tier: M · Phases: 2

<!-- architect-a creates one block per phase. The coordinator ticks boxes as stage
     reports arrive; architect-b (final review) confirms them. The SessionStart hook
     lists every unticked box, so a new session knows where to resume. -->

## Phase 1: Root-cause and fix (convertSeatToBot skipping the bot's own turn)
- [x] plan approved (architect-b)
- [x] failing reproduction test (tester-a)
- [x] implementation (implementer-a; implementer-b had no files on this plan)
- [x] tests (tester-a rewrote stale tests)
- [x] checks: typecheck, lint, unit tests all pass (tester-a). Real `test:e2e` run (tester-b): the
      "Guest's Turn" assertion this phase targets now passes - the run gets further and fails on a
      separate, later bug (Phase 2), not on anything this phase touches.
- [x] docs updated (docs-sync: systems-and-visuals.md §6.12 corrected)
- [x] final review (architect-b): APPROVED, see `review.md`
- [ ] committed: <hash>

## Phase 2: Host doesn't see a reclaimed seat flip from bot back to human
- [ ] plan approved (architect-b)
- [ ] failing reproduction test (tester-a)
- [ ] implementation (implementer-a, implementer-b)
- [ ] tests (tester-b)
- [ ] checks: typecheck, lint, unit tests, one real `test:e2e` run of `e2e/reconnect-bot-takeover.spec.ts` (full pass)
- [ ] docs updated (docs-sync, if needed)
- [ ] final review (architect-b)
- [ ] committed: <hash>

## Log
<!-- One line per stage: YYYY-MM-DD agent: DONE | BLOCKER, short summary -->
2026-10-13 tester-b: BLOCKER on Phase 1's full e2e pass - found a new, separate bug (Phase 2): after the guest reclaims their seat during the host's turn, the host's client keeps showing BOT for 15s+ although the Firestore document is already correct (isBot: false). Also hit an unrelated build-blocking lint error (two uncommitted files over max-lines from other concurrent work) - fixed directly by the coordinator (commit 1942a16) since it blocked e2e for everyone, not specific to this task.
