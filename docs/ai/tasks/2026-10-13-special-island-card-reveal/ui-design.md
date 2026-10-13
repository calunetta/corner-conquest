# UI design: Special island idle art + card-reveal animation

## Spec (ui-designer-a)

### Purpose and user story
As a player, I want the special island to look like a ruin I can investigate, and to get a clear, satisfying one-shot signal exactly when I (or any player I'm watching) actually receives a card from it, so that card gains read as events on the map, not just as dialog text.

### Placement and layout
Same slot the `Star` icon fills today: `IslandTile`'s center content area, `IslandTile.tsx:66-67` (`getTileCenterContent`, `case IslandType.Special`), inside `styles.centerContent` (`h-full w-full p-1`, `IslandTile.styles.ts:48`). No new layout region, no HUD change — this is a tile-content swap plus an overlay, exactly where `DeathEffect` already overlays `centerContent` for monster/army deaths (`IslandTile.tsx:95-101`).

- **Desktop (1280×720)**: tile is `clamp(94px, 12.5vh, 136px)` square (`MapGrid.tsx:50`). Idle sprite and reveal GIF both render at `object-contain` inside the full tile box (matching `baseImage`'s pattern, `IslandTile.styles.ts:55`), not the fixed `64×64` the `DeathEffect` component hardcodes — a 136px tile at 64px would leave the temple looking small and off-center at the largest breakpoint. See "Components and tokens" for why this means a new sizing class, not reusing `DeathEffect.styles.ts:2` verbatim.
- **Mobile (390×844)**: tile is `clamp(46px, 13.5vw, 68px)` square (`MapGrid.tsx:50`, confirmed live on `/testbed/island-tile?state=Special+island`, screenshot below). Same `object-contain`-in-tile sizing scales down automatically; no mobile-specific layout change. The whole 5×6 map grid already stays visible at this tile size today (`docs/README.md:390`) and this change doesn't touch grid sizing, so that invariant is untouched.
- No new z-index: idle art sits in `centerContent` (`z-20`, same stack position the `Star` icon used); the reveal overlay reuses `DeathEffect`'s wrapper stacking (`absolute inset-0 z-20`, `DeathEffect.styles.ts:2`), i.e. it replaces the idle art in place for its duration rather than stacking on top of it (see States below — idle and reveal are mutually exclusive on a given tile, same as `deathAnimationOnTile` suppresses `renderMonsterIcons`, `IslandTile.tsx:19-23`).

### States
| State | What the player sees | Trigger |
|---|---|---|
| Idle (default) | `special_island_idle.png` (185×173, transparent), `object-contain` inside the tile's `centerContent` box, same footprint the `Star` icon occupied | `island.type === IslandType.Special` and no reveal animation is active for this tile's `x`/`y` (mirrors `deathAnimationOnTile` matching, `IslandTile.hook.ts:28-33`) |
| Revealing (one-shot) | `special_island_reveal.gif` (186×179, transparent, 3 frames, ~1.4s, `loop=1`: flash → card rises → settles with sparkle) replaces the idle art for the animation's duration, then the tile reverts to Idle | A reveal-animation entry exists for this tile and `now - createdAt < REVEAL_ANIMATION_DURATION` — pushed only on (a) first-ever discovery with a card actually drawn (`island-discovery.reducer.ts:60-69`, guarded by the existing `!isScout` and hand-full/deck-empty checks at `:38-76`) or (b) a later roll whose success branch draws a card (`card-acquisition.reducer.ts:118-128`). Not pushed on scout-no-card, roll-no-card (`:136-141`), hand-full (`:97-102`), or empty-deck (`:129-134`) |
| Fogged | Unchanged: `HelpCircle` fog icon, `IslandTile.tsx:39` | `!isTileVisible` — fog takes precedence over both idle and reveal art, same as it already takes precedence over the `Star` today |
| Reduced motion | Idle art only — the reveal GIF is skipped entirely and the tile jumps straight from idle to idle (no flash/rise/sparkle frames shown), rather than playing a static first frame | `prefers-reduced-motion: reduce` (see Interactions and motion) |

No hover/focus/selected variant beyond what `IslandTileView`'s existing `isSelected`/`isPossibleMove`/`isClickable` border styling already provides for every tile type (`IslandTile.styles.ts:5-46`) — this feature doesn't add new interaction affordances, only swaps center content.

### Components and tokens
- Reuse: `DeathEffect`'s exact mechanism — `key`-remount-with-cache-busting-query-param to force the GIF to restart at frame 0, a `setTimeout` sized to the animation's duration that flips visibility back off, and `createdAt`-based elapsed-time math so a client that mounts mid-animation (e.g. a second player's browser, or a reconnect) still shows the remaining portion instead of replaying from the start (`DeathEffect.tsx` all; `DeathEffect.hook.ts` all; `DeathEffect.types.ts` all — paths verified, read this session).
- **One new visual pattern** (triage's one-per-feature budget): `DeathEffect`'s wrapper is hardcoded to `width={64} height={64}` (`DeathEffect.tsx:19-20`) and a fixed `wrapper` class (`DeathEffect.styles.ts:2`) — both are fine for the small monster/army sprites it was built for, but wrong for this tile-filling temple art, which must scale with the tile like `baseImage` does (`object-contain` inside a `fill` wrapper, `IslandTile.tsx:46-57`, `IslandTile.styles.ts:54-55`). Implementer-a's call on exact file structure (new component vs. parameterizing `DeathEffect`), but the rendered result must be `object-contain` filling the tile box, using `next/image`'s `fill` prop instead of fixed `width`/`height` — not a copy of the 64×64 wrapper.
- Reuse: `next/image` with `unoptimized` for both the static PNG and the GIF, matching every other sprite in `IslandTile.tsx` (`Image ... unoptimized`, e.g. `:50-56`, `:112-116`).
- No shadcn primitive involved — this is tile art, not a dialog or control.
- Tokens: no new color tokens. The idle PNG and reveal GIF are pre-rendered art (locked per triage's Scope), so no `text-*`/`bg-*` classes apply to them; only layout/sizing classes (`object-contain`, `absolute inset-0`, etc., mirroring existing sibling classes already in `IslandTile.styles.ts`).

### Copy
None. No text is introduced on the tile. (The `SpecialIslandRollDialog`'s existing copy is out of scope per triage.)

### Interactions and motion
- No new click/keyboard interaction: the tile's existing `onClick` → `handleTileClick` path is unchanged (`IslandTile.tsx:84-91`).
- Motion is the reveal GIF itself (flash → rise → sparkle, ~1.4s, plays once, `loop=1`, baked into the asset — no CSS-driven animation to specify).
- `prefers-reduced-motion: reduce`: skip the GIF outright and keep the idle PNG showing throughout the reveal entry's lifetime (do not substitute a static frame of the GIF, since none is available as a separate asset) — the player still gets the card via the dialog/hand; they just don't get the motion. Precedent: `motion-reduce:` variants are the house pattern (`docs/ai/README.md` visual language, confirmed in skill `ui-design`'s preloaded notes), though no existing animation in `map/components` currently branches on it in code — flag this as new ground for implementer-a, who should use the standard CSS media query or a `window.matchMedia('(prefers-reduced-motion: reduce)')` check (existing codebase convention for this hook, if any, is implementer's to verify) to pick idle-only vs. idle→reveal→idle.
- Timing: new `REVEAL_ANIMATION_DURATION` constant (name mirrors `DEATH_ANIMATION_DURATION`, `DeathEffect.types.ts:7`, value 1200) set to match the asset's actual run time, ~1400ms — exact value is architect/implementer's to confirm against the GIF's real frame timing, not re-measured by this spec.

### Accessibility
- The tile's `aria-label="Island at {x}, {y}"` (`IslandTile.tsx:90`) is unchanged — it already doesn't describe island type in detail, consistent with every other `IslandType` case (Base, Monster, Resource) not getting type-specific label text today. Not introducing an inconsistency here.
- Both `next/image` elements get a non-empty `alt`: `"Special island"` for the idle PNG, `"Card revealed"` for the reveal GIF — mirrors `DeathEffect.tsx:18`'s `alt="Death animation"` pattern (decorative-but-labeled, consistent with the rest of the file: `alt={`${baseOwner.color} base`}` at `:52`, `alt=""` only for the purely decorative border strip at `:114`).
- Color/contrast: not applicable — no text, and the art itself (ruin/temple, flash/card/sparkle) is not a color-coded signal standing in for information; the dialog text remains the source of truth for "you got a card."
- Reduced motion is handled above; no other motion-sensitive concern (no autoplaying sound, no flashing faster than 3 Hz — triage specifies the GIF plays once, ~1.4s across 3 frames, well under any flash-rate concern).

### Acceptance criteria
- [ ] `/testbed/island-tile?state=Special+island` (existing fixture, confirmed live this session) shows `special_island_idle.png`, not the `Star` icon, filling the tile's center content area at both desktop (1280×720, `clamp(94px,12.5vh,136px)` tile) and mobile (390×844, `clamp(46px,13.5vw,68px)` tile) viewports.
- [ ] A new testbed state "Special island, mid-reveal" (or similarly named) shows `special_island_reveal.gif` in place of the idle art, at the same two viewports, with no idle art visible underneath/beside it.
- [ ] A new testbed state "Special island, reveal finished" (animation's `createdAt` older than its duration) shows the idle PNG again, matching the plain idle state.
- [ ] On mobile, the full 5×6 map grid (all four corner bases visible) is unaffected by this change — confirmed by an existing full-board screenshot, not just the isolated tile.
- [ ] Fogged special islands still show the `HelpCircle` fog icon, not the idle or reveal art (regression check on existing "Scout target (fogged)" / fog-covering-special-island behavior).
- [ ] No animation plays, and the tile stays on idle art throughout, in these reducer-level cases once wired: a scout reveal with no card drawn, a roll with no card (not 3/6), a roll blocked by a full hand, and a roll blocked by an empty deck — each confirmed by a reducer/hook test asserting no new entry lands in the reveal-animations array, not by a screenshot.
- [ ] With `prefers-reduced-motion: reduce` simulated (Playwright `page.emulateMedia({ reducedMotion: 'reduce' })` or equivalent), a reveal-triggering state shows only the idle PNG for the entire window the GIF would otherwise have played, with no GIF frame ever rendered.

## Review (ui-designer-b)

Checked every citation this session: `IslandTile.tsx` (full file), `IslandTile.styles.ts` (full file), `DeathEffect.tsx`/`.hook.ts`/`.styles.ts`/`.types.ts` (full files), `IslandTile.hook.ts`, `IslandTile.preview.tsx`/`.preview.shared.tsx`/`.fixtures.ts`, `MapGrid.tsx:50` (path is `src/modules/map/components/MapGrid/MapGrid.tsx`, not `src/features/game/components/MapGrid.tsx` — see finding 1), both sprite files on disk.

Findings:

1. **Path drift, not a spec defect, but flag for implementer-a.** `MapGrid.tsx:50` as cited resolves to `src/modules/map/components/MapGrid/MapGrid.tsx:50` — confirmed the clamp values quoted (`clamp(94px, 12.5vh, 136px)` desktop, `clamp(46px, 13.5vw, 68px)` mobile) match that line exactly. The skill's own "Layout rules" section cites `src/features/game/components/MapGrid.tsx`, which no longer exists (only the worktree copies under `.claude/worktrees/*` do) — that's a stale skill reference, not something ui-design.md should fix. Folding in the correct path below so implementer-a doesn't have to re-derive it.

2. **Reduced-motion precedent exists and should be named, not left open.** The spec says "no existing animation in `map/components` currently branches on it in code" (true) and leaves the hook choice to implementer-a. But `src/modules/lobby/components/LobbyBackground/LobbyBackground.hook.ts:13-16` already does exactly this: `const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'; window.matchMedia(REDUCED_MOTION_QUERY).matches`. Per "reuse before inventing," implementer-a should mirror that hook's query string and `matchMedia` call, not invent a second convention. Folding this citation into the spec below — small fix, no redesign.

3. **Testbed feasibility confirmed.** `IslandTile.preview.shared.tsx:17-31` (`createViewModel`) already defaults `deathAnimationOnTile: undefined` and is overridable via `createViewModelWithState`/`flaggedIslandState` (`:70-73`), exactly the shape the acceptance criteria need for "mid-reveal" and "reveal finished" testbed states (an equivalent `cardRevealAnimationOnTile` override, or whatever field name architect-a lands on, slots into this same pattern with zero new preview infrastructure). No gap.

4. **States table is complete and mutually exclusive.** Idle/Revealing/Fogged/Reduced-motion covers every `IslandType.Special` render path; fog precedence is verified against the real `getTileCenterContent` switch (`IslandTile.tsx:39-74`, fog checked before the `switch`) and matches today's behavior for every other tile type, so no inconsistency introduced. Hover/selected/disabled states are correctly scoped out — they're tile-level, already handled by `styles.tile` cva (`IslandTile.styles.ts:5-46`), and this feature doesn't touch them.

5. **Accessibility: alt text and contrast are fine.** Non-empty, distinct `alt` text on both images follows the file's existing convention (verified against `alt={`${baseOwner.color} base`}` at `IslandTile.tsx:52` and `alt="Death animation"` at `DeathEffect.tsx:18`). No color-only signal. Keyboard path is unchanged (tile's own `onClick`/`aria-label` untouched, `IslandTile.tsx:90`).

6. **Sizing argument holds up.** `DeathEffect.tsx:19-20` is confirmed hardcoded to `width={64} height={64}`; the spec's call for a `fill`+`object-contain` variant instead of reusing that 64px box is correct and is the one new-pattern budget this feature needs — not a second one, since it's explicitly framed as sizing-only, no new motion mechanism.

7. **Assets verified on disk**, matching the spec's stated dimensions exactly: `public/sprites/special_island_idle.png` is 185×173 PNG RGBA; `public/sprites/special_island_reveal.gif` is 186×179 GIF. No mismatch to flag.

8. **Mobile/grid-coverage acceptance criterion is sound.** The whole-grid screenshot check (`docs/README.md:390`'s 5×6 invariant) is the right test since this change only swaps `centerContent`, never touches `MapGrid.styles.ts` grid-template sizing.

No blocking issues. The two items above are small, additive clarifications (a correct path, a named precedent) that remove ambiguity for implementer-a without changing placement, states, or acceptance criteria. Folding both into the spec above rather than sending back.

VERDICT: APPROVED

## Final spec

Spec stands as written above, with these two clarifications folded in (ui-designer-b, this session):

- Every `MapGrid.tsx:50` reference in this document resolves to `src/modules/map/components/MapGrid/MapGrid.tsx:50` (confirmed: `gridTemplateColumns: repeat(${cols}, ${isMobile ? 'clamp(46px, 13.5vw, 68px)' : 'clamp(94px, 12.5vh, 136px)'})`).
- For the reduced-motion check (Interactions and motion section), implementer-a should mirror the existing convention at `src/modules/lobby/components/LobbyBackground/LobbyBackground.hook.ts:13-16` (`const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'; window.matchMedia(REDUCED_MOTION_QUERY).matches`) rather than inventing a second reduced-motion check pattern in the codebase.

Everything else — placement, the four-state table, the one new sizing-only visual pattern, copy (none), accessibility, timing constant naming, and all six acceptance criteria — is approved unchanged and ready for architect-a.
