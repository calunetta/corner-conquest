# UI design: Monster sprite upload tool

## Spec (ui-designer-a)

### Purpose and user story
As a content creator extending the monster pool, I want a testbed tool to upload a monster's idle sprite (and optional attack sprite), name it, set its level and boss flag, and trigger catalog regeneration, so that a new monster appears in the game without touching code. Scope per `game-design.md` Final spec and `triage.md`: this tool only creates new catalog entries (`public/monster/*.gif`, parsed `<name>-lvl<N>-idle.gif` + optional `-attack.gif`, `boss-` prefix). The four seed monsters (Lancer lvl1, Bear lvl2, Ogre lvl3, Minotaur lvl4 boss) are permanent and not editable or deletable from this tool.

### Placement and layout
New testbed tool `MonsterSpriteUploader`, registered in `src/testbed/registry.ts` (verified: `src/testbed/registry.ts:49,102` is where `TileDecorationEditor` is imported and listed) with `group: 'Dev tools'` (verified group string: `src/testbed/components/TileDecorationEditor/TileDecorationEditor.preview.tsx:7`), alongside Tile Decoration Editor. Slug: `monster-sprite-uploader`. Title: "Monster Sprite Uploader".

Reuses the two-column rail/canvas skeleton already established, but this tool has no mode tabs (unlike `TileDecorationEditorRailShell`, `src/testbed/components/TileDecorationEditor/TileDecorationEditorRailShell.tsx` — not needed here since there is only one mode) and no inspector column (no third panel): it is a single panel containing an upload form on top and a read-only catalog list below.

- Desktop (1280×720): one glass panel (`rounded-xl border border-white/10 bg-black/60 p-3 backdrop-blur-md`, token name `styles.panel` in `TileDecorationEditor.styles.ts:8`), max width ~640px, centered in the canvas column like `TileDecorationEditor`'s `canvasColumn` (`TileDecorationEditor.styles.ts:11`). Inside: an "Upload monster" form section (top) and a "Catalog" list section (below a `border-t border-white/10` divider, same pattern as `styles.saveRow`, `TileDecorationEditor.styles.ts:27`). The two live sprite previews (idle, attack) sit to the right of the form fields on desktop, in a `flex flex-row` row — side-by-side at ≥768px, matching the rail/canvas side-by-side breakpoint already used by `styles.root: 'flex flex-col gap-6 md:flex-row md:items-start'` (`TileDecorationEditor.styles.ts:7`).
- Mobile (390×844): this tool is not an overlay on the map grid — it is its own testbed page, same as Tile Decoration Editor's mobile layout (confirmed by screenshot: `test-results/ui-verify/testbed-tile-decoration-editor--mobile.png`, form stacks full-width below the page header). The form fields, previews, and catalog list stack vertically in one column, full width minus the page's existing padding. No map-grid constraint applies (this is a testbed page, not in-game HUD).

