---
name: ui-design
description: Corner Conquest's visual language and UX rules (dark theme tokens, glass panels, Outfit font, pixel-art sprites, shadcn primitives, mobile map sizing, accessibility) and how to write and review a ui-design.md spec. Use when designing, reviewing or implementing anything the player sees.
---

# UI design

The code is the source of truth for the look. The style section of `docs/blueprint.md` (Deep Blue, Inter) is outdated.

## Visual language (verified in code)
- **Theme**: dark only (`<html class="dark">` in `src/app/layout.tsx`). `.dark` tokens in `src/app/globals.css`: deep navy `background` (230 40% 6%), cyan `primary` (190 90% 50%), gold `accent` (45 100% 55%), violet `secondary`, red `destructive`. Use token classes (`bg-primary/20`, `text-muted-foreground`, `border-border`), never hex.
- **Font**: Outfit, weights 400–900, via `next/font`. Headings are heavy (`font-black tracking-wide`).
- **Panels**: glass over the map, `rounded-xl border border-white/10 bg-black/60 backdrop-blur-md shadow-lg` (`MapZoomControls.tsx`, `GameStatusBadge.tsx`).
- **Hero text**: gold-to-cyan gradient, `bg-gradient-to-r from-amber-300 via-yellow-400 to-primary bg-clip-text text-transparent` (login card, `src/app/page.tsx`).
- **Art**: pixel-art sprites in `public/sprites/` (armies per color, monsters, castles, terrain). Animated GIFs render through `next/image` with `unoptimized`. Player colors: blue, red, purple, yellow (`PlayerColor`).
- **Icons**: `lucide-react`.
- **Primitives**: shadcn/ui in `src/components/ui/` (Dialog, Sheet, Popover, Tooltip, Button, Badge, Progress, RadioGroup, Slider, …). Reuse them.
- **Layering**: the map is the stage; HUD sits on its edges (`z-20`, `z-30`); dialogs above.
- **Login/lobby parity**: the login page shares the lobby's background and glass style (`docs/README.md` §2).

## Layout rules
- Desktop reference 1280×720, mobile 390×844. `useIsMobile()` (`@/modules/shared`) switches below 768 px.
- On mobile the whole map grid (`MAP_COLS` × `MAP_ROWS` = 5 × 6) stays visible; tiles are `clamp(46px, 13.5vw, 68px)` (`src/features/game/components/MapGrid.tsx`). New HUD elements must not cover it; collapse them on mobile.
- Touch targets: aim for 44 × 44 px (WCAG 2.5.5); never below 24 × 24 px (WCAG 2.5.8).

## Accessibility
- Text contrast ≥ 4.5:1 on the dark background. Never rely on color alone: add a label, number or icon.
- Icon-only buttons need `aria-label`. Known gap: legacy icon buttons rely on tooltips only.
- Everything works by keyboard; focus is visible (`focus-visible:ring-2 focus-visible:ring-ring`).
- Motion respects `prefers-reduced-motion` (`motion-reduce:` variants).

## Writing ui-design.md (ui-designer-a)
Copy `docs/ai/templates/ui-design.md`. Look at the current UI first (Read the components, or screenshot with skill `ui-verify`). Specify every state, exact copy, and acceptance criteria a screenshot can confirm. Reuse before inventing: at most one new visual pattern per feature.

## Reviewing it (ui-designer-b)
Check consistency with the language above, missing states, mobile fit, accessibility, cognitive load during a turn, feasibility with existing primitives, and whether each acceptance criterion is testable. Write `VERDICT: APPROVED` or `VERDICT: CHANGES REQUESTED` with concrete fixes, then the Final spec once approved.
