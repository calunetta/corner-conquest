# Plan: Match Format mode-selection cards in CreateGameDialog

Status: APPROVED
Inputs: triage.md, ui-design.md (Final spec)

## Goal and acceptance criteria
- [ ] `CreateGameDialog.tsx`'s Match Format `Select` (lines 43-56) is replaced by a 2x2 grid of 4
      cards (icon-in-circle + title + meta), same `maxPlayers` values, same option text split into
      title/meta per ui-design.md's Copy table.
- [ ] `CreateGameDialog.preview.tsx`'s `CreateGameDialogView` (lines 49-62) gets the identical
      replacement, driven by `props.maxPlayers`/`props.onMaxPlayersChange`, so the testbed previews
      used by the acceptance screenshots show the new cards, not the old dropdown.
- [ ] Selected card shows amber border/glow/scale per the States table; unselected shows
      `border-white/10`; hover/focus/`aria-pressed` all present; `motion-reduce` disables the scale pop.
- [ ] `role="group" aria-labelledby="maxPlayers"` wraps the grid; `Label` gets `id="maxPlayers"` in
      addition to its existing `htmlFor="maxPlayers"`.
- [ ] No `SelectTrigger`/`SelectContent`/`SelectItem`/`SelectValue` remains for Match Format in either
      `CreateGameDialog.tsx` or `CreateGameDialog.preview.tsx`. `Select`/`SelectValue` imports removed
      from both files once unused (verify nothing else in either file still uses them).
- [ ] `npm run typecheck`, `npm run lint`, `npm test` pass.
- [ ] Testbed preview `lobby-create-dialog` ("Multiplayer" and "Solo vs bot" states), desktop
      (1280x720) and mobile (390x844), verified in the browser per ui-verify: 4 cards, correct
      selected card, no clipped/wrapped text, visible focus ring on Tab.