### States
| State | What the player sees | Trigger |
|---|---|---|
| Empty / idle | Form with 4 empty fields (Name, Level, Boss toggle, Idle file, Attack file) and two preview boxes showing dashed-border placeholders ("No idle sprite" / "No attack sprite", reusing `styles.emptyHint`'s dashed-border treatment, `TileDecorationEditor.styles.ts:57`). Catalog list below shows the current 4 seed entries plus any already-uploaded entries, each as a read-only row (sprite thumbnail, name, level badge, boss badge if applicable) — seed rows carry a "Seed" badge and no delete control. Submit button disabled (idle sprite required, name required). | Tool opened, nothing picked yet. |
| Idle sprite picked | Idle preview box replaces its placeholder with the picked GIF, looping, at the same size `AnimatedMonster` renders in-game (`MONSTER_SPRITE_SIZE_PX`, verified constant used at `src/modules/map/components/AnimatedMonster/AnimatedMonster.tsx:9,19-20`). Attack preview box still shows its placeholder until a file is picked there. | User selects a file in the Idle file input. |
| Attack sprite picked (optional) | Attack preview box replaces its placeholder with the picked GIF, looping. | User selects a file in the Attack file input (may be skipped). |
| Name/level/boss filled, ready | Submit button ("Add monster") becomes enabled once Name is non-blank, Level is 1-4, and an idle file is present. | All required fields valid. |
| Soft warning: boss at level 1/2 | Below the Boss toggle, an inline warning line appears: "Boss monsters at level 1-2 can make the center tile easier than usual. This is allowed — see the Final spec note below." Non-blocking: submit stays enabled. | Boss toggle is on and Level is 1 or 2. |
| Validating / submitting | Submit button shows a spinner (same `Loader2` + `animate-spin` treatment as `TileDecorationEditorSaveRow`, `TileDecorationEditor.styles.ts:39`, `TileDecorationEditorSaveRow.tsx:33`) and is disabled; form fields are disabled. | User clicks "Add monster". |
| Success | A status line below the form reads "Added — catalog regenerated." (reusing the `saved` variant of `styles.statusText`, `TileDecorationEditor.styles.ts:29-38`, accent-colored). Form resets to Empty/idle. The new entry is appended to the Catalog list via local optimistic state, not a re-fetch; the generated catalog file must contain the entry by the time the add-monster request resolves, so a page reload right after success also shows it. | The add-monster request succeeds. The exact request/response shape — one call doing both the file write and catalog regeneration, vs. two sequential calls — is not decided here; it is architect-a's call, following the `tile-fog-variants` single-`POST` precedent (`src/app/api/tile-fog-variants/route.ts`) unless there's a stated reason to split it. These UI states (one spinner while submitting, one status line on success/error) hold regardless of which shape is chosen. |
| Error: missing idle | Inline error under the Idle file field: "An idle sprite is required." Submit stays disabled until fixed. | User tries to submit with no idle file (defense-in-depth; submit is already disabled in this case, so this is reachable only via drag-drop-then-clear). |
| Error: malformed filename derivation | If Name contains characters outside `[a-z0-9]` after normalization leaves it empty (mirrors `toVariantId`'s behavior, verified at `src/app/api/tile-fog-variants/upload.ts:24-30`), inline error under Name: "Name needs at least one letter or digit." | User submits a name like "!!!" or leaves only punctuation. |
| Error: duplicate name+level | Server rejects (409); inline error under Name: "A monster named "<name>" at level <N> already exists." Form is not reset — the user's picks remain so they can rename or change level. | Submit with a name+level pair that already exists in the catalog (seed or uploaded). |
| Error: file too large / wrong type | Inline error under the offending file field: "Each file must be 2 MB or smaller." or "The idle sprite must be a GIF." / "The attack sprite must be a GIF.", mirroring the fog-variant route's existing messages and limit (verified: `src/app/api/tile-fog-variants/route.ts:38-42`, `MAX_UPLOAD_BYTES` at `src/app/api/tile-fog-variants/upload.ts:4`). | Client-side check on file pick, and server-side re-check on submit. |
| Error: server/regeneration failure | Status line shows the `error` variant of `styles.statusText` ("Could not add — see console."), matching `TileDecorationEditorSaveRow`'s existing error copy pattern (`TileDecorationEditorSaveRow.tsx:12`). Form fields remain filled so the user can retry. | The add-monster request fails, whatever its internal shape (upload write, regeneration step, or network failure). |
| Hover / Focus | File inputs, text input, level select and boss switch all show the standard `focus-visible:ring-2 focus-visible:ring-ring` ring (reusing `Input`'s and `Switch`'s built-in shadcn focus styles); catalog rows are read-only, not interactive, so no hover/focus state on them. | Keyboard or pointer focus. |

### Components and tokens
- Reuse: `Input` (`src/components/ui/input.tsx`) for Name; `Select` (`src/components/ui/select.tsx`) for Level (1-4); `Switch` (`src/components/ui/switch.tsx`) for the Boss toggle; `Button` (`src/components/ui/button.tsx`) for Submit; `Label` (`src/components/ui/label.tsx`) for field labels; native `<input type="file">` for Idle/Attack pickers, styled like `FogVariantUploadForm`'s file inputs (`src/modules/map/components/TileFog/TileFog.preview.upload.tsx:37,41`) but upgraded to the testbed's token classes (`styles.label`, `styles.fieldRow`, `styles.nameField` — `TileDecorationEditor.styles.ts:13-15`) instead of that preview page's raw Tailwind, since this tool lives in the main testbed shell, not a standalone lab page.
- Reuse: `next/image` with `unoptimized` for the two live GIF previews, same pattern as `AnimatedMonster.tsx:17-24` and `TileDecorationEditorSprite.tsx`.
- Reuse: `styles.panel`, `styles.panelTitle`, `styles.label`, `styles.fieldRow`, `styles.saveRow`, `styles.statusText`, `styles.spinner`, `styles.emptyHint`, `styles.imageGrid`/`styles.imageButton`-style treatment for the catalog list — all verified in `src/testbed/components/TileDecorationEditor/TileDecorationEditor.styles.ts`. New token names needed (document in the component's own `MonsterSpriteUploader.styles.ts`, following the existing per-component `.styles.ts` convention): `previewRow` (`flex flex-row gap-3`), `previewBox` (reuse `emptyHint`'s dashed-border idiom at a fixed square size matching `MONSTER_SPRITE_SIZE_PX`), `catalogRow` (reuse `layoutRow`'s row treatment, `TileDecorationEditor.styles.ts:18-25`, non-interactive variant — no `isActive`/hover state since rows aren't clickable), `catalogBadge` (small pill, reuse `Badge` component, `src/components/ui/badge.tsx`, variant `secondary` for "Seed" and variant `outline` with gold `text-accent` for "Boss").
- Tokens: `bg-black/60`, `border-white/10`, `text-muted-foreground`, `text-accent` (warnings/soft-nudge and success), `text-destructive` (errors), `ring-ring`. No raw hex.

### Copy
- Panel title: "Monster Sprite Uploader"
- Section heading 1: "Add a monster"
- Field labels: "Name", "Level", "Boss (center-tile eligible)", "Idle sprite (required)", "Attack sprite (optional)"
- Level select placeholder: "Select level" ; options: "1 — Little", "2 — Little", "3 — Big", "4 — Big" (matches the big/little split documented in `game-design.md` Final spec, "Big vs. little stays level-defined")
- Submit button (idle): "Add monster"
- Submit button (submitting): "Adding…"
- Preview placeholders: "No idle sprite" / "No attack sprite"
- Soft warning (boss + level 1/2): "Boss monsters at level 1-2 can make the center tile easier than usual — this is allowed." (no "see Final spec note" meta-reference in the real copy; that aside above was for this doc only)
- Status — success: "Added — catalog regenerated."
- Status — generic error: "Could not add — see console."
- Error — missing idle: "An idle sprite is required."
- Error — bad name: "Name needs at least one letter or digit."
- Error — duplicate: `A monster named "<name>" at level <N> already exists.`
- Error — file type: "The idle sprite must be a GIF." / "The attack sprite must be a GIF."
- Error — file size: "Each file must be 2 MB or smaller."
- Section heading 2: "Catalog"
- Catalog seed badge: "Seed"
- Catalog boss badge: "Boss"
- Catalog empty-of-uploads note (seed rows always present, so this only ever qualifies the uploaded section): none needed — seed rows guarantee the list is never empty.

### Interactions and motion
- Idle/attack file pickers: standard `<input type="file" accept="image/gif">`, client-side magic-byte check deferred to the server (the client only gates on MIME/extension, consistent with `FogVariantUploadForm` leaving signature verification to the route, `src/app/api/tile-fog-variants/route.ts:41-42`); on pick, the file is read into an object URL and shown immediately in the matching preview box — no server round-trip needed to preview.
- Boss toggle: `Switch` flips instantly; the soft-warning line fades in/out with `transition-opacity duration-200 motion-reduce:transition-none` (same class family as `styles.statusText`, `TileDecorationEditor.styles.ts:29`) rather than a hard show/hide, to stay consistent with the existing status-line motion and respect `prefers-reduced-motion`.
- Submit: standard form submit (Enter in the Name field submits if valid, mirroring `TileDecorationEditorNameField`'s Enter-to-confirm pattern, `TileDecorationEditorNameField.tsx:30-32`, adapted here to a full form instead of a single field). On success, the form clears and a new catalog row animates in with no special transition (plain re-render — matches the Tile Decoration Editor's save flow, which also has no custom insert animation).
- Catalog rows are static/read-only: no click, drag or delete affordance on seed rows (enforced by omission, not a disabled button — there is nothing to disable since the delete control simply isn't rendered for seed rows) or on uploaded rows in this phase (deletion/removal of uploaded entries is out of scope per `triage.md`'s Scope → Out section, which doesn't mention it, and `game-design.md`'s Final spec, which only describes the testbed tool as adding entries).

### Accessibility
- All form controls have an associated `Label` (via `htmlFor`/`id` pairing, the `Input`/`Select`/`Switch` components already support this — verified these are the shadcn primitives with built-in label association).
- File inputs get an explicit `aria-label` matching their visible label ("Idle sprite", "Attack sprite") since native file inputs need one even when wrapped in a `<label>`, following the project's documented gap-closing pattern for icon-only controls (CLAUDE.md "Accessibility" note on icon-only buttons needing `aria-label`, applied here to icon-less-but-unlabeled-by-default file inputs).
- Preview `<Image>` elements get `alt="Idle preview"` / `alt="Attack preview"` (not the monster's name, since the name may not be finalized while previewing).
- Soft warning and inline field errors use `role="status"` / `aria-live="polite"` for the warning (non-blocking, informational) and are associated with their field via `aria-describedby` for the blocking errors (missing idle, bad name, duplicate, file type/size) so screen readers announce them on submit.
- Keyboard path: Tab order follows DOM order (Name → Level → Boss switch → Idle file → Attack file → Submit); all interactive elements show `focus-visible:ring-2 focus-visible:ring-ring`.
- Contrast: all copy uses existing token classes (`text-foreground`, `text-muted-foreground`, `text-accent`, `text-destructive`) already verified ≥4.5:1 against the dark theme elsewhere in the codebase; no new colors introduced.

### Acceptance criteria
- [ ] `/testbed/monster-sprite-uploader` renders under the "Dev tools" group in the sidebar, next to "Tile Decoration Editor".
- [ ] With no fields filled, the "Add monster" button is disabled and both preview boxes show their dashed-border placeholder text.
- [ ] Picking an idle GIF shows it looping in the idle preview box at `MONSTER_SPRITE_SIZE_PX`; the attack preview box is unaffected.
- [ ] Toggling Boss on while Level is 1 or 2 shows the soft-warning line; toggling Level to 3 or 4, or Boss off, hides it; the Add monster button stays enabled throughout (non-blocking).
- [ ] Submitting with a name+level that already exists in the catalog list shows the duplicate inline error under Name and does not clear the form.
- [ ] Submitting with no idle file is unreachable via the button (disabled), confirmable by checking the button's `disabled` attribute.
- [ ] A successful submit shows "Added — catalog regenerated.", clears the form back to the Empty/idle state, and adds one new row to the Catalog list with the entered name, level badge, and (if set) Boss badge.
- [ ] The four seed rows (Lancer, Bear, Ogre, Minotaur) are always present in the Catalog list, each carrying a "Seed" badge, and none renders a delete/remove control.
- [ ] At 390px width the form, previews and catalog list stack in a single column with no horizontal overflow (screenshot comparison against `test-results/ui-verify/testbed-tile-decoration-editor--mobile.png`'s layout pattern).

## Review (ui-designer-b)
VERDICT: APPROVED (revision pass — all 3 requested fixes confirmed applied, no regressions)

**Re-check of the 3 fixes:**
1. Success-row trigger (Spec line 25) now states the call shape (one `POST` vs. two sequential calls) is undecided and is architect-a's call, following the `tile-fog-variants` single-`POST` precedent unless there's a stated reason to split it; user-visible states hold regardless. Matches the requested fix.
2. Success state (Spec line 25) now states the new catalog row is appended via local optimistic state, not a re-fetch, and that the generated catalog file must contain the entry by the time the request resolves (so a reload right after success also shows it). Matches the requested fix.
3. `TileDecorationEditorSaveRow.tsx` citation for the error copy corrected to `:12` (Spec line 30); verified against source: line 12 is `error: 'Could not save — see console.',`. Correct.

No other drift: placement, states table, tokens, copy, interactions, accessibility and acceptance criteria unchanged from the prior approved content.

### Superseded (prior pass)
The CHANGES REQUESTED verdict and findings below are from the previous review pass, now resolved by the fixes above.

VERDICT: CHANGES REQUESTED (superseded)

This is the independent challenge pass (the previous "Review"/"Final spec" above were written by ui-designer-a self-reviewing and are replaced here).

### Verified against code (all check out)
- `src/testbed/registry.ts:49,102` — import and listing of `tileDecorationEditorPreview`, confirmed by `grep -n`.
- `TileDecorationEditor.preview.tsx:7` — `group: 'Dev tools'`, confirmed.
- `TileDecorationEditor.styles.ts` — every cited token (`panel`:8, `canvasColumn`:11, `root`:7, `fieldRow`:15, `saveRow`:27, `statusText`:29-38, `spinner`:39, `emptyHint`:57, `layoutRow`:18-25, `nameField`:14) exists verbatim at the cited lines.
- `src/app/api/tile-fog-variants/upload.ts` — `MAX_UPLOAD_BYTES` (line 4), `toVariantId` (lines 24-30) match exactly.
- `src/app/api/tile-fog-variants/route.ts:38-42` — size/type error messages and status codes (413/400) match the spec's mirrored copy.
- `AnimatedMonster.tsx:9,19-20` — `MONSTER_SPRITE_SIZE_PX` import and width/height usage, confirmed.
- `TileDecorationEditorNameField.tsx:30-32` — Enter-to-confirm pattern, confirmed.
- `badge.tsx`, `select.tsx`, `switch.tsx`, `input.tsx`, `label.tsx`, `button.tsx` all exist in `src/components/ui/`.
- One off-by-one: the spec cites `TileDecorationEditorSaveRow.tsx:13` for the "Could not save — see console." error copy; the actual string is at line 12 (`error: 'Could not save — see console.',`), line 13 is the closing `};`. Cosmetic, folded into the Final spec below, no redesign needed.

### Findings requiring a fix

**1. Upload/regeneration call shape is not pinned down, and the spec doesn't flag this for architect-a — this is the gap the coordinator asked me to check.** The Success-state row says "Upload API call (`201`) and catalog-regeneration call succeed" — two calls. But `triage.md:32` records the locked decision as "the catalog is a generated static file ... regenerated **on upload**" (singular action), and `game-design.md`'s Final spec never splits upload from regeneration into two network round-trips. The fog-variants precedent the spec leans on (`route.ts` above) does both the file write and the config-append inside one `POST` handler, no second call. If the new route instead does two calls, that's a new shape the architecture stage must own, and the UI spec must not assume it. Fix: state in the spec that the exact request/response shape (one `POST` doing both steps, vs. upload-then-separate-regenerate) is **not decided here** and must be confirmed by architect-a, following the `tile-fog-variants` precedent of a single call unless the architect has a reason to split it. Until confirmed, the "Validating / submitting" and "Success" states describe only the user-visible result (one spinner, one status line) — not two sequential network calls — so the UI spec doesn't accidentally lock in a shape that's the architect's call.

**2. Initial catalog-list render state is missing.** The states table starts at "Empty / idle" with the 4 seed rows already present, implicitly treating the catalog as a synchronously available static import. That's consistent with `game-design.md`'s "generated catalog file" model (build-time artifact, not a runtime fetch) — fine for the seed rows. But the spec is silent on what the Catalog list and the "Add monster" button show in the moment right after a successful add, before the generated-catalog file has been re-imported/re-read (i.e., does the new row come from local optimistic state, or does the page need to re-fetch the regenerated catalog?). The Success-state row says "the new entry appears at the bottom of the Catalog list immediately" which implies optimistic client-side state, but nothing says so explicitly, and nothing covers what happens if the page is reloaded before the generated file is confirmed written (stale list vs. correct list). Fix: add one sentence to the Success state: "the new entry is appended to local component state immediately (optimistic); a page reload re-reads the regenerated catalog file, which must already contain it by the time the regeneration call has resolved."

**3. Minor: boss-pool soft-warning condition should be phrased level-set-aware, not hardcoded to {1,2}.** `game-design.md`'s Final spec ties "little" to levels 1-2 by rule (`monster-catalog.ts:25,36`), so hardcoding the warning to "Level is 1 or 2" is currently correct and fine to ship as literal copy — no fix needed, just confirming it isn't a magic number disconnected from the rule (it is the rule, restated). No action.

### Not reopened (already correct)
- Mobile placement: correctly scoped as a standalone testbed page, not in-game HUD, so the map-grid-visibility rule doesn't apply; Tile Decoration Editor's own mobile screenshot is a fair precedent.
- Accessibility: file-input `aria-label`s, `aria-live="polite"` for the non-blocking warning, `aria-describedby` for blocking field errors — closes the project's documented icon/unlabeled-control gap correctly.
- No new visual pattern beyond the dashed-border preview box, which reuses `styles.emptyHint` rather than inventing one — matches the "reuse before inventing" rule.
- Every acceptance criterion is DOM-attribute- or screenshot-checkable; the "unreachable via button" criterion is correctly tested via the `disabled` attribute rather than asserted as untestable.

## Final spec
All three fixes from the Review are folded into the Spec (ui-designer-a) section above:

1. **Upload/regeneration route shape left open for architecture.** The States table's Success row trigger no longer assumes two calls ("upload" + "regenerate"); it states the call shape is undecided here and is architect-a's call, following the `tile-fog-variants` single-`POST` precedent (`src/app/api/tile-fog-variants/route.ts`) unless there's a stated reason to split it. The user-visible states (one spinner while submitting, one status line on success/error) hold regardless of which shape is chosen.
2. **Success state now states the catalog-list update mechanism:** the new row is local optimistic state, not a re-fetch, and the generated catalog file must contain the entry by the time the request resolves, so a reload right after success also shows it.
3. **Citation fixed:** `TileDecorationEditorSaveRow.tsx:13` → `:12` (the `error:` string is on line 12).

No other changes. Placement, states, tokens, copy, interactions, accessibility and acceptance criteria are otherwise approved as written.

## Amendment (architect-a, Phase 3 planning — level caps)
Triage's level-cap decision (non-boss 1-3, boss 1-4; no level 5) was resolved with the user on 2026-10-17, after this doc's Final spec above was locked. The code already enforces this (`src/modules/game-rules/monster-catalog-generator.ts`'s `MAX_NON_BOSS_LEVEL`/`MAX_BOSS_LEVEL`, built during Phase 1). Three changes to this doc, nothing else:

1. **Level select is Boss-dependent, not always 1-4.** Options: "1 — Little", "2 — Little", "3 — Big" when Boss is off; add "4 — Big" when Boss is on. Toggling Boss off while Level 4 is selected clamps the selection down to 3 (the picker can never show an invalid combination — a UI-level guard, not a validation error the user has to notice and fix).
2. **"Name/level/boss filled, ready" state** (Spec line 22) now reads: "Submit button ('Add monster') becomes enabled once Name is non-blank, Level is 1-3 (non-boss) or 1-4 (boss), and an idle file is present." (was: "Level is 1-4").
3. **New error copy, defense-in-depth only (unreachable via the Level select itself, same category as the existing "missing idle" error):** "Non-boss monsters go up to level 3; boss monsters go up to level 4." — inline under the Level field, `aria-describedby`-associated like the other blocking field errors.

No other state, copy, token, interaction, accessibility note or acceptance criterion changes. Full detail (route shape, file plan, contracts) is in `plan.md`'s Phase 3 section.
