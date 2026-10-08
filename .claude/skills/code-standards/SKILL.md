---
name: code-standards
description: Code conventions for TypeScript, React 18, Next.js 15 App Router, Tailwind and Firestore in this repo, and the readability bar (code an expert front-end engineer would write and a newcomer can follow). Use when writing, refactoring or reviewing any TypeScript or React code.
---

# Code standards

The bar: a senior front-end engineer reads the code once and understands it. Match the surrounding code. Formatting: 2-space indent, single quotes, semicolons, trailing commas (no Prettier in the repo; ESLint guards the rest).

## Readability
- Names say what and why: `remainingSeconds`, `isLocalPlayer`, `toPlayerStandings`. No `data`, `info`, `tmp`, `res` or single letters (except `i` in a tiny loop and `a, b` in comparators).
- One level of abstraction per function. Extract a well-named function instead of writing a comment.
- Early returns over nested `if`. No nested ternaries; in JSX use `&&` for one branch, or extract a component.
- No magic numbers: name them (`const FULL_PROGRESS = 100`). Reuse existing constants (`HAND_LIMIT`, `MAP_COLS`, `TURN_DURATION`, `DEFAULT_DESKTOP_ZOOM`) instead of retyping their values.
- Comments explain why (a rule, a workaround, a constraint), never what. JSDoc on exported functions whose purpose the name doesn't fully convey.
- No commented-out code, no `console.log`, no TODO without a reason and an owner.
- Functions under about 40 lines, files under 150 (lint-enforced). More than three parameters: pass one options object.

## TypeScript
- Strict mode. No `any` (lint error): precise types, `unknown` plus narrowing, or generics.
- `import type` for type-only imports (lint-enforced).
- Reuse domain types from `@/lib/types` (`GameState`, `Player`, `Island`, `GameAction`, `PlayerColor`, …); never redeclare them.
- Explicit return types on exported functions. Prefer literal unions and the repo's `as const` pattern: `export const X = { … } as const; export type X = (typeof X)[keyof typeof X];` (see `src/lib/types/player.ts`).
- No non-null assertion (`!`) unless a comment states the invariant. Don't cast to silence an error; fix the type. Tests may use `as unknown as T` for partial mocks.

## React
- Function components, named exports, props typed as `NameProps` or the view model.
- Derive values during render; don't copy props into state. `useEffect` only to sync with something outside React (timers, subscriptions, DOM), always with cleanup.
- `useMemo` / `useCallback` only for expensive work or when identity matters (effect dependencies, memoized children).
- Stable `key`s from ids; never array indexes for lists that change.
- Accessible by default: semantic elements (`button`, `ol`, `section`), `aria-label` on icon-only buttons, keyboard reachable, visible focus (`focus-visible:ring-2 focus-visible:ring-ring`).
- `data-testid` in kebab-case, `<area>-<thing>` (existing: `gameboard-exit-btn`, `map-zoom-in`). Tests prefer roles and labels; add a test id only when no role fits.

## Next.js 15
- App Router. Route files (`page.tsx`, `layout.tsx`) stay thin and compose module components.
- Server components by default; `'use client'` only where hooks, state or browser APIs are used. Functions can't be passed from server to client components as props.
- Dynamic route `params` and `searchParams` are Promises: `const { slug } = await params;`.
- Images via `next/image`; animated sprite GIFs need `unoptimized` (see `src/features/game/components/DeathEffect.tsx`).
- Client environment variables must start with `NEXT_PUBLIC_`.

## Tailwind and shadcn/ui
- All classes in `.styles.ts` (skill `component-architecture`); theme tokens over raw colors; mobile-first breakpoints (`sm:` and up).
- Reuse `src/components/ui/*`. Missing primitive: add it with the shadcn CLI, don't hand-write it.

## Firestore
- Only services touch Firestore. Keep the write economics in `docs/architecture/systems-and-visuals.md` §6.10: human actions are buffered locally and written once per turn; never add a write per click.
- Catch I/O errors at the service or hook boundary and tell the player through `useToast` (`@/modules/shared`); never swallow an error silently.
- `firestore.rules` allows public read and write today. Raise it before building anything that relies on secrecy or ownership.
