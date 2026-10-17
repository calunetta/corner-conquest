# UI design: Icon Editor (testbed)

## Spec (ui-designer-a)

### Purpose and user story
As a developer customizing Corner Conquest's icon set, I want a testbed tool that lists every
registered icon grouped by module, lets me upload a replacement image and adjust its rotation and
size, and shows the result immediately, so that I can author `icon-overrides.config.json` without
hand-editing JSON or touching render-site code. (No render-site wiring in this task — see
`triage.md`; overrides are authored here only.)

### Placement and layout
- **Testbed nav**: a new entry in `TestbedSidebar` (`src/testbed/components/TestbedSidebar/`),
  slug `icon-editor`, registered in `src/testbed/registry.ts`'s `previews` array (File plan row:
  add `iconEditorPreview` import + array entry, same mechanism as `tileDecorationEditorPreview` at
  `src/testbed/registry.ts:49,103`). Label in the sidebar: **"Icon Editor"**.
- **Page shell**: rendered inside the existing `TestbedShell` (`src/testbed/components/TestbedShell/TestbedShell.tsx`)
  and `PreviewStage` at `src/app/testbed/[slug]/page.tsx` — no new page-level chrome.
- **Desktop (1280×720 reference)**: single scrollable column, not the 3-pane
  rail/canvas/inspector split `TileDecorationEditor` uses (there is no canvas to edit directly —
  rotation/size are numeric, not drag gestures). Top to bottom:
  1. A sticky header bar: title "Icon Editor", a one-line hint, and the global Save control
     (button + status text), `border-b border-white/10 bg-black/60 backdrop-blur-md` so it stays
     visible while the list scrolls — same glass treatment as `MapZoomControls.tsx`'s panel, not a
     new pattern.
  2. Below it, a scrollable list (`ScrollArea` or native overflow, whichever
     `IconEditor.tsx`'s implementer finds adequate) of `Accordion` sections, one per module
     (`src/components/ui/accordion.tsx`), each accordion trigger showing the module name (e.g.
     "combat", "cards", "hud", "map", "lobby", "session", "shared" — whatever `module` values
     exist in the hand-authored registry; this spec does not fix the list, the registry does) and
     a count badge of how many icons are overridden in that module. All sections start expanded by
     default (there is no large dataset yet — triage's scope is "everything in active use," a few
     dozen entries at most).
  3. Inside each section, one `IconEditorRow` per icon, full-width, stacked vertically (not a
     grid) so the rotation/size sliders have room — mirrors `TileDecorationEditorInspector`'s
     single-column field stack (`styles.fieldStack`), not `styles.imageGrid` (that grid is for
     picking an image to add, not for editing an existing icon's own properties).
  - Max content width: unconstrained up to the panel's width (`rounded-xl border border-white/10
    bg-black/60 backdrop-blur-md` panel matching `styles.panel` token recipe), centered in the
    `TestbedShell` detail column like every other testbed page.
- **Mobile (390×844)**: this is dev-only tooling with no map to protect (confirmed:
  `TileDecorationEditor.styles.ts:7` roots at `flex flex-col gap-6 md:flex-row` — it stacks
  vertically below `md`, it does not hide on mobile). Icon Editor follows the same rule: the
  sticky header, accordion list and each row's controls stack to full width in a single column;
  rotation/size sliders remain full-width `Slider` components (no shrinkage below their usable
  touch size). No element needs to collapse away because there is no map grid on this route.

### States
| State | What the developer sees | Trigger |
|---|---|---|
| Loading | Header renders; list area shows a centered `Loader2` spinner (`animate-spin`) and the text "Loading icons…" in `text-muted-foreground` | Initial mount, before the registry/overrides/upload-list fetch resolves |
| Default (no override) | Row's thumbnail shows the registry's default source at its default rotation (0°) and size (100%); no badge next to the label; rotation slider at 0, size slider at 100; no "Reset" button | Icon has no entry in `icon-overrides.config.json` and the developer hasn't changed its sliders this session |
| Overridden (saved, clean) | Thumbnail reflects the saved override's `src`/`rotation`/`size`; a small `Badge variant="outline"` reading "Overridden" next to the label (token: `text-accent`, same family as `styles.unsavedBadge`); a "Reset to default" `Button variant="outline" size="sm"` appears under the controls | Icon has a saved entry in the overrides config and matches what's on screen |
| Dirty (unsaved edit) | Thumbnail updates live as the slider/input changes (no save round-trip); row shows a "Unsaved changes" `Badge variant="outline"` (`text-accent`); the header's global Save button becomes enabled | Developer drags a rotation/size slider, types in its paired number input, or a new upload lands, before pressing Save |
| Upload in progress | The row's Upload `Button` shows `Loader2` spinner + disabled, label changes to "Uploading…"; thumbnail keeps showing the prior image until the upload resolves | Developer picks a file in the row's file input |
| Upload error | Inline text under the Upload button, `text-destructive`: "Could not upload — check the file type and try again." Upload button re-enabled, thumbnail unchanged | The upload `POST` to `/api/icon-editor/uploads` fails or the file extension is rejected client-side before the request |
| Saving (global) | Header Save `Button` disabled with `Loader2` spinner (icon swap, same as `TileDecorationEditorSaveRow`); status text area shows nothing yet (`statusText({status: 'saving'})` → visible but empty, matching the decoration editor's own `STATUS_TEXT.saving = ''`) | Developer presses the header Save button while at least one row is dirty |
| Saved (global) | Header status text reads "Saved." in `text-accent`; every row's "Unsaved changes" badge clears, dirty rows that had edits now read as Overridden/Default per their new state; Save button disables again (nothing left dirty) | `POST /api/icon-editor/overrides` resolves 2xx |
| Save error (global) | Header status text reads "Could not save — see console." in `text-destructive`; dirty state and badges are unchanged so the developer doesn't lose the edit | `POST /api/icon-editor/overrides` rejects or returns non-2xx |
| Empty module section | Not applicable — every module in the hand-authored registry has at least one icon by construction; no empty-section state is designed |

### Components and tokens
- Reuse (all paths verified this session):
  - `Accordion`, `AccordionItem`, `AccordionTrigger`, `AccordionContent` — `src/components/ui/accordion.tsx` — module grouping.
  - `Slider` — `src/components/ui/slider.tsx` — rotation and size controls.
  - `Input` (`type="number"`) — `src/components/ui/input.tsx` — exact-value companion to each slider, same pairing style as `TileDecorationEditorInspector.tsx:89-96`'s `Size (% of tile)` field.
  - `Button` — `src/components/ui/button.tsx` — Upload trigger, Reset-to-default, global Save.
  - `Badge` — `src/components/ui/badge.tsx` — "Overridden" / "Unsaved changes" badges, same `variant="outline"` + `text-accent` token combo as `TileDecorationEditorRail.tsx:90`'s unsaved badge.
  - `Tooltip`/`TooltipTrigger`/`TooltipContent` — `src/components/ui/tooltip.tsx` — icon-only buttons' accessible labels (e.g. Reset), same pattern as `TileDecorationEditorInspector.tsx:44-56`.
  - `next/image` with `unoptimized` — thumbnail rendering, same as `TileDecorationEditorInspector.tsx:52` and `TileDecorationEditorSprite.tsx`'s pattern for GIFs.
  - Panel chrome: `rounded-xl border border-white/10 bg-black/60 backdrop-blur-md` (`TileDecorationEditor.styles.ts:8`, `MapZoomControls.tsx`).
  - Icons: `lucide-react` — `Upload`, `RotateCw`, `Maximize2` (or `Scaling`, whichever exists in the installed `lucide-react` version — implementer verifies), `Loader2`, `Save`, `RotateCcw` (Reset).
- **One new pattern** (per the "at most one new visual pattern" rule): the Upload control is a
  visually-hidden `<input type="file">` wrapped by a `<label>` styled as a `Button`, since no
  existing component in this codebase wraps a file input as a button — `TileFog.preview.upload.tsx:37,41`
  is the only file-input precedent and it's an unstyled raw `<input type="file">` in a dev-only
  Playwright harness, not a user-facing control. Markup shape: `<Button asChild><label>…<input
  type="file" accept="..." className="sr-only" /></label></Button>`, reusing the `sr-only` token
  already in `TileDecorationEditor.styles.ts:67`.
- Tokens: `bg-black/60`, `backdrop-blur-md`, `border-white/10`, `text-muted-foreground`,
  `text-accent`, `text-destructive`, `bg-primary/15`, `focus-visible:ring-2
  focus-visible:ring-ring`, `motion-reduce:transition-none` / `motion-reduce:animate-none`. No raw
  hex values.

### Copy
- Sidebar entry: **"Icon Editor"**
- Header title: **"Icon Editor"**
- Header hint line: **"Upload a replacement image, or adjust rotation and size, then save."**
- Module accordion trigger: the module name as stored in the registry, lowercase, e.g. **"combat"**, **"cards"**, **"hud"**, **"map"**, **"lobby"**, **"session"**, **"shared"** — plus a trailing count badge, e.g. **"3 overridden"** (omit the badge when 0).
- Row label: the registry entry's `label` field verbatim (hand-authored, human-readable icon name).
- "Overridden" badge: **"Overridden"**
- "Unsaved changes" badge: **"Unsaved changes"** (verbatim reuse of `TileDecorationEditorRail.tsx:90`'s copy)
- Upload button idle: **"Upload image"**
- Upload button busy: **"Uploading…"**
- Upload error text: **"Could not upload — check the file type and try again."**
- Rotation field label: **"Rotation (degrees)"**
- Size field label: **"Size (% of default)"**
- Reset button: **"Reset to default"**
- Global Save button: **"Save"**
- Global save status — saved: **"Saved."** (verbatim reuse of `TileDecorationEditor.types.ts`'s `STATUS_TEXT.saved`)
- Global save status — error: **"Could not save — see console."** (verbatim reuse of `STATUS_TEXT.error`)
- Loading text: **"Loading icons…"**
- No-uploads-yet state is not applicable here (unlike the decoration editor's image picker, this
  tool has no "pick from existing uploads" grid — each row uploads its own replacement directly).

### Interactions and motion
- **Rotation**: one `Slider` per row, `min={0} max={359} step={1}`, paired with a `type="number"`
  `Input` of the same range/step; dragging the slider updates the input and vice versa (typing a
  value out of range clamps on blur via the hook's `clampRotation`, per `plan.md`'s File plan row
  for `IconEditor.map.ts`). Unit is degrees; 0° is the registry default orientation. Dragging
  updates the thumbnail's live preview immediately via an inline `transform: rotate(<deg>deg)` —
  the same "inline style carries computed per-instance geometry, Tailwind tokens carry everything
  static" convention `TileDecorationEditorSprite.tsx`'s positioning already follows.
- **Size**: one `Slider` per row, `min={25} max={200} step={5}`, paired `Input` of the same
  range/step. Unit is percent of the registry's default rendered size (100% = unchanged). Same
  live-preview wiring, via `transform: scale(<pct/100>)` composed with the rotation transform on
  the same thumbnail element.
- **Upload**: clicking "Upload image" opens the OS file picker (`accept="image/png,image/jpeg,image/gif,image/webp"`,
  matching the decoration editor's own accepted-extension set at
  `src/app/api/tile-decoration-editor/images/route.ts:8`, minus `.jpg`/`.jpeg` duplication —
  kept as two MIME entries since both extensions map to `image/jpeg`). Selecting a file starts the
  upload immediately (no separate "confirm" step); on success the row's override `src` updates to
  the returned public path and the row becomes dirty; on failure the row shows the upload-error
  text and keeps its prior image.
- **Reset to default**: visible only when the icon currently has a saved override; clicking it
  clears that icon's override (sets `src`/`rotation`/`size` back to the registry defaults) and
  marks the row dirty (an explicit Save is still needed to persist the deletion, consistent with
  every other row-level edit requiring the one global Save).
- **Save**: one global action in the sticky header, not per-row — mirrors
  `TileDecorationEditorSaveRow`'s single save for a whole layout. Disabled unless at least one row
  is dirty. Saves the full `IconOverridesConfig` in one `POST`.
- **Keyboard**: `Slider` and `Input` are both natively focusable and operable (arrow keys on the
  slider thumb, typing in the input); `Accordion` triggers are keyboard-toggleable per Radix
  defaults (no extra work, same note as `TileDecorationEditorModeTabsBar.tsx`'s Tabs comment).
- **Motion**: the save status text's opacity transition and any spinners use
  `transition-opacity duration-200 motion-reduce:transition-none` / `animate-spin
  motion-reduce:animate-none`, verbatim reuse of `TileDecorationEditor.styles.ts:29-39`'s
  `statusText`/`spinner` recipes.

### Accessibility
- Upload control: the wrapping `<label>` provides the accessible name ("Upload image"); the
  hidden `<input type="file">` keeps `accept` so screen readers and file pickers still announce
  the restriction. The visible `Button` is not itself a `<button>` nested inside a `<label>`
  inside another interactive element — use `asChild` so the `label` is the single interactive
  element, avoiding nested-interactive-control violations.
- Each `Slider` gets `aria-label` naming the icon and field, e.g. `aria-label="Rotation for Sword
  icon, degrees"`, since there's no visible `<label for>` wiring a native label to a Radix
  `Slider.Root` by default (same gap `TileDecorationEditorInspector.tsx:89` avoids by wrapping its
  `Input` in a `<label>` — the Slider here can't reuse that exact technique, so it needs the
  explicit `aria-label` instead).
- Badges are never the only signal of state: "Overridden" and "Unsaved changes" are always paired
  with the row's own control states (thumbnail content, slider/input values) — never color alone.
- Focus is visible on every interactive control via `focus-visible:ring-2 focus-visible:ring-ring`
  (inherited from the `Slider`/`Input`/`Button` primitives' own styles — no override needed).
- Text contrast: `text-muted-foreground` on `bg-black/60`, `text-accent` and `text-destructive` on
  the same background all already meet 4.5:1 elsewhere in this app (`TileDecorationEditor`'s
  reuse of the same tokens); no new combination is introduced.
- Touch targets: Upload/Reset/Save buttons use the `Button` primitive's default `size="sm"` or
  larger (36px+ with padding); `Slider` thumbs are 20×20px per `slider.tsx:23` — below the 44px
  target guidance but this is dev-only tooling with a mouse-first audience (same trade-off the
  decoration editor's own drag-handles accept); not a regression to flag, since the primitive is
  reused verbatim rather than newly introduced.

### Acceptance criteria
- [ ] Testbed sidebar shows an "Icon Editor" entry; visiting its page renders without the
      previous route's content (new slug, own page).
- [ ] The list is grouped into one `Accordion` section per distinct `module` value in the
      registry; each section's trigger text matches that module name and all sections are
      expanded on first load.
- [ ] An icon with no saved override shows no "Overridden" badge, rotation slider at 0, size
      slider at 100.
- [ ] Dragging an icon's rotation slider to a non-zero value visibly rotates that row's thumbnail
      before Save is pressed, and shows an "Unsaved changes" badge on that row.
- [ ] Dragging an icon's size slider changes that row's thumbnail's rendered size before Save is
      pressed.
- [ ] Selecting a file via "Upload image" with an accepted extension (`.png`/`.jpg`/`.jpeg`/`.gif`/`.webp`)
      replaces that row's thumbnail image and marks the row dirty; the button shows "Uploading…"
      while the request is in flight.
- [ ] An icon with a saved override shows the "Overridden" badge and a "Reset to default" button;
      clicking Reset clears the badge's icon-level dirty display to the default thumbnail and
      marks the row dirty (pending Save).
- [ ] The header Save button is disabled with zero dirty rows and enabled with at least one dirty
      row; clicking it while enabled shows a spinner, then "Saved." in `text-accent` on success.
- [ ] At 390px viewport width, the header, accordion list and every row's controls remain full
      width in a single column with no horizontal scroll and no element hidden.
- [ ] Every `Slider` has an `aria-label` naming the icon and field (checked via the browser's
      accessibility tree or `getByRole('slider', { name: ... })` in a test).

## Review (ui-designer-b)
VERDICT: APPROVED (one fix folded into Final spec below — see finding 1)

1. **Upload control's focus-visible claim is wrong; fixed in place.** Accessibility section said
   focus rings come free from "the Slider/Input/Button primitives' own styles — no override
   needed." False for the upload control specifically. `Button asChild` (`src/components/ui/button.tsx:44-45`)
   renders `Slot`, which merges the Button's classes (including `focus-visible:ring-2
   focus-visible:ring-ring`) onto the single child — the `<label>`. But the actually-focusable
   element is the nested `<input type="file" className="sr-only">`, a second, separate node that
   Slot never touches. `sr-only` (`TileDecorationEditor.styles.ts:67`: `'sr-only'`) clips the input
   visually but leaves it in the tab order — so keyboard Tab lands on the invisible input, and the
   `focus-visible:ring-2` class sitting on the sibling `<label>` never fires, because that class
   triggers on the `label` itself receiving focus, not on a descendant. Net result: a keyboard user
   tabbing to Upload gets no visible focus indicator at all, failing this file's own "focus is
   visible on every interactive control" rule and the `ui-design` skill's accessibility section.
   Standard fix, folded into Final spec: add `focus-within:ring-2 focus-within:ring-ring` to the
   label's own classes (next to the Button-supplied classes Slot merges in) so the ring shows on
   the visible label whenever its child input has focus — no JS, no second focusable element. This
   is implementer-a's file (`IconEditor` row markup) to apply; flagging it here because it's a spec
   correction, not a new file.
2. **Minor, not blocking**: the "Upload" accept-list citation (`src/app/api/tile-decoration-editor/images/route.ts:8`)
   is a `GET`-only route that lists pre-existing files in `public/sprites/decorations/` — the
   decoration editor has no upload/`POST` route at all (confirmed: only `images/route.ts`,
   `layouts/route.ts`, `default-elements/route.ts` exist under `src/app/api/tile-decoration-editor/`,
   none accept uploads). The spec's claim is scoped correctly ("matching the decoration editor's
   own accepted-extension set", i.e. just the five-extension list, not an upload flow) and doesn't
   mislead architect-a, who already owns designing the new `POST /api/icon-editor/uploads` route
   from scratch per `triage.md`'s scope line. No change needed, noted for the record so a later
   reader doesn't assume an upload-route precedent exists.
3. **Specific checks requested by ui-designer-a:**
   - **Layout (Accordion/full-row-stack vs. 3-pane).** Right call. `TileDecorationEditor.styles.ts:6`'s
     3-pane root (`'flex flex-col gap-6 md:flex-row md:items-start'`) exists to host a rail (pick an
     image), a live canvas (drag/position on the tile), and an inspector (fields for the selection).
     Icon Editor has no canvas — rotation and size are typed/sliders, not drag gestures — so there's
     nothing for a center pane to show. Collapsing to one scrollable column of per-icon rows is
     simpler and avoids an empty or redundant middle pane. Approved.
   - **New pattern (label-wrapped file input as Button).** Justified: verified no styled upload
     button exists anywhere else in the codebase — `TileFog.preview.upload.tsx:37,41` is a raw
     unstyled `<input type="file">` in a Playwright-only harness, confirmed by Read. The `Button
     asChild` + `<label>` + `sr-only` input markup is the correct minimal way to get a styled,
     accessible file trigger with the primitives this codebase already has (`Button`'s `asChild`
     prop confirmed at `src/components/ui/button.tsx:40,44-45`; `sr-only` token confirmed at
     `TileDecorationEditor.styles.ts:67`). One correction required and applied: the focus-visible
     gap in finding 1 above.
   - **Rotation (0–359, step 1) and size (25–200, step 5) ranges.** Both are directly
     `clamp(value, min, max)` with no wraparound logic, buildable as one-line pure functions
     (`clampRotation`, `clampSize`) exactly as `plan.md`'s File plan for `IconEditor.map.ts`
     expects. No existing rotation field exists anywhere in `src/modules/map/` to clash with
     (checked, no hits), so there's no consistency debt. One sensible, non-blocking alternative
     architect-a should at least consider: rotation could wrap modulo 360 instead of clamping
     (typing 370° meaning 10°, not clamped to 359°), which reads more naturally for an angle than a
     linear clamp — but clamping is simpler, consistent with how the paired `Input` for Size already
     clamps in this spec, and the spec's own acceptance criteria don't depend on wrap behavior. Not
     a blocker; leaving the choice as specified (clamp) is fine to ship.

## Final spec
Everything in the Spec section above (ui-designer-a), unchanged, with one correction:

### Correction to Accessibility section, Upload control
Replace the Upload-control accessibility bullet's focus claim. The wrapping `<label>` still
provides the accessible name ("Upload image") and `asChild` still keeps it the single interactive
element (no nested-interactive-control violation) — that part stands. But add, as part of the same
bullet: because the real focusable node is the hidden `<input type="file" className="sr-only">`,
not the `<label>` the Button's visual classes land on via `Slot`, the label's own class list must
include `focus-within:ring-2 focus-within:ring-ring` (alongside whatever classes `Slot` merges in
from `Button`) so a visible ring appears on the styled label whenever its child input is focused.
Without this, keyboard focus on Upload is invisible. Every other control's "focus-visible ring
needs no override" claim is unchanged and still correct (`Slider`, `Input`, and every other
`Button` usage in this spec are focused directly, not through a Slot-merged sibling).

All other sections (Purpose, Placement and layout, States, Components and tokens, Copy,
Interactions and motion, Acceptance criteria) carry over verbatim from the Spec section above —
no other change requested. Architect-a should treat this file's Spec section plus the one
correction above as the contract.
