---
name: component-architecture
description: Folder layout and file anatomy for new code in src/modules (view .tsx, .hook.ts, .styles.ts, .map.ts, .types.ts, .service.ts, fixtures, tests, testbed preview), the pure-view/connected-component split, import boundaries, size limits, wiring into legacy code and migrating legacy components. Use when creating or changing files under src/modules, deciding where code goes, or reviewing structure.
---

# Component architecture

New code lives in `src/modules/`. Legacy folders (`src/features/`, `src/lib/`, `src/hooks/`) stay as they are (see CLAUDE.md).
A complete, verified example is in [reference/example.md](reference/example.md). Read it before creating your first component.

## Layout
```
src/modules/<domain>/                  e.g. hud, combat, cards, lobby, map
├── components/<Name>/                 one folder per component (PascalCase)
│   ├── <Name>.tsx                     view
│   ├── <Name>.hook.ts                 state, effects, handlers, adapter to app state
│   ├── <Name>.styles.ts               every Tailwind class of the view
│   ├── <Name>.map.ts                  pure transforms: source data → view model
│   ├── <Name>.types.ts                types shared by two or more of these files
│   ├── <Name>.fixtures.ts             deterministic data for tests and previews
│   ├── <Name>.map.test.ts             transform tests
│   ├── <Name>.hook.test.ts            hook tests
│   ├── <Name>.test.tsx                view tests
│   ├── <Name>.preview.tsx             testbed states
│   └── index.ts                       public API of the component
├── services/<name>.service.ts         Firestore I/O and domain operations (+ .test.ts)
└── index.ts                           public API of the module
src/modules/shared/                    code used by two or more modules
```
Create only the files a component needs. A static badge may be `.tsx`, `.styles.ts`, `index.ts`, a test and a preview. Never create empty or pass-through files.

## What each file may do
| File | Does | Never |
|---|---|---|
| `.tsx` | Render props as JSX | Business logic, service calls, `useEffect` for data |
| `.hook.ts` | `useName(…)`: state, effects, handlers; read app state (board context, player session); call services; return a view model | Return JSX; import Firestore directly |
| `.styles.ts` | Export `styles` (class strings, `cva` variants) and class lookup tables | Logic beyond choosing a variant |
| `.map.ts` | Pure functions `toSomething(source): ViewModel`; formatting, sorting, ranking | React, I/O, `Date.now()`, `Math.random()` |
| `.reducer.ts` | Pure game-rule functions `handleX(state, payload): GameState`; domain randomness/timestamps (`Math.random()`, `Date.now()`) allowed — this is game-rule logic, not a view-model transform | React, Firestore, returning JSX |
| `.service.ts` | Firestore reads and writes via `@/lib/firebase`; return plain data | React, legacy UI |
| `.types.ts` | Props and view-model types | Redefining domain types (import them from `@/lib/types`) |
| `.fixtures.ts` | Deterministic sample data | Random values, dates |

## Pure view, connected component
- When a component's hook reads app state (legacy context such as `useGameBoard()`, the player session, Firestore through a service), its `.tsx` exports two components:
  - `NameView(props)`: pure, renders only its props. Tests and previews use it with fixtures; no providers needed.
  - `Name()`: one line, `return <NameView {...useName()} />;`. The app renders this one.
- When the hook only manages UI state derived from props (open/closed, selection), the view calls it directly and there is no `NameView`.

## Styles
- No class strings in `.tsx`: the view uses `styles.x` or `styles.x({ variant })`, merging conditional classes with `cn()` from `@/lib/utils`.
- Theme tokens (`bg-primary`, `text-muted-foreground`, `border-border`), never raw hex colors. `cva` (class-variance-authority, installed) for variants.
- Runtime numbers (a width percentage, a transform) are the only values allowed in a `style` prop.

## Import boundaries (enforced by `npm run lint`)
- Firestore (`@/lib/firebase`, `firebase/*`) only in `*.service.ts`.
- Legacy UI and context (`@/features/*`) only in `*.hook.ts`.
- Another module only through its index (`@/modules/<domain>`), never a deep path.
- Inside a module, relative imports. Domain types from `@/lib/types`, primitives from `@/components/ui/*`, `cn` from `@/lib/utils`.

## Size and naming
- One responsibility per file. Lint fails files over 150 lines (blank lines and comments excluded): split by responsibility, not arbitrarily. Keep functions under about 40 lines.
- Component and folder: PascalCase. Hook: `useName`. Map functions: `toSomething`. Services: verbs (`createMatch`, `subscribeToMatch`). Booleans: `is/has/can/should`. Handlers: `handleX` in hooks, `onX` as props.
- `'use client'` only at the top of a `.tsx` that uses hooks, state or browser APIs.
- Named exports only; default exports are for `src/app` route files.

## Wiring into legacy code
- Import the module's public component in the legacy parent and render it. Keep the edit minimal and list it in `plan.md`'s File plan.
- Never copy legacy logic into a module. Import it (types, `@/modules/game-rules` reducers) or migrate it.

## Migrating a legacy component
1. Characterization tests: capture today's behavior of the legacy component.
2. Build the new version in `src/modules/` with all its files, preview included.
3. Switch the import in the parent; run the characterization tests against the new version.
4. Delete the legacy file in a separate commit once verified; remove its entry from `LEGACY_PATHS` in `eslint.config.mjs` if listed.
5. Update `docs/README.md` §2.
