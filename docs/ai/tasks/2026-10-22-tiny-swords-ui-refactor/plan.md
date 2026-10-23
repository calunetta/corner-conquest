# Plan: Tiny Swords UI refactor, Phase 1 (pixel-ui foundation)

Status: APPROVED (Phase 1)
Phase 2 status: APPROVED (architect-b, 2026-10-23; see "Phase 2 plan" at the end of this file; architect-b approves)
Inputs: triage.md, ui-design.md (Final spec; Phase 2 Final spec)

Scope: Phase 1 only, split into sub-phases 1a-1e (see Phases). Phases 2-7 stay as in triage.md. No screen is rewired. Map and HUD untouched.

## Goal and acceptance criteria
- [ ] `src/modules/pixel-ui/` exports `NineSlice`, `ThreeSlice`, `Ribbon`, `PixelButton`, `PixelPanel`, `PixelBar`, `PixelIcon` from `src/modules/pixel-ui/index.ts`.
- [ ] Every component has a preview registered in `src/testbed/registry.ts`, group `Pixel UI`; one extra preview `pixel-ui-typography`.
- [ ] Panels: 5 variants render with fixed-size corners, stretched edges/center, no seams; 3 sizes shown.
- [ ] Ribbon blue/red/yellow; long text truncates, full text in `title` attribute.
- [ ] PixelButton `primary` and `danger` show Regular, Hover, Pressed, Focus-visible, Disabled; disabled cannot be activated.
- [ ] Button label contrast >= 4.5:1 (ink label); ribbon text >= 3:1 blue/red, >= 4.5:1 yellow.
- [ ] Focus ring two-tone (`ring-2 ring-ring ring-offset-2 ring-offset-background`) visible on `paper` and `wood`.
- [ ] PixelBar 0/10, 7/10, 10/10, value above max clamps; valid `role="progressbar"` aria values.
- [ ] PixelIcon: 9 colour icons at 32 and 64 px, grey set in 3 states.
- [ ] Icon button: 48x48 hit box, Pressed does not change box size.
- [ ] Computed `font-family` of body starts with Pixelify Sans on `/testbed`; Outfit still loads; `font-readable` resolves to Outfit.
- [ ] `.dark` tokens equal ui-design.md table; `--ink`, `--paper` exist; `:root` block unchanged.
- [ ] `/` (login) and lobby still render with no overflow after the retune; no 404 for `/tiny-swords/*`; `git status` shows no change under `public/tiny-swords`.
- [ ] Mobile 390x844: no horizontal scroll in any pixel-ui preview.
- [ ] `npm run typecheck`, `npm run lint`, `npm test` pass.

## Verified context
| Symbol or file | Location | Why it matters |
|---|---|---|
| `Outfit` font, `variable: '--font-outfit'`, weights 400-900 | `src/app/layout.tsx:9-14` | Pixelify added next to it; Outfit stays. |
| `<html className={\`dark ${outfit.variable}\`}>` and `<body className={\`${outfit.className} antialiased font-body\`}>` | `src/app/layout.tsx:27-28` | `.className` on body is the real override ui-designer-b flagged (item 5): next/font `.className` writes `font-family` in a class that can beat `.font-body`; replace. |
| Plain `body { font-family: var(--font-outfit), 'Outfit', sans-serif; }` (rule is lines 6-8, `font-family` on 7) | `src/app/globals.css:6-8` | Tailwind 3 `@layer base` is not a CSS cascade layer; this rule is emitted after `@tailwind utilities`. It sets Outfit on `body` for any element without a higher-specificity class and is dead weight once body uses `font-body`. Delete lines 6-8 (the `.font-body` class on body, specificity 0,1,0, would beat it anyway, so the real override is `outfit.className`). |
| `@layer base { html, body { @apply bg-background text-foreground font-body; } }` | `src/app/globals.css:82-89` | Sole font source after the fix; `html` also uses `font-body`, so the `--font-*` variables must be defined on `<html>`. |
| `.dark { ... }` token block | `src/app/globals.css:46-79` | Retune target. `:root` block (11-45) stays untouched. |
| `fontFamily.body/headline` = Outfit stack, `code: ['monospace']` | `tailwind.config.ts:20-24` | Edit target. |
| `colors` object (background ... sidebar) | `tailwind.config.ts:25-70` | Add `ink`, `paper` here. |
| `tailwind.config.ts` is in `LEGACY_PATHS` | `eslint.config.mjs:19` | Not linted; edit stays minimal. |
| `cn()` = clsx + twMerge | `src/lib/utils.ts:4-6` | Used so a consumer `className` (e.g. `absolute`) overrides the frame's `relative`. |
| shadcn `Button` pattern (variants, `ring-offset-background`) | `src/components/ui/button.tsx:9` | Reference only; not edited in Phase 1. |
| `ComponentPreview { slug, title, group, devTool?, states[] }`, `PreviewState { name, render }` | `src/testbed/testbed.types.ts` | Preview contract. |
| `previews` array + `findPreview` | `src/testbed/registry.ts:~64-135` | Append pixel-ui previews. `registry.test.ts` enforces unique kebab slugs and unique state names. |
| Preview file pattern (`export const xPreview: ComponentPreview`) | `src/modules/site-footer/components/SiteFooter/SiteFooter.preview.tsx` | Copy shape. Imports `ComponentPreview` from `@/testbed`. |
| `src/testbed/index.ts` exports `ComponentPreview`, `PreviewState` | `src/testbed/index.ts:1` | Import path for previews. |
| ESLint: max 150 lines, `consistent-type-imports`, no deep `@/modules/*/*` import, `no-console` allows warn/error | `eslint.config.mjs:60-100` | Applies to all new files. |
| Jest: jsdom, `@/` alias, next/jest | `jest.config.js` | Tests run with `npx jest <path>`. |
| Asset dimensions and opaque spans (PIL, measured this session) | see Contracts, `public/tiny-swords/...` | Triage nominal cells (e.g. WoodTable 0-128) include transparent margins (opaque starts at x=44, y=43). Spans below are the trimmed opaque spans: using the nominal ones would leave 44 px of empty margin. |
| `src/modules/pixel-ui` | does not exist | New. Path confirmed free (`ls src/modules`: ads, avatars, cards, combat, consent, game-board, game-rules, hud, icons, lobby, map, session, shared, site-footer). |
| Font `Pixelify Sans` in next/font Google data | `node_modules/next/dist/compiled/@next/font/dist/google/font-data.json:11453` | Name is valid for `next/font/google`. |
| All asset files named in Contracts | `public/tiny-swords/UI/{Buttons,Ribbons,Banners,Icons}`, `public/tiny-swords/UI Elements/UI Elements/{Bars,Buttons,Icons,Papers,Wood Table,Banners}` | Listed with `ls` this session. Asset paths contain spaces: URLs must be encoded (`%20`). |

Measured opaque spans (start inclusive, end exclusive), sheet size in brackets:
- WoodTable [448x448]: cols 44-128, 192-256, 320-404; rows 43-128, 192-256, 320-423.
- Banner [448x448]: cols 28-128, 192-256, 320-404; rows 60-128, 192-256, 320-431.
- RegularPaper [320x320]: cols 12-64, 128-192, 256-308; rows 20-64, 128-192, 256-301.
- SpecialPaper [320x320]: cols 9-64, 128-192, 256-311; rows 20-64, 128-192, 256-299.
- Carved_9Slides [192x192]: cols 2-191, rows 1-191 (contiguous; thirds trimmed at the outer ends).
- Button_*_3Slides / 9Slides: opaque cols 7-185; Pressed 5-187; Regular rows 0-56 (3-slide), Pressed rows 4-56. Plate moves, so buttons use untrimmed thirds so all four states share one box.
- Ribbon_{Blue,Red,Yellow}_3Slides [192x64]: cols 3-189, rows 0-61 (all three identical).
- Bars: BigBar_Base 40-280 x 9-60, SmallBar_Base 49-271 x 22-41 (320x64); fills 64x64.
- Small*Button_{Regular,Pressed} are 128x128 sheets.

## Decisions
- One rendering engine, CSS only: a frame is a CSS grid of cells, each cell a `background-image` of the whole sheet with `background-size`/`background-position` in percent. For a source span `s` (start, size) in a sheet of total length `T`: size = `T / s.size * 100%`; position = `s.start / (T - s.size) * 100%` (0 when `T === s.size`). Exact for fixed corner cells (cell = `s.size * scale` px, so the scale is an integer) and for stretched cells, no JS measuring, no resize observer. Rejected: `border-image` (cannot skip the transparent gaps between non-contiguous cells in WoodTable/Banner/Papers); `<canvas>` (needs measuring, not SSR-friendly); `next/image` or `<img>` (cropping needs wrappers, lint warns on `<img>`).
- `scale` is `1 | 2`; every Phase 1 consumer uses 1. Only `SliceFrame` accepts `scale`; `PixelPanel` etc. do not expose it. Rejected: `useIsMobile`-driven scaling (nothing in the spec states a 2x use).
- Per-instance background URL/size/position and padding come from data, so they go in `style` (runtime values). Rejected: Tailwind arbitrary classes (cannot be generated dynamically).
- NineSlice and ThreeSlice live in one folder `components/SliceFrame/` with a shared engine `SliceFrame` (not exported from the barrel). Deviation from "one folder per component": the two differ only in the sheet type (3 rows vs 1). Rejected: two folders duplicating the grid code.
- Min size is enforced in CSS (`min-width`/`min-height` from the slice geometry and the panel spec). Deviation from the spec's "clamp and log a dev warning": CSS cannot log; no ResizeObserver (KISS).
- No image-load-failure fallback (spec "flat rectangle"): CSS backgrounds report no load error. Deviation; assets are local static files.
- `PixelButton` variants: `variant: 'primary' | 'danger'` selects the colour; `size: 'default' | 'large' | 'icon-round' | 'icon-square'` selects geometry (`default` = 3-slice, `large` = 9-slice, icon = Small*Button sheet). Spec's `secondary` is `size: 'large'`, spec's `icon` is the two icon sizes. Rejected: spec variant names (they mix colour and geometry).
- `PixelButton` has no `asChild` (the art layers are siblings of the label; `Slot` accepts one child). Phase 2 plan must decide how the shadcn bridge delegates (risk R3). The 7 pointer/key/blur handlers are omitted from its props type because the hook owns them.
- `PixelButton` all four state layers are rendered stacked and toggled with `visible`/`invisible` (not `hidden`), so every sheet is already loaded on first hover (no flash).
- `PixelButton` `loading`: native `disabled`, disabled sheet, `aria-busy`, label stays in the DOM `invisible` and `...` is centred over it (width held).
- Icon buttons: element 48x48 (hit area), the 128 px sheet drawn at 64x64 (0.5x) centred with `-inset-2`; hover = regular art; disabled = regular art at `opacity-50` (pack has no disabled art for icon buttons).
- `Ribbon` takes `icon?: ReactNode` (the consumer passes a `PixelIcon`), so Ribbon does not depend on PixelIcon.
- `PixelIcon` has no dev warning for unknown names: the TypeScript union rules them out; `toIconSource` returns `null` and the view renders nothing. Deviation (small).
- Inset numbers (frame art thickness) and bar track numbers are initial values; preview-a may tune only the numbers marked `// tunable` in `PixelPanel.map.ts`, `Ribbon.map.ts`, `PixelBar.map.ts` and the button insets in `PixelButton.map.ts` (also marked `// tunable`) after checking the 400% screenshot, and must report old and new values in its report and in the `progress.md` log. Spans, sheet sizes, urls, scales and all other contract numbers are never changed there; a needed change to one is a BLOCKER to the architect. Everything else in Contracts is fixed.
- Layout keeps font variables on `<html>` (not on `<body>` as Final spec item 4 words it): `html, body` both use `font-body` through `globals.css:84-88`, so `<html>` must define `--font-pixelify` and `--font-outfit`. `<body>` still has no `.className`. Deviation, same intent.
- `readable` Tailwind family added (Outfit stack) as the Final spec requires.
- Panel `strip` variant (Carved_3Slides) omitted: the spec lists five variants and no Phase 1 user.
- `CLAUDE.md`: no edit needed (checked "Stack", "Where code goes"). `eslint.config.mjs`: no change (new code is under `src/modules`, already linted).

## File plan
Phase 1a: theme and fonts
| File | New / Edit | Responsibility | Owner |
|---|---|---|---|
| `src/app/layout.tsx` | edit | Load `Pixelify_Sans`; `<html className={\`dark ${pixelify.variable} ${outfit.variable}\`}>`; `<body className="antialiased font-body">` | implementer-b |
| `tailwind.config.ts` | edit | `fontFamily` body/headline/pixel/readable; colors `ink`, `paper` | implementer-b |
| `src/app/globals.css` | edit | Delete plain `body {}` rule (lines 6-8); retune `.dark`; add `--ink`, `--paper` | implementer-b |
| `src/modules/pixel-ui/theme-tokens.test.ts` | new | Asserts tokens, font families and the removed rule | tester-a |

Phase 1b: slice engine
| File | New / Edit | Responsibility | Owner |
|---|---|---|---|
| `src/modules/pixel-ui/pixel-ui.types.ts` | new | Slice geometry types shared by all components | implementer-a |
| `src/modules/pixel-ui/asset-url.ts` | new | `assetUrl(path)`: prefix `/tiny-swords/`, encode spaces | implementer-a |
| `src/modules/pixel-ui/slice.map.ts` | new | `toSliceGrid(sheet, scale)`: pure percent math | implementer-a |
| `src/modules/pixel-ui/components/SliceFrame/SliceFrame.tsx` | new | Internal `SliceFrame`; exports `NineSlice`, `ThreeSlice` | implementer-b |
| `src/modules/pixel-ui/components/SliceFrame/SliceFrame.styles.ts` | new | Classes of root, art layer, cell, content | implementer-b |
| `src/modules/pixel-ui/index.ts` | new | Barrel; grows per sub-phase | implementer-a |
| `src/modules/pixel-ui/asset-url.test.ts`, `slice.map.test.ts` | new | Logic tests | tester-a |
| `src/modules/pixel-ui/components/SliceFrame/SliceFrame.test.tsx` | new | View test | tester-b |
| `src/modules/pixel-ui/components/SliceFrame/SliceFrame.preview.tsx` | new | Preview: three frame sizes | preview-a |
| `src/testbed/registry.ts` | edit | Register previews (each sub-phase appends) | preview-a |

Phase 1c: Ribbon and PixelPanel
| File | New / Edit | Responsibility | Owner |
|---|---|---|---|
| `components/Ribbon/Ribbon.types.ts` | new | `RibbonColor`, `RibbonHeading`, `RibbonProps` | implementer-a |
| `components/Ribbon/Ribbon.map.ts` | new | `toRibbonSheet(color)`; ribbon inset (tunable) | implementer-a |
| `components/Ribbon/Ribbon.tsx` | new | Ribbon view | implementer-b |
| `components/Ribbon/Ribbon.styles.ts` | new | Ribbon classes per colour | implementer-b |
| `components/PixelPanel/PixelPanel.types.ts` | new | `PanelVariant`, `PanelPadding`, `PixelPanelProps` | implementer-a |
| `components/PixelPanel/PixelPanel.map.ts` | new | `PANEL_SPECS`, `toPanelSpec(variant)` (sheets, min size, text tone) | implementer-a |
| `components/PixelPanel/PixelPanel.tsx` | new | Panel view, optional title ribbon | implementer-b |
| `components/PixelPanel/PixelPanel.styles.ts` | new | Panel classes | implementer-b |
| `Ribbon.map.test.ts`, `PixelPanel.map.test.ts` | new | Logic tests (same folders) | tester-a |
| `Ribbon.test.tsx`, `PixelPanel.test.tsx` | new | View tests | tester-b |
| `Ribbon.preview.tsx`, `PixelPanel.preview.tsx` | new | Previews | preview-a |
| `src/modules/pixel-ui/index.ts`, `src/testbed/registry.ts` | edit | Export + register | implementer-a / preview-a |
(all `components/...` paths are under `src/modules/pixel-ui/`.)

