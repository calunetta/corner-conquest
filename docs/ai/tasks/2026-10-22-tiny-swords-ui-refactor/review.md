# Final review: Tiny Swords UI refactor, phase 1a

VERDICT: APPROVED

## Checks run
- `npm run typecheck`: clean (tsc --noEmit, no output)
- `npm run lint`: clean (eslint . --max-warnings 0, no output)
- `npm test`: coordinator reported 314 suites / 4419 tests pass; I re-ran `npx jest src/modules/pixel-ui`: Tests: 41 passed, 41 total
- ui-verify: screenshots read: `test-results/ui-verify/testbed-lobby-main--desktop.png`, `testbed-session-login--mobile.png`. Warm dark background, Pixelify Sans rendered, no overflow, text readable. Coordinator confirmed font load.

## Plan adherence
- layout.tsx: `Pixelify_Sans` with `--font-pixelify`, variables on `<html>`, `<body className="antialiased font-body">`, no `.className`. Met.
- tailwind.config.ts: `body`/`headline`/`pixel` start with `var(--font-pixelify)`, `readable` starts with `var(--font-outfit)`, `ink`/`paper` colours, `code` unchanged. Met.
- globals.css: `body {}` rule removed; `.dark` tokens match step 1a.3 exactly (diff read); chart-* unchanged; `--ink`/`--paper` added in `.dark` only; `:root` untouched. Met.
- theme-tokens.test.ts: table of all 34 dark tokens, ink/paper scoping, `:root` untouched, no body rule, no `font-family`, tailwind families and colours. Meaningful; reads file text because jsdom does not load the CSS.

## Findings
| # | File:line | Problem | Owner | Blocking? |
|---|---|---|---|---|
| 1 | src/app/globals.css:40-82 | `:root` (light) still has the old values; harmless as the app is dark only | none | no |

## Docs
- `docs-sync`: not needed in 1a; scheduled for 1e per plan. Lessons-learned entry (body font `.className` vs `font-body`) appended to `docs/ai/lessons-learned.md` under "Tailwind utility classes".

---

# Final review: Tiny Swords UI refactor, phase 1b (slice engine)

VERDICT: APPROVED

## Checks run
- `npm run typecheck`: clean (tsc --noEmit, no output)
- `npm run lint`: clean (eslint . --max-warnings 0, no output)
- `npx jest src/modules/pixel-ui`: Test Suites: 4 passed, 4 total; Tests: 79 passed, 79 total
- `npm test`: Test Suites: 317 passed, 317 total; Tests: 4457 passed, 4457 total
- Screenshots read: `test-results/ui-verify/testbed-slice-frame-state-NineSlice-20medium--desktop.png`, `testbed-slice-frame-state-ThreeSlice-20ribbon-20width-20320--mobile.png`, `testbed-slice-frame--desktop.png` (index, no state selected). Corners intact, no seams, pixelated edges.

## Plan adherence
- `pixel-ui.types.ts`, `asset-url.ts`, `slice.map.ts`, `SliceFrame.tsx`, `SliceFrame.styles.ts`, `index.ts` match the Contracts and DOM block line by line (style merge order, `height: fixedHeight ?? undefined`, `0` position when `total === size`).
- Asset paths exist on disk (WoodTable.png, Ribbon_Blue_3Slides.png).
- Registry: one import and one entry (`sliceFramePreview`, group 'Pixel UI'); other registry changes in the tree are unrelated.
- Tests: logic (percent math, scale, 3-slice, boundaries, no NaN, no mutation) before view tests; view tests assert behavior and ARIA, not classes.

## Findings
| # | File:line | Problem | Owner | Blocking? |
|---|---|---|---|---|
| 1 | src/modules/pixel-ui/components/SliceFrame/SliceFrame.preview.tsx:52 | `contentClassName="items-center justify-center"` has no effect: `styles.content` is `relative`, not flex (screenshot: ribbon text sits top-left). Add `flex` to the class string (Ribbon in 1c passes `flex ...` itself) | preview-a | no |
| 2 | src/modules/pixel-ui/slice.map.ts:33 | Repeats `sheet.rows.length === 1`; reuse `isThreeSlice` from line 32. | implementer-a | no |
| 3 | src/modules/pixel-ui/slice.map.ts:33-35 | Type narrowing via `sheet.rows[2]` relies on the length check; fine today, revisit if a sheet type is added | none | no |

## Docs
- `docs-sync` scheduled for 1e per plan. No lessons-learned entry needed.

---

