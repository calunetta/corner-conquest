# UI design: Tiny Swords pixel-ui foundation (Phase 1/7)

## Spec (ui-designer-a)

### Purpose and user story
As a player, I want every screen to look like one hand-drawn Tiny Swords world (wood, paper, ribbons, pixel font) so that the game feels like a board game on a table, not a glass dashboard.
Phase 1 ships the building blocks only: components, previews, font, tokens. No screen is rewired. The map and HUD structure stay untouched (triage constraints).

### Placement and layout
- Code: `src/modules/pixel-ui/`, one folder per component (`NineSlice`, `ThreeSlice`, `Ribbon`, `PixelButton`, `PixelPanel`, `PixelBar`, `PixelIcon`), barrel `index.ts`. New folder: path unverified, architect-a confirms.
- Only visible surface in Phase 1: the testbed (`src/testbed/`, route `src/app/testbed/`, verified to exist) gets a "pixel-ui" gallery showing every component and state on desktop 1280x720 and mobile 390x844.
- Global effect of Phase 1: font and token retune reach every screen (see Tokens). This is intended; ui-verify must confirm nothing breaks (no overflow, no unreadable text).
- Layering: unchanged (map stage, HUD `z-20`/`z-30`, dialogs above).
- Mobile rule: heavy sheets (WoodTable/Banner, 128 px corners) are never used for panels under 200 px wide or 160 px tall; use `carved` or `paper` there. Whole map grid stays visible; nothing in this phase touches it.

### Rendering model (the one new visual pattern)
One pattern: **sliced sprite frames**. A frame is a sprite sheet cut into corners, edges and center, drawn crisp (no smoothing) and scaled by an integer factor (1x, 2x on mobile/desktop as stated per component). The content sits inside the frame's safe inset. Everything else (Ribbon, Button, Panel, Bar) is a preset of this pattern.
- Slice geometry (from triage, assets in `public/tiny-swords`, not copied or modified):
  - 9-slice sheets with 64 px cells: WoodTable and Banner (448x448): corner cols/rows 0-128, middle 192-256, last 320-448. RegularPaper and SpecialPaper (320x320): 0-64, 128-192, 256-320. Carved_9Slides, Button_*_9Slides (192x192): thirds, 64 px each.
  - 3-slice (192x64): thirds, 64 px each: Ribbon_*_3Slides, Button_*_3Slides, Carved_3Slides.
- Edge and center regions stretch, they never tile with seams visible; corners are never scaled non-uniformly.
- Pixel crispness: image-rendering pixelated; scale factors are integers only.
- Width and height are free; corner size is fixed by scale. Minimum frame size is listed per variant.

### Components
All paths below are assets under `public/tiny-swords/` and were listed this session.

**NineSlice / ThreeSlice (primitives)**
- Inputs: sheet, slice geometry, scale, content inset. Render a sized box; children go in the inset. No semantics of their own (decorative frame, `aria-hidden` on the art, children keep their role).
- Used only by the components below; not for screen code.

**PixelPanel** (variants, a panel is a titled or untitled container)
| Variant | Sheet | Use | Content colour | Min size |
|---|---|---|---|---|
| `wood` | `UI Elements/UI Elements/Wood Table/WoodTable.png` | big containers: lobby main, bottom action table. Desktop only for large sizes | light text (`text-foreground`) | 256x256 |
| `banner` | `UI Elements/UI Elements/Banners/Banner.png` | parchment scroll: event log, field guide | dark ink (`text-ink` token) | 256x256 |
| `paper` | `UI Elements/UI Elements/Papers/RegularPaper.png` | small and mid cards, dialogs, player cards on mobile | dark ink | 128x128 |
| `special` | `UI Elements/UI Elements/Papers/SpecialPaper.png` | dark slate with gold corners: special cards, rare and highlight dialogs | light text | 128x128 |
| `carved` | `UI/Banners/Carved_9Slides.png` | smallest panels, chips, tooltips, HUD plates | light text | 96x96 (9-slice), 3-slice `Carved_3Slides.png` for single-line strips min 96x48 |
- Optional `title`: renders a Ribbon straddling the top edge (overlap half the ribbon height). Optional `padding` preset: `sm` | `md`.
- Mobile: `wood` and `banner` automatically render at scale 1x and the consumer should prefer `paper`/`carved`; spec forbids `wood`/`banner` under the min size (component clamps and logs a dev warning).

