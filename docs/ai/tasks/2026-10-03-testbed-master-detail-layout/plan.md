# Plan: Testbed master-detail layout

Status: APPROVED
Inputs: triage.md, ui-design.md (Final spec)

## Goal and acceptance criteria
All 11 criteria from ui-design.md's "Final spec → Acceptance criteria" apply verbatim. Restated as build targets:
- [ ] `/testbed` and `/testbed/<slug>` share one persistent shell: a sidebar (`nav`, all registered previews, grouped, alphabetical) and a detail pane (`main`), both present on a cold load of either route.
- [ ] Selecting a sidebar row navigates to `/testbed/<slug>` (real `Link`, no client-only toggle); the active row is decided by exact pathname match and carries `aria-current="page"`.
- [ ] Below `md:` (768px) the two panes collapse by route: `/testbed` shows the full-width list only, `/testbed/<slug>` shows the detail pane only (with the existing "← All components" link); nothing is removed from the DOM.
- [ ] Exactly one `h1` and one `main` per page; the sidebar is a `nav` outside `main`.
- [ ] Both panes scroll independently at `md:`; the document itself never scrolls vertically at that breakpoint.
- [ ] `data-testid="testbed-link-<slug>"`, `href="/testbed/<slug>"`, `section[aria-label=<group>]` with an `h2`, `testbed-stage`, `testbed-state-<kebab-name>`, `testbed-missing` are unchanged, so `snapshot.mjs --all` keeps working.
- [ ] "N states" becomes "1 state" for N = 1.

