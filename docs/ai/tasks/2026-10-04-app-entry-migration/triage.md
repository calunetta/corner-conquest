# Triage: App entry points migration

Request: migrate `src/app/page.tsx`, `src/app/layout.tsx`, `src/components/icons.tsx` into the `src/modules/<domain>/` standard, per `docs/ai/refactor.md` row #11.
Type: refactor
Tier: M
Pipeline: architect-a architect-b implementer-a implementer-b tester-a tester-b architect-b:final-review
Overrides: implementer-a=sonnet, implementer-b=sonnet
Phases: 2

<!-- The Pipeline and Overrides lines are read by scripts/claude-swarm-runner.sh. Keep their format. -->

## Why this tier
- `src/app/page.tsx` (135 lines, `'use client'`) holds two components: `Login` (name entry form, `:14-110`) and `Home` (default export, routes between `Login`, `Lobby`, `GameBoard`, `:112-135`). It imports `GameBoard` from `@/features/game/components/GameBoard` (legacy, stays at its legacy path per row #6's Decisions) and `usePlayer` from `@/modules/session` (already migrated, row #10).
- `src/app/layout.tsx` (42 lines) is the Next.js App Router root layout — font setup, `<html>`/`<body>` shell, wraps children in `PlayerProvider`/`TooltipProvider`/`Toaster`.
- Next.js requires `page.tsx` and `layout.tsx` at their exact `src/app/` paths to be picked up as routes — like `GameBoard.tsx` (row #6) and `PlayerInfoBar.tsx` (row #7), these two files cannot leave `src/app/`. The migration here is extracting their logic/view into `src/modules` and leaving a thin wrapper, then dropping both from `eslint.config.mjs`'s `LEGACY_PATHS` (`:17-18`) once they're thin enough to pass `max-lines` (150) and the module import-boundary rules.
- `src/components/icons.tsx` (109 lines) has no Next.js constraint and is a pure relocation target, but it's imported across module boundaries with no single owning domain — confirmed via `grep -rn "components/icons" src`:
  - `ResourceIcon`, `RESOURCE_SPRITES`, `getResourceDisplayName`: `src/modules/combat/components/PositionDialog/*`, `src/modules/cards/components/{WealthyDialog,ProductiveCardDialog,AbilitiesDialog,StealResourceDialog}/*`, `src/modules/hud/components/PlayerInfo/PlayerInfoStats.tsx`.
  - `FightIcon`: `src/modules/combat/components/{CombatDialog,ArmySelectionDialog}/*`, `src/modules/hud/components/ActionsPanel/ActionButton.tsx`.
  - `InfoIcon`: `src/modules/hud/components/TutorialBeacon/TutorialBeacon.tsx`.
  - `MonsterIcon`, `SettingsIcon`: grep found no current importers outside `icons.tsx` itself — confirm live in architect's plan before relocating (dead code is deleted, not migrated, per the `shared-hooks-migration` precedent's `use-mobile.ts` call).
  - `src/modules/shared/` already exists as the flat, no-single-owner home for exactly this situation (`toPlayerIdleSprite`, `useToast`, `useIsMobile`, each its own file + test, re-exported from `shared/index.ts`) — same pattern fits `icons.tsx`'s split.
- `eslint.config.mjs:72` caps non-legacy files at 150 lines; `page.tsx` at 135 lines is already under the cap but mixes two components (`Login` + `Home`) that belong in different places once moved — `Login` is view+behavior (name input, submit, error dialog) that the architect must place in a domain module (candidate: `src/modules/session`, since it only talks to `usePlayer`), while `Home`'s routing logic (`Login` vs `Lobby` vs `GameBoard`) is what has to stay closest to the thin `src/app/page.tsx` wrapper.
- No gameplay, Firestore shape, or `GameState` change. No new or visually different UI — this is a pure code-location refactor, same category as row #10 (`shared-hooks-migration`, also tier M, also cross-module call-site fixups with one eslint-forced split). `ui-designer-*` and `preview-a`/`preview-b` dropped for the same reason that precedent dropped them: no visual state changes.
- `implementer-a`/`implementer-b` escalated to sonnet per the cross-module-refactor override — `icons.tsx`'s call sites span `combat`, `cards`, `hud`, plus whichever module ends up owning `Login`.

## Scope
- In: split `icons.tsx` into `src/modules/shared/` (or wherever the architect places genuinely shared, cross-domain icon/resource-display code) and repoint its ~13 call sites; extract `Login` out of `page.tsx` into a domain module; reduce `page.tsx` and `layout.tsx` to thin wrappers that satisfy the module import-boundary and `max-lines` rules; remove all three paths from `eslint.config.mjs`'s `LEGACY_PATHS`; update `docs/README.md` if it documents these files' locations or behavior.
- Out: changing `Login`/`Home`/layout behavior, the root-layout font/provider setup, `GameBoard.tsx` or any other file already fixed at a legacy path by a prior row's Decisions; deleting `MonsterIcon`/`SettingsIcon` is only in scope if the architect confirms they're dead (grep found zero non-`icons.tsx` call sites) — if confirmed dead, delete rather than migrate.

## Open questions
- None.