Phase 1d: PixelBar and PixelIcon
| File | New / Edit | Responsibility | Owner |
|---|---|---|---|
| `components/PixelBar/PixelBar.types.ts` | new | `PixelBarSize`, `PixelBarProps` | implementer-a |
| `components/PixelBar/PixelBar.map.ts` | new | `BAR_ART` (tunable track), `toBarFill(value, max)` | implementer-a |
| `components/PixelBar/PixelBar.tsx`, `PixelBar.styles.ts` | new | Bar view and classes | implementer-b |
| `components/PixelIcon/PixelIcon.types.ts` | new | Names, size, state, props | implementer-a |
| `components/PixelIcon/PixelIcon.map.ts` | new | `toIconSource(name, size, state)` | implementer-a |
| `components/PixelIcon/PixelIcon.tsx`, `PixelIcon.styles.ts` | new | Icon view and classes | implementer-b |
| `PixelBar.map.test.ts`, `PixelIcon.map.test.ts` | new | Logic tests | tester-a |
| `PixelBar.test.tsx`, `PixelIcon.test.tsx` | new | View tests | tester-b |
| `PixelBar.preview.tsx`, `PixelIcon.preview.tsx` | new | Previews | preview-a |
| `index.ts`, `registry.ts` | edit | Export + register | implementer-a / preview-a |

Phase 1e: PixelButton, typography, docs
| File | New / Edit | Responsibility | Owner |
|---|---|---|---|
| `components/PixelButton/PixelButton.types.ts` | new | Variant, size, visual, props, art types | implementer-a |
| `components/PixelButton/PixelButton.map.ts` | new | `toButtonArt(variant, size)` | implementer-a |
| `components/PixelButton/PixelButton.hook.ts` | new | `usePixelButtonVisual` (hover/press/key 100 ms) | implementer-a |
| `components/PixelButton/PixelButton.tsx`, `PixelButton.styles.ts` | new | Button view and classes | implementer-b |
| `PixelButton.map.test.ts`, `PixelButton.hook.test.ts` | new | Logic tests | tester-a |
| `PixelButton.test.tsx` | new | View test | tester-b |
| `PixelButton.preview.tsx` | new | Button states preview | preview-a |
| `src/modules/pixel-ui/components/PixelTypography/PixelTypography.preview.tsx` (built path) | new | Preview-only: Pixelify vs Outfit at 12/14/16 px on paper, banner, card | preview-a |
| `index.ts`, `registry.ts` | edit | Export + register | implementer-a / preview-a |
| `docs/architecture/systems-and-visuals.md`, `docs/architecture/structure-and-state.md` (§2 module list) | edit | New module, fonts, tokens | docs-sync |

Grep result for the move/rename rule: nothing is moved, renamed or deleted; the only removal is `globals.css:6-8` (no other file references that rule).

## Contracts
```ts
// ---------- src/modules/pixel-ui/pixel-ui.types.ts ----------
/** A run of source pixels on one axis of a sprite sheet. */
export interface SliceSpan { readonly start: number; readonly size: number }
/** Space (source px) between the frame edge and its content. */
export interface FrameInset { readonly top: number; readonly right: number; readonly bottom: number; readonly left: number }
interface SheetBase {
  /** Already encoded, from assetUrl(). */
  readonly url: string;
  readonly width: number;   // whole sheet, px
  readonly height: number;
  readonly inset: FrameInset;
}
export interface NineSliceSheet extends SheetBase {
  readonly cols: readonly [SliceSpan, SliceSpan, SliceSpan]; // left, middle, right
  readonly rows: readonly [SliceSpan, SliceSpan, SliceSpan]; // top, middle, bottom
}
export interface ThreeSliceSheet extends SheetBase {
  readonly cols: readonly [SliceSpan, SliceSpan, SliceSpan];
  readonly rows: readonly [SliceSpan]; // single row; frame height is fixed
}
export type SliceSheet = NineSliceSheet | ThreeSliceSheet;
export type SliceScale = 1 | 2;
export interface SliceCell {
  readonly key: string; // 'r0c0' ... row-major
  readonly style: { backgroundImage: string; backgroundSize: string; backgroundPosition: string };
}
export interface SliceGrid {
  readonly columns: string;           // e.g. '84px 1fr 84px'
  readonly rows: string;              // e.g. '85px 1fr 103px' or '61px'
  readonly cells: readonly SliceCell[]; // 9 or 3, row-major
  readonly minWidth: number;          // (left + right) * scale
  readonly minHeight: number;         // (top + bottom) * scale for 9-slice; row size * scale for 3-slice
  readonly fixedHeight: number | null; // row size * scale for 3-slice, else null
}

// ---------- src/modules/pixel-ui/asset-url.ts ----------
/** assetUrl('UI/Ribbons/Ribbon_Blue_3Slides.png') === '/tiny-swords/UI/Ribbons/Ribbon_Blue_3Slides.png'
 *  Spaces become %20 (encodeURI). Input has no leading slash. */
export function assetUrl(path: string): string;

// ---------- src/modules/pixel-ui/slice.map.ts ----------
/** backgroundImage = `url("${sheet.url}")`.
 *  Per cell with col span c and row span r:
 *   backgroundSize     = `${sheet.width / c.size * 100}% ${sheet.height / r.size * 100}%`
 *   backgroundPosition = `${pos(c.start, sheet.width, c.size)}% ${pos(r.start, sheet.height, r.size)}%`
 *   pos(start, total, size) = total === size ? 0 : start / (total - size) * 100
 *  columns = `${c0.size*scale}px 1fr ${c2.size*scale}px`; rows likewise for 9-slice, `${r0.size*scale}px` for 3-slice. */
export function toSliceGrid(sheet: SliceSheet, scale: SliceScale): SliceGrid;

// ---------- components/SliceFrame/SliceFrame.tsx ----------
import type { ComponentPropsWithoutRef } from 'react';
interface FrameProps extends ComponentPropsWithoutRef<'div'> {
  scale?: SliceScale;            // default 1
  contentClassName?: string;     // classes of the inset content wrapper
  minWidth?: number;             // px, max()'d with the grid min
  minHeight?: number;
}
export function NineSlice(props: FrameProps & { sheet: NineSliceSheet }): JSX.Element;
export function ThreeSlice(props: FrameProps & { sheet: ThreeSliceSheet }): JSX.Element;
// DOM: <div {...rest} className={cn(styles.root, className)} style={{minWidth, minHeight, height: fixedHeight ?? undefined}}>
//        <div aria-hidden className={styles.art} style={{gridTemplateColumns, gridTemplateRows}}>{cells -> <div key className={styles.cell} style={cell.style} />}</div>
//        <div className={cn(styles.content, contentClassName)} style={{padding: `${top*scale}px ${right*scale}px ${bottom*scale}px ${left*scale}px`}}>{children}</div>
//      </div>
// styles: root 'relative'; art 'absolute inset-0 grid'; cell '[image-rendering:pixelated] bg-no-repeat'; content 'relative'.
// A caller `style` is merged under the computed minWidth/minHeight/height: `style={{...style, minWidth, minHeight, height}}`.
// Root must not set `display`; callers pass `block`/`inline-block`/`absolute` through className.

// ---------- Ribbon ----------
export type RibbonColor = 'blue' | 'red' | 'yellow';
export type RibbonHeading = 'div' | 'h2' | 'h3';
export interface RibbonProps {
  color?: RibbonColor;        // default 'blue'
  as?: RibbonHeading;         // default 'div'
  icon?: ReactNode;           // optional, rendered before the text
  className?: string;
  children: string;           // one line; also set as the `title` attribute of the text span
}
// Ribbon.map.ts
export const RIBBON_INSET: FrameInset; // tunable. Initial { top: 6, right: 56, bottom: 12, left: 56 }; final after 1c ui-verify { top: 14, right: 56, bottom: 12, left: 56 } (content div is not stretched to the 61 px ribbon height, so `top` alone positions the text; face band is rows 3-44, centre 23.5)
export function toRibbonSheet(color: RibbonColor): ThreeSliceSheet;
// url assetUrl(`UI/Ribbons/Ribbon_${Blue|Red|Yellow}_3Slides.png`), width 192, height 64,
// cols [{start:3,size:61},{start:64,size:64},{start:128,size:61}], rows [{start:0,size:61}], inset RIBBON_INSET.
// DOM: ThreeSlice (inline-block max-w-full, minWidth 192) > contentClassName 'flex min-w-0 items-center justify-center gap-2' > {icon} + <As title={children} className=text-classes + ' block'>{children}</As>. The `as` element IS the text element (a heading cannot be the div root), so `heading` role wraps only the text.
// Ribbon styles: text 'block min-w-0 truncate text-xl font-bold leading-none'; blue/red add 'text-foreground [text-shadow:0_1px_0_hsl(var(--ink))]'; yellow 'text-ink'. min width 192 via ThreeSlice minWidth={192}.

// ---------- PixelPanel ----------
export type PanelVariant = 'wood' | 'banner' | 'paper' | 'special' | 'carved';
export type PanelPadding = 'sm' | 'md';
export interface PixelPanelProps extends ComponentPropsWithoutRef<'div'> {
  variant?: PanelVariant;     // default 'paper'
  title?: string;             // renders a Ribbon straddling the top edge
  titleColor?: RibbonColor;   // default 'blue'
  titleAs?: 'h2' | 'h3';      // default 'h2'
  padding?: PanelPadding;     // default 'md'; sm = 'p-2', md = 'p-4' (added inside the inset)
}
export interface PanelSpec { sheet: NineSliceSheet; minWidth: number; minHeight: number; textTone: 'ink' | 'light' }
export function toPanelSpec(variant: PanelVariant): PanelSpec;
// PANEL_SPECS (insets are tunable, spans are fixed):
//  wood    url 'UI Elements/UI Elements/Wood Table/WoodTable.png'  448x448
//          cols [{44,84},{192,64},{320,84}] rows [{43,85},{192,64},{320,103}] inset top 40, right 40, bottom 56, left 40, min 256x256 tone 'light'
//  banner  'UI Elements/UI Elements/Banners/Banner.png' 448x448
//          cols [{28,100},{192,64},{320,84}] rows [{60,68},{192,64},{320,111}] inset top 48,right 36,bottom 56,left 36 min 256x256 tone 'ink'
//  paper   'UI Elements/UI Elements/Papers/RegularPaper.png' 320x320
//          cols [{12,52},{128,64},{256,52}] rows [{20,44},{128,64},{256,45}] inset 16 all min 128x128 tone 'ink'
//  special 'UI Elements/UI Elements/Papers/SpecialPaper.png' 320x320
//          cols [{9,55},{128,64},{256,55}] rows [{20,44},{128,64},{256,43}] inset 16 all min 128x128 tone 'light'
//  carved  'UI/Banners/Carved_9Slides.png' 192x192
//          cols [{2,62},{64,64},{128,63}] rows [{1,63},{64,64},{128,63}] inset 12 all min 126x126 (art-driven floor: corners 62+63 wide, 63+63 tall cannot render smaller) tone 'ink' (light text is unreadable on the tan art)
// ({a,b} = {start,size}.)
// DOM: <div className={styles.root(titled)}  // 'relative', titled adds 'mt-8'
//        {title && <div className={styles.titleSlot}><Ribbon as color>{title}</Ribbon></div>}  // 'absolute left-1/2 -top-[30px] z-10 max-w-full -translate-x-1/2'
//        <NineSlice sheet minWidth minHeight className="block" contentClassName={textTone class} {...rest}><div className={cn(padding class, titled && 'pt-8')}>{children}</div></NineSlice>
// Padding lives on an inner div: SliceFrame sets the frame inset as inline `padding` on the content wrapper, which beats Tailwind padding classes on the same element.
// textTone class: ink -> 'text-ink', light -> 'text-foreground'.

// ---------- PixelBar ----------
export type PixelBarSize = 'big' | 'small';
export interface PixelBarProps {
  value: number;
  max: number;
  size?: PixelBarSize;        // default 'big'
  label?: string;             // visible text over the bar, e.g. '7/10'
  'aria-label': string;       // required
  className?: string;
}
export interface BarArt { sheet: ThreeSliceSheet; fillUrl: string; trackHeight: number; fillSheetHeight: number; fillOffsetY: number } // 1e: fill offset moved into BAR_ART data (fillSheetHeight 64, fillOffsetY = floor((64 - trackHeight)/2)); built: the *_Base sheets are 3-slice sheets with transparent gaps, so the frame is a ThreeSlice and the track is a box inside its inset
export const BAR_ART: Record<PixelBarSize, BarArt>;
// big:   sheet BigBar_Base.png (320x64) cols [40/24, 128/64, 256/24] rows [9/51] inset { top: 11, right: 11, bottom: 16, left: 11 } trackHeight 24 // tunable (tuned in 1d)
// small: sheet SmallBar_Base.png cols [49/15, 128/64, 256/15] rows [22/19] inset { top: 8, right: 10, bottom: 8, left: 10 } trackHeight 3 // tunable (tuned in 1d)
// fill: BigBar_Fill.png / SmallBar_Fill.png, 64x64 sheets with the opaque band centred.
export interface BarFill { fraction: number; valueNow: number; valueMax: number }
/** fraction = clamp(value / max, 0, 1); non-finite value or max <= 0 gives fraction 0.
 *  valueNow = clamp(value, 0, valueMax) (0 when non-finite); valueMax = max(max, 0). */
export function toBarFill(value: number, max: number): BarFill;
// DOM (built): <ThreeSlice sheet role="progressbar" aria-label aria-valuemin/max/now className='w-80 max-w-full'>
//        <div className='relative w-full' style={{height: trackHeight}}>
//          <div className='h-full w-full overflow-hidden'><span data-testid="pixel-bar-fill" className='block h-full bg-no-repeat pixelated'
//             style={{width: `${fraction*100}%`, backgroundImage: fill, backgroundSize: '100% 64px', backgroundPosition: `0 -${floor((64 - trackHeight)/2)}px`}} /></div>
//          {label && <span className='absolute inset-0 flex items-center justify-center text-sm font-semibold text-foreground [text-shadow:0_1px_0_hsl(var(--ink))]'>{label}</span>}</div></ThreeSlice>
// The fill sheet is 64 px tall; only its centred band shows over the track (`fillSheetHeight` / `fillOffsetY` in BAR_ART, done in 1e).

// ---------- PixelIcon ----------
export type PixelIconColorName = 'hammer' | 'wood' | 'gold' | 'food' | 'attack' | 'close' | 'settings' | 'info' | 'music';
export type PixelIconGreyName = 'grey-close' | 'grey-settings' | 'grey-sound' | 'grey-one' | 'grey-two' | 'grey-three' | 'grey-cart' | 'grey-plus' | 'grey-minus' | 'grey-unlock';
export type PixelIconName = PixelIconColorName | PixelIconGreyName;
export type PixelIconSize = 'sm' | 'lg';          // 32 px (0.5x) | 64 px (1x); default 'lg'
export type PixelIconState = 'regular' | 'pressed' | 'disabled'; // grey names only; default 'regular'
export interface PixelIconProps { name: PixelIconName; size?: PixelIconSize; state?: PixelIconState; label?: string; className?: string }
export interface IconSource { url: string; px: 32 | 64 }
export function toIconSource(name: PixelIconName, size: PixelIconSize, state: PixelIconState): IconSource | null;
// colour: hammer Icon_01, wood Icon_02, gold Icon_03, food Icon_04, attack Icon_05, close Icon_09, settings Icon_10, info Icon_11, music Icon_12
//         url assetUrl(`UI Elements/UI Elements/Icons/Icon_${NN}.png`); `state` ignored.
// grey:   close 01, settings 02, sound 03, one 04, two 05, three 06, cart 07, plus 08, minus 09, unlock 10
//         url assetUrl(`UI/Icons/${Regular|Pressed|Disable}_${NN}.png`) (state 'disabled' -> 'Disable_').
// Unknown name (cast) -> null.
// DOM: <span className={styles.icon} style={{width: px, height: px, backgroundImage, backgroundSize: `${px}px ${px}px`}}
//        {...(label ? {role: 'img', 'aria-label': label} : {'aria-hidden': true})} />   // returns null when source is null

// ---------- PixelButton ----------
export type PixelButtonVariant = 'primary' | 'danger';
export type PixelButtonSize = 'default' | 'large' | 'icon-round' | 'icon-square';
export type PixelButtonVisual = 'regular' | 'hover' | 'pressed' | 'disabled';
type HookedHandlers = 'onPointerEnter' | 'onPointerLeave' | 'onPointerDown' | 'onPointerUp' | 'onPointerCancel' | 'onKeyDown' | 'onKeyUp' | 'onBlur'; // built: onPointerCancel added (acts like pointerleave); the hook supplies 7 of these, onKeyUp is only reserved
export interface PixelButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, HookedHandlers> {
  variant?: PixelButtonVariant;  // default 'primary'
  size?: PixelButtonSize;        // default 'default'
  loading?: boolean;             // default false
}
export type PixelButtonArt =
  | { kind: 'three'; sheets: Record<PixelButtonVisual, ThreeSliceSheet> }
  | { kind: 'nine'; sheets: Record<PixelButtonVisual, NineSliceSheet> }
  | { kind: 'icon'; urls: Record<PixelButtonVisual, string> };
export function toButtonArt(variant: PixelButtonVariant, size: PixelButtonSize): PixelButtonArt;
// Tone = Blue | Red from variant. Slice sheets (192x64 three, 192x192 nine), untrimmed thirds:
//   cols [{0,64},{64,64},{128,64}]; rows three [{0,64}], nine [{0,64},{64,64},{128,64}]; inset three {top 0, right 16, bottom 8, left 16}, nine {top 8, right 16, bottom 16, left 16}
//   regular  'UI/Buttons/Button_{Tone}_{3|9}Slides.png'
//   pressed  'UI/Buttons/Button_{Tone}_{3|9}Slides_Pressed.png'
//   hover    'UI/Buttons/Button_Hover_{3|9}Slides.png'   (same for both tones)
//   disabled 'UI/Buttons/Button_Disable_{3|9}Slides.png' (same for both tones)
// Icon urls: 'UI Elements/UI Elements/Buttons/Small{Tone}{Round|Square}Button_{Regular|Pressed}.png';
//   regular, hover and disabled -> Regular file; pressed -> Pressed file.
export const KEY_PRESS_MS = 100;
export interface PixelButtonVisualState {
  visual: PixelButtonVisual;
  handlers: Pick<ButtonHTMLAttributes<HTMLButtonElement>, HookedHandlers>;
}
/** disabled -> 'disabled'. Else pressed -> 'pressed', else hovered -> 'hover', else 'regular'.
 *  pointerenter sets hovered; pointerleave clears hovered and pressed; pointerdown sets pressed; pointerup clears pressed;
 *  Enter or Space keydown sets pressed and schedules release after KEY_PRESS_MS (timer cleared on unmount and on blur); blur clears all. */
export function usePixelButtonVisual(isDisabled: boolean): PixelButtonVisualState;
// View (PixelButton.tsx, 'use client'): isDisabled = disabled || loading.
//  <button type="button" {...rest} {...handlers} disabled={isDisabled} aria-busy={loading || undefined} className={styles.root({size})}>
//    layers: for each visual (regular, hover, pressed, disabled) one absolutely stacked frame, `visible` for the current visual else `invisible`
//      'three'/'nine': <ThreeSlice|NineSlice sheet={sheets[v]} className="absolute inset-0" />
//      'icon': <span aria-hidden className="absolute -inset-2 ..." style={{backgroundImage: url(urls[v]), backgroundSize: '64px 64px'}} /> ; disabled adds 'opacity-50'
//    label (not for icon sizes' art, children still rendered): <span className={styles.label({visual, loading})}>{children}</span> + loading ? <span aria-hidden className="absolute inset-0 grid place-items-center">...</span>
// styles.root: 'relative inline-flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed'
//   + size: default 'h-16 min-w-[128px] px-6'; large 'min-h-[128px] min-w-[128px] px-6 py-4'; icon-* 'h-12 w-12 p-0'
// styles.label: 'relative text-lg font-semibold text-ink'; visual 'pressed' adds 'translate-y-[2px]'; 'disabled' adds 'opacity-70'; loading adds 'invisible'.
```

