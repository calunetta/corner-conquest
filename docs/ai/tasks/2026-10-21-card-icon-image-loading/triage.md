# Triage: Faster card and icon image loading so the card animation shows the art

Request: Card and icon images take too long to render, so the card-play animation often shows an empty frame; make them load fast and make sure the card is visible when the animation runs.
Type: bug
Tier: M
Pipeline: architect-a architect-b tester-a implementer-a implementer-b tester-b preview-a preview-b docs-sync architect-b:final-review
Overrides: implementer-a=claude-sonnet-5-5 implementer-b=claude-sonnet-5-5 tester-a=claude-sonnet-5-5 tester-b=claude-sonnet-5-5 preview-a=claude-sonnet-5-5 preview-b=claude-sonnet-5-5 docs-sync=claude-sonnet-5-5
Phases: 1

<!-- The Pipeline and Overrides lines are read by scripts/claude-swarm-runner.sh. Keep their format. -->

## Why this tier
- Measured (coordinator, 2026-10-21): `public/sprites/cards/*-card.png` are ~455-478 KB each (6.6 MB for 30 files); `public/sprites/icons-generated/*.png` ~1.1 MB for 52. Pillow WebP (method 6) of war-chief-card: 44 KB at q80, 67 KB at q90; icons ~5-6 KB (from ~23-26 KB).
- `src/modules/cards/components/CardFace/CardFace.tsx` and the card icon in `src/modules/hud/components/GameLog/GameLog.tsx` use `next/image` without `unoptimized`, so each first request goes through the `/_next/image` optimizer resizing the full PNG; default lazy loading. `src/modules/shared/registry-icon.tsx` already uses `unoptimized`.
- `useCardPlayTrigger` / `useCardPlay` (`src/modules/cards/components/CardPlayOverlay/CardPlayOverlay.hook.ts`) start the play immediately; the 1100 ms animation runs while the card image is still loading.
- Paths are referenced by `src/modules/cards/card-art.ts` (`artFor`), `src/modules/icons/icon-registry.config.json` (52 `/sprites/icons-generated/*.png`), the generators `scripts/art/generate-card-art.py` / `generate-registry-icons.py` / `art_pipeline.py`, tests and docs: format change touches several modules → M. Bug: the reproduction (play starts before the art is ready) should be a failing test first.

## Scope
- In: WebP conversion of card art and generated icons (generators emit WebP; old PNGs removed; every reference updated); serve these pre-sized assets without the optimizer; overlay/card eager loading; wait for the card image to be decoded (with a short fallback timeout) before a play starts; tests; previews re-verified; docs where the asset format or play start is described.
- Out: other sprites (tiny-swords, monsters, decorations, user override uploads), the icon editor upload format, overlay visuals.

## Open questions
- none
