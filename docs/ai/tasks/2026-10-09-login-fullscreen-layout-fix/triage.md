# Triage: Fix Login's full-screen layout so it works outside the real route too

Request (self-filed): `src/modules/session/components/Login/Login.styles.ts`'s root uses `h-screen` (100vh), which only renders correctly because the real route (`src/app/page.tsx`) happens to mount `Login` under a `body` with no height constraint — there is no `height: 100%` chain through `html`/`body`/`#__next` in `globals.css`/`layout.tsx`. This means `h-screen` works by coincidence on the real page but clips the card at the bottom in any context where `Login` isn't the raw viewport's only content — confirmed in the testbed preview (`/testbed/session-login`, states Guest and Loading), where `PreviewStage`'s canvas is a padded, content-sized box, not the viewport.
Type: bug (layout)
Tier: XS
Pipeline: architect-a architect-b implementer-b tester-b preview-b architect-b:final-review (no game-rules impact; view-layer only)
Overrides: none
Phases: 1

## Why this tier
- Single, well-understood root cause, already diagnosed (source: `docs/ai/tasks/2026-10-09-persistent-account-auth/plan.md`, Risks section, and its `review.md` Phase 3 section).
- Fix is a small, scoped CSS change: give the app shell a real height chain (`globals.css`'s `html`/`body`, or `src/app/layout.tsx`'s root wrapper) `height: 100%` / `min-h-screen`, then swap `Login.styles.ts`'s root from `h-screen` to `h-full` so it fills its actual parent instead of the raw viewport.
- Already tried and reverted once (see below) because it was out of scope for the task that found it — this task is that properly-scoped follow-up.

## What was already tried (and reverted)
- `w-screen` → `w-full` on `Login.styles.ts`'s root: done, kept, harmless (no real-route regression). Already shipped in `feat(session): persist identity via Firebase Auth accounts` lineage.
- `h-screen` → `h-full` alone: fixes the testbed preview but collapses the real route's Login page to content height (measured 502px vs the correct 720px at 1280×720), because nothing above it in the DOM resolves to a real height for `h-full` to inherit. Reverted.

## Scope
- In: giving the app shell a real height chain, then switching `Login.styles.ts`'s root to `h-full`; verifying both the real route (`/`) and the testbed preview (`/testbed/session-login`, all three states: Loading, Guest, Account) render correctly at desktop and mobile sizes.
- Out: any other full-viewport component that might have the same latent issue — audit only if this fix surfaces one; don't go looking proactively.
- Watch for: other routes/components that assume `html`/`body` have no explicit height today (a `height: 100%` chain is a layout-wide change, however small, and could interact with scroll behavior elsewhere — check `src/app/layout.tsx` and any other full-screen view, e.g. the Lobby background, before shipping).
