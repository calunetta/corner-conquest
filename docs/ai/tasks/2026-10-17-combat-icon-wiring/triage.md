# Triage: Lucide-capable icon resolver and combat icon wiring

Request: Let the icon override system cover lucide glyphs as well as sprite images, so an uploaded replacement can override a glyph, then wire the combat dialogs' icons through it (roadmap item 2 in `docs/ai/tasks/2026-10-17-icon-editor-testbed/plan.md`, option 1 chosen by the user). Changes the resolver contract from the previous task (`resolveIcon` currently throws for lucide entries).
Type: feature
Tier: L
Pipeline: architect-a architect-b implementer-a implementer-b tester-a tester-b docs-sync architect-b:final-review
Overrides: none
Phases: 2

<!-- The Pipeline and Overrides lines are read by scripts/claude-swarm-runner.sh. Keep their format. -->

## Why this tier
- Phase 1 (resolver): `src/modules/icons/resolve-icon.ts` (currently throws on `kind: 'lucide'`, verified) changes its return type, which breaks its three consumers `src/modules/shared/fight-icon.tsx`, `info-icon.tsx`, `resource-icon.tsx` and their tests. The lucide-name lookup already exists in `src/testbed/components/IconEditor/IconEditorRow.tsx` (`lucideGlyphsByName`) and should move into the icons module so both share it. About 8 files, one layer, a contract change.
- Phase 2 (combat): 10 files under `src/modules/combat/components/` (verified by grep): `MonsterCombatDialog/` (4 files), `MonsterSelectionDialog/`, `CombatDialog/` (2), `AttackSelectionDialog/`, `ArmySelectionDialog/`, `PositionDialog/`. Lucide glyphs used: Skull, Swords, Trophy, Dices, Sparkles, Loader2, CheckCircle, Crosshair, Clock, Trophy. Sprite `<Image>` elements (collectors, players, monsters, resource art) are game artwork, not registry icons, and stay as they are.
- Not gameplay: no rule reducer, no Firestore, no `GameState`. Visible UI: default overrides are empty, so combat renders as before; a preview is not needed because no visual state changes.
- Docs: the resolver contract and the list of icon consumers change, so `docs-sync` runs in both phases.

## Scope
- In:
  - Phase 1: `resolveIcon` returns a discriminated source (`{ kind: 'image', src }` or `{ kind: 'lucide', name }`) plus `transform`. It returns `lucide` with the glyph name unless an override `src` is set. Move the lucide name lookup into `src/modules/icons`, add a shared `RegistryIcon` component (`id`, `className`) that renders either source with the transform, migrate `FightIcon`, `InfoIcon`, `ResourceIcon` and `IconEditorRow` to use it, and update their tests.
  - Phase 2: replace each combat lucide glyph with `<RegistryIcon id="..." />` using the registry id that matches it (for example `skull`, `swords`, `trophy`, `dices`, `sparkles`, `loader-2`, `check-circle`, `clock`, `crosshair`). Update the combat tests that assert on those icons.
- Out:
  - Sprite artwork (collector, player, monster, resource sprites) and the monster sprite system.
  - Other modules (cards, HUD, map, lobby, session): roadmap items 3–7.
  - Firestore, game rules, and the icon editor's save and upload routes.

## Open questions
- none
