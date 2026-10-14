# UI design: Resource-gain animations (HUD + island tile)

## Spec (ui-designer-a)

### Purpose and user story
As a player, I want a brief visual pulse where a resource gain happened — under my HUD count and, when the gain came from a tile, on that tile — so I notice the gain without reading the log or waiting for the toast to parse.

### Source data and a hard constraint found in the reducers (read this before the layout)
Verified in code, not all resource gains have a tile:
- `src/modules/game-rules/player-turn.reducer.ts:13-41` `applyAutomaticCollection` — per positioned army, per occupied tile. Tile known (`pos.x`, `pos.y`).
- `src/modules/game-rules/turn-start-passives.reducer.ts:48-73` `applyCollectorAbility` — per occupied Resource island, all resource types on it. Tile known (`tile.id`).
- `src/modules/game-rules/card-targeted-effects.reducer.ts:76-83` (doubled resource spot) — tile known.
- `src/modules/game-rules/card-effects.reducer.ts:32-45` `handleGainWealth` (Wealthy card) and `card-targeted-effects.reducer.ts:61-78` (Steal) — **no tile at all**, a flat `player.resources[type] += amount`.

So: **HUD animation fires for every gain. Map-tile animation fires only for gains that named a tile** (auto-collection, Collector passive, doubled-spot cards). Wealthy/Steal show HUD-only — there is no tile to point at, and the architects should not invent one. This is a design constraint, not a trigger mechanism — the detection design is architect-a's job (triage already points them at `src/modules/game-board/resource-collection-feedback.hook.ts` and its log diffing).