# Final review: Phase 1c (Ribbon, PixelPanel)

VERDICT: APPROVED

## Checks run
- `npm run typecheck`: clean (tsc --noEmit, no output)
- `npm run lint`: clean (eslint . --max-warnings 0, no output)
- `npm test`: Test Suites: 321 passed, 321 total; Tests: 4556 passed, 4556 total (re-run after my `RIBBON_INSET` edit)
- Screenshots read: `test-results/ui-verify/testbed-pixel-ui-ribbon-state-Yellow--desktop.png` (before tune), `.../testbed-pixel-ui-panel-state-Titled-20paper--desktop.png`, `.../testbed-pixel-ui-panel-state-Variant-20carved--mobile.png`, and my re-capture of Yellow after the tune (scratchpad).

## Plan adherence
- Files match the File plan; `index.ts` exports `Ribbon`, `PixelPanel` and their types; registry has two new imports and entries (`ribbonPreview`, `pixelPanelPreview`).
- Spans, sheet sizes, urls and min sizes match Contracts apart from the four deviations below.

## The four verification changes
1. Padding on an inner div: OK. `SliceFrame.tsx` writes the inset as inline `padding` on the content wrapper, so a Tailwind `p-*` on the same element never applies. Inner div is the correct fix; plan Contracts and Test plan updated.
2. Carved min 126x126: OK. The 9-slice cannot render below corner sizes (62+63 by 63+63); a 96 floor would crush the art. Spans (fixed) unchanged. Plan updated.
3. Carved textTone ink: OK. Light text on tan fails contrast (screenshot: ink text readable). Plan updated (tone list now ink for banner/paper/carved, light for wood/special).
4. Ribbon `max-w-full` / `min-w-0` / `truncate`: OK. Required for the truncation criterion inside a flex chain; plan updated.

## Ribbon vertical centring (tuned here)
Cause: the SliceFrame content wrapper is not stretched to the 61 px ribbon height, so `items-center` is a no-op and the text sat at `inset.top + half line` = 16 px; the ribbon face (Ribbon_Yellow, column 96) spans rows 3-44, centre 23.5. Fix: `RIBBON_INSET.top` 6 -> 14 in `Ribbon.map.ts:9`; `bottom` stays 12 (no effect on position, kept as is). Re-captured Yellow: text centred on the face. Final values `{ top: 14, right: 56, bottom: 12, left: 56 }`. `Ribbon.map.test.ts` asserts shape only, still green.

## Findings
| # | File:line | Problem | Owner | Blocking? |
|---|---|---|---|---|
| 1 | src/modules/pixel-ui/components/Ribbon/Ribbon.map.ts:9 | `bottom: 12` is dead for a 61 px fixed-height frame (content auto height). Harmless; revisit if SliceFrame content ever stretches | none | no |

## Docs
- `docs-sync` stays in 1e per plan. Lessons-learned entry appended (inline inset padding beats Tailwind classes on SliceFrame content).

---

# Final review: Phase 1d (PixelBar, PixelIcon)

VERDICT: APPROVED

## Checks run
- `npm run typecheck`: clean (tsc --noEmit, no output)
- `npm run lint`: clean (eslint . --max-warnings 0, no output)
- `npm test`: Test Suites: 325 passed, 325 total; Tests: 4719 passed, 4719 total
- Screenshots read: `test-results/ui-verify/testbed-pixel-ui-bar-state-big-20with-20label--desktop.png`, `.../testbed-pixel-ui-bar-state-small-20with-20label--desktop.png`.

## Plan adherence
- Files match the File plan; `index.ts` exports `PixelBar`, `PixelIcon` and their types; registry has `pixelBarPreview`, `pixelIconPreview`.
- `PixelIcon` matches Contracts (`Object.hasOwn` in `toIconUrl` guards inherited keys such as `constructor`: OK).
- Deviations accepted and recorded in plan.md (Contracts, Test plan, Previews): `BarArt = { sheet: ThreeSliceSheet, fillUrl, trackHeight }` (base sheets are 3-slice, a single background renders as fragments), view = `ThreeSlice` plus track box, fill drawn at `100% 64px` with a vertical offset, slugs `pixel-ui-bar` / `pixel-ui-icon`, bar preview states reorganised to size x label (0/50/100%).
- Tuned values (in progress.md log): big inset 11/11/16/11 trackHeight 24; small inset 8/10/8/10 trackHeight 3.

