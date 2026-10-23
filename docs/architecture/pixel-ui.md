# Pixel UI Components & Theme

Part of the architecture & game-rules docs. Index and directives: [`docs/README.md`](../README.md). Visual context for these components is in §6.10 (`systems-and-visuals.md`).

## 6.17. Pixel UI Components (`src/modules/pixel-ui/`)

The shared Tiny Swords frame components. The barrel `src/modules/pixel-ui/index.ts` exports `NineSlice`, `ThreeSlice`, `Ribbon`, `PixelPanel`, `PixelBar`, `PixelIcon`, `PixelButton` and their prop types. Screens reach them through the shadcn components in `src/components/ui/`, documented in §6.19 (`pixel-ui-bridge.md`).

### Slice engine (`NineSlice`, `ThreeSlice`)

- **Sheet model (`pixel-ui.types.ts`):** a `NineSliceSheet` (3 columns × 3 rows) or a `ThreeSliceSheet` (3 columns × 1 row) describes one sprite sheet: its `url` (from `assetUrl()`, `asset-url.ts`, which prefixes `/tiny-swords/` and encodes spaces as `%20`), its total `width` and `height`, the opaque `cols` and `rows` as `{ start, size }` spans in source pixels, and an `inset` (content padding in source pixels).
- **Grid (`SliceFrame.tsx`, internal, not exported from the barrel):** the corners are fixed tracks of `span.size × scale` px and the middle track is `1fr`. Each cell is a `div` whose `background-image` is the whole sheet. `toSliceGrid` (`slice.map.ts`) sets its `background-size` and `background-position` in percent: size = total ÷ span × 100%; position = start ÷ (total − span) × 100%, or 0 when the span covers the whole axis.
- **Scale:** `NineSlice` and `ThreeSlice` accept `scale` of `1 | 2`. Tracks, insets and minimums are multiplied by it. Every Phase 1 consumer uses 1.
- **Three-slice height:** fixed at the single row size × scale.
- **Minimum size:** the frame's `min-width` and `min-height` are the larger of the corner floor (left + right columns, top + bottom rows, × scale) and the `minWidth`/`minHeight` props. This is pure CSS: there is no runtime clamp and no dev warning.
- **Content:** children sit in a wrapper padded by the sheet `inset` (× scale). The art layer is `aria-hidden`.

### Ribbon (`components/Ribbon/`)

- Three-slice frame on `UI/Ribbons/Ribbon_{Blue|Red|Yellow}_3Slides.png` (192 × 64 px sheet). At 1x the height is fixed at 61 px and the minimum width is 192 px.
- Props: `color` (`blue` default, `red`, `yellow`), `as` (`div` default, `h2`, `h3`), `icon` (a ReactNode rendered before the text; Ribbon does not import `PixelIcon`), `children` (a ReactNode, one line of text), `title`, `className` and the remaining element props.
- `className` goes to the frame. Every other prop (`id`, `data-*`, aria) goes to the text element, which is the `as` element and the `forwardRef` target. Radix `asChild` titles rely on this.
- The text is one line and truncates with ellipsis. When `children` is a string, it is also set as the `title` attribute of the text element, unless `title` is passed, so the full text is still reachable.
- The text inset is `RIBBON_INSET` in `Ribbon.map.ts` (tunable): top 12, bottom 14, left and right 50 px. Left and right keep 12 px clear of the face outline; the bottom is larger than the top to offset the thick lower lip (optical centring, §6.18).

### PixelPanel (`components/PixelPanel/`)

- A nine-slice frame with five variants, defined in `PANEL_SPECS` (`PixelPanel.map.ts`). The text tone is applied to the content: `text-ink` or `text-foreground`.

| Variant | Sheet | Text tone | Corner floor at 1x (width × height) | Spec minimum at 1x |
|---|---|---|---|---|
| `wood` | `UI Elements/UI Elements/Wood Table/WoodTable.png` (448 px) | light | 168 × 188 | 256 × 256 |
| `banner` | `UI Elements/UI Elements/Banners/Banner.png` (448 px) | ink | 184 × 179 | 256 × 256 |
| `paper` (default) | `UI Elements/UI Elements/Papers/RegularPaper.png` (320 px) | ink | 104 × 89 | 128 × 128 |
| `special` | `UI Elements/UI Elements/Papers/SpecialPaper.png` (320 px) | light | 110 × 87 | 128 × 128 |
| `carved` | `UI/Banners/Carved_9Slides.png` (192 px) | ink | 125 × 126 | 126 × 126 |

