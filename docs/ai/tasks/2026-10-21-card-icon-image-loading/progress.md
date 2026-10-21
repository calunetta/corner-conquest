# Progress: Faster card and icon image loading

Tier: M · Phases: 1

<!-- architect-a creates one block per phase. The coordinator ticks boxes as stage
     reports arrive; architect-b (final review) confirms them. The SessionStart hook
     lists every unticked box, so a new session knows where to resume. -->

## Phase 1: WebP assets and gated card play
- [x] plan approved (architect-b)
- [x] implementation (implementer-a, implementer-b)
- [x] tests (tester-a, tester-b)
- [x] previews (preview-a, preview-b)
- [x] checks: typecheck, lint, unit tests
- [x] UI verified (ui-verify)
- [x] final review (architect-b)
- [ ] committed: <hash>

## Log
<!-- One line per stage: YYYY-MM-DD agent: DONE | BLOCKER, short summary -->
- 2026-10-21: repro test failed first (play started before preload); 82 PNG -> WebP q90 (cards 6.6 MB -> 1.0 MB, icons 1.1 MB -> 408 KB); preview-b cold-cache + throttled runs: card img complete at stage appearance, one fetch per card, no /_next/image; final review CHANGES REQUESTED (missing CardFace/GameLog tests, stale docstring) -> fixed -> APPROVED; jest worker SIGSEGV in untouched suites seen with the dev server running, 3 clean runs after: 311 suites / 4371 tests; typecheck, lint pass.
