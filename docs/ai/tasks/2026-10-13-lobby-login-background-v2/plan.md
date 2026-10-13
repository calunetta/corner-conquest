# Plan: Home Islands lobby/login background

Status: APPROVED
Inputs: triage.md (the artifact's prose description, carried in triage.md, is the Final spec — no separate game-design.md/ui-design.md this task)

## Goal and acceptance criteria
- [ ] `LobbyBackground` renders a dusk sky, a sea layer, 4-5 clouds on a continuous spawn/drift/fade loop, and three real-tile-styled islands (base, resource, monster), matching the agreed artifact's composition.
- [ ] The monster island's `AnimatedMonster` never visually escapes its own tile box (clipped).
- [ ] Every position/size literal for the decorative islands and clouds lives in a new file owned by `LobbyBackground`, with zero import from `src/modules/map/island-tile-slots.types.ts` in any `LobbyBackground.*` source file (not just the ones that obviously need positions).
- [ ] `LobbyBackground` is mounted exactly once and stays mounted across the Login <-> Lobby transition (no unmount/remount); it still disappears when a game is active, same as before.
- [ ] `npm run typecheck`, `npm run lint`, `npm test` pass.
- [ ] Preview state(s) for `LobbyBackground` checked in a real browser.

## Verified context
| Symbol or file | Location | Why it matters |
|---|---|---|
| `LobbyBackground` (old version, full file set) | `src/modules/lobby/components/LobbyBackground/{.tsx,.types.ts,.map.ts,.styles.ts,.preview.tsx,.test.tsx,.map.test.ts,index.ts}` | Being fully rewritten; old `LobbyIsland`/`LobbyBoat`/`Sprite` types and the 7-island/2-boat absolute-position data are replaced. |
| `Login.tsx` renders `<LobbyBackground />` | `src/modules/session/components/Login/Login.tsx:17,45` | Import + render to remove; background moves to `page.tsx`. |
| `Login.test.tsx` mocks `@/modules/lobby`'s `LobbyBackground` | `src/modules/session/components/Login/Login.test.tsx:18-20` | Dead mock once the import is gone; remove in the same phase. |
| `Lobby.tsx` renders `<LobbyBackground />` | `src/modules/lobby/components/Lobby/Lobby.tsx:9,20` | Import + render to remove; no test mocks it (verified: no `LobbyBackground` hit in `Lobby.test.tsx`/`.preview.tsx`/`.fixtures.ts`). |
| `Home` page, early-return `<Login/>` vs. nested `<Lobby/>`/`<GameBoard/>` | `src/app/page.tsx:8-31` | Root cause of the remount bug: two separate render branches, each previously holding its own `<LobbyBackground/>` instance. Rewritten to one return, one `<LobbyBackground/>` instance gated only on `!activeGameId`. |
| `island-tile-slots.types.ts` locked slot tables (`SINGLE_RESOURCE_SLOT`, `TRIPLE_RESOURCE_SLOTS`, `OCCUPANT_SIZE`, etc.) | `src/modules/map/island-tile-slots.types.ts:62-111` | Read-only reference for literal starting values; **never imported** by `LobbyBackground`. User memory rule: never edit this file. |
| `IslandTile.tsx` terrain/base/monster rendering | `src/modules/map/components/IslandTile/IslandTile.tsx:46-66,67-68` and `IslandTile.styles.ts:47,52-56` | Visual reference for "real-tile-styled": `bg-terrain bg-cover bg-center`, rounded-lg border, base image centered over `TileResources`. Not imported — re-expressed as literal classes in the new `.styles.ts`, since `IslandTile`'s own component is stateful/legacy-context-bound (out of scope to reuse directly). |
| `AnimatedMonster` (+ hook, types) | `src/modules/map/components/AnimatedMonster/AnimatedMonster.tsx:1-32`, `.hook.ts:1-57`, `.types.ts:1-10` | Reused unmodified. Sprite is a **fixed 64x64px** `<Image>` (`AnimatedMonster.tsx:19-20`), not percentage-sized — the monster tile box must be sized to comfortably hold 64px and also clip with `overflow-hidden` as a safety net, since the wander offset (`AnimatedMonster.hook.ts:28`, up to ±15% via `translateX`) is computed against the image's own box, which doesn't scale with a container. |
| `AnimatedMonster` needs a `TooltipProvider` ancestor | `AnimatedMonster.tsx:13-14` via `@/components/ui/tooltip`; precedent at `IslandTile.tsx:103`, `Lobby.tsx:122`, `AnimatedMonster.preview.tsx:23,31,39,47` | Every existing call site wraps it in `<TooltipProvider>`. Decision: do the same here (see Decisions) rather than fork the component. |
| `src/modules/map/index.ts` public exports | `src/modules/map/index.ts:1` | Currently exports only `MapGrid`. Must add `AnimatedMonster` and `RESOURCE_SPRITES` so `LobbyBackground` (a different module) can import them through the index, not a deep path (lint-enforced import boundary). |
| `RESOURCE_SPRITES`, `FARM_SPRITES` | `src/modules/map/components/TileResources/TileResources.map.ts:14-34`, re-exported at `TileResources/index.ts:3` | Real sprite paths for Food/Wood/Gold nodes (sheep.gif/tree.gif/mine.png) — reused via the module index, not copied strings. |
| `src/modules/game-rules/index.ts` public exports | `src/modules/game-rules/index.ts:1-27` | Exports `PLAYER_DATA` already (line 3) but not `MONSTER_DATA`. Must add `MONSTER_DATA` export (from `monster-catalog.ts:4`) for the monster island's sprite/name/level data. |
| `PLAYER_DATA[PlayerColor.Blue].base` | `src/modules/game-rules/player-data.ts:19-27` → `'/sprites/castle_blue.png'` | Base island's castle sprite, reused not re-typed. |
| `MONSTER_DATA[4]` (Minotaur) | `src/modules/game-rules/monster-catalog.ts:8` → `{ name: 'Minotaur', sprite: { idle: '/sprites/minotaur_idle.gif', attack: '/sprites/minotaur_attack.gif', death: '/sprites/death.gif' } }` | Monster island's `Monster` object (level 4, matches `Monster` type at `src/lib/types/monsters.ts:9-17`). |
| `Monster` type | `src/lib/types/monsters.ts:9-17` | `{ name: MonsterName; level: number; sprite: { idle, attack, death } }` — exact shape the fixture/literal must match. |
| `bg-terrain`, `bg-water-pattern` Tailwind backgroundImage utilities | `tailwind.config.ts:15-18` | Already-registered utilities reused for sea/island terrain; no Tailwind config change needed. |
| Z-index lesson: bare numeric `z-<n>` outside `{0,10,20,30,40,50}` silently emits no CSS | `docs/ai/lessons-learned.md:88` | New `.styles.ts` must stick to the default scale or bracket (`z-[N]`), same as every other layer in this file. |
| Inline-`style` transform overrides Tailwind transform utilities | `docs/ai/lessons-learned.md:86` | Cloud/island positioning mixes inline `style` (dynamic %) and Tailwind classes (static) — never put a Tailwind `translate-*`/`scale-*` class on the same element that also gets an inline `transform`. |
| `src/docs/README.md` Lobby bullet + Visual Parity Rule | `src/docs/README.md:57-59` | Describes the old "4 faction bases" composition and cites `<LobbyBackground />` directly — docs-sync updates both in this phase. |
| Testbed registry already wires the preview | `src/testbed/registry.ts:41` (import), `previews` array entry | Slug/path (`lobby-background`) and the component's own `index.ts` export are unchanged — no registry edit needed. |

## Decisions
- New file `LobbyBackground.layout.ts` owns every position/size literal (tile size, island positions, resource-node slot coordinates, cloud spawn timing), with a file-header comment stating zero import from `island-tile-slots.types.ts` and that any numeric match is a copied literal — because the hard architectural constraint in triage.md needs a named, reviewable file, and the existing precedent for "a flat literal-data file beside a component" is `island-tile-slots.types.ts` itself (module-level, several consumers) — here scoped to one component, so it is not named `.types.ts` (that suffix is reserved for prop/view-model types per `component-architecture`) but `.layout.ts`, a new but self-explanatory suffix. Rejected: reusing `.types.ts` for both props and literals (conflates two responsibilities, harder for architect-b to grep for the zero-import check).
- Wrap `AnimatedMonster` in a local `<TooltipProvider>` inside `LobbyBackground.tsx`, exactly like every other call site, rather than forking `AnimatedMonster` to make its tooltip optional — because triage scopes `AnimatedMonster` as "reusable as-is, no fork needed," and the root `pointer-events-none` on `LobbyBackground.styles.ts:root` (kept from the old version) already guarantees the tooltip can never actually open, so suppressing it inside `AnimatedMonster` would be solving a problem that doesn't show. Rejected: no `TooltipProvider` at all (Radix throws/warns without an ancestor provider — every existing usage site provides one).
- Monster island tile box: `112px` square (`MONSTER_TILE_SIZE_PX` in the new layout file) with `overflow-hidden` on the wrapper, sized comfortably larger than the monster's fixed 64px sprite plus its ±15% wander translate, so the only clipping that can occur is the explicit safety margin, not routine wander — because `AnimatedMonster`'s size is fixed and out of scope to change, and the triage's own artifact history calls out "monsters escaping their tile" as a bug it already fixed once. Pixel-exact tuning is explicitly out of scope; this is a reasonable starting value, not final.
- Base/resource/monster sprites are reused from the real game-rules/map data (`PLAYER_DATA`, `RESOURCE_SPRITES`, `MONSTER_DATA`) via each module's public `index.ts`, not copied path strings — because sprite paths are not the locked-value class the triage warns about (only `island-tile-slots.types.ts`'s position/size tables are), and copying them would duplicate a source of truth the project already has. This requires two minimal index-completion edits (`src/modules/map/index.ts`, `src/modules/game-rules/index.ts`) adding exports that already exist deeper in each module.
- Clouds are the only "spawning" element (triage: "slow-spawning clouds"); the three islands are static (fixed position, matching the artifact), driven entirely by the new `.layout.ts` literals — no hook needed for island placement, only for cloud lifecycle.
- `LobbyBackground`'s own hook (`LobbyBackground.hook.ts`) manages only local UI/animation state (cloud spawn timers), reading no legacy context, no Firestore, no board state — per `component-architecture`'s rule, this means no `LobbyBackgroundView`/connected split is needed; `LobbyBackground()` calls its hook directly, matching `AnimatedMonster`'s existing precedent (no view/connected split there either).
- Bug fix: collapse `src/app/page.tsx`'s two return branches (early `<Login/>` return vs. the main return's `<Lobby/>`/`<GameBoard/>`) into one return, with a single `<LobbyBackground/>` rendered once, gated on `!activeGameId` (true for both Login and Lobby, false only once a game is active) — the minimal change that makes one DOM instance span the Login<->Lobby transition while leaving GameBoard's "no decorative background" behavior exactly as it is today (triage: out of scope to touch the real game board).
- A permanent regression guard against importing the locked slots file is a test, not just a one-time review note (tests outlive one review pass) — added to `LobbyBackground.map.test.ts`. It globs every `LobbyBackground.*` source file in the component directory at test time (`fs.readdirSync`, filtered to `.ts`/`.tsx`, excluding `.test.`/`.preview.` files) rather than naming files, so a future file added to the component (e.g. a new `.hook.ts` or `.styles.ts` variant) is covered automatically instead of silently falling outside an enumerated list — an enumerated list of 3 files was architect-b's CHANGES REQUESTED finding on the first draft (`.types.ts`, `.hook.ts`, `.styles.ts`, `.fixtures.ts` were untested).