**Ribbon**
- Sheets: `UI/Ribbons/Ribbon_{Blue,Red,Yellow}_3Slides.png` (3-slice, height 64 at 1x). Colours: `blue` (neutral/info/default), `red` (danger/enemy), `yellow` (turn/gold/highlight).
- Content: one line of text or text plus a PixelIcon, centred, Pixelify Sans, uppercase off, text with 1 px dark shadow to hold contrast on art.
- Size: one size in Phase 1, 64 px tall at 1x. A compact `sm` ribbon (`UI Elements/UI Elements/Ribbons/SmallRibbons.png`) is deferred to the HUD phase.
- Width: content-driven with min 192 px at 1x (3 slices). Text longer than width truncates with ellipsis, full text in `title` attribute/Tooltip.
- Static, not interactive. Connection ribbons (`Ribbon_*_Connection_*`) not used in Phase 1.

**PixelButton**
- Replaces nothing yet (shadcn `button.tsx` bridge is Phase 2). API mirrors shadcn: `asChild`, `variant`, `size`, `disabled`, native button props, so Phase 2 can delegate.
- Variants: `primary` (blue 3-slice, `UI/Buttons/Button_Blue_3Slides.png`), `danger` (red, `Button_Red_3Slides.png`), `secondary` (blue 9-slice with taller look for multi-line or large targets, `Button_Blue_9Slides.png`; `danger` equivalent `Button_Red_9Slides.png`), `icon` (round `UI Elements/UI Elements/Buttons/SmallBlueRoundButton_*` and red; square variants `SmallBlueSquareButton_*`/`SmallRedSquareButton_*`, 128x128 sheets drawn at 0.5x = 64 px... see scale rule below).
- State sheets: Regular, `_Pressed` (Blue/Red 3 and 9-slice, Small*/Big* buttons have `_Regular`/`_Pressed`), hover uses `Button_Hover_3Slides.png`/`Button_Hover_9Slides.png` (neutral light hover sheet), disabled uses `Button_Disable_3Slides.png`/`Button_Disable_9Slides.png`. Tiny buttons (`Tiny*`) have no pressed art: not used.
- Scale rule: text buttons (3-slice and 9-slice) ship at 1x only; height is the sheet's opaque height (about 61-64 px, implementer measures the real bbox). No `sm` pixel button in Phase 1; compact actions use `icon`. Fallback if 64 px is too tall for the HUD row: ui-designer-b rules (open point 1).
- Label: Pixelify Sans 600, `text-foreground` on blue/red art with dark text shadow; disabled label uses `text-muted-foreground`.
- Pressed state also shifts the label down 2 px (art has the pressed plate lower).
- `icon` buttons: hit area equals the drawn box and is at least 44x44. Draw scale of the 128 px `Small*Button_*` sheets (0.5x or 1x) is fixed by measuring the opaque box (open point 3).

**PixelBar**
- Sheets: `UI Elements/UI Elements/Bars/BigBar_Base.png` + `BigBar_Fill.png`, `SmallBar_Base.png` + `SmallBar_Fill.png` (320x64 base, 64x64 fill; opaque base 49..271 x 22..41 small, 40..280 x 9..60 big).
- Props: `value`, `max`, `size` (`big` | `small`), optional `label` (visible number, e.g. "7/10"), `aria-label` required.
- Fill clips to fraction of the inner track, stretched horizontally, left aligned; value 0 shows empty base, never negative, never beyond 100 %.
- Fill art is red/orange (BigBar_Fill, red) and small fill; Phase 1 ships the art colour as is. Per-stat colouring (HP vs other) is out of scope; consumers pass `tone` later if needed.
- Role: `progressbar` with `aria-valuenow/min/max`.

**PixelIcon**
- Sheets in `UI Elements/UI Elements/Icons/Icon_{01,02,03,04,05,09,10,11,12}.png` (color, 64x64) and the grey 3-state set `UI/Icons/{Regular,Pressed,Disable}_NN.png` (Regular_01..10 etc.).
- API: `name` (string union of semantic names, see map), `size` (`sm` 32, `md` 48, `lg` 64; integer scale of a 64 px source is 0.5x/0.75x/1x: only `sm`=32 (0.5x), `lg`=64 (1x) ship; `md` omitted), `state` for grey set (`regular|pressed|disabled`), decorative by default (`aria-hidden`), `label` prop turns it into `role="img"` with `aria-label`.
- Semantic map (visual verified this session): `hammer` Icon_01 (building/work tool), `wood` Icon_02 (log), `gold` Icon_03 (coin), `food` Icon_04 (meat), `attack` Icon_05 (crossed swords), `close` Icon_09 (red X), `settings` Icon_10 (gear), `info` Icon_11, `music` Icon_12. Grey set: `Regular_01` X, `02` gear, `03` sound, `04..06` digits 1-3, `07` cart, `08` plus, `09` minus, `10` unlock. Exact semantic key names are architect's to choose; the pairings above are fixed.
- Coexistence with `src/modules/icons` (icon registry, `resolve-icon.ts`) and lucide: PixelIcon is additive in Phase 1; replacing lucide in screens is per-phase. Do not touch `icon-overrides.config.json`.

