# Plan: Tiny Swords UI refactor, Phase 1 (pixel-ui foundation)

Status: APPROVED
Inputs: triage.md, ui-design.md (Final spec)

Scope: Phase 1 only, split into sub-phases 1a-1e (see Phases). Phases 2-7 stay as in triage.md. No screen is rewired. Map and HUD untouched.

## Goal and acceptance criteria
- [ ] `src/modules/pixel-ui/` exports `NineSlice`, `ThreeSlice`, `Ribbon`, `PixelButton`, `PixelPanel`, `PixelBar`, `PixelIcon` from `src/modules/pixel-ui/index.ts`.
- [ ] Every component has a preview registered in `src/testbed/registry.ts`, group `Pixel UI`; one extra preview `pixel-typography`.
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
| `src/modules/pixel-ui/PixelTypography.preview.tsx` | new | Preview-only: Pixelify vs Outfit at 12/14/16 px on paper, banner, card | preview-a |
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
export const RIBBON_INSET: FrameInset; // tunable. Initial { top: 6, right: 56, bottom: 12, left: 56 }
export function toRibbonSheet(color: RibbonColor): ThreeSliceSheet;
// url assetUrl(`UI/Ribbons/Ribbon_${Blue|Red|Yellow}_3Slides.png`), width 192, height 64,
// cols [{start:3,size:61},{start:64,size:64},{start:128,size:61}], rows [{start:0,size:61}], inset RIBBON_INSET.
// DOM: ThreeSlice (inline-block, minWidth 192) > contentClassName 'flex items-center justify-center gap-2' > {icon} + <As title={children} className=text-classes + ' block'>{children}</As>. The `as` element IS the text element (a heading cannot be the div root), so `heading` role wraps only the text.
// Ribbon styles: text 'text-xl font-bold leading-none truncate'; blue/red add 'text-foreground [text-shadow:0_1px_0_hsl(var(--ink))]'; yellow 'text-ink'. min width 192 via ThreeSlice minWidth={192}.

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
//          cols [{2,62},{64,64},{128,63}] rows [{1,63},{64,64},{128,63}] inset 12 all min 96x96 tone 'light'
// ({a,b} = {start,size}.)
// DOM: <div className={styles.root(titled)}  // 'relative', titled adds 'mt-8'
//        {title && <div className={styles.titleSlot}><Ribbon as color>{title}</Ribbon></div>}  // 'absolute left-1/2 -top-[30px] z-10 max-w-full -translate-x-1/2'
//        <NineSlice sheet minWidth minHeight className="block" contentClassName={cn(textTone class, padding class, titled && 'pt-8')} {...rest}>{children}</NineSlice>
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
export interface BarArt { baseUrl: string; fillUrl: string; track: { left: number; width: number } } // px inside the 320x64 base
export const BAR_ART: Record<PixelBarSize, BarArt>;
// big:   base 'UI Elements/UI Elements/Bars/BigBar_Base.png',   fill '.../BigBar_Fill.png',   track { left: 44, width: 232 } // tunable
// small: base '.../SmallBar_Base.png', fill '.../SmallBar_Fill.png', track { left: 52, width: 216 } // tunable
export interface BarFill { fraction: number; valueNow: number; valueMax: number }
/** fraction = clamp(value / max, 0, 1); non-finite value or max <= 0 gives fraction 0.
 *  valueNow = clamp(value, 0, valueMax) (0 when non-finite); valueMax = max(max, 0). */
export function toBarFill(value: number, max: number): BarFill;
// DOM: <div role="progressbar" aria-label aria-valuemin={0} aria-valuemax aria-valuenow className='relative h-16 w-80 max-w-full'>
//        <span aria-hidden base layer: background-image base, background-size '320px 64px', pixelated />
//        <span aria-hidden className='absolute top-0 h-16 overflow-hidden' style={{left: track.left, width: track.width}}>
//          <span className='block h-full' style={{width: `${fraction*100}%`, backgroundImage: fill, backgroundSize: '100% 100%'}} /></span>
//        {label && <span className='absolute inset-0 flex items-center justify-center text-sm font-semibold text-foreground [text-shadow:0_1px_0_hsl(var(--ink))]'>{label}</span>}</div>
// Base box is 320x64 at 1x. Do not set `max-w-full` to anything that rescales the art; narrow screens clip nothing at 390 px (320 < 390).

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
type HookedHandlers = 'onPointerEnter' | 'onPointerLeave' | 'onPointerDown' | 'onPointerUp' | 'onKeyDown' | 'onKeyUp' | 'onBlur';
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
  - `PixelPanel.map.test.ts`: all 5 variants: spans ordered, non-overlapping, within sheet width/height; min sizes (256/256/128/128/96); textTone ink for banner and paper; light for wood, special, carved. Every `sheet.url` decodes to a file that exists under `public/` (`fs.existsSync(path.join('public', decodeURI(url)))`).
  - `PixelBar.map.test.ts`: `toBarFill(7,10)` fraction 0.7; `(0,10)` 0; `(10,10)` 1; `(15,10)` fraction 1 and valueNow 10; `(-3,10)` 0; `(5,0)` fraction 0, valueNow 0, valueMax 0; `(NaN,10)` 0. BAR_ART urls exist on disk.
  - `PixelIcon.map.test.ts`: 9 colour names map to the listed Icon_NN; `size` gives px 32/64; grey names: regular/pressed/disabled gives `Regular_/Pressed_/Disable_`; colour name ignores state; unknown name (cast) returns null; every produced url exists on disk.
  - `PixelButton.map.test.ts`: 2 variants x 2 slice sizes: urls per visual as in Contracts (hover/disabled shared by tones); icon sizes: regular/hover/disabled -> Regular url, pressed -> Pressed url; every url exists on disk.
  - `PixelButton.hook.test.ts` (`renderHook`, fake timers): initial 'regular'; enter -> 'hover'; down -> 'pressed'; up -> 'hover'; leave -> 'regular'; disabled stays 'disabled' for every event; Enter keydown -> 'pressed', after `KEY_PRESS_MS` back to 'regular'; Space same; other keys ignored; blur clears; unmount during the timer does not throw or set state.