## File plan
| File | New / Edit | Responsibility | Owner |
|---|---|---|---|
| `src/modules/lobby/components/LobbyBackground/LobbyBackground.types.ts` | edit (full rewrite) | `CloudViewModel`, `LobbyBackgroundViewModel` — drop old `Sprite`/`SpriteDecoration`/`LobbyIsland`/`LobbyBoat` types | implementer-a |
| `src/modules/lobby/components/LobbyBackground/LobbyBackground.layout.ts` | new | Every position/size/timing literal (hard-constraint file); zero import from `island-tile-slots.types.ts` | implementer-a |
| `src/modules/lobby/components/LobbyBackground/LobbyBackground.map.ts` | edit (full rewrite) | Pure: `toCloudStyle`, `createResourceIslandNodes`, `createMonsterIslandMonster` | implementer-a |
| `src/modules/lobby/components/LobbyBackground/LobbyBackground.hook.ts` | new | `useLobbyBackground()`: cloud spawn/drift/fade loop (`setInterval` + `Math.random`, no app-state reads) | implementer-a |
| `src/modules/lobby/components/LobbyBackground/LobbyBackground.fixtures.ts` | new | Deterministic `CloudViewModel[]` sample for the preview and view tests | implementer-a |
| `src/modules/lobby/components/LobbyBackground/index.ts` | none | Already `export { LobbyBackground } from './LobbyBackground';` — no change | — |
| `src/modules/lobby/components/LobbyBackground/LobbyBackground.styles.ts` | edit (full rewrite) | Sky/sea/cloud/island-tile classes; default z-index scale only (no bare `z-<n>` outside `{0,10,20,30,40,50}`) | implementer-b |
| `src/modules/lobby/components/LobbyBackground/LobbyBackground.tsx` | edit (full rewrite) | Renders sky, sea, clouds (from `useLobbyBackground()`), base/resource/monster islands; wraps the monster island's `AnimatedMonster` in `<TooltipProvider>` | implementer-b |
| `src/modules/map/index.ts` | edit | Add `export { AnimatedMonster } from './components/AnimatedMonster';` and `export { RESOURCE_SPRITES } from './components/TileResources';` | implementer-a |
| `src/modules/game-rules/index.ts` | edit | Add `export { MONSTER_DATA } from './monster-catalog';` | implementer-a |
| `src/app/page.tsx` | edit | Single return; one `<LobbyBackground/>` gated on `!activeGameId` (fixes the remount bug) | implementer-b |
| `tailwind.config.ts` | edit | Add a `cloud-drift` keyframe (translateX + opacity fade to 0, runs once) and an `animation` entry `'cloud-drift': 'cloud-drift linear forwards'`, alongside the existing keyframes block (~lines 81-103) — `LobbyBackground.styles.ts`'s `cloud` class references `animate-cloud-drift`, which doesn't exist yet; per-cloud duration stays on the inline `animationDuration` style | implementer-b |
| `src/modules/session/components/Login/Login.tsx` | edit | Remove `LobbyBackground` import and `<LobbyBackground />` render (now mounted in `page.tsx`) | implementer-b |
| `src/modules/lobby/components/Lobby/Lobby.tsx` | edit | Remove `LobbyBackground` import and `<LobbyBackground />` render | implementer-b |
| `src/modules/session/components/Login/Login.test.tsx` | edit | Remove the now-dead `jest.mock('@/modules/lobby', ...)` block (lines 18-20) | tester-b |
| `src/modules/lobby/components/LobbyBackground/LobbyBackground.map.test.ts` | edit (full rewrite) | Tests for `toCloudStyle`, `createResourceIslandNodes`, `createMonsterIslandMonster`, sprite-path-exists check (precedent: old file's `fs.existsSync` pattern), and the zero-import regression guard (globs every `LobbyBackground.*` source file in the directory via `fs.readdirSync`, excluding `.test.`/`.preview.` files, asserts none contains `island-tile-slots`) | tester-a |
| `src/modules/lobby/components/LobbyBackground/LobbyBackground.hook.test.ts` | new | Cloud spawn/fade loop with fake timers + mocked `Math.random`, same pattern as `AnimatedMonster.hook.test.ts` | tester-a |
| `src/modules/lobby/components/LobbyBackground/LobbyBackground.test.tsx` | edit (full rewrite) | View tests: root `fixed`/`pointer-events-none`/no negative z-index (keep existing regression tests), three islands render with alt text, monster island wrapper has `overflow-hidden`, clouds render from the hook | tester-b |
| `src/modules/lobby/components/LobbyBackground/LobbyBackground.preview.tsx` | edit (full rewrite) | `Default` state using the real hook; add a `Many clouds` or similar state using `LobbyBackground.fixtures.ts` if the view needs a fixtures-driven variant for deterministic screenshots | preview-a |
| `src/testbed/registry.ts` | none | Already imports `lobbyBackgroundPreview` at line 41 — no change | — |
| `src/docs/README.md` | edit | Update the Lobby bullet (line 57: replace "animated battle diorama and 4 faction bases" with the new dusk/sea/clouds/three-islands composition) and the Visual Parity Rule note (line 59: it's now one persistent instance mounted in `src/app/page.tsx`, not a separately-mounted component per page) | docs-sync |

## Contracts
```ts
// LobbyBackground.types.ts
export interface CloudViewModel {
  id: string;
  /** % from left edge of the viewport, 0-100 */
  left: number;
  /** % from top edge of the viewport, 0-100 */
  top: number;
  /** full spawn->drift->fade lifetime, in seconds */
  durationSeconds: number;
  /** 0-1, final drifted opacity/scale multiplier for depth */
  scale: number;
}

export interface LobbyBackgroundViewModel {
  clouds: CloudViewModel[];
}

// LobbyBackground.layout.ts (new; zero import from '../../island-tile-slots.types')
export const CLOUD_SPAWN: {
  maxConcurrent: number;
  spawnIntervalMs: number;
  minDurationSeconds: number;
  maxDurationSeconds: number;
};
export const ISLAND_TILE_SIZE_PX: number;
export const ISLAND_POSITIONS: {
  base: { top: string; left: string };
  resource: { top: string; left: string };
  monster: { top: string; left: string };
};
export const RESOURCE_NODE_SLOTS: Array<{ top: string; left: string; sizePercent: number }>; // exactly 3 entries
export const MONSTER_TILE_SIZE_PX: number; // >= 64 (AnimatedMonster's fixed sprite size) + wander/clipping margin

// LobbyBackground.map.ts
import type { CSSProperties } from 'react';
import type { CloudViewModel } from './LobbyBackground.types';
import type { Monster } from '@/lib/types';

export function toCloudStyle(cloud: CloudViewModel): CSSProperties;
export function createResourceIslandNodes(): Array<{ key: string; src: string; style: CSSProperties }>; // 3 nodes, from RESOURCE_NODE_SLOTS + RESOURCE_SPRITES (Food/Wood/Gold)
export function createMonsterIslandMonster(): Monster; // built from MONSTER_DATA[4] (Minotaur), level 4

// LobbyBackground.hook.ts
export function useLobbyBackground(): LobbyBackgroundViewModel;

// LobbyBackground.fixtures.ts
export const SAMPLE_CLOUDS: CloudViewModel[]; // deterministic, for preview + view tests

// src/modules/map/index.ts (addition, alongside the existing `export { MapGrid } ...`)
export { AnimatedMonster } from './components/AnimatedMonster';
export { RESOURCE_SPRITES } from './components/TileResources';

// src/modules/game-rules/index.ts (addition)
export { MONSTER_DATA } from './monster-catalog';
```

## Phases
### Phase 1: Home Islands background rebuild + persistent mount
1. implementer-a: write `LobbyBackground.types.ts`, `LobbyBackground.layout.ts`, `LobbyBackground.map.ts`, `LobbyBackground.hook.ts`, `LobbyBackground.fixtures.ts`; add the two index exports (`src/modules/map/index.ts`, `src/modules/game-rules/index.ts`).
2. implementer-b: write `LobbyBackground.styles.ts`, `LobbyBackground.tsx` against the Contracts block; rewrite `src/app/page.tsx`; remove the `LobbyBackground` render from `Login.tsx` and `Lobby.tsx`. (sonnet: `LobbyBackground.tsx` and `page.tsx` — layered z-index/overflow composition and the render-branch restructure are easy to get subtly wrong; everything else in this phase is mechanical.)
3. tester-a: `LobbyBackground.map.test.ts` (rewrite), `LobbyBackground.hook.test.ts` (new) — run after implementer-a's files exist.
4. tester-b: `LobbyBackground.test.tsx` (rewrite), `Login.test.tsx` (remove dead mock) — run after implementer-b's files exist.
5. preview-a: `LobbyBackground.preview.tsx` (rewrite); confirm `src/testbed/registry.ts` needs no edit.
6. docs-sync: update `src/docs/README.md` (Lobby bullet + Visual Parity Rule note).
7. Checks: `npm run typecheck`, `npm run lint`, `npm test` on every touched file (not scoped to one subdirectory).
8. UI verify: `npm run dev`, screenshot `/testbed/lobby-background`, and the real `/` route in both the Login and Lobby states, confirming the background persists across the transition (skill `ui-verify`).
9. architect-b final review: confirm zero import of `island-tile-slots.types.ts` from any `LobbyBackground.*` file (grep), confirm the regression-guard test exists and passes, confirm `page.tsx`'s single-mount fix.
10. Commit: `feat(lobby): rebuild LobbyBackground as dusk sky with real-tile-styled islands, fix persistent mount [phase 1/1]`.

Model escalation: step 2 (implementer-b, `LobbyBackground.tsx` + `page.tsx`) — sonnet.

## Test plan
- tester-a (`LobbyBackground.map.test.ts`):
  - `toCloudStyle` maps a `CloudViewModel` to a `CSSProperties` object with `left`/`top` in `%` and an `animationDuration` (or equivalent) derived from `durationSeconds`.
  - `createResourceIslandNodes` returns exactly 3 nodes, one per `ResourceType` (Food/Wood/Gold), each `src` pointing at a file that exists under `public/sprites` (`fs.existsSync`, same pattern as the old file's sprite-path test).
  - `createMonsterIslandMonster` returns a `Monster` whose `name`/`level`/`sprite` exactly match `MONSTER_DATA[4]`.
  - Regression guard: `fs.readdirSync` the `LobbyBackground` component directory, filter to `.ts`/`.tsx` source files excluding `.test.`/`.preview.` files (so every current and future `LobbyBackground.*` file is covered, not an enumerated list), read each one's raw text, and assert none contains the substring `island-tile-slots`.
- tester-a (`LobbyBackground.hook.test.ts`, fake timers + mocked `Math.random`, pattern from `AnimatedMonster.hook.test.ts`):
  - A new cloud is spawned on the configured interval, up to `CLOUD_SPAWN.maxConcurrent`; no new cloud spawns once the cap is reached.
  - A cloud is removed from the returned list once its `durationSeconds` elapses.
- tester-b (`LobbyBackground.test.tsx`):
  - Root element keeps `fixed` positioning and no bare/negative `z-<n>` class (carry over the two existing z-index regression tests).
  - Renders the base, resource and monster islands with alt text for each sprite (castle, 3 resource sprites, the Minotaur).
  - The monster island's wrapper element has `overflow-hidden` in its class list.
  - Clouds from `useLobbyBackground()` (or injected via a fixtures-backed render) are present in the DOM.
- tester-b (`Login.test.tsx`): no new cases — only removing the dead `jest.mock`; re-run the full suite to confirm nothing relied on it.

## Preview states
- `LobbyBackground`: `Default` (live hook, real cloud spawn loop) — matches the existing single-state precedent (`AnimatedMonster.preview.tsx`'s per-monster states are the closest analogue, but `LobbyBackground` has no props to vary, so one state is correct, not an arbitrary cut).

## Risks
- `AnimatedMonster`'s fixed 64px sprite size means the monster tile's apparent size can't be scaled down to match a smaller `ISLAND_TILE_SIZE_PX` for the other two islands without forking it (out of scope) — mitigated by giving the monster tile its own, larger `MONSTER_TILE_SIZE_PX` in the layout file rather than forcing all three islands to share one size.
- Restructuring `page.tsx`'s two return branches into one is the part most likely to introduce a visual regression (e.g., `GameBoard` briefly showing the background during a transition) — mitigated by the explicit `!activeGameId` gate and a browser check of the Lobby -> GameBoard transition in step 8, even though GameBoard itself is out of scope to change.

## Review (architect-b)
VERDICT: APPROVED (first pass: CHANGES REQUESTED, see below — fixed)

- First pass found: **regression guard scanned 3 of the component's ~8 source files, not all of them** (then plan.md:46,65,150; File plan row for `LobbyBackground.map.test.ts`). The acceptance criterion (plan.md:9) and the triage hard constraint say every position/size literal lives in a file "owned by `LobbyBackground`" with zero import from `island-tile-slots.types.ts` — that constraint applies to the whole component, not an enumerated subset.
- Fix confirmed in this plan.md: acceptance criterion (plan.md:9) now reads "in any `LobbyBackground.*` source file (not just the ones that obviously need positions)"; the Decisions entry (plan.md:46), File plan row (plan.md:65) and Test plan bullet (plan.md:150) all now describe `fs.readdirSync`-based globbing of every `LobbyBackground.*` file in the component directory (filtered to `.ts`/`.tsx`, excluding `.test.`/`.preview.`), not 3 named files. This covers `.types.ts`, `.hook.ts`, `.styles.ts`, `.fixtures.ts`, `.layout.ts`, `.map.ts`, `.tsx` and `index.ts` — every file a stray import could land in — and stays correct if a file is renamed or added later. Gap closed.
- Everything else checks out (unchanged from first pass): every cited path/symbol/line verified against the repo (old `LobbyBackground` file set, `Login.tsx`/`Lobby.tsx`/`page.tsx` render sites, `island-tile-slots.types.ts:62-111` locked tables, `IslandTile.tsx`/`.styles.ts` terrain classes, `AnimatedMonster.tsx`/`.hook.ts` line counts, both module `index.ts` files confirmed missing the cited exports, `RESOURCE_SPRITES`/`MONSTER_DATA`/`PLAYER_DATA`/`Monster` type shapes, `tailwind.config.ts` backgroundImage utilities, both lessons-learned entries, `docs/README.md:57,59`, `testbed/registry.ts:41-43` already wired). Repo-wide grep for `island-tile-slots` found no other importer under the new component's scope (only the real board's existing consumers: `TileBoats`, `TileOccupants`, `TileForest`, `TileResources.map.ts`, `island-tile-slots.test.ts` — none touched by this plan, as intended).
- File plan, contracts and phase sequencing are sound: one hook (cloud lifecycle only, matching `AnimatedMonster`'s no-split precedent), sprites reused through module indices rather than copied strings, `TooltipProvider` wrapping matches every existing `AnimatedMonster` call site, `page.tsx`'s single-return/single-mount fix is minimal and directly targets the remount bug. No simpler design available; no unnecessary files.