## Verified context
| Symbol or file | Location | Why it matters |
|---|---|---|
| `usePathname` | `node_modules/next/dist/client/components/navigation.d.ts:42` (`export declare function usePathname(): string;`), re-exported by `node_modules/next/navigation.d.ts:1` | Verified against the installed Next 15.3.8 (`package.json:53`, `node_modules/next/package.json:3`). Takes no args, returns the pathname without query string — matches the spec's "query string ignored" rule for free. ui-designer-b's flag is cleared. |
| `TestbedLayout` | `src/app/testbed/layout.tsx:11` | Server component, gates with `isTestbedEnabled()`, currently returns `children` unchanged (line 14). This is where the shell is wired in. |
| `isTestbedEnabled` | `src/testbed/testbed.config.ts:5` | Gate; not touched by this task. |
| `TestbedPage` | `src/app/testbed/page.tsx:3-5` | Currently `<PreviewCatalog />`; becomes `<TestbedEmptyState />`. |
| `TestbedPreviewPage` | `src/app/testbed/[slug]/page.tsx:8-13` | Unchanged; already renders `<PreviewStage slug stateName />`. |
| `previews`, `findPreview` | `src/testbed/registry.ts:6,8` | Data source; not edited (out of scope per triage.md:20). |
| `ComponentPreview`, `PreviewState` | `src/testbed/testbed.types.ts:4-7,10-17` | Domain types, imported, not changed. |
| `PreviewCatalog` (component) | `src/testbed/components/PreviewCatalog/PreviewCatalog.tsx:8-43` | Being replaced: its markup becomes `TestbedSidebar`, its page-level copy becomes `TestbedEmptyState`. |
| `groupPreviews` | `src/testbed/components/PreviewCatalog/PreviewCatalog.map.ts:7-19` | Pure function, moves unchanged into `TestbedSidebar.map.ts`. |
| `PreviewGroup` | `src/testbed/components/PreviewCatalog/PreviewCatalog.types.ts:3-6` | Moves into `TestbedSidebar.types.ts`. |
| `PreviewCatalog.test.tsx`, `PreviewCatalog.map.test.ts` | `src/testbed/components/PreviewCatalog/PreviewCatalog.test.tsx:1-24`, `PreviewCatalog.map.test.ts:1-26` | Their assertions move into `TestbedSidebar.test.tsx` / `TestbedSidebar.map.test.ts`; the files are then deleted (ui-design.md finding 4). |
| `PreviewStage` | `src/testbed/components/PreviewStage/PreviewStage.tsx:14-54` | Unchanged logic; only its `.styles.ts` classes change (no `.tsx` edit needed). |
| `PreviewStage.styles` | `src/testbed/components/PreviewStage/PreviewStage.styles.ts:1-12` | `page` (line 2) has `min-h-screen` to remove; `backLink` (lines 4-5) needs `md:hidden`; `canvas` (line 10) needs `overflow-x-auto`. |
| `selectStates`, `toKebabCase` | `src/testbed/components/PreviewStage/PreviewStage.map.ts:4-18` | Unchanged. |
| `cn` | `src/lib/utils.ts:5-7` | `clsx` + `tailwind-merge` — conflicting utilities (e.g. `border-transparent` vs `border-primary`) resolve to the last one passed, which the row active-state style relies on. |
| `scroll-area.tsx` | `src/components/ui/scroll-area.tsx` (exists) | Available but not used — native `overflow-y-auto` is simpler and the spec allows it. |
| `sidebar.tsx`, `sheet.tsx` | `src/components/ui/sidebar.tsx`, `src/components/ui/sheet.tsx` (both exist) | Explicitly forbidden by the Final spec ("Not allowed"). |
| `snapshot.mjs` discovery | `.claude/skills/ui-verify/scripts/snapshot.mjs:63-71` (`collectPreviewUrls`, scrapes `a[href^="/testbed/"]` from a `page.goto('/testbed')`), `:99-100` (fails on any `[data-testid="testbed-missing"]`) | The hard constraint from triage.md:16. The sidebar title link and the back link don't match this selector (they don't start with `/testbed/`), only rows do — confirmed by reading the two `href` values used. |
| Root layout | `src/app/layout.tsx:32-39` | No fixed height, no extra chrome around `{children}` — a `md:h-screen` shell in `src/app/testbed/layout.tsx` is not fighting anything above it. |
| `--primary` (dark) | `src/app/globals.css:53` (`190 90% 50%`) | Cyan, confirms ui-designer-b's contrast note computationally (not re-verified in-browser by this plan — that's the ui-verify step). |
| Component-architecture reference | `.claude/skills/component-architecture/reference/example.md:135-182,226-231` | `PlayerStandingsView` (pure) / `PlayerStandings` (connected) / `.hook.ts` pattern — `TestbedSidebar` follows this exactly, since it reads an external source (`previews`) and the router (`usePathname`), the same role `useGameBoard()` plays in the example. |
| Jest setup | `jest.config.js:8`, `jest.setup.js` (no `scrollIntoView` polyfill) | jsdom has no `Element.prototype.scrollIntoView`; calling it unguarded in a mounted effect throws inside `TestbedSidebar.test.tsx`. Must be called as `el?.scrollIntoView?.(...)`. |

