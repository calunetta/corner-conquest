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

---

# Phase 2/7: shadcn bridge

## Phase 2 spec (ui-designer-a)

### Purpose and user story
As a player, I want every existing dialog, sheet, confirm prompt, form field and button to look like the Tiny Swords world without any screen being rewritten, so the app is consistent before Phases 3-6 rewire screens.
Scope: edit `src/components/ui/*` internals only. Props, exports and Radix behaviour stay. Map and HUD structure untouched (triage constraint): any component whose Phase 2 skin would change HUD size keeps a flat compact skin until Phase 5.

### Verified context
- Usage outside `src/components/ui` and `src/testbed` (files importing, grep this session): button 58, alert-dialog 26, tooltip 21, card 10, badge 8, label 7, switch 6, scroll-area 5, dialog 3, sheet 3, input 3 (+testbed), separator 3, popover 2, slider 2, radio-group 2, tabs 1, toast 1, toaster 1, checkbox 1, avatar 1. Zero uses: progress, select, textarea, dropdown-menu, accordion, alert, skeleton, table, form.
- Button variants in use (non-testbed `<Button` tags): outline 39, destructive 4, ghost 4, secondary 2, default (no prop) many; link 0. Sizes: `sm` 34, `icon` 1. `asChild` on Button: only `src/testbed/components/IconEditor/IconEditorRow.tsx`. `buttonVariants` is used outside only by `alert-dialog.tsx`.
- `sm` buttons live in dialogs (combat, cards, session, lobby CreateGameDialog), Lobby, AvatarPickerButton and the HUD `src/features/game/components/PlayerInfoBar.tsx`.
- Dialog content callers override frame styles through `className` (e.g. `src/modules/combat/components/CombatDialog/CombatDialog.styles.ts` `content`: `bg-background/90 backdrop-blur-2xl border border-white/15 shadow-... max-w-md overflow-hidden`). Dialog bodies are written for light text on a dark surface.
- `PixelButton` (`src/modules/pixel-ui/components/PixelButton/PixelButton.tsx`): variants `primary|danger`, sizes `default` (h-16, min-w 128) `large` (min 128x128) `icon-round|icon-square` (48x48), `loading`. It is a plain function component (no `forwardRef`) and spreads `{...rest}` before the hook `{...handlers}`, so consumer `onPointerEnter/Leave/Down/Up/Cancel`, `onKeyDown/Up`, `onBlur` are overwritten at runtime (types omit them).
- `NineSlice` spreads rest props on a div and sets inline min sizes. `PANEL_SPECS` floors: paper/special 128x128, carved 126x126 (`PixelPanel.map.ts`).
- ESLint (`eslint.config.mjs`): `src/components/ui/**` is in `IGNORED_PATHS` (not linted), and `RESTRICTED_IMPORTS` (incl. `deepModuleImport` `@/modules/*/*`) applies only to files under `src/modules`. So `src/components/ui` importing `@/modules/pixel-ui` (the index) needs NO rule change. Reverse direction (pixel-ui importing `@/components/ui/*`) is not forbidden by lint but is forbidden by this spec (cycle). Note `PixelPanel.preview.tsx` already imports `@/components/ui/button`; allowed for previews only.

### Design rule: three skin tiers
1. **Sprite** (pixel art, 9-slice or 3-slice): Button `default`/`lg`, Dialog, AlertDialog, Sheet frames and title ribbons, dialog close button.
2. **Plate** (flat token skin, no sprite): everything that must stay compact or content-driven: Button `sm`, `icon`, `asChild`; Card (default), Badge, Input, Progress, Tooltip, Toast, Tabs list, Switch/Checkbox/Radio/Slider tracks. One shared recipe so it reads as one family:
   `rounded-none`, `border-2 border-border`, `bg-card` (or token per variant), `font-pixel`, hard bottom edge `shadow-[0_2px_0_hsl(var(--ink))]`, no blur, no gradient, no transparency tricks.
3. **Plain text** (ghost, link): no plate, no sprite.
This is the only new pattern: "plate". It reuses Phase 1 tokens and is the flat sibling of the sprite frames.

### 1. Button (`src/components/ui/button.tsx`)
API unchanged: `variant`, `size`, `asChild`, native props, `ref`. `buttonVariants` stays exported (class string for the plate/plain tiers; `alert-dialog` stops using it, see 3).

Variant to look (sprite tier = `size` default or `lg`):
| shadcn variant | Sprite look (default/lg) | Plate look (sm, icon, asChild) | Label |
|---|---|---|---|
| `default` | `PixelButton` `primary` (blue 3-slice) | `bg-primary`, `border-ink`-toned 2 px, hard shadow | `ink` on sprite; plate `text-primary-foreground` |
| `destructive` | `PixelButton` `danger` (red 3-slice) | `bg-destructive`, text `text-destructive-foreground` | `ink` on sprite |
| `outline` (39 uses, cancel/secondary) | `PixelButton` new variant `neutral`: regular = `Button_Hover_3Slides.png` (parchment plate), hover = `Button_Blue_3Slides.png`, pressed = `Button_Blue_3Slides_Pressed.png`, disabled = `Button_Disable_3Slides.png` | `bg-card text-foreground border-border`, hover `bg-accent text-accent-foreground` | `ink` (7.66:1 on Hover face, measured in review) |
| `secondary` (2 uses) | same as `outline` | `bg-secondary text-secondary-foreground` | `ink` |
| `ghost` (4 uses) | plain text (no sprite at any size) | `bg-transparent`, hover `bg-accent/20`, `rounded-none` | `text-foreground`, `font-pixel` |
| `link` (0 uses) | plain text | none | `text-accent underline underline-offset-4`, hover `text-foreground` |

