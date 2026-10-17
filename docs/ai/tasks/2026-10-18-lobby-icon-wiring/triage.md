# Triage: Lobby icons through the registry (roadmap item 6)

Request: Replace the direct lucide-react glyphs in the lobby module with RegistryIcon, so overrides for those registry ids change them (roadmap item 6 in docs/ai/tasks/2026-10-17-icon-editor-testbed/plan.md). Same pattern as combat, cards and HUD.
Type: feature
Tier: M
Pipeline: architect-a architect-b implementer-b docs-sync architect-b:final-review
Overrides: none
Phases: 1

<!-- The Pipeline and Overrides lines are read by scripts/claude-swarm-runner.sh. Keep their format. -->

## Why this tier
- 7 files import lucide-react in src/modules/lobby/components/ (grep-verified): Lobby.tsx, RejoinMatchPanel.tsx, LobbyGameRow.tsx, CreateGameDialog.map.ts, CreateGameDialog.tsx. CreateGameDialog.types.ts imports only the LucideIcon type, which is used by the icon map; the plan decides its fate.
- Glyphs used: Compass, Loader2, Swords, Trophy, Shield, BookOpen, Sparkles, Power, Crown, Users, Info, Bot, HelpCircle, Settings. Every one is a registered kind 'lucide' entry (ids: compass, loader-2, swords, trophy, shield, book-open, sparkles, power, crown, users, info, bot, help-circle, settings).
- Not gameplay. Visible UI: default overrides are empty, so output is unchanged.
- Files are clean in git (no other session's uncommitted hunks).

## Scope
- In: swap each lucide glyph in the lobby components for <RegistryIcon id="..." className="..." />, keep classNames, convert any component-reference icon maps to id maps (CreateGameDialog.map.ts), and update CreateGameDialog.types.ts accordingly.
- Out: other modules, the registry, the glyph map, lobby image artwork.

## Open questions
- none
