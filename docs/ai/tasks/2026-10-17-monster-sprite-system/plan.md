# Plan: Filename-driven monster sprite system — Phase 1 (catalog, types, spawn rules)

Status: APPROVED
Inputs: triage.md, game-design.md (Final spec), ui-design.md (Final spec and Spec sections)

## Goal and acceptance criteria
Phase 1 only (generator + generated catalog + types + spawn-rule rework + LobbyBackground accessor). Phase 2 (combat/rendering wiring for optional attack) and Phase 3 (testbed uploader) are outlined at the end, not detailed.

- [ ] `public/monster/*.gif` can be parsed into a catalog of `{ name, level, isBoss, sprite: { idle, attack? } }` entries by a pure, unit-tested parser, and a script writes that catalog plus the `MonsterName` union into checked-in generated files.
- [ ] The generated catalog always contains the 4 permanent seed entries (Lancer lvl1, Bear lvl2, Ogre lvl3, Minotaur lvl4 `isBoss: true`), even if `public/monster/` is scanned and comes back empty or missing one.
- [ ] `generateMonsters(x, y)` picks level first (unchanged probabilities), then picks a name uniformly among non-boss candidates at that level; never returns two monsters with the same name; never throws or returns `undefined` when a rolled level has zero candidates (falls back to the sibling level, then to "no monster this slot").
- [ ] The map's center tile picks uniformly among all `isBoss`-tagged candidates regardless of level; with only the seed Minotaur present this is deterministic (today's behavior unchanged).
- [ ] A Monster-type tile that ends up with zero monsters after fallback becomes a Resource tile using the same resource-generation rule as any other Resource tile.
- [ ] `LobbyBackground`'s decorative monster island no longer indexes a single-entry-per-level record; it uses a deterministic accessor (same result every call, no `Math.random()`) and is unaffected by the catalog holding more than one level-4 candidate in the future.
- [ ] `npm run typecheck`, `npm run lint`, `npm test` pass after this phase, including the full repo (not just touched files) — phase 1 must not leave Phase 2/3 files broken.
- [ ] `docs/architecture/game-mechanics.md:31` and `docs/architecture/systems-and-visuals.md:21-22` no longer describe the removed `MONSTER_DATA` or the center tile as a non-rolled fixed special case (docs-sync, same phase — mandatory per CLAUDE.md whenever documented game-rule/architecture behavior changes).

## Verified context
| Symbol or file | Location | Why it matters |
|---|---|---|
| `MonsterName` (const + type) | `src/lib/types/monsters.ts:1-7` | Hand-written today; triage requires it become generated. Kept as a const object + derived type (not a bare union) — see Decisions. |
| `Monster` type | `src/lib/types/monsters.ts:9-17` | `sprite.attack` stays `string` (required) in Phase 1 — see Decisions. |
| `MONSTER_DATA` | `src/modules/game-rules/monster-catalog.ts:4-9` | `Record<number, single entry>`, being replaced by `MONSTER_CATALOG: MonsterCatalogEntry[]` + helper functions. |
| `generateMonsters` | `src/modules/game-rules/monster-catalog.ts:11-68` | Reworked: level-then-name two-step roll, empty-level fallback, same dedupe. |
| `generateIslandTerrain` | `src/modules/game-rules/map-generation.ts:5-69` | Center tile hardcodes `MONSTER_DATA[4]` (`map-generation.ts:17-22`); resource-generation logic inline at `map-generation.ts:42-61`, extracted into a shared helper for reuse by the new Monster-degrades-to-Resource path. |
| `MONSTER_VICTORY_POINTS_BY_LEVEL` | `src/modules/game-rules/combat-monster-resolve.reducer.ts:6` | VP keyed by `level` only — confirms this phase does not touch combat math. |
| `createMonsterIslandMonster` | `src/modules/lobby/components/LobbyBackground/LobbyBackground.map.ts:54-58` | `MONSTER_DATA[MONSTER_ISLAND_LEVEL]` direct index — breaks once level 4 can hold >1 candidate. Must become a deterministic accessor call. |
| `LobbyBackground.tsx:21` | `const MONSTER = createMonsterIslandMonster();` | Built once at module load; accessor must be stable across repeated calls (no randomness), not just on first call. |
| `game-rules/index.ts:4` | `export { MONSTER_DATA } from './monster-catalog';` | Must be replaced with the new public exports `LobbyBackground.map.ts` needs. |
| `monster-catalog.test.ts` | `src/modules/game-rules/monster-catalog.test.ts:1-87` | References `MONSTER_DATA[1..4]` directly (lines 69-86) — must be rewritten for the new shape. |
| `LobbyBackground.map.test.ts:140-161` | same file | Asserts literal legacy sprite paths `/sprites/minotaur_idle.gif` etc. and `MONSTER_DATA[4]` — must be updated to the new `/monster/boss-minotaur-lvl4-*.gif` paths and the new accessor. |
| `public/monster/*.gif` | verified via `ls` | Already contains `lancer-lvl1-{idle,attack}.gif`, `bear-lvl2-{idle,attack}.gif`, `ogre-lvl3-{idle,attack}.gif`, `boss-minotaur-lvl4-{idle,attack}.gif`. No death sprite in this folder. |
| `public/sprites/death.gif` | verified via `ls` | The one shared death sprite every monster uses today; the new naming convention has no per-monster death variant, so this stays a single hardcoded constant, not generated data. |
| `AnimatedMonster.hook.ts:43`, `MonsterCombatDialog.map.ts:85,109,114` | verified by reading each file | `AnimatedMonster.hook.ts:43` and `MonsterCombatDialog.map.ts:85,114` read `monster.sprite.attack` unconditionally as a `string` (one even types its param `sprite: { attack: string }`); line 109 there reads `PLAYER_DATA[attacker.color].sprite.attack` (the player's sprite, not the monster's, included here only because it's in the same reworked block). If `Monster.sprite.attack` became optional in this phase, these would fail `npm run typecheck`. Phase 1 therefore keeps `Monster.sprite.attack: string` required — see Decisions. `MonsterAttackScreen.tsx:27` and `CombatDialog.map.ts:27,30` read `PLAYER_DATA[...].sprite.attack` only (unrelated to `Monster`); `MonsterSelectionDialog.map.ts:13` reads `monster.sprite.idle`, not `.attack` — none of these three are affected by this decision. |
| `src/app/api/tile-fog-variants/route.ts`, `upload.ts`, `variants-config.ts` | read in full | Single-`POST` upload precedent (file-type/size checks, `toVariantId`-style slug) — informs Phase 3, not Phase 1. |
| `src/app/api/tile-decoration-editor/default-elements/regenerate-source.ts` + `route.ts` | read in full | Precedent for "pure regenerate function, route owns fs I/O" — Phase 1's generator follows the same split (pure parser/renderer in `game-rules`, fs I/O in a script now, reused by Phase 3's route later). |
| `src/app/api/tile-decoration-editor/images/route.ts:7-21` | read in full | Precedent for scanning a directory and filtering by extension — the shape Phase 1's script (and Phase 3's route) uses for `public/monster/`. |
| `MonsterName.Lancer` etc. used as **values** | `MonsterCombatDialog.fixtures.ts:70`, `MonsterSelectionDialog.fixtures.ts:7,13,19`, `MonsterSelectionDialog.map.test.ts`, `army-position-eligibility.test.ts`, `combat-initiate.reducer.test.ts`, `combat-monster-roll.reducer.test.ts`, `combat-monster-resolve.reducer.test.ts`, `bot-turn.reducer.test.ts`, `game-rules.reducer.test.ts`, `ActionsPanel.map.test.ts`, `GameBoardContext.handlers.characterization.test.tsx` | 11 files use `MonsterName.X` as a runtime value, not just a type. Keeping `MonsterName` as a generated const object (not a bare string-literal type) means none of these need to change in Phase 1. |
| `package.json:9-10` | `"genkit:dev": "genkit start -- tsx src/ai/dev.ts"` (line 9), `"genkit:watch": "genkit start -- tsx --watch src/ai/dev.ts"` (line 10) | `tsx` is already a dependency/precedent for running a `.ts` script directly — used for the new `generate:monster-catalog` script. |
| `eslint.config.mjs:12-23` | `LEGACY_PATHS` | `src/lib/**` is exempt from the module import-boundary rules; `src/modules/**` and `scripts/**` are not legacy and get full lint. |