## Decisions
- **Convert `PreviewCatalog/` into `TestbedSidebar/`, don't keep both.** ui-design.md's amendment literally says "the catalog page wrapper that becomes the sidebar." Keeping an orphaned `PreviewCatalog` folder that nothing renders would violate DRY/KISS. Rejected: leaving `PreviewCatalog.map.ts` in place and importing it from a new sidebar folder (rejected: it would leave a one-function-folder with a misleading name once the component it belonged to is gone).
- **Split `TestbedSidebar` into `.map.ts` + `.hook.ts` + `TestbedSidebarView`/`TestbedSidebar`, matching the `PlayerStandings` reference exactly.** The sidebar reads an external source (`previews`) and the router (`usePathname`) — the same shape as a connected component reading app state. This makes the empty-registry and active-row cases trivially testable via props on `TestbedSidebarView`, with no module mocking in the view test. Rejected: calling `usePathname()` and importing `previews` directly inside one `TestbedSidebar.tsx` (rejected: forces every view-level test to mock `next/navigation` and the registry, which `PreviewStage.test.tsx` already shows is more ceremony than passing props).
- **New `TestbedShell` component owns the two-pane flex/height layout**, rendered from `src/app/testbed/layout.tsx`. Keeps Tailwind classes out of the route file (consistent with every other route file in `src/app/testbed`, none of which have inline classes today) and makes the shell's structure (one `nav`, one `main`) unit-testable in isolation. Rejected: writing the shell's JSX directly in `layout.tsx` (rejected: route files in this codebase are thin wrappers; this would be the first to carry real markup and classes).
- **New `TestbedEmptyState` component for the index detail pane's copy**, instead of inlining it in `src/app/testbed/page.tsx`. One responsibility (static copy), consistent with `page.tsx` and `[slug]/page.tsx` both already being one-line wrappers around a `src/testbed/components/*` component.
- **Active-row and mobile-collapse decisions are pure functions in `TestbedSidebar.map.ts`** (`isRowActive`, `isIndexRoute`), not inlined in JSX, so they're covered by `tester-a` before any rendering happens, per CLAUDE.md principle 4 (logic tests before view tests).
- **No `cva` for the row variant.** `cn()` (clsx + tailwind-merge) already resolves the `border-transparent` ↔ `border-primary` and `text-foreground` ↔ `text-primary` conflicts by last-one-wins; a `cva` config would just wrap the same two-string ternary in more ceremony for one variant. Rejected: `cva` (rejected: no shared variant axis beyond on/off, YAGNI).
- **No `ScrollArea`, no `sidebar.tsx`, no `sheet.tsx`, no new dependency.** Forbidden by the Final spec and unnecessary: native `overflow-y-auto` and a route-driven `hidden md:flex` cover every required state.
- **Single phase, per triage.md:8** (`Phases: 1`). The file count is high (~25) only because most new files are one-line `index.ts` exports or small deletions; the real surface is three small components plus two route edits plus one styles edit, which fits one sitting.

## File plan
| File | New / Edit | Responsibility | Owner |
|---|---|---|---|
| `src/testbed/components/TestbedSidebar/TestbedSidebar.types.ts` | new | `PreviewGroup`, `TestbedSidebarViewModel` | implementer-a |
| `src/testbed/components/TestbedSidebar/TestbedSidebar.map.ts` | new | `groupPreviews` (moved), `isRowActive`, `isIndexRoute`, `pluralizeStates` | implementer-a |
| `src/testbed/components/TestbedSidebar/TestbedSidebar.hook.ts` | new | `useTestbedSidebar()`: reads `previews` + `usePathname()` | implementer-a |
| `src/testbed/components/TestbedSidebar/TestbedSidebar.fixtures.ts` | new | deterministic `PreviewGroup[]` samples shared by the map, hook and view tests | implementer-a |
| `src/testbed/components/TestbedSidebar/index.ts` | new | public exports | implementer-a |
| `src/testbed/components/TestbedSidebar/TestbedSidebar.styles.ts` | new | every Tailwind class for the nav, rows, active/hover/focus state | implementer-b |
| `src/testbed/components/TestbedSidebar/TestbedSidebar.tsx` | new | `TestbedSidebarView` (pure) + `TestbedSidebar` (connected) | implementer-b |
| `src/testbed/components/TestbedEmptyState/TestbedEmptyState.tsx` | new | static "Select a component" copy | implementer-b |
| `src/testbed/components/TestbedEmptyState/TestbedEmptyState.styles.ts` | new | classes incl. `hidden md:block` | implementer-b |
| `src/testbed/components/TestbedEmptyState/index.ts` | new | public export | implementer-a |
| `src/testbed/components/TestbedShell/TestbedShell.tsx` | new | two-pane shell: `nav` (via `TestbedSidebar`) + `main` wrapping `children`, owns viewport height | implementer-b |
| `src/testbed/components/TestbedShell/TestbedShell.styles.ts` | new | shell flex/`h-screen` classes | implementer-b |
| `src/testbed/components/TestbedShell/index.ts` | new | public export | implementer-a |
| `src/app/testbed/layout.tsx` | edit | wrap `children` with `<TestbedShell>` | implementer-b |
| `src/app/testbed/page.tsx` | edit | render `<TestbedEmptyState />` instead of `<PreviewCatalog />` | implementer-b |
| `src/testbed/components/PreviewStage/PreviewStage.styles.ts` | edit | drop `min-h-screen` from `page`; add `overflow-x-auto` to `canvas`; add `md:hidden` to `backLink` | implementer-b |
| `src/testbed/components/PreviewCatalog/PreviewCatalog.tsx` | delete | superseded by `TestbedSidebar` + `TestbedEmptyState` (step 26) | tester-b |
| `src/testbed/components/PreviewCatalog/PreviewCatalog.styles.ts` | delete | superseded (deleted in step 26, after tests exist) | tester-b |
| `src/testbed/components/PreviewCatalog/PreviewCatalog.map.ts` | delete | superseded by `TestbedSidebar.map.ts` (step 26) | tester-b |
| `src/testbed/components/PreviewCatalog/PreviewCatalog.types.ts` | delete | superseded by `TestbedSidebar.types.ts` (step 26) | tester-b |
| `src/testbed/components/PreviewCatalog/index.ts` | delete | superseded (step 26) | tester-b |
| `src/testbed/components/TestbedSidebar/TestbedSidebar.map.test.ts` | new | logic tests for the four map functions | tester-a |
| `src/testbed/components/TestbedSidebar/TestbedSidebar.hook.test.ts` | new | hook test, mocking `next/navigation` and the registry | tester-a |
| `src/testbed/components/TestbedSidebar/TestbedSidebar.test.tsx` | new | view tests against `TestbedSidebarView`, fixtures only | tester-b |
| `src/testbed/components/TestbedEmptyState/TestbedEmptyState.test.tsx` | new | asserts the `h1` and body copy | tester-b |
| `src/testbed/components/TestbedShell/TestbedShell.test.tsx` | new | asserts one `main`, one `nav` outside it, children render inside `main` | tester-b |
| `src/testbed/components/PreviewCatalog/PreviewCatalog.map.test.ts` | delete | cases moved into `TestbedSidebar.map.test.ts` (step 26) | tester-b |
| `src/testbed/components/PreviewCatalog/PreviewCatalog.test.tsx` | delete | cases moved into `TestbedSidebar.test.tsx` (step 26) | tester-b |