## Phases
Each sub-phase: implement, tests, previews, checks, ui-verify where stated, commit, stop for `continue`. Sub-phases exist because Phase 1 has ~45 files; 1a-1e keep each to about 6-10 small files.

### Phase 1a: theme and fonts (4 files)
1. `src/app/layout.tsx`: `import { Outfit, Pixelify_Sans } from 'next/font/google'`; `const pixelify = Pixelify_Sans({ subsets: ['latin'], variable: '--font-pixelify', display: 'swap', weight: ['400', '500', '600', '700'] })`; set `<html lang="en" className={\`dark ${pixelify.variable} ${outfit.variable}\`}>` and `<body className="antialiased font-body">`. Do not use `.className` anywhere. (implementer-b)
2. `tailwind.config.ts` `fontFamily`: `body` and `headline` and `pixel` = `['var(--font-pixelify)', 'var(--font-outfit)', 'Outfit', 'sans-serif']`; `readable` = `['var(--font-outfit)', 'Outfit', 'sans-serif']`; `code` unchanged. In `colors` add `ink: 'hsl(var(--ink))'`, `paper: 'hsl(var(--paper))'`. (implementer-b)
3. `src/app/globals.css`: delete lines 6-8 (`body {`, its `font-family`, `}`; keep the blank line before `@layer base`). In `.dark` set exactly (HSL triplets):
   background `28 30% 9%`; foreground `40 50% 94%`; card `28 28% 14%`; card-foreground `40 50% 94%`; popover `28 30% 12%`; popover-foreground `40 50% 94%`; primary `195 55% 45%`; primary-foreground `28 30% 9%`; secondary `28 22% 22%`; secondary-foreground `40 50% 94%`; muted `28 18% 20%`; muted-foreground `35 18% 72%`; accent `42 90% 60%`; accent-foreground `28 30% 9%`; destructive `5 70% 55%`; destructive-foreground `40 50% 94%`; border `28 20% 28%`; input `28 20% 28%`; ring `42 90% 60%`; chart-1..5 unchanged; sidebar-background `28 28% 14%`; sidebar-foreground `40 50% 94%`; sidebar-primary `195 55% 45%`; sidebar-primary-foreground `28 30% 9%`; sidebar-accent `28 22% 22%`; sidebar-accent-foreground `40 50% 94%`; sidebar-border `28 20% 28%`; sidebar-ring `42 90% 60%`. Add `--ink: 28 45% 16%;` and `--paper: 40 55% 86%;`. `:root` untouched. (implementer-b)
4. tester-a writes `theme-tokens.test.ts`; run it. Run `npm run typecheck`, `npm run lint`, `npm test`.
5. ui-verify: screenshots of `/` (login) and of the testbed previews `/testbed/session-login`, `/testbed/lobby-main`, `/testbed/hud-game-board-header` at 1280x720 and 390x844 (no `/lobby` route exists: the lobby renders at `/` after login). Real testbed slugs are `session-login`, `lobby-main`, `hud-game-board-header` (verified in the `*.preview.tsx` files). Expect warm dark colours, no overflow, text readable. Check `/testbed` computed body `font-family` starts with Pixelify Sans and the Pixelify font request succeeds.
6. docs-sync not in this sub-phase (1e).

### Phase 1b: slice engine (6 source files)
1. `pixel-ui.types.ts` exactly as Contracts. (implementer-a)
2. `asset-url.ts` (3 lines of logic). (implementer-a)
3. `slice.map.ts` implementing `toSliceGrid`. Sonnet. Use `Number` math without rounding; do not round percent strings beyond what `Number.prototype.toString` gives. (implementer-a)
4. `SliceFrame.styles.ts` then `SliceFrame.tsx` per DOM block. Sonnet. Shared internal `SliceFrame`, exported `NineSlice`, `ThreeSlice`. (implementer-b)
5. `index.ts`: `export { NineSlice, ThreeSlice } from './components/SliceFrame/SliceFrame'; export type { ... } from './pixel-ui.types'` (the types consumers need: `SliceSheet`, `NineSliceSheet`, `ThreeSliceSheet`, `FrameInset`). (implementer-a)
6. Tests (tester-a then tester-b), preview (preview-a) + registry, checks, ui-verify of `/testbed/slice-frame` at 400% zoom.

### Phase 1c: Ribbon and PixelPanel (8 source files)
1. `Ribbon.types.ts`, `Ribbon.map.ts` (implementer-a); `Ribbon.styles.ts`, `Ribbon.tsx` (implementer-b, sonnet). Ribbon root: `inline-block` ThreeSlice with `minWidth={192}`; icon + text in a `flex items-center justify-center gap-2` content div; text span `title={children}`.
2. `PixelPanel.types.ts`, `PixelPanel.map.ts` (implementer-a); `PixelPanel.styles.ts`, `PixelPanel.tsx` (implementer-b, sonnet).
3. Update `index.ts` exports: `Ribbon`, `PixelPanel`, their prop/variant types.
4. Tests, previews, registry, checks, ui-verify (5 variants at 1280 and 390, 3 sizes, focus ring on paper and wood via a focusable child button in the preview, ribbon text contrast samples).

### Phase 1d: PixelBar and PixelIcon (8 source files)
1. `PixelBar.types.ts`, `PixelBar.map.ts` (implementer-a); `PixelBar.styles.ts`, `PixelBar.tsx` (implementer-b).
2. `PixelIcon.types.ts`, `PixelIcon.map.ts` (implementer-a); `PixelIcon.styles.ts`, `PixelIcon.tsx` (implementer-b).
3. Update `index.ts`.
4. Tests, previews, registry, checks, ui-verify (bar track alignment at 400%, tune `BAR_ART` numbers; icons at 32 and 64).

### Phase 1e: PixelButton, typography, docs, close-out (5 source files)
1. `PixelButton.types.ts`, `PixelButton.map.ts`, `PixelButton.hook.ts` (implementer-a; hook is sonnet); `PixelButton.styles.ts`, `PixelButton.tsx` (implementer-b, sonnet).
2. Update `index.ts` to final export list: `NineSlice, ThreeSlice, Ribbon, PixelButton, PixelPanel, PixelBar, PixelIcon` and types.
3. Tests, `PixelButton.preview.tsx` (states listed under Preview states; Hover, Pressed and Focus-visible are real interaction states, checked by hand in ui-verify, not forced by props), `PixelTypography.preview.tsx`, registry.
4. Full checks, ui-verify of all pixel-ui previews on 1280x720 and 390x844, measured items from the Final spec item 10 (label contrast, hit area 48x48, Pressed box unchanged, no 404s). Record the typography verdict in `progress.md` log (Final spec item 6).
5. docs-sync: `systems-and-visuals.md` (pixel-ui module, slice model, fonts, tokens), `structure-and-state.md` §2 module list.
6. `docs/ai/lessons-learned.md` candidate for architect-b final review: `next/font` `.className` on `<body>` (`layout.tsx:28`) writes `font-family` directly and overrides the Tailwind `font-body` class; use `.variable` plus a Tailwind family instead. The plain `body {}` rule (`globals.css:6-8`) was a second Outfit source, removed with it.

Model escalation: sonnet for `slice.map.ts`, `SliceFrame.tsx`, `Ribbon.tsx`, `PixelPanel.tsx`, `PixelButton.hook.ts`, `PixelButton.tsx`, all previews (preview-a), and all ui-verify steps. Everything else haiku.

## Test plan
- tester-a (logic, first):
  - `theme-tokens.test.ts`: read `src/app/globals.css` text: `.dark` block contains every token value in step 1a.3; contains `--ink: 28 45% 16%` and `--paper: 40 55% 86%`; no line before `@layer base` starts with `body {`; `:root` block still has `--background: 0 0% 100%`. Import `tailwind.config.ts` default: `theme.extend.fontFamily.readable[0] === 'var(--font-outfit)'`, `body[0] === 'var(--font-pixelify)'`, `colors.ink`/`colors.paper` defined.
  - `asset-url.test.ts`: spaces encoded (`'UI Elements/UI Elements/Wood Table/WoodTable.png'` gives `/tiny-swords/UI%20Elements/UI%20Elements/Wood%20Table/WoodTable.png`); plain path unchanged apart from prefix.
  - `slice.map.test.ts`: 9-slice WoodTable at scale 1 -> `columns '84px 1fr 84px'`, `rows '85px 1fr 103px'`, 9 cells row-major keys `r0c0..r2c2`, `minWidth 168`, `minHeight 188`, `fixedHeight null`; cell r0c0 `backgroundSize '533.33...% 527.06...%'` (448/84, 448/85) and `backgroundPosition` `44/(448-84)*100` and `43/(448-85)*100`; middle cell position `192/(448-64)*100 = 50`; scale 2 doubles px and mins but not percents; 3-slice ribbon: `rows '61px'`, `fixedHeight 61`, 3 cells, vertical position `0%`; `total === size` gives `0%` (no NaN/Infinity).
  - `Ribbon.map.test.ts`: color to url for 3 colours; geometry constants; spans inside sheet.
  - `PixelPanel.map.test.ts`: all 5 variants: spans ordered, non-overlapping, within sheet width/height; min sizes (256/256/128/128/126); textTone ink for banner, paper and carved; light for wood and special. Every `sheet.url` decodes to a file that exists under `public/` (`fs.existsSync(path.join('public', decodeURI(url)))`).
  - `PixelBar.map.test.ts`: `toBarFill(7,10)` fraction 0.7; `(0,10)` 0; `(10,10)` 1; `(15,10)` fraction 1 and valueNow 10; `(-3,10)` 0; `(5,0)` fraction 0, valueNow 0, valueMax 0; `(NaN,10)` 0. BAR_ART sheet and fill urls exist on disk.
  - `PixelIcon.map.test.ts`: 9 colour names map to the listed Icon_NN; `size` gives px 32/64; grey names: regular/pressed/disabled gives `Regular_/Pressed_/Disable_`; colour name ignores state; unknown name (cast) returns null; every produced url exists on disk.
  - `PixelButton.map.test.ts`: 2 variants x 2 slice sizes: urls per visual as in Contracts (hover/disabled shared by tones); icon sizes: regular/hover/disabled -> Regular url, pressed -> Pressed url; every url exists on disk.
  - `PixelButton.hook.test.ts` (`renderHook`, fake timers): initial 'regular'; enter -> 'hover'; down -> 'pressed'; up -> 'hover'; leave -> 'regular'; disabled stays 'disabled' for every event; Enter keydown -> 'pressed', after `KEY_PRESS_MS` back to 'regular'; Space same; other keys ignored; blur clears; unmount during the timer does not throw or set state.
- tester-b (view and e2e):
  - `SliceFrame.test.tsx`: NineSlice renders 9 cells and ThreeSlice 3, art layer `aria-hidden`, children visible, content padding equals inset x scale, root forwards `className` and `data-testid`.
  - `Ribbon.test.tsx`: text rendered; `title` attribute equals text; `as="h2"` renders `heading` level 2; icon rendered before text; yellow uses `text-ink`.
  - `PixelPanel.test.tsx`: each variant renders children; with `title` a heading (level 2 default, 3 with `titleAs`) exists; without title no heading; `padding` classes sit on the inner wrapper that is the direct parent of the children (sm and md differ; md default; titled adds the extra top padding there).
  - `PixelBar.test.tsx`: `role="progressbar"` with `aria-valuenow/min/max` for 7/10, 15/10 (valuenow 10), max 0; `aria-label` present; label text visible; fill width `70%`; art cells carry the Big/Small base sheet.
  - `PixelIcon.test.tsx`: no `label` -> `aria-hidden`, no role; with label -> `role="img"` named; 32 and 64 px sizes in style; unknown name renders nothing (`container.firstChild` null).
  - `PixelButton.test.tsx`: renders `button` with label; click calls `onClick`; disabled click does not call it and keyboard Enter does not either (`fireEvent`; `@testing-library/user-event` is not installed); `loading` -> `disabled`, `aria-busy="true"`, label still in DOM; four state layers present; the current layer is `visible` and the others `invisible`; hover/pointer-down change which layer is visible; icon size renders no text sheet layer; focus-visible classes present on root.
  - e2e: none (no screen is wired; ui-verify covers the visual checks).

