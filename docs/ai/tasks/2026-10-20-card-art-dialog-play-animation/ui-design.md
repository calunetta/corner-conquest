# UI design: Card art in CardsDialog, card-play animation, card icons in the game log

## Spec (ui-designer-a)

### Purpose and user story
As a player, I want my special cards shown as framed art, a short play animation when I use one, and the card icon in the event log, so that cards feel like objects and I can scan what was played.

One new visual pattern: the framed card (`CardFace`). The dialog tile, the play animation and the log icon reuse it or its art.

### Art facts (verified)
- Catalog: `src/modules/cards/card-art.ts`, `CARD_ART[cardName]` gives `{ icon, card }`. `card` = 400x600 (2:3) transparent PNG, rounded frame, no text. `icon` = 128x128 transparent.
- Viewed: `war-chief-card.png` (crimson/iron frame, art fills the frame, transparent rounded corners), `war-chief-icon.png` (helmet on transparent).
- Frame color by group: action = steel/blue, economy = wood/gold, combat = iron/crimson. Color is already in the art; the UI adds no color-coding of its own.
- `CardsDialog` shows only `USABLE_CARDS` with Use (`src/modules/game-rules/card-data.ts:29`); non-usable cards (e.g. Overcome, Productive) show art but no Use button, as today.

### Placement and layout

**New component `CardFace`** (module `src/modules/cards/components/CardFace/`; architect names the path). Pure view: props `cardName`, `size`. Renders the `card` art at 2:3, `next/image` with `unoptimized` not required (static PNG); `alt=""` when a visible name label sits next to it, else `alt=<card name>`. Sizes: `tile` (dialog), `hero` (animation). Rounded to match art corners; no extra border (the frame is the border). Drop shadow only.

**CardsDialog (desktop 1280x720)**
- Dialog keeps `max-w-2xl`, header, ScrollArea (`h-80`), footer unchanged.
- Grid of 2 columns (`sm:grid-cols-2`). Each card cell is a horizontal tile: `CardFace` (tile size, 80 px wide x 120 px tall) on the left; on the right, stacked: name (text-sm font-bold), count badge `x{n}`, description (text-xs muted), Use button at the bottom.
- Cell uses existing `Card` shadcn with current border/hover tokens. Replaces the `zap` icon entirely.
- Tile height 120 px + padding: 2 rows visible in `h-80` (320 px) with scroll beyond.

**CardsDialog (mobile 390x844)**
- 1 column. Same horizontal tile at the same size (80x120 art). Dialog width follows existing `max-w-md`. Use button full width of the text column, min height 36 px, tap target 44 px high via padding where space allows. Description may wrap to 4 lines max (line-clamp not used; scroll area handles overflow).
- The dialog is modal and covers the map while open (existing behavior). The map is not covered during the animation, see below.

**Card-play overlay (animation)**
- Local-only fixed overlay above the map, below dialogs: centered horizontally, vertically centered on viewport. Non-interactive (`pointer-events: none`), no backdrop dimming beyond a faint radial vignette (`bg-black/30`, fades in/out) so the map stays readable.
- Card size: desktop 200x300 px, mobile 150x225 px (fits 390 px wide; the 5x6 grid stays visible around and behind it since it is translucent and short-lived).
- Under the card, name in the hero-text gradient (`from-amber-300 via-yellow-400 to-primary`, `font-black tracking-wide`, text-lg desktop, text-base mobile). No description.

**GameLog**
- Card-use entries show a 16x16 px card icon (`CARD_ART[name].icon`) in place of the category `layers` icon, same slot in the row (leading, `shrink-0`, `mt-0.5`). Entries without a card keep today's category/milestone icons.
- Row text size/color unchanged. Icon is decorative (`alt=""`), the message already names the card.
- Same in panel (desktop) and sheet (mobile) variants.

