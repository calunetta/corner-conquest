# Triage: Icon editor testbed section

Request: Add a testbed "Icon Editor" (modeled on the Tile Decoration Editor) that lists every icon currently used in the game and, per icon, lets the user upload a replacement image or GIF, set rotation and size, preview it live, and have that override actually apply in the real game.
Type: feature
Tier: XL
Pipeline: architect-a architect-b
Overrides: none
Phases: TBD (roadmap splits this into L-tier sub-tasks, each triaged separately)

<!-- The Pipeline and Overrides lines are read by scripts/claude-swarm-runner.sh. Keep their format. -->

## Why this tier
- Verified breadth: `lucide-react` icons appear in 43 files across `src/modules/*` and `src/features/*`; `next/image` sprite usages (non-map, non-preview, non-test) appear in 30+ more files (combat dialogs, cards dialogs, HUD, lobby, map). "Every place we have an icon in the game" is on the order of 100+ individual icon instances, not a handful.
- The closest precedent, the Tile Decoration Editor (`src/testbed/components/TileDecorationEditor/`, task `docs/ai/tasks/2026-10-15-tile-decoration-editor/`), is itself ~34 files for *one* layer (tile decorations). This request is a generalized version of that same editor/override/persistence pattern applied to every icon site in the app — strictly larger scope.
- Visible UI: yes, both in the new testbed tool and (by requirement) in the live game, since overrides must actually render.
- Data/persistence: new — needs a storage decision for uploaded images/GIFs (local `public/` write via an API route, like the decoration editor's `regenerate-source.ts`, vs. Firebase Storage) and a config schema for per-icon rotation/size/src, plus an override-lookup layer every one of those 70+ render sites would need to consult instead of their current hardcoded `<Icon />` / `<Image src="...">`.
- Risk: touching that many render sites for the "wire overrides into the real game" requirement risks regressing unrelated UI; this has to be split and sequenced, not done in one pass.
- Per the triage table, this is an Epic: architects only produce a roadmap of L-tier sub-tasks; each sub-task gets triaged on its own once the user approves the roadmap.

## Scope
- In (for architect-a/b's roadmap step): define the icon registry/config schema, the override-resolution mechanism (how a render site asks "is there an override for icon X" without every component reimplementing that), the upload/storage approach, and the testbed UI shape (list, per-icon upload + rotation + size controls + preview) — then split wiring the ~70+ real render sites into grouped L-tier phases (e.g. by module: combat dialogs, cards dialogs, HUD, map/sprites, lobby).
- Out: actually implementing any phase yet — that happens after the user approves the roadmap and each phase is triaged.

## Open questions (resolved)
- Icon scope: **everything**, including every `lucide-react` glyph (~43 files) and every sprite `.gif`/`.png` usage (~30+ files) — not just sprite images.
- Storage: write uploaded files into `public/sprites/` via a dev-only API route, same approach as the Tile Decoration Editor's default-elements file writes. Local-dev only; no Firebase Storage in v1.
- Live wiring: **not required for v1**. Phase 1 (this roadmap's first L task) builds the registry, config schema, upload/rotate/size UI and live *testbed* preview only. Wiring overrides into the real game's render sites is later, phased work, module by module.