Sequencing note so the app never fails to compile mid-phase: build `TestbedSidebar` + `TestbedEmptyState` + `TestbedShell` and rewire `layout.tsx`/`page.tsx` first; delete `PreviewCatalog/*` only after `TestbedShell` compiles and renders without it.

## Contracts
```ts
// src/testbed/components/TestbedSidebar/TestbedSidebar.types.ts
import type { ComponentPreview } from '../../testbed.types';

export interface PreviewGroup {
  name: string;
  previews: ComponentPreview[];
}

export interface TestbedSidebarViewModel {
  groups: PreviewGroup[];
  /** The current route's pathname, from usePathname(); no query string. */
  pathname: string;
}

// src/testbed/components/TestbedSidebar/TestbedSidebar.map.ts
import type { ComponentPreview } from '../../testbed.types';
import type { PreviewGroup } from './TestbedSidebar.types';

/** Groups previews by `group`, sorting groups and titles alphabetically. Moved from PreviewCatalog.map.ts, unchanged. */
export function groupPreviews(previews: ComponentPreview[]): PreviewGroup[];

/** True when `pathname` (trailing slash tolerated) equals exactly `/testbed/<slug>`. */
export function isRowActive(pathname: string, slug: string): boolean;

/** True when `pathname` is the testbed index: `/testbed` or `/testbed/`. */
export function isIndexRoute(pathname: string): boolean;

/** "N states", except "1 state" for exactly one. */
export function pluralizeStates(count: number): string;

// src/testbed/components/TestbedSidebar/TestbedSidebar.hook.ts
import type { TestbedSidebarViewModel } from './TestbedSidebar.types';

/** Connects TestbedSidebarView: reads the registry (`previews`) and the route (`usePathname`). */
export function useTestbedSidebar(): TestbedSidebarViewModel;

// src/testbed/components/TestbedSidebar/TestbedSidebar.tsx
import type { TestbedSidebarViewModel } from './TestbedSidebar.types';

/** Pure: renders only its props. No router or registry access, so no mocking needed in its tests. */
export function TestbedSidebarView(props: TestbedSidebarViewModel): JSX.Element;
/** Connected: `<TestbedSidebarView {...useTestbedSidebar()} />`. This is what TestbedShell renders. */
export function TestbedSidebar(): JSX.Element;

// src/testbed/components/TestbedSidebar/index.ts
export { TestbedSidebar, TestbedSidebarView } from './TestbedSidebar';
export type { TestbedSidebarViewModel, PreviewGroup } from './TestbedSidebar.types';

// src/testbed/components/TestbedEmptyState/TestbedEmptyState.tsx
/** Static copy for the index route's detail pane. No props, no hooks. */
export function TestbedEmptyState(): JSX.Element;

// src/testbed/components/TestbedEmptyState/index.ts
export { TestbedEmptyState } from './TestbedEmptyState';

// src/testbed/components/TestbedShell/TestbedShell.tsx
import type { ReactNode } from 'react';

export interface TestbedShellProps {
  children: ReactNode;
}

/** Server component: renders <TestbedSidebar /> as a `nav` sibling of a `main` that wraps `children`. */
export function TestbedShell({ children }: TestbedShellProps): JSX.Element;

// src/testbed/components/TestbedShell/index.ts
export { TestbedShell } from './TestbedShell';
```