## Preview states
Group `Pixel UI`. Slugs (kebab, unique): `slice-frame`, `ribbon`, `pixel-panel`, `pixel-bar`, `pixel-icon`, `pixel-ui-button`, `pixel-ui-typography` (built slugs are prefixed `pixel-ui-` like the others; PixelButton root carries `data-visual`).
- SliceFrame (`slice-frame`): "NineSlice small", "NineSlice medium", "NineSlice large" (WoodTable at 256x256, 480x320, 720x400 inside `max-w-full` wrappers; mobile shows the 256 one), "ThreeSlice ribbon width 192 / 320".
- Ribbon (`ribbon`): "Blue", "Red", "Yellow" ("Turn 14 - Your move"), "With icon" (gold PixelIcon not available until 1d: use a plain `<span>12</span>` as the icon node), "Long text truncated" (container 220 px).
- PixelPanel (`pixel-panel`): one state per variant ("Wood", "Banner", "Paper", "Special", "Carved") with title "Event Log" and lines "Mia moved to (3,2)", "Kai found a card"; "Paper untitled", "Paper sizes" (small 128, medium 240, large 360 px wide), "Focus ring on paper" and "Focus ring on wood" (a focusable `<button className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">` inside).
- PixelBar (slug `pixel-ui-bar`, built): states "big with label", "big without label", "small with label", "small without label", each showing 0%, 50%, 100%. Over-max is covered by unit tests.
- PixelIcon (slug `pixel-ui-icon`): "Colour 32 px" (9 icons), "Colour 64 px", "Grey regular", "Grey pressed", "Grey disabled" (all 10).
- PixelButton (`pixel-button`): "Primary default", "Danger default", "Primary large", "Danger large", "Icon round blue/red", "Icon square blue/red", "Disabled", "Loading", "Mobile width 390" (a w-full flex row of three default buttons "Move", "Attack", "Cards"). Hover, Pressed and Focus-visible are checked by interaction in ui-verify (spec states them as real interaction states).
- PixelTypography (`pixel-ui-typography`): "Event log lines", "Card body" at 12, 14, 16 px, Pixelify (`font-body`) vs Outfit (`font-readable`), each on `bg-paper text-ink`, banner panel and `bg-card`.
- Fixtures: the sample strings from ui-design.md "Copy". Put shared strings in `src/modules/pixel-ui/pixel-ui.fixtures.ts` only if two previews or tests need the same constant (implementer-a, optional). No invented asset paths: previews use only the components.

## Risks
- R1: initial inset and bar track numbers are guesses (art thickness not measured per edge). Mitigation: the tunable list in Decisions; preview-a/ui-verify tunes at 400% zoom; tests do not assert them.
- R2: percent-based `background-position` rounding can leave a 1 px seam or blur on stretched cells at non-integer widths. Mitigation: ui-verify at 400%; if a seam appears, report BLOCKER to the architect with the screenshot instead of switching approach silently.
- R3: no `asChild` on PixelButton blocks a straight shadcn Button bridge in Phase 2. Mitigation: Phase 2 plan decides (wrap `Slot`-free `PixelButton` with a `render`/`as` prop, or style `Button` with `SliceFrame` layers itself).
- R4: Pixelify Sans as global body font may be hard to read at 14 px; global retune hits unrewired screens. Mitigation: Phase 1a ui-verify of `/` and `/lobby`; `font-readable` available; typography verdict in 1e.
- R5: `border` and `ring-offset-background` use the retuned tokens; some unrewired screens use gradients tied to old violet/cyan (still valid colours). Mitigation: 1a ui-verify screenshots; Phase 7 cleans leftovers.
- R6: a 4-layer stack per button multiplies DOM and image requests in Phase 5 (HUD with many buttons). Mitigation: sheets are shared and cached by URL; measure in Phase 5.
- R7: SSR/hydration: `useIsMobile` is not used; the hook uses only event state, so no hydration mismatch.

## Review (architect-b)
VERDICT: APPROVED

Verified this session: every `public/tiny-swords` asset in Contracts exists (`ls`); all measured spans (WoodTable, Banner, RegularPaper, SpecialPaper, Carved_9Slides, Ribbon_Blue) re-measured with PIL and match; `src/modules/pixel-ui` absent; `Pixelify Sans` in next/font data; `registry.ts`, `testbed.types.ts`, `eslint.config.mjs` rules (max-lines, consistent-type-imports) as cited. Old-path grep (Outfit, font-outfit, font-body): only `src/app/layout.tsx`, `src/app/globals.css`, `tailwind.config.ts` in live code, all in the File plan; other hits are docs of other tasks and `.claude/worktrees/*` copies (leave). `font-body` / `font-headline` consumers in `src` are covered by the global retune (intended).

Deviations from Final spec, all accepted: variables on `<html>` not `<body>` (needed, since `html` also uses `font-body` and CSS variables on body are invisible to it); PixelButton `variant`/`size` split and no `asChild` (R3, Phase 2 decides); min-size via CSS, no dev warnings, no load-failure fallback (CSS cannot report; local assets); `strip` variant omitted. Tunable-number rule: plan allows tuning only `// tunable` numbers in preview/ui-verify and requires reporting values.

Folded in by me (no re-plan needed):
1. Cites were off: body rule is `globals.css:6-8` not 5-7 (deleting 5-7 would leave a stray `}` and break the CSS); layout font `9-14`, html/body `27-28`; `@layer base` `82-89`. Fixed.
2. Wrong mechanism: Tailwind 3 `@layer` is not a CSS cascade layer, and `.font-body` (class) on body beats `body {}` (element). The real override is `outfit.className` (`layout.tsx:28`). Deleting the rule stays correct; rationale and the lessons-learned candidate rewritten.
3. Testbed slugs `/testbed/login`, `/testbed/lobby`, `/testbed/game-board-header` do not exist. Real: `session-login`, `lobby-main`, `hud-game-board-header`. Fixed in plan; `progress.md` 1a line still has the old slugs (architect-a: update).
4. `@testing-library/user-event` is not installed; PixelButton view test now says `fireEvent`.
5. Ribbon `as` element placement was undefined; contract now makes `as` the text element.
6. SliceFrame root `style` merge order specified.
7. Tunable list extended to PixelButton insets, with reporting location (`progress.md` log).

Non-blocking notes: `PixelButton` omits `onKeyDown`/`onBlur`/pointer handlers from its props, so consumers cannot attach them; revisit when Phase 2 designs the shadcn bridge (compose handlers in the hook). Focus ring sits on the 64 px button box while the plate is 56 px tall; accept unless ui-verify shows it looks wrong.

---

# Phase 2 plan: shadcn bridge (draft by architect-a, 2026-10-23)

Phase 2 status: APPROVED by architect-b (see "P2 Review"). Inputs: `ui-design.md` "Phase 2 Final spec" (it wins over "Phase 2 spec" where they conflict), `triage.md`, `docs/ai/lessons-learned.md` ("Slice frames" entries), `docs/architecture/pixel-ui.md`.
Sub-phases 2a-2h (see Phases). No screen is rewritten; only `src/components/ui/*` internals, the pixel-ui prerequisites, three one-line HUD size edits and one one-line `variant` edit. Map and HUD structure untouched.

## P2 Goal and acceptance criteria
All items of ui-design.md "Phase 2 spec / Acceptance criteria" as amended by "Phase 2 Final spec" items 1-11 apply verbatim. Plan-level checklist (observable):
- [ ] `PixelButton` is `forwardRef`, calls consumer pointer/key/blur handlers then its own, has variant `neutral` (rest + hover + pressed = `Button_Hover_*`, disabled = `Button_Disable_*`, hover `brightness-110`, pressed `brightness-90`).
- [ ] `Ribbon` accepts `ReactNode` children, forwards a ref to its text element, spreads extra HTML props on it; `title` attribute only for string children.
- [ ] `PixelPanel` has `padding="none"` and `rootClassName`.
- [ ] `Button`: sprite tier for `default`/`lg` x `default|destructive|outline|secondary`; plate tier for `sm`, `icon`, new `plate`, `asChild`; plain for `ghost`/`link`.
- [ ] `Dialog`, `AlertDialog`, `Sheet` render the `special` frame, dark field, ribbon title, (Dialog, Sheet) round close button; Radix semantics unchanged.
- [ ] `Card`, `Input`, `Badge`, `Progress`, `Tooltip`, `Popover`, `Tabs`, `Toast`, `Switch`, `Checkbox`, `RadioGroup`, `Slider`, `Separator`, `ScrollArea`, `Avatar`, `Label`, `Textarea` use the plate recipe.
- [ ] Testbed preview `shadcn-bridge` (group `Pixel UI`) shows every state listed under P2 Preview states.
- [ ] Migration-debt report (P2 Migration debt) is written to `progress.md` log in 2h and re-checked by grep.
- [ ] `npm run typecheck`, `npm run lint`, `npm test` (328+ suites, 4798+ tests) pass after every sub-phase; e2e dialog flows pass in 2h.

## P2 Verified context
| Symbol or file | Location | Why it matters |
|---|---|---|
| `PixelButton` is a plain function, spreads `{...rest}` then `{...handlers}` (consumer handlers overwritten) | `src/modules/pixel-ui/components/PixelButton/PixelButton.tsx:14-35` | Needs `forwardRef` + composition. |
| `HookedHandlers` omitted from `PixelButtonProps` | `PixelButton.types.ts:9-24` | Remove the `Omit`, keep the union for the hook typing. |
| `usePixelButtonVisual(isDisabled)` returns 7 handlers (no `onKeyUp`) | `PixelButton.hook.ts:10-64` | Gains a second param. |
| `TONE` record, `toSliceFile(visual, tone, slides)`, `toButtonArt` | `PixelButton.map.ts:15,27,78` | Neutral art goes here. |
| `styles.artStack(isPressed)`, `styles.label`, `rootBase` | `PixelButton.styles.ts:32-43,19,4` | Tint + label flex go here. |
| `Ribbon` children typed `string`, `title={children}`, `className` goes to the frame, no ref, no rest | `Ribbon.tsx:9-23`, `Ribbon.types.ts:6-14` | Widen. |
| `PixelPanel`: `{...rest}` and `className` go to `NineSlice`; outer div has no class hook; `PanelPadding = 'sm' \| 'md'` | `PixelPanel.tsx:8-42`, `PixelPanel.types.ts:6-16`, `PixelPanel.styles.ts:3-18` | `rootClassName`, `'none'`. |
| `SliceFrame` writes the frame inset as inline padding on the content wrapper; root has `relative`; no `display` | `SliceFrame.tsx:52-58`, `SliceFrame.styles.ts` | Lessons-learned: consumer padding goes on an inner div, never on `contentClassName`. |
| `special` sheet: `SpecialPaper.png` 320x320, spans trimmed (cols `{9,55},{128,64},{256,55}`), inset 16 all, min 128x128, tone light | `PixelPanel.map.ts` (Phase 1 plan Contracts) | The frame box has NO transparent margin (spans are trimmed), so ui-designer-b's "9/20/21 transparent px" is already absorbed. See Decision D2. |
| Barrel exports: `NineSlice, ThreeSlice, Ribbon, PixelPanel, PixelBar, PixelIcon, PixelButton` + types; `toPanelSpec`/`toButtonArt` NOT exported | `src/modules/pixel-ui/index.ts:1-25` | The bridge uses only the barrel. `RibbonColor` (line 5), `PanelVariant` (line 8) and `PixelButtonVariant` (line 24) are already exported; no barrel edit in Phase 2. |
| shadcn `Button`: forwardRef, `Slot` for `asChild`, `buttonVariants` exported, sizes `default sm lg icon` | `src/components/ui/button.tsx:8-57` | Rewritten. |
| `buttonVariants` consumers: `alert-dialog.tsx:7,107,120` and `calendar.tsx:8,29,41` | grep this session | Keep the export and the cva signature (`variant`, `size`, `className`). |
| `dialog.tsx` (Content: `grid ... border bg-background p-6 shadow-lg`, Close with lucide `X`), `alert-dialog.tsx` (Action/Cancel are `Primitive.Action/Cancel` + `buttonVariants`), `sheet.tsx` (`sheetVariants` cva, `side`, Close) | `src/components/ui/{dialog,alert-dialog,sheet}.tsx` | Rewritten. |
| `card.tsx`, `input.tsx`, `badge.tsx` (`badgeVariants`, `BadgeProps` extends div attrs), `progress.tsx` (indicator `translateX(-${100-value}%)`) | `src/components/ui/*.tsx` | Rewritten as plates. |
| `src/components/ui/**` is in `IGNORED_PATHS`; `RESTRICTED_IMPORTS` apply only under `src/modules` | `eslint.config.mjs:30-41,49-55` | `@/modules/pixel-ui` (barrel) can be imported from `src/components/ui` with no lint change. No `eslint.config.mjs` edit. |
| Jest: `lucide-react` is mocked globally (every icon is `<span data-testid="lucide-icon-<name>">`) | `jest.setup.js` | Dialog close `X` renders as a span in tests. |
| No test file exists under `src/components/ui` | `find src -path '*components/ui*' -name '*.test.*'` (empty) | New tests are new files. |
| Four tests mock `@/components/ui/tooltip` | `IslandTile.test.tsx:55`, `IslandTile.neutralFog.test.tsx:19`, `IslandTile.monsters.test.tsx:19`, `AnimatedMonster.test.tsx:21` | Unaffected by the Tooltip class change. |
| Registry: `previews` array, imports one `*Preview` per file; `registry.test.ts` needs unique kebab slug and unique state names per preview | `src/testbed/registry.ts:1-120`, `src/testbed/registry.test.ts` | Preview registration. |
| Preview of non-module code lives in `src/testbed/components/<Name>/<Name>.preview.tsx` and imports `ComponentPreview` from `@/testbed` or `./testbed.types` | `src/testbed/components/TileVariantGallery/TileVariantGallery.preview.tsx` (listing), `registry.ts:36-40` | Path for the new preview: `src/testbed/components/ShadcnBridge/`. |
| Existing preview already imports `Button` | `src/modules/pixel-ui/components/PixelPanel/PixelPanel.preview.tsx:2` | `<Button size="sm">` stays plate; no change needed. |
| `ActionButton` default-size `Button` with HUD layout classes (`h-auto min-h-12 ... p-2`, `h-16` when main) | `src/modules/hud/components/ActionsPanel/ActionButton.tsx:48-55`, `ActionsPanel.styles.ts:29-43` | Would become a sprite button and change HUD size. Fixed by `size="plate"` (D4). |
| `GameBoardHeader` default-size `Button`s | `src/modules/hud/components/GameBoardHeader/GameBoardHeader.tsx:83,89` | Same. |
| `DeleteAccountButton` `AlertDialogAction className={styles.confirmAction}` with `bg-destructive ...` | `src/modules/session/components/DeleteAccountButton/DeleteAccountButton.tsx:71-75` | Destructive confirm must stay red: pass `variant="destructive"`. |
| `AlertDialogTitle`/`DialogTitle`/`SheetTitle` call sites (33) | grep `<(Dialog\|AlertDialog\|Sheet)Title` this session | Titles keep `className` (goes to the ribbon frame). Special cases in P2 Migration debt. |
| E2E selectors on dialogs: `getByRole('dialog'\|'alertdialog')`, `getByRole('button', { name })`, `ancestor::div[.//button][1]` | `e2e/bot-ui-actions.ts:176-200`, `e2e/*.spec.ts` | Role/name based; labels remain accessible names; no DOM-structure assumption broken by the frame. Verified by running e2e in 2h. |