### States
| State | What the player sees | Trigger |
|---|---|---|
| Dialog, no cards | Existing empty state: shield icon, "This player currently has no special cards." | `cards.length === 0` |
| Card tile, usable, can use | Art + name + `x{n}` + enabled `Use` | own turn, own cards, `UseCard` not yet in `actionsThisTurn` |
| Card tile, usable, cannot use | Same, `Use` disabled (existing disabled style) | not my turn, viewing another player, or card action already used |
| Card tile, not usable | Art + name + `x{n}` + description, no button | card not in `USABLE_CARDS` |
| Art load failure | Tile shows the art area as a 80x120 muted rounded box with the `layers` registry icon centered; name and text unaffected | image `onError` |
| Tile hover | Border `border-primary/30`, bg `bg-black/60` (existing); art lifts by `scale-105` over 150 ms | pointer hover |
| Tile focus | Use button shows visible focus ring (`focus-visible:ring-2 ring-ring`); art is not focusable | keyboard |
| Playing (animation) | Overlay described below; dialog already closed | local Use click |
| Playing, reduced motion | Card fades in at final position, holds, fades out; no movement, scale, glow or shake | `prefers-reduced-motion: reduce` |
| Log entry, card use | Card icon + message | log entry carries the card name |
| Log entry, card name missing or unknown | Falls back to the `layers` category icon | legacy or old entries |
| Log entry, redacted (owner-only visibility) | Viewer who cannot read detail sees the redacted message with the generic `layers` icon, never the specific card icon | `visibility` excludes viewer |

Note on the redacted state: showing the icon would leak the hidden card. Architect decides how `cardName` is gated; the design requirement is that viewers excluded by `visibility` do not see the specific icon.

### Components and tokens
- Reuse: `AlertDialog*` (`@/components/ui/alert-dialog`), `Card`, `CardContent`, `CardHeader`, `CardTitle` (`@/components/ui/card`), `Badge`, `Button`, `ScrollArea`, `RegistryIcon` from `@/modules/shared`; `CARD_ART` from `@/modules/cards/card-art`. Existing dialog styles in `CardsDialog.styles.ts` (card, countBadge, useButton, descriptionText) are kept; `zapIcon` is removed.
- New: `CardFace` (framed card), plus a `CardPlayOverlay` that composes `CardFace` at `hero` size. The overlay is one component, not a new visual pattern.
- Tokens: `bg-black/40`, `bg-black/60`, `border-white/10`, `border-primary/30`, `text-foreground`, `text-muted-foreground`, `bg-black/30` (vignette), gradient `from-amber-300 via-yellow-400 to-primary`, `ring-ring`. Overlay z-layer above the map HUD (`z-20`, `z-30`) and below dialogs; architect picks the exact value. No raw hex.

### Copy
- Dialog title, description, empty state, `Use`, `Close`: unchanged.
- Count badge: `x{n}` (unchanged).
- Card image alt: `` when a name label is adjacent (dialog tile, overlay), otherwise the card name.
- Overlay label: the card name exactly as `CardName` (e.g. `War Chief`, `Extra Move`).
- Overlay container: `role="status"`, `aria-live="polite"`, visually hidden text `You played {card name}.`
- Log message text unchanged; this feature only adds the icon.

### Interactions and motion
Dialog
1. Click `Use` closes the dialog (existing `TOGGLE_CARDS_DIALOG` + `local_UseCard`) and starts the overlay animation in the same tick. The card effect and any follow-up dialog (Steal, Sabotage, Scout, etc.) are not delayed by the animation; follow-up dialogs open on top of the overlay (the overlay is non-blocking).

Overlay animation, 1100 ms total (full motion)
- 0-300 ms: card enters from the bottom of the viewport (translate up ~40 px to center), scale 0.85 to 1, opacity 0 to 1, ease-out. Vignette fades in.
- 300-800 ms: hold; subtle glow pulse behind the card (`drop-shadow` in `primary`), single pulse.
- 800-1100 ms: card scales to 1.08 and fades to opacity 0 while rising 20 px; vignette fades out. Overlay unmounts at 1100 ms.
- Name label fades in with the card (0-300 ms) and out with it.

Reduced motion
- Replace with: opacity 0 to 1 over 150 ms, hold 700 ms, opacity 1 to 0 over 150 ms. No transform, glow or vignette animation (static vignette allowed).

Rules
- Only the acting local player ever mounts the overlay. Opponents see nothing.
- Playing two cards in quick succession: a new play replaces the current overlay (restart). The game already allows one `UseCard` action per turn; not expected, but must not stack.
- Overlay never intercepts clicks, scroll or keyboard; it is not focusable.
- Log: new card-use entry appears with the standard entry behavior; no extra animation.

