# Plan: Faster card and icon image loading; card visible when the play animation runs

Status: APPROVED
Inputs: triage.md

## Goal and acceptance criteria
- [ ] All 30 files in `public/sprites/cards/` and all 52 in `public/sprites/icons-generated/` are `.webp` (cards q90); the PNGs are deleted from git.
- [ ] `CARD_ART` / `ABILITY_ART` paths and the 52 registry `src` values point at the `.webp` files; every path exists on disk.
- [ ] `CardFace` and the GameLog card icon load the file directly (`unoptimized`), no `/_next/image` hop. `CardFace` is `loading="eager"`.
- [ ] `useCardPlayTrigger` does not call `startPlay` for a queued play until the card image is loaded (or 1500 ms passed, or it errored).
- [ ] Both generators write `.webp`.
- [ ] Docs match: asset format and play start.
- [ ] `npm run typecheck`, `npm run lint`, `npm test` pass; overlay checked in the browser.

## Verified context
| Symbol or file | Location | Why it matters |
|---|---|---|
| `artFor(slug)` builds `${ART_DIR}/${slug}-icon.png` and `-card.png` | `src/modules/cards/card-art.ts:13-15` | only producer of card paths; extension change here |
| `CardFace` uses `next/image` w/o `unoptimized` | `src/modules/cards/components/CardFace/CardFace.tsx:25-32` | optimizer hop + lazy load |
| `useCardFace(cardName)` returns `{ src, hasFailed, onError }` | `.../CardFace/CardFace.hook.ts:8-13` | unchanged |
| GameLog card icon `<Image src={entry.cardIconSrc} width/height 20>` | `src/modules/hud/components/GameLog/GameLog.tsx:33-41` | add `unoptimized` |
| `RegistryIconGlyph` already `unoptimized` | `src/modules/shared/registry-icon.tsx:35-42` | registry icons need only the path change |
| `useCardPlayTrigger` start effect | `.../CardPlayOverlay/CardPlayOverlay.hook.ts:80-86` | `startPlay(next.cardName, next.isFound); setQueue(slice(1))` runs at once: the bug |
| `useCardPlay.startPlay(cardName, isFound?)` | same file `:15-31` | unchanged |
| `CardPlayOverlayView` renders `<CardFace size hero>` inside `key={play.playId}` stage | `.../CardPlayOverlay/CardPlayOverlay.tsx:21-30` | animation starts on mount of this stage |
| Existing trigger tests are synchronous | `.../CardPlayOverlay.hook.test.ts:161-` (`describe('useCardPlayTrigger')`, `setup()` at :168) | break once the start is async; tester-a updates |
| `card-art.test.ts` checks files exist on disk | `src/modules/cards/card-art.test.ts:8-11` | covers the rename; add extension check |
| `CardFace.test.tsx` asserts `src` contains `war-chief-card` / `scout-card` | `.../CardFace/CardFace.test.tsx:12,44,54` | still valid, no change |
| Registry icons: 52 `"src": "/sprites/icons-generated/<id>.png"` | `src/modules/icons/icon-registry.config.json` | no other source references `icons-generated`; `icon-overrides.config.json` has 0 (and is user-modified: do not touch) |
| Generators save PNG | `scripts/art/generate-card-art.py:77` (`.save(OUT_DIR / f"{slug}-{variant}.png")`), `scripts/art/generate-registry-icons.py:105` | emit WebP |
| Raw/style-ref saves are PNG | `scripts/art/art_pipeline.py:93` (`sheet.save(out)`) | leave: not shipped assets |
| Docs mention paths | `docs/architecture/special-cards.md` (Card Art bullet, Card-Play Animation bullet), `docs/architecture/systems-and-visuals.md:206` (Icon registry) | docs-sync |
| Grep of old paths across `src e2e scripts docs .claude CLAUDE.md eslint.config.mjs package.json` | done | hits only in files listed in File plan; e2e, `.claude`, CLAUDE.md, eslint: none. Excluded: `docs/ai/tasks/*` history |
| Pillow WebP available | coordinator check | q90 card ~67 KB |

## Root cause
- Reproduction (failing test first): hook test with a `preloadCardArt` mock returning a pending promise; push a local card-use log entry; `play` must stay `null` until the promise resolves. Today `play` is set immediately.
- Cause 1: `CardPlayOverlay.hook.ts:80-86` starts the 1100 ms play with no regard to image readiness. `CardFace` then mounts its `<Image>` and the browser starts fetching a ~470 KB PNG through `/_next/image`, lazy, so the card is blank for part of the animation.
- Cause 2: assets are huge (cards ~460 KB PNG, icons ~23 KB) and cards/log icons go through the optimizer.