- tester-b (view and e2e):
  - `SliceFrame.test.tsx`: NineSlice renders 9 cells and ThreeSlice 3, art layer `aria-hidden`, children visible, content padding equals inset x scale, root forwards `className` and `data-testid`.
  - `Ribbon.test.tsx`: text rendered; `title` attribute equals text; `as="h2"` renders `heading` level 2; icon rendered before text; yellow uses `text-ink`.
  - `PixelPanel.test.tsx`: each variant renders children; with `title` a heading (level 2 default, 3 with `titleAs`) exists; without title no heading; `padding` classes.
  - `PixelBar.test.tsx`: `role="progressbar"` with `aria-valuenow/min/max` for 7/10, 15/10 (valuenow 10), max 0; `aria-label` present; label text visible; fill width `70%`.
  - `PixelIcon.test.tsx`: no `label` -> `aria-hidden`, no role; with label -> `role="img"` named; 32 and 64 px sizes in style; unknown name renders nothing (`container.firstChild` null).
  - `PixelButton.test.tsx`: renders `button` with label; click calls `onClick`; disabled click does not call it and keyboard Enter does not either (`fireEvent`; `@testing-library/user-event` is not installed); `loading` -> `disabled`, `aria-busy="true"`, label still in DOM; four state layers present; the current layer is `visible` and the others `invisible`; hover/pointer-down change which layer is visible; icon size renders no text sheet layer; focus-visible classes present on root.
  - e2e: none (no screen is wired; ui-verify covers the visual checks).

## Preview states
Group `Pixel UI`. Slugs (kebab, unique): `slice-frame`, `ribbon`, `pixel-panel`, `pixel-bar`, `pixel-icon`, `pixel-button`, `pixel-typography`.
- SliceFrame (`slice-frame`): "NineSlice small", "NineSlice medium", "NineSlice large" (WoodTable at 256x256, 480x320, 720x400 inside `max-w-full` wrappers; mobile shows the 256 one), "ThreeSlice ribbon width 192 / 320".
- Ribbon (`ribbon`): "Blue", "Red", "Yellow" ("Turn 14 - Your move"), "With icon" (gold PixelIcon not available until 1d: use a plain `<span>12</span>` as the icon node), "Long text truncated" (container 220 px).
- PixelPanel (`pixel-panel`): one state per variant ("Wood", "Banner", "Paper", "Special", "Carved") with title "Event Log" and lines "Mia moved to (3,2)", "Kai found a card"; "Paper untitled", "Paper sizes" (small 128, medium 240, large 360 px wide), "Focus ring on paper" and "Focus ring on wood" (a focusable `<button className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">` inside).
- PixelBar (`pixel-bar`): "0/10", "7/10", "10/10", "Over max (15/10)", "Small bar 7/10".
- PixelIcon (`pixel-icon`): "Colour 32 px" (9 icons), "Colour 64 px", "Grey regular", "Grey pressed", "Grey disabled" (all 10).
- PixelButton (`pixel-button`): "Primary default", "Danger default", "Primary large", "Danger large", "Icon round blue/red", "Icon square blue/red", "Disabled", "Loading", "Mobile width 390" (a w-full flex row of three default buttons "Move", "Attack", "Cards"). Hover, Pressed and Focus-visible are checked by interaction in ui-verify (spec states them as real interaction states).
- PixelTypography (`pixel-typography`): "Event log lines", "Card body" at 12, 14, 16 px, Pixelify (`font-body`) vs Outfit (`font-readable`), each on `bg-paper text-ink`, banner panel and `bg-card`.
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
