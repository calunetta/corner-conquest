# Final review: Testbed master-detail layout, phase 1

VERDICT: APPROVED (static review; live ui-verify pass still required before commit, see below)

## Checks run
- `npm run typecheck`: tsc --noEmit, no errors.
- `npm run lint`: eslint . --max-warnings 0, no output (clean).
- `npm test`: Test Suites: 42 passed, 42 total; Tests: 237 passed, 237 total.
- ui-verify: not run yet.

## Plan adherence
Files match the File plan: TestbedSidebar (types, map, hook, fixtures, styles, tsx, index, map/hook/view tests), TestbedEmptyState, TestbedShell (with tests), layout.tsx and page.tsx edits, PreviewStage.styles.ts edits, PreviewCatalog/ deleted (7 files). No remaining references to `PreviewCatalog` outside task records. Class strings and contracts match the plan verbatim.

Final spec criteria (static):
1. Sidebar unit/RTL tests (links, regions, empty text, aria-current): met by code and TestbedSidebar.test.tsx.
2. Pluralization: met (`TestbedSidebar.map.ts:33`).
3. 280px sidebar, empty state at /testbed: met in code (`TestbedSidebar.styles.ts:6`, `TestbedEmptyState.tsx`); screenshot pending.
4. Cold load of /testbed/<slug>: met in code (sidebar in a server layout, `layout.tsx:15`); back link `md:hidden` (`PreviewStage.styles.ts:5`); screenshot pending.
5. ?state / bad slug: PreviewStage logic unchanged; testbed-missing hooks untouched; sidebar is always rendered. Met in code.
6. Click keeps sidebar scroll: sidebar lives in the layout, so it should not remount. Needs live check.
7. Independent scroll: `md:h-screen` on shell, `overflow-y-auto` on nav and `md:overflow-y-auto` on main, `min-h-screen` removed. Needs live check.
8. Mobile collapse: nav `hidden md:flex` unless index route, empty state `hidden md:block`, nothing removed from the DOM. Needs live check.
9. `snapshot.mjs --all`: row hrefs and test ids unchanged; title link `/testbed` does not match `a[href^="/testbed/"]`. Needs a live run.
10. Keyboard ring: `focus-visible:ring-2 focus-visible:ring-ring` on rows. Title link has no explicit focus-visible ring class (see finding 2). Needs a live check.
11. Reduced motion: `motion-reduce:transition-none` present. Met in code.

Still needs a live ui-verify browser pass (not checkable statically):
- contrast of `text-primary` on `bg-primary/20` and of `text-muted-foreground` meta text (at least 4.5:1)
- mobile collapse at 390x844 on both routes, 44px rows, no horizontal page scrollbar
- scroll ownership at 1280x720: no document scrollbar, two independent scrollers
- sidebar scroll position preserved on row click, and the active row scrolled into view on a cold load
- `snapshot.mjs --all` run
- tab order and focus ring on the title link

## Findings
| # | File:line | Problem | Owner | Blocking? |
|---|---|---|---|---|
| 1 | `src/testbed/registry.ts:2,6` | The diff adds `sabotageDialogPreview`, which belongs to another task (`2026-10-03-sabotage-dialog-preview*`). Plan says registry is not edited. Mixing it into this commit breaks one-task-per-commit. Also, `TestbedSidebar.fixtures.ts` uses a sabotage-dialog slug (harmless, fixture only). | coordinator | No: commit the sabotage-dialog files separately, or note it in the commit. |
| 2 | `src/testbed/components/TestbedSidebar/TestbedSidebar.styles.ts:9` | `title` link has no `focus-visible` ring. Criterion 10 expects a visible ring after Tab to the title. Browsers show a default outline, so likely fine; confirm in ui-verify, otherwise add `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded`. | implementer-b | No, pending ui-verify |
| 3 | `src/testbed/components/TestbedSidebar/TestbedSidebar.map.ts:23` | Nested ternary, against code-standards. The plan specified this logic, but a two-line early-return form is clearer. | implementer-a | No |
| 4 | `src/testbed/components/TestbedSidebar/TestbedSidebar.tsx:30` | Local `active` vs. spec naming `isActive`; `TestbedSidebarView` has no JSDoc though the contract does. Cosmetic. | implementer-b | No |

## Docs
- `docs/README.md:34` describes the testbed generically (`/testbed`, registry, legacy previews). It names no component of the catalog, so it stays true. Not needed. The phase added no game rules.

## Progress
Ticked in progress.md: implementation, tests, checks (typecheck, lint, unit tests). Not ticked: ui-verify, committed. Final review box stays open until ui-verify passes.
