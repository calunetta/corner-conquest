# Triage: Cards dialogs icons through the registry (roadmap item 3)

Request: Replace the direct lucide-react glyphs in the cards dialogs with RegistryIcon, so overrides for those registry ids change them (roadmap item 3 in docs/ai/tasks/2026-10-17-icon-editor-testbed/plan.md). Same pattern as combat (docs/ai/tasks/2026-10-17-combat-icon-wiring).
Type: feature
Tier: M
Pipeline: architect-a architect-b implementer-b tester-b docs-sync architect-b:final-review
Overrides: none
Phases: 1

<!-- The Pipeline and Overrides lines are read by scripts/claude-swarm-runner.sh. Keep their format. -->

## Why this tier
- 7 files under src/modules/cards/components/ import lucide-react (grep-verified): CardsDialog, ProductiveCardDialog, SabotageDialog, AbilitiesDialog, StealResourceDialog/ResourceSelectionStep and PlayerSelectionStep, SpecialIslandRollDialog.
- Glyphs used: Sparkles, Zap, Shield, Play, TrendingUp, Check, Ban, CheckCircle, Award, ArrowLeft, HandMetal, Dices, XCircle.
- All 13 are already registered as kind 'lucide' entries (ids sparkles, zap, shield, play, trending-up, check, ban, check-circle, award, arrow-left, hand-metal, dices, x-circle). Verified in icon-registry.config.json. So no registry or glyph-map change is needed.
- Not gameplay: no rule reducer, no Firestore. Visible UI: default overrides are empty, so output is unchanged. No new preview state.

## Scope
- In: swap each lucide glyph in the 7 files for <RegistryIcon id="..." className="..." />, keeping each className. Remove the lucide-react imports that become unused. Run the cards test suite.
- Out: Image sprite artwork, the registry, the glyph map, other modules, and the non-icon lucide type import (CreateGameDialog.types.ts is lobby, not cards).

## Open questions
- none