## Visual
- Big bar: track continuous, fill aligned to the track at 0/50/100%, label legible.
- Small bar: 3 px track reads as a thin red line inside the frame; acceptable as a compact meter. With a label, the 14 px text overflows the track and sits over the frame; legible but crowded. Use the small bar without a label, or revisit in Phase 5 if a labelled small bar is needed.

## FILL_SHEET_HEIGHT decision
Move it. 64 is a fact of the fill asset, like `BAR_SHEET_SIZE` in `PixelBar.map.ts`; the offset formula belongs with the data, not in the view. Fold in during 1e (implementer-a): add `fillOffsetY` (or compute it in `BAR_ART`) and drop the constant and the `Math.floor` from `PixelBar.tsx:8-15`. Non-blocking.

## Findings
| # | File:line | Problem | Owner | Blocking? |
|---|---|---|---|---|
| 1 | src/modules/pixel-ui/components/PixelBar/PixelBar.tsx:9 | `FILL_SHEET_HEIGHT` and the offset calculation live in the view; move to `BAR_ART` data (see above) | implementer-a | no |
| 2 | src/modules/pixel-ui/components/PixelBar/PixelBar.types.ts:15 | Doc comment says `inset` is where the track starts; it is the frame's inner padding around the track box. Reword | implementer-a | no |
| 3 | one test failed once in the first full `npm test` | Unidentified, passed on three re-runs. Recorded in progress.md as unexplained flake | coordinator | no |

## Docs
- `docs-sync` stays in 1e. Lessons-learned entry appended (3-slice sheets with gaps; stale dev server).


---

# Final review: Phase 1e (PixelButton, typography preview, PixelBar cleanup, docs)

VERDICT: APPROVED

## Checks run
- `npm run typecheck`: clean (tsc --noEmit, no output)
- `npm run lint`: clean (eslint . --max-warnings 0, no output)
- `npm test`: Test Suites: 328 passed, 328 total; Tests: 4798 passed, 4798 total (this run had no failures; the two earlier failures, `IconEditor.preview.test.tsx` and `MonsterSpriteUploader.catalogEdit.hook.test.ts`, are in untouched code and pass in isolation: judged load-sensitive flakes, not blocking. Second unexplained flake in Phase 1 after the one logged in 1d; both appear only on a full parallel run.)
- Screenshots: not re-read; relied on coordinator ui-verify and preview-a measurements (contrast, 48x48 hit box, no 404s).

## Plan adherence
- `PixelButton.{types,map,hook,styles,tsx,preview}` and tests match the File plan and Contracts (sheets, inset, tone, art urls, `KEY_PRESS_MS` = 100, `data-visual` on the root `button`).
- PixelBar cleanup done: `BAR_ART` carries `fillSheetHeight` and `fillOffsetY` (`PixelBar.map.ts`), `PixelBar.tsx` has no constant; BarArt doc reworded (1d findings 1 and 2 closed).
- Deviations, now recorded in plan.md (I edited): `HookedHandlers` gained `onPointerCancel`; `BarArt` gained `fillSheetHeight`/`fillOffsetY`; slugs are `pixel-ui-button` / `pixel-ui-typography`; typography preview lives at `components/PixelTypography/`.
- Carved 125 vs 126: the code comment in `PixelPanel.map.ts:83` is arithmetically right (62+63 = 125 wide, 63+63 = 126 tall); `minWidth: 126` rounds the width up to a square. The docs sentence wrongly called the spec minimum "the corner floor"; I fixed it in `docs/architecture/pixel-ui.md`. No code change.
- Docs: `pixel-ui.md` (new), `docs/README.md` index row, `structure-and-state.md` module line, `systems-and-visuals.md` §6.10 pointer. Matches code. I fixed "eight handlers" to seven (the hook supplies seven; `onKeyUp` is only omitted from props).

## Findings
| # | File:line | Problem | Owner | Blocking? |
|---|---|---|---|---|
| 1 | docs/ai/tasks/2026-10-22-tiny-swords-ui-refactor/progress.md (Log) | Typography verdict is NOT recorded. Add: "1e preview-a: Pixelify Sans not good enough at 14 px for logs/card text (l/I/1, 0/O ambiguous, parentheses read as angle brackets); use it for headings, buttons, labels; use Outfit (`font-readable`) for event log, card body, digits and ids." Box left unticked until added | coordinator | no (gates the box) |
| 2 | src/modules/pixel-ui/components/PixelButton/PixelButton.types.ts:15 | `onKeyUp` is omitted from props but the hook never supplies it, so consumers lose a handler for nothing | implementer-a | no; drop from `HookedHandlers` in a later phase or leave |
| 3 | src/modules/pixel-ui/components/PixelButton/PixelButton.tsx:46 | Line exceeds ~100 chars, unformatted (also `PixelButton.map.ts` `toIconFile` signature split across lines). Cosmetic | implementer-b | no |

