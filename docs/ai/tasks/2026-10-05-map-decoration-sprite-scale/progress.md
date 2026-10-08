# Progress: Map decoration sprite scale (boats, riders, trees)

Tier: M · Phases: 1

<!-- architect-a creates one block per phase. The coordinator ticks boxes as stage
     reports arrive; architect-b (final review) confirms them. The SessionStart hook
     lists every unticked box, so a new session knows where to resume. -->

## Phase 1: Corner sharing, percentage sizing, fill images
- [x] plan approved (architect-b)
- [x] implementation (implementer-a, implementer-b)
- [x] tests (tester-a, tester-b)
- [x] previews (preview-a, preview-b)
- [x] checks: typecheck, lint, unit tests
- [x] UI verified (ui-verify)
- [x] final review (architect-b)
- [x] committed: 4a18236

## Log
<!-- One line per stage: YYYY-MM-DD agent: DONE | BLOCKER, short summary -->
2026-10-08 ui-designer-a/b: DONE, found the actual root cause (BOAT_CORNER_POSITIONS vs TileOccupants' corner array independently ordered, landing boat and rider on opposite corners) and specced a shared corner source plus percent-of-tile sizing. ui-designer-b folded in a fix: the collector accessory also renders in the occupied-idle state, not just zero-occupant, making it a three-element composition.
2026-10-08 architect-a/b: DONE, plan approved; mid-build a geometry contradiction surfaced (collector couldn't be both fully inside the hull and clear of the rider at the originally specified size) and was resolved by both architects independently re-deriving the corner-centering math by hand (collector resized to 14% of the hull box, flush at the inner corner).
2026-10-08 implementer-a/b, tester-a/b: DONE, corner-sharing and percent sizing implemented and tested; mobile collector legibility (~2.7px at the smallest tile) escalated to ui-designer-a, who decided to hide the collector below 768px via useIsMobile() conditional rendering (not CSS, since the DOM-absence acceptance criterion can't be satisfied by a visibility class).
2026-10-09 preview-a/b: DONE (3 rounds), fixed preview wrapper/clipping defects and viewport-driven collector visibility; also caught a real regression mid-stage where TileBoats.tsx had reverted to the superseded CSS-only approach (root cause: ui-design.md's Addendum text was never corrected after the hook-based override, so a stale doc read likely caused the revert) — restored and re-verified, doc corrected to mark CSS as explicitly superseded.
2026-10-09 architect-b (final-review): DONE (2 rounds), found zero test coverage for the actual DOM-absence regression case and a stale comment in TileBoats.test.tsx that could cause a repeat of the incident; tester-b added a real regression test against the connected TileBoats component. APPROVED.
