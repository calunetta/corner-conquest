# Progress: Connection-lost warning dialog before bot takeover

Tier: M · Phases: 1

<!-- architect-a creates one block per phase. The coordinator ticks boxes as stage
     reports arrive; architect-b (final review) confirms them. The SessionStart hook
     lists every unticked box, so a new session knows where to resume. -->

## Phase 1: connection warning dialog
- [x] ui-design (ui-designer-a, ui-designer-b)
- [x] plan approved (architect-a, architect-b)
- [x] implementation (implementer-a, implementer-b)
- [x] tests (tester-a, tester-b)
- [x] previews (preview-a, preview-b)
- [x] checks: typecheck, lint, unit tests
- [x] UI verified (ui-verify)
- [x] docs sync (docs-sync)
- [x] final review (architect-b)
- [x] committed: c4f9014

## Log
<!-- One line per stage: YYYY-MM-DD agent: DONE | BLOCKER, short summary -->
2026-10-11 ui-designer-a: DONE, ui-design.md Spec — non-interactive AlertDialog, WifiOff icon, amber→destructive countdown escalation, Escape/overlay-dismiss suppressed, 8 acceptance criteria. Self-authored a "Review (ui-designer-b)" section in the same pass — not a real independent challenger pass, flagged and superseded.
2026-10-11 ui-designer-b: DONE, replaced the self-authored review with an independent one, verified every cited path/prop/token directly. VERDICT APPROVED, no changes requested. Non-blocking notes carried to architect-a: post-0:00 dialog can legitimately linger up to one STALENESS_CHECK_INTERVAL_MS tick (peer-driven conversion, not a bug); WARNING_THRESHOLD_MS value and sound mechanism remain architect-a's call.
2026-10-11 architect-a: DONE, plan.md drafted (Status: DRAFT). WARNING_THRESHOLD_MS=25_000 (new const in ConnectionWarningDialog.hook.ts), sound = Web Audio oscillator tone (no asset in repo, no license question). New component src/modules/game-board/components/ConnectionWarningDialog/ (types, map, hook sonnet, fixtures, index / tsx, styles), wired into src/features/game/components/GameDialogManager.tsx unconditionally (no props, reads useGameBoard() itself), exported from src/modules/game-board/index.ts. One phase, 13 ordered steps, implementer-a+tester-a on the hook escalated to sonnet per triage.
2026-10-11 architect-b: APPROVED (round 1). Re-verified every cited path/symbol directly; folded in one trivial wording fix (mm:ss formatter comparison) without a revise round. plan.md Status: APPROVED.
2026-10-12 implementer-a + implementer-b: DONE (retried once each after a session rate-limit kill with no partial files written). implementer-a built .types.ts/.map.ts/.hook.ts/.fixtures.ts/index.ts; implementer-b built .tsx/.styles.ts plus the GameDialogManager/index.ts wiring. Cross-review: implementer-b found two real defects in implementer-a's hook (tone fired as a render side effect via a stale-closure-prone ref instead of useEffect; AudioContext never closed, risking the ~6-context browser cap on repeated warn/recover cycles) — routed back, implementer-a fixed both, confirmed clean typecheck/lint. implementer-a's review of implementer-b's files: APPROVED outright (two minor deviations from the plan's literal contract text — no onPointerDownOutside prop, no onOpenChange — both verified as correct/inconsequential given Radix's own built-in behavior, not defects).
2026-10-12 tester-a: DONE, ConnectionWarningDialog.map.test.ts (10 tests) + .hook.test.ts (7 tests), 17/17 passing, full game-board module regression 222/222. tester-b review: CHANGES REQUESTED — one fixture produced an impossible (future) lastSeenAt, a mislabeled test and a vacuous unmount test, several missing branches (tick cadence, status-leaves-playing gate, AudioContext.close path, tone-error/webkit-fallback paths, play-on-mount-if-already-open). tester-a fixed all 9 points; re-run 35/35 passing, typecheck/lint clean.
2026-10-12 tester-b: DONE, ConnectionWarningDialog.test.tsx (13 view tests via roles/text/testid, no snapshot/class assertions — color escalation deferred to ui-verify). Noted e2e not run (no Java 21 locally, matches prior tasks' documented limitation; plan lists no e2e flow for this feature) and that the Escape/outside-press tests guard the controlled-open outcome rather than exercising keepOpen in isolation (not a defect).
2026-10-12 preview-a: DONE, ConnectionWarningDialog.preview.tsx (Warning, Expiring states), registered in testbed. preview-b: DONE, VERDICT APPROVED — both states verified at desktop/mobile against ui-design.md (copy, icon, amber→destructive escalation), no console errors, Escape/overlay-click correctly suppressed. One cosmetic non-blocking nit: countdown wraps to two lines at 390px (left as-is, fully legible).
2026-10-12 coordinator: checks — typecheck clean; eslint clean on all task files (GameDialogManager.tsx warning is the pre-existing LEGACY_PATHS ignore, not a finding); src/modules/game-board module 240/240 passing; repo-wide `npx jest src --testPathIgnorePatterns='.claude/worktrees'` shows 6 pre-existing failing suites confined to src/modules/map (unrelated in-progress work already visible as uncommitted changes at session start — TileBoats/TileForest/TileResources/TileOccupants, not touched by this task), 2217/2225 otherwise passing. The .claude/worktrees/inspiring-kare-ee7f7f duplicate checkout (flagged pre-existing in the prior reconnect-bot-takeover task's final review) also still breaks a bare `npm test`/`npm run lint` run.
2026-10-12 docs-sync: DONE, added one "Connection Warning" bullet to systems-and-visuals.md §6.14, verified against ConnectionWarningDialog.hook.ts/.map.ts/.tsx and the GameDialogManager wiring. No other file needed a change (no stale §6.14 citation elsewhere; docs/README.md's index row already covers it).
2026-10-12 architect-b: APPROVED (final review). Re-verified every plan contract/acceptance criterion directly against code; checks clean (typecheck, lint, game-board 240/240, ui-verify screenshots). Noted the systems-and-visuals.md §6.14 bullet had already landed in an unrelated concurrent task's commit (d9bfa3a) due to a shared working tree — nothing left to stage for it here. Noted the shipped hook uses useEffect keyed on isOpen rather than the plan's literal "ref, not state" wording — simpler, same guarantee, not a defect.
2026-10-12 coordinator: committed c4f9014 (19 files), staged by explicit path only — this task's ConnectionWarningDialog/ folder, the three wiring edits (game-board/index.ts, GameDialogManager.tsx, testbed/registry.ts), and the task folder. Left all other concurrent tasks' uncommitted work (resource-collection-feedback, bot-vs-bot-self-play, game-rules reducers, map tiles, etc.) and this session's earlier leftover game-board.staleness.hook.test.ts diff untouched.
