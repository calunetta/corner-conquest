---
name: testbed-preview
description: Create or update the isolated testbed preview of a component (Name.preview.tsx with every visual state, shared fixtures, registry entry) so it renders on its own at /testbed/<slug>. Use whenever a component is created or its visual states change.
---

# Testbed previews

The testbed (`/testbed`, dev only) shows each component alone, in every state, without starting a match. Humans browse it; skill `ui-verify` screenshots it.

## Files
- New components: `src/modules/<domain>/components/<Name>/<Name>.preview.tsx`, next to the component.
- Legacy components: `src/testbed/legacy/<Name>.preview.tsx` (example: `MapZoomControls.preview.tsx`).
- Register every preview in `src/testbed/registry.ts`: an import plus an entry in the `previews` array.

## Shape
From the worked example in `.claude/skills/component-architecture/reference/example.md` (documentation only, not in `src/`):
```tsx
import type { ComponentPreview } from '@/testbed';
import { PlayerStandingsView } from './PlayerStandings';
import { midGameStandings, tiedForFirstStandings } from './PlayerStandings.fixtures';

export const playerStandingsPreview: ComponentPreview = {
  slug: 'hud-player-standings', // unique, kebab-case: <domain>-<component>
  title: 'Player standings',
  group: 'HUD', // catalog section
  states: [
    { name: 'Mid game', render: () => <PlayerStandingsView {...midGameStandings} /> },
    { name: 'Tied for first', render: () => <PlayerStandingsView {...tiedForFirstStandings} /> },
  ],
};
```
Legacy previews import the type from `../testbed.types` instead of `@/testbed`.

## Rules
- Render the pure `NameView` with props: never the connected component, never a provider that talks to Firestore.
- One state per meaningful visual difference: default, empty, loading, error, disabled, edge values (max, ties, long names), selected. Take the list from `plan.md` (Preview states) and `ui-design.md` (States).
- Data comes from `Name.fixtures.ts`, shared with the tests. Deterministic: no `Math.random()`, no `Date.now()`.
- Interactive state: a small wrapper in the preview file that holds `useState`, or uses the real hook when the hook has no app-state dependency (see the `Interactive` state in `src/testbed/legacy/MapZoomControls.preview.tsx`).
- Absolutely positioned components render inside the state's canvas, which is `relative`.
- Previews are dev-only: never export them from a module's `index.ts`.

## Check
1. `npx jest src/testbed/registry.test.ts`: slugs unique and kebab-case; every preview has uniquely named states.
2. `npm run typecheck` and `npm run lint`.
3. Skill `ui-verify` on `http://localhost:9002/testbed/<slug>`: look at every state at desktop and mobile size.