## P2 Decisions
- **D1 Where the bridge lives**: `src/components/ui/*.tsx` import `PixelButton`, `PixelPanel`, `Ribbon` from `@/modules/pixel-ui` (barrel). No reverse import. Rejected: dialog-local ribbon on `ThreeSlice` (Final spec item 9 widens `Ribbon`).
- **D2 Insets** (Final spec item 3 translated to our engine): `special` spans are already trimmed, so the frame box equals the visible art. Spec result "310 px usable at 374 px" = 32 px of horizontal space between frame edge and text: 16 (sheet inset, fixed by `SliceFrame`) + 16 (`px-4` on the dark field). Vertical: 16 + 8 (`py-2`) = 24 px. `PixelPanel padding="none"`; the dark field div carries `px-4 py-2`. Tunable list for 2d: `px-4 py-2` of `DIALOG_FIELD`, `max-h-[calc(100dvh-3rem)]` (= 16 shell margin + 2x16 inset), close `right-4 top-6`. Rejected: per-side inset option in `PixelPanel`/`SliceFrame` (not needed once padding lives on an inner div; SliceFrame inset stays 16).
- **D3 Sprite className neutraliser**: `className` from callers is applied to the sprite root. Colour, border, radius, shadow and gradient classes would paint a rectangle behind the art, and `h-*`/`min-w-*` would let the 61/64 px art overflow the box. `Button` therefore appends the constant `SPRITE_LOCK` after the caller classes: `'!h-16 !min-w-[128px] !rounded-none !border-0 !bg-transparent !bg-none !shadow-none'` (`lg`: `!min-w-[192px] px-8` instead of `!min-w-[128px]`). Tailwind `!` utilities win over any caller class and any `hover:` variant. Layout classes (`w-full`, `flex-*`, `self-*`, margins, `gap-*`, `hidden sm:inline-flex`) keep working. The spec said these overrides are "not supported" and only listed; this keeps the old gradient buttons from rendering as a broken rectangle between Phase 2 and Phase 6. Rejected: stripping classes from the string (fragile); migrating 20 call sites now (Phases 3-6 own them).
- **D4 New `Button` size `plate`**: dimensions of the old default (`h-10 px-4 py-2`), plate tier, never sprite. Needed because three in-game call sites use the default size and carry HUD layout classes; sprite default (64 px tall) would change HUD structure, which the triage forbids. Edits: `ActionButton.tsx` and `GameBoardHeader.tsx` get `size="plate"` (one prop each, 3 tags). Deviation from the Final spec (it lists sizes `default lg sm icon`); needs architect-b sign-off. Rejected: `size="sm"` at those sites (changes height 40 to 36 and horizontal padding 16 to 12 in the HUD).
- **D5 `asChild`**: always plate/plain tier (Final spec). `Slot` receives class + props; `plate` and sprite sizes collapse to `h-10 px-4 py-2`.
- **D6 PixelButton handler composition lives in the hook**: `usePixelButtonVisual(isDisabled, consumer?)` returns already-composed handlers (consumer first, then own). Existing hook tests call it with one argument and keep passing. Rejected: a separate `compose` util file (no second user); `@radix-ui/primitive` `composeEventHandlers` (transitive dependency, not in `package.json` verified? unverified, so not relied on). Consumer `preventDefault` does NOT skip the visual update (visuals are cosmetic).
- **D7 Neutral on icon sizes**: the pack has no neutral icon sheet; `neutral` + `icon-round|icon-square` falls back to the Blue icon sheets (documented in `TONE`). Not used by the bridge.
- **D8 PixelButton label layout**: label span becomes `inline-flex items-center gap-2` so call sites that put an icon plus text inside a button (Login, Lobby, CreateGameDialog, GameBoardHeader use `RegistryIcon` + text) keep the spacing the caller's `gap-*` class used to give the root. Additive, no test asserts the label classes.
- **D9 Card `frame` mode**: renders `PixelPanel variant={frame} padding="none" className={className} {...props}`; no `ref` (PixelPanel has no ref; grep `<Card ... ref=` found none) and a `title` attribute cannot be used in frame mode because `PixelPanel` reads `title` as ribbon text (documented in the file comment). Plate stays the default.
- **D10 Popover stays plate** (Final spec item 6). **Progress** keeps Radix, plate skin (spec section 8), `bg-accent` indicator.
- **D11 DialogHeader/SheetHeader text alignment** unchanged: spec wording ("remove the split; keep as is") is contradictory; layout is behaviour, so `text-center sm:text-left` stays. Footers: `flex flex-col-reverse gap-2 sm:flex-row sm:justify-end` (drop `sm:space-x-2`); they stack below `sm` as today; the "two buttons side by side fit" criterion is shown in the preview by a plain `flex` row of two `default` buttons inside a 310 px column.
- **D12 Shared dialog parts** in one new file `src/components/ui/dialog-frame.tsx` (frame, close button, class constants) used by `dialog.tsx`, `alert-dialog.tsx` and `sheet.tsx` (DRY: the three had copy-pasted overlay/content/footer code). Radix wrappers stay in their own files. Rejected: a `PixelDialog` module component (would import Radix into `pixel-ui`; Phase 6 may move it).
- **D13 Title ribbon preset**: `TITLE_RIBBON = 'mx-auto block max-w-[calc(100%-6rem)]'` (`block` replaces Ribbon's `inline-block`; 6rem = the spec's `mx-12` clear space each side, so the close button never overlaps the title). Titles are `<Primitive.Title asChild><Ribbon as="h2" ...>`.
- **D14 Sheet geometry** (Final spec item 5, adapted to the engine): shell = Radix Content, `fixed`, `overflow-hidden`, `flex flex-col`, transparent. Two children: (1) a decorative frame layer `PixelPanel` (`aria-hidden`, `padding="none"`, no children) positioned `absolute` with 64 px (`-16` Tailwind unit) negative insets on the edges that touch the viewport; (2) the field layer (`relative flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto bg-black/50 p-4`) with a 16 px margin on the inner edge only (so the 16 px frame band shows). Because the field is not under any bleed, no padding compensation is needed. Close button for sheets: `right-6 top-6` (24 px clears the 16 px band on every side). Caller classes (`h-[75vh] max-h-[85vh] flex flex-col p-0`, `w-full sm:max-w-lg`) apply to the shell; `p-0` is appended last.
- **D15 Test location**: tests for `src/components/ui/*` sit beside the file (`button.test.tsx`, ...), jsdom, owner tester-b (view) since there is no pure logic. Logic tests (tester-a) cover the pixel-ui `.map.ts` and `.hook.ts` changes only.

## P2 File plan
All paths below are relative to the repo root.

### 2a: PixelButton prerequisites (`src/modules/pixel-ui/components/PixelButton/`)
| File | New / Edit | Responsibility | Owner |
|---|---|---|---|
| `PixelButton.types.ts` | edit | `PixelButtonVariant` += `'neutral'`; `PixelButtonProps` no longer omits handlers; new `ConsumerHandlers` | implementer-a |
| `PixelButton.map.ts` | edit | `TONE.neutral`, `toSliceFile(visual, variant, slides)` neutral rules | implementer-a |
| `PixelButton.hook.ts` | edit | `usePixelButtonVisual(isDisabled, consumer?)` composes handlers (sonnet) | implementer-a |
| `PixelButton.styles.ts` | edit | `artTint`, label `inline-flex items-center gap-2` | implementer-b |
| `PixelButton.tsx` | edit | `forwardRef`, hook gets `rest`, `data-variant`, tint class (sonnet) | implementer-b |
| `PixelButton.map.test.ts`, `PixelButton.hook.test.ts` | edit | Neutral art; composition | tester-a |
| `PixelButton.test.tsx` | edit | ref, composed handlers, neutral tint, label flex | tester-b |
| `PixelButton.preview.tsx` | edit | Add states "Neutral default" and "Neutral disabled" (existing states stay) | preview-a |

### 2b: Ribbon and PixelPanel prerequisites (`src/modules/pixel-ui/components/`)
| File | New / Edit | Responsibility | Owner |
|---|---|---|---|
| `Ribbon/Ribbon.types.ts` | edit | `children: ReactNode`; props extend heading attributes | implementer-a |
| `Ribbon/Ribbon.tsx` | edit | `forwardRef`, rest spread on text element, conditional `title` (sonnet) | implementer-b |
| `PixelPanel/PixelPanel.types.ts` | edit | `PanelPadding` += `'none'`; `rootClassName?: string` | implementer-a |
| `PixelPanel/PixelPanel.styles.ts` | edit | `paddingClass.none = ''` | implementer-b |
| `PixelPanel/PixelPanel.tsx` | edit | Apply `rootClassName` with `cn` on the outer div | implementer-b |
| `Ribbon/Ribbon.test.tsx`, `PixelPanel/PixelPanel.test.tsx` | edit | New cases | tester-b |
| `Ribbon/Ribbon.preview.tsx` | edit | State "Node children" (icon + `<span>` in children) | preview-a |
| `src/modules/pixel-ui/index.ts` | no change needed (exports exist; `RibbonColor`, `PanelVariant` already exported) | | |

### 2c: Button bridge and HUD size wiring
| File | New / Edit | Responsibility | Owner |
|---|---|---|---|
| `src/components/ui/button.tsx` | edit | Sprite / plate / plain tiers (sonnet) | implementer-b |
| `src/modules/hud/components/ActionsPanel/ActionButton.tsx` | edit | Add `size="plate"` to the `<Button` at line 48 (only edit) | implementer-b |
| `src/modules/hud/components/GameBoardHeader/GameBoardHeader.tsx` | edit | Add `size="plate"` to the two `<Button` tags at lines 83 and 89 (only edit) | implementer-b |
| `src/components/ui/button.test.tsx` | new | Tier selection, ref, asChild, lock classes | tester-b |
| `src/testbed/components/ShadcnBridge/ShadcnBridgeButtons.tsx` | new | Button matrix + Tooltip triggers (sonnet) | preview-a |
| `src/testbed/components/ShadcnBridge/ShadcnBridge.preview.tsx` + `src/testbed/registry.ts` | new / edit | `shadcnBridgePreview` (group `Pixel UI`, slug `shadcn-bridge`) + registration after `pixelTypographyPreview` | preview-a |

### 2d: Dialog family
| File | New / Edit | Responsibility | Owner |
|---|---|---|---|
| `src/components/ui/dialog-frame.tsx` | new | `DialogFrame`, `DialogCloseButton`, shared class constants (sonnet) | implementer-b |
| `src/components/ui/dialog.tsx` | edit | Transparent shell, frame, ribbon title, close, footer (sonnet) | implementer-b |
| `src/components/ui/alert-dialog.tsx` | edit | Same shell; Action/Cancel as `asChild` `Button`; `variant` on Action (sonnet) | implementer-b |
| `src/components/ui/sheet.tsx` | edit | Edge-bleed frame layer, field, ribbon title, close (sonnet) | implementer-b |
| `src/modules/session/components/DeleteAccountButton/DeleteAccountButton.tsx` | edit | Add `variant="destructive"` to the `AlertDialogAction` at line 71 (only edit; keep `className`) | implementer-b |
| `src/components/ui/dialog.test.tsx`, `src/components/ui/sheet.test.tsx` | new | Dialog + AlertDialog in one file; Sheet | tester-b |
| `src/testbed/components/ShadcnBridge/ShadcnBridgeDialogs.tsx` | new | Dialog, AlertDialog, Sheet(right/left/bottom), CombatDialog-style hybrid (sonnet) | preview-a |
| `ShadcnBridge.preview.tsx` | edit | Append dialog states | preview-a |

### 2e: Card, Input, Textarea, Label, Badge, Progress
| File | New / Edit | Responsibility | Owner |
|---|---|---|---|
| `src/components/ui/card.tsx` | edit | Plate default; `frame?: PanelVariant` (sonnet) | implementer-b |
| `src/components/ui/input.tsx`, `textarea.tsx`, `label.tsx` | edit | Input / Textarea plate recipe; Label `font-pixel` | implementer-b |
| `src/components/ui/badge.tsx` | edit | Flat chip variants | implementer-b |
| `src/components/ui/progress.tsx` | edit | Plate track, `bg-accent` indicator | implementer-b |
| `src/components/ui/plates.test.tsx` | new | Card, Input, Badge, Progress | tester-b |
| `ShadcnBridgePlates.tsx` + `ShadcnBridge.preview.tsx` | new / edit | Card, Input, Badge, Progress states | preview-a |

### 2f: Overlay and navigation plates
| File | New / Edit | Responsibility | Owner |
|---|---|---|---|
| `src/components/ui/tooltip.tsx`, `popover.tsx`, `tabs.tsx`, `toast.tsx` | edit | Class strings only | implementer-b |
| `src/components/ui/overlays.test.tsx` | new | Tooltip on `Button asChild` and on sprite Button (hover, focus, leave, blur); Tabs keyboard | tester-b |
| `ShadcnBridgePlates.tsx` | edit | Tooltip, Popover, Tabs, Toast states | preview-a |

### 2g: Form-control plates
| File | New / Edit | Responsibility | Owner |
|---|---|---|---|
| `src/components/ui/switch.tsx`, `checkbox.tsx`, `radio-group.tsx`, `slider.tsx`, `separator.tsx`, `scroll-area.tsx`, `avatar.tsx` | edit | Class strings only | implementer-b |
| `src/components/ui/controls.test.tsx` | new | Checked/unchecked, keyboard, `role` unchanged | tester-b |
| `ShadcnBridgePlates.tsx` | edit | Switch, Checkbox, Radio, Slider, Separator, ScrollArea, Avatar states | preview-a |

### 2h: Close-out (no new source files)
Full checks, e2e, ui-verify, migration-debt report in `progress.md` log, docs-sync (`docs/architecture/pixel-ui.md` new section "6.19 shadcn bridge" and updated PixelButton/Ribbon/PixelPanel text; `docs/README.md` index line if the section list is indexed there; `systems-and-visuals.md` §6.10 one sentence), lessons-learned review by architect-b.

Move/rename/delete grep: nothing is moved, renamed or deleted. The only symbols whose type changes are `PixelButtonProps` (loses the `Omit`, widening), `PanelPadding` (widened), `RibbonProps.children` (widened to `ReactNode`). Existing importers (grep `from '@/modules/pixel-ui'`/relative imports inside the module) compile unchanged. `CLAUDE.md`: no edit needed. `eslint.config.mjs`: no edit.