### States
| Component | Default | Hover | Pressed/Active | Focus-visible | Disabled | Empty/other |
|---|---|---|---|---|---|---|
| PixelButton | Regular sheet | hover sheet (`Button_Hover_*`), cursor pointer | `_Pressed` sheet + label down 2 px | 2 px ring in `ring` token outside the sprite box, offset 2 px | `Button_Disable_*` sheet, label muted, no hover/press, `aria-disabled` or native disabled | loading: label replaced by a 3-dot text "..." (no spinner art in pack); width held |
| PixelPanel | frame + content | none (not interactive) | n/a | if consumer makes it focusable, same ring | n/a | no title: no ribbon; empty children: renders frame at min size |
| Ribbon | colour variant | none | none | none | none | text overflow: ellipsis + title |
| PixelBar | filled by ratio | none | none | none | max=0: empty bar, `aria-valuenow=0` | value>max clamps to full |
| PixelIcon | colour or grey Regular | none | grey `Pressed_*` when consumer sets state | none | grey `Disable_*` | unknown name: renders nothing and dev warning |
Image load failure: frame falls back to a flat rectangle with `bg-card border-border` so content stays readable (no layout shift).

### Tokens (retune of `.dark` in `src/app/globals.css`; `:root` light block untouched)
Direction: warm dark (brown-slate) so wood, paper and ribbons read as lit objects. Values are HSL triplets as in the current file (current: background 230 40% 6%, primary 190 90% 50%, accent 45 100% 55%). Contrast figures computed this session (WCAG relative luminance).
| Token | Current | New | Check |
|---|---|---|---|
| `--background` | 230 40% 6% | 28 30% 9% | foreground on it 15.98:1 |
| `--foreground` | 210 40% 98% | 40 50% 94% | warm white |
| `--card` | 230 35% 12% | 28 28% 14% | foreground on card 13.77:1 |
| `--card-foreground` | 210 40% 98% | 40 50% 94% | |
| `--popover` | 230 40% 10% | 28 30% 12% | |
| `--popover-foreground` | 210 40% 98% | 40 50% 94% | |
| `--primary` | 190 90% 50% | 195 55% 45% | Tiny Swords blue-teal; on background 5.01:1 |
| `--primary-foreground` | 230 40% 6% | 28 30% 9% | |
| `--secondary` | 260 50% 25% | 28 22% 22% | wood-dark neutral; violet dropped |
| `--secondary-foreground` | 210 40% 98% | 40 50% 94% | |
| `--muted` | 230 30% 20% | 28 18% 20% | |
| `--muted-foreground` | 230 20% 70% | 35 18% 72% | on card 7.99:1, on background 9.27:1 |
| `--accent` | 45 100% 55% | 42 90% 60% | gold; on background 10.4:1 |
| `--accent-foreground` | 230 40% 6% | 28 30% 9% | |
| `--destructive` | 0 80% 60% | 5 70% 55% | |
| `--border` / `--input` | 230 30% 25% | 28 20% 28% | |
| `--ring` | 190 90% 50% | 42 90% 60% | gold ring reads on both wood and teal art |
| `--chart-*`, `--sidebar-*` | | follow the above (sidebar-background = card, sidebar-primary = primary, sidebar-accent = secondary, sidebar-border = border); chart set unchanged |
New tokens (additive, in `.dark` and mirrored in `tailwind.config.ts` colors by implementer):
- `--ink` 28 45% 16% (dark text on paper/banner). On paper-cream 40 55% 86%: 10.93:1.
- `--paper` 40 55% 86% (flat fallback and text-background hint for paper/banner variants).
Rules: no raw hex in components; art colours come from sprites only. The old cyan-to-gold hero gradient and glass panels still exist on untouched screens; they are removed per phase, Phase 7 deletes leftovers. Unrewired screens must still be readable after the retune (acceptance below).
Violet is no longer a brand colour; player colour tokens (blue/red/purple/yellow in `player-text-colors.ts`) are NOT changed in this phase.