## Phases
### Phase 1: Sidebar, shell, wiring
1. `TestbedSidebar.types.ts`: add `PreviewGroup` (copy of `src/testbed/components/PreviewCatalog/PreviewCatalog.types.ts:3-6`, unchanged) and `TestbedSidebarViewModel` exactly as in Contracts. (implementer-a)
2. `TestbedSidebar.map.ts`: move `groupPreviews` from `PreviewCatalog.map.ts:7-19` verbatim (only the import path for `PreviewGroup` changes, to `./TestbedSidebar.types`). Add `isRowActive`, `isIndexRoute`, `pluralizeStates` per the Contracts signatures. `isRowActive`: strip one trailing `/` from `pathname` if present (but never turn `/` into `''`), then compare to `` `/testbed/${slug}` ``. `isIndexRoute`: `pathname === '/testbed' || pathname === '/testbed/'`. `pluralizeStates`: `` `${count} state${count === 1 ? '' : 's'}` ``. (implementer-a)
3. `TestbedSidebar.hook.ts`: `useTestbedSidebar()` calls `usePathname()` (from `next/navigation`) and `groupPreviews(previews)` (from `../../registry`), returns `{ groups, pathname }`. No `'use client'` directive here — only `.tsx` files carry it. (implementer-a)
4. `TestbedSidebar.fixtures.ts`: export at least `sampleGroups: PreviewGroup[]` (two groups, one with a single-state preview to exercise "1 state") and `emptyGroups: PreviewGroup[]` (`[]`). Deterministic slugs/titles, no `Date.now()`/`Math.random()`. (implementer-a)
5. `TestbedSidebar/index.ts` per Contracts. (implementer-a)
6. `TestbedSidebar.styles.ts` (implementer-b), exact classes:
   ```ts
   import { cn } from '@/lib/utils';

   export const styles = {
     nav: (isIndexRoute: boolean) =>
       cn(
         'w-full flex-col gap-6 overflow-y-auto border-r border-border bg-background p-4 md:w-[280px] md:shrink-0',
         isIndexRoute ? 'flex' : 'hidden md:flex',
       ),
     title: 'text-lg font-black tracking-wide text-foreground',
     empty: 'rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground',
     group: 'flex flex-col gap-3',
     groupTitle: 'text-xs font-semibold uppercase tracking-widest text-muted-foreground',
     list: 'flex flex-col gap-1',
     row: (isActive: boolean) =>
       cn(
         'flex min-h-11 items-center justify-between gap-4 rounded-lg border-l-2 border-transparent px-3 transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none md:min-h-9',
         isActive && 'border-primary bg-primary/20',
       ),
     rowTitle: (isActive: boolean) => cn('truncate text-foreground', isActive && 'font-semibold text-primary'),
     rowMeta: 'shrink-0 text-xs text-muted-foreground',
   } as const;
   ```
   (`min-h-11` = 44px for the mobile touch target; `md:min-h-9` = 36px for desktop; both match the Final spec's numbers exactly. `border-l-2 border-transparent` is always present so the 2px accent bar never shifts text — `cn`'s tailwind-merge resolves `border-transparent` → `border-primary` as a swap, not an addition.)