## Decisions
- WebP q90 for cards, q90 for icons, method 6, alpha kept, because measured 67 KB per card and ~5 KB per icon with clean painterly look. Rejected: lossless WebP (large), AVIF (slower encode, no gain needed), q80 (visible banding risk in painterly art).
- `unoptimized` on card and log images because files are already 400x600 / 128x128; the optimizer only adds a round trip. Rejected: tuning `images.formats` in `next.config.ts` (still a server hop).
- Gate the play start in `useCardPlayTrigger` with a new `preloadCardArt(cardName)` helper (browser `Image` + `decode`, 1500 ms fallback, never rejects). Rejected: waiting inside `CardFace` (animation timer lives in the overlay hook; would need prop plumbing); preloading the whole deck at startup (more bytes on first load, still no guarantee).
- Helper in new plain file `src/modules/cards/card-preload.ts` (uses `window.Image`, so not a `.map.ts`; not Firestore, so not a `.service.ts`). Not exported from `index.ts`: used only inside the module.
- Cancel-and-retry inside one effect: effect cleanup sets `cancelled`; a re-run (blocked flips, queue grows) calls `preloadCardArt` again, which is instant from cache. No extra state.
- Conversion by script `scripts/art/convert-to-webp.py`, run once by implementer-a, then deleted (raw sources are not in the repo, so generators cannot recreate the files; after the run the script has no further use). Old PNGs removed with `git rm`.
- Not touched: tiny-swords, monsters, decorations, upload formats, overlay visuals, `next.config.ts`.

## File plan
| File | New / Edit | Responsibility | Owner |
|---|---|---|---|
| `scripts/art/art_pipeline.py` | edit | add `WEBP_QUALITY = 90` and `save_webp(image, path)` (RGBA, `method=6`) | implementer-a |
| `scripts/art/generate-card-art.py` | edit | import `save_webp`; save `.webp`; fix docstring line 7 | implementer-a |
| `scripts/art/generate-registry-icons.py` | edit | same; docstring line 7 `.webp` | implementer-a |
| `scripts/art/convert-to-webp.py` | new then deleted | one-off: PNG to WebP for the two dirs | implementer-a |
| `public/sprites/cards/*.png` (30) | delete | replaced by `.webp` | implementer-a |
| `public/sprites/cards/*.webp` (30) | new | converted art | implementer-a |
| `public/sprites/icons-generated/*.png` (52) | delete | replaced | implementer-a |
| `public/sprites/icons-generated/*.webp` (52) | new | converted art | implementer-a |
| `src/modules/cards/card-art.ts` | edit | `.png` to `.webp` in `artFor` | implementer-a |
| `src/modules/icons/icon-registry.config.json` | edit | 52 `src` values `.png` to `.webp` (sed on `icons-generated/*.png` only) | implementer-a |
| `src/modules/cards/card-preload.ts` | new | `preloadCardArt` | implementer-a |
| `src/modules/cards/components/CardPlayOverlay/CardPlayOverlay.hook.ts` | edit | gate start on preload | implementer-a |
| `src/modules/cards/components/CardFace/CardFace.tsx` | edit | `unoptimized`, `loading="eager"` | implementer-b |
| `src/modules/hud/components/GameLog/GameLog.tsx` | edit | `unoptimized` on card icon `<Image>` | implementer-b |
| `src/modules/cards/card-art.test.ts` | edit | add `.webp` extension case | tester-a |
| `src/modules/cards/card-preload.test.ts` | new | helper tests | tester-a |
| `src/modules/cards/components/CardPlayOverlay/CardPlayOverlay.hook.test.ts` | edit | mock preload, async flush, new gating cases | tester-a |
| `src/modules/cards/components/CardFace/CardFace.test.tsx` | edit | assert `src` is the direct `.webp` path (no `/_next/image`) | tester-b |
| `src/modules/hud/components/GameLog/GameLog.test.tsx` | edit | in 'card icons' (:197-206) add: log icon `src` contains `.webp` and not `_next/image` | tester-b |
| `docs/architecture/special-cards.md` | edit | Card Art bullet: `.webp`; Card-Play bullet: play waits for image | docs-sync |
| `docs/architecture/systems-and-visuals.md` | edit | line 206 only if it names the icon format | docs-sync |

CLAUDE.md edits: none needed. Previews: none new; `CardFace.preview.tsx`, `CardPlayOverlay.preview.tsx` and the `CardPlaySandbox` testbed are re-verified (preview-a/b, no file edits expected).