### Typography
- Font: Pixelify Sans via `next/font/google`, variable `--font-pixelify`, weights 400-700, `display: swap`, subsets latin. Registered in `src/app/layout.tsx` next to Outfit.
- Outfit is kept loaded in Phase 1 as the fallback for text that must stay readable at small size (logs, card body, below 14 px). `font-body` and `font-headline` in `tailwind.config.ts` (currently both Outfit, verified at lines 21-22) switch: `headline` and a new `pixel` family = Pixelify Sans; `body` = Pixelify Sans too per user decision, with fallback chain Outfit then sans-serif. Triage risk: readability at mobile size. Rule: body copy minimum 14 px; event-log and card text 14 px minimum with `leading-snug`; if Pixelify Sans fails at 14 px in the testbed check, architect/ui-designer-b raise it before Phase 4. No letter-spacing hacks; pixel font never anti-aliased-smoothed beyond browser default.
- Headings drop `font-black`; Pixelify weight 600-700 max.

### Components and tokens reuse
- Reuse: `cn()` from `@/lib/utils` (verified in CLAUDE.md), `@radix-ui/react-slot` pattern from `src/components/ui/button.tsx` (verified) for `asChild`, `useIsMobile` from `@/modules/shared` for scale choice, existing testbed under `src/testbed/`.
- Do not fork or edit `src/components/ui/*` in Phase 1 (Phase 2 bridge).
- Tokens: `bg-card`, `bg-background`, `text-foreground`, `text-muted-foreground`, `border-border`, `ring-ring`, `text-accent`, new `text-ink`, `bg-paper`. No raw hex.

### Copy
Phase 1 has no product copy. Testbed gallery strings only:
- Page title ribbon: "Pixel UI"
- Section labels: "Ribbons", "Buttons", "Panels", "Bars", "Icons", "Typography"
- Sample button labels: "Move", "Attack", "Cards", "End Turn", "Disabled"
- Sample panel title: "Event Log"; sample log lines: "Mia moved to (3,2)", "Kai found a card"
- Sample ribbon text: "Turn 14 - Your move", "12", "7", "9"
- Bar samples: "7/10", "0/10", "10/10"

### Interactions and motion
- Buttons: hover swap instant (sprite swap, no fade); press swap on pointer down, release on pointer up; label shifts 2 px with press. Keyboard Enter/Space presses visually for 100 ms.
- No animated transitions in Phase 1 (pixel art swaps, not tweens). Any motion added later is gated by `motion-reduce:`.
- Cursor: pointer on enabled, not-allowed on disabled (already global in `globals.css`). Pixel cursors from the pack are out of scope.

### Accessibility
- Frame art is decorative: `aria-hidden` on slice layers; content keeps native semantics (`button`, `progressbar`, headings).
- Ribbon title inside a PixelPanel renders as a heading element chosen by consumer (`as` prop, default h2); no `role` games.
- Contrast: text on sprites is at least 4.5:1: light text on blue/red art with 1 px dark shadow; dark `ink` on paper/banner 10.93:1; implementer samples the actual rendered pixels in ui-verify for Ribbon_Yellow (light fill, use `ink`, not white).
- Touch: every PixelButton hit area >= 44x44 px (64 px at 1x for text buttons). Never below 24x24.
- Focus: visible 2 px `ring` outline on every interactive pixel component, not clipped by the sprite box.
- Not color alone: danger buttons keep text labels; bars carry a numeric label or aria values.
- `prefers-reduced-motion`: nothing to animate in Phase 1.

