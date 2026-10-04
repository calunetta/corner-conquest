# Triage: Testbed state tabs (keep the list visible, open only one)

Request: The closed-state-list from `docs/ai/tasks/2026-10-04-testbed-closed-states` is confusing — clicking a state name navigates away and the list of other states disappears. Keep all states visible as persistent options on the page (like before), but don't auto-render every one — only the selected state's component should render, and nothing renders until the user picks one.
Type: component (UX revision)
Tier: M
Pipeline: ui-designer-a ui-designer-b implementer-a tester-a
Overrides: none
Phases: 1

<!-- The Pipeline and Overrides lines are read by scripts/claude-swarm-runner.sh. Keep their format. -->

## Why this tier
- Same single file set as the prior task (`PreviewStage.tsx`, `PreviewStage.styles.ts`, `PreviewStage.test.tsx`), still a pure view with no data/Firestore/reducer involvement.
- Bumped from S to M solely to add the `ui-designer-a`/`ui-designer-b` stage, at the user's explicit request, to get the tab/switcher interaction right (not because of size or risk).
- No `game-designer` stage: this is a dev tool, not gameplay — no rule, balance, or player-facing content involved.
- No `architect-*`/`preview-*` stage: no new component, no data model, no cross-module wiring — same reasoning as the prior task, just needs a UX pass before implementing.

## Scope
- In: `PreviewStage.tsx`/`.styles.ts`/`.test.tsx` — replace the "click a state name, navigate to a page with only that state" flow with a persistent switcher (e.g. tabs or a segmented list) that stays visible on the page; selecting one renders only that state's component in the canvas below, and nothing is selected/rendered by default (matches `docs/ai/tasks/2026-10-04-testbed-closed-states/triage.md`'s "no auto-render" requirement, but without losing the other options).
- Out: `TestbedSidebar` (component-to-component navigation, unaffected), `PreviewStage.map.ts`'s `selectStates` filtering contract is reusable but the exact switching mechanism (URL `?state=` vs. local component state) is ui-designer-a's call to make explicit in ui-design.md.

## Open questions
- none — user described the desired behavior directly ("keep options on the content page automatically [visible], but without the automatic opening")
