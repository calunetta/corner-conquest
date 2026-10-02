# UI design: Testbed master-detail layout

## Spec (ui-designer-a)

### Purpose and user story
As a developer using the dev-only testbed, I want a persistent sidebar of every registered component next to the selected component's states, so that I can switch previews in one click without returning to a catalog page. Every selection is still a route (`/testbed/<slug>[?state=<name>]`), so deep links and `ui-verify` (`snapshot.mjs`) keep working on a cold load.

### Placement and layout
Shell lives in `src/app/testbed/layout.tsx` (after the `isTestbedEnabled()` gate), so it persists across `/testbed` and `/testbed/[slug]`. It is a dev tool: flat, utilitarian, no glass blur on the shell itself, no game HUD chrome. The existing glass-card look (`border-white/10 bg-black/40`) is kept only for sidebar items already used by `PreviewCatalog`.

- Desktop (>= 768 px, `md:`; 1280×720 reference):
  - Two columns filling the viewport height. Left: sidebar, fixed width 280 px, full height, sticky, own vertical scroll, right border `border-border`, background `bg-card/40` (or `bg-background`; any existing token, no hex). Right: detail pane, fills the rest, own vertical scroll, content capped at the current `max-w-5xl` with the current padding (`p-6 sm:p-10`).
  - Sidebar top: title "Component testbed" (`text-lg font-black tracking-wide`, linking to `/testbed`), then the grouped list. The long subtitle from today's catalog moves out of the sidebar into the detail pane's empty state.
  - Sidebar list: for each group (alphabetical, from `groupPreviews`), a group label (existing `groupTitle` style: `text-xs font-semibold uppercase tracking-widest text-muted-foreground`) and a vertical list of rows. Row = component title left, "N states" right (`text-xs text-muted-foreground`). Rows are compact (min height 36 px), full width, `rounded-lg`, no card border at rest.
  - Detail pane: the current `PreviewStage` content unchanged (title, group line, one section per state, `?state=` filtering) minus the "← All components" link on desktop.
- Mobile (< 768 px; 390×844): no two columns. Route-driven collapse, no JS toggle and no Sheet:
  - `/testbed` (index): the sidebar list is the whole screen (full width, page padding `p-4`). The detail pane is hidden.
  - `/testbed/<slug>`: the sidebar is hidden; the detail pane is the whole screen, and the "← All components" link is shown at the top (it links to `/testbed`, as today). This is the same back-link pattern the stage already has.
  - Rows on mobile are at least 44 px tall (touch target).
  - The map-grid rule does not apply (dev tool); previews that are wider than the viewport scroll horizontally inside the canvas, not the page.

### States
| State | What the user sees | Trigger |
|---|---|---|
| Index, desktop | Sidebar on the left, nothing active. Detail pane shows the empty-selection prompt (see Copy). | Load `/testbed` at >= 768 px |
| Index, mobile | Full-screen grouped list only. | Load `/testbed` below 768 px |
| Preview selected, desktop | Sidebar with the matching row in the active state; detail pane shows all states of that preview. | Load or navigate to `/testbed/<slug>` |
| Preview selected, mobile | Detail pane only, with the back link. | Same, below 768 px |
| Single state (`?state=Name`) | Detail pane shows only that state, as today. The sidebar row stays active (active is decided by slug, not by query). | `?state=` present |
| Unknown slug | Sidebar present, no row active; detail pane shows the existing "Preview not found" title and message (`data-testid="testbed-missing"` preserved). | `/testbed/<bad-slug>` |
| Unknown state | Sidebar row active; detail pane shows the existing "No state named ..." message (`data-testid="testbed-missing"` preserved). | `?state=<bad>` |
| Empty registry | Sidebar shows "No previews registered yet." in place of the list. | `previews` is empty |
| Row hover | Background `bg-primary/10`, title stays `text-foreground`. | Pointer over row |
| Row focus | Visible 2 px ring (`ring-ring`). | Keyboard focus |
| Row active | Background `bg-primary/20`, 2 px left accent bar in `primary`, title `font-semibold text-primary`; `aria-current="page"`. Meta text unchanged. | Pathname equals `/testbed/<slug>` of the row |

