# UI design: Testbed state switcher (persistent tabs, closed by default)

## Spec (ui-designer-a)

### Purpose and user story
As a developer using the `/testbed` tool, I want the list of a component's states to stay visible at all times while I preview one at a time, so that switching between states takes one click instead of a back-navigation round trip.

### Current behavior (verified, screenshots in `test-results/ui-verify/testbed-map-zoom-controls--desktop.png` and `...-state-Default-20zoom--desktop.png`)
`src/testbed/components/PreviewStage/PreviewStage.tsx:35-66`: with no `?state=`, a `<ul>` of `<Link href="/testbed/<slug>?state=<name>">` renders under the header (`data-testid="testbed-state-list"`). Clicking a link navigates to a URL where `stateName` is set — the list block disappears entirely (the `{preview && !stateName && ...}` guard hides it) and only the single matching `<section>` renders. There is no way back to another state without browser back or editing the URL.

### What changes
Keep the same `?state=` URL mechanism (see "Selection mechanism" below) but stop hiding the switcher once a state is selected. The switcher is a persistent row of state buttons, always rendered together whenever a preview is found, regardless of `stateName`. Below it, a canvas area renders either a "pick a state" placeholder (no `stateName`), the selected state's component (valid `stateName`), or an error message (unknown `stateName`) — never more than one state's component at once, matching the original closed-by-default requirement from `docs/ai/tasks/2026-10-04-testbed-closed-states/triage.md`.

### Placement and layout
This is a dev-only tool page, not in-game HUD, so the "map grid stays visible on mobile" rule does not apply here — there is no map on `/testbed`. Layout otherwise follows the existing `PreviewStage` page structure.