## Contracts
```ts
// src/modules/cards/card-preload.ts  (new)
import type { CardName } from '@/lib/types';

/** Longest wait for a card image before the play starts anyway. */
export const CARD_PRELOAD_TIMEOUT_MS = 1500;

/**
 * Resolves when CARD_ART[cardName].card is loaded and decoded, fails to load, or
 * `timeoutMs` has passed. Never rejects. Uses window.Image; calls image.decode()
 * when it exists, else waits for onload. Clears its timer on settle.
 */
export function preloadCardArt(
  cardName: CardName,
  timeoutMs: number = CARD_PRELOAD_TIMEOUT_MS,
): Promise<void>;
```
```ts
// src/modules/cards/card-art.ts: artFor body becomes
return { icon: `${ART_DIR}/${slug}-icon.webp`, card: `${ART_DIR}/${slug}-card.webp` };
```
```ts
// CardPlayOverlay.hook.ts: replace the last effect of useCardPlayTrigger (the start effect) with
useEffect(() => {
  if (isBlocked || play || queue.length === 0) return;
  const next = queue[0];
  let isCancelled = false;
  void preloadCardArt(next.cardName).then(() => {
    if (isCancelled) return;
    startPlay(next.cardName, next.isFound);
    setQueue((current) => current.slice(1));
  });
  return () => {
    isCancelled = true;
  };
}, [queue, isBlocked, play, startPlay]);
// import { preloadCardArt } from '../../card-preload';
// Public signatures of useCardPlay / useCardPlayTrigger / CardPlayTriggerArgs unchanged.
```
```python
# scripts/art/art_pipeline.py (new)
WEBP_QUALITY = 90
def save_webp(image: Image.Image, path: Path) -> None:
    """Shipped art: lossy WebP with alpha. `image` is RGBA."""
    image.convert("RGBA").save(path, "WEBP", quality=WEBP_QUALITY, method=6)
```
```tsx
// CardFace.tsx <Image ...> gains: unoptimized  loading="eager"
// GameLog.tsx card icon <Image ...> gains: unoptimized
```

## Phases
### Phase 1: WebP assets and gated card play
1. Add `WEBP_QUALITY` and `save_webp` to `scripts/art/art_pipeline.py`; in both generators replace `.save(... .png)` with `save_webp(..., ....webp)` and fix the docstrings. Do not touch raw/ref PNG saves. (implementer-a)
2. Write `scripts/art/convert-to-webp.py`: for each `*.png` in `public/sprites/cards` and `public/sprites/icons-generated`, open, `save_webp` to same stem `.webp`, print `name: old KB -> new KB`; keep the PNG. Run it: `python3 scripts/art/convert-to-webp.py`. Check counts 30 and 52, and each card `.webp` < 100 KB. (implementer-a)
3. Open 2 cards and 2 icons as images (Read tool) to confirm transparency and no artifacts. `git rm` the 82 PNGs in those two dirs only; delete `scripts/art/convert-to-webp.py`. (implementer-a)
4. `card-art.ts`: `.png` to `.webp`. `icon-registry.config.json`: `sed -i '' 's#\(/sprites/icons-generated/[a-z0-9-]*\)\.png#\1.webp#'`; verify `grep -c 'icons-generated/.*\.webp'` = 52 and `grep -c 'icons-generated/.*\.png'` = 0, and that no other line changed (`git diff --stat`). (implementer-a)
5. Create `card-preload.ts` per Contracts. (implementer-a, sonnet)
6. Edit the start effect in `CardPlayOverlay.hook.ts` per Contracts. (implementer-a, sonnet)
7. Edit `CardFace.tsx` and `GameLog.tsx` per Contracts. (implementer-b)
8. Tests, written failing-first for the gate (tester-a, sonnet):
   - `card-preload.test.ts`, `CardPlayOverlay.hook.test.ts`, `card-art.test.ts` per Test plan.
   - Then tester-b updates view tests.
9. Previews: load `/testbed` card pages and the CardPlaySandbox; confirm card art shows from frame one, network tab shows `.webp` with no `/_next/image` for cards. (preview-a/b)
10. docs-sync edits docs per File plan.

Model escalation: steps 5, 6, 8 need sonnet (async gating, effect cancellation, fake-timer tests); all builders already run sonnet per triage overrides.