## Decisions
- **Keep `Monster.sprite.attack: string` required in Phase 1; make it optional in Phase 2.** Making it optional now breaks `npm run typecheck` in 5 files (`AnimatedMonster.hook.ts`, `MonsterCombatDialog.map.ts`, `MonsterAttackScreen.tsx`, `MonsterSelectionDialog.map.ts`, `CombatDialog.map.ts`) that triage explicitly scopes to Phase 2 ("combat/rendering wiring for the optional attack"). `monster-catalog.ts`'s `toMonster()` defaults a missing catalog `attack` to the entry's `idle` sprite, so every assembled runtime `Monster` keeps today's shape; `MonsterCatalogEntry.sprite.attack` (the pre-assembly shape) is optional so Phase 2 has the real "no attack sprite" signal to consume. Rejected: optional `Monster.sprite.attack` now (fails typecheck on Phase-2-owned files; would force this plan to silently absorb Phase 2's scope).
- **`MonsterName` stays a generated const object + derived type** (`export const MonsterName = {...} as const; export type MonsterName = (typeof MonsterName)[keyof typeof MonsterName];`), machine-written instead of hand-written, not a bare `type MonsterName = 'Lancer' | ...` union. Rejected: bare union (breaks 11 files that use `MonsterName.X` as a value — triage's "generated string-literal union, not a hand-written enum" is satisfied either way since the resulting *type* is structurally the same string-literal union; only *how it's authored* changes, from hand-edited to generated).
- **Two generated files, one generator, not one.** `src/lib/types/monsters.generated.ts` (the `MonsterName` const+type) and `src/modules/game-rules/monster-catalog.generated.ts` (the `MONSTER_CATALOG` data) are both written by the same generator run, but kept in separate files so domain types stay in `@/lib/types` and game-rule data stays in `game-rules` — matching every existing import (game-rules already does `import type { Monster, MonsterName } from '@/lib/types'`; reversing that so `lib/types` imports from `game-rules` would invert the codebase's only-ever-one-direction dependency and has no existing precedent). Rejected: one combined generated file in `game-rules` with `lib/types/monsters.ts` importing `MonsterName` from it (inverts the lib→modules direction; no current file in `src/lib/types` imports from `src/modules`).
- **Shared `death` sprite is a hardcoded constant (`/sprites/death.gif`), not part of the per-entry generated data.** The `<name>-lvl<N>-idle.gif`/`-attack.gif` convention has no death variant, and `public/monster/` (verified via `ls`) has no death files — every monster uses the one shared `public/sprites/death.gif` today. `monster-catalog.ts`'s `toMonster()` attaches it to every assembled `Monster`.
- **`MONSTER_DATA` is removed, not kept alongside `MONSTER_CATALOG`.** It's a single-entry-per-level shape that is structurally wrong once a level can hold multiple candidates (this is finding 5 of game-design.md's review, generalized to every consumer, not just `LobbyBackground`). All 5 consumers (`map-generation.ts`, `LobbyBackground.map.ts`, `game-rules/index.ts`, `monster-catalog.test.ts`, `LobbyBackground.map.test.ts`) are fixed in this phase.
- **Generator logic is pure TypeScript inside `game-rules`, fs I/O is a separate script.** Mirrors `regenerate-source.ts` (pure) / `route.ts` (fs) in the decoration editor. The pure functions (`parseMonsterSpriteFilename`, `buildMonsterCatalogEntries`, the two renderers) are unit-testable without touching disk, and Phase 3's upload route reuses them verbatim instead of re-implementing filename parsing.
- **`npm run generate:monster-catalog` is a manual script (`tsx scripts/generate-monster-catalog.ts`), not wired into `predev`/`prebuild`.** Triage's locked decision is "regenerated when a monster is uploaded" (Phase 3's route), not "regenerated on every dev boot." Rejected: wiring it into `predev`/`prebuild` like `sync-fog-variants.mjs` (that script syncs a different kind of config and isn't a stated requirement here; adding an unrequested auto-run step is scope creep for Phase 1).
- **`generateTileResources(distance: number, baseResourceAmount: number)` extracted inside `map-generation.ts`.** The new "Monster tile with zero monsters degrades to Resource" path needs the exact same distance-gated resource roll as the existing Resource-tile branch (`map-generation.ts:42-61`) — two call sites in the same file is the DRY extraction trigger. The signature takes only `settings.baseResourceAmount` (the one field the block at `map-generation.ts:42-61` actually reads, at lines 52 and 57 — `resourceDensity` is read earlier, outside this block, to pick `islandType`), not the whole `GameSettings`, per interface segregation. `combat-monster-resolve.reducer.ts`'s separate, non-distance-gated resource roll (its own `handleCloseMonsterCombat`) is a different calculation and is left untouched — out of this phase's scope, not broken by this change.
- **Deterministic accessor is `getFirstMonsterAtLevel(level)`, returning the first `MONSTER_CATALOG` entry at that level in array order.** `MONSTER_CATALOG`'s order is fixed by the generator (seed entries first, in a stable order), so "first" is deterministic and requires no extra bookkeeping. `LobbyBackground.map.ts` keeps one inline literal Minotaur fallback for the case `getFirstMonsterAtLevel(4)` returns `undefined` (catalog corrupted) — matching game-design.md Final spec's "or the seed Minotaur if none," and keeping the lobby's decorative art unable to crash the login screen even if the catalog is ever empty.

## File plan
| File | New / Edit | Responsibility | Owner |
|---|---|---|---|
| `src/lib/types/monsters.generated.ts` | new | Generated `MonsterName` const + derived type | implementer-a |
| `src/lib/types/monsters.ts` | edit | Re-export `MonsterName` from the generated file; `Monster` type unchanged | implementer-a |
| `src/modules/game-rules/monster-catalog.types.ts` | new | `MonsterCatalogEntry` type | implementer-a |
| `src/modules/game-rules/monster-catalog.generated.ts` | new | Generated `MONSTER_CATALOG` data (4 seed entries) | implementer-a |
| `src/modules/game-rules/monster-catalog-generator.ts` | new | Pure: parse `public/monster` filenames, build catalog entries (with seed fallback), render both generated files' source text | implementer-a |
| `src/modules/game-rules/monster-catalog-generator.test.ts` | new | Parser/renderer unit tests | tester-a |
| `scripts/generate-monster-catalog.ts` | new | fs I/O: reads `public/monster/`, calls the generator, writes both generated files | implementer-a |
| `src/modules/game-rules/monster-catalog.ts` | edit | Remove `MONSTER_DATA`; add `getNonBossCandidatesByLevel`, `getBossCandidates`, `getFirstMonsterAtLevel`, `toMonster`, `pickBossMonster`; rework `generateMonsters` (two-step roll + empty-level fallback, same dedupe) | implementer-a |
| `src/modules/game-rules/monster-catalog.test.ts` | edit (rewrite) | Tests for the new exports, seed-entry guarantee, empty-pool fallback, boss-pool fallback | tester-a |
| `src/modules/game-rules/map-generation.ts` | edit | Center tile uses `pickBossMonster()` with `generateMonsters` fallback; extract `generateTileResources`; Monster tile with 0 monsters degrades to Resource | implementer-a |
| `src/modules/game-rules/map-generation.test.ts` | new | Tests for center-tile boss pick, boss-pool-empty fallback, Monster-degrades-to-Resource path | tester-a |
| `src/modules/game-rules/index.ts` | edit | Replace `MONSTER_DATA` export with `MONSTER_CATALOG`, `getFirstMonsterAtLevel`, `toMonster` | implementer-a |
| `src/modules/lobby/components/LobbyBackground/LobbyBackground.map.ts` | edit | `createMonsterIslandMonster()` uses `getFirstMonsterAtLevel(4)` + inline fallback literal instead of `MONSTER_DATA[4]` | implementer-a |
| `src/modules/lobby/components/LobbyBackground/LobbyBackground.map.test.ts` | edit | Update literal sprite-path assertions to `/monster/boss-minotaur-lvl4-*.gif`; replace `MONSTER_DATA[4]` assertions with the new accessor; add a "same result on repeated calls" determinism test | tester-a |
| `package.json` | edit | Add `"generate:monster-catalog": "tsx scripts/generate-monster-catalog.ts"` | implementer-a |
| `docs/architecture/game-mechanics.md` | edit | Line 31 ("The exact center tile of the map is always a solo level-4 Minotaur boss ... not subject to ... any roll") no longer describes the behavior once `pickBossMonster()` replaces the hardcode; rewrite to describe the boss-pool roll (uniform among `isBoss`-tagged candidates, deterministic today because the pool has one member) and the seed-entry guarantee | docs-sync |
| `docs/architecture/systems-and-visuals.md` | edit | Lines 21-22 ("...monster (level 4, Minotaur)." / "Sprite paths still come from `MONSTER_DATA`.") — `MONSTER_DATA` no longer exists; rewrite to describe `MONSTER_CATALOG` and the `getFirstMonsterAtLevel` deterministic accessor `LobbyBackground` now uses | docs-sync |

No `.tsx`/`.styles.ts`/view files in this phase — implementer-b and preview-a have no Phase 1 work.

## Contracts
```ts
// ---------------------------------------------------------------------------
// src/lib/types/monsters.generated.ts (NEW — generated, do not hand-edit)
// ---------------------------------------------------------------------------
export const MonsterName = {
  Lancer: 'Lancer',
  Bear: 'Bear',
  Ogre: 'Ogre',
  Minotaur: 'Minotaur',
} as const;
export type MonsterName = (typeof MonsterName)[keyof typeof MonsterName];

// ---------------------------------------------------------------------------
// src/lib/types/monsters.ts (EDIT — Monster type unchanged, MonsterName re-exported)
// ---------------------------------------------------------------------------
export { MonsterName } from './monsters.generated';
export type { MonsterName } from './monsters.generated';

export type Monster = {
  name: MonsterName;
  level: number;
  sprite: {
    idle: string;
    attack: string; // stays required in Phase 1 — see Decisions
    death: string;
  };
};

// ---------------------------------------------------------------------------
// src/modules/game-rules/monster-catalog.types.ts (NEW)
// ---------------------------------------------------------------------------
import type { MonsterName } from '@/lib/types';

export interface MonsterCatalogEntry {
  name: MonsterName;
  level: 1 | 2 | 3 | 4;
  isBoss: boolean;
  sprite: {
    idle: string;
    attack?: string; // optional: a missing -attack.gif is a valid entry
  };
}

// ---------------------------------------------------------------------------
// src/modules/game-rules/monster-catalog.generated.ts (NEW — generated, do not hand-edit)
// ---------------------------------------------------------------------------
import type { MonsterCatalogEntry } from './monster-catalog.types';

export const MONSTER_CATALOG: MonsterCatalogEntry[] = [
  { name: 'Lancer', level: 1, isBoss: false, sprite: { idle: '/monster/lancer-lvl1-idle.gif', attack: '/monster/lancer-lvl1-attack.gif' } },
  { name: 'Bear', level: 2, isBoss: false, sprite: { idle: '/monster/bear-lvl2-idle.gif', attack: '/monster/bear-lvl2-attack.gif' } },
  { name: 'Ogre', level: 3, isBoss: false, sprite: { idle: '/monster/ogre-lvl3-idle.gif', attack: '/monster/ogre-lvl3-attack.gif' } },
  { name: 'Minotaur', level: 4, isBoss: true, sprite: { idle: '/monster/boss-minotaur-lvl4-idle.gif', attack: '/monster/boss-minotaur-lvl4-attack.gif' } },
];

// ---------------------------------------------------------------------------
// src/modules/game-rules/monster-catalog-generator.ts (NEW — pure, no fs, no React)
// ---------------------------------------------------------------------------
import type { MonsterCatalogEntry } from './monster-catalog.types';

/** The 4 permanent, non-deletable entries — used as a fallback whenever a scan of
 *  public/monster/ doesn't produce one of them (deleted/renamed file), guaranteeing
 *  every level 1-4 and the boss pool are always non-empty. */
export const SEED_MONSTER_CATALOG: MonsterCatalogEntry[]; // the 4 literals above

export interface ParsedMonsterSpriteFile {
  name: string; // Title Case, e.g. "Lancer", "Fire Ogre" for a "fire-ogre-lvl2-idle.gif"
  level: 1 | 2 | 3 | 4;
  isBoss: boolean;
  kind: 'idle' | 'attack';
}

/** Parses "<boss->-<slug>-lvl<1-4>-<idle|attack>.gif" (case-insensitive). Returns null
 *  for any filename that doesn't match (including anything without .gif, or an out-of-range level). */
export function parseMonsterSpriteFilename(filename: string): ParsedMonsterSpriteFile | null;

/** Groups parsed sprite files by name+level into catalog entries (idle required, attack
 *  optional); merges in SEED_MONSTER_CATALOG for any seed name+level missing from `filenames`,
 *  so the result always contains all 4 seeds plus whatever else parses cleanly. Order: seeds
 *  first in SEED_MONSTER_CATALOG's order, then newly parsed entries in filename-scan order. */
export function buildMonsterCatalogEntries(filenames: string[]): MonsterCatalogEntry[];

/** monster-catalog.generated.ts's full file text for the given entries. */
export function renderMonsterCatalogSource(entries: MonsterCatalogEntry[]): string;

/** monsters.generated.ts's full file text for the given distinct, order-preserved names. */
export function renderMonsterNameSource(names: string[]): string;

// ---------------------------------------------------------------------------
// scripts/generate-monster-catalog.ts (NEW — Node script, fs I/O only)
// ---------------------------------------------------------------------------
// Reads every *.gif filename directly under public/monster/ (readdir, no recursion),
// calls buildMonsterCatalogEntries(filenames), then writes:
//   - src/modules/game-rules/monster-catalog.generated.ts  (renderMonsterCatalogSource)
//   - src/lib/types/monsters.generated.ts                  (renderMonsterNameSource, over the
//     distinct names found in the built entries)
// No exports; run via `npm run generate:monster-catalog`.

// ---------------------------------------------------------------------------
// src/modules/game-rules/monster-catalog.ts (EDIT — rework)
// ---------------------------------------------------------------------------
import type { Monster } from '@/lib/types';
import { MAP_COLS, MAP_ROWS } from '@/lib/types';
import { MONSTER_CATALOG } from './monster-catalog.generated';
import type { MonsterCatalogEntry } from './monster-catalog.types';

export { MONSTER_CATALOG };

export function getNonBossCandidatesByLevel(level: number): MonsterCatalogEntry[];
export function getBossCandidates(): MonsterCatalogEntry[];
/** First MONSTER_CATALOG entry at `level`, in catalog order (deterministic, no randomness) —
 *  for non-gameplay, decorative consumers like LobbyBackground. */
export function getFirstMonsterAtLevel(level: number): MonsterCatalogEntry | undefined;
/** Assembles a runtime Monster: missing catalog `attack` falls back to `idle` (Phase 1 keeps
 *  Monster.sprite.attack required); death is always the shared sprite. */
export function toMonster(entry: MonsterCatalogEntry): Monster;

/** Unchanged signature. Internals: roll level(s) exactly as today (30% big-monster chance,
 *  25% level-4-vs-3 split, 60/40 little split, 70/30 one-vs-two little monsters), then for each
 *  rolled level pick uniformly among getNonBossCandidatesByLevel(level); if that level has zero
 *  candidates, retry the sibling level (3<->4 for big, 1<->2 for little); if both are empty, skip
 *  that monster slot (never throws, never returns undefined — may return []). Same name-based
 *  dedupe as today. */
export function generateMonsters(x: number, y: number): Monster[];

/** Uniform pick among getBossCandidates(); undefined if that pool is empty (caller falls back
 *  to generateMonsters at the center tile's own coordinates, which is always within the
 *  distance <= 1 bucket). */
export function pickBossMonster(): Monster | undefined;

// ---------------------------------------------------------------------------
// src/modules/game-rules/map-generation.ts (EDIT)
// ---------------------------------------------------------------------------
import { pickBossMonster, generateMonsters } from './monster-catalog';
// center tile:
//   const bossMonster = pickBossMonster();
//   map2D[y][x].monsters = bossMonster ? [bossMonster] : generateMonsters(x, y);
//   (generateMonsters(centerX, centerY) is itself the distance <= 1 big-monster roll, since the
//   center's own Manhattan distance to itself is 0, which falls in the <= 1 bucket.)
// Monster branch (non-center tiles):
//   const monsters = generateMonsters(x, y);
//   if (monsters.length === 0) { assign Resource via generateTileResources(distance, settings.baseResourceAmount); }
//   else { map2D[y][x].monsters = monsters; }

/** Extracted from the existing inline Resource-branch logic (lines 42-61 today); used by both
 *  the normal Resource branch and the new Monster-tile-degrades-to-Resource fallback. Takes only
 *  the one settings field this logic reads (not the whole GameSettings, per interface
 *  segregation). Same distance-gated 1-or-2-resource-type roll as today, byte-for-byte behavior
 *  preserved. */
function generateTileResources(distance: number, baseResourceAmount: number): IslandResource[];

// ---------------------------------------------------------------------------
// src/modules/game-rules/index.ts (EDIT)
// ---------------------------------------------------------------------------
// Remove: export { MONSTER_DATA } from './monster-catalog';
// Add:    export { MONSTER_CATALOG, getFirstMonsterAtLevel, toMonster } from './monster-catalog';

// ---------------------------------------------------------------------------
// src/modules/lobby/components/LobbyBackground/LobbyBackground.map.ts (EDIT)
// ---------------------------------------------------------------------------
import { getFirstMonsterAtLevel, toMonster } from '@/modules/game-rules';
import type { MonsterCatalogEntry } from '@/modules/game-rules'; // re-exported type, or import from the module's own index if not re-exported — see Notes

const MONSTER_ISLAND_LEVEL = 4;
// Defense-in-depth only: used if getFirstMonsterAtLevel(4) ever returns undefined (catalog
// corrupted). Never reached while the seed guarantee holds.
const LOBBY_MONSTER_FALLBACK: MonsterCatalogEntry = {
  name: 'Minotaur',
  level: 4,
  isBoss: true,
  sprite: { idle: '/monster/boss-minotaur-lvl4-idle.gif', attack: '/monster/boss-minotaur-lvl4-attack.gif' },
};

export function createMonsterIslandMonster(): Monster {
  const entry = getFirstMonsterAtLevel(MONSTER_ISLAND_LEVEL) ?? LOBBY_MONSTER_FALLBACK;
  return toMonster(entry);
}
```

### Note on the `MonsterCatalogEntry` type import above
`monster-catalog.types.ts` is not currently re-exported through `game-rules/index.ts`'s public API (only data/functions are, per the module-boundary convention of exporting the few things another module needs, not every internal type). implementer-a decides, while wiring `LobbyBackground.map.ts`, whether to add `export type { MonsterCatalogEntry } from './monster-catalog.types';` to `game-rules/index.ts` (needed for the fallback literal's type annotation) — this is a one-line addition to the same `index.ts` edit already in the File plan, not a new file.