7. `TestbedSidebar.tsx` (implementer-b): `'use client'`. `TestbedSidebarView({ groups, pathname })` renders:
   - `<nav aria-label="Components" className={styles.nav(isIndexRoute(pathname))} ref={navRef}>`
   - a `<Link href="/testbed" className={styles.title}>Component testbed</Link>` (not a heading)
   - `groups.length === 0 && <p className={styles.empty}>No previews registered yet.</p>`
   - else one `<section aria-label={group.name} className={styles.group}>` per group with an `<h2 className={styles.groupTitle}>{group.name}</h2>` and a `<ul className={styles.list}>`; each `<li>` contains a `<Link href={`/testbed/${preview.slug}`} data-testid={`testbed-link-${preview.slug}`} aria-current={isActive ? 'page' : undefined} className={styles.row(isActive)}>` with `<span className={styles.rowTitle(isActive)}>{preview.title}</span>` and `<span className={styles.rowMeta}>{pluralizeStates(preview.states.length)}</span>`, where `isActive = isRowActive(pathname, preview.slug)`.
   - On mount only (`useEffect(() => { ... }, [])`), scroll the active row into view: `navRef.current?.querySelector('[aria-current="page"]')?.scrollIntoView?.({ block: 'nearest' })`. The `?.(` before the call is required — jsdom has no `scrollIntoView` (verified: not polyfilled in `jest.setup.js`), so an unguarded call throws inside `TestbedSidebar.test.tsx`.
   - `TestbedSidebar()` is one line: `return <TestbedSidebarView {...useTestbedSidebar()} />;`
8. `TestbedEmptyState.styles.ts` (implementer-b):
   ```ts
   export const styles = {
     root: 'hidden mx-auto max-w-5xl p-6 sm:p-10 md:block',
     heading: 'text-2xl font-black tracking-wide text-foreground',
     body: 'mt-2 max-w-prose text-sm text-muted-foreground',
   } as const;
   ```
9. `TestbedEmptyState.tsx` (implementer-b): `<div className={styles.root}><h1 className={styles.heading}>Select a component</h1><p className={styles.body}>Every registered component state, rendered in isolation. Pick a component from the list to see all its states.</p></div>`. No `'use client'` (no hooks).
10. `TestbedEmptyState/index.ts` per Contracts. (implementer-a)
11. `TestbedShell.styles.ts` (implementer-b):
    ```ts
    export const styles = {
      shell: 'flex flex-col md:h-screen md:flex-row',
      detail: 'flex-1 md:overflow-y-auto',
    } as const;
    ```
12. `TestbedShell.tsx` (implementer-b): no `'use client'`. `<div className={styles.shell}><TestbedSidebar /><main className={styles.detail}>{children}</main></div>`.
13. `TestbedShell/index.ts` per Contracts. (implementer-a)
14. Edit `src/app/testbed/layout.tsx`: import `TestbedShell` from `@/testbed/components/TestbedShell`; replace `return children;` with `return <TestbedShell>{children}</TestbedShell>;`. Keep the `isTestbedEnabled()` gate and `notFound()` call exactly as they are (lines 12-13). (implementer-b)
15. Edit `src/app/testbed/page.tsx`: replace the `PreviewCatalog` import and JSX with `TestbedEmptyState` from `@/testbed/components/TestbedEmptyState`. (implementer-b)
16. Edit `src/testbed/components/PreviewStage/PreviewStage.styles.ts`:
    - `page`: `'mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 p-6 sm:p-10'` → `'mx-auto flex w-full max-w-5xl flex-col gap-6 p-6 sm:p-10'` (drop `min-h-screen`).
    - `backLink`: append `' md:hidden'` to the existing string.
    - `canvas`: add `overflow-x-auto` (e.g. `'relative min-h-48 overflow-x-auto rounded-xl border border-dashed border-border bg-background/60 p-6'`).
    No `.tsx` change needed — `PreviewStage.tsx` already references `styles.page`/`styles.backLink`/`styles.canvas` unconditionally. (implementer-b)