## Test plan
- tester-a (logic, first):
  - `card-art.test.ts`: every `icon` and `card` path ends with `.webp`.
  - `card-preload.test.ts` (stub `window.Image` with a class capturing `src`, `onload`, `onerror`, optional `decode`; fake timers):
    - resolves after `onload` when no `decode`;
    - resolves after `decode()` resolves when `decode` exists;
    - resolves on `onerror`;
    - resolves after 1500 ms when nothing fires (not before 1499);
    - sets `src` to `CARD_ART[card].card`;
    - never rejects when `decode()` rejects.
  - `CardPlayOverlay.hook.test.ts`:
    - add `jest.mock('../../card-preload', () => ({ preloadCardArt: jest.fn(() => Promise.resolve()) }))` and a `flush = () => act(async () => {})`; update every `useCardPlayTrigger` test (lines 161-end) to `await flush()` before asserting a started play. Expectations unchanged.
    - New (the regression): with `preloadCardArt` returning a deferred promise, an appended local entry leaves `play` null; after resolve plus flush `play` equals `{ cardName, playId: 1 }`.
    - New: preload called with the queued card name.
    - New: unblock/blocked flip while preload pending starts exactly one play (cancel then retry), `playId` stays 1.
    - New: unmount while preload pending, then resolve: no state update, no warning.
    - New: two queued cards: second preload only runs after `endPlay`.
- tester-b (view and e2e):
  - `CardFace.test.tsx`: `img` `src` equals `CARD_ART[WarChief].card` exactly (the `next/image` unoptimized output; not containing `_next/image`) and has attribute `loading="eager"`. Check how the test renders `next/image` (real, not mocked at :1-30) before asserting.
  - `GameLog.test.tsx` 'card icons' (:197): existing `toContain('reinforce')` / `'war-chief-icon'` stay valid; add `src` ends with `.webp` and does not contain `_next/image`.
  - No e2e (no e2e hit on these paths).

## Preview states
- `CardFace` preview (existing states): all sizes show art (`.webp`).
- `CardPlayOverlay` preview and `CardPlaySandbox` testbed: play a card; art visible on the first animation frame.
- No new preview files.

## Risks
- Jest `next/image` behavior with `unoptimized`: `src` is passed through unchanged (next 15); tester-b verifies.
- jsdom `Image` never loads: component tests of the gate must mock `card-preload`; the 1500 ms fallback covers any unmocked path (e.g. other tests rendering `GameDialogManager`). tester-a runs the full `npm test` to find them.
- `Image.decode()` can reject for broken files: handled (settles on rejection).
- Transparent-edge halo after lossy WebP: step 3 visual check; if a halo shows, raise quality to 95 in `WEBP_QUALITY` and re-run (report to architect).
- Working tree has unrelated changes (tile-variants, `icon-overrides.config.json`, balance reports, captures): builders stage only files in the File plan.

## Review (architect-b)
VERDICT: APPROVED

- Paths and symbols verified (card-art.ts:14, CardPlayOverlay.hook.ts:84-89, CardFace.tsx image block, GameLog.tsx:32-35, registry-icon.tsx `unoptimized`, 30 card PNGs tracked). Old-path grep over src, e2e, scripts, docs, .claude, CLAUDE.md, eslint, package.json, next.config.ts: only the File-plan files hit; no test, preview or fixture hardcodes a `.png` path (all go through `CARD_ART`).
- Cancel-and-retry effect: correct. `startPlay` and `setQueue(slice(1))` run in one callback, batched, so no double start; `play` flipping non-null re-runs the effect and returns early. Cleanup cancels stale resolves. Note for implementer-a: each re-run restarts the 1500 ms timer, so a queue growing during a pending preload can delay the start beyond 1500 ms in total; acceptable (rare, bounded by the card image arriving from cache on retry).
- 1500 ms fallback: acceptable. It only delays the start on a slow or failing network; after the timeout CardFace shows the art when it arrives or its `layers` placeholder via `onError`. Do not lower it (cards are ~67 KB; 1.5 s covers slow 3G).
- Beneficiaries: `CardsDialog` tiles use `CardFace` (CardsDialog.tsx), so they gain `.webp`, `unoptimized` and eager from the CardFace edit. GameLog icon: covered by step 7. The 52 generated icons render through `RegistryIcon` (already `unoptimized`), so they gain only from smaller WebP via the registry path change; they stay lazy, fine at ~5 KB. Only `icon-registry.config.json` references `icons-generated` (repo-wide grep).
- Risk for preview: the preload warms the browser image cache only if the response is reusable by the later `<img>`; ui-verify should confirm no second network fetch of the card in the overlay.
- Docs: also have docs-sync mention that `CardsDialog` tiles load eagerly (optional).
