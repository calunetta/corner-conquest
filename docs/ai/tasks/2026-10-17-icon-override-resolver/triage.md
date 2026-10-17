# Triage: Icon override resolver and shared icon wiring

Request: Build the pure override resolver for the icon registry (roadmap item 1 of `docs/ai/tasks/2026-10-17-icon-editor-testbed/plan.md`, lines 81–121) and wire it into `FightIcon`, `InfoIcon` and `ResourceIcon`, so saved overrides in `icon-overrides.config.json` take effect in the real game. Also remove the duplicated transform formula in the testbed editor if it can reuse the resolver's.
Type: feature
Tier: M
Pipeline: architect-a architect-b implementer-a implementer-b tester-a tester-b docs-sync architect-b:final-review
Overrides: none
Phases: 1

<!-- The Pipeline and Overrides lines are read by scripts/claude-swarm-runner.sh. Keep their format. -->

## Why this tier
- Files: `src/modules/icons/index.ts`, `icon-registry.types.ts`, `icon-registry.config.json`, `icon-overrides.config.json` (verified); `src/modules/shared/fight-icon.tsx`, `info-icon.tsx`, `resource-icon.tsx` and their tests (verified); `src/testbed/components/IconEditor/IconEditorRow.tsx` (`toTransform`, verified). Roughly 8 files, one new module file, one layer.
- Registry ids used by the three components already exist: `icon-fight`, `icon-info`, `icon-meat`, `icon-wood`, `icon-gold` (verified in `icon-registry.config.json`).
- The three components have 12 call sites outside `src/modules/shared/` (grep-verified). Their props stay the same, so call sites do not change.
- Not gameplay: no rule reducer, no Firestore write, no `GameState` change. Overrides config is `{}` today, so runtime output is unchanged until someone saves an override.
- Visible UI: no new visual state. Overrides are empty, so no preview state changes and no `ui-designer` stage is needed. Preview stage dropped.
- Docs: the feature changes architecture (new icon resolution path), so `docs-sync` runs.

## Scope
- In:
  - Pure resolver in `src/modules/icons` (no React, no hooks): given an icon id, return the effective image `src` (override or registry default) and a CSS transform from rotation and size.
  - Wire the resolver into `FightIcon`, `InfoIcon`, `ResourceIcon`, keeping their props and markup.
  - Share the transform formula with the testbed `IconEditorRow` (remove its local copy).
  - Unit tests for the resolver and the three components.
- Out:
  - No other render sites (combat, cards, HUD, map, lobby). Those are roadmap items 2–7.
  - No Firestore, no game rules, no change to the editor's save or upload routes.
  - No hot-reload of overrides: the config stays a static JSON import, as it is today.

## Open questions
- none
