# Triage: HUD icons through the registry (roadmap item 4)

Request: Replace the direct lucide-react glyphs in the HUD module with RegistryIcon, so overrides for those registry ids change them (roadmap item 4 in docs/ai/tasks/2026-10-17-icon-editor-testbed/plan.md). Same pattern as combat and cards.
Type: feature
Tier: L
Pipeline: architect-a architect-b implementer-b tester-b docs-sync architect-b:final-review
Overrides: none
Phases: 2

<!-- The Pipeline and Overrides lines are read by scripts/claude-swarm-runner.sh. Keep their format. -->

## Why this tier
- 11 files under src/modules/hud/components/ import lucide-react (grep-verified; list in the plan).
- Glyphs used: Trophy, Album, Zap, Forward, Ban, Compass, ShieldCheck, Sparkles, Hammer, Timer, Hourglass, XCircle, Shield, ShoppingCart, University, ChevronUp, ScrollText, ArrowLeft, Play, Loader2, ImageIcon, Clock, Coins, Info, Layers, Swords, X.
- All of these are already registered as kind 'lucide' entries (verified against the registry's name list). No registry or glyph-map change is needed.
- More than about 6 files, so two phases:
  - Phase 1: PlayerInfo, PlayerInfoStats, BuffIcons, GameStatusBadge, GameBoardHeader.
  - Phase 2: ActionsPanel (ActionsPanel, MobileActionsBar, ActionButton), MobileSheetTriggers, GameLog, TutorialBeacon.
- Not gameplay: no rule reducer, no Firestore. Visible UI: default overrides are empty, so output is unchanged.

## Scope
- In: swap each lucide glyph in the 11 files for <RegistryIcon id="..." className="..." />, keeping each className. Remove unused lucide-react imports. Run the HUD test suite per phase.
- Out: Image sprite artwork, the registry, the glyph map, other modules, and any HUD code that uses lucide only as a type.

## Open questions
- none