- **Desktop (1280×720)**: inside `styles.page` (`mx-auto max-w-5xl`), directly below the existing `header` block (title + group label), in the same position currently occupied by the state list / single rendered section:
  1. Switcher row: a horizontal, wrapping row of buttons, one per state name, left-aligned, `flex flex-wrap gap-2`. Replaces the current vertical `<ul>` — a row reads more clearly as "these are tabs, not links to elsewhere" and keeps many states (e.g. Island Tile's 10) from forcing a tall column before the canvas.
  2. Canvas area directly below the row, same `styles.canvas` treatment as today (`rounded-xl border border-dashed border-border bg-background/60 p-6`), full width of the page column.
- **Mobile (390×844)**: same structure, same order (switcher row above canvas). The row wraps onto multiple lines at narrow widths instead of scrolling horizontally — simpler than introducing horizontal-scroll affordance for a dev tool with no scroll indicator pattern in this codebase. No element needs to collapse: the sidebar (`TestbedSidebar`) already collapses to `hidden md:flex` on non-index routes (`TestbedSidebar.styles.ts:6`), out of scope here and unaffected.

### States
| State | What the developer sees | Trigger |
|---|---|---|
| Preview not found | Header shows "Preview not found", message box: `No preview is registered with the slug "<slug>".` No switcher, no canvas. | `findPreview(slug)` returns undefined. Unchanged from today (`PreviewStage.tsx:29-33`). |
| No state selected (new empty state) | Switcher row renders all state names as buttons, none visually marked active. Canvas area renders a placeholder message instead of a component. | Preview found, no `?state=` in the URL (default on first visit to `/testbed/<slug>`). |
| One state selected | Switcher row renders all state names; the button matching `stateName` (case-insensitive, matching `selectStates`' existing comparison in `PreviewStage.map.ts:7`) is visually marked active/pressed. Canvas renders exactly that state's `render()` output under its name. | Developer clicks a switcher button, or opens a URL with a matching `?state=`. |
| Unknown state named | Switcher row renders all state names, none marked active (since the requested name does not match any). Canvas area renders the existing error message instead of the placeholder. | `?state=` is present but does not match any state name (typo'd deep link, renamed state). |
| Button default | Unpressed button: `bg-transparent`, `text-muted-foreground` label, `border border-border`. | Any state button not matching current `stateName`. |
| Button hover | `hover:bg-primary/10`, `hover:text-foreground` (same hover token pair as `TestbedSidebar.styles.ts:16` for consistency with the sidebar's own row hover). | Mouse over a button, any viewport with a pointer. |
| Button focus | `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (existing project-wide focus pattern, e.g. `PreviewStage.styles.ts:5,11`). | Keyboard focus via Tab/Arrow keys. |
| Button active/selected | `bg-primary/20 border-primary text-primary font-semibold` (same active pair as `TestbedSidebar.styles.ts:17,19` `isActive` branch), plus `aria-selected="true"` / `aria-current="true"` per the roles chosen below. | The button's state name matches the current `stateName` (case-insensitive). |

### Components and tokens
- No new shadcn primitive needed. This is a plain button row; shadcn's `Tabs` component is not in `src/components/ui/` (verified: `ls src/components/ui` does not list `tabs.tsx` — unverified further than that one check, confirm before assuming it's absent entirely). Given it is not already vendored, introducing it would require a shadcn CLI add for a single dev-tool component; a plain `<button>` row matching existing `TestbedSidebar` row tokens is simpler and is the "one new visual pattern" budget already spent on nothing — recommend **not** pulling in `Tabs` for this.
- Reuse tokens already used in `PreviewStage.styles.ts` and `TestbedSidebar.styles.ts`: `text-primary`, `bg-primary/10`, `bg-primary/20`, `border-primary`, `border-border`, `text-muted-foreground`, `text-foreground`, `focus-visible:ring-ring`, `rounded-xl`/`rounded-lg`, `border-dashed` (canvas only, unchanged).
- Minimum touch target: buttons get `min-h-9` matching `TestbedSidebar.styles.ts:16`'s `md:min-h-9` (this tool is desktop-first but should stay tappable on mobile too — use `min-h-11 md:min-h-9` the same way the sidebar does, for consistency).

### Copy
- Placeholder in the canvas when no state is selected (new copy, exact string):
  **"Select a state above to preview it."**
- Unknown-state message: unchanged exact string, still produced from existing data —
  `No state named "<stateName>". Available: <comma-separated state names>.`
- Preview-not-found message: unchanged exact string —
  `No preview is registered with the slug "<slug>".`
- Switcher button label: the state's own `name` field, unchanged (e.g. "Default zoom", "Zoomed in", "Interactive").

### Interactions and motion
- Clicking a switcher button navigates via the existing `Link`/URL mechanism (see below) to `?state=<name>`; the row itself does not re-render structurally, only the active-button styling and the canvas content change.
- No transition/animation is required (instant content swap, consistent with the rest of the testbed, which has no motion). If a future pass wants a fade, it must respect `motion-reduce:` per project convention — not needed for this spec's acceptance criteria.
- Clicking the already-active state button is a no-op (same URL), standard anchor behavior.

### Selection mechanism: keep `?state=` in the URL (recommendation for implementer-a)
Keep using the URL query parameter, not local component state (e.g. `useState`). Reasons:
1. **Deep-linking**: a developer or an e2e test can link directly to `/testbed/map-zoom-controls?state=Interactive` and land on that exact state, which the user's own usage pattern already relies on (sharing testbed links, or tester-a asserting against a specific state URL).
2. **Back/forward button**: switching states is navigation-like (changing what's on screen); using the URL means browser back/forward works as a developer expects, consistent with `TestbedSidebar`'s own navigation-via-`Link` pattern (`TestbedSidebar.tsx` is unaffected but sets the convention for this tool).
3. **No new state management**: `selectStates` (`PreviewStage.map.ts:4-9`) already takes `stateName` as a prop derived from the URL (`src/app/testbed/[slug]/page.tsx` — verify this route file before implementing, it is presumably what reads `searchParams.state` and passes `stateName` down); keeping the URL as the source of truth means `PreviewStage` itself stays a pure function of its props, no new internal state, no risk of the switcher and the URL drifting out of sync.
4. The only downside — a full page nav per click — is already how the tool behaves today and was not part of the user's complaint; the complaint was that the *other options disappeared*, not that navigation itself was unwanted.

**Required change for implementer-a**: render the switcher row unconditionally (whenever `preview` exists), not just when `!stateName`. The canvas block's three branches (placeholder / selected state / unknown-state message) become mutually exclusive based on `stateName` and whether `selectStates` found a match — replacing the current fully-separate `{!stateName && <ul>}` vs. `{stateName && states.length === 0}` vs. `{states.map(...)}` blocks, which today assume the list and the rendered state are never shown together.

### Accessibility
- Use a `role="tablist"` / `role="tab"` pattern given this is a single-selection switcher controlling which panel is visible, matching ARIA APG's tabs pattern:
  - Switcher row: `role="tablist"`, `aria-label="Preview states"`.
  - Each button: `role="tab"`, `aria-selected={isActive}`, `id="testbed-tab-<kebab-name>"`.
  - Canvas region when a state is active: `role="tabpanel"`, `aria-labelledby="testbed-tab-<kebab-name>"` (reuse the existing `aria-label={state.name}` on the `<section>`, `PreviewStage.tsx:60`, or pair it with `aria-labelledby` — keep whichever avoids a duplicate accessible name; `aria-labelledby` pointing at the tab is preferable per APG).
  - When no state is selected or the state is unknown, there is no live tabpanel content, so the placeholder/error message does not need `role="tabpanel"` — a plain paragraph (as today, `styles.message`) is sufficient.
- Keyboard: since each tab is a real navigating `<a>`/`<Link>` (per the URL-based recommendation above), standard Tab-key focus order through the row and Enter/Space activation already work via native anchor semantics — no custom arrow-key roving-tabindex handler is required. (ARIA APG recommends arrow-key navigation for `tablist`, but given these are links to distinct URLs rather than an in-page JS-only tab panel, keeping native Tab-per-link behavior is simpler and still fully keyboard-operable; call out `role="tab"` on an `<a>` as a deliberate deviation from the stricter APG pattern, acceptable because testbed is an internal dev tool, not player-facing.)
- Visible focus ring on every button: `focus-visible:ring-2 focus-visible:ring-ring` (existing project pattern).
- Text contrast: `text-muted-foreground` on `bg-background` and `text-primary`/`text-foreground` on `bg-primary/10`/`bg-primary/20` are the same pairings already used elsewhere in this codebase (`TestbedSidebar.styles.ts`), so no new contrast risk is introduced.

### Acceptance criteria
<!-- Checked in the browser by the ui-verify skill, or asserted in PreviewStage.test.tsx. -->
- [ ] Visiting `/testbed/<slug>` with no `?state=` shows every state name as a button in a single persistent row, and the canvas shows the placeholder text "Select a state above to preview it." — no state's component is rendered.
- [ ] Clicking a state button navigates to `/testbed/<slug>?state=<name>`; the same row of all state buttons is still present and unchanged in content; the clicked button is visually marked active (`aria-selected="true"`); the canvas shows only that state's rendered component, not the placeholder, not any other state.
- [ ] From a selected state, clicking a different state button switches the canvas to the new state and moves the active marking to the new button — the previously active button returns to its default (unpressed) styling.
- [ ] Visiting `/testbed/<slug>?state=<unknown-name>` shows the full row of valid state buttons (none marked active) and the canvas shows `No state named "<unknown-name>". Available: <comma-separated names>.`
- [ ] Visiting `/testbed/<unknown-slug>` shows "Preview not found" in the header and the not-registered message; no switcher row, no canvas.
- [ ] Every switcher button reaches focus via Tab key in DOM order and shows a visible focus ring; Enter/Space activates the focused button's link.
- [ ] On a 390 px-wide viewport, the switcher row wraps onto additional lines rather than overflowing or requiring horizontal scroll, and the canvas remains below it, full width.

## Review (ui-designer-b)

Verified against code before reviewing:
- `src/testbed/components/PreviewStage/PreviewStage.tsx:29-48` — confirms the `{preview && !stateName && <ul>...}` guard the spec describes; the list really does disappear once `stateName` is set.
- `src/testbed/components/PreviewStage/PreviewStage.map.ts:4-9` — `selectStates` already does case-insensitive matching and returns `[]` on no match; no change needed here, spec correctly treats it as reusable.
- `src/app/testbed/[slug]/page.tsx:8-13` — reads `searchParams.state` and passes it to `<PreviewStage stateName=... />` **unconditionally**, whether or not `state` is present. The new "switcher always rendered, canvas depends on `stateName`" logic lives entirely inside `PreviewStage`'s own branching; the route file needs **no change**. Ui-designer-a was right to flag it and right that it would check out — confirmed here so implementer-a doesn't need to open it expecting work.
- `src/testbed/components/TestbedSidebar/TestbedSidebar.styles.ts:14-19` — confirms the `isActive` hover/active token pairs the spec borrows (`hover:bg-primary/10`, `border-primary bg-primary/20`).
- `src/testbed/components/PreviewStage/PreviewStage.test.tsx` — existing tests assert `getByTestId('testbed-state-list')` and `getByRole('link', { name })`; keeping those names/roles stable where possible reduces churn for tester-a.

### Does `?state=` fix the complaint?
Yes, for the part that was actually broken. The user's complaint was never about full-page navigation per click (App Router's `<Link>` does a client-side transition, not a hard reload) — it was that **the list of other options vanished** once a state was picked (`PreviewStage.tsx:35`: `!stateName` guard). The spec's core change — render the switcher unconditionally whenever `preview` exists, and let only the canvas content depend on `stateName` — removes exactly that guard and keeps the row present and visually stable across clicks. Confirmed this is sufficient; no further mechanism change needed.

### Open question 1: `role="tab"` on a real navigating `<a>`
**Reject this part of the spec.** Faking the ARIA APG tabs pattern on links that are genuinely plain navigation is a known anti-pattern, not just a style nit:
- APG's tabs pattern promises specific keyboard behavior to assistive-tech users the moment `role="tablist"`/`role="tab"` is announced: arrow-key roving between tabs, Home/End, and — critically — that activating a tab shows/hides an in-page panel without a page transition. None of that is true here; these are `<Link>`s to different URLs.
- The spec's own mitigation ("native Tab-per-link already works, call this a deliberate deviation") only covers "does it still work", not "does it still tell the truth to a screen reader user about what will happen." A VoiceOver/NVDA user tabbing into a `role="tab"` will expect arrow keys to switch panels in place; they won't, because the DOM actually navigates. That mismatch is worse than giving no widget role at all.
- "Internal dev-only tool" doesn't change this: the accessible-path requirement in skill `ui-design` ("everything works by keyboard... focus is visible") is about honesty of affordance as much as reachability, and the honest option here costs nothing extra to build.
- The simpler option the spec itself raised — a nav of plain links, no `tablist`/`tab`/`tabpanel` roles — is correct and is what I'm folding into the Final spec below: a `<nav aria-label="Preview states">` with a `<ul>`/`<li>` list of `<Link>`s (matches the existing list markup, just laid out horizontally), `aria-current="page"` on the active link (the standard pattern for "which nav item matches the current URL", e.g. header/sidebar nav conventions), and no `role="tabpanel"` on the canvas — it's just the page's main content, already implied by DOM order.

This is a small, mechanical fix (swap five ARIA attributes/roles, no layout change), so I'm folding it in rather than sending the whole spec back.

### Open question 2: precision for implementer-a
Mostly sufficient, with three gaps I'm closing in the Final spec rather than sending back:
1. **Button classes were missing padding, corner radius, and font-size** — the spec gives color/border/ring tokens but not `px-`, `rounded-`, `text-` sizing. Closed below using the same scale as `TestbedSidebar.styles.ts:16` (`rounded-lg`, `px-3`) and the existing `stateLink` (`text-sm`).
2. **No distinct `data-testid` for the new "nothing selected" placeholder.** `testbed-missing` is already used for two different messages (preview-not-found, unknown-state) sharing one copy string pattern; reusing it a third time for the new placeholder (different copy, different condition) would make `tester-a`'s assertions ambiguous about which case fired. Closed below with a new `testbed-no-selection` testid.
3. **No guidance on whether to keep `styles.stateList`/`stateListItem`/`stateLink` names or invent new ones.** Closed below: keep the existing three keys (just change their values), add one new `cn()`-based function for the active/inactive branch, to minimize diff noise and keep `data-testid="testbed-state-list"` stable for the existing passing tests that don't need to change.

Everything else — layout, states table, copy, mobile behavior, motion, acceptance criteria — is precise enough to build without re-deriving decisions, and is consistent with the dark glass theme, existing token usage, and touch-target rules.

VERDICT: APPROVED

## Final spec

### Behavior (unchanged from ui-designer-a, confirmed correct)
- `src/app/testbed/[slug]/page.tsx` — **no change**. It already forwards `stateName` to `PreviewStage` regardless of whether `?state=` is present.
- `PreviewStage.map.ts` (`selectStates`, `toKebabCase`) — **no change**. Reused as-is.
- `PreviewStage.tsx` branching becomes, in order:
  1. `!preview` → unchanged "Preview not found" message (`data-testid="testbed-missing"`).
  2. `preview` found → always render the switcher nav (never conditional on `stateName`).
  3. Below the switcher, exactly one of:
     - no `stateName` → placeholder message, `data-testid="testbed-no-selection"`, copy exactly **"Select a state above to preview it."**
     - `stateName` set and `selectStates` returns one match → render that state's `<section>` (unchanged markup/testid: `data-testid="testbed-state-${toKebabCase(state.name)}"`).
     - `stateName` set and `selectStates` returns no match → unchanged unknown-state message, `data-testid="testbed-missing"`, copy exactly `No state named "<stateName>". Available: <comma-separated state names>.`

### Markup (replaces `PreviewStage.tsx:35-48` and the `{states.map(...)}` block below it)
```tsx
{preview && (
  <nav aria-label="Preview states" data-testid="testbed-state-list">
    <ul className={styles.stateList}>
      {preview.states.map((state) => {
        const isActive = stateName?.toLowerCase() === state.name.toLowerCase();
        return (
          <li key={state.name} className={styles.stateListItem}>
            <Link
              href={`/testbed/${slug}?state=${state.name}`}
              className={styles.stateLink(isActive)}
              aria-current={isActive ? 'page' : undefined}
            >
              {state.name}
            </Link>
          </li>
        );
      })}
    </ul>
  </nav>
)}

{preview && !stateName && (
  <p className={styles.message} data-testid="testbed-no-selection">
    Select a state above to preview it.
  </p>
)}

{preview && stateName && states.length === 0 && (
  <p className={styles.message} data-testid="testbed-missing">
    No state named &quot;{stateName}&quot;. Available: {availableStates}.
  </p>
)}

{states.map((state) => (
  <section
    key={state.name}
    className={styles.state}
    aria-label={state.name}
    data-testid={`testbed-state-${toKebabCase(state.name)}`}
  >
    <h2 className={styles.stateName}>{state.name}</h2>
    <div className={styles.canvas}>{state.render()}</div>
  </section>
))}
```
No `role="tablist"`/`role="tab"`/`role="tabpanel"` anywhere — plain `<nav>`/`<ul>`/`<li>`/`<Link>` with `aria-current="page"` on the active one, which is the standard "which nav item matches the current URL" pattern and is honest about these being real links.

### `PreviewStage.styles.ts` changes
Add `import { cn } from '@/lib/utils';` at the top. Change these three keys, keep every other key as-is:
```ts
stateList: 'flex flex-wrap gap-2',
stateListItem: 'flex',
stateLink: (isActive: boolean) =>
  cn(
    'inline-flex min-h-11 items-center rounded-lg border px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none md:min-h-9',
    isActive
      ? 'border-primary bg-primary/20 font-semibold text-primary'
      : 'border-border bg-transparent text-muted-foreground hover:bg-primary/10 hover:text-foreground',
  ),
```
`styles.message` and `styles.canvas` are unchanged and reused as-is for the new placeholder.

### States table (confirmed, with the testid/role corrections folded in)
| State | What renders | `data-testid` | Trigger |
|---|---|---|---|
| Preview not found | Header "Preview not found" + message | `testbed-missing` | `findPreview(slug)` undefined (unchanged) |
| No state selected | Switcher nav (all links, none `aria-current`) + placeholder paragraph | nav: `testbed-state-list`; message: `testbed-no-selection` | Preview found, no `?state=` |
| One state selected | Switcher nav (matching link has `aria-current="page"` and active classes) + that state's `<section>` | nav: `testbed-state-list`; section: `testbed-state-<kebab-name>` | Valid `?state=` |
| Unknown state | Switcher nav (no link active) + unknown-state message | nav: `testbed-state-list`; message: `testbed-missing` | `?state=` doesn't match any state name |
| Link default | `border-border bg-transparent text-muted-foreground` | — | not the current `stateName` |
| Link hover | `hover:bg-primary/10 hover:text-foreground` | — | pointer hover |
| Link focus | `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` | — | keyboard focus |
| Link active/current | `border-primary bg-primary/20 font-semibold text-primary` + `aria-current="page"` | — | matches current `stateName` (case-insensitive) |

### Copy (unchanged from ui-designer-a)
- Placeholder: **"Select a state above to preview it."**
- Unknown-state: `No state named "<stateName>". Available: <comma-separated state names>.`
- Preview-not-found: `No preview is registered with the slug "<slug>".`
- Link label: the state's `name` field, unchanged.

### Accessibility (final)
- No fake widget roles. `<nav aria-label="Preview states">` is a real landmark; `<Link>`s are real links; `aria-current="page"` marks the one matching the URL, same semantics as any "active nav item" pattern elsewhere on the web — truthful to assistive tech.
- Keyboard: native Tab order through the `<ul>` of links, Enter activates — no custom handler needed, and no implied-but-missing arrow-key support to explain away.
- Focus ring: `focus-visible:ring-2 focus-visible:ring-ring` on every link (existing project pattern, token unchanged).
- Contrast: unchanged token pairs already used in `TestbedSidebar.styles.ts`, no new risk.
- Touch target: `min-h-11 md:min-h-9` plus `px-3` keeps the link's hit area comfortably above the 24×24 px floor and close to 44×44 px on mobile, consistent with `TestbedSidebar.styles.ts:16`.
- Motion: none introduced; instant content swap as today.

### Mobile (390×844)
Unchanged from ui-designer-a's spec: `flex flex-wrap gap-2` wraps the link row onto multiple lines at narrow widths; canvas/message stays full-width below it; `TestbedSidebar` already collapses out of the way on non-index routes and is unaffected.

### Acceptance criteria (carried over, testids corrected)
- [ ] Visiting `/testbed/<slug>` with no `?state=` shows every state name as a link inside `data-testid="testbed-state-list"`, none with `aria-current`, and `data-testid="testbed-no-selection"` shows "Select a state above to preview it." — no state's component renders.
- [ ] Clicking a state link navigates to `/testbed/<slug>?state=<name>`; the same `testbed-state-list` nav is still present with all links; the clicked link has `aria-current="page"` and the active classes; `data-testid="testbed-state-<kebab-name>"` renders, and no other state's section does.
- [ ] From a selected state, clicking a different link moves `aria-current`/active styling to the new link and swaps which section renders; the previously active link returns to default styling.
- [ ] Visiting `/testbed/<slug>?state=<unknown-name>` shows the full `testbed-state-list` (no link with `aria-current`) and `data-testid="testbed-missing"` with `No state named "<unknown-name>". Available: <comma-separated names>.`
- [ ] Visiting `/testbed/<unknown-slug>` shows "Preview not found" and `testbed-missing` with the not-registered message; no `testbed-state-list`, no canvas.
- [ ] Every link reaches focus via Tab in DOM order with a visible focus ring; Enter activates it.
- [ ] At 390 px width, the link row wraps onto additional lines instead of overflowing or scrolling horizontally; the message/canvas stays full width below it.

### Files implementer-a touches
- `src/testbed/components/PreviewStage/PreviewStage.tsx`
- `src/testbed/components/PreviewStage/PreviewStage.styles.ts`
- `src/testbed/components/PreviewStage/PreviewStage.test.tsx` (existing assertions on `testbed-state-list` as a list of links still hold; add/update cases for `testbed-no-selection`, `aria-current`, and "switcher still present after a state is selected")

No other file needs a change.