## Phase 1 close-out
- Exports (`src/modules/pixel-ui/index.ts`): `NineSlice`, `ThreeSlice`, `Ribbon`, `PixelPanel`, `PixelBar`, `PixelIcon`, `PixelButton` and their types. Every export has a preview and a doc entry; `SliceFrame` internals are not exported. No screen imports them yet.
- Dead code: none found. `RIBBON_INSET.bottom` (1c finding) remains harmless. `onKeyUp` omission noted above.
- File sizes: largest source files are `SliceFrame.tsx` 70, `PixelButton.map.ts` 94, `PixelPanel.map.ts` 94 lines (limit 150, lint-enforced and clean). Tests up to 253 lines (test files are exempt as lint passes).
- Previews: `slice-frame`, `pixel-ui-ribbon`, `pixel-ui-panel`, `pixel-ui-bar`, `pixel-ui-icon`, `pixel-ui-button`, `pixel-ui-typography` registered in `src/testbed/registry.ts`.
- Phase 1 theme: warm dark tokens + Pixelify/Outfit pairing in place; typography rule recorded in `pixel-ui.md` §6.18.
- Open items for later phases: small PixelBar with label overflows the 3 px track (use unlabelled or revisit in Phase 5); disabled label contrast 3.81 accepted (WCAG-exempt); light `:root` tokens stale (dark-only app).
- Commit hashes for 1a-1e boxes are the coordinator's.

---

# Final review: Phase 2a (PixelButton prerequisites)

VERDICT: APPROVED

## Checks run
- `npm run typecheck`: clean (tsc --noEmit, no output)
- `npm run lint`: clean (eslint . --max-warnings 0, no output)
- `npx jest src/modules/pixel-ui`: Test Suites: 15 passed, 15 total; Tests: 466 passed, 466 total
- Coordinator full `npm test`: 328 suites / 4844 tests, one failure: `IconEditor.preview.test.tsx` (passes alone in 1.2 s here; Tests: 1 passed). Untouched code, load timeout.
- Screenshots: not re-read; relied on preview-a probe (computed filters, data-visual, Disable art).

## Plan adherence (P2 Contracts, 2a)
- types: `PixelButtonVariant` has `neutral`; `PixelButtonProps` extends `ButtonHTMLAttributes` with no Omit; `ConsumerHandlers` as specified.
- map: `TONE.neutral = 'Blue'` (icon fallback D7); `toSliceFile(visual, variant, slides)`: disabled -> Disable, hover or neutral -> Hover, else tone sheet. Matches contract.
- hook: `consumer` param; consumer runs first for all 7 returned handlers; `onKeyUp` not returned. Cleanup effects unchanged.
- styles: `artTint` (neutral hover 110, pressed 90), label `inline-flex items-center gap-2` (D8).
- tsx: `forwardRef`, `usePixelButtonVisual(isDisabled, rest)`, `data-variant`, tint only on non-icon art, `{...rest}` before `{...handlers}`.
- No contract change needed in plan.md.
- Docs: `docs/architecture/pixel-ui.md` PixelButton section corrected (handlers no longer omitted, forwardRef, neutral variant, `data-variant`, label gap). Done here although docs-sync is formally 2h.

## Findings
| # | File:line | Problem | Owner | Blocking? |
|---|---|---|---|---|
| 1 | src/testbed/components/IconEditor/IconEditor.preview.test.tsx | Passes alone in ~1 s, fails only in full parallel run (~7 s, over the 5 s default). Seen 3 times in Phases 1-2. Follow-up warranted: raise that test's timeout (e.g. third argument or `jest.setTimeout` in the file), do not weaken assertions | coordinator / tester | no |
| 2 | PixelButton.tsx (`toButtonArt` calls in PixelButton.map.ts:84,90) | Long unformatted lines (carried from Phase 1 finding 3) | implementer | no |
| 3 | PixelButton.types.ts:15 | `onKeyUp` stays in `HookedHandlers`/`ConsumerHandlers` though never returned by the hook; harmless, documented by test and docs | none | no |

Hook tests asserting consumer handlers run while disabled (tester-b point) are correct: React suppresses only mouse events on disabled elements; pointer and key events still fire.