- The rendered minimum is the larger of the corner floor and the spec minimum. The spec minimums are set in `PixelPanel.map.ts`; for `carved` the spec minimum 126 × 126 is the corner-art floor rounded up to a square (corners 62 + 63 = 125 px wide, 63 + 63 = 126 px tall).
- Props: `variant` (default `paper`), `title` (renders a `Ribbon` straddling the top edge), `titleColor` (default `blue`), `titleAs` (`h2` default, or `h3`), `padding` (`none` = no padding, `sm` = `p-2`, `md` = `p-4`, default `md`), `rootClassName` (classes for the outer wrapper, which also holds the title slot). `className` and the other div props go to the frame. The title is a string only.
- `padding="none"` is used by the shadcn Dialog and Card frames, which pad their own content (§6.19).
- Insets are `// tunable` values in `PixelPanel.map.ts`.

### PixelBar (`components/PixelBar/`)

- Root is `role="progressbar"` with `aria-label` (required), `aria-valuemin={0}`, `aria-valuemax` and `aria-valuenow`. `toBarFill` (`PixelBar.map.ts`) clamps the value to `[0, max]`; a negative or non-finite max becomes 0.
- Frame: a three-slice base (`BigBar_Base` or `SmallBar_Base`, 320 × 64 px sheet) whose inset holds the track. The fill is a `data-testid="pixel-bar-fill"` span whose width is the fraction in percent, painted with `BigBar_Fill.png` or `SmallBar_Fill.png` (64 px sheet, offset so its opaque band sits in the track).
- Track heights at 1x: 24 px for `big` (default) and 3 px for `small` (`trackHeight` in `BAR_ART`, tunable).
- Root width is `w-80` (320 px) with `max-w-full`.
- Optional `label` (e.g. `7/10`) is centred over the track in `text-foreground` with an ink text-shadow.

### PixelIcon (`components/PixelIcon/`)

- A span with the icon as `background-image`, at `sm` = 32 px (0.5x) or `lg` = 64 px (1x, default).
- Colour icons: `hammer`, `wood`, `gold`, `food`, `attack`, `close`, `settings`, `info`, `music` map to `UI Elements/UI Elements/Icons/Icon_NN.png`. The `state` prop is ignored for them.
- Grey icons: `grey-close`, `grey-settings`, `grey-sound`, `grey-one`, `grey-two`, `grey-three`, `grey-cart`, `grey-plus`, `grey-minus`, `grey-unlock`. `state` is `regular` (default), `pressed` or `disabled`, which selects `UI/Icons/{Regular|Pressed|Disable}_NN.png`.
- Decorative (`aria-hidden`) unless `label` is set, in which case it is `role="img"` with that label.
- `toIconSource` returns `null` for an unknown name and the view renders nothing; the TypeScript union rules these out.

### PixelButton (`components/PixelButton/`)

- **Variant:** `primary` (default, blue sheets), `danger` (red sheets) or `neutral`, chosen in `toButtonArt` (`PixelButton.map.ts`). `neutral` draws the shared `Button_Hover_*` plate for every state except disabled (`Button_Disable_*`), tinted `brightness-110` on hover and `brightness-90` when pressed (slice sizes only); its icon sizes fall back to the Blue sheets. The root carries `data-variant`. The label is `inline-flex items-center gap-2` so an icon can sit beside the text.
- **Size:** `default` is a three-slice button (`UI/Buttons/Button_{Blue|Red}_3Slides`, 64 px tall, `min-w-[128px]`, `pb-4`). Its label is one line: the button grows to fit it, and in a forced narrow width the label truncates with an ellipsis inside the art. `large` is a nine-slice button (`_9Slides`, at least 128 × 128 px, `pt-2 pb-6`). `icon-round` and `icon-square` use the `UI Elements/UI Elements/Buttons/Small{Blue|Red}{Round|Square}Button_{Regular|Pressed}.png` sheets, drawn at 64 px inside a 48 × 48 px box. Icon pressed uses the `Pressed` sheet with no offset; icon hover and disabled use the `Regular` sheet.
- **Visual states:** `regular`, `hover`, `pressed`, `disabled`. Hover and disabled slice art is shared by both variants (`Button_Hover_*`, `Button_Disable_*`). All four art layers are rendered and toggled with `visible`/`invisible`, so every sheet is loaded before the first hover. The root carries `data-visual`.
- **Pressed:** the slice art moves 4 px down (`translate-y-1`) and the label 2 px down. Disabled labels are `opacity-70`; disabled icons are `opacity-50` over the regular art (there is no disabled icon art in the pack).
- **Label:** `font-pixel text-lg text-ink` (MedievalSharp, one weight, no `font-semibold`). Icon sizes add `pb-1`; the optical padding table is described in §6.18.
- **Focus:** `focus-visible:ring-2 ring-ring ring-offset-2 ring-offset-background`, so the ring has a background-coloured gap on both `paper` and wood.
- **Loading:** `loading` sets native `disabled`, `aria-busy`, and the disabled art. The label stays in the DOM with `invisible` and `...` is centred over it, which holds the width.
- **Hook (`usePixelButtonVisual`, `PixelButton.hook.ts`):** derives the visual from pointer enter/leave (hover), pointer down/up/cancel (pressed), and Enter or Space keydown (pressed for `KEY_PRESS_MS` = 100 ms). Blur clears all state, and disabling the button clears any press in progress. The hook returns seven handlers (pointer enter, leave, down, up, cancel, keydown, blur). `PixelButtonProps` extends the native button attributes, so consumers may pass any of them: the consumer's handler runs first, then the hook's own (also while disabled, as React only suppresses mouse events on a disabled element). `onKeyUp` is not wrapped; it reaches the `button` through `...rest`. `PixelButton` is a `forwardRef` component: the ref is the `button` element, which Radix close and tooltip triggers need (§6.19).
- **Shape:** there is no `asChild` prop. The art layers are siblings of the label, so the button cannot wrap a Radix `Slot`.

