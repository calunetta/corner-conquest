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
- **Every state must leave a way back out of it.** If a state renders a dialog, modal, drawer, popover, or anything else that occludes the page (open by default so it's visible on load), the state's wrapper must give it a real `onClose`/`onOpenChange` handler — backed by `useState`, never a no-op — and show a visible "Reopen" (or equivalent) trigger once closed, so the viewer is never stuck unable to leave that state or reach another one. A static `open={true}` with no close wiring is a bug, not a simplification (see `docs/ai/tasks/2026-10-03-sabotage-dialog-preview-stuck-modal/`).
- **If the component has a phase/screen with no internal close control at all** (e.g. a combat dialog's rolling phase, a spectator view), the wrapper needs its own always-present exit button outside the component. A Radix `AlertDialog`/`Dialog` sets `pointer-events: none` on the rest of the app while modal — a sibling button needs `pointer-events-auto` (plus a `z-[60]`+ above the overlay's `z-50`) or it renders but silently can't be clicked (see `src/modules/combat/components/CombatDialog/CombatDialog.preview.tsx`).

## Check
1. `npx jest src/testbed/registry.test.ts`: slugs unique and kebab-case; every preview has uniquely named states.
2. `npm run typecheck` and `npm run lint`.
3. Skill `ui-verify` on `http://localhost:9002/testbed/<slug>`: look at every state at desktop and mobile size. For any dialog/modal/overlay state, actually click its close/cancel control (or press Escape) and confirm it closes and a reopen trigger appears — don't just screenshot it open.