Sizes:
| Size | Tier | Dimensions |
|---|---|---|
| `default` | sprite | height 64 (art 56 opaque), min-w 128, `px-6` (PixelButton `default`) |
| `lg` | sprite | same art, `min-w-[192px]` and `px-8`. Not the 9-slice `large` (min 128x128 too tall for any current layout) |
| `sm` (34 uses) | plate | `h-9` (36), `px-3`, `text-sm`. Stays compact so HUD (`PlayerInfoBar`) and dense dialog rows keep their layout. Promotion to sprite is a per-screen decision in Phases 4-6 (call site passes `size` default) |
| `icon` | plate | `h-10 w-10` as today; stays plate; the sprite `icon-round` art is used only for the dialog close button. Phase 5 decides HUD icon buttons |
Ghost/link ignore the sprite rule at every size.

`asChild`: when `asChild` is true the component always renders the plate/plain tier through `Slot` (a Slot cannot receive the sprite layers). So `<Button asChild><Link/></Button>` gets the plate look: `default`/`destructive`/`outline`/`secondary` plate recipes above, sized by `size` (sprite sizes collapse to plate `h-10 px-4`). Document this in the file comment. Only caller today is a testbed file.

Required PixelButton changes (additive, in `src/modules/pixel-ui`, so architect-a plans them):
- `forwardRef` to the `<button>`. Radix focuses elements by ref (AlertDialog Cancel auto-focus, Tooltip/Popover/Dialog triggers via `asChild`); without it focus management and `asChild` triggers break.
- Compose, not overwrite: call the consumer's `onPointerEnter/Leave/Down/Up/Cancel`, `onKeyDown/Up`, `onBlur` first, then the hook's. Remove them from the `HookedHandlers` omit list. Required because `TooltipTrigger asChild` (21 files) and `DialogTrigger`/`PopoverTrigger asChild` pass those handlers.
- Pass through any extra props Radix injects (`data-state`, `aria-*`, `id`) — already done by `{...rest}`.
- New `variant: 'neutral'` with the sheet mapping in the table above (only file names change in `PixelButton.map.ts`).

Mobile (390 px): sprite button min 128 wide x 64 tall. Footers: `DialogFooter`, `AlertDialogFooter`, `SheetFooter` stack vertically below `sm` breakpoint (already `flex-col-reverse`), children `w-full` (3-slice stretches, never below 128). Two side-by-side sprite buttons fit only if usable width >= 2x128 + 8 = 264 px; dialog usable width on 390 px is about 310 px (see Dialog), so side by side is allowed for two, stacked for three or more. Primary action on top when stacked: `flex-col-reverse` already puts the last child (primary) on top; keep.
Overrides from callers: sprite buttons accept layout classes (position, width, margin, flex). Colour, border, radius and height classes in `className` (e.g. `styles.attackButton`, `border-white/10 text-xs` on the sm plate) are not supported on the sprite tier; implementer lists every `<Button className=` call site that sets `bg-`, `border-`, `rounded-` or `h-` and reports them as migration debt for Phases 3-6. Plate tier honours them as today.
Loading: `loading` prop is not added to `Button` in Phase 2 (no caller). `disabled` maps to the disabled sheet.

