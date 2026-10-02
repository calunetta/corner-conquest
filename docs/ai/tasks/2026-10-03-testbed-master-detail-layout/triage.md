# Triage: Testbed master-detail layout

Request: Restructure the testbed shell into a single list-detail page — a persistent left sidebar listing every registered component, with the selected one rendered on the right — so browsing previews never needs page-to-page navigation chrome of its own.
Type: refactor
Tier: M
Pipeline: ui-designer-a ui-designer-b architect-a architect-b implementer-a implementer-b tester-a tester-b architect-b:final-review
Overrides: none
Phases: 1

<!-- The Pipeline and Overrides lines are read by scripts/claude-swarm-runner.sh. Keep their format. -->

## Why this tier
- Touches the testbed shell across routing and view layers: `src/app/testbed/layout.tsx`, `src/app/testbed/page.tsx`, `src/app/testbed/[slug]/page.tsx`, `src/testbed/components/PreviewCatalog/*` (6 files), `src/testbed/components/PreviewStage/*` (5 files) — a new shared sidebar component is likely needed. Around 8 files, one layer (view/routing), fits one phase.
- Visible UI: yes, it's the only interface of this change — a UI design pass is needed for the two-pane layout, the selected/active state in the sidebar, and the mobile behavior (no room for two columns at 390px, so a collapse-to-list-then-detail pattern is likely, matching how `PreviewStage`'s existing back link already works).
- Gameplay / Data / Risk: no — dev-only tool (`isTestbedEnabled()`), no game rules, no Firestore, no `GameState`.
- Hard constraint for the plan: `.claude/skills/ui-verify/scripts/snapshot.mjs` does a fresh hard-navigation `page.goto()` per URL and, for `--all`, scrapes `a[href^="/testbed/"]` from `/testbed` to discover every preview, then separately loads each `/testbed/<slug>` URL and checks for `data-testid="testbed-missing"`. Whatever layout is built must keep `/testbed/<slug>[?state=<name>]` directly loadable and self-contained (sidebar + detail both rendering on a cold load of that URL) — a client-only selector with no route change would break this tooling silently.

## Scope
- In: a persistent two-pane shell (sidebar list + detail pane) across `/testbed` and `/testbed/[slug]`; selecting a component in the sidebar navigates to its route (so deep links and `ui-verify` keep working) but the page reads as one list-detail view, not a catalog page plus a separate standalone page; active-item highlighting in the sidebar; a sensible mobile layout.
- Out: any change to individual `*.preview.tsx` files or `registry.ts` content; any change to `testbed.config.ts`'s enable/disable gate; the `?state=` query param contract `PreviewStage` already implements.

## Open questions
- none
