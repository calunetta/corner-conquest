# Pixel UI Bridge (shadcn components)

Part of the architecture & game-rules docs. Index and directives: [`docs/README.md`](../README.md). The pixel components these wrap are in §6.17 (`pixel-ui.md`); fonts and optical centring are in §6.18.

## 6.19. shadcn Bridge (`src/components/ui/`)

The vendored shadcn components keep their Radix APIs, so screens keep using `Button`, `Dialog`, `Card` and the rest. Their classes draw Tiny Swords art: sprite frames from `src/modules/pixel-ui/` for buttons, dialogs and cards, and flat plates (inset ring outline, `bg-card` or `bg-popover` fills, an ink drop shadow) for everything else. Outside the testbed, only `src/components/ui/` imports the `pixel-ui` barrel. Screens import the shadcn components.

### Button tiers (`button.tsx`)

| Variant | `default` / `lg` size | Other sizes (`sm`, `icon`, `plate`) |
|---|---|---|
| `default` | sprite, `primary` | plate |
| `destructive` | sprite, `danger` | plate |
| `outline`, `secondary` | sprite, `neutral` | plate |
| `ghost`, `link` | plate (no sprite) | plate |

- **Sprite:** renders `PixelButton` (its label is one line and truncates with an ellipsis, §6.17). `SPRITE_LOCK` is appended after the caller's classes: `!h-16 !rounded-none !border-0 !bg-transparent !bg-none !shadow-none`. The `!` utilities win over caller colour, border, radius, shadow and height classes and over `hover:` variants. Layout classes (`w-full`, `flex-*`, margins, `gap-*`) still apply. `SPRITE_WIDTH` sets `!min-w-[128px]` for `default` and `!min-w-[192px] px-8` for `lg`. `lg` does not forward `size="large"`: its art stays the 3-slice default.
- **Plate:** a flat, bordered button with the old default dimensions. `size="plate"` is `h-10 px-4 py-2`, the same as `default`; the HUD buttons `ActionButton` and `GameBoardHeader` use it so their boxes do not change. `sm` is `h-9 px-3`, `icon` is `h-10 w-10`. Plate and plain labels use `font-readable` (Patrick Hand, narrower than MedievalSharp, so fixed-size HUD buttons do not clip); only the sprite tier uses `font-pixel`.
- **Plain (`asChild`):** `asChild` renders Radix `Slot` with plate or plain styling, never a sprite, because `PixelButton` has no `Slot` support (§6.17). Sprite sizes collapse to `plate` for it. `AlertDialogAction` and `AlertDialogCancel` wrap a Button that is not `asChild` (Radix's `asChild` is on the Action or Cancel element), so they render sprites: Action takes its variant, Cancel is `outline` (`neutral`).
- **`neutral` variant:** `outline` and `secondary` map to `PixelButton` `neutral`, which uses the shared Hover plate for every state except disabled (§6.17). The plate tier's `outline` keeps `border border-transparent` because the old outline had a 1px border.
- **Handlers:** `Button` is a `forwardRef`. It destructures `variant`, `size`, `asChild` and `className` before spreading the rest, so a caller's `onPointerMove`, `onFocus` or `onClick` reaches `PixelButton`, and the consumer's handler runs first (§6.17). Tooltip triggers over sprite buttons rely on this.

Plate outlines use `ring-2 ring-inset`, not `border-2`. A real border grows content-sized and `h-auto` boxes by 2 to 4 px (`docs/ai/lessons-learned.md`, "Restyling buttons without changing layout"). Controls with a fixed `h-*`/`w-*` (Switch, Checkbox, Radio, Slider, Avatar) keep a real `border-2`, since the border sits inside the set box. Pressable plates add `shadow-[0_2px_0_hsl(var(--ink))]`; on `active` the shadow drops to 1 px and the plate moves down 1 px.

### Dialog family (`dialog-frame.tsx`, `dialog.tsx`, `alert-dialog.tsx`, `sheet.tsx`)

- **Frame:** `DialogFrame` draws a `PixelPanel` with `padding="none"` and a field inside it. `frame` is `special` by default (`DialogContent`, `AlertDialogContent`) or `paper`. The `Sheet` frame is always `special`.
- **Dark field (`special`):** `bg-black/50`, drawn inside the frame's inset.
- **Paper field (`paper`):** text is `text-ink`. Ghost and link buttons and muted text are overridden by descendant selectors in `FIELD_PAPER`. This couples the frame to button class names; it is a known carry-over (debt G below).
- **Field layout:** a grid with `gap-4`, `px-4 py-2`, `overflow-y-auto` and `max-h-[calc(100dvh-3rem)]`. The 3 rem is the 16 px shell margin plus 2 × 16 px frame inset.
- **Shell:** `DIALOG_SHELL` centres the content, `w-[calc(100vw-16px)] max-w-lg max-h-[calc(100dvh-16px)]`. `SHELL_TRANSPARENT` is appended after the caller's `className`, so a caller's glass classes (`bg-background/90`, blur, border) lose and the frame shows through.
- **Title:** `DialogTitle` is `Primitive.Title asChild` around `Ribbon as="h2"`. The `ribbon` prop (default `blue`) and `icon` prop pass to the Ribbon. `TITLE_RIBBON` is `mx-auto block w-fit max-w-[16.5rem] sm:max-w-sm`, with `text-lg`, then `sm:text-xl` on the h2. The caps are fixed rem values: a percentage collapses inside shrink-to-fit parents such as the combat header.
- **Close button:** `DialogCloseButton` is a `PixelButton` `icon-round` (48 × 48 px) with `absolute right-0 top-0` on the shell's top-right corner, outside the centred ribbon band. It holds an `X` icon and an `sr-only` "Close". `DialogContent` and `SheetContent` render it. `AlertDialogContent` has none: confirm prompts close through Cancel or Escape.
- **Sheet bleed (`sheet.tsx`):** `SHEET_BLEED` extends the special frame 64 px (`-inset-y-16` and `-right-16` on a right sheet) past the viewport-touching edges, so only the inner edge shows. The field has a 16 px margin (`ml-4`) on that inner edge. The frame is `aria-hidden` and `pointer-events-none`.
- **Sheet close and title:** on `right` sheets the close button is `right-2 top-6`; on the others `right-6 top-6`. `SHEET_TITLE_RIBBON` is `mr-auto block max-w-[calc(100%-4rem)]`: left aligned, with 4 rem kept clear for the close button.
- **Description and footer:** `DESCRIPTION_CLASS` is `font-readable text-sm text-muted-foreground`. `FOOTER_CLASS` stacks buttons in reverse below `sm` and right-aligns them from `sm`.
- **Overlay:** `bg-black/80`; the motion classes are switched off by `motion-reduce`.

### Plates (`src/components/ui/`)

Each plate keeps the shadcn props and adds Tiny Swords colour, font and outline. Font rule: §6.18.

- **Card:** flat plate `rounded-none border border-transparent ring-2 ring-inset ring-border bg-card`. `CardTitle` is `font-pixel text-2xl`; `CardDescription` is `font-readable text-sm`. `frame` (a `PanelVariant`) swaps the plate for a `PixelPanel` with `padding="none"`. A `frame` Card does not forward its `ref` (debt J). On the light frames `banner`, `paper` and `carved`, `CardDescription` is `text-ink/90` through the `[data-card-description]` selector.
- **Input and Textarea:** `h-10` (Input) or `min-h-[80px]` (Textarea), `ring-muted-foreground` for the boundary, `hover:ring-foreground/60`, `focus-visible:ring-ring`, `aria-[invalid=true]:ring-destructive`, an inset ink shadow, and `font-readable text-base`.
- **Label:** `font-pixel text-sm leading-none`.
- **Badge:** `font-pixel text-xs` in `default` (`bg-primary`), `secondary`, `destructive` (`bg-[hsl(5_70%_45%)]`) and `outline`. The destructive fill is a raw value, not `--destructive` (3.70:1 with the light text); Toast's destructive variant uses the same value.
- **Progress:** `h-4 w-full`, `ring-border`, `bg-secondary`. The indicator is `bg-accent`; the value is clamped to 0–100 before Radix.
- **Tooltip and Popover:** `bg-popover`, `ring-muted-foreground`, `font-readable text-sm` (Tooltip) and `w-72 p-4` (Popover).
- **Tabs:** the list is `bg-muted` with a `ring-muted-foreground` ring and `h-10`. A trigger is `font-pixel text-sm`; the active trigger is `bg-card text-accent` with an accent inset underline.
- **Toast:** `default` (`bg-card`, `ring-muted-foreground`) and `destructive` (`bg-[hsl(5_70%_45%)]`, `ring-ink`). Title `font-pixel text-sm`, description `font-readable text-sm`. `ToastClose` is `opacity-0` until hover or focus.
- **Switch:** `h-6 w-11`, `border-2 border-muted-foreground`, `bg-input` when off and `bg-primary` when on. Thumb `h-5 w-5 bg-foreground`.
- **Checkbox and RadioGroupItem:** `h-4 w-4 border-2 border-muted-foreground`. Checked checkbox is `border-ink bg-primary`.
- **Slider:** track `h-2 border-2 border-muted-foreground bg-secondary`, range `bg-primary`, thumb `h-5 w-5 border-2 border-ink bg-foreground`.
- **Separator:** `bg-border`, `h-[2px]` horizontal or `w-[2px]` vertical, decorative by default.
- **ScrollArea:** vertical scrollbar `w-2.5`, thumb `bg-muted-foreground`. Radix's default `type="hover"` hides the thumb at rest.
- **Avatar:** `h-10 w-10 border-2 border-border`; fallback `bg-muted`.

### Contrast (measured, from `docs/ai/tasks/2026-10-22-tiny-swords-ui-refactor/review.md`)

- Input boundary (`ring-muted-foreground`): 9.27:1.
- Badge default 5.01:1; destructive 5.00:1 with the raw colour above.
- Card light-frame description (`text-ink/90`): 5.25:1 or more on banner, paper and carved fills.
- Switch and scrollbar thumb: 9.31:1.
- Ghost and link buttons on paper: 13.78:1 and 10.81:1.
- Separator (`bg-border`): about 1.98:1, decorative only.
- PixelButton disabled label: 3.81:1, accepted as WCAG-exempt (Phase 1e).

### Limitations and carry-overs (Phase 2)

Full call-site lists are in `docs/ai/tasks/2026-10-22-tiny-swords-ui-refactor/plan.md` ("P2 Migration debt", categories A–E) and `review.md` (findings F–K). Owners are the phases that rebuild each screen.

- **A. Sprite call sites with colour, gradient, shadow or height classes.** `SPRITE_LOCK` hides them for now. Each screen rebuild (Phases 3–6) removes the classes and picks a variant. Known symptom: the lobby "Create New Game" label and the Login Google label truncate in their narrow columns (Phases 4 and 3).
- **B. Plate call sites that override border colour or radius** (for example `border-white/10`, `border-white/5`). They lose the boundary contrast. Phases 3–6.
- **C. Glass classes on dialog and sheet content.** Neutralised by `SHELL_TRANSPARENT`; delete them in Phase 7.
- **D. Titles.** `VictoryDialog` title gradient (Phase 6); `MobileActionsSheet` title with an info beacon (Phases 5–6); titles nested beside an icon in CombatDialog and ArmySelectionDialog headers (Phase 6).
- **E. `AlertDialogCancel` margin.** Closed in 2d: no caller relied on `mt-2 sm:mt-0`.
- **F.** CombatDialog cards touch the right edge of the field at 390 px (Phase 6).
- **G.** Paper field descendant selectors (`FIELD_PAPER`). Replace with a Button tone or a context (Phase 6).
- **H.** `CardDescription` uses `font-readable`, which reflows Login at 390 px. Accepted; Phase 3 redesigns Login.
- **I.** A `ring-inset` outline is painted under the element's children. An opaque child `bg-*` covers it, so keep full-bleed child backgrounds off plates.
- **J.** `Card frame` does not forward `ref`.
- **K.** The light-frame `[data-card-description]` selector (Phase 6 replaces it with context).
- **Phase 7 polish:** raw destructive `hsl` in Badge and Toast (move to a token); `ToastClose` is hidden on touch; Popover has no `collisionPadding` at 390 px; the Slider thumb has no accessible name; the `disabled:` classes on the Slider thumb span are inert.
- **Phase 2 limits:** sprite `lg` is not `size="large"`; `asChild` never gets a sprite; a focus ring on a sprite button is square (it sits on the 64 px box).

### Testbed (`shadcn-bridge`)

- Route `/testbed/shadcn-bridge`, group `Pixel UI`, registered in `src/testbed/registry.ts`. Source in `src/testbed/components/ShadcnBridge/` (`ShadcnBridge.preview.tsx` plus `Buttons`, `Dialogs`, `Overlays`, `Fields`, `Plates`, `Nav` and `Controls` files).
- 37 states: Buttons (7), Dialogs (5, incl. glass className and hybrid), AlertDialog (1), Sheet (3, right, left, bottom), Card (2), Input, Textarea, Label with input, Badges, Progress (2), Tooltip, Popover, Tabs, Toast (3), Switch, Checkbox, Radio group, Slider, Separator, ScrollArea long content, Avatar.