## Verified context
| Symbol or file | Location | Why it matters |
|---|---|---|
| Match Format `Select` block | `CreateGameDialog.tsx:43-56` | exact block being replaced |
| `factionButton`/`factionButtonSelected`/`factionButtonUnselected` | `CreateGameDialog.styles.ts:16-18` | source values new `formatCard*` tokens copy (ui-design.md confirms byte-identical) |
| `factionGrid` | `CreateGameDialog.styles.ts:15` | `gap-2` precedent reused by `formatGrid` |
| `toFactionOptions()` | `CreateGameDialog.map.ts:5-11` | existing precedent: a pure `.map.ts` function producing a static options array for a card grid — `toFormatOptions()` follows the same shape |
| `FactionOption` type | `CreateGameDialog.types.ts:16-20` | precedent for the new `FormatOption` type |
| `CreateGameDialogViewModel.factionOptions` | `CreateGameDialog.types.ts:36` | precedent for adding `formatOptions` to the view model |
| `useCreateGameDialog` return object | `CreateGameDialog.hook.ts:48-67` | where `formatOptions: toFormatOptions()` is added; `onMaxPlayersChange: setMaxPlayers` already exists at line 52, unchanged |
| `maxPlayers === 1` Debug Training Mode block | `CreateGameDialog.tsx:70-90` | unaffected, confirmed by ui-design.md:38-40 |
| `CreateGameDialogView` (preview's own copy of the dialog markup) | `CreateGameDialog.preview.tsx:25-113`, Select block at 49-62 | second, independent location needing the identical card-grid replacement, driven by `props.*` not `vm.*` |
| `createGameDialogPreview` states | `CreateGameDialog.preview.tsx:140-154` | `'Multiplayer'` (maxPlayers 4) and `'Solo vs bot'` (maxPlayers 1) — the two acceptance-criteria screenshot targets, already registered in `src/testbed/registry.ts:35,75` — no registry change needed |
| `CreateGameDialog.test.tsx` | whole file | current tests never assert on the `Select`/`SelectItem` markup directly (only on button/text content), so none break by construction; still must add explicit card-grid coverage |
| `CreateGameDialog.hook.test.ts:206-211` | existing `factionOptions mirrors...` test | precedent pattern for a new `formatOptions mirrors CreateGameDialog.map.toFormatOptions()` test |
| `CreateGameDialog.map.test.ts` | whole file (`toFactionOptions` tests) | precedent pattern for new `toFormatOptions` tests |
| Icons `Bot`, `Swords`, `Users`, `Crown` | `node_modules/lucide-react/dist/esm/icons/{bot,swords,users,crown}.js` | verified present (ui-design.md:48) |
| `LucideIcon` type | `node_modules/lucide-react/dist/lucide-react.d.ts:17` | type for `FormatOption.icon` |
| `defaultCreateGameDialogProps` | `CreateGameDialog.fixtures.ts:3-7` | existing fixture, unaffected — no `maxPlayers`/format fixture exists today because the hook owns that state; no fixture change needed |
| `index.ts` | `CreateGameDialog/index.ts:1` | public API, unchanged (`CreateGameDialog` export only) |
| e2e specs | `grep -rl "Match Format\|maxPlayers" e2e/` → no hits | no e2e spec references this control; no e2e file to edit |

## Decisions
- Add `toFormatOptions()` to `CreateGameDialog.map.ts` (pure, no args, static data) rather than
  inlining the 4-option array in both `.tsx` files, because ui-designer-b's review flagged the real risk
  here: the preview holds its own independent copy of the markup. A single shared data source consumed
  by both `CreateGameDialog.tsx` and `CreateGameDialog.preview.tsx` makes drift impossible instead of
  relying on both implementers to keep two literal arrays in sync by hand. Rejected: inline array literal
  in each `.tsx` (duplicates the 4-row table, the exact kind of two-copies-that-must-change-together DRY
  violation the `kiss-dry-solid` skill flags).
- `FormatOption.icon` is typed `LucideIcon` and stored as a component reference (not JSX) in
  `.map.ts`, mirroring how `FactionOption.spriteSrc` stores a path, not an `<Image>` element — the `.map.ts`
  file returns data, the `.tsx` renders it. Rejected: resolving the icon to an element inside `.map.ts`
  (violates the "no React in `.map.ts`" rule in `component-architecture`).
- Native `<button>` grid, not shadcn `RadioGroup`, per ui-design.md:43-46 (explicit triage ask for visual
  consistency with the sibling faction grid in the same dialog, which already uses plain buttons).
- No hook logic change beyond adding `formatOptions` to the returned view model — `onMaxPlayersChange`
  already does exactly what the cards need (`CreateGameDialog.hook.ts:52`). Rejected: adding a
  `selectedFormatLabel` or similar derived field (no acceptance criterion needs it; the `.tsx` has
  everything it needs from `opt.value === vm.maxPlayers`).

## File plan
| File | New / Edit | Responsibility | Owner |
|---|---|---|---|
| `CreateGameDialog.types.ts` | edit | Add `FormatOption` type; add `formatOptions: FormatOption[]` to `CreateGameDialogViewModel` | implementer-a |
| `CreateGameDialog.map.ts` | edit | Add `toFormatOptions(): FormatOption[]`, the static 4-entry table from ui-design.md's Copy table | implementer-a |
| `CreateGameDialog.hook.ts` | edit | Import `toFormatOptions`; add `formatOptions: toFormatOptions()` to the returned view model | implementer-a |
| `CreateGameDialog.styles.ts` | edit | Add `formatGrid`, `formatCard`, `formatCardSelected`, `formatCardUnselected`, `formatIconCircle`, `formatIconCircleSelected`, `formatIconCircleUnselected`, `formatIconSize`, `formatTextGroup`, `formatTitle`, `formatMeta` tokens (exact values from ui-design.md "Components and tokens"); remove `selectTrigger`/`selectContent` tokens only if nothing else in the file still references them (verify first) | implementer-b |
| `CreateGameDialog.tsx` | edit | Replace the Match Format `Select` block (lines 43-56) with the card grid; remove now-unused `Select`/`SelectContent`/`SelectItem`/`SelectTrigger`/`SelectValue` import if nothing else in the file uses them | implementer-b |
| `CreateGameDialog.preview.tsx` | edit | Apply the identical replacement inside `CreateGameDialogView` (lines 49-62), driven by `props.maxPlayers`/`props.onMaxPlayersChange`/`props.formatOptions`; same import cleanup as `.tsx` | preview-a |
| `CreateGameDialog.map.test.ts` | edit | Add `describe('toFormatOptions', ...)`: returns 4 entries, values `[1,2,3,4]` in order, titles/metas match the Copy table exactly | tester-a |
| `CreateGameDialog.hook.test.ts` | edit | Add a `formatOptions mirrors CreateGameDialog.map.toFormatOptions()` test (pattern at line 206) | tester-a |
| `CreateGameDialog.test.tsx` | edit | Replace any format-dropdown assumptions with: 4 format cards render with their titles; clicking each updates `aria-pressed` and, for value 1 only, reveals the Debug Training Mode row; Tab order reaches all 4 cards before the faction grid | tester-b |

Registry (`src/testbed/registry.ts`) needs no edit: `createGameDialogPreview` is already imported and
registered (lines 35, 75).

## Contracts
```ts
// CreateGameDialog.types.ts additions
import type { LucideIcon } from 'lucide-react';

export type FormatOption = {
  value: number;       // maxPlayers: 1 | 2 | 3 | 4
  title: string;       // "Solo vs. Bot AI" | "2 Players" | "3 Players" | "4 Players"
  meta: string;        // "Training match" | "1v1 Duel" | "Archipelago Skirmish" | "Grand Conquest"
  icon: LucideIcon;     // Bot | Swords | Users | Crown, respectively
};

// CreateGameDialogViewModel: add one field, nothing removed
export type CreateGameDialogViewModel = {
  // ...existing fields unchanged...
  formatOptions: FormatOption[];
};

// CreateGameDialog.map.ts addition
export function toFormatOptions(): FormatOption[]; // returns the 4 entries above, in value order 1,2,3,4

// CreateGameDialog.hook.ts: one line added to the returned object
// formatOptions: toFormatOptions(),

// CreateGameDialog.styles.ts additions (exact values, from ui-design.md "Components and tokens")
// formatGrid: 'grid grid-cols-2 gap-2'
// formatCard: 'flex items-center gap-2.5 p-2.5 rounded-xl border transition-all duration-200 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
// formatCardSelected: 'border-amber-400 bg-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.4)] scale-105 motion-reduce:transition-none motion-reduce:scale-100'
// formatCardUnselected: 'border-white/10 bg-black/30 hover:border-white/20 hover:bg-black/50'
// formatIconCircle: 'h-9 w-9 rounded-xl flex items-center justify-center shrink-0 border transition-colors duration-200'
// formatIconCircleSelected: 'bg-amber-500/20 border-amber-500/30 text-amber-400'
// formatIconCircleUnselected: 'bg-black/40 border-white/10 text-muted-foreground'
// formatIconSize: 'h-4 w-4'
// formatTextGroup: 'min-w-0'
// formatTitle: 'text-xs font-bold text-foreground truncate'
// formatMeta: 'text-[10px] text-muted-foreground truncate'

// JSX shape for CreateGameDialog.tsx AND CreateGameDialog.preview.tsx's CreateGameDialogView
// (identical in both files; CreateGameDialog.tsx reads from `vm.*`, the preview reads from `props.*`):
//
// <div className={styles.formGroup}>
//   <Label id="maxPlayers" htmlFor="maxPlayers" className={styles.label}>Match Format</Label>
//   <div role="group" aria-labelledby="maxPlayers" className={styles.formatGrid}>
//     {vm.formatOptions.map((opt) => {
//       const Icon = opt.icon;
//       const isSelected = vm.maxPlayers === opt.value;
//       return (
//         <button key={opt.value} type="button" aria-pressed={isSelected}
//           onClick={() => vm.onMaxPlayersChange(opt.value)}
//           className={`${styles.formatCard} ${isSelected ? styles.formatCardSelected : styles.formatCardUnselected}`}>
//           <div className={`${styles.formatIconCircle} ${isSelected ? styles.formatIconCircleSelected : styles.formatIconCircleUnselected}`}>
//             <Icon className={styles.formatIconSize} />
//           </div>
//           <div className={styles.formatTextGroup}>
//             <div className={styles.formatTitle}>{opt.title}</div>
//             <div className={styles.formatMeta}>{opt.meta}</div>
//           </div>
//         </button>
//       );
//     })}
//   </div>
// </div>
```

## Phases
### Phase 1: Match Format card grid
1. implementer-a: add `FormatOption` to `CreateGameDialog.types.ts`, add `formatOptions` to the view
   model.
2. implementer-a: add `toFormatOptions()` to `CreateGameDialog.map.ts` with the 4 entries (icons: `Bot`
   for value 1, `Swords` for 2, `Users` for 3, `Crown` for 4 — matching ui-design.md:47-49's mapping).
3. implementer-a: wire `formatOptions: toFormatOptions()` into `CreateGameDialog.hook.ts`'s return.
4. implementer-b: add the `formatGrid`/`formatCard*`/`formatIconCircle*`/`formatTextGroup`/`formatTitle`/
   `formatMeta` tokens to `CreateGameDialog.styles.ts`.
5. implementer-b: replace the Match Format `Select` block in `CreateGameDialog.tsx` with the card grid
   per the Contracts JSX shape, reading from `vm.*`; drop now-unused `Select` imports if confirmed unused.
6. preview-a: apply the identical replacement inside `CreateGameDialogView` in
   `CreateGameDialog.preview.tsx`, reading from `props.*`; drop now-unused `Select` imports if confirmed
   unused; no registry change needed (already registered).
7. tester-a: `toFormatOptions` tests in `CreateGameDialog.map.test.ts`; `formatOptions` mirror test in
   `CreateGameDialog.hook.test.ts`.
8. tester-b: update `CreateGameDialog.test.tsx` per the Test plan below.
9. preview-b / whichever agent runs ui-verify: screenshot `lobby-create-dialog` "Multiplayer" and
   "Solo vs bot" states at 1280x720 and 390x844; Tab through the dialog to confirm focus order and
   visible focus ring; confirm `prefers-reduced-motion` disables the `scale-105` pop.

Model escalation: none — this is a mechanical port of an existing, approved pattern
(`factionButton*` → `formatCard*`), no new logic.

## Test plan
- tester-a (logic, first):
  - `toFormatOptions()` returns exactly 4 entries with `value` `[1, 2, 3, 4]` in that order.
  - Each entry's `title`/`meta` matches the Copy table exactly: `(1, "Solo vs. Bot AI", "Training
    match")`, `(2, "2 Players", "1v1 Duel")`, `(3, "3 Players", "Archipelago Skirmish")`,
    `(4, "4 Players", "Grand Conquest")`.
  - Each entry's `icon` is the correct component reference (`Bot`/`Swords`/`Users`/`Crown`).
  - `useCreateGameDialog(...).formatOptions` equals `toFormatOptions()` (mirror test, same pattern as
    the existing `factionOptions` mirror test at `CreateGameDialog.hook.test.ts:206-211`).
- tester-b (view and e2e; no e2e spec exists for this control, RTL only):
  - All 4 format cards render with their title text ("Solo vs. Bot AI", "2 Players", "3 Players",
    "4 Players").
  - Default render (maxPlayers starts at 4): the "4 Players" card has `aria-pressed="true"`, the other
    three have `aria-pressed="false"`.
  - Clicking the "Solo vs. Bot AI" card sets its `aria-pressed="true"`, the previously-selected card's
    `aria-pressed="false"`, and reveals the Debug Training Mode row (already-existing text check,
    `screen.getByText('Debug Training Mode')`).
  - Clicking a non-1 card after the Debug Training Mode row is visible hides that row again.
  - No `role="combobox"`/`SelectTrigger` element remains for Match Format (query by the removed
    `Select format` placeholder text — assert `screen.queryByText('Select format')` is null).
  - Tab order: starting from the Game Name input, 4 Tab presses reach each format card in order
    (1, 2, 3, 4) before reaching the first faction button.

## Preview states
- `lobby-create-dialog` (existing, unchanged slug/states): `Multiplayer` (maxPlayers 4, `formatOptions`
  resolved inside `CreateGameDialogView` via `props.formatOptions`) and `Solo vs bot` (maxPlayers 1) —
  both already defined at `CreateGameDialog.preview.tsx:140-154`; no new states needed, only the
  markup inside `CreateGameDialogView` changes.

## Risks
- Two independent copies of the dialog markup (`CreateGameDialog.tsx` and `CreateGameDialog.preview.tsx`)
  must both change or the preview-based acceptance screenshots silently keep showing the old dropdown —
  mitigated by giving the preview edit its own explicit file-plan row (preview-a) and its own phase step,
  not folding it into implementer-b's step.
- Removing the `Select` import from either file without checking for other uses would break the build —
  mitigated by an explicit "verify unused first" instruction on both edit steps.

## Review (architect-b)
VERDICT: APPROVED

Re-review after architect-a's revision: both fixes landed correctly —
`formatIconSize: 'h-4 w-4'` is now in the Contracts token list (plan.md:114) and the File plan row
(plan.md:72), and the JSX contract (plan.md:133) reads `<Icon className={styles.formatIconSize} />`,
no inline literal left. `formatCard` (plan.md:108) now ends in
`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`, matching
`src/components/ui/button.tsx:9`'s pattern. No other section drifted out of sync with these two edits
(acceptance criteria, Decisions, Phases, Test plan all still consistent). Plan approved as written.

Original verification notes kept below for the record.

Verified independently (re-read every file, re-ran the e2e grep): every path, line range and symbol in
"Verified context" matches the repo exactly — `CreateGameDialog.tsx:43-56`/`44`/`70-90`, `.preview.tsx:49-62`,
`.styles.ts:13-18`, `.types.ts:16-20,22-39`, `.map.ts` whole file, `.hook.ts:48-67,52`, `.hook.test.ts:206-211`
(`it('factionOptions mirrors CreateGameDialog.map.toFactionOptions()'...)`), `.map.test.ts` whole file,
`.fixtures.ts`, `index.ts:1`, `registry.ts:35,75`. `grep -rl "Match Format\|maxPlayers" e2e/` → no hits, confirmed.
Icons `bot.js`/`swords.js`/`users.js`/`crown.js` exist under `node_modules/lucide-react/dist/esm/icons/`;
`LucideIcon` is exported from `node_modules/lucide-react/dist/lucide-react.d.ts`. No invented path found.
`.map.ts` importing a lucide-react component reference as data isn't blocked by any `no-restricted-imports`
rule in `eslint.config.mjs:76-113`. Design is appropriately minimal: one new type, one new pure map function,
one hook line, a token family mirroring an approved sibling pattern — no new primitive, no speculative options.

Two findings, both in the Contracts block (plan.md:106-142), both need a fix before implementers start:

1. **Inline literal `className="h-4 w-4"` on the icon (plan.md:132) repeats a known bug pattern.**
   `docs/ai/lessons-learned.md:53` records exactly this: a migrated `.tsx` with one inline `className="w-4 h-4"`
   on an icon instead of going through `.styles.ts` passed typecheck/lint silently and only surfaced on manual
   cross-review. `component-architecture`'s own rule ("No class strings in `.tsx`: the view uses `styles.x`")
   is violated here on a brand-new line the plan is dictating verbatim, not inherited debt. Fix: add
   `formatIconSize: 'h-4 w-4'` to the `CreateGameDialog.styles.ts` additions (File plan row + Contracts list)
   and change the JSX to `<Icon className={styles.formatIconSize} />` in both `.tsx` and `.preview.tsx`.

2. **`formatCard` token (plan.md:108, mirrored from ui-design.md:52) has no focus-visible ring, even though
   ui-design.md's own States table requires one.** ui-design.md:35: "Focus | `focus-visible:ring-2
   focus-visible:ring-ring` on the card button, visible regardless of selection state." The actual token value
   in both ui-design.md's "Components and tokens" and plan.md's Contracts omits it. Verified the sibling
   `factionButton`/`factionButtonSelected`/`factionButtonUnselected` tokens (`CreateGameDialog.styles.ts:16-18`)
   have the same gap and rely on the native unstyled browser focus outline (no `outline`/`focus-visible` reset
   found in `src/app/globals.css` or `tailwind.config.ts`) — so this isn't a new regression, the native outline
   will still be visible on Tab and the acceptance criterion (plan.md:23, "visible focus ring on Tab") will
   likely still pass by that pre-existing accident. But the plan explicitly wrote a States requirement it then
   doesn't implement, and an implementer following the Contracts verbatim (not re-deriving from
   ui-design.md's prose) ends up with an unstyled outline, not the themed ring the design review approved.
   Fix: add `focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none` to the `formatCard` token
   (pattern already used at `src/components/ui/button.tsx:9`) in both plan.md's Contracts and the styles.ts
   File plan row, so the Contracts implementers copy from already matches the approved design intent instead
   of silently depending on unstyled browser default.

Everything else holds: the DRY decision (shared `toFormatOptions()` instead of two literal arrays) is the
right call given the preview holds its own independent markup copy (verified: `.preview.tsx:49-62` is a
separate literal block from `.tsx:43-56`, confirmed by direct read of both). Native `<button>` choice matches
the sibling faction grid. Test plan correctly puts logic tests (`.map.test.ts`, `.hook.test.ts`) before view
tests. No docs/README.md update needed — grepped `docs/README.md` for "Match Format"/"SelectItem"/"maxPlayers":
no hits, this is a pure presentation change as triage.md states.

Once both fixes above are folded into the Contracts and File plan rows (styles.ts), this plan is ready to
build.