### Accessibility
- Overlay: `role="status"` with the visually hidden text above, announced politely once; `aria-hidden` on the image.
- `CardFace` is decorative in the dialog because name and description are real text next to it.
- `Use` button keeps its text label "Use". Add accessible name context: `aria-label="Use {card name}"`, since several identical "Use" buttons appear (no current label; flagged gap).
- Keyboard path in dialog: Tab through Use buttons then Close; Escape closes (existing). Focus ring visible.
- Contrast: name `text-foreground` and description `text-muted-foreground` on `bg-black/40` already meet 4.5:1 (existing tokens). Overlay name gradient on a `bg-black/30` vignette: gradient colors are light; verify >= 4.5:1 in screenshot.
- Motion: `prefers-reduced-motion` handled in JS or `motion-reduce:` variants, so reduced users get the fade only.
- Color not the only cue: the card is identified by name text, not frame color.

### Acceptance criteria
- [ ] CardsDialog with at least 3 cards shows each card's framed art (400x600 art at 80x120) and no zap icon anywhere in the dialog.
- [ ] Each tile shows name, `x{n}` badge and description; usable cards show `Use`, non-usable cards (e.g. Overcome) do not.
- [ ] Desktop 1280x720: 2-column grid, 2 rows visible without scroll in the dialog, no clipped text.
- [ ] Mobile 390x844: 1-column list, no horizontal scroll, `Use` reachable, tile art not distorted (2:3 ratio preserved).
- [ ] Image failure shows the muted placeholder with `layers` icon, name and Use still work.
- [ ] Clicking `Use` closes the dialog and shows the overlay card with the correct art and name within 100 ms; overlay is gone by 1200 ms.
- [ ] During the overlay, clicks on the map pass through; the 5x6 map grid remains visible on mobile (overlay narrower than the viewport, vignette translucent).
- [ ] With `prefers-reduced-motion: reduce` emulated, the overlay only fades (no transform), total about 1000 ms.
- [ ] A second client in the same match shows no overlay when the first plays a card.
- [ ] Overlay container exposes `role="status"` with text `You played {card name}.`; each `Use` button has `aria-label="Use {card name}"`.
- [ ] GameLog card-use entry shows the 16 px card icon from `CARD_ART[name].icon` instead of the `layers` icon; non-card entries keep category icons; legacy string entries still render.
- [ ] A viewer excluded by entry `visibility` sees the redacted message and the generic `layers` icon.
- [ ] Testbed previews exist for `CardFace` (all 13 cards, both sizes), CardsDialog, overlay (full and reduced motion) and GameLog with card entries.

### Phase mapping
1. `CardFace` + CardsDialog tile layout (art, states, a11y labels).
2. `CardPlayOverlay`, local trigger on Use, reduced-motion fallback.
3. Log icon (needs `cardName` on card log entries; architect defines), redacted-entry rule, docs.

## Review (ui-designer-b)
VERDICT: APPROVED