### Components and tokens
- Reuse: `Link` from `next/link` for rows (keeps `a[href^="/testbed/"]` scraping and `data-testid="testbed-link-<slug>"` that `PreviewCatalog` tests use); `groupPreviews` in `src/testbed/components/PreviewCatalog/PreviewCatalog.map.ts`; `previews` and `findPreview` from `src/testbed/registry.ts`; the existing `PreviewStage` for the detail pane; `ScrollArea` in `src/components/ui/scroll-area.tsx` is optional for the sidebar list (native overflow is acceptable). Do not use `src/components/ui/sidebar.tsx` (it brings cookie/context state and a Sheet mobile mode that this route-driven design does not need) or `sheet.tsx`.
- Active row needs the current pathname, so the sidebar is a client component using the Next navigation pathname. The shell stays in the server layout and renders the sidebar into it, so the sidebar and detail are both in the cold-load HTML.
- New visual pattern (only one): the persistent sidebar with active-row accent bar. Everything else reuses current testbed styles.
- Tokens: `background`, `card`, `border`, `foreground`, `muted-foreground`, `primary` (with `/10`, `/20` opacities), `ring`. No hex. Font: Outfit (inherited).

### Copy
- Sidebar title: "Component testbed"
- Row meta: "N states" (existing; "1 states" is fixed to "1 state" for N = 1)
- Empty registry (sidebar): "No previews registered yet."
- Empty selection (desktop detail pane at `/testbed`): heading "Select a component"; body "Every registered component state, rendered in isolation. Pick a component from the list to see all its states."
- Back link (mobile, on preview routes): "← All components"
- Unchanged: "Preview not found", "No preview is registered with the slug “<slug>”.", "No state named “<state>”. Available: <list>."

### Interactions and motion
- Click or Enter on a row navigates to `/testbed/<slug>` (client navigation; no `?state=`). The sidebar does not remount: its scroll position survives navigation, and the active row changes immediately.
- Detail pane scrolls to top on navigation (native route behavior). Sidebar scroll is independent.
- Title in the sidebar header navigates to `/testbed`.
- Transitions: only `transition-colors` on row background (<= 150 ms), wrapped with `motion-reduce:transition-none`. No slide animation between list and detail on mobile.
- No state in localStorage or cookies.

### Accessibility
- Sidebar is a `nav` with `aria-label="Components"`; each group is a `section` with `aria-label` equal to the group name (current behavior, kept so `getByRole('region', { name: group })` tests stay valid) and a heading of the same name.
- Active row has `aria-current="page"`. Active state is signaled by accent bar and bolder title in addition to color.
- Detail pane is `main`, with the preview `h1`. Only one `main` and one `h1` per page.
- Tab order: sidebar title, rows in visual order, then detail pane. On mobile preview routes the sidebar is `display: none`, so it is out of the tab order and the back link is first.
- Contrast: `text-primary` on `bg-primary/20` over the navy background and `text-muted-foreground` meta text must be >= 4.5:1; verify in the browser, and raise to `text-foreground` if not.
- Touch targets >= 44 px tall below 768 px; desktop rows >= 36 px, never below 24 px.

