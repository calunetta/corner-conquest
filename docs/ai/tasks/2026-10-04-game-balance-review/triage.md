# Triage: Game balance and fun review

Request: review Corner Conquest's current game logic and balance as implemented in the code, and propose concrete rule changes with numbers.
Type: gameplay (design review) + implementation (3 logic fixes, 3 UI polish items)
Tier: L (re-triaged, was S)
Pipeline: game-designer-a, game-designer-b (done) → architect-a/b (plan) → implementer-a/b, tester-a/b, preview-a, ui-designer-b (build) → architect-b (final review)
Overrides: none
Phases: 6 (see `plan.md`)

## Why this tier (re-triaged 2026-10-04 by architect-a)
Originally S: a single design-review deliverable, no code. That deliverable shipped
(`game-design.md`'s Final spec, APPROVED by game-designer-b) and the invoking agent additionally
requested a UI proposal pass (`ui-design.md`, game-designer-a/ui-designer-a only, no challenger).
Turning both into an implementation plan touches:
- 3 approved logic fixes across 6 `src/modules/game-rules/*.reducer.ts` files plus `card-data.ts`,
  each with new/updated tests (Problem 3 alone touches 4 reducer files to close an exploit,
  per game-designer-b's Finding 3), plus a `docs/README.md` update — this alone is already
  2 phases and >6 files.
- 3 of the 5 UI proposals judged "ready" (the other 2 are explicitly out of scope — see `plan.md`
  Decisions), each a full component touch (view, styles, types/map, tests, preview) — 3 more phases.
- One required-but-not-yet-run stage: `ui-design.md` has no ui-designer-b challenger pass. `plan.md`
  schedules it as step 1 of the first UI phase rather than adding a 7th phase.
Total: 6 phases, more than one sitting, well past the "about 6 files" single-phase threshold.
**Tier changed from S to L.** See `plan.md` for the full phase breakdown and file-by-file ownership.

## Scope
- In (shipped): `game-design.md`'s design review and Final spec (3 rule-balance problems with
  evidence, options, and an approved exact spec). `ui-design.md`'s 5-proposal UI audit (proposal
  only, no challenger review).
- In (this re-triage adds): implementation of game-design.md's Final spec (deck wiring, War Chief
  rebalance, persistent positioning + exploit fix) and of ui-design.md's Proposals 1, 3, 5
  (GameBoardHeader resource strip, ActionsPanel ring emphasis, LobbyGameRow VP badge), per `plan.md`.
- Out: ui-design.md's Proposal 2 (CreateGameDialog mode cards — never read this session, needs its
  own XS verification triage first, per the proposal's own recommendation) and Proposal 4 (GameLog
  color — already tracked as finding 7 in `docs/ai/tasks/2026-10-04-ui-ux-review/`, sized Medium,
  not this task's work). Running the balance simulator for a fresh data pull (still no code changed
  by this review session; `plan.md` recommends it as a post-Phase-2 playtest signal, not part of
  this task's deliverables).

## Open questions
None — architect-b resolves any plan-level findings during plan review.