### 2. Dialog (`dialog.tsx`)
Structure: Radix `Content` stays the outermost element (focus trap, `role="dialog"`, `aria-labelledby/describedby`, Esc, outside-click, `onOpenAutoFocus` props all keep working). It becomes a transparent shell: `bg-transparent border-0 shadow-none p-0 backdrop-blur-none`, with those classes appended after the caller `className` in `cn()` so caller glass styles (`bg-background/90 backdrop-blur-2xl border`, `overflow-hidden`) lose. Caller sizing (`max-w-md`) still applies to the shell. Inside the shell: one `PixelPanel`-style frame (`NineSlice` with the `special` sheet via the pixel-ui index; if `PixelPanel` cannot be used without a title, architect-a may add a `bare` option; the visual result is what is specified here).
- **Frame variant: `special`** (dark slate, gold corners, light text). Reason: all 20+ existing dialog bodies use light text and `bg-black/40`-style insets; `paper` (ink text) would put white text on cream (fails contrast). New optional `DialogContent` prop `frame?: 'special' | 'paper'` (default `special`); Phase 6 opts individual dialogs into `paper` when it restyles their bodies.
- Frame size: width `calc(100vw - 16px)` capped by `max-w-lg` (or caller `max-w`); on mobile 390 px that is 374 px, usable content width = 374 - 2x16 (inset) - 2x16 (`padding md`) = 310 px. Height: shell `max-h-[calc(100dvh-16px)]`; the content wrapper scrolls (`overflow-y-auto`) so the frame never exceeds the viewport. Never smaller than the 128x128 floor.
- Position: centred as today (`left-1/2 top-1/2 -translate-x/y-1/2`), z-50. Overlay: keep `bg-black/80`, no blur.
- **Title ribbon**: `DialogTitle` renders the Radix `Title` (h2, keeps id for `aria-labelledby`) styled as a Ribbon: ribbon art (`Ribbon_Blue_3Slides`) behind, text `text-foreground` Pixelify 700 >= 20 px with the dark `ink` text shadow (same as `Ribbon`). It sits at the top of the content, full width, in flow (no straddling the frame edge in Phase 2; straddle needs per-dialog top padding, deferred to Phase 6). Optional `DialogTitle` prop `ribbon?: 'blue' | 'red' | 'yellow'` (default `blue`; `yellow` text uses `ink`, no shadow, per Phase 1 Final spec item 2). If children are not a plain string (icon + text), render the ribbon art plus children in a flex row; if the architect decides `Ribbon` cannot take nodes, fallback is a Pixelify 700 heading, no art. Long text: single line, ellipsis, full text in the `title` attribute.
- `DialogHeader`: remove `text-center sm:text-left` split; keep as is (layout is behaviour). `DialogFooter`: see Button mobile rule, add `gap-2`, drop `sm:space-x-2`.
- `DialogDescription`: `text-sm text-muted-foreground` stays, `font-readable` (dense text, Outfit). Muted on `special` slate: >= 4.5:1 required; implementer samples the rendered slate; if lower, use `text-foreground/90`.
- **Close button**: keep `DialogPrimitive.Close` with `sr-only` "Close". Look: sprite `icon-round` primary (blue, 48x48 hit area) with a lucide `X` 20 px `text-ink`, positioned `absolute right-2 top-2` inside the frame. Focus: two-tone ring (Phase 1 Final spec item 3). Ribbon keeps `mr-12 ml-12` clear space so close never overlaps the title on 390 px.
- Motion: keep the existing `animate-in/out` fade+zoom classes, add `motion-reduce:animate-none motion-reduce:duration-0` (pattern at `src/modules/hud/components/ActionsPanel/MobileActionsBar.styles.ts:68`).

### 3. AlertDialog (`alert-dialog.tsx`)
Same shell, frame, scrolling, overlay and motion as Dialog. Differences:
- Frame `special` by default, same optional `frame` prop on `AlertDialogContent`.
- **No close button** (alert dialogs are confirm prompts; Radix has none; behaviour unchanged). Esc handling stays with the caller (`onEscapeKeyDown`).
- `AlertDialogTitle`: ribbon exactly as `DialogTitle`, prop `ribbon` default `blue`; destructive confirmations may pass `red`; VictoryDialog may pass `yellow`.
- `AlertDialogAction`: `AlertDialogPrimitive.Action asChild` wrapping `Button` variant `default` (sprite blue). `AlertDialogCancel`: `Cancel asChild` wrapping `Button` variant `outline` (sprite neutral). Both rely on `Button` forwarding the ref (Radix focuses Cancel on open). `mt-2 sm:mt-0` removed; footer `gap-2` handles spacing. Callers that pass `className` with `bg-destructive` to turn Action red (verify per call site; implementer greps `AlertDialogAction className`) are listed as migration debt; Phase 2 adds `variant?: 'default' | 'destructive'` to `AlertDialogAction` (default `default`) so Phase 6 can switch without CSS overrides.
- `AlertDialogDescription` same as Dialog.

### 4. Sheet (`sheet.tsx`)
Same shell rule: Radix `Content` stays outermost, transparent, anchored by `side` as today (`top|bottom|left|right`, `w-3/4 sm:max-w-sm` for left/right; callers pass `side="bottom"` and `w-full ... sm:max-w-lg`).
- **Frame variant: `special`**, same reason as Dialog.
- **Edge bleed**: the frame is drawn larger than the sheet on every edge that touches the viewport, so only the inner edge is visible and no corner art appears at screen edges (`right` sheet: only the left edge shows; `bottom` sheet: only the top edge shows; `top`/`left` mirror). Bleed = the sheet's corner span (`special`: 55 px), applied as negative margins on the frame; content inset is computed from the visible area so text never sits under a bleed. Frame stays crisp (integer scale 1x).
- Mobile: bottom sheet keeps `max-h` of `85dvh` (verify existing callers: `MobileActionsSheet`, `MobileEventLogSheet`) and the content wrapper scrolls. The sheet never hides the map grid permanently: overlay `bg-black/80` as today, tap outside closes (Radix default).
- **Title ribbon**: `SheetTitle` = same ribbon as `DialogTitle`, in the header, in flow; `left`/`right` sheets use ribbon `w-full`, `bottom` sheets center it. Default `blue`.
- Close: same `icon-round` primary as Dialog, `absolute right-2 top-2` of the visible area (offset by the bleed on edge-adjacent sides: e.g. for a `top` sheet the top offset is `top-2` below the screen edge).
- `SheetFooter` as Dialog footer. Motion: keep slide animations (`duration-300/500`), add `motion-reduce:duration-0 motion-reduce:animate-none`.

