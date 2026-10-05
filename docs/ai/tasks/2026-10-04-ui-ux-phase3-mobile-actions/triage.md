# Triage: Mobile actions-panel reachability

Request: implement the approved spec in this folder's ui-design.md ("Final spec" section) — a mobile-only sticky bottom action bar for ActionsPanel's primary actions (Attack/Deploy/Position/End Turn/Cancel/Deselect/extra-move banner), plus a Sheet for secondary actions (Upgrade/Buy Card/Cards/Abilities). Desktop unchanged.
Type: component
Tier: M
Pipeline: architect-a architect-b implementer-a implementer-b tester-a tester-b preview-a preview-b architect-b:final-review
Overrides: none
Phases: 1

## Why this tier
- New visible UI, mobile-only interaction redesign of an existing component (`ActionsPanel`) plus layout wiring in `GameBoard.tsx` — the `ui-design` spec stage already ran (ui-designer-a → ui-designer-b, independently reviewed, VERDICT: APPROVED) per the tier-M rule.
- Scope is confined to `src/modules/hud/components/ActionsPanel/*`, `src/features/game/components/GameBoard.tsx`, and reuse of the existing `src/components/ui/sheet.tsx` primitive — no new module, no `GameState`/Firestore shape change, no `game-rules` reducer touched. This keeps it at M rather than L despite being a real interaction change.
- New component states (sticky bar visibility, Sheet open/closed) need preview coverage — `preview-a`/`preview-b` stay in the pipeline.
- No Firestore writes, timers, or concurrency touched → no builder escalated to sonnet.

## Scope
- In: everything in the Final spec — sticky bottom bar (primary actions), Sheet (secondary actions), the corrected touch-target sizing, the `prefers-reduced-motion` override on this feature's own Sheet instance, and the visible static disabled-reason caption replacing the unreachable hover tooltip on mobile.
- Out: desktop layout (explicitly unchanged per spec), `GameLog` (separate Phase 4 task), any `game-rules` change.

## Open questions
- None.
