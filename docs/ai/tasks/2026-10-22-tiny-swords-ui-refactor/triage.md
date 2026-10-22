# Triage: Tiny Swords UI refactor

Tier: XL · Status: PLAN AGREED 2026-10-22, not started.

## Goal
Restyle the whole app with the Tiny Swords UI pack (`public/tiny-swords/UI`, `public/tiny-swords/UI Elements`). Credit page `/thanks` already exists.

## Decisions (user, 2026-10-22)
- Scope: everywhere (login, lobby, HUD, dialogs). **The map itself stays as it is.** The HUD may change its look, but **its structure must not change** in game for now.
- Font: Pixelify Sans (Google Font).
- Login/lobby background: Tiny Swords water and islands (`Terrain/Water`, foam, decorations).
- Order: login, lobby, HUD, dialogs.

## Asset map
- Ribbons `UI/Ribbons/Ribbon_{Blue,Red,Yellow}_3Slides.png`: titles, headers, footer strip, resource chips, turn indicator.
- Buttons `UI/Buttons/Button_{Blue,Red}_{3,9}Slides[_Pressed]`, Hover, Disable; round/square in `UI Elements/UI Elements/Buttons`.
- Panels (9-slice sheets, 64px cells, content at cells 0/middle/last): `WoodTable`, `Banner`, `RegularPaper`, `SpecialPaper`; flat `UI/Banners/Carved_9Slides`/`Carved_3Slides`.
- Bars `UI Elements/UI Elements/Bars`; icons `UI Elements/UI Elements/Icons` (12) and `UI/Icons` (grey, 3 states); avatars (25); cursors/pointers.

## Phases
1. Foundation: `src/modules/pixel-ui` (NineSlice, ThreeSlice, Ribbon, PixelButton, PixelPanel, PixelBar, PixelIcon) + previews; Pixelify Sans in layout; `globals.css` tokens retuned.
2. shadcn bridge: restyle button, dialog, alert-dialog, sheet, card, input, badge, progress internally.
3. Login + footer on a water background.
4. Lobby (match list, create-match, field guide, rejoin panel).
5. In-game HUD: skin only, no layout/structure change.
6. Dialogs (cards, combat, session).
7. Cleanup: remove old glass/gradient styles, docs-sync (`docs/architecture/systems-and-visuals.md`), lessons-learned.

## Risks
- 128px corners of `WoodTable`/`Banner` are heavy on mobile: use Carved/Paper for small panels.
- Pixel font readability in logs and card text: check at mobile size.
- shadcn bridge touches every dialog: run the full test suite and ui-verify per phase.
