# Triage: Testbed states don't auto-open

Request: Selecting a component in the testbed sidebar must not auto-render its states; show a list of state names on the right, and only render ("open") the one the user clicks. Make the preview agent respect this.
Type: component
Tier: S
Pipeline: implementer-a tester-a
Overrides: none
Phases: 1

<!-- The Pipeline and Overrides lines are read by scripts/claude-swarm-runner.sh. Keep their format. -->

## Why this tier
- Single layer (view), single component: `src/testbed/components/PreviewStage/PreviewStage.tsx:14-54`, `PreviewStage.styles.ts:1-12`, `PreviewStage.test.tsx:1-47`. `PreviewStage.map.ts` unchanged (its `selectStates` already supports filtering to one named state).
- `PreviewStage` is a pure view with no data/Firestore/reducer involvement — grepped for `firebase`, `Math.random`, `Date.now`: none found.
- Visible UI change, but it's the dev-only `/testbed` tool, not in-game UI — no game-design or ui-designer stage needed; implementer-a follows the existing `styles`/`map` pattern in the file.
- Obvious solution: when `stateName` is absent, render a list of `<Link href="?state=Name">` items instead of rendering every `state.render()`. When present, render only that one (existing `selectStates` behavior, unchanged).
- Also update skill `testbed-preview` (`.claude/skills/testbed-preview/SKILL.md`) with a rule that previews must default to a closed/unopened list of states, not auto-render, so future previews built by preview-a conform.

## Scope
- In: `PreviewStage.tsx` (render a state list instead of all states when no `?state=` is set), `PreviewStage.styles.ts` (list styles), `PreviewStage.test.tsx` (update/add tests for the new default view and for opening a single state), `.claude/skills/testbed-preview/SKILL.md` (add the closed-by-default rule for preview-a).
- Out: `TestbedSidebar` (left-hand component list navigation is unchanged — it already navigates to `/testbed/<slug>` without rendering anything itself), `PreviewStage.map.ts` (`selectStates` already does what's needed), the registry, `testbed.types.ts`.

## Open questions
- none