### Acceptance criteria
- [ ] `src/modules/pixel-ui/` exports `NineSlice`, `ThreeSlice`, `Ribbon`, `PixelButton`, `PixelPanel`, `PixelBar`, `PixelIcon`, each with a `.preview.tsx` registered in the testbed.
- [ ] Testbed gallery at http://localhost:9002/testbed shows every PixelPanel variant (`wood`, `banner`, `paper`, `special`, `carved`) at desktop and mobile widths; corners are crisp (no blur, no seams) when zoomed 400% in the screenshot.
- [ ] Panels resized 3 times (small, medium, large) keep corners at fixed pixel size and stretch only edges and center; no tiling seams.
- [ ] Ribbon renders blue, red, yellow with "Turn 14 - Your move"; long text truncates with ellipsis and shows full text on hover.
- [ ] PixelButton shows Regular, Hover, Pressed, Focus-visible and Disabled for `primary` and `danger`; Disabled uses the grey sheet and cannot be activated by click or keyboard.
- [ ] Focus ring is visible on the gold `ring` token on all buttons and not clipped.
- [ ] PixelBar renders 0/10, 7/10, 10/10; value above max clamps; `role="progressbar"` has valid aria-values.
- [ ] PixelIcon renders all nine colour icons at 32 and 64 px and the grey set in Regular/Pressed/Disabled states; unknown name renders nothing.
- [ ] Pixelify Sans is the computed `font-family` of body text on `/testbed`; Outfit still loads and is the fallback.
- [ ] `.dark` tokens match the table above in `src/app/globals.css`; `--ink` and `--paper` exist; `:root` light block unchanged.
- [ ] Login (`/`) and lobby screens, not rewired, still render with no overflow and no text below 4.5:1 contrast (spot-check screenshots); in-game map and HUD layout identical to before aside from font and colour tokens.
- [ ] Mobile 390x844: testbed gallery has no horizontal scroll; no `wood`/`banner` panel under its minimum size.
- [ ] Assets load from `public/tiny-swords` with zero 404s in the console; no asset file is copied or modified (git status shows no change under `public/tiny-swords`).
- [ ] Buttons, bars, ribbons meet 44x44 px minimum hit area (measured in the browser).

### Open points for ui-designer-b
1. Ribbon `sm` and a short PixelButton: 64 px at 1x is large for the HUD action row. Decide to allow a half-scale exception or to use `SmallRibbons.png` / `Small*Button` sheets for compact UI in Phase 5. Phase 1 ships 1x only.
2. Pixelify Sans as `body` at 14 px for event log and card text: confirm readability after the testbed check, or keep Outfit for dense text.
3. Icon button scale (Small*Button 128 px sheets): measure opaque box and fix the draw scale.

## Review (ui-designer-b)
VERDICT: APPROVED

Measured this session on the real sheets in `public/tiny-swords` (PIL, alpha bbox and sampled face colours, WCAG luminance). Design is consistent and buildable; the findings below are small corrections, folded into the Final spec.

Findings (all folded in, no design rework needed)
1. Label colour on buttons fails. Spec says light text on blue/red art. Face colours: Button_Blue (140,195,196) white 1.96:1; Button_Red (200,129,118) white 3.06:1; Hover (195,193,166) white 1.83:1; Disable (190,162,136) white 2.41:1. Fix: all PixelButton labels use `ink` (blue 7.14, red 4.57, hover 7.66, disabled 5.80). No white shadow needed.
2. Ribbon text. Sampled centres: Blue (65,145,157) white 3.64 / ink 3.84; Red (190,110,97) white 3.76 / ink 3.73; Yellow (187,181,82) white 2.13 / ink 6.56. Blue and red miss 4.5:1 at any colour. Fix: ribbon text is large text (>= 20 px, weight 700, passes at 3:1): white with 1 px dark shadow on blue/red, `ink` on yellow.
3. Focus ring on paper. Gold `ring` on cream `paper` is about 1.5:1, fails WCAG 1.4.11 (3:1). Fix: two-tone ring, 2 px `ring` + 2 px offset filled with `background` (dark), so one of the two bands always contrasts on any surface.
4. Pressed art offset. Regular opaque bbox y 0..56, Pressed y 4..56 (plate moves down 4 px, bottom fixed). Label shift is 2 px (plate face centre moves about 2 px); keep, implementer checks by eye.
5. `src/app/layout.tsx:28` sets `outfit.className` on body next to `font-body`. `className` writes `font-family` directly and can win over the Tailwind class. Fix: body uses only `${pixelify.variable} ${outfit.variable}` plus `font-body`; do not use `.className`.
6. Open point 2 (Pixelify Sans at 14 px) cannot be decided on paper. Decision: Pixelify Sans stays global `body`, plus a new Tailwind family `readable` (Outfit stack) available from Phase 1. Dense text (event log, card body, field guide prose, inputs) opts in per phase only if the testbed check fails. Testbed gets a Typography section to decide (see Final spec).
7. Open point 1: no half-scale exception (pixel art at 0.5x is only safe for the 128 px icon sheets). Opaque heights: text buttons 56 px, ribbons 61 px. Phase 1 ships 1x. HUD row is untouched in structure (user constraint); Phase 5 uses `icon` buttons and `SmallRibbons.png` (320x640 sheet, needs its own slice map, Phase 5 designer does it).
8. Open point 3: opaque boxes at 1x: SmallBlueSquare Regular 90x94, Round 88x94; Pressed square 100x85 (plate lower). Draw at 0.5x = 45x47 and 44x47: meets 44 px. Layout box fixed from the Regular sheet; Pressed art is placed inside the same box (do not let the box resize on press).
9. Mobile fit: 56 px button and 61 px ribbon heights do not touch the map grid; nothing is rewired. OK.