17-18. (Deletions moved to step 26, architect-b review: deleting sources while the old tests still exist breaks typecheck between stages.)
19. `TestbedSidebar.map.test.ts` (tester-a): port the two `groupPreviews` cases from `PreviewCatalog.map.test.ts:11-26` verbatim; add `isRowActive` cases (`/testbed/foo` + `foo` → true; `/testbed/foo/` + `foo` → true; `/testbed/foo` + `bar` → false; `/testbed` + `foo` → false); `isIndexRoute` cases (`/testbed` → true, `/testbed/` → true, `/testbed/foo` → false); `pluralizeStates` cases (0 → "0 states", 1 → "1 state", 2 → "2 states"). (tester-a)
20. `TestbedSidebar.hook.test.ts` (tester-a): `jest.mock('next/navigation', () => ({ usePathname: jest.fn() }))`, `jest.mock('../../registry', () => ({ previews: mockPreviews }))` (the factory may only reference variables prefixed `mock`, so declare `const mockPreviews` and require it lazily or inline the array in the factory)``; assert `useTestbedSidebar()` returns `{ groups: groupPreviews(mockPreviews), pathname: mockedPathname }` for a couple of mocked pathnames. (tester-a)
21. `TestbedSidebar.test.tsx` (tester-b), rendering `TestbedSidebarView` directly with `sampleGroups`/`emptyGroups` from the fixtures — no router or registry mocking:
    - a link per preview with the right `href` and `data-testid` (criterion 1, moved from `PreviewCatalog.test.tsx:6-15`);
    - one labelled region per group (moved from `PreviewCatalog.test.tsx:17-23`);
    - `emptyGroups` → "No previews registered yet." renders;
    - a row whose `href` matches `pathname` has `aria-current="page"`; no other row does; `pathname="/testbed"` → no row has it;
    - meta text reads "1 state" for a single-state preview and "N states" otherwise.
    (tester-b)
22. `TestbedEmptyState.test.tsx` (tester-b): renders; asserts `getByRole('heading', { level: 1, name: 'Select a component' })` and the body text. (tester-b)
23. `TestbedShell.test.tsx` (tester-b): `jest.mock('next/navigation', () => ({ usePathname: () => '/testbed' }))` (TestbedShell renders the connected `TestbedSidebar`, which needs this). Render `<TestbedShell><div data-testid="child" /></TestbedShell>`; assert exactly one `getByRole('main')`, exactly one `getByRole('navigation', { name: 'Components' })` outside it, and that the child renders inside `main`. (tester-b)
24-25. (Merged into step 26.)
26. Last step, after steps 19-23 pass: delete the whole `src/testbed/components/PreviewCatalog/` folder (7 files, sources and both tests together), then run `npm run typecheck`, `npm run lint`, `npm test`. (tester-b)

Model escalation: none (triage.md:7 sets no overrides). If a builder hits the tailwind-merge conflict resolution in step 6/7 and it doesn't visually resolve as expected, escalate that one step to sonnet rather than guessing.