### 5. Card (`card.tsx`)
Used by HUD panels (`PlayerInfo`, `ActionsPanel`, `GameLog`), Lobby and legal pages, so it must not change size in Phase 2.
- Default = **plate**: `rounded-none border-2 border-border bg-card text-card-foreground shadow-[0_2px_0_hsl(var(--ink))]` (replaces `rounded-lg border shadow-sm`). Padding unchanged (`p-6`, `p-6 pt-0`) so layouts stay byte-for-byte the same size, only +1 px border each side.
- `CardTitle`: `font-pixel text-2xl font-semibold leading-none` (drops `tracking-tight`). `CardDescription` and `CardContent` text: `font-readable` for the description, body inherits `font-body`.
- New optional prop `frame?: PanelVariant` (`'wood' | 'banner' | 'paper' | 'special' | 'carved'`): when set, the Card renders as `PixelPanel` of that variant (text tone from the variant: `ink` on paper/banner, light on wood/special/carved). Default undefined (plate). Phases 3-5 opt screens in. Floors apply (paper/special 128x128, carved 126x126, wood/banner 256x256): consumers on 390 px use `paper`, `special` or `carved` only. If a `frame` Card is smaller than its floor, the frame clamps (existing PixelPanel behaviour).

### 6. Input (`input.tsx`) and Label (`label.tsx`)
No input art exists in the pack (UI, UI Elements listings checked this session), so Input is a **plate**, recessed:
- `h-10 w-full rounded-none border-2 border-border bg-background px-3 py-2 text-base font-readable` (Outfit for typed text, ids and digits per the user's font decision; 16 px also prevents iOS zoom on focus), `placeholder:text-muted-foreground`, inset look via `shadow-[inset_0_2px_0_hsl(var(--ink))]`.
- Focus: `focus-visible:border-accent` plus the two-tone ring (`ring-2 ring-ring ring-offset-2 ring-offset-background`). Disabled: `opacity-50 cursor-not-allowed`. Invalid state (`aria-invalid="true"`): `border-destructive`, plus the caller's visible message (not colour alone).
- `Label`: `font-pixel text-sm font-semibold text-foreground`, unchanged otherwise.
- Same recipe for `textarea.tsx` (unused today, keep consistent). `select.tsx`: trigger = Input plate with chevron, content = `PixelPanel`-less plate (`bg-popover border-2`), unused today, so only the token cascade is guaranteed.

### 7. Badge (`badge.tsx`)
Flat chip (a carved sprite cannot go below 126x126). Because 8 files use it with caller `styles.*Badge` overrides, keep API:
- Base: `rounded-none border-2 px-2 py-0.5 text-xs font-pixel font-semibold`, hard bottom edge `shadow-[0_1px_0_hsl(var(--ink))]`, `h-6` min. Numbers inside (counts, timer `turn-countdown-timer`) use `font-readable tabular-nums`.
- Variants: `default` `bg-primary text-primary-foreground border-ink`; `secondary` `bg-secondary text-secondary-foreground border-border`; `destructive` `bg-destructive text-destructive-foreground border-ink`; `outline` `bg-background/60 text-foreground border-border` (used 30+ times). Hover colour shifts remain only when the badge is interactive. Focus ring: two-tone, only on focusable badges.
- Contrast: check `text-primary-foreground` on `--primary` (195 55% 45%) is >= 4.5:1; if not, use `text-ink`. Implementer records the ratio.

### 8. Progress (`progress.tsx`)
No caller today. Keep the Radix `Progress` API (`value`). Skin: plate track `h-4 rounded-none border-2 border-border bg-secondary`, indicator `bg-accent`, no transition under `motion-reduce`. Do NOT swap in `PixelBar` (its API needs `max` and `aria-label`, and its art is red fill); first real use should choose `PixelBar` directly. Acceptance below only checks it renders in the testbed.

### 9. Dependents (token cascade plus recipe, verified by grep as used)
Apply the plate recipe through tokens only, no behaviour change:
- `tooltip.tsx` (21 users): `bg-popover text-popover-foreground border-2 border-border rounded-none px-3 py-1.5 text-sm font-readable shadow-[0_2px_0_hsl(var(--ink))]`. Flat chip because carved's 126x126 floor is far larger than a tooltip. `TooltipTrigger asChild` + `Button` requires the PixelButton handler composition above.
- `popover.tsx` (2): content = `special` frame like Dialog, `padding sm`; width from caller. Min 128x128.
- `tabs.tsx` (1, `CustomSettingsSheet`): list = plate strip `bg-muted border-2 border-border rounded-none`; trigger `font-pixel`, active `bg-card text-accent border-b-2 border-accent`, inactive `text-muted-foreground`; keyboard arrows from Radix unchanged.
- `toast.tsx` / `toaster.tsx` (1 each): plate card, `rounded-none border-2`; destructive variant `bg-destructive text-destructive-foreground`; `font-pixel` title, `font-readable` description. Position unchanged.
- `switch.tsx` (6), `checkbox.tsx`, `radio-group.tsx`, `slider.tsx`: `rounded-none`, `border-2 border-border`, checked state `bg-primary` thumb/check `text-ink`; focus two-tone ring. Hit target >= 24x24, aim 44x44 via padded wrapper only if layout allows.
- `label.tsx`, `separator.tsx` (`bg-border`, 2 px), `scroll-area.tsx` (thumb `rounded-none bg-border`), `avatar.tsx` (`rounded-none border-2 border-border`): token-level.
- Untouched, unused: select, dropdown-menu, accordion, alert, skeleton, table, form, menubar, calendar, carousel, chart, sidebar, collapsible. They inherit token changes; no work.

### States (every state specified)
| Component | Default | Hover | Pressed | Focus-visible | Disabled | Other |
|---|---|---|---|---|---|---|
| Button sprite primary/danger | Regular sheet | Hover sheet | Pressed sheet, label down 2 px | two-tone ring (`ring` 2 px + 2 px `background` offset) | Disable sheet, label `ink` at `opacity-70`, click and keyboard inert | `loading` via PixelButton only |
| Button sprite neutral (outline/secondary) | Hover-sheet parchment | Blue regular | Blue pressed | same ring | Disable sheet | |
| Button plate | per variant table | `bg` shift (accent/primary 90%) | `translate-y-[1px]`, shadow shrinks to 1 px | same ring | `opacity-50`, no pointer events | |
| Button ghost/link | text | ghost `bg-accent/20`; link colour `foreground` | `translate-y-[1px]` | same ring | `opacity-50` | |
| Dialog/AlertDialog/Sheet | closed: absent | n/a | n/a | focus lands on first focusable (Radix); AlertDialog on Cancel | n/a | open (animated), closing (animated out), long content: wrapper scrolls, frame fixed; reduced motion: no animation |
| Dialog close button | blue round | hover sheet | pressed sheet | two-tone ring | n/a | |
| Card plate / framed | static | none | none | ring only if focusable | n/a | framed below floor: clamps |
| Input | `border-border` | `border-muted-foreground` | n/a | `border-accent` + ring | dimmed | invalid: `border-destructive` + message; placeholder muted |
| Badge | per variant | colour shift only if interactive | n/a | ring if focusable | n/a | |
| Tooltip | hidden | shown on hover/focus (Radix delay) | n/a | shown on keyboard focus | n/a | |
| Tabs | trigger inactive | `text-foreground` | n/a | ring | `opacity-50` | active: accent underline |
| Image load failure of sprite sheets | flat fallback `bg-card border-border` (Phase 1 behaviour) so text stays readable | | | | | |

### Tokens (all exist from Phase 1; no new token, no raw hex)
Surfaces `bg-card`, `bg-background`, `bg-popover`, `bg-secondary`, `bg-muted`; text `text-foreground`, `text-muted-foreground`, `text-ink`, `text-accent`, `text-primary-foreground`, `text-destructive-foreground`; borders `border-border`, `border-ink`; ring `ring-ring` with `ring-offset-background`; shadows via `hsl(var(--ink))`. Fonts: `font-pixel` (headings, buttons, labels, tabs, badges) and `font-readable` (Outfit: dense text, input value, descriptions, digits, ids, logs). Radius: `rounded-none` for all plates (replaces `rounded-md/lg/xl/full`).
Unchanged: `:root` light block, player colour tokens.

### Typography
- Pixelify Sans: DialogTitle/AlertDialogTitle/SheetTitle, CardTitle, Button labels (sprite 18 px / 600; plate `text-sm` 14 px / 600), Label, Tabs, Badge text.
- Outfit via `font-readable`: DialogDescription, AlertDialogDescription, SheetDescription, CardDescription, Input value, Tooltip, Toast description, any digit or id.
- Minimum sizes: body 14 px, badge/tooltip text 12 px only when Outfit.

### Copy
No product copy changes. Keep `sr-only` "Close". Testbed preview strings only:
- Preview page title: "shadcn bridge"
- Dialog: title "Move army", description "Choose how many units to send.", actions "Confirm" (default) and "Cancel" (outline)
- AlertDialog: title "Leave match?", description "Your army stays on the map.", actions "Leave" (destructive) and "Stay" (outline)
- Sheet: title "Event Log", description "Last 20 events."
- Input label "Game name", placeholder "My island"; invalid message "Name is required"
- Badges: "Bot", "3", "00:12"; Tooltip: "End turn"

### Interactions and motion
- Sprite buttons: hover/pressed swaps are instant (Phase 1). Keyboard Enter/Space shows pressed for 100 ms.
- Dialog: existing fade + zoom (200 ms); Sheet: existing slide (300/500 ms). Under `prefers-reduced-motion` all `animate-*` and `duration-*` off.
- Focus trap, Esc, outside click, scroll lock: exactly Radix (no change). Dialog close button is the first tab stop after the title only if Radix order puts it there (it follows content in DOM order, as today).

### Accessibility
- Contrast: sprite button labels `ink` >= 4.5:1 (Phase 1 Final spec item 1). Ribbon titles >= 3:1 large text (blue/red `text-foreground` + shadow, yellow `ink`). Plate text on tokens >= 4.5:1; implementer samples `--primary-foreground` on `--primary`, `--muted-foreground` on `special` slate and records ratios in the report.
- Focus: two-tone ring on every interactive element, also on the dialog close button and tabs.
- Radix semantics preserved: `role="dialog"`/`alertdialog`, `aria-labelledby` points to the Title element, `aria-describedby` to the Description. The ribbon art is `aria-hidden`; the Title element keeps accessible text.
- Icon-only buttons (`icon` size, close) need `aria-label` or `sr-only` text (close keeps `sr-only` "Close").
- Touch: sprite buttons 64 px tall; plate `sm` is 36 px tall (above the 24 px WCAG 2.5.8 minimum, below the 44 px aim): acceptable for HUD/dense rows in Phase 2, Phase 6 promotes dialog `sm` buttons to `default` where space allows. Close button hit area 48x48.
- Not colour alone: destructive buttons keep text; invalid inputs show text.
- Reduced motion as above.

### Mobile (390x844)
- Dialog/AlertDialog: 374 px wide frame, content 310 px usable, `max-h` 100dvh - 16 px with internal scroll. Two sprite buttons side by side (>= 264 px), three or more stacked and full width.
- Sheet: bottom sheet full width with bleed on left/right/bottom, scrolling content, `max-h` 85dvh. Left/right sheets `w-3/4` as today.
- 128 px floor (Button) and 126 px floor (carved): carved is not used by any bridge component; Button never renders under 128x64; badge/tooltip/chip use the plate tier so no floor applies. A `Card frame="wood"` must not be used below 256 px (use `paper`/`special`/`carved`).
- HUD additions: none. The map grid stays visible; overlays are the same as before.

### Acceptance criteria (testbed: add a "shadcn bridge" preview in `src/modules/pixel-ui` or `src/testbed`, registry path to be fixed by architect-a)
- [ ] Preview shows, on desktop 1280x720 and mobile 390x844, each of: Button default/destructive/outline/secondary/ghost/link at `default`, `lg`, `sm`, `icon`, plus `asChild` with an anchor, plus disabled state of each.
- [ ] `default`/`destructive`/`outline` at default size render sprite art (blue/red/parchment): `background-image` url contains `Button_Blue_3Slides`, `Button_Red_3Slides`, `Button_Hover_3Slides`; hover on outline switches to blue; pressed uses `_Pressed`; disabled uses `Button_Disable_3Slides`. `sm`, `icon`, `ghost`, `link`, `asChild` render no sprite (plate/plain).
- [ ] Sprite button measured >= 128x64; label contrast >= 4.5:1; focus ring two-tone visible on `special` frame and on the dark page.
- [ ] Dialog opens in the testbed: frame uses `SpecialPaper.png`; title inside a blue ribbon; close button 48x48 blue round, `sr-only` "Close" present; Esc closes; Tab cycles inside the dialog (focus trap); focus returns to the trigger; `role="dialog"` with `aria-labelledby` resolving to the title text.
- [ ] A dialog whose caller passes `bg-background/90 backdrop-blur-2xl border border-white/15` (e.g. `CombatDialog` styles) shows the pixel frame, no glass and no extra border (computed `background-color` of the Radix content is transparent, `backdrop-filter` none).
- [ ] AlertDialog: no close button; Cancel is focused on open; Esc and the existing `onEscapeKeyDown` behaviour unchanged; Action is sprite blue (or red with `variant="destructive"`).
- [ ] Sheet right, left and bottom open; only the inner edge of the frame is visible (no corner art at viewport edges, screenshot); title ribbon visible; content scrolls when taller than the viewport.
- [ ] Mobile 390x844: Dialog fits within 374x(844-16), no horizontal scroll, two buttons side by side or stacked per width rule, whole map grid still visible behind the overlay when dialog closed (no layout shift on the game page).
- [ ] Tooltip on a `Button asChild` trigger and on a sprite `Button` trigger opens on hover and keyboard focus and closes on pointer leave and blur (proves handler composition and ref forwarding).
- [ ] Card default has the plate look and the same box size as before (+2 px border); `Card frame="paper"` and `"special"` render the sheets at 390 px with no overflow.
- [ ] Input: plate look, 16 px Outfit text, focus shows `border-accent` + ring, invalid shows `border-destructive`.
- [ ] Badge variants default/secondary/destructive/outline show the flat chip, `turn-countdown-timer` badge unchanged in size class behaviour (digits in `font-readable`).
- [ ] No Radix prop, export or test id removed from `src/components/ui/*`; `npm run typecheck`, `npm run lint`, `npm test` pass; existing e2e dialog flows (combat, cards, session) still pass; zero 404s for assets in the console.
- [ ] ui-verify screenshots of login `/`, lobby, one in-game screen with a dialog open and the mobile bottom sheet: no overflow, readable text, HUD positions identical to before aside from skin.
- [ ] Report of call sites whose `className` sets `bg-`, `border-`, `rounded-` or `h-` on a sprite-tier `Button` or on `AlertDialogAction` (migration debt list).

### Open points for ui-designer-b
1. `neutral` PixelButton variant borrows the Hover sheet as the resting art (no neutral sheet exists in the pack). Confirm it reads as a button next to Blue, or choose outline = Blue and give hierarchy by order only.
2. `sm` stays a plate everywhere in Phase 2 (34 uses, HUD included). Confirm that dialogs full of `sm` plate buttons inside sprite frames is an acceptable interim look, or require a dialog-scoped promotion (needs a React context from the content components).
3. Dialog `special` frame default vs `paper`: confirm `special` is correct for dark-text-free bodies until Phase 6.
4. Ribbon title in flow (not straddling). Confirm for Phase 2.
5. Architect-a to confirm: `Ribbon` children typed `string`; DialogTitle needs node children (icons in CombatDialog header). Decide between widening `Ribbon` or a dialog-local ribbon built on `ThreeSlice` via the pixel-ui index.

## Review (ui-designer-b) Phase 2
VERDICT: APPROVED

Measured this session on real sheets in `public/tiny-swords` (PIL alpha bbox, sampled pixels, WCAG luminance) and by reading `PixelButton.map.ts`, `PixelPanel.map.ts`, `PixelPanel.styles.ts`, `Ribbon.tsx`. Design is consistent and buildable. Findings below are corrections; all are folded into the Phase 2 Final spec (no design rework sent back). Constraints respected: bridge covers everything except the map; HUD structure untouched (sm, icon, Card, Badge, Popover stay compact plates).

Findings
1. Neutral hover collides with primary (open point 1). `PixelButton.map.ts` `toSliceFile` already uses `Button_Hover_*` as the hover art for primary and danger. Spec makes `neutral` rest = Hover sheet and neutral hover = Blue sheet: hovering Cancel would turn it into Confirm's resting look, and hovering Confirm turns it into Cancel's. Fix: neutral hover stays on the Hover sheet with `brightness-110`; no blue swap. Pressed: Hover sheet, label down 2 px, `brightness-90` (no neutral pressed art exists). Does it read as a button next to Blue? Hover face (195,193,166) vs blue face (140,195,196) have luminance ratio 1.07 (hue differs, not lightness); the 56 px plate silhouette, border and ink label keep it a button. Hierarchy comes from hue (teal vs parchment) plus order. Accept.
2. `special` slate fails for caller text (open point 3). SpecialPaper centre is (82,91,102), a mid-tone, not the near-black the dialogs were written for. Measured on it: `foreground` 6.18:1 ok; `muted-foreground` 3.60 fail; Tailwind palette text callers use: red-400 2.49, blue-400 2.71, purple-400 2.61, gray-400 2.71, green-400 3.96 (all fail). Fix: inside the frame, the content area is a dark field `bg-black/50` (effective (41,46,51)): red-400 4.95, blue-400 5.39, purple-400 5.18, gray-400 5.40, muted-foreground 6.55, white/60 5.95. Slate then shows as the frame band around the field. `special` stays the default (answer 3).
3. Frame insets and the 310 px claim. Sheet margins: SpecialPaper opaque bbox x 9..311, y 20..299, so 9 px (sides), 20 px (top), 21 px (bottom) are transparent. The map inset of 16 puts text about 0-7 px from the visible border. At 390 px the shell is 374 wide, visible art 356 wide. Fix: inset left/right 24, top and bottom 36 for dialog/alert/sheet, and `padding sm` (8 px): content width 374 - 48 - 16 = 310. Two 128 buttons + 8 gap = 264 fit; three stack.
4. Close button position. `absolute right-2 top-2` of the shell lands on transparent margin and the frame border. Fix: `right-4 top-6` (16 px / 24 px): box x 310..358, y 24..72. Ribbon (in flow at y >= 36, margins 48 each side, so x 72..302) does not overlap. Ribbon text room: 214 px minus 32 px caps is about 180 px, about 18 Pixelify chars at 20 px; longer titles ellipsize (title attribute present). Acceptable.
5. Sheet bleed. Spec says 55 px (opaque span). The transparent margin (9/20/21) must also leave the screen or a hairline of frame shows. Fix: bleed = 64 px (one full corner cell) on every edge touching the viewport. Shell `overflow-hidden`, inner wrapper scrolls.
6. Popover on `special` (2 users: LobbyGameRow, TutorialBeacon). `TutorialBeacon` popover sits on the map HUD; a 128x128-floor frame with 24/36 insets would enlarge it and cover tiles. Fix: Popover stays plate (`bg-popover border-2 border-border rounded-none`) in Phase 2; frame decided with Phases 4-5.
7. Plate boundary contrast. `border-border` (86,70,57) vs `background`: 1.98:1; `card` vs `background`: 1.16:1. Inputs and outline buttons lose their boundary (WCAG 1.4.11 wants 3:1 for the visual boundary of inputs). `ink` border/shadow on dark surfaces is 1.09:1 (invisible; decorative only). Fix: Input, Switch/Checkbox/Radio/Slider track and outline plate Button use `border-muted-foreground` (9.27:1 on background); implementer measures >= 3:1 against its surface. Keep `ink` shadows as decoration only; never rely on them.
8. Ribbon nodes (open point 5). `Ribbon` already has an `icon` slot and `as: 'div'|'h2'|'h3'`, children typed string, and the `<Text>` it renders is internal, so Radix `Title` cannot give it `id` or ref. Decision in Final spec (item 9).
9. `text-primary-foreground` on `--primary` 5.01:1 (measured); `ink` on `--primary` is 3.93 (fails), so Badge/plate use `text-primary-foreground`, not ink.

Answers to ui-designer-a's open points
1. Neutral via Hover sheet: yes, with finding 1 (no blue hover swap).
2. Interim `sm` plate buttons inside sprite frames: acceptable for Phase 2. The two tiers share the recipe (square, 2 px border, hard bottom edge, Pixelify), and both sit on the dark field from finding 2, so the mix reads as intentional. Do not add a dialog-scoped context. Phase 6 promotes dialog actions to sprite `default` where width allows (>= 264 px for two). Acceptance adds a CombatDialog screenshot of the hybrid.
3. `special` default: confirmed, with the dark field (finding 2). `paper` opt-in stays for Phase 6.
4. Ribbon in flow, no straddle: confirmed.
5. Ribbon node children: widen `Ribbon` (Final spec item 9); no dialog-local ribbon.

## Phase 2 Final spec
Final spec = "Phase 2 spec (ui-designer-a)" with these overrides. Where they conflict, this section wins. Phase 1 Final spec items still apply (ink labels, ribbon text colours, two-tone ring, fonts).

1. **Neutral button**: `PixelButton` variant `neutral`: regular = `Button_Hover_3Slides.png`; hover = same sheet + `brightness-110`; pressed = same sheet + `brightness-90` + label down 2 px; disabled = `Button_Disable_3Slides.png`. No swap to the Blue sheet. Label `ink`. Replaces the table rows for `outline` and `secondary` art (hover "to blue", pressed "Blue_Pressed") in Button section and States table. Acceptance edit: "hover on outline switches to blue" becomes "hover on outline keeps `Button_Hover_3Slides` and applies brightness-110".
2. **Dark field**: Dialog, AlertDialog and Sheet content wrapper (inside the frame inset) has `bg-black/50`. All caller text is checked against this field, not the raw slate. Acceptance: sampled contrast of `text-muted-foreground`, `text-red-400`, `text-blue-400` and `text-gray-400` samples on the field >= 4.5:1 in the preview.
3. **Insets** (tunable, start values): Dialog/AlertDialog/Sheet frame inset left/right 24, top/bottom 36, `padding sm`. Usable width at 390 px = 310. If `PixelPanel` cannot take per-side insets, architect-a adds a `bare`/inset option; the visual result above is the requirement.
4. **Close button**: `absolute right-4 top-6` of the shell (Sheet: of the visible area). Ribbon title keeps `mx-12`.
5. **Sheet bleed** = 64 px on every viewport-touching edge (not 55). Shell `overflow-hidden`; no horizontal scroll at 390 px.
6. **Popover**: stays plate in Phase 2 (`bg-popover text-popover-foreground border-2 border-border rounded-none shadow-[0_2px_0_hsl(var(--ink))]`, `font-readable`). Remove the `special` frame requirement from section 9. `TutorialBeacon` and `LobbyGameRow` popovers must keep their size class behaviour.
7. **Boundary contrast**: Input, Switch/Checkbox/Radio/Slider tracks and the outline/secondary plate Button use `border-muted-foreground` instead of `border-border`. Implementer measures >= 3:1 vs the adjacent surface. Badge `outline` keeps `border-border` (text carries meaning, boundary is decorative).
8. **Badge/plate text**: `text-primary-foreground` on `bg-primary` (5.01:1 measured); never `ink` on `--primary` (3.93).
9. **Ribbon widening** (architect-a plans it in `src/modules/pixel-ui`): `Ribbon` `children: ReactNode`; `title` attribute set only when children is a string; `Ribbon` is `forwardRef` to its text element and spreads extra HTML props (`id`, `data-*`, `aria-*`) onto it; `as` stays `div|h2|h3`. Dialog/AlertDialog/Sheet titles are `<XPrimitive.Title asChild><Ribbon as="h2" color={ribbon} icon={...}>text</Ribbon></XPrimitive.Title>` so Radix `id` and `aria-labelledby` resolve to the text element. Icons go in the existing `icon` slot, not inside the heading. No dialog-local ribbon.
10. **sm plate in sprite frames**: accepted as interim; no context provider. Phase 6 promotes dialog actions. Migration debt list (Acceptance last item) stays.
11. **Extra acceptance criteria** (screenshot or test observable):
   - [ ] `getComputedStyle` of a neutral button after hover has `background-image` url containing `Button_Hover_3Slides` and `filter` with `brightness(1.1)`; it never contains `Button_Blue`.
   - [ ] Dialog content on 390 px: shell width 374, visible text column 310 (measured with `getBoundingClientRect` of the content wrapper), no horizontal scroll; two `default` sprite buttons side by side fit.
   - [ ] Close button box is fully inside the visible frame (not over transparent margin) and does not intersect the title ribbon at 390 px.
   - [ ] Contrast samples on the dark field listed in item 2 pass.
   - [ ] Sheet bottom/right at 390 px: no frame corner art or hairline visible at screen edges.
   - [ ] `CombatDialog` screenshot (desktop and 390 px) shows pixel frame, ribbon title, `sm` plate buttons on the dark field, no glass.
   - [ ] `TutorialBeacon` and `LobbyGameRow` popovers render at the same size as before the phase.
   - [ ] Input boundary contrast >= 3:1 measured.
   - [ ] `DialogTitle` accessible name equals its text and `aria-labelledby` of the dialog resolves to the `h2` inside the ribbon.
All other Phase 2 spec items and acceptance criteria stand as written.