Verified: all asset paths listed in the spec exist except those not listed by name (Wood Table, Banners, Papers, Icons folders exist; `Bars/*`, `Buttons/Small*`, `Ribbons/SmallRibbons.png` listed). `font-data.json` of installed next/font includes "Pixelify Sans". `tailwind.config.ts:21-22` fontFamily as stated. `src/modules/pixel-ui` does not exist yet (new). Testbed registry is `src/testbed/registry.ts`, previews are dev-only (`src/testbed/testbed.config.ts`), so the gallery never ships to production; screen retune does.

## Final spec
Final spec = "Spec (ui-designer-a)" above with these overrides. Where they conflict, this section wins.

1. PixelButton labels: `ink` token on every variant and state (Regular, Hover, Pressed, Disabled). Disabled adds `opacity-70` on the label, no muted-foreground. Size >= 18 px, weight 600. Replaces "text-foreground on blue/red art".
2. Ribbon text: >= 20 px, weight 700, `leading-none`. Blue and red: `text-foreground` with 1 px dark shadow (`ink` shadow). Yellow: `ink`, no shadow. Acceptance: sampled contrast >= 3:1 (large text) for blue/red, >= 4.5:1 for yellow.
3. Focus ring (all interactive pixel components): `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background`. Replaces the single 2 px ring. Visible on paper and wood in the screenshot.
4. Layout: `<body>` class = `${pixelify.variable} ${outfit.variable} antialiased font-body`; no `.className` on body. Outfit stays loaded (`--font-outfit` unchanged).
5. Tailwind `fontFamily`: `body` and `headline` = `['var(--font-pixelify)', 'var(--font-outfit)', 'Outfit', 'sans-serif']`; `pixel` = same stack as `headline`; new `readable` = `['var(--font-outfit)', 'Outfit', 'sans-serif']`. Headings lose `font-black` only inside pixel-ui components in Phase 1 (screens are untouched).
6. Typography testbed section: sample event-log lines ("Mia moved to (3,2)", "Kai found a card") and a card-body sentence at 12, 14, 16 px in Pixelify (`font-body`) and Outfit (`font-readable`), on `paper`, `banner` and dark `card`. Decision rule for later phases: a dense text type uses `font-readable` if Pixelify at 14 px shows ambiguous glyphs (l/I/1, 0/O) or tight counters in the 390 px screenshot. Record the verdict in `progress.md` at Phase 1 preview stage.
7. Icon button: draw `Small*Button_*` sheets at 0.5x (square 45x47, round 44x47 opaque). Hit area = a 48x48 box centred on the art. Layout box is the Regular art box; Pressed art is drawn in the same box so nothing shifts. `image-rendering: pixelated`. If 0.5x shows uneven pixels at 400% zoom in the preview, preview stage reports it and the fallback is 1x (88-94 px, desktop only).
8. Pressed label shift: 2 px, kept. Keyboard Enter/Space shows the pressed sheet for 100 ms (as spec).
9. Open points closed: (1) 1x only in Phase 1, compact UI via `icon` buttons and `SmallRibbons.png` in Phase 5; (2) decided by item 6 plus `readable` family; (3) item 7.
10. Extra acceptance criteria (screenshot or test observable):
   - [ ] Button label contrast sampled >= 4.5:1 on Regular, Hover and Disabled for `primary` and `danger`.
   - [ ] Focus ring visible (two-tone) on a `paper` panel and on `wood` in the testbed screenshot.
   - [ ] `<body>` has no inline-generated Outfit `font-family` class; computed `font-family` starts with Pixelify Sans on `/testbed`.
   - [ ] Typography section renders both families at 12, 14, 16 px; verdict recorded in `progress.md`.
   - [ ] Icon button 48x48 hit area measured; Pressed does not change its box size.
   - [ ] `readable` font family class exists in `tailwind.config.ts` and resolves to Outfit.
All other spec items and acceptance criteria stand as written.
