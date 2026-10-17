# Progress: Player avatar selection from built-in Human Avatars

Tier: L · Phases: 3

<!-- architect-a creates one block per phase. The coordinator ticks boxes as stage
     reports arrive; architect-b (final review) confirms them. The SessionStart hook
     lists every unticked box, so a new session knows where to resume. -->

## Phase 1: Catalog, Player field, persistence, Firestore rules
- [x] plan approved (architect-b)
- [x] implementation (implementer-a)
- [x] tests (tester-a)
- [x] checks: typecheck, lint, unit tests — typecheck clean, lint clean (0 warnings), `npx jest src/modules/avatars src/modules/game-rules src/modules/session src/modules/lobby`: Test Suites 77 passed, Tests 1110 passed
- [ ] checks: test:rules (Firestore emulator) — not run: "Unable to locate a Java Runtime" in this environment; rules reviewed by reading only. Must run before deploy (Java 21 machine).
- [x] final review (architect-b) — APPROVED, see review.md
- [x] committed: d22526f

## Phase 2: Lobby, HUD, victory rendering + header picker
- [x] implementation (implementer-a, implementer-b)
- [x] tests (tester-a, tester-b)
- [x] checks: typecheck, lint, unit tests — typecheck clean, lint clean (0 warnings), `npx jest src/modules/avatars src/modules/hud/components/PlayerInfo src/modules/session src/modules/lobby src/modules/game-rules`: Test Suites 83 passed, Tests 1252 passed
- [x] final review (architect-b) — APPROVED round 2, see review.md. Non-blocking: real session↔avatars import cycle (madge), recorded for a future cleanup
- [x] committed: 4649e7c

## Phase 3: Previews, docs, verification
- [ ] previews (preview-a)
- [ ] docs synced (docs-sync)
- [ ] checks: typecheck, lint, unit tests
- [ ] UI verified (ui-verify)
- [ ] final review (architect-b)
- [ ] committed: <hash>

## Log
<!-- One line per stage: YYYY-MM-DD agent: DONE | BLOCKER, short summary -->
- 2026-10-17 ui-designer-a: DONE, ui-design.md spec (header "Change Avatar" control; CreateGameDialog untouched)
- 2026-10-17 ui-designer-b: DONE, APPROVED, Final spec written (dropped CreateGameDialog preview; header icon `users`)
- 2026-10-17 architect-a: DONE, plan.md (DRAFT) + progress.md
- 2026-10-17 architect-b: DONE, plan APPROVED (Phase 1 File plan amended for player-avatar.hook.ts and player.provider.test.tsx)
- 2026-10-17 implementer-a (sonnet): DONE, Phase 1 logic, rules; typecheck clean after tests
- 2026-10-17 tester-a (sonnet): DONE, Phase 1 logic tests, TS2739 fixed in player.provider.test.tsx
- 2026-10-17 architect-b final-review: DONE, Phase 1 APPROVED (review.md); test:rules not run