Also note from `turn-start-passives.reducer.ts:56-67`: Collector can gain 2 resource types from one island tick (one log entry, two `resourcesCollected` keys). Each type gets its own HUD chip animation and its own map overlay (on that type's node(s) on that island) — not one combined effect.

### Placement and layout

**HUD (desktop 1280×720 and mobile 390×844 — same component, it already collapses with the sidebar):**
- Anchor: the matching resource chip in `src/modules/hud/components/PlayerInfo/PlayerInfoStats.tsx:86-100` (`styles.resourceChip`, `data-testid="player-info-resource-${type}"`), one of 3 chips in `styles.resourcesGrid` (`grid-cols-3`).
- The animation renders centered under that one chip, not the whole row — only the gaining type pulses. Example: Gold increases → only the Gold chip (icon `ResourceIcon type="gold"`, `src/modules/shared/resource-icon.tsx`) gets the effect; Food and Wood chips stay static.
- It overlays, it does not push layout: `resourcesGrid` keeps its height, so the three chips never shift position when one animates (reposition is jarring mid-turn and breaks `statsGrid`/`resourcesGrid` alignment above it).
- Only the local player's own `PlayerInfo` card needs this per the triage scope ("the player's resource counts"); other players' cards are out of scope for phase 1 unless architect-a decides the same mechanism is free to extend to all 2–4 `PlayerInfo` cards. Note it as an open question in the Final spec rather than deciding it here.

**Map tile (desktop and mobile, `src/modules/map/components/TileResources/TileResources.tsx:29-78`):**
- Anchor: the specific resource node(s) of the gaining type on the gaining island (`ResourceNodeViewModel`, keyed `resource-node-${type}-${idx}` at `TileResources.tsx:34-37`). If an island has two nodes of the same type (`DUAL_RESOURCE_SLOTS` etc., `TileResources.map.ts:95-134`), both animate — they are both part of the one gain.
- The animation overlays the node's existing sprite (`styles.resourceSprite`, `TileResources.styles.ts:3`) at the node's own `nodeSize`/`slotStyle` position — it does not add a new slot or move the sprite.
- Z-order: node content already sits in `styles.container` at `z-[28]`, collector badge at `z-[35]` (`TileResources.styles.ts:2,6`). The gain overlay must sit above the resource sprite but below/even with the collector badge, since a farming army icon is the more important read: `z-[32]` sits between the two and keeps both legible — this is the only new numeric token this spec introduces.
- Mobile: the whole 5×6 map grid stays visible already (`MapGrid.tsx`); this overlay adds no new chrome, it renders inside the existing tile footprint, so there is nothing to collapse. No mobile-specific variant needed beyond what `TileResourcesView`'s `showFarmingCollector` already hides at small sizes (the collector badge, not this overlay).

### States

| State | What the player sees | Trigger |
|---|---|---|
| Idle (HUD) | Plain resource chip, no overlay | Default |
| Idle (tile) | Plain resource node sprite, no overlay | Default |
| HUD gain | The GIF (`gold_gain.gif` / `wood_gain.gif` / `food_gain.gif`, `public/sprites/`) plays once, centered under the one chip that changed, then disappears leaving the plain chip with its new number already updated | That resource's log entry names this player (any of the four reducer paths above) |
| Tile gain | The same GIF plays once, overlaid on the gaining node(s) on the gaining island, then disappears leaving the plain sprite | The log entry names a tile (all paths except Wealthy/Steal) |
| HUD-only gain (no tile) | Only the HUD chip animates; no map overlay anywhere | Wealthy or Steal card effect |
| Multiple simultaneous gains | Each gaining chip/node animates independently and concurrently (e.g. Collector ability granting Food + Wood in one tick: both HUD chips and both islands' matching nodes animate at once) | Collector passive, or two reducers firing resource gains in the same state update |
| Overlapping gains before the first finishes | A new gain of the *same* type on the *same* chip/node while its animation is still playing restarts the animation from frame 1 rather than queueing or stacking two copies | Two gains of one type land within the ~0.8 s window (rare, but default-first implementer path must not crash or double-render) |
| Reduced motion | The animated GIF is replaced by a brief, no-motion tell: the resource chip/node gets a one-off `ring-2 ring-accent` flash (CSS transition, not an animated image) for the same ~0.8 s, then clears. No GIF frames play. | OS/browser `prefers-reduced-motion: reduce` |

### Components and tokens
- Reuse: `next/image` with `unoptimized` (already the pattern for every sprite in `TileResources.tsx:50-56,65-71` and `ResourceIcon`, `src/modules/shared/resource-icon.tsx:15-22`) to render the three new GIFs. No new asset-loading pattern.
- Reuse: `ResourceIcon` (`src/modules/shared/resource-icon.tsx`) stays as-is in the static chip; the GIF is an added overlay layer, not a replacement icon.
- New files only: the three GIFs already exist at `public/sprites/gold_gain.gif`, `public/sprites/wood_gain.gif`, `public/sprites/food_gain.gif` (verified: GIF89a, 256×256, 7 frames, ~820 ms per loop at loop=0/infinite — the view layer must unmount the `<Image>` after one loop, it will not stop on its own).
- Tokens: `ring-accent` (existing accent token, `src/app/globals.css` `.dark --accent: 45 100% 55%`, gold) for the reduced-motion flash — no raw hex. No other new color token. The one new numeric token is the z-index `z-[32]` on the map overlay, placed between the existing `z-[28]` (`TileResources.styles.ts:2`) and `z-[35]` (`TileResources.styles.ts:6`).
- This is the one new visual pattern this feature introduces (transient gain overlay, GIF-based with a static reduced-motion fallback) — everything else reuses existing primitives/components per the ui-design skill's one-new-pattern budget.

### Copy
No new text strings. The feature is purely visual (icon/GIF + existing numeric chip value, which already updates). The existing toast from `resource-collection-feedback.hook.ts` (`toCollectionToastContent`, "Collected N Food, M Gold.") keeps running unchanged alongside this — triage scope explicitly keeps both.

### Interactions and motion
- No click/keyboard interaction: this is a passive, non-blocking feedback layer (`pointer-events-none`, matching `TileResources.styles.ts:2`'s existing container).
- Motion: GIF plays exactly one loop (~820 ms, measured: frame durations 160 ms + 6×110 ms) then the overlay unmounts. No fade-in/fade-out is specified beyond the GIF's own frames — keep it simple, let the asset carry the motion.
- `prefers-reduced-motion: reduce`: swap to the static ring-flash state above (`motion-reduce:` variant pattern already used at `ConnectionWarningDialog.styles.ts:8,17,27` and `LobbyBackground.styles.ts:17-31` — `motion-reduce:animate-none` plus a non-animated alternative, not just "animate-none" with nothing to replace it, since a silent gain with zero feedback would fail the triage's "notice the gain" goal).

### Accessibility
- The overlay is decorative reinforcement of a state change the chip's number and the existing toast already announce in text — `aria-hidden` on the GIF `<Image>` (alt="" ), no new `aria-live` region needed; the toast (already in the DOM via `use-toast`) remains the accessible announcement channel.
- Contrast: not applicable, no new text.
- Touch targets: not applicable, the overlay is not interactive.
- Reduced motion: covered above — this is the accessibility-relevant state, not optional polish.

### Acceptance criteria
- [ ] When the local player's Gold count increases from an auto-collection, play-collector, or doubled-resource-card log entry, the Gold chip in `PlayerInfoStats` shows the `gold_gain.gif` overlay once (~0.8 s) and no other chip animates.
- [ ] When that same log entry names a tile, the matching Gold node(s) on that island's `TileResources` show the same GIF overlay once, positioned on the node, not covering the whole tile.
- [ ] When the gain comes from Wealthy or Steal (card-effects/card-targeted-effects with no tile), only the HUD chip animates; no map tile shows an overlay anywhere on the board.
- [ ] A Collector-ability tick granting two resource types in one log entry animates both HUD chips and both islands' nodes concurrently, each independently.
- [ ] With `prefers-reduced-motion: reduce` set, no GIF frame renders anywhere; the gaining chip/node instead shows a ~0.8 s `ring-2 ring-accent` flash and clears.
- [ ] The three chips in `resourcesGrid` never change position or size while one of them animates (grid stays `grid-cols-3`, fixed height).
- [ ] The map overlay sits visually above the resource sprite and does not hide the farming-collector badge when both are present on the same node.
- [ ] After a GIF's single loop (~0.8 s), the overlay is gone from the DOM (not just visually faded) in both HUD and tile locations.

## Review (ui-designer-b)
VERDICT: APPROVED (with one correction folded into Final spec below)

Verified against code:
- `PlayerInfoStats.tsx:85-101` matches spec: `resourcesGrid` → `resourceChip` → `data-testid="player-info-resource-${type}"`, no per-chip transform today, `ResourceIcon` as cited.
- `TileResources.tsx:33,37,49-57` + `TileResources.styles.ts:2,6`: `container` z-[28], `collectorOverlay` z-[35] confirmed exact. `resourceSprite` has no explicit z (auto), so a new sibling at z-[32] inside `nodeSlot` layers correctly between sprite and badge — buildable with the same pattern as `collectorOverlay`.
- `TileResources.map.ts:134`: node key is `resource-node-${node.type}-${idx}` — matches spec's claim (spec cites `TileResources.tsx:34-37`, off by file but the keying claim itself is correct).
- Three GIFs verified on disk: GIF89a, 256×256, 7 frames each (`gold_gain.gif` 9965 B, `wood_gain.gif` 8294 B, `food_gain.gif` 11346 B) — matches spec's asset claims exactly.
- `--accent: 45 100% 55%` confirmed at `globals.css:59` (dark theme) — matches spec's reduced-motion token.
- `motion-reduce:animate-none` pattern confirmed at `ConnectionWarningDialog.styles.ts:8,17,27` — matches spec's cited precedent.

One factual gap, worth fixing before architect-a scopes detection, but not a redesign — folded into the Final spec rather than sent back:
- `src/lib/types/game.ts:39-41`: `resourcesCollected` is documented as "Set only on the two collection log entries (automatic + Productive-card)" and no `StructuredLogEntry` field carries a tile/island id anywhere. Checked all four reducer call sites: `player-turn.reducer.ts:37` and `card-effects.reducer.ts:95` (Productive/doubled-spot) do set `resourcesCollected`; `turn-start-passives.reducer.ts` (Collector, ~line 68-73) pushes a log entry with only `message`/`isPassive`, no `resourcesCollected` field at all; `card-targeted-effects.reducer.ts` (Wealthy `handleGainWealth`, Steal `handleStealResource`) push log entries with only `message`/`playerId`/`targetPlayerId`, no `resourcesCollected` either. So today, 2 of the 4 "HUD fires for every gain" paths (Collector, Wealthy, Steal — i.e. 3 of 4) aren't detectable via the existing log-diff mechanism at all, and none of the 4 carry a tile/island id in the log. The spec's states table (lines 35-44) phrases triggers as settled fact ("the log entry names a tile," "names this player [any of the four reducer paths]") when this is actually unverified for 3 of 4 paths and never true for tile/island today.
  - Fix folded into Final spec: reword the trigger column to state the requirement, not an existing fact, and flag the gap explicitly for architect-a, who already owns the detection-mechanism design per triage. This doesn't change the visual design, states, placement, or acceptance criteria — only the framing of where the trigger data comes from.
  - Also flag a secondary scope risk for architect-a: if the fix is "add `resourcesCollected`/tile-id to the three reducers that lack it," that's a small, additive, backward-compatible change to `StructuredLogEntry`'s optional fields, not a rules/amount change — but triage's Out-of-scope line says "no `GameState`/Firestore shape change." Architect-a should confirm this distinction (additive optional log metadata vs. a shape change) explicitly rather than hit it mid-build.

Small, folded-in decision (was left as an open question in the draft, per spec's own invitation to resolve it here if it's small):
- "Only the local player's own `PlayerInfo` card" is decided as final scope for this feature, not an open question for architect-a. Triage's request text is first-person ("the player's resource counts") and the draft itself frames extending to all 2–4 cards as a nice-to-have, not a requirement. Deferring it would just cost a round-trip for a decision the spec already leans one way on.

Everything else checked clean: states table covers idle/gain/no-tile/concurrent/overlap/reduced-motion; no new color or layout token beyond the one declared z-index; mobile needs no variant (grid already fully visible, overlay adds no chrome); `aria-hidden`/`alt=""` on a decorative GIF plus the existing toast as the accessible channel is correct — no new live region needed since nothing new is announced that the toast doesn't already cover; acceptance criteria are each observable via DOM assertions (class/data-testid presence, absence after ~820 ms with fake timers) or a screenshot, no criterion requires something unmeasurable.

## Final spec

### Purpose and user story
As a player, I want a brief visual pulse where a resource gain happened — under my HUD count and, when the gain came from a tile, on that tile — so I notice the gain without reading the log or waiting for the toast to parse.

### Source data and a hard constraint found in the reducers
Verified in code:
- `src/modules/game-rules/player-turn.reducer.ts:21,37` `applyAutomaticCollection` — per positioned army, per occupied tile. Tile known during reducer execution (`pos.x`, `pos.y`); log entry already carries `resourcesCollected`.
- `src/modules/game-rules/turn-start-passives.reducer.ts:48-73` `applyCollectorAbility` — per occupied Resource island, all resource types on it. Tile known during reducer execution (`tile.id`); **today's log entry does not carry `resourcesCollected` or a tile id** — architect-a must decide whether to add it (small additive optional field, not a rule/amount change) or derive the gain a different way.
- `src/modules/game-rules/card-effects.reducer.ts:81-96` `handleUseProductiveCard` (doubled resource spot) — tile known during reducer execution; log entry already carries `resourcesCollected`.
- `src/modules/game-rules/card-targeted-effects.reducer.ts:32-78` `handleGainWealth` (Wealthy) and `handleStealResource` (Steal) — **no tile at all, and today's log entry carries neither `resourcesCollected` nor a tile id** — architect-a must decide how these are detected.

So: **HUD animation fires for every gain that the detection mechanism can observe. Map-tile animation fires only for gains that named a tile** (auto-collection, Collector passive, doubled-spot cards). Wealthy/Steal show HUD-only — there is no tile to point at, and the architects should not invent one. The detection design, including whether/how to extend `StructuredLogEntry` so Collector/Wealthy/Steal become observable, is architect-a's job (triage already points them at `src/modules/game-board/resource-collection-feedback.hook.ts` and its log diffing as a starting point, not a given).

Also note from `turn-start-passives.reducer.ts:56-67`: Collector can gain 2 resource types from one island tick (one log entry, two `resourcesCollected` keys once that field exists for this path). Each type gets its own HUD chip animation and its own map overlay (on that type's node(s) on that island) — not one combined effect.

### Placement and layout

**HUD (desktop 1280×720 and mobile 390×844 — same component, it already collapses with the sidebar):**
- Anchor: the matching resource chip in `src/modules/hud/components/PlayerInfo/PlayerInfoStats.tsx:86-100` (`styles.resourceChip`, `data-testid="player-info-resource-${type}"`), one of 3 chips in `styles.resourcesGrid` (`grid-cols-3`).
- The animation renders centered under that one chip, not the whole row — only the gaining type pulses. Example: Gold increases → only the Gold chip (icon `ResourceIcon type="gold"`, `src/modules/shared/resource-icon.tsx`) gets the effect; Food and Wood chips stay static.
- It overlays, it does not push layout: `resourcesGrid` keeps its height, so the three chips never shift position when one animates (reposition is jarring mid-turn and breaks `statsGrid`/`resourcesGrid` alignment above it).
- Scope: **only the local player's own `PlayerInfo` card** gets this feature. Extending the same mechanism to other players' cards is explicitly out of scope for this feature, not an open question — matches triage's first-person framing ("the player's resource counts").

**Map tile (desktop and mobile, `src/modules/map/components/TileResources/TileResources.tsx:29-78`):**
- Anchor: the specific resource node(s) of the gaining type on the gaining island (`ResourceNodeViewModel`, keyed `resource-node-${type}-${idx}`, `TileResources.map.ts:134`). If an island has two nodes of the same type (`DUAL_RESOURCE_SLOTS` etc., `TileResources.map.ts:95-134`), both animate — they are both part of the one gain.
- The animation overlays the node's existing sprite (`styles.resourceSprite`, `TileResources.styles.ts:3`) at the node's own `nodeSize`/`slotStyle` position — it does not add a new slot or move the sprite.
- Z-order: node content already sits in `styles.container` at `z-[28]`, collector badge at `z-[35]` (`TileResources.styles.ts:2,6`). The gain overlay must sit above the resource sprite but below/even with the collector badge, since a farming army icon is the more important read: `z-[32]` sits between the two and keeps both legible — this is the only new numeric token this spec introduces.
- Mobile: the whole 5×6 map grid stays visible already (`MapGrid.tsx`); this overlay adds no new chrome, it renders inside the existing tile footprint, so there is nothing to collapse. No mobile-specific variant needed beyond what `TileResourcesView`'s `showFarmingCollector` already hides at small sizes (the collector badge, not this overlay).

### States

| State | What the player sees | Trigger (data source is architect-a's detection-mechanism design) |
|---|---|---|
| Idle (HUD) | Plain resource chip, no overlay | Default |
| Idle (tile) | Plain resource node sprite, no overlay | Default |
| HUD gain | The GIF (`gold_gain.gif` / `wood_gain.gif` / `food_gain.gif`, `public/sprites/`) plays once, centered under the one chip that changed, then disappears leaving the plain chip with its new number already updated | A gain of this type lands for this player, by whichever of the four reducer paths the detection mechanism can observe |
| Tile gain | The same GIF plays once, overlaid on the gaining node(s) on the gaining island, then disappears leaving the plain sprite | The detection mechanism resolves a tile/island for this gain (auto-collection, Collector passive, doubled-spot cards) |
| HUD-only gain (no tile) | Only the HUD chip animates; no map overlay anywhere | Wealthy or Steal card effect (no tile exists for these) |
| Multiple simultaneous gains | Each gaining chip/node animates independently and concurrently (e.g. Collector ability granting Food + Wood in one tick: both HUD chips and both islands' matching nodes animate at once) | Collector passive, or two reducers firing resource gains in the same state update |
| Overlapping gains before the first finishes | A new gain of the *same* type on the *same* chip/node while its animation is still playing restarts the animation from frame 1 rather than queueing or stacking two copies | Two gains of one type land within the ~0.8 s window (rare, but default-first implementer path must not crash or double-render) |
| Reduced motion | The animated GIF is replaced by a brief, no-motion tell: the resource chip/node gets a one-off `ring-2 ring-accent` flash (CSS transition, not an animated image) for the same ~0.8 s, then clears. No GIF frames play. | OS/browser `prefers-reduced-motion: reduce` |

### Components and tokens
- Reuse: `next/image` with `unoptimized` (already the pattern for every sprite in `TileResources.tsx:50-56,65-71` and `ResourceIcon`, `src/modules/shared/resource-icon.tsx:15-22`) to render the three new GIFs. No new asset-loading pattern.
- Reuse: `ResourceIcon` (`src/modules/shared/resource-icon.tsx`) stays as-is in the static chip; the GIF is an added overlay layer, not a replacement icon.
- New files only: the three GIFs already exist at `public/sprites/gold_gain.gif`, `public/sprites/wood_gain.gif`, `public/sprites/food_gain.gif` (verified this session: GIF89a, 256×256, 7 frames each, ~820 ms per loop at loop=0/infinite — the view layer must unmount the `<Image>` after one loop, it will not stop on its own).
- Tokens: `ring-accent` (existing accent token, `src/app/globals.css:59` `.dark --accent: 45 100% 55%`, gold) for the reduced-motion flash — no raw hex. No other new color token. The one new numeric token is the z-index `z-[32]` on the map overlay, placed between the existing `z-[28]` (`TileResources.styles.ts:2`) and `z-[35]` (`TileResources.styles.ts:6`).
- This is the one new visual pattern this feature introduces (transient gain overlay, GIF-based with a static reduced-motion fallback) — everything else reuses existing primitives/components per the ui-design skill's one-new-pattern budget.

### Copy
No new text strings. The feature is purely visual (icon/GIF + existing numeric chip value, which already updates). The existing toast from `resource-collection-feedback.hook.ts` (`toCollectionToastContent`, "Collected N Food, M Gold.") keeps running unchanged alongside this — triage scope explicitly keeps both.

### Interactions and motion
- No click/keyboard interaction: this is a passive, non-blocking feedback layer (`pointer-events-none`, matching `TileResources.styles.ts:2`'s existing container).
- Motion: GIF plays exactly one loop (~820 ms, measured: frame durations 160 ms + 6×110 ms) then the overlay unmounts. No fade-in/fade-out is specified beyond the GIF's own frames — keep it simple, let the asset carry the motion.
- `prefers-reduced-motion: reduce`: swap to the static ring-flash state above (`motion-reduce:` variant pattern already used at `ConnectionWarningDialog.styles.ts:8,17,27` and `LobbyBackground.styles.ts:17-31` — `motion-reduce:animate-none` plus a non-animated alternative, not just "animate-none" with nothing to replace it, since a silent gain with zero feedback would fail the triage's "notice the gain" goal).

### Accessibility
- The overlay is decorative reinforcement of a state change the chip's number and the existing toast already announce in text — `aria-hidden` on the GIF `<Image>` (alt=""), no new `aria-live` region needed; the toast (already in the DOM via `use-toast`) remains the accessible announcement channel.
- Contrast: not applicable, no new text.
- Touch targets: not applicable, the overlay is not interactive.
- Reduced motion: covered above — this is the accessibility-relevant state, not optional polish.

### Acceptance criteria
- [ ] When the local player's Gold count increases from an auto-collection or doubled-resource-card log entry (today's two detectable paths), the Gold chip in `PlayerInfoStats` shows the `gold_gain.gif` overlay once (~0.8 s) and no other chip animates.
- [ ] When that same log entry names a tile, the matching Gold node(s) on that island's `TileResources` show the same GIF overlay once, positioned on the node, not covering the whole tile.
- [ ] Once architect-a's detection mechanism also covers Collector/Wealthy/Steal: a Wealthy or Steal gain animates only the HUD chip, no map tile shows an overlay anywhere on the board, and a Collector-ability tick granting two resource types in one update animates both HUD chips and both islands' nodes concurrently, each independently.
- [ ] With `prefers-reduced-motion: reduce` set, no GIF frame renders anywhere; the gaining chip/node instead shows a ~0.8 s `ring-2 ring-accent` flash and clears.
- [ ] The three chips in `resourcesGrid` never change position or size while one of them animates (grid stays `grid-cols-3`, fixed height).
- [ ] The map overlay sits visually above the resource sprite and does not hide the farming-collector badge when both are present on the same node.
- [ ] After a GIF's single loop (~0.8 s), the overlay is gone from the DOM (not just visually faded) in both HUD and tile locations.
