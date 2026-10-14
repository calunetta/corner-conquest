# Progress: In-game lobby-style background + toggle

Tier: M · Phases: 2

<!-- architect-a creates one block per phase. The coordinator ticks boxes as stage
     reports arrive; architect-b (final review) confirms them. The SessionStart hook
     lists every unticked box, so a new session knows where to resume. -->

## Phase 1: Shared preference + gradient constant
- [x] plan approved (architect-b)
- [x] implementation (implementer-a, implementer-b)
- [x] tests (tester-a, tester-b)
- [x] checks: typecheck, lint, unit tests
- [x] final review (architect-b)
- [x] committed: e9c10dc

## Phase 2: HUD toggle + legacy wiring
- [x] plan approved (architect-b)
- [x] implementation (implementer-a, implementer-b)
- [x] tests (tester-a, tester-b)
- [x] previews (preview-a, preview-b)
- [x] checks: typecheck, lint, unit tests
- [x] UI verified (ui-verify)
- [x] docs-sync (structure-and-state.md, systems-and-visuals.md)
- [x] final review (architect-b)
- [ ] committed: <hash>

## Log
<!-- One line per stage: YYYY-MM-DD agent: DONE | BLOCKER, short summary -->
2026-10-14 architect-a: DONE, wrote plan.md (2 phases) and this progress.md
2026-10-14 ui-designer-a/b: DONE, ui-design.md approved
2026-10-14 architect-a/b: DONE, plan.md APPROVED
2026-10-14 implementer-a/b: DONE, phase 1 shared store/hook + gradient constant, cross-reviewed APPROVED
2026-10-14 tester-a/b: DONE, phase 1 logic tests, one revise round, APPROVED
2026-10-14 architect-b (final-review): DONE, phase 1 APPROVED, no findings
2026-10-14 coordinator: committed phase 1 (e9c10dc)
2026-10-14 implementer-b: DONE, phase 2 build — dropped the `Switch`'s `Tooltip`/`TooltipTrigger`/`TooltipContent` wrapper from GameBoardHeader.tsx's markup contract (plan.md's original contract required it). Reason: Radix `TooltipTrigger`'s `data-state="closed"` overwrites the `Switch`'s own `data-state` (checked/unchecked), so the track rendered transparent in both states instead of its on/off color (found by preview-a via headless screenshot of both "Background on"/"Background off" testbed states). Chose dropping the Tooltip over a `span`-wrapper workaround: no acceptance criterion requires the hover/focus hint, and the `Switch`'s own `aria-label="Toggle sky background"` already satisfies the accessible-name criterion.
2026-10-14 architect-b (final-review): CHANGES REQUESTED — review.md finding #1: unflagged deviation from the architect-approved markup contract (plan.md), no note in this log. Finding #2 (ImageIcon vs. Image import) not blocking.
2026-10-14 architect-a (revise): DONE, amended plan.md's Contracts/markup section (and the phase 2 steps, model-escalation line, test plan, risks) to make the Tooltip removal the approved contract, with the Radix `data-state` conflict as the recorded reason; added this log entry per the coordinator's instruction. Re-review by architect-b pending.
2026-10-14 architect-b (final-review, re-review): APPROVED. Independently verified the Radix `data-state` conflict in `node_modules` (`@radix-ui/react-switch/dist/index.js:80-90` spreads `...switchProps` after its own `"data-state"` key, so a Tooltip-asChild-merged `data-state` silently overwrites the Switch's checked/unchecked attribute) — the amended contract's reasoning holds, not just asserted. Shipped `GameBoardHeader.tsx` matches the amended contract exactly (no Tooltip anywhere). `npm run typecheck` clean; lint clean on all touched files (0 warnings); `npx jest "^src/modules/hud/components/GameBoardHeader"` 52/52 passed, `npx jest "^src/modules/shared" "^src/features/game/components"` 105/105 passed (full/unanchored jest runs hit pre-existing `.claude/worktrees/*` duplicate-test noise, not this task's bug); ui-verify screenshots of testbed "Background on"/"Background off" at 1280x720 and 390x844, 0 console errors, mobile correctly hides the text label. docs-sync's two doc edits confirmed accurate. review.md updated to VERDICT: APPROVED.