### Acceptance criteria
- [ ] Cold load of `/testbed` at 1280×720: sidebar (280 px wide) lists every registered preview grouped alphabetically; right pane shows "Select a component"; no row is active.
- [ ] Cold load of `/testbed/<slug>` at 1280×720 (any registered slug): sidebar and detail both render; the row for `<slug>` has `aria-current="page"`; the detail pane shows every state of the preview; no "← All components" link is visible.
- [ ] Cold load of `/testbed/<slug>?state=<Name>`: only that state renders in the detail pane; the row is still active.
- [ ] Clicking another sidebar row changes the URL to `/testbed/<other-slug>`, swaps the detail pane, moves the active highlight, and keeps the sidebar scroll position.
- [ ] Sidebar and detail pane scroll independently at 1280×720 with a long preview.
- [ ] At 390×844, `/testbed` shows the full-width list and no detail pane; at `/testbed/<slug>` it shows the detail pane with "← All components" and no sidebar; the back link returns to the list.
- [ ] At 390×844 no horizontal page scrollbar; rows are >= 44 px tall.
- [ ] `/testbed/<bad-slug>` and `?state=<bad>` still render an element with `data-testid="testbed-missing"`; `snapshot.mjs --all` still discovers every slug via `a[href^="/testbed/"]` on `/testbed` and finds no `testbed-missing`.
- [ ] Every row keeps `data-testid="testbed-link-<slug>"` and `href="/testbed/<slug>"`; detail keeps `data-testid="testbed-stage"` and `testbed-state-<kebab-name>`.
- [ ] Keyboard: Tab reaches each row with a visible ring; Enter navigates.
- [ ] With an empty registry the sidebar shows "No previews registered yet."

## Review (ui-designer-b)
VERDICT: APPROVED

Verified against code: `src/app/testbed/layout.tsx` (server layout, returns `children` after the gate), `PreviewCatalog.tsx`/`.styles.ts`/`.test.tsx`, `PreviewStage.tsx`/`.styles.ts`, `src/components/ui/scroll-area.tsx` (exists), `snapshot.mjs:65-70,99` (scrapes `a[href^="/testbed/"]` on `/testbed`, checks `testbed-missing`). The route-driven design satisfies triage: both panes are in the cold-load HTML, selection is the URL, and the collapse on mobile is pure CSS plus the pathname. Findings, all folded into the Final spec:

1. Heading conflict (small fix, folded). The spec says one `h1` per page, but the sidebar title "Component testbed" is a link and the index detail pane has the "Select a component" heading. Fix: sidebar title is a link, not a heading; "Select a component" is the `h1` at `/testbed`; the preview title is the `h1` on preview routes.
2. `min-h-screen` in both `PreviewStage.styles.page` and `PreviewCatalog.styles.page` would break independent pane scrolling (double scrollbar). Fix: the detail content must drop `min-h-screen`; the shell owns the height (`md:h-screen`, panes `md:overflow-y-auto`). Said explicitly so implementers do not miss it.
3. Mobile collapse mechanism was underspecified. Fix: the client sidebar applies `hidden md:flex` when pathname is not exactly `/testbed` (tolerating a trailing slash), and `flex` otherwise. The empty-selection pane is `hidden md:block`. The back link gets `md:hidden`. Elements stay in the DOM (cold load stays self-contained); `display: none` removes them from the tab order.
4. Existing test `PreviewCatalog.test.tsx` asserts only test ids, `href` and `region` by group name. All stay valid. Moving the markup to a sidebar component means these tests move with it. The "1 state" pluralization change is not covered by any current test, so it needs a new map-level test.
5. Optional polish (folded as SHOULD, not an acceptance criterion because jsdom has no `scrollIntoView`): on cold load of a deep link into a long list, scroll the active row into view in the sidebar with `block: 'nearest'`, no smooth behavior.
6. Wide previews: `canvas` has no overflow rule today. Fixed in the spec: add `overflow-x-auto` to the canvas so the page never scrolls horizontally on mobile.
7. Contrast: `text-primary` (cyan, 190 90% 50%) on `bg-primary/20` over navy is high contrast by token values; the spec's "verify in the browser" is kept as a check for the ui-verify stage, not a blocker.

Not a problem: the sidebar title link `href="/testbed"` and the back link do not match `a[href^="/testbed/"]`, so `--all` discovery is unaffected. Only rows match.

## Final spec

Same as "Spec (ui-designer-a)" above, with the following amendments taking precedence. Where they conflict, this section wins.

