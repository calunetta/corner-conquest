# Progress: Resource collection feedback + farmer-boat reset

Tier: M · Phases: 1

<!-- architect-a creates one block per phase. The coordinator ticks boxes as stage
     reports arrive; architect-b (final review) confirms them. The SessionStart hook
     lists every unticked box, so a new session knows where to resume. -->

## Phase 1: Clear-on-collect, feedback toasts, bot fix, boat fix, docs
- [x] plan approved (architect-b)
- [x] implementation (implementer-a, implementer-b)
- [x] tests (tester-a, tester-b)
- [x] previews (preview-a, preview-b)
- [x] checks: typecheck, lint, unit tests
- [x] UI verified (ui-verify + live browser playthrough: both toasts fired with exact copy, log shows "MobileCheck automatically collected 1 gold", position clears and re-enables Position)
- [x] balance-simulator gate run and compared to baseline (Final spec item 10)
- [x] docs-sync: game-mechanics.md §5.3, §6.3, special-cards.md §6.6, systems-and-visuals.md updated
- [x] final review (architect-b)
- [x] committed: 594fe9f (+ cb7974e follow-up: lobby tutorial copy, a third stale-copy site missed by the swarm)

## Log
<!-- One line per stage: YYYY-MM-DD agent: DONE | BLOCKER, short summary -->
- 2026-10-11 game-designer-a/b: DONE, clear-on-collect final spec; found bots use SelectResourcePosition at priority 9 (triage was wrong), corrected bot priority to 6 (not 5, fog-priority collision)
- 2026-10-11 ui-designer-a/b: DONE, two toasts + tutorial copy spec approved
- 2026-10-11 architect-a/b: DONE, plan.md approved; included TileBoats.map.ts armyId-keyed fix in-phase
- 2026-10-11 implementer-a/b: DONE after one revise round (idle-farm toast copy mismatch, comment nit); two extra files (resource-collection.ts, turn-start-passives.reducer.ts) added to stay under ESLint max-lines
- 2026-10-11 tester-a/b: DONE, 199 tests passing; fixed a 5th incidental test (TileBoats.test.tsx fixture)
- 2026-10-11 preview-a/b: DONE, TutorialBeacon preview registered and verified in testbed
- 2026-10-12 docs-sync: DONE, game-mechanics.md §5.3/§6.3, special-cards.md §6.6, systems-and-visuals.md
- 2026-10-12 architect-b (final-review): CHANGES REQUESTED on commit scoping only (docs files had unrelated bleed from other in-progress tasks sharing the dirty worktree) — resolved by the coordinator staging only this task's hunks via a scratch-swap instead of `git add` on the whole file
- 2026-10-12 coordinator: balance-simulator gate (50 games/config, players 2-4, fog on/off, seed 1) run comparing baseline (b2a4ba1) vs after (594fe9f): PASS per the gate's own criteria (no M6/M7 collection collapse — event rate roughly doubled, not dropped; no new M10 bot-health flag of the "broken" kind; M3 win-rate skew flipped which config shows it but not systematically worse). New non-blocking signal for game design: bots now position on their own Base tile much more often (56.0%-86.2% of spots vs. 4.2%-38.6% baseline) since the position decision re-runs every turn instead of once, and median match length rose in every config — recorded in docs/ai/lessons-learned.md ("Balance / bot simulation"). Reports: balance-reports-after/report.md, report.json (not committed — regenerable, matches other balance-gate runs in this repo's convention)
- 2026-10-12 coordinator: live browser playthrough (solo-vs-bot match) confirmed both toasts and the log/position-clear behavior; found and fixed a third stale copy site (src/modules/lobby/components/Lobby/Lobby.tsx:86) the swarm had missed
