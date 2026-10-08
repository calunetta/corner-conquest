# Progress: Game balance fixes + 3 ready HUD/lobby polish items

Tier: L (re-triaged from S — see `triage.md`) · Phases: 6

<!-- architect-a creates one block per phase. The coordinator ticks boxes as stage
     reports arrive; architect-b (final review) confirms them. The SessionStart hook
     lists every unticked box, so a new session knows where to resume. -->

## Phase 1: Deck wiring + War Chief rebalance (Problems 1 and 2, logic only)
- [x] plan approved (architect-b)
- [x] implementation (implementer-a)
- [x] tests (tester-a)
- [x] checks: typecheck, lint, unit tests
- [x] final review (architect-b)
- [x] committed: e2a0754

## Phase 2: Persistent positioning (Problem 3, atomic)
- [x] plan approved (architect-b)
- [x] implementation (implementer-a)
- [x] tests (tester-a)
- [x] checks: typecheck, lint, unit tests
- [x] final review (architect-b)
- [x] committed: 2004861

## Phase 3: Docs update
- [x] plan approved (architect-b)
- [x] implementation (implementer-a)
- [x] checks: typecheck, lint
- [x] final review (architect-b)
- [x] committed: 302c2e6

## Phase 4: ui-designer-b challenger pass + GameBoardHeader resource strip (Proposal 1)
- [x] plan approved (architect-b)
- [x] ui-designer-b challenger pass (Final spec appended to ui-design.md)
- [x] implementation (implementer-a, implementer-b)
- [x] tests (tester-a, tester-b)
- [x] previews (preview-a)
- [x] checks: typecheck, lint, unit tests
- [x] UI verified (ui-verify)
- [x] final review (architect-b)
- [ ] committed: <hash>

## Phase 5: ActionsPanel contextual ring emphasis (Proposal 3)
- [x] plan approved (architect-b)
- [ ] implementation (implementer-b)
- [ ] tests (tester-b)
- [ ] previews (preview-a)
- [ ] checks: typecheck, lint, unit tests
- [ ] UI verified (ui-verify)
- [ ] final review (architect-b)
- [ ] committed: <hash>

## Phase 6: LobbyGameRow VP Goal badge (Proposal 5)
- [x] plan approved (architect-b)
- [ ] implementation (implementer-b)
- [ ] tests (tester-b)
- [ ] previews (preview-a)
- [ ] checks: typecheck, lint, unit tests
- [ ] UI verified (ui-verify)
- [ ] final review (architect-b)
- [ ] committed: <hash>

## Log
<!-- One line per stage: YYYY-MM-DD agent: DONE | BLOCKER, short summary -->
2026-10-04 architect-a: DONE, wrote plan.md (tier S→L re-triage) and this progress.md from the approved game-design.md Final spec and the unreviewed ui-design.md proposal.
2026-10-04 architect-b: DONE, APPROVED plan.md after verifying every cited path/symbol, confirming the card-effects.reducer.ts duplication finding, resolving the combat-monster-resolve.reducer.ts reachability question (unreachable), and resolving the ResourceStatViewModel export gap (export from PlayerInfo/index.ts). Ticked "plan approved" for all 6 phases.
2026-10-04 implementer-a/tester-a (Phase 1): DONE, wired SPECIAL_CARDS into the deck build and rebalanced War Chief to a flat +2 combat score. architect-b's first pass found a regression (defaultGameSettings.availableCards wrongly switched to the raw SPECIAL_CARDS list, duplicate lobby badges); implementer-a fixed it in revise mode, architect-b re-reviewed and APPROVED.
2026-10-05 implementer-a/tester-a (Phase 2, sonnet): DONE, made resource positioning persist across turns and closed the attacker-loss position leak in combat-player-resolve.reducer.ts (plus the matching card-effects.reducer.ts duplication architect-a flagged). architect-b APPROVED. Note: two concurrent architect-b final-review agents wrote to the same review.md and the second overwrote the first's content; recovered by re-running both reviews with explicit per-phase headings — no code or test content was lost, only a review.md write collision.
2026-10-05 coordinator: DONE, committed Phase 1 (e2a0754) and Phase 2 (2004861) separately, scoping git add to each phase's files.
2026-10-09 implementer-a (Phase 3): DONE, updated docs/README.md §5.3/§6.3/§6.5 to match Phases 1-2 (collecting persists, War Chief is a flat +2 to combat score). Flagged out-of-scope drift: two in-app combat-dialog strings still say "+2 Attack Dice", TutorialBeacon copy omits the removal-rule clause.
2026-10-09 architect-b (final-review): DONE, APPROVED. Independently verified every cited reducer line and found one more drift (docs/balance-simulator-guide.md still describes the pre-fix deck-composition bug) — recommends a follow-up task for that plus the two stale UI strings.
2026-10-09 coordinator: DONE, committed Phase 3 (302c2e6). Caught and fixed a review.md overwrite — architect-b's Phase 3 review replaced Phase 1/2's content instead of appending (same failure mode logged 2026-10-05); restored from git history (ee13424) and merged all three phases into one file before amending the commit.