### Previews (testbed group `Pixel UI`)

Registered in `src/testbed/registry.ts`; each is at `/testbed/<slug>`: `slice-frame`, `pixel-ui-ribbon`, `pixel-ui-panel`, `pixel-ui-bar`, `pixel-ui-icon`, `pixel-ui-button`, `pixel-ui-typography`. The typography preview is preview-only: it has no component of its own. The `shadcn-bridge` preview is in §6.19.

## 6.18. Theme Tokens, Fonts & Typography

- **Font variables (`src/app/layout.tsx`):** Patrick Hand is `--font-patrick` (weight 400), Lato is `--font-lato` (subsets latin and latin-ext, weights 400 and 700) and MedievalSharp is `--font-medieval` (weight 400). All three `.variable` classes are set on `<html>`. `<body>` carries no next/font class. Only these three fonts are loaded.
- **Font families (`tailwind.config.ts`):** two stacks, each role mapped on its own line so a role can be flipped in one edit.
  - `body` and `readable`: `var(--font-patrick)`, `var(--font-lato)`, `sans-serif`.
  - `headline`, `pixel` and `medieval`: `var(--font-medieval)`, `var(--font-patrick)`, `sans-serif`.
  - `code`: `monospace`.
- **Base font:** `html, body` take `font-body` from the `@layer base` rule in `src/app/globals.css`. The old plain `body` font rule is removed.
- **Typography rule:**
  - MedievalSharp (`font-pixel`, `font-headline`, `font-medieval`) for institutional text: game name, titles, ribbons, sprite button labels, card titles, tabs, badges. Plate and plain `Button` tiers use `font-readable`, because MedievalSharp is wider and clipped labels in fixed-size HUD buttons.
  - Patrick Hand then Lato (`font-body`, `font-readable`) for text read at length: logs, card body, descriptions, inputs, tooltips, digits and ids. It is also the global default.
  - Patrick Hand and MedievalSharp have one weight (400). Pixel-ui components and the restyled plates in `src/components/ui/` (§6.19) do not set `font-bold` or `font-semibold`: the browser would fake a bold and smear the glyphs. Badge is the exception to the digits rule: it uses `font-pixel`, so numeric badges are MedievalSharp.
- **Optical centring:** the art has a thick lower lip, so labels sit above the box centre. Ribbon text uses `RIBBON_INSET` (`Ribbon.map.ts`: top 12, bottom 14, left and right 50, which keeps 12 px clear of the face outline). Button labels use the `opticalPadding` table in `PixelButton.styles.ts` (default `pb-4`, large `pt-2 pb-6`, icons `pb-1`); the loading dots use the same table.
- **Typography preview:** `pixel-ui-typography` shows both families at 12, 14 and 16 px on paper (`bg-paper text-ink`), a banner panel, a carved panel and a dark card (`bg-card`).
- **Colour tokens (`src/app/globals.css`, `.dark` block):** warm dark brown-slate values, for example `--background: 28 30% 9%`, `--foreground: 40 50% 94%`, `--primary: 195 55% 45%`, `--accent: 42 90% 60%`. The focus ring is `--ring: 42 90% 60%` (amber).
- **Ink and paper:** `--ink: 28 45% 16%` and `--paper: 40 55% 86%` exist only in the `.dark` block, and are exposed as the Tailwind colours `ink` and `paper` (`tailwind.config.ts`). The `:root` block is unchanged.
- **Pixel UI styles** reference tokens (`ring-ring`, `text-ink`, `hsl(var(--ink))` in text-shadows), not raw hex values.