## P2 Contracts
```ts
// ---------- 2a: PixelButton.types.ts ----------
export type PixelButtonVariant = 'primary' | 'danger' | 'neutral';
export type HookedHandlers = 'onPointerEnter' | 'onPointerLeave' | 'onPointerDown' | 'onPointerUp' | 'onPointerCancel' | 'onKeyDown' | 'onKeyUp' | 'onBlur'; // unchanged
export type ConsumerHandlers = Pick<ButtonHTMLAttributes<HTMLButtonElement>, HookedHandlers>;
export interface PixelButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> { // no Omit any more
  variant?: PixelButtonVariant; size?: PixelButtonSize; loading?: boolean;
}
// PixelButtonVisualState unchanged ({ visual; handlers: ConsumerHandlers }).

// ---------- 2a: PixelButton.map.ts ----------
const TONE: Record<PixelButtonVariant, 'Blue' | 'Red'> = { primary: 'Blue', danger: 'Red', neutral: 'Blue' }; // neutral only matters for icon sizes (D7)
function toSliceFile(visual: PixelButtonVisual, variant: PixelButtonVariant, slides: '3Slides' | '9Slides'): string;
//  variant 'neutral': visual 'disabled' -> `Button_Disable_${slides}.png`; every other visual -> `Button_Hover_${slides}.png`.
//  other variants: unchanged (hover -> Hover, disabled -> Disable, regular -> Button_{Tone}_{slides}.png, pressed -> ..._Pressed.png).
export function toButtonArt(variant: PixelButtonVariant, size: PixelButtonSize): PixelButtonArt; // signature unchanged; call toSliceFile(visual, variant, ...)

// ---------- 2a: PixelButton.hook.ts ----------
export function usePixelButtonVisual(isDisabled: boolean, consumer?: ConsumerHandlers): PixelButtonVisualState;
// For each of onPointerEnter, onPointerLeave, onPointerDown, onPointerUp, onPointerCancel, onKeyDown, onBlur the returned handler is
//   (event) => { consumer?.onX?.(event); ownX(event); }   // consumer first, always, then the hook's own
// onKeyUp is not returned (the view's {...rest} already carries the consumer's). Visual rules unchanged.

// ---------- 2a: PixelButton.styles.ts ----------
//  styles.artTint(variant: PixelButtonVariant, visual: PixelButtonVisual): string
//    'neutral' && 'hover' -> 'brightness-110'; 'neutral' && 'pressed' -> 'brightness-90'; else ''.
//  styles.label base: 'relative inline-flex items-center gap-2 text-lg font-semibold text-ink'.
//  styles.artStack(isPressed: boolean): unchanged; the view adds styles.artTint(...) with cn().

// ---------- 2a: PixelButton.tsx ----------
export const PixelButton: ForwardRefExoticComponent<PixelButtonProps & RefAttributes<HTMLButtonElement>>;
// forwardRef<HTMLButtonElement, PixelButtonProps>(function PixelButton(...)); displayName 'PixelButton'.
// const { visual, handlers } = usePixelButtonVisual(isDisabled, rest);
// <button ref={ref} type="button" {...rest} {...handlers} disabled={isDisabled} aria-busy={loading || undefined}
//         data-visual={visual} data-variant={variant} className={cn(styles.root({ size }), className)}>
// artStack span: className={cn(styles.artStack(visual === 'pressed' && art.kind !== 'icon'), art.kind !== 'icon' && styles.artTint(variant, visual))}

// ---------- 2b: Ribbon.types.ts ----------
export interface RibbonProps extends Omit<ComponentPropsWithoutRef<'h2'>, 'color' | 'children' | 'className'> {
  color?: RibbonColor; as?: RibbonHeading; icon?: ReactNode;
  className?: string;          // still goes to the frame (ThreeSlice), not the text element
  children: ReactNode;
}
// ---------- 2b: Ribbon.tsx ----------
export const Ribbon: ForwardRefExoticComponent<RibbonProps & RefAttributes<HTMLElement>>;
// forwardRef<HTMLElement, RibbonProps> (widened at 2b review: the default element is a div). Use `const Text = as as ElementType;` to keep the JSX typed (div|h2|h3 share the ref/HTML props used here).
// <Text ref={ref} {...rest} title={rest.title ?? (typeof children === 'string' ? children : undefined)} className={cn(styles.text, ribbonTextColor[color])}>{children}</Text>
// `title` is destructured out of rest so an explicit title wins. Everything else unchanged.

// ---------- 2b: PixelPanel ----------
export type PanelPadding = 'none' | 'sm' | 'md';          // none -> '' (no padding class)
export interface PixelPanelProps extends ComponentPropsWithoutRef<'div'> { /* existing fields */ rootClassName?: string }
// PixelPanel.tsx: <div className={cn(styles.root(isTitled), rootClassName)}> ... (rest and className still go to NineSlice)
// paddingClass: Record<PanelPadding, string> = { none: '', sm: 'p-2', md: 'p-4' }

// ---------- 2c: src/components/ui/button.tsx ----------
import { PixelButton, type PixelButtonVariant } from '@/modules/pixel-ui';   // both exported by the barrel (index.ts:20-25)
export type ButtonVariant = 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
export type ButtonSize = 'default' | 'lg' | 'sm' | 'icon' | 'plate';
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant; size?: ButtonSize; asChild?: boolean;
}
export const buttonVariants: (props?: { variant?: ButtonVariant; size?: ButtonSize; className?: string }) => string; // cva, plate/plain classes only (used by calendar.tsx)
export const Button: React.ForwardRefExoticComponent<ButtonProps & React.RefAttributes<HTMLButtonElement>>;

const SPRITE_VARIANT: Partial<Record<ButtonVariant, PixelButtonVariant>> =
  { default: 'primary', destructive: 'danger', outline: 'neutral', secondary: 'neutral' };   // ghost/link absent = never sprite
const SPRITE_LOCK = '!h-16 !rounded-none !border-0 !bg-transparent !bg-none !shadow-none';
const SPRITE_WIDTH: Record<'default' | 'lg', string> = { default: '!min-w-[128px]', lg: '!min-w-[192px] px-8' };

// Render rule (exact):
//   const spriteVariant = SPRITE_VARIANT[variant ?? 'default'];
//   isSprite = !asChild && (size === 'default' || size === 'lg') && spriteVariant !== undefined      // size undefined counts as 'default'
//   (destructure variant, size, asChild, className out of props first; asChild/size must never reach the DOM or PixelButton)
//   isSprite -> <PixelButton ref variant={spriteVariant} className={cn(SPRITE_WIDTH[size], className, SPRITE_LOCK)} {...props} />   // size NOT forwarded to PixelButton (its size stays 'default')
//   else     -> Comp = asChild ? Slot : 'button'; <Comp ref className={buttonVariants({ variant, size: asChild && isSpriteSize ? 'plate' : size, className })} {...props} />
// plate size classes: sm 'h-9 px-3 text-sm'; icon 'h-10 w-10'; plate 'h-10 px-4 py-2'; default and lg (cva, reached only by ghost/link or asChild) 'h-10 px-4 py-2' (lg: 'h-10 px-8').
// Plate base: 'inline-flex items-center justify-center whitespace-nowrap rounded-none font-pixel text-sm font-semibold ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50'
// Plate variants (cva). 2c deviation (accepted): the 2px outline is an inset ring (box-shadow), not border-2, because a real border grew content-sized/h-auto HUD buttons by 2-4 px; outline keeps a 1px transparent border (old outline had border). Ring replaces nothing in focus: focus-visible ring-2 ring-ring takes over the box-shadow while focused (accepted).
// lg deviation (accepted): lg does NOT use the 9-slice sheet; art stays the 'default' 3-slice, width comes from SPRITE_WIDTH.lg (!min-w-[192px] px-8).
// Carry-over (2d / Phase 6): ghost/link use text-foreground (light), unreadable on paper dialog backgrounds; give them an ink text colour inside paper frames. Caller concern: icon size has no shrink-0, so in a flex row with 128px sprite buttons it shrinks (20px seen); callers add shrink-0. Sprite label wider than the 128px art overflows slightly (e.g. 'Confirm default'); caller content width.
//   default     'ring-2 ring-inset ring-ink bg-primary text-primary-foreground shadow-[0_2px_0_hsl(var(--ink))] hover:bg-primary/90 active:translate-y-[1px] active:shadow-[0_1px_0_hsl(var(--ink))]'
//   destructive 'ring-2 ring-inset ring-ink bg-destructive text-destructive-foreground shadow-[0_2px_0_hsl(var(--ink))] hover:bg-destructive/90 active:translate-y-[1px] active:shadow-[0_1px_0_hsl(var(--ink))]'
//   outline     'border border-transparent ring-2 ring-inset ring-muted-foreground bg-card text-foreground shadow-[0_2px_0_hsl(var(--ink))] hover:bg-accent hover:text-accent-foreground active:translate-y-[1px] active:shadow-[0_1px_0_hsl(var(--ink))]'
//   secondary   'ring-2 ring-inset ring-muted-foreground bg-secondary text-secondary-foreground shadow-[0_2px_0_hsl(var(--ink))] hover:bg-secondary/80 active:translate-y-[1px] active:shadow-[0_1px_0_hsl(var(--ink))]'
//   ghost       'bg-transparent text-foreground hover:bg-accent/20 active:translate-y-[1px]'
//   link        'text-accent underline underline-offset-4 hover:text-foreground active:translate-y-[1px]'
// File comment states: asChild is always plate/plain; className colour/border/radius/height are ignored on the sprite tier by SPRITE_LOCK.

// ---------- 2d: src/components/ui/dialog-frame.tsx ('use client') ----------
import type { RibbonColor } from '@/modules/pixel-ui';
export type DialogFrameKind = 'special' | 'paper';
export const MOTION_REDUCE = 'motion-reduce:animate-none motion-reduce:duration-0';
export const SHELL_TRANSPARENT = 'border-0 bg-transparent p-0 shadow-none backdrop-blur-none';   // appended AFTER caller className
export const TITLE_RIBBON = 'mx-auto block max-w-[calc(100%-6rem)]';
export const DESCRIPTION_CLASS = 'font-readable text-sm text-muted-foreground';
export const FOOTER_CLASS = 'flex flex-col-reverse gap-2 sm:flex-row sm:justify-end';
export interface DialogFrameProps { frame: DialogFrameKind; children: React.ReactNode }
export function DialogFrame(props: DialogFrameProps): JSX.Element;
//   <PixelPanel variant={frame} padding="none"><div className={cn('grid max-h-[calc(100dvh-3rem)] gap-4 overflow-y-auto px-4 py-2', frame === 'special' && 'bg-black/50')}>{children}</div></PixelPanel>
export function DialogCloseButton(props: { className?: string }): JSX.Element;
//   <DialogPrimitive.Close asChild><PixelButton size="icon-round" className={cn('absolute right-4 top-6', className)}><X className="h-5 w-5 text-ink" /><span className="sr-only">Close</span></PixelButton></DialogPrimitive.Close>
//   (DialogPrimitive from '@radix-ui/react-dialog'; used by dialog.tsx and sheet.tsx)

// ---------- 2d: dialog.tsx ----------
interface DialogContentProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> { frame?: DialogFrameKind } // default 'special'
// DialogContent: <DialogPortal><DialogOverlay/><DialogPrimitive.Content ref className={cn(SHELL, className, SHELL_TRANSPARENT)} {...props}><DialogFrame frame={frame}>{children}</DialogFrame><DialogCloseButton/></DialogPrimitive.Content></DialogPortal>
// SHELL = 'fixed left-[50%] top-[50%] z-50 w-[calc(100vw-16px)] max-w-lg max-h-[calc(100dvh-16px)] translate-x-[-50%] translate-y-[-50%] duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] ' + MOTION_REDUCE
// Overlay: unchanged classes + MOTION_REDUCE.
interface DialogTitleProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title> { ribbon?: RibbonColor; icon?: React.ReactNode } // ribbon default 'blue'
// DialogTitle: const { className, ribbon = 'blue', icon, children, ...props }; <DialogPrimitive.Title ref={ref} asChild {...props}><Ribbon as="h2" color={ribbon} icon={icon} className={cn(TITLE_RIBBON, className)}>{children}</Ribbon></DialogPrimitive.Title>
// DialogDescription: cn(DESCRIPTION_CLASS, className). DialogHeader unchanged. DialogFooter: cn(FOOTER_CLASS, className).
// All existing exports keep their names: Dialog, DialogPortal, DialogOverlay, DialogClose, DialogTrigger, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription.

// ---------- 2d: alert-dialog.tsx ----------
// AlertDialogContent: same as DialogContent with AlertDialogPrimitive, prop `frame?: DialogFrameKind`, NO close button.
// AlertDialogTitle: same props/behaviour as DialogTitle (AlertDialogPrimitive.Title asChild + Ribbon).
interface AlertDialogActionProps extends React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Action> { variant?: 'default' | 'destructive' }
// AlertDialogAction: const { className, variant = 'default', children, ...props }; <AlertDialogPrimitive.Action ref={ref} asChild {...props}><Button variant={variant} className={className}>{children}</Button></AlertDialogPrimitive.Action>
// AlertDialogCancel: same with <Button variant="outline" className={className}>; the old 'mt-2 sm:mt-0' is dropped.
// Remove the import of buttonVariants; import { Button } from '@/components/ui/button'.
// AlertDialogHeader unchanged; AlertDialogFooter: cn(FOOTER_CLASS, className); AlertDialogDescription: cn(DESCRIPTION_CLASS, className).

// ---------- 2d: sheet.tsx ----------
type SheetSide = 'top' | 'bottom' | 'left' | 'right';
const SHEET_BLEED: Record<SheetSide, { frame: string; field: string }> = {
  right:  { frame: '-inset-y-16 -right-16 left-0',  field: 'ml-4' },
  left:   { frame: '-inset-y-16 -left-16 right-0',  field: 'mr-4' },
  bottom: { frame: '-inset-x-16 -bottom-16 top-0',  field: 'mt-4' },
  top:    { frame: '-inset-x-16 -top-16 bottom-0',  field: 'mb-4' },
};
// sheetVariants (cva) keeps the `side` variant: base 'fixed z-50 flex flex-col overflow-hidden transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:duration-500 ' + MOTION_REDUCE;
//   top 'inset-x-0 top-0 max-h-[85dvh] data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top'
//   bottom 'inset-x-0 bottom-0 max-h-[85dvh] data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom'
//   left 'inset-y-0 left-0 h-full w-3/4 sm:max-w-sm data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left'
//   right 'inset-y-0 right-0 h-full w-3/4 sm:max-w-sm data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right'
// SheetContent: <SheetPrimitive.Content ref className={cn(sheetVariants({ side }), className, 'bg-transparent p-0 shadow-none')} {...props}>
//     <PixelPanel aria-hidden variant="special" padding="none" rootClassName={cn('pointer-events-none absolute', SHEET_BLEED[side].frame)} className="h-full w-full" />
//     <div className={cn('relative flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto bg-black/50 p-4', SHEET_BLEED[side].field)}>{children}</div>
//     <SheetCloseButton />   // = <DialogCloseButton className="right-6 top-6" /> (same Radix Close; className override wins via cn)
//   </SheetPrimitive.Content>
// SheetTitle: ribbon prop like DialogTitle (default 'blue'); SheetDescription: DESCRIPTION_CLASS; SheetFooter: FOOTER_CLASS; SheetHeader unchanged. Exports unchanged.
// `bottom`/`top` sheets: ribbon centred by TITLE_RIBBON (mx-auto). left/right: same preset (simplification of "w-full", ui-verify may tune).

// ---------- 2e: card.tsx ----------
interface CardProps extends React.HTMLAttributes<HTMLDivElement> { frame?: PanelVariant }   // import { PixelPanel, type PanelVariant } from '@/modules/pixel-ui' (both exported, index.ts:3,6-10)
// Card: frame ? <PixelPanel variant={frame} padding="none" className={className} {...props} /> : <div ref className={cn('rounded-none border-2 border-border bg-card text-card-foreground shadow-[0_2px_0_hsl(var(--ink))]', className)} {...props} />
// CardTitle: 'font-pixel text-2xl font-semibold leading-none'. CardDescription: 'font-readable text-sm text-muted-foreground'. CardHeader/CardContent/CardFooter padding unchanged.
// ---------- 2e: input.tsx / textarea.tsx ----------
// Input classes: 'flex h-10 w-full rounded-none border-2 border-muted-foreground bg-background px-3 py-2 font-readable text-base shadow-[inset_0_2px_0_hsl(var(--ink))] ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground hover:border-foreground/60 focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 aria-[invalid=true]:border-destructive disabled:cursor-not-allowed disabled:opacity-50'
// Textarea: same string without h-10, with 'min-h-[80px]'. Label: 'font-pixel text-sm font-semibold leading-none text-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-70'.
// ---------- 2e: badge.tsx ----------
// base 'inline-flex min-h-6 items-center rounded-none border-2 px-2 py-0.5 font-pixel text-xs font-semibold shadow-[0_1px_0_hsl(var(--ink))] transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'
//   default 'border-ink bg-primary text-primary-foreground'; secondary 'border-muted-foreground bg-secondary text-secondary-foreground'; destructive 'border-ink bg-destructive text-destructive-foreground'; outline 'border-border bg-background/60 text-foreground'
//   hover shifts removed (Badge is a div; spec: hover only if interactive). `badgeVariants` and `BadgeProps` exports unchanged.
// ---------- 2e: progress.tsx ----------
// Root 'relative h-4 w-full overflow-hidden rounded-none border-2 border-border bg-secondary'; indicator 'h-full w-full flex-1 bg-accent transition-all motion-reduce:transition-none'; transform line unchanged.

// ---------- 2f class strings (replace the matching substrings, keep every other class and all Radix props) ----------
// tooltip content:  'z-50 overflow-hidden rounded-none border-2 border-border bg-popover px-3 py-1.5 font-readable text-sm text-popover-foreground shadow-[0_2px_0_hsl(var(--ink))] animate-in ...(animation classes unchanged)'
// popover content:  'z-50 w-72 rounded-none border-2 border-border bg-popover p-4 font-readable text-popover-foreground shadow-[0_2px_0_hsl(var(--ink))] outline-none ...(animation classes unchanged)'
// tabs list:        'inline-flex h-10 items-center justify-center rounded-none border-2 border-border bg-muted p-1 text-muted-foreground'
// tabs trigger:     'inline-flex items-center justify-center whitespace-nowrap rounded-none border-b-2 border-transparent px-3 py-1.5 font-pixel text-sm font-semibold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:border-accent data-[state=active]:bg-card data-[state=active]:text-accent'
// toast base (toastVariants cva base): replace 'rounded-md border ... shadow-lg' by 'rounded-none border-2 ... shadow-[0_2px_0_hsl(var(--ink))]'; default variant 'border-border bg-card text-card-foreground'; destructive variant 'destructive group border-ink bg-destructive text-destructive-foreground'; ToastTitle 'font-pixel text-sm font-semibold'; ToastDescription 'font-readable text-sm opacity-90'; ToastAction/ToastClose: 'rounded-none' instead of 'rounded-md'/'rounded-md' (read the file; change only radius classes).
// ---------- 2g class strings ----------
// switch root: 'peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-none border-2 border-muted-foreground transition-colors focus-visible:... (unchanged ring classes) disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input'; thumb: 'pointer-events-none block h-4 w-4 rounded-none bg-foreground shadow-[0_1px_0_hsl(var(--ink))] ring-0 transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0'   // h-4 w-4 so the 20px inner height (24 - 2x2 border) keeps 2 px margin; checked travel 20px as today
// checkbox: 'peer h-4 w-4 shrink-0 rounded-none border-2 border-muted-foreground ring-offset-background ... data-[state=checked]:border-ink data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground'
// radio item: 'aspect-square h-4 w-4 rounded-none border-2 border-muted-foreground text-primary ...'  (Indicator Circle -> keep lucide Circle; the box is square)
// slider track 'relative h-2 w-full grow overflow-hidden rounded-none border-2 border-muted-foreground bg-secondary' -> use 'h-3'; range 'bg-primary'; thumb 'block h-5 w-5 rounded-none border-2 border-ink bg-foreground ...'
// separator: 'shrink-0 bg-border' with thickness 2 px: horizontal 'h-[2px] w-full', vertical 'h-full w-[2px]' (replace 'h-[1px]'/'w-[1px]').
// scroll-area thumb 'relative flex-1 rounded-none bg-border'; avatar root/fallback 'rounded-none border-2 border-border' (root) and 'rounded-none bg-muted' (fallback).
```