## Phases
### Phase 1: Catalog, types, spawn rules (this plan, detailed)
1. `monster-catalog.types.ts`, `monster-catalog.generated.ts` (literal seed data), `monsters.generated.ts`, `monsters.ts` edit — the type layer first, nothing depends on it yet. (implementer-a)
2. `monster-catalog-generator.ts` (pure parser/renderer) + its test. (implementer-a, tester-a) — **sonnet** (parsing/regex correctness, triage override).
3. `scripts/generate-monster-catalog.ts` + `package.json` script entry; run it once against `public/monster/` and confirm the generated files it produces match step 1's literals byte-for-byte (if they don't, step 1's literals were wrong, not the script). (implementer-a) — **sonnet**.
4. `monster-catalog.ts` rework (`getNonBossCandidatesByLevel`, `getBossCandidates`, `getFirstMonsterAtLevel`, `toMonster`, `pickBossMonster`, `generateMonsters`) + its test rewrite. (implementer-a, tester-a) — **sonnet** (game-rule reducer touching multiplayer-synced spawn logic, triage override).
5. `map-generation.ts` rework (`generateTileResources` extraction, center-tile boss pick, Monster-degrades-to-Resource) + new test file. (implementer-a, tester-a) — **sonnet**.
6. `game-rules/index.ts` edit, `LobbyBackground.map.ts` edit, `LobbyBackground.map.test.ts` edit. (implementer-a, tester-a) — **sonnet** (LobbyBackground's existing "no `AnimatedMonster`/no `island-tile-slots` import" lint-by-test rules must keep passing).
7. `docs/architecture/game-mechanics.md:31` and `docs/architecture/systems-and-visuals.md:21-22` updated (mandatory, same phase — CLAUDE.md docs-sync rule): replace the "fixed special case, not subject to any roll" and "`MONSTER_DATA`" language per the File plan rows above. (docs-sync)
8. Full-repo `npm run typecheck`, `npm run lint`, `npm test`; fix anything step 1-6 broke outside the files above before marking the phase done.

Model escalation: steps 1-6 all require sonnet (triage overrides `implementer-a=sonnet`, `tester-a=sonnet` for this task; game-rule/spawn-logic risk per triage's "Why this tier").

### Phase 2: Combat/rendering wiring for the optional attack (outline only)
Make `Monster.sprite.attack` genuinely optional; update `AnimatedMonster.hook.ts`, `LobbyBackground.monster.hook.ts`/`.map.ts` (wander logic), `MonsterCombatDialog.map.ts`, `MonsterAttackScreen.tsx`, `MonsterSelectionDialog.map.ts`, `CombatDialog.map.ts` to skip the attack animation/step when absent instead of falling back to idle. `docs-sync` updates `systems-and-visuals.md` for the skip behavior.

### Phase 3: Testbed uploader (outline only)
`MonsterSpriteUploader` component (per ui-design.md's Spec/Final spec) + an upload API route (shape decided by architect-a at that phase, following `tile-fog-variants`'s single-`POST` precedent unless there's a reason to split) that writes the GIFs into `public/monster/` and re-runs this phase's generator functions to rewrite the two generated files. Registers in `src/testbed/registry.ts` under "Dev tools".

## Test plan
- tester-a (logic, first):
  - `monster-catalog-generator.test.ts`: `parseMonsterSpriteFilename` — valid idle/attack filenames, `boss-` prefix detection, rejects non-`.gif`, rejects out-of-range level (`lvl0`, `lvl5`), rejects malformed names; `buildMonsterCatalogEntries` — drops a name+level with no idle file, keeps one with only idle, merges seed entries when a seed file is missing from the input list, doesn't duplicate a seed already present in the input; `renderMonsterCatalogSource`/`renderMonsterNameSource` produce text that `JSON.parse`/`eval`-free static assertions can check (e.g. contains each entry's `idle` path, no trailing syntax errors — assert by writing to a temp string and checking it's valid by re-parsing with TypeScript's own parser or a simple regex on the expected shape).
  - `monster-catalog.test.ts` (rewrite): `MONSTER_CATALOG` contains all 4 seed entries with `isBoss` matching (only Minotaur true); `getNonBossCandidatesByLevel`/`getBossCandidates` filter correctly; `getFirstMonsterAtLevel(4)` returns Minotaur and is stable across repeated calls; `generateMonsters` — never duplicates a name on one tile (existing test, keep), only returns levels valid for the tile's distance (existing, keep), can include level 3/4 at center/mid-ring (existing, keep), and the new case: with `MONSTER_CATALOG` empty at a level (mock the module to return an empty candidate list for level 1), the little-monster roll falls back to level 2 and never throws; `pickBossMonster` returns a monster with `isBoss` true's name, and returns `undefined` when mocked to an empty boss pool.
  - `map-generation.test.ts` (new): center tile's monster always has the seed Minotaur's name when the catalog is untouched (deterministic-today-equivalent assertion, run many iterations since `pickBossMonster`'s *selection* is probabilistic but the *pool* has one member); a Monster tile forced (via mocking `generateMonsters` to return `[]`) becomes `IslandType.Resource` with a populated `resources` array.
  - `LobbyBackground.map.test.ts` (edit): `createMonsterIslandMonster()` returns `{ name: 'Minotaur', level: 4, sprite: { idle: '/monster/boss-minotaur-lvl4-idle.gif', attack: '/monster/boss-minotaur-lvl4-attack.gif', death: '/sprites/death.gif' } }`; calling it twice returns deep-equal results (determinism); every sprite path still passes the existing `publicFileExists` check.
- tester-b (view and e2e): none in this phase (no view files touched).

## Preview states
None in this phase (no `.tsx`/view files touched).

## Risks
- **Scope creep into Phase 2/3.** The temptation to make `Monster.sprite.attack` optional "while we're in here" must be resisted — it's explicitly deferred (Decisions). If a builder does it anyway, architect-b's final review rejects it and routes the revert to implementer-a.
- **`npm test` runtime for `generateMonsters`/map-generation randomized assertions.** The existing tests already loop up to 2000x (`monster-catalog.test.ts:11,25,37-46`) — the rewritten tests should not multiply that further; keep iteration counts at today's order of magnitude.
- **Script output drift from the literal seed data in `monster-catalog.generated.ts`.** Phase 1 step 3 explicitly requires running the script once and diffing its output against the hand-written seed literals from step 1, so a parser bug is caught immediately instead of only surfacing when Phase 3's upload route runs the same code path.
- **`scripts/generate-monster-catalog.ts` is a `.ts` file, not exempt from `no-console`.** `eslint.config.mjs:106-107`'s console exemption only covers `scripts/**/*.{js,mjs}`; a `.ts` script still gets `'no-console': ['warn', { allow: ['warn', 'error'] }]` (`eslint.config.mjs:68`) under `--max-warnings 0`. Any progress/summary output in the script needs `console.warn`/`console.error`, or a `// eslint-disable-next-line no-console` comment (precedent: `scripts/balance-simulator/cli.ts:83-84`) if it must be `console.log`.

## Review (architect-b)
VERDICT: CHANGES REQUESTED

Paths/symbols spot-checked against the repo and confirmed accurate: `src/lib/types/monsters.ts:1-17`, `src/modules/game-rules/monster-catalog.ts:1-68` (incl. `MONSTER_DATA`, `generateMonsters`), `src/modules/game-rules/map-generation.ts:1-69` (center-tile hardcode at 15-24, resource roll at 42-61), `src/modules/game-rules/index.ts:4`, `src/modules/lobby/components/LobbyBackground/LobbyBackground.map.ts:4,16-17,54-58`, `src/modules/lobby/components/LobbyBackground/LobbyBackground.map.test.ts` (`createMonsterIslandMonster` tests reference `/sprites/minotaur_*.gif` and `MONSTER_DATA[4]`), `src/modules/game-rules/monster-catalog.test.ts` (`MONSTER_DATA[1..4]` tests), `public/monster/*.gif` (4 seed files present, no death variant), `public/sprites/death.gif` present, `eslint.config.mjs` `LEGACY_PATHS`/`MODULE_FILES`/`RESTRICTED_IMPORTS` (confirms `src/lib/**` legacy-exempt, `src/modules/**` and `scripts/**` fully linted, `scripts/**/*.{js,mjs}` only gets `no-console` turned off — `.ts` scripts do not), `package.json` scripts block (`tsx` used via `genkit:dev`/`genkit:watch`, confirms the `tsx` precedent), `src/app/api/tile-fog-variants/*` and `src/app/api/tile-decoration-editor/{default-elements,images}/*` all exist as cited. `LobbyBackground.monster.hook.ts` (cited only in the Phase 2 outline) exists. No invented paths found.

### Findings

**1. BLOCKING — Phase 1 is missing the mandatory same-phase docs-sync, and `progress.md` doesn't schedule it.** CLAUDE.md: "A change to game rules or architecture ... updates the relevant `docs/architecture/*.md` file in the same phase" and docs-sync is "mandatory, not optional, whenever game rules [or] architecture ... changed." Phase 1 changes exactly what `game-design.md`'s own Final spec flags: "Docs to update (docs-sync, same phase): `docs/architecture/game-mechanics.md:31` ... must change; `docs/architecture/systems-and-visuals.md:21-22` ... must reflect the new deterministic-accessor requirement once implemented." I read both lines:
   - `game-mechanics.md:31`: "The exact center tile of the map is always a solo level-4 Minotaur boss ... **not subject to ... any roll**, generated as a fixed special case." Phase 1 replaces the hardcode with `pickBossMonster()` — a roll over a pool (size 1 today, but a roll). This sentence becomes false the moment Phase 1 ships, regardless of Phase 3 content.
   - `systems-and-visuals.md:21-22`: "...monster (level 4, Minotaur)." and "Sprite paths still come from `MONSTER_DATA`." Phase 1 deletes `MONSTER_DATA` entirely (Decisions: "`MONSTER_DATA` is removed, not kept alongside `MONSTER_CATALOG`"). Line 22 is false the instant that export disappears.
   Neither doc file appears in Phase 1's File plan, and `progress.md:9-17` has no docs-sync line item for Phase 1 (only Phase 2's and Phase 3's blocks have one, `progress.md:26,37`). Fix: add `docs/architecture/game-mechanics.md` and `docs/architecture/systems-and-visuals.md` to Phase 1's File plan (Owner: docs-sync), describe the edits (boss-pool mechanism replacing "fixed special case"; `MONSTER_CATALOG`/`getFirstMonsterAtLevel` replacing `MONSTER_DATA`), and add a `docs-sync` checkbox to `progress.md`'s Phase 1 block.

**2. Citation inaccuracy inflates the evidence for keeping `Monster.sprite.attack` required.** Decisions and the Verified-context row both cite "5 files" "verified via grep for `sprite.attack`" that would break if `Monster.sprite.attack` became optional now: `AnimatedMonster.hook.ts:43`, `MonsterCombatDialog.map.ts`, `MonsterAttackScreen.tsx`, `MonsterSelectionDialog.map.ts`, `CombatDialog.map.ts`. I read each:
   - `AnimatedMonster.hook.ts:43` and `MonsterCombatDialog.map.ts:85,109,114` genuinely read `monster.sprite.attack` as a required string (one even types its param `sprite: { attack: string }`) — real blockers, correctly counted.
   - `MonsterAttackScreen.tsx:27` and `CombatDialog.map.ts:27,30` read `PLAYER_DATA[...].sprite.attack` — the **player's** sprite, unrelated to the `Monster` type. Making `Monster.sprite.attack` optional would not touch these lines.
   - `MonsterSelectionDialog.map.ts:13` reads `monster.sprite.idle`, not `.attack`, at all.
   So the real count is 2 files, not 5, and 3 of the 5 named files are irrelevant to this decision. The conclusion (keep it required in Phase 1) still holds on the 2 genuine files, so no redesign is needed — but the citation must be corrected so it doesn't misstate what would break. Fix: in Decisions and the Verified-context table, replace the 5-file list with `AnimatedMonster.hook.ts:43`, `MonsterCombatDialog.map.ts:85,109,114` only.

**3. `generateTileResources(distance, settings: GameSettings)` is wider than it needs to be.** I reread `map-generation.ts:42-61`: inside that block the only `settings` field read is `settings.baseResourceAmount` (lines 52, 57 today) — `resourceDensity` is read earlier, outside this block, to pick `islandType`. Passing the whole `GameSettings` object into an extracted helper that uses one field violates the "map/helper functions take only what they use" guidance (kiss-dry-solid, interface segregation). Fix: narrow the contract to `generateTileResources(distance: number, baseResourceAmount: number): IslandResource[]`.

**4. Minor citation drift (fold in, non-blocking):** `package.json:9-10` for `genkit:dev`/`tsx` precedent is actually lines 10-11 in the current file; `monster-catalog.test.ts` lines "71-83" for the `MONSTER_DATA[1..4]` tests are actually 69-86. Neither changes any decision.

**5. Non-blocking implementation note for implementer-a:** `scripts/generate-monster-catalog.ts` is a `.ts` file. `eslint.config.mjs`'s console exemption only covers `scripts/**/*.{js,mjs}` — a `.ts` script still gets `no-console: ['warn', { allow: ['warn','error'] }]` with `--max-warnings 0`. Any progress/summary `console.log` in the script needs `// eslint-disable-next-line no-console` (precedent: `scripts/balance-simulator/cli.ts:83-84`), or use `console.warn`/`console.error` instead. Not a plan change, just a heads-up so the implementer doesn't get a lint surprise after the script works.

### Not an issue (checked, no fix needed)
- `MonsterName` as generated const+type (not a bare union): verified 11 call sites use `MonsterName.X` as a value; a bare union would break all of them. Correct call.
- Generated catalog under `src/modules/game-rules`, types-only generated file under `src/lib/types`: confirmed no existing file under `src/lib/types` imports from `src/modules/**`; keeping the dependency direction lib→modules-free is correct and matches the stated rejected alternative.
- `scripts/` split for fs I/O: confirmed `scripts/**` is not in `LEGACY_PATHS`/`IGNORED_PATHS` and is not matched by `MODULE_FILES`, so no import-boundary restrictions apply there and the pure-parser/fs-script split is the right place to put filesystem access.
- Tile-to-resource degradation path: extraction trigger (two call sites needing the identical roll) is real and verified at the cited lines; reuses the exact existing logic, no behavior drift.
- Phase sizing (13 files, all in `game-rules`/`lib/types`/`lobby`, implementer-a/tester-a only): reasonable for a first phase of an L-tier task: logic-only, nothing for implementer-b/preview-a to do yet, matches `progress.md`'s own "none this phase" notes.

## Resubmission (architect-a)
Status reset to PROPOSED for re-review. All 5 findings folded in:
1. Added `docs/architecture/game-mechanics.md` and `docs/architecture/systems-and-visuals.md` rows (Owner: docs-sync) to the File plan, a docs-sync acceptance-criterion checkbox, and a docs-sync step in Phase 1's step list; `progress.md`'s Phase 1 block now has a `docs-sync` checkbox too.
2. Verified-context row and Decisions bullet corrected: only `AnimatedMonster.hook.ts:43` and `MonsterCombatDialog.map.ts:85,114` read `monster.sprite.attack` (line 109 there reads `PLAYER_DATA[...].sprite.attack`, included only because it's in the same block); `MonsterAttackScreen.tsx:27` and `CombatDialog.map.ts:27,30` read `PLAYER_DATA[...].sprite.attack`; `MonsterSelectionDialog.map.ts:13` reads `.sprite.idle`. None of the latter three are affected by the `Monster.sprite.attack` decision.
3. `generateTileResources` narrowed to `(distance: number, baseResourceAmount: number): IslandResource[]` in both Decisions and the Contracts block; map-generation.ts's call-site note updated to pass `settings.baseResourceAmount`.
4. `monster-catalog.test.ts` citation corrected to lines 69-86. `package.json` citation re-verified directly in this session (`cat -n package.json`): `genkit:dev` is line 9, `genkit:watch` is line 10 — the Verified-context row now cites both lines individually rather than a single imprecise range.
5. Added a Risks bullet flagging that `scripts/generate-monster-catalog.ts` (a `.ts` file) is not covered by `eslint.config.mjs`'s `scripts/**/*.{js,mjs}` console exemption, with the `console.warn`/`console.error`/eslint-disable options and the `cli.ts:83-84` precedent.

## Review (architect-b, re-review)
VERDICT: APPROVED

Re-checked all 5 findings against the resubmission:
1. Docs-sync: `docs/architecture/game-mechanics.md` and `docs/architecture/systems-and-visuals.md` rows now in the File plan (Owner: docs-sync, plan.md:71-72), a docs-sync acceptance-criterion checkbox (plan.md:16), a docs-sync step in Phase 1's step list (plan.md:267), and `progress.md:16` now has `- [ ] docs-sync (game-mechanics.md:31, systems-and-visuals.md:21-22 — mandatory, same phase)`. Confirmed by reading `progress.md`.
2. Citation correction verified by reading each file directly: `src/modules/map/components/AnimatedMonster/AnimatedMonster.hook.ts:43` reads `monster.sprite.attack` (ternary); `src/modules/combat/components/MonsterCombatDialog/MonsterCombatDialog.map.ts:65` types a param `sprite: { attack: string }`, line 85 reads `monster.sprite.attack`, line 109 reads `PLAYER_DATA[attacker.color].sprite.attack` (player, not monster, as the plan now states), line 114 reads `monster.sprite.attack`. `MonsterAttackScreen.tsx:27` and `CombatDialog.map.ts:27,30` read `PLAYER_DATA[...].sprite.attack` only. `MonsterSelectionDialog.map.ts:13` reads `.sprite.idle` only. All matches the revised Verified-context row and Decisions bullet exactly.
3. `generateTileResources(distance: number, baseResourceAmount: number): IslandResource[]` — narrowed signature confirmed in the Contracts block (plan.md:226) and Decisions (plan.md:50).
4. `package.json` re-verified in this session (`sed -n '1,15p' package.json`): `genkit:dev` is line 9, `genkit:watch` is line 10 — matches the plan's citation. `monster-catalog.test.ts` re-read: the `MONSTER_DATA` describe block runs lines 69-86 exactly, matching the corrected citation.
5. Eslint console-note already present in the Risks section (plan.md:293) — confirmed.

Extra check this round: re-ran a repo-wide grep for `MONSTER_DATA` outside the File plan's 5 listed consumers. Found one more hit, `src/modules/combat/components/MonsterSelectionDialog/MonsterSelectionDialog.fixtures.ts:5`, but it's a comment ("// MONSTER_DATA, not invented — a wrong path 404s silently in the preview"), not an import or usage — not a 6th consumer, no plan change needed. All other `MONSTER_DATA` hits are in `.claude/worktrees/*` (other tasks' isolated worktrees, not this repo's live tree).

Status: APPROVED