Verified: `CARD_ART`/`artFor` (`src/modules/cards/card-art.ts`, 13 cards, `-card.png` and `-icon.png` exist in `public/sprites/cards/`), `CardsDialog.tsx` and `.styles.ts` (zap icon, `h-80` scroll area, `h-7` Use button, `max-w-md sm:max-w-2xl`), `StructuredLogEntry.visibility` (`src/lib/types/game.ts:62`), `GameLog.styles.ts` (`entryIcon` is `h-3 w-3`, so the spec's 16 px is a deliberate enlargement), `USABLE_CARDS` in `src/modules/game-rules/card-data.ts`. Spec is consistent with theme, reuses primitives, one new pattern. Findings, all folded into the Final spec (no design change needed):

1. Desktop tile height: at 2 columns in `max-w-2xl` the text column is ~180 px. Name, badge, 3 to 4 description lines and Use exceed 120 px, so "2 rows visible without scroll" is not guaranteed. Fix: put the `x{n}` badge on the name row; criterion becomes "at least 1 full row plus the start of the second; scroll allowed; no clipped text".
2. Use button size: current `h-7` (28 px); spec said 36 px with a vague 44 px clause. Fix: `h-9` (36 px, above the 24 px floor) on both breakpoints; drop the 44 px clause.
3. Mobile overlay does not leave the 5x6 grid visible: a 150x225 opaque card centered covers part of the grid. The criterion was false. Fix: the overlay may cover the grid for at most 1.1 s, never intercepts input; criterion changed to what is testable (width, `pointer-events: none`, gone by 1200 ms).
4. `role="status"` mounted together with its text is often not announced. Fix: architect mounts a persistent empty status region (visually hidden) and sets the text on play, cleared at unmount of the art.
5. Alt rules were contradictory. Fix: `CardFace` is always `alt=""` in dialog and overlay; other future uses pass an explicit `alt`.
6. Hover `scale-105` needs `motion-reduce:transform-none`; hover does not exist on touch, so no information depends on it.
7. Log fallback wording: when `cardName` is missing, show today's category icon (not specifically `layers`). Legacy entries with `category: null` keep no icon.
8. Redaction: the icon is chosen client-side from `cardName`, which is in the document. GameLog must call `canViewerReadLogEntry` before using `cardName`; otherwise use the category icon. Testable.
9. Overlay z-index: `z-40` (above HUD `z-30`, below dialogs `z-50`).
10. A 16 px icon of a 128 px art may read poorly; screenshot check at 16 px is an acceptance item, with 20 px (`h-5 w-5`) allowed as fallback if illegible.

## Final spec

Apply `Spec (ui-designer-a)` with these amendments (amendments win on conflict).

### Amendments
- **CardFace**: `next/image` with explicit width/height (2:3), `alt=""` in dialog and overlay (name is adjacent text); optional `alt` prop for other uses. Art error placeholder: 2:3 muted rounded box (`bg-muted/40 rounded-lg`) with `RegistryIcon id="layers"`. Hover `scale-105` over 150 ms with `motion-reduce:transform-none`; no information depends on hover.
- **Dialog tile** (desktop and mobile): art 80x120 left. Right column, top to bottom: name row (name `text-sm font-bold truncate` + `x{n}` badge on the same row), description (`text-xs text-muted-foreground leading-relaxed`, wraps, no clamp), Use button (`h-9`, `text-xs`, existing gradient and `play` icon, `aria-label="Use {card name}"`) aligned at the bottom, only for `USABLE_CARDS`. Tile grows with its text; min height 120 px. `zapIcon` and the `CardHeader` title row layout are replaced.
- **Overlay**: `fixed inset-0 z-40 pointer-events-none`; card 200x300 desktop, 150x225 mobile (`useIsMobile()`); name below in hero gradient. Persistent visually hidden `role="status" aria-live="polite"` region mounted with the overlay host; text `You played {card name}.` set on play and cleared when the overlay unmounts. Card and label `aria-hidden`. Timing and reduced-motion behavior as in the Spec. A new play restarts the overlay. Covering part of the map for at most 1.1 s is accepted.
- **GameLog**: card icon `h-4 w-4` (16 px; 20 px allowed if illegible in screenshot), `alt=""`, `shrink-0 mt-0.5`, only when the entry has a `cardName` and the viewer passes `canViewerReadLogEntry`; otherwise the existing category icon (legacy `category: null` entries: no icon). Same in panel and sheet variants.

### Acceptance criteria (replaces the Spec list where they differ)
- [ ] CardsDialog with at least 3 cards shows each card's framed art at 80x120 (2:3 preserved), no zap icon.
- [ ] Each tile shows name, `x{n}` badge on the name row, and description; usable cards show `Use` with `aria-label="Use {name}"`; non-usable cards (Overcome) show no button.
- [ ] Desktop 1280x720: 2-column grid, first row fully visible and the second row starting inside the 320 px scroll area, no clipped text, scroll works.
- [ ] Mobile 390x844: 1 column, no horizontal scroll, Use reachable, art not distorted.
- [ ] Image failure: muted placeholder with `layers` icon; name and Use still work.
- [ ] Use closes the dialog and mounts the overlay with correct art and name within 100 ms; overlay unmounted by 1200 ms (fake timers).
- [ ] Overlay root has `pointer-events: none`; a click at screen center during the overlay reaches the map; card width at 390 px viewport is 150 px.
- [ ] With `prefers-reduced-motion: reduce`, overlay uses opacity only (no transform class/animation), about 1000 ms total.
- [ ] A second client shows no overlay when the first plays a card.
- [ ] The status region exists before play and contains `You played {card name}.` after play.
- [ ] GameLog card-use entry with `cardName` shows `CARD_ART[name].icon` at 16 px (legible in screenshot); entries without `cardName` and non-card entries keep category icons; legacy string entries render.
- [ ] A viewer excluded by `visibility` sees the redacted message and the category icon, never the card icon.
- [ ] Testbed previews: `CardFace` (all 13 cards, both sizes), CardsDialog, overlay (full and reduced motion), GameLog with card entries.

### Phase mapping
1. `CardFace`, CardsDialog tile layout, a11y labels, preview.
2. `CardPlayOverlay` + persistent status region, local trigger on Use (`GameDialogManager` onUseCard path), reduced motion, preview.
3. `cardName` on card log entries (architect defines), GameLog icon with visibility gate, docs-sync.