### Amendments
- **Headings**: the sidebar title "Component testbed" is a `Link` to `/testbed` styled `text-lg font-black tracking-wide`, not a heading element. At `/testbed` the detail pane's `h1` is "Select a component". On preview routes the `h1` is the preview title (or "Preview not found"). Exactly one `h1` and one `main` per page. The sidebar is a `nav` outside `main`.
- **Height ownership**: the shell (`layout.tsx`) owns the viewport height. At `md:` and up it is a flex row with `h-screen`; the sidebar and the detail pane each have `overflow-y-auto`. Remove `min-h-screen` from the detail content wrappers (`PreviewStage.styles.page`, and the catalog page wrapper that becomes the sidebar). Below `md:` the page scrolls normally (no fixed height).
- **Mobile collapse, concretely**: sidebar visible below `md:` only when pathname is `/testbed` (or `/testbed/`); on every other pathname it is `hidden md:flex`. Index detail pane (`Select a component`) is `hidden md:block`. Preview detail is always visible. Back link "← All components" in `PreviewStage` gets `md:hidden`. Nothing is removed from the DOM.
- **Active row**: exact comparison of the pathname to `/testbed/<slug>` (trailing slash tolerated); query string ignored. `aria-current="page"` on the active `Link` only. Rows at rest: no border, `rounded-lg`, `min-h-11 md:min-h-9`, `px-3`, `transition-colors motion-reduce:transition-none`. Active: `bg-primary/20`, 2 px left accent bar (`border-l-2 border-primary` or equivalent, row padding compensated so text does not shift), title `font-semibold text-primary`. Hover: `hover:bg-primary/10`. Focus: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`.
- **Canvas overflow**: add `overflow-x-auto` to `PreviewStage.styles.canvas` so wide previews scroll inside the canvas.
- **Pluralization**: "N states" becomes "1 state" when N = 1. Put the helper in `PreviewCatalog.map.ts` (or the new sidebar's map file) with a unit test.
- **Scroll the active row into view (SHOULD)**: on mount, `scrollIntoView({ block: 'nearest' })` on the active row, without smooth behavior. Not tested in jsdom; confirm in the browser.
- **Existing hooks that must not change**: `data-testid="testbed-link-<slug>"`, `href="/testbed/<slug>"`, `section[aria-label=<group>]` with an `h2` of the group name, `testbed-stage`, `testbed-state-<kebab-name>`, `testbed-missing`.
- **Not allowed**: `src/components/ui/sidebar.tsx`, `sheet.tsx`, localStorage or cookies, new color values.

### Acceptance criteria (final, all observable by screenshot or test)
1. Unit/RTL: the sidebar renders a link for every preview with the right `href` and `data-testid`, one labelled region per group, and "No previews registered yet." with an empty list. The active row has `aria-current="page"` for a matching pathname and no row has it for `/testbed` or an unknown slug (mock the pathname).
2. Unit: pluralization gives "1 state" and "N states".
3. Screenshot 1280×720 `/testbed`: 280 px sidebar with grouped rows, none highlighted; right pane shows "Select a component" and its body copy.
4. Screenshot 1280×720 `/testbed/<slug>`: sidebar and detail both rendered on a cold load; the matching row highlighted (tint, accent bar, bold cyan title); no "← All components" visible; every state of the preview present.
5. `?state=<Name>` cold load: only that state rendered; the row still active. `?state=<bad>` and a bad slug: `testbed-missing` present, sidebar present.
6. Click on another row at 1280×720: URL becomes `/testbed/<other>`, detail swaps, highlight moves, the sidebar scroll offset is unchanged.
7. Sidebar and detail scroll independently at 1280×720; the document itself has no vertical scrollbar.
8. Screenshot 390×844 `/testbed`: full-width list, no detail pane, rows at least 44 px tall. `/testbed/<slug>`: detail only with "← All components" at the top, no sidebar; the link returns to the list. No horizontal page scrollbar at either URL.
9. `snapshot.mjs --all` discovers every slug and reports no `testbed-missing`.
10. Keyboard: Tab reaches the title link, then each row in visual order with a visible ring; Enter navigates.
11. With `prefers-reduced-motion: reduce`, no row transition runs.