## Test plan
- tester-a (logic, first): `TestbedSidebar.map.test.ts` (groupPreviews, isRowActive, isIndexRoute, pluralizeStates — concrete cases listed in Phase 1 step 19) and `TestbedSidebar.hook.test.ts` (step 20). Delete `PreviewCatalog.map.test.ts` only after its two cases exist in the new file.
- tester-b (view): `TestbedSidebar.test.tsx` (step 21), `TestbedEmptyState.test.tsx` (step 22), `TestbedShell.test.tsx` (step 23). Delete `PreviewCatalog.test.tsx` only after its two cases exist in `TestbedSidebar.test.tsx`. No new e2e spec: `e2e/` has no existing testbed spec (verified: `grep -rl testbed e2e/` found none), and the route-level behavior is covered by `ui-verify`, not Playwright.
- Unchanged and must stay green with no edits: `PreviewStage.test.tsx`, `PreviewStage.map.test.ts`, `registry.test.ts` (none of them assert on class strings).
- Not reachable in jsdom, verify with `ui-verify` (`node .claude/skills/ui-verify/scripts/snapshot.mjs --all` plus manual 390×844/1280×720 checks) before calling the phase done:
  - desktop screenshot: 280px sidebar, grouped rows, "Select a component" on `/testbed`; highlighted row + no back-link on `/testbed/<slug>`;
  - `?state=<Name>` and `?state=<bad>`/bad-slug cold loads;
  - clicking another row keeps sidebar scroll position;
  - independent scrolling, no document-level vertical scrollbar at `md:`;
  - mobile screenshots at both routes, 44px rows, no horizontal scrollbar;
  - keyboard Tab/Enter through the rows with a visible ring;
  - `prefers-reduced-motion: reduce` stops the row transition.

## Preview states
None. This task's pipeline (triage.md:6) has no `preview-a`/`preview-b` stage — the shell, sidebar and empty state are testbed infrastructure, not a registered preview.

## Risks
- Dropping `min-h-screen` from `PreviewStage.styles.page` relies entirely on `TestbedShell`'s `md:h-screen` + `flex-1` to fill the viewport; a short preview could look collapsed if the shell's height doesn't propagate. Mitigate: check both viewports with ui-verify before marking the phase done, not just unit tests.
- `usePathname()` mocking has no existing precedent in this repo (verified: no `jest.mock('next/navigation'...)` anywhere in `src/`). Phase 1 steps 20 and 23 specify the exact mock shape so both testers use the same pattern.
- Deleting `PreviewCatalog/*` before `TestbedShell` fully replaces it would break `/testbed` mid-phase. Steps 1-16 (build + wire) precede step 26 (delete, last, with its tests) for this reason.
- `scrollIntoView` is a SHOULD, not an acceptance criterion, and jsdom doesn't implement it — step 7 mandates the optional-chained call (`?.scrollIntoView?.(...)`) so `TestbedSidebar.test.tsx` doesn't throw.

## Review (architect-b)
VERDICT: APPROVED
- Verified: every cited path/line (layout.tsx:11-14, page.tsx, PreviewCatalog.*, PreviewStage.styles.ts, snapshot.mjs:63-71, no `next/navigation` mock precedent in `src/`, `PreviewStage.tsx` has no `main`, only one `h1`). Contracts are complete for parallel builders; pure view / connected split and server `TestbedShell` -> client sidebar are sound; no boundary issue (`src/testbed` is outside the module lint scope, relative imports used anyway).
- Fixed (folded in): sequencing was only half-true for the build. Implementers deleted `PreviewCatalog` sources (old steps 17-18) while its old tests survived until the testers ran, so typecheck and jest would fail between stages. All deletions are now one final step 26 owned by tester-b, run after the new tests pass, with the three checks. File-plan owners updated.
- Fixed (folded in): step 20 `jest.mock` factory cannot reference an out-of-scope `mockPreviews` unless prefixed `mock`; wording added.
- `jest.mock('next/navigation', () => ({ usePathname: jest.fn() }))` is fine: `layout.tsx` is not imported by any test, so mocking the module without `notFound` is safe. The `TestbedShell` test uses an inline `usePathname: () => '/testbed'`, also fine. `next/link` renders in RTL without router context (the old `PreviewCatalog.test.tsx` already did).
- Phase size: 25 steps is acceptable as one phase; about 14 new small files, 3 edits, 1 folder deletion, one layer, all testbed-only. One commit is atomic and reviewable. Not split.
- Minor, no action: the mount-only `scrollIntoView` is enough because the sidebar persists across client navigation; `isRowActive` trailing-slash note about `/` is harmless.