## P2 Phases
Each sub-phase: implement, tests, previews, checks, ui-verify where stated, commit, stop for `continue`. Every sub-phase ends with `npm run typecheck`, `npm run lint`, `npm test`; quote the summary lines. Commit message: `feat(shadcn-bridge): <what> [phase 2<letter>/2h]`.

### Phase 2a: PixelButton prerequisites (5 source files)
1. `PixelButton.types.ts` per P2 Contracts. (implementer-a)
2. `PixelButton.map.ts`: add `neutral` to `TONE`; change `toSliceFile` signature and the two call sites in `toButtonArt`. (implementer-a)
3. `PixelButton.hook.ts`: add the `consumer` param; wrap each of the 7 handlers. Keep the cleanup effects as they are. Sonnet. (implementer-a)
4. `PixelButton.styles.ts`: `artTint(variant, visual)`, label `inline-flex items-center gap-2`. (implementer-b)
5. `PixelButton.tsx`: `forwardRef`, pass `rest` to the hook, add `data-variant`, add the tint class on the art stack for non-icon art. Sonnet. (implementer-b)
6. Tests (tester-a then tester-b), preview states (preview-a), checks. ui-verify: `/testbed/pixel-ui-button` hover/press on the new neutral states at 1280 and 390; confirm the computed `filter` on the art stack is `brightness(1.1)` on hover and that `background-image` urls contain `Button_Hover_3Slides`.

### Phase 2b: Ribbon and PixelPanel prerequisites (5 source files)
1. `Ribbon.types.ts` (implementer-a); `Ribbon.tsx` forwardRef + rest + conditional title (implementer-b, sonnet).
2. `PixelPanel.types.ts` (implementer-a); `PixelPanel.styles.ts`, `PixelPanel.tsx` (implementer-b).
3. Tests, preview state, checks. ui-verify: `/testbed/pixel-ui-ribbon` "Node children" and `/testbed/pixel-ui-panel` unchanged (compare existing states, no visual change).

### Phase 2c: Button bridge (3 source files + preview)
1. `button.tsx` per Contracts. Sonnet. Keep `Button.displayName`, keep exporting `buttonVariants` with the same call shape. (implementer-b)
2. HUD wiring: add `size="plate"` at `ActionButton.tsx:48`, `GameBoardHeader.tsx:83` and `:89`. Nothing else in those files. (implementer-b)
3. `button.test.tsx` (tester-b). `ShadcnBridgeButtons.tsx`, `ShadcnBridge.preview.tsx`, registry (preview-a, sonnet).
4. Run `npm test` and list every failing test with its cause in the report (expected: none; see P2 Test impact).
5. ui-verify: `/testbed/shadcn-bridge` at 1280x720 and 390x844; Tooltip on `Button asChild` and on sprite Button (hover, keyboard focus, leave, blur); GameBoard HUD in `/testbed/hud-actions-panel` and `/testbed/hud-game-board-header` identical size to `git stash` baseline (compare `getBoundingClientRect` of the buttons before/after).

### Phase 2d: Dialog family (5 source files + 1 one-line edit)
1. `dialog-frame.tsx` (implementer-b, sonnet).
2. `dialog.tsx`, then `alert-dialog.tsx`, then `sheet.tsx` (implementer-b, sonnet). Order matters: alert-dialog needs `Button` from 2c.
3. `DeleteAccountButton.tsx`: add `variant="destructive"` (implementer-b).
4. Tests (tester-b), preview `ShadcnBridgeDialogs.tsx` (preview-a, sonnet) with states listed under P2 Preview states.
5. Run `npm test`; list every failing test with its cause (expected set in P2 Test impact); fix tests only when the change in behaviour is intended (DOM structure of dialogs) and say so in the report. Never weaken an assertion about behaviour.
6. ui-verify: `/testbed/shadcn-bridge` dialog states plus `/testbed/combat-combat-dialog` (hybrid), `/testbed/hud-mobile-event-log-sheet`, `/testbed/session-victory-dialog` (slugs verified in the `*.preview.tsx` files this session) at 1280x720 and 390x844. Tune only the numbers marked `// tunable` in D2/D14 and report old/new values in the `progress.md` log. Measure: shell width 374, field text column 310 at 390 px, close button box inside the frame and not intersecting the ribbon, contrast samples on the dark field (Final spec item 2 / 11).

### Phase 2e: Card, Input, Textarea, Label, Badge, Progress (6 source files)
1. `card.tsx` (sonnet), `input.tsx`, `textarea.tsx`, `label.tsx`, `badge.tsx`, `progress.tsx`. (implementer-b)
2. Tests, preview `ShadcnBridgePlates.tsx` (preview-a), checks. Record `text-primary-foreground` on `--primary` ratio (5.01 measured in review) and the `border-muted-foreground` boundary contrast on `bg-background` for Input (>= 3:1).
3. ui-verify: lobby (`/testbed/lobby-main`), login (`/testbed/session-login`), `turn-countdown-timer` badge in `/testbed/hud-game-board-header`: no layout shift beyond +2 px borders.

### Phase 2f: Tooltip, Popover, Tabs, Toast (4 source files)
1. Class edits per Contracts. (implementer-b)
2. `overlays.test.tsx`, preview states, checks. ui-verify: `TutorialBeacon` and `LobbyGameRow` popovers have the same width class behaviour (`w-72` default + caller classes) and no size change beyond the border.

### Phase 2g: Switch, Checkbox, Radio, Slider, Separator, ScrollArea, Avatar (7 source files)
1. Class edits per Contracts. (implementer-b)
2. `controls.test.tsx`, preview states, checks. ui-verify: `CustomSettingsSheet` (`/testbed/lobby-settings-sheet`) shows switches/sliders/tabs readable on the dark field.

### Phase 2h: Close-out
1. Full `npm run typecheck`, `npm run lint`, `npm test`.
2. `npm run test:e2e -- e2e/gameplay.spec.ts`, `e2e/auth-and-lobby.spec.ts`, `e2e/map-viewport.spec.ts`, `e2e/tutorial-beacons.spec.ts`, `e2e/bot-vs-bot-ui.spec.ts`, `e2e/reconnect-bot-takeover.spec.ts` (needs Java 21). Failures are reported with the selector that broke.
3. ui-verify screenshots: `/` login, lobby, one in-game screen with a dialog open, the mobile bottom sheet (all at 1280x720 and 390x844), zero 404s for `/tiny-swords/*` in the console.
4. Migration-debt report: re-run the scan commands in "P2 Migration debt", write the result as one log line per category in `progress.md`.
5. docs-sync (mandatory), then architect-b final review.

Model escalation: sonnet for `PixelButton.hook.ts`, `PixelButton.tsx`, `Ribbon.tsx`, `button.tsx`, `dialog-frame.tsx`, `dialog.tsx`, `alert-dialog.tsx`, `sheet.tsx`, `card.tsx`, all preview files, and all ui-verify steps. Everything else haiku.

## P2 Test plan
Existing tests keep passing unless listed under Test impact.
- tester-a (logic, first):
  - `PixelButton.map.test.ts`: `toButtonArt('neutral','default')` kind `three`: regular, hover, pressed urls end `Button_Hover_3Slides.png`; disabled ends `Button_Disable_3Slides.png`; same for `'large'` with `9Slides`; `neutral` + `icon-round`: regular `SmallBlueRoundButton_Regular.png`, pressed `..._Pressed.png`; primary/danger results unchanged (existing cases); every url exists on disk (`fs.existsSync(path.join('public', decodeURI(url)))`).
  - `PixelButton.hook.test.ts`: with `consumer.onPointerEnter = jest.fn()` the consumer is called once with the event and `visual` becomes `'hover'`; call order consumer then own (assert with a shared `calls` array: consumer pushes `'consumer'`, own effect checked by state after); same for `onKeyDown` (Enter), `onBlur`, `onPointerLeave`; consumer undefined works (existing tests); handlers object has no `onKeyUp`.
- tester-b (view):
  - `PixelButton.test.tsx`: `ref` receives the `<button>` (`createRef`); consumer `onPointerEnter`, `onKeyDown`, `onBlur` are called AND `data-visual` changes (`hover`, `pressed`, `regular`); `data-variant="neutral"`; neutral hover: art stack has class `brightness-110`, pressed `brightness-90`, regular none; primary hover has no brightness class; icon sizes never get the tint; label has `inline-flex`.
  - `Ribbon.test.tsx`: children `<><span>12</span> text</>` renders, no `title` attribute; string children keep `title`; `ref` is the heading element for `as="h2"`; `id="x"` and `data-testid` land on the text element, not on the frame; explicit `title="T"` wins.
  - `PixelPanel.test.tsx`: `padding="none"` inner wrapper has neither `p-2` nor `p-4`; `rootClassName="absolute"` is on the outer div and `className` still on the frame; titled + none still adds `pt-8`.
  - `src/components/ui/button.test.tsx` (`render`, `fireEvent`, no `user-event`):
    - Tier: default/destructive/outline/secondary with no size -> `data-variant` `primary`/`danger`/`neutral`/`neutral` and `data-visual` present; `size="lg"` -> same plus class `px-8`; `sm`, `icon`, `plate`, `ghost`, `link`, `asChild` -> no `data-visual`, plate classes (`rounded-none`, `font-pixel`, `h-9` / `h-10 w-10` / `h-10 px-4`).
    - `asChild` with `<a href>` renders an anchor with the plate classes and keeps `href`.
    - Sprite lock: `className="bg-red-500 h-11 w-full"` -> class list contains `w-full`, `!h-16`, `!bg-transparent`, `!bg-none`.
    - `ref` forwarded in both tiers; `disabled` sprite does not fire `onClick`; `onClick` fires on enabled; `type` defaults to `button` in sprite tier, `type="submit"` passes through.
    - Name: `getByRole('button', { name: 'Save' })` works in both tiers.
  - `src/components/ui/dialog.test.tsx` (Dialog + AlertDialog):
    - Dialog open: `role="dialog"`; `aria-labelledby` resolves to the `h2` whose text is the title; accessible name equals the text; description linked by `aria-describedby`; a button named `Close` exists (sr-only), is a sprite icon button (`data-variant="primary"`); clicking it calls `onOpenChange(false)`; Esc closes (`fireEvent.keyDown(dialog, { key: 'Escape' })`).
    - Content root (the element with role dialog) has classes `bg-transparent`, `border-0`, `shadow-none` even when the caller passes `bg-background/90 backdrop-blur-2xl border border-white/15`, and still has the caller's `max-w-md`; the frame art cells reference `SpecialPaper.png` (query a cell `style.backgroundImage`); `frame="paper"` references `RegularPaper.png` and has no `bg-black/50` field.
    - Title with `ribbon="red"` -> ribbon art url contains `Ribbon_Red`; title with a React node child and `icon` renders both; long title has no `title` attribute when children is not a string.
    - Footer has classes `flex-col-reverse` and `gap-2`.
    - AlertDialog: `role="alertdialog"`, no button named `Close`, `AlertDialogCancel` has focus after open (`expect(cancel).toHaveFocus()`), Action default `data-variant="primary"`, `variant="destructive"` -> `danger`, Cancel -> `neutral`; Action `onClick` called; caller `onEscapeKeyDown` called on Esc and when it calls `preventDefault` the dialog stays open; `AlertDialogAction className="w-full"` keeps `w-full`.
    - Focus return: open via `DialogTrigger asChild` wrapping `Button` (sprite) and `Button size="sm"`; after close, focus is on the trigger.
  - `src/components/ui/sheet.test.tsx`: `side` right/left/bottom/top: shell has the matching slide class and `fixed`; frame layer (`[aria-hidden]` with `SpecialPaper.png`) has the matching bleed classes from `SHEET_BLEED` (e.g. right: `-right-16`, `left-0`); field has `ml-4` (right); title is an `h2` with `aria-labelledby` resolution; `Close` button present; caller classes `h-[75vh] max-h-[85vh] flex flex-col p-0` stay on the shell; children render inside the field.
  - `src/components/ui/plates.test.tsx`: Card default classes `rounded-none border-2 bg-card`; `frame="paper"` renders RegularPaper cells and no `bg-card`; Card children render; Input: `type`, `placeholder`, `value` change via `fireEvent.change`, class contains `font-readable`, `aria-invalid="true"` present attribute is accepted (class string contains `aria-[invalid=true]:border-destructive`); Badge four variants have `rounded-none` and `border-2`; Badge `className` passes through; `data-testid` passes through; Progress `role="progressbar"` with `aria-valuenow` for `value={40}` and indicator transform `translateX(-60%)`.
  - `src/components/ui/overlays.test.tsx`: `Tooltip` open on `fireEvent.focus` of a trigger that is `<TooltipTrigger asChild><Button size="sm">` and of `<TooltipTrigger asChild><Button>` (sprite); closes on `fireEvent.blur`; opens on `pointerMove`/`pointerEnter` per Radix (use `userEvent`-free `fireEvent.pointerMove`; if Radix needs a delay use `TooltipProvider delayDuration={0}`); content has `rounded-none border-2`. Tabs: `fireEvent.keyDown(tab, { key: 'ArrowRight' })` moves `aria-selected`. Popover opens on trigger click, content `rounded-none`. Toast: `Toast` default and destructive variants render title and description.
  - `src/components/ui/controls.test.tsx`: Switch `role="switch"` toggles `aria-checked`; Checkbox `role="checkbox"` toggles; RadioGroup arrow keys change selection; Slider `role="slider"` exposes `aria-valuenow`; Separator has `role` per `decorative`; classes `rounded-none` on Switch, Checkbox, Radio item.
- e2e: no new spec. Existing dialog flows are re-run in 2h.

