# Triage: Icon registry, override config, testbed Icon Editor

Request: Build L-task #1 from the Icon Editor roadmap (`docs/ai/tasks/2026-10-17-icon-editor-testbed/plan.md`): a hand-authored icon registry covering every distinct icon in the game (lucide glyphs and sprite images), a separate per-icon override config (uploaded src / rotation / size), and a testbed `IconEditor` component — list grouped by module, per-icon upload + rotation + size controls, live preview — backed by two dev-only API routes. No render-site wiring; testbed-only for v1.
Type: feature
Tier: L
Pipeline: ui-designer-a ui-designer-b architect-a architect-b implementer-a implementer-b tester-a tester-b preview-a preview-b docs-sync architect-b:final-review
Overrides: none
Phases: 2

<!-- The Pipeline and Overrides lines are read by scripts/claude-swarm-runner.sh. Keep their format. -->

## Why this tier
- Roadmap's own File plan lists ~20 files across `src/modules/icons/*`, `src/testbed/components/IconEditor/*`, `src/app/api/icon-editor/*`, and one edit to `src/testbed/registry.ts` — matching the Tile Decoration Editor precedent's logic+view phases (20 files total, split into two ~6-12 file phases there). Not L's upper bound, not M-sized.
- Visible UI: yes — a new testbed section the user interacts with directly (upload, rotation slider, size slider, live preview). `ui-designer-a/b` run before the architects per the tier table.
- Data: new config files (`icon-registry.config.json`, `icon-overrides.config.json`) and two dev-only filesystem-writing API routes, mirroring the decoration editor's `NODE_ENV==='production'` gate — no Firestore/GameState involvement.
- No gameplay signal: this never touches `src/modules/game-rules`, reducers, or rule numbers.
- Docs: `docs/architecture/systems-and-visuals.md` already documents the Tile Decoration Editor as a testbed tool; adding a sibling Icon Editor tool is the same kind of documented-tooling addition, so `docs-sync` is mandatory, not optional, at the end.

## Scope
- In: the icon registry type + hand-authored config (deduplicated from the roadmap's per-module grep lists), the override config schema and its two dev-only API routes (list uploads, save overrides), the `IconEditor` testbed component (hook/map/service/types/styles/view/row/preview), registering it in `src/testbed/registry.ts`.
- Out: wiring any override into the real game's render sites (that's roadmap items 1–7, each its own future L-task); Firebase Storage; anything beyond local-dev persistence.

## Open questions
- None — triage.md's resolved questions from the parent roadmap task cover icon scope, storage, and the testbed-only boundary. `architect-a` derives the exact `Contracts` block (full `IconRegistryEntry` shape, hook return type, route request/response bodies, and the seeded registry's actual deduplicated entries) during planning, per the roadmap's own note.