### P2 Test impact (existing tests; none verified failing, risk list from grep this session)
Expected: no failures from Button (labels stay accessible names; `textContent` of a sprite button equals its label because the art spans are empty). Risk list, to be run first in 2c/2d and fixed only if the change in DOM structure is intended:
- Dialog/sheet structure (2d): `src/modules/hud/components/ActionsPanel/MobileActionsSheet.test.tsx:236,273` (`container.querySelector('[role="dialog"]')`, `button[aria-label*="close"]`: the new Close button has no `aria-label`, only sr-only text, as before, so the second query keeps returning `null` as today; verify), `MobileEventLogSheet.test.tsx` (Esc, sr-only title: the title is now a Ribbon `h2` with `sr-only` on the frame), `src/modules/session/components/VictoryDialog/VictoryDialog.test.tsx:73` (`getAllByRole('button')` count, heading role), `VictoryDialog.preview.test.tsx`, `src/modules/game-board/components/ConnectionWarningDialog/ConnectionWarningDialog.test.tsx:62` (`getAllByRole('button')` length 1: AlertDialog has no Close, unchanged), `src/modules/combat/components/MonsterSelectionDialog/MonsterSelectionDialog.test.tsx:47,62` (button count and `textContent !== 'Cancel'`: label text only; unchanged), `src/modules/lobby/components/CreateGameDialog/CreateGameDialog.test.tsx` (`getAllByRole('button')` filters; `DialogContent` now has one extra Close button as before), `src/modules/avatars/components/AvatarPickerButton/AvatarPickerButton.test.tsx`, `src/modules/combat/components/CombatDialog/CombatDialog.test.tsx` and `MonsterCombatDialog.test.tsx`.
- Heading queries on titles: `getByRole('heading', { name })` still matches (Ribbon `as="h2"`); a title whose children are not a plain string loses the `title` attribute only.
- Duplicate text: none expected (`title` attribute is not text).
- `src/testbed/components/CardPlaySandbox/CardPlaySandbox.test.tsx` renders Buttons and dialogs: re-run.
- Tests mocking `@/components/ui/tooltip` (4 files above): unaffected.
- Run `npm test` after 2c and after 2d, and read the full failure list before changing any test.

## P2 Preview states
Slug `shadcn-bridge`, title "shadcn bridge", group `Pixel UI`, file `src/testbed/components/ShadcnBridge/ShadcnBridge.preview.tsx` exporting `shadcnBridgePreview: ComponentPreview`; registered in `src/testbed/registry.ts` (import line after `pixelTypographyPreview`, array entry after `pixelTypographyPreview`). The preview file only assembles; states live in `ShadcnBridgeButtons.tsx`, `ShadcnBridgeDialogs.tsx`, `ShadcnBridgePlates.tsx` (each under 150 lines). Strings from the Final spec "Copy".
- 2c "Buttons default": rows variant x size (`default`, `lg`, `sm`, `icon`, `plate`) with label "Confirm"/"Cancel"/"Leave"/"Stay"; ghost and link rows; "Buttons disabled" (same matrix disabled); "Buttons asChild" (`<Button asChild><a href="#">Open</a></Button>`); "Buttons on special frame" (a `PixelPanel variant="special"` holding sm and default buttons); "Button tooltip" (Tooltip "End turn" on a sprite Button and on a `Button asChild`); "Buttons mobile row" (310 px wide column, two `default` buttons side by side).
- 2d "Dialog" (trigger button "Open dialog": title "Move army", description "Choose how many units to send.", actions "Confirm"/"Cancel"); "Dialog long content" (scrolls); "Dialog paper frame"; "Dialog with glass className" (caller passes `bg-background/90 backdrop-blur-2xl border border-white/15 max-w-md`); "Dialog hybrid" (CombatDialog-like: icon title, `sm` plate buttons, coloured texts `text-red-400`, `text-blue-400`, `text-gray-400`, `text-muted-foreground` on the dark field for the contrast samples); "AlertDialog" (title "Leave match?", description "Your army stays on the map.", actions "Leave" destructive, "Stay"); "Sheet right", "Sheet left", "Sheet bottom" (title "Event Log", description "Last 20 events.", long scrolling list).
- 2e "Card plate", "Card frames" (paper, special, carved; never wood below 256 px), "Input" (label "Game name", placeholder "My island", value, disabled, invalid with message "Name is required"), "Badges" ("Bot", "3", "00:12" in the four variants; digits in `font-readable tabular-nums`), "Progress" (0, 40, 100).
- 2f "Tooltip", "Popover", "Tabs", "Toast" (default and destructive, rendered statically with `Toast` inside a `ToastProvider` + `ToastViewport` positioned `static`).
- 2g "Form controls" (Switch on/off/disabled, Checkbox, RadioGroup, Slider, Separator horizontal and vertical, ScrollArea, Avatar with fallback).
State names are unique within the preview (registry test).

## P2 Migration debt (re-run in 2h; scan script run this session over `src/**/*.tsx`, non-test, outside `src/components/ui`; 135 `<Button>`/`AlertDialogAction`/`AlertDialogCancel` tags, 51 with `bg-|border|rounded|h-N|shadow` classes in `className`, after resolving `styles.x` in the sibling `*.styles.ts`)
A. Sprite tier (default size, variants default/destructive/outline/secondary) whose `className` sets gradient/colour/shadow/height. Phase 2 neutralises them with `SPRITE_LOCK`; the call sites must later drop those classes and choose a `variant` instead:
  - `src/modules/combat/components/MonsterCombatDialog/MonsterAttackScreen.tsx:102` (`attackButton`, red-amber gradient, shadow)
  - `src/modules/combat/components/MonsterCombatDialog/MonsterResultsScreen.tsx:122` (`AlertDialogAction` `continueButton`, amber gradient)
  - `src/modules/combat/components/CombatDialog/CombatDialog.tsx:116,129` (`rollButton`, `confirmButton`)
  - `src/modules/cards/components/ProductiveCardDialog/ProductiveCardDialog.tsx:69` (`confirmButton`)
  - `src/modules/cards/components/SpecialIslandRollDialog/SpecialIslandRollDialog.tsx:86,91` (`rollButton`, `closeButton` `bg-white/10`)
  - `src/modules/lobby/components/RejoinMatchPanel/RejoinMatchPanel.tsx:14` (`reclaimButton`)
  - `src/modules/lobby/components/Lobby/Lobby.tsx:68` (`createButton`)
  - `src/modules/lobby/components/CreateGameDialog/CreateGameDialog.tsx:104` and `CreateGameDialog.preview.tsx:110` (`createButton`)
  - `src/modules/hud/components/GameBoardHeader/GameBoardHeader.tsx:89` (`startGameButton`; plate tier after D4, class still honoured)
  - `src/modules/session/components/VictoryDialog/VictoryDialog.tsx:74` (`returnButton`, `h-11` forced to `!h-16`)
  - `src/modules/session/components/Login/Login.tsx:64` (`googleButton`, `border-white/10 bg-black/40`) and `:101` (`submitButton`)
  - `src/modules/session/components/DeleteAccountButton/DeleteAccountButton.tsx:71` (`AlertDialogAction` `confirmAction` `bg-destructive`; gets `variant="destructive"` in 2d, class becomes redundant)
  - `src/modules/lobby/components/LobbyGameRow/LobbyGameRow.tsx:123` (`min-w-[80px]` loses to `!min-w-[128px]`; the row grows: check in ui-verify, Phase 4 owns it)
B. Plate tier whose `className` overrides border colour/radius (the plate honours them, but `border-white/10` removes the `border-muted-foreground` boundary contrast of Final spec item 7): `border-white/10 text-xs` on `outline`+`sm` in `MonsterAttackScreen.tsx:99`, `MonsterSelectionDialog.tsx:71`, `PositionDialog.tsx:62`, `AttackSelectionDialog.tsx:77`, `ArmySelectionDialog.tsx:96`, `WealthyDialog.tsx:69`, `CardsDialog.tsx:84`, `SabotageDialog.tsx:57`, `AbilitiesDialog.tsx:75`, `ResourceSelectionStep.tsx:73`, `PlayerSelectionStep.tsx:49`, `CreateGameDialog.tsx:100`, `HostLeaveDialog.tsx:35`, `ConfirmExitDialog.tsx:34`, `LinkGoogleAccountButton.tsx:33,44`, `DeleteAccountButton.tsx:41`; `border border-white/5` on `ghost` in `Lobby.tsx:47`, `AvatarPickerButton.tsx:26`; gradient plates `CardsDialog.tsx:58` (`useButton`, `h-9`), `AbilitiesDialog.tsx:54` (`buyButton`, `h-7`), `ResourceSelectionStep.tsx:76` (`stealButton`); HUD `sm`/`icon` with heights `h-7`/`h-6`/`h-11` in `ActionsPanel.tsx:46,58,70`, `MobileActionsBar.tsx:59,71`, `MobileSheetTriggers.tsx:23,35`, `MapZoomControls.tsx:24,42,60`, `TutorialBeacon.tsx:43,58`.
C. Dialog/Sheet content `className` with glass (`bg-background/90 backdrop-blur-2xl border border-white/15 shadow-[...] max-w-md overflow-hidden`): all `*.styles.ts` `content`/`dialogContent` keys (about 14). Neutralised by `SHELL_TRANSPARENT`; delete the glass classes in Phase 7.
D. Titles: `VictoryDialog.styles.ts` `title` (gradient `bg-clip-text text-transparent`, lands on the ribbon frame: check in ui-verify; fix in Phase 6); `MobileActionsSheet.tsx:47` (title children = text + `infoBeacon` button; the ribbon `truncate` may clip the beacon: check; Phase 5/6); dialogs that nest the title inside a flex row beside an icon/description (`CombatDialog.tsx:34-37`, `ArmySelectionDialog.tsx:51`, and similar headers): the ribbon is laid out inside that row; restyled in Phase 6; `MobileEventLogSheet.tsx:43` sr-only title (frame gets `sr-only`; no visible title, as before).
E. `AlertDialogCancel` loses `mt-2 sm:mt-0`; any caller relying on that margin: grep `AlertDialogCancel className` in 2d (none found in the scan: all 12 tags have no `className`).
Phase 2h writes this list into `progress.md` after re-running the scan.

## P2 Risks
- R8: Tailwind `!`-important utilities in `SPRITE_LOCK` need Tailwind to see them as literal strings (they are, in `button.tsx`). Check in the preview that a caller `bg-gradient-to-r` row renders no rectangle.
- R9: `DialogTitle` as `Primitive.Title asChild` + `Ribbon` needs `Ribbon` to accept Radix's injected `id` and forward the ref; covered by 2b tests and the 2d dialog test (`aria-labelledby` resolves).
- R10: Dialog scroll height: `max-h-[calc(100dvh-3rem)]` assumes the frame inset 16 + shell margin 8 each side; a caller `max-w`/padding does not change it. If the frame overflows the viewport on a 390x844 screen, ui-verify tunes `3rem`.
- R11: The dark field overlaps part of the `special` corner art (field starts 16 px inside the frame, corner art is 55 px wide). If the gold corners look cut, tune a field margin (`m-1`) in `DialogFrame`; report old/new.
- R12: `Radix Content` `onOpenAutoFocus`, `onEscapeKeyDown`, `aria-describedby={undefined}` props are spread on the shell unchanged (verified by tests).
- R13: `font-pixel` plate buttons are 36 px tall in HUD (`sm`): accepted by the Final spec.
- R14: CPU/DOM: each sprite button renders 4 layers x 3 cells; a dialog with 6 buttons = 72 cell divs. Acceptable; measure only if the Combat dialog stutters.
- R15: `TooltipTrigger asChild` -> sprite `Button` relies on `PixelButton` accepting Radix's `onPointerMove`, `onFocus`, `onBlur`: `onBlur` is composed (2a), `onPointerMove`/`onFocus`/`onClick` pass through `{...rest}`. Covered by `overlays.test.tsx`.

## P2 Review (architect-b)
VERDICT: APPROVED

Verified this session:
- Cites: `ActionButton.tsx:48`, `GameBoardHeader.tsx:83,89`, `DeleteAccountButton.tsx:71` are the `<Button>`/`AlertDialogAction` tags; `PixelButton.tsx`, `.types.ts`, `.hook.ts` (7 handlers, no `onKeyUp`), `.styles.ts`, `PixelPanel.tsx` (rest and className on `NineSlice`, outer div has no class hook) match the Verified context. No test file under `src/components/ui` (find empty). No test asserts Button/Badge/Card/Input classes (grep `toHaveClass` for old shadcn classes, src and e2e: none). `buttonVariants`/`badgeVariants`/`toastVariants` consumers are only in `src/components/ui`.
- D2 accepted: `PixelPanel.map.ts:65-76` special cols `{9,55},{128,64},{256,55}` and rows `{20,44},..,{256,43}` are trimmed to the PIL bbox `(9,20,311,299)` I re-measured; the frame box has no transparent margin. 16 inset + `px-4` = 32 per side gives 310 at 374. No per-side inset option needed.
- D3 accepted: `!` utilities are the only way to keep ~20 old gradient call sites from painting rectangles until Phases 3-6. Deviation from "not supported" is a superset. Condition: the Button contract must destructure `variant, size, asChild, className` before spreading (added as a comment in the render rule).
- D4 accepted. All default-size `<Button>` in HUD/map are covered: `ActionsPanel.tsx`, `MobileActionsBar.tsx`, `MobileSheetTriggers.tsx`, `MapZoomControls.tsx`, `TutorialBeacon.tsx` already carry `size="sm"|"icon"`; only `ActionButton.tsx:48` and `GameBoardHeader.tsx:83,89` use the default. `ResourceCollectionFeedbackDemo.tsx` is a dev demo (becomes sprite; acceptable). One prop per tag leaves HUD structure unchanged, consistent with the user constraint. 2c must compare `getBoundingClientRect` before/after (already in the plan).
- D8 accepted (additive; no PixelButton test asserts label classes: `PixelButton.test.tsx` greps show none).
- D11 accepted: spec text is self-contradictory (remove the split, keep as is); keeping `text-center sm:text-left` is the behaviour-preserving reading. Footers stack below `sm`; the "two buttons fit" criterion is shown by the 310 px preview row.
- `DeleteAccountButton` `variant="destructive"` and Popover/Progress staying plates: accepted (Final spec items 6, section 8).
- PixelButton changes are safe: `usePixelButtonVisual(isDisabled)` call in `PixelButton.hook.test.ts:8` keeps working (optional second parameter); widening `PixelButtonProps` and `forwardRef` do not break existing importers; neutral is additive. Docs: `docs/architecture/pixel-ui.md:66` states "`PixelButtonProps` omits those and `onKeyUp`" and becomes false; 2h docs-sync must rewrite that sentence (plan already lists PixelButton text under 2h).
- Sizing: 2a 5, 2b 5, 2c 3 + preview/registry, 2d 5 + 1 line, 2e 6, 2f 4, 2g 7 (class-only strings, no logic): acceptable.
- Migration-debt A-E: HUD sites are covered; scan counts (135 tags / 51) not re-run by me. 2h re-runs it.
- Risk to the 4800-test suite: low. Highest: dialog structure tests listed in P2 Test impact; read the full failure list before editing any test. E2E selectors are role/name based; the sprite button's `textContent` equals its label (art spans are aria-hidden and empty).

Non-blocking notes:
1. Sprite `lg` is not forwarded as PixelButton `large` (128 px tall): intended; the `lg` art is the 3-slice at width 192. State this in `button.tsx` file comment.
2. `Ribbon` icon slot plus `Primitive.Title asChild`: the `id` lands on the text element only if `Ribbon` spreads rest there (R9); 2b/2d tests cover it.
3. The close button `PixelButton` inside `DialogPrimitive.Close asChild` requires 2a `forwardRef`; keep sub-phase order 2a, 2b, 2c, 2d.


## Review (architect-b) 2c
VERDICT: APPROVED. See review.md (Phase 2c). Carry-overs for 2d/Phase 6 recorded in the 2c contract comment above; migration debt list A-D re-checked (no missing sprite-tier call site with colour classes; ConnectionWarningDialog.tsx:48 has layout classes only).
