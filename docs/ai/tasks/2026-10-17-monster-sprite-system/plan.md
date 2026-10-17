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

---

# Plan: Filename-driven monster sprite system — Phase 2 (optional attack animation)

Status: APPROVED
Inputs: triage.md, game-design.md (Final spec), ui-design.md (Final spec — Phase 3's uploader spec; its "UI forward note" on the boss soft-warning is Phase 3, not used here), plan.md Phase 1 (Decisions, Verified context), progress.md

## Goal and acceptance criteria
- [ ] `Monster.sprite.attack` is genuinely optional (`attack?: string`); `toMonster()` no longer substitutes `idle` for a missing catalog `attack` — a monster assembled from an idle-only catalog entry has `sprite.attack === undefined`.
- [ ] On the real map, `AnimatedMonster`'s wander/attack hook never rolls into (and never renders) the attack pose for a monster with no attack sprite: it always shows the idle sprite with normal sideways wander, every tick — no frozen, non-wandering "fake attack" tick.
- [ ] On the lobby background, `useLobbyMonster`'s wander hook has the identical guarantee for a monster with no attack sprite (defense-in-depth: the real lobby monster is always a seed/fallback entry that has an attack sprite today, but the hook accepts any `Monster` and must not crash or render `undefined` into an `<Image src>` if that ever changes).
- [ ] In `MonsterCombatDialog`, both the attack screen's monster picture and the results screen's "monster wins" pose show the monster's idle sprite when it has no attack sprite, instead of `undefined`.
- [ ] `MonsterSelectionDialog.map.ts`, `MonsterAttackScreen.tsx`, `CombatDialog.map.ts` are unchanged — re-verified in this session that none of them reads `Monster.sprite.attack` (the first reads only `.sprite.idle`; the other two read `PLAYER_DATA[...].sprite.attack`, the player's sprite, a different and still-required type).
- [ ] `npm run typecheck`, `npm run lint`, `npm test` pass full-repo.
- [ ] New preview states for the "no attack sprite" case exist and are confirmed in the browser (skill `ui-verify`): `AnimatedMonster` ("No attack sprite") and `MonsterCombatDialog` ("Attack screen — no attack sprite").
- [ ] `docs/architecture/game-mechanics.md:30,36` and `docs/architecture/systems-and-visuals.md:22` no longer describe "uses its idle sprite as the attack sprite" / an unconditional 25% attack-pose chance — they describe the skip (docs-sync, same phase, mandatory per CLAUDE.md).

## Verified context
| Symbol or file | Location | Why it matters |
|---|---|---|
| `Monster` type | `src/lib/types/monsters.ts:5-13` | `sprite.attack: string` today (Phase 1 kept it required) — becomes `attack?: string` this phase. |
| `toMonster` | `src/modules/game-rules/monster-catalog.ts:30-40` | Line 36: `attack: entry.sprite.attack ?? entry.sprite.idle` — the Phase 1 fallback this phase removes, so a Monster's `sprite.attack` can be `undefined`. |
| `MonsterCatalogEntry.sprite.attack` | `src/modules/game-rules/monster-catalog.types.ts:110-118` (Phase 1) | Already optional — pre-assembly shape is unchanged; only `toMonster`'s assembly step changes. |
| `useAnimatedMonster` | `src/modules/map/components/AnimatedMonster/AnimatedMonster.hook.ts:1-57` | Line 20: `const currentlyAttacking = Math.random() < 0.25;` — unconditional, rolled every tick. Line 43: `monster.sprite.attack` read unconditionally as a `string`. Both change. |
| `AnimatedMonster.hook.test.ts` | `src/modules/map/components/AnimatedMonster/AnimatedMonster.hook.test.ts:1-148` | `mockMonster` has both idle and attack; every existing test keeps passing unchanged (same `Math.random()` call count/order when an attack sprite exists) — new test added for the no-attack case. |
| `useLobbyMonster`, `rollWander` | `src/modules/lobby/components/LobbyBackground/LobbyBackground.monster.hook.ts:1-51` | Line 17-21: `rollWander()` takes no args, unconditionally checks `Math.random() < MONSTER_ATTACK_CHANCE`. Called at line 43 inside the wander `setInterval` (mount-only, deps `[]`, line 41-48). |
| `toLobbyMonsterViewModel` | `src/modules/lobby/components/LobbyBackground/LobbyBackground.map.ts:87-98` | Line 89: `spriteSrc: wander.isAttacking ? monster.sprite.attack : monster.sprite.idle` — reads the now-optional field unconditionally. |
| `LobbyBackground.monster.hook.test.ts` | `src/modules/lobby/components/LobbyBackground/LobbyBackground.monster.hook.test.ts:1-187` | `queueRandomDraws` doc comment (lines 18-22) states the exact call order: "one draw for the wander interval on mount; per step, one draw for the attack roll and, when not attacking, one draw for the offset." Existing tests all use a `MONSTER` fixture with both sprites (lines 10-14) — unaffected. New test needed: with no attack sprite, a step consumes only the offset draw, never the attack-roll draw, and `isAttacking` is never true no matter how low the roll. |
| `toMonsterCombatViewModel`, `toMonsterAttackViewModel`, `toMonsterResultsViewModel` | `src/modules/combat/components/MonsterCombatDialog/MonsterCombatDialog.map.ts:12-154` | Line 65 types its `monster` param `sprite: { attack: string }`; line 85 `sprite: monster.sprite.attack,`; line 99 types its `monster` param `sprite: { death: string; attack: string }`; line 114 `: monster.sprite.attack`. All four change. Line 71 (`attackerSprite = PLAYER_DATA[attacker.color].sprite.attack`) and line 109 (same, inside the results function) read the **player's** sprite — unaffected, re-verified by reading the file in this session. |
| `MonsterCombatDialog.types.ts` | `src/modules/combat/components/MonsterCombatDialog/MonsterCombatDialog.types.ts:23-47` | `MonsterAttackViewModel.monster.sprite: string` and `MonsterResultsViewModel.monster.sprite: string \| null` are already plain, pre-resolved strings — **no change needed here**; only the internal param types inside `.map.ts` narrow to allow `attack?: string`. |
| `MonsterAttackScreen.tsx:27`, `CombatDialog.map.ts:26-30` | read in full this session | Both read only `PLAYER_DATA[...].sprite.attack` (`PlayerSprite`, a separate always-required type) — confirmed no `Monster.sprite.attack` read. No change. |
| `MonsterSelectionDialog.map.ts:13` | read in full this session | `sprite: monster.sprite.idle,` only. No change. |
| `MonsterCombatDialog.fixtures.ts` | `src/modules/combat/components/MonsterCombatDialog/MonsterCombatDialog.fixtures.ts:1-123` | `baseMonster` (lines 68-71) has both sprites. New fixtures needed for the no-attack case, reused by `.map.test.ts` and the new preview state (DRY). |
| `AnimatedMonster.preview.tsx` | `src/modules/map/components/AnimatedMonster/AnimatedMonster.preview.tsx:1-50` | 4 states today (Lancer/Bear/Ogre/Minotaur), all with both sprites, using pre-Phase-1 literal `/sprites/*_idle.gif` paths (unaffected — these are just preview literals, not the generated catalog). New state needed: a monster with no `attack` key in its `sprite` object. |
| `MonsterCombatDialog.preview.tsx` | `src/modules/combat/components/MonsterCombatDialog/MonsterCombatDialog.preview.tsx:1-102` | 5 states today, all built from fixtures that have both sprites. New state needed, built from the new fixture. |
| `combat-monster-resolve.reducer.ts:31` | read in full this session | `sprite: monster.sprite.death` only — the one other `game-rules` file touching `monster.sprite`, confirmed unaffected by this change. |
| `eslint.config.mjs` | grepped this session | No `react-hooks/exhaustive-deps` rule configured — adding a `monster.sprite.attack` read inside an effect with `deps: []` in `AnimatedMonster.hook.ts`/`LobbyBackground.monster.hook.ts` raises no lint warning. |

## Decisions
- **`Monster.sprite.attack` becomes optional (`attack?: string`); `toMonster()` stops defaulting it to `idle`.** This is the real "no attack" signal Phase 1 deferred (plan.md Phase 1 Decisions: "make it optional in Phase 2"). Rejected: keep the Phase 1 fallback forever — it doesn't just fail to signal "skip," it actively produces a visible glitch on the map: `AnimatedMonster.hook.ts`'s attack-pose `styleTransform` drops `translateX` (line 47-51), so a monster whose `sprite.attack` silently resolves to its idle image would render that same idle image but **frozen in place** (no sideways wander) for one 3–5.5s tick whenever the 25% roll hits — a stutter, not a graceful skip. Confirmed by reading `AnimatedMonster.hook.ts:43-51` in this session.
- **"Skip" means two different things per consumer, decided by whether the consumer is an animation loop or a single static picture:**
  - **Animation loops (`AnimatedMonster.hook.ts`, `LobbyBackground.monster.hook.ts`):** skip the *roll* itself — a monster with no attack sprite never transitions into the attacking state, so it always wanders normally, every tick, forever. Implemented by short-circuiting the attack-chance `Math.random()` call with `canAttack &&`, not by rolling as before and discarding the result.
  - **Static dialog pictures (`MonsterCombatDialog.map.ts`'s two view-model builders):** there is no animation to skip — these each render one fixed image per screen. "Skip the attack animation" here means "show the idle picture instead," i.e. `monster.sprite.attack ?? monster.sprite.idle` at the point each view model is built.
  - Rejected: one uniform rule ("always fall back to idle, same as Phase 1") for every consumer — covered by the bullet above; it's indistinguishable from Phase 1's shipped behavior for the two static-picture consumers, but reintroduces the map stutter for both animation loops.
- **The attack-chance `Math.random()` call is skipped entirely (not called and discarded) when the monster has no attack sprite**, in both `AnimatedMonster.hook.ts` and `LobbyBackground.monster.hook.ts`. This changes the random-draw count/order for a no-attack monster (one draw per tick instead of two) but leaves every existing test's draw sequence unchanged, because all of today's fixtures have both sprites. Rejected: always call `Math.random()` for the attack roll and ignore a `true` result when `!canAttack` — wastes a draw for no behavioral benefit and makes the no-attack test cases need to queue (and ignore) an extra draw per step for no reason.
- **`canAttack` is computed once per mount, inside the existing `useEffect`, not added to its dependency array.** Both hooks' wander/animation timers are deliberately mount-only ("one interval drawn on mount," `systems-and-visuals.md:22`); the `monster` prop is built once per component instance in both call sites (`AnimatedMonster({ monster })`'s prop, and `LobbyBackground.tsx`'s `const MONSTER = createMonsterIslandMonster();`), so `canAttack` cannot change during the component's lifetime in current usage. Rejected: `[canAttack]` in the deps array — would restart the timer on a change that never happens in practice, and changes the documented "one interval drawn on mount" behavior for no reason.
- **Implementation deviation (implementer-a): `canAttack` is computed at render time and the effect deps are `[canAttack]`, not `[]`.** `react-hooks/exhaustive-deps` is active in this repo (the Verified context row claiming it is not configured was wrong), so reading `monster.sprite.attack` inside a `[]` effect fails `eslint --max-warnings 0`. `canAttack` is a boolean that is constant for a component's lifetime, so the timer still starts once on mount; behaviour is unchanged. Applies to `AnimatedMonster.hook.ts` and `LobbyBackground.monster.hook.ts`.
- **`MonsterCombatDialog.types.ts` is not touched.** `MonsterAttackViewModel.monster.sprite` and `MonsterResultsViewModel.monster.sprite` are already plain, already-resolved `string`/`string | null` — the optionality is resolved inside `.map.ts` before it reaches the view model, so the public contract the `.tsx` screens consume doesn't change. Rejected: propagate `attack?: string` into the view-model types and let `MonsterAttackScreen.tsx`/`MonsterResultsScreen.tsx` do the `?? idle` themselves — moves a map-layer concern into the view layer for no reason, and both `.tsx` files are otherwise untouched this phase (component-architecture: `.tsx` renders, it doesn't resolve fallbacks).
- **New fixtures over new types.** `MonsterCombatDialog.fixtures.ts` gets one new `Monster` literal with no `attack` key and two new exported `GameState` fixtures built from it (one `phase: 'rolling'`, one `phase: 'results'`/monster-wins) — reused by `.map.test.ts` and the new preview state, instead of inlining a one-off object in each. Matches the existing fixture-per-scenario pattern already in the file.

## File plan
| File | New / Edit | Responsibility | Owner |
|---|---|---|---|
| `src/lib/types/monsters.ts` | edit | `Monster.sprite.attack` → `attack?: string` | implementer-a |
| `src/modules/game-rules/monster-catalog.ts` | edit | `toMonster()`: `attack: entry.sprite.attack` (no `?? idle`); update its doc comment | implementer-a |
| `src/modules/game-rules/monster-catalog.test.ts` | edit | Replace the "falls back to the idle sprite for attack" `toMonster` test with one asserting `sprite.attack` is `undefined` when the entry has none | tester-a |
| `src/modules/map/components/AnimatedMonster/AnimatedMonster.hook.ts` | edit | Compute `canAttack` once per mount; short-circuit the attack roll; resolve `spriteSrc` with `?? monster.sprite.idle` | implementer-a |
| `src/modules/map/components/AnimatedMonster/AnimatedMonster.hook.test.ts` | edit | New test: no-attack-sprite monster never shows the attack sprite and always has `translateX` in its transform, however low the mocked `Math.random()` value | tester-a |
| `src/modules/lobby/components/LobbyBackground/LobbyBackground.monster.hook.ts` | edit | `rollWander(canAttack: boolean)`; compute `canAttack` once per mount inside the effect | implementer-a |
| `src/modules/lobby/components/LobbyBackground/LobbyBackground.map.ts` | edit | `toLobbyMonsterViewModel`'s `spriteSrc` resolves with `?? monster.sprite.idle` | implementer-a |
| `src/modules/lobby/components/LobbyBackground/LobbyBackground.monster.hook.test.ts` | edit | New test: with a no-attack monster, a step consumes only the offset draw (never the attack-roll draw) and `spriteSrc`/transform always stay in the idle/wander shape | tester-a |
| `src/modules/lobby/components/LobbyBackground/LobbyBackground.map.test.ts` | edit | New test: `toLobbyMonsterViewModel` with `wander.isAttacking: true` and a monster with no attack sprite returns the idle sprite, not `undefined` | tester-a |
| `src/modules/combat/components/MonsterCombatDialog/MonsterCombatDialog.map.ts` | edit | Widen `toMonsterAttackViewModel`'s and `toMonsterResultsViewModel`'s `monster` param types to `attack?: string` (add `idle: string`); resolve both read sites with `?? monster.sprite.idle` | implementer-a |
| `src/modules/combat/components/MonsterCombatDialog/MonsterCombatDialog.fixtures.ts` | edit | Add `monsterWithNoAttackSprite` and two new exported `GameState` fixtures built from it (`attackScreenMonsterNoAttackSprite`, `resultsMonsterWinsNoAttackSprite`) | implementer-a |
| `src/modules/combat/components/MonsterCombatDialog/MonsterCombatDialog.map.test.ts` | edit | New tests: attack screen's `monster.sprite` falls back to idle when no attack sprite; results screen's monster-wins `monster.sprite` falls back to idle when no attack sprite | tester-a |
| `src/modules/map/components/AnimatedMonster/AnimatedMonster.preview.tsx` | edit | New state "No attack sprite" (sprite object with no `attack` key) | preview-a |
| `src/modules/combat/components/MonsterCombatDialog/MonsterCombatDialog.preview.tsx` | edit | New state "Attack screen — no attack sprite", built from `attackScreenMonsterNoAttackSprite` | preview-a |
| `docs/architecture/game-mechanics.md` | edit | Line 30: sprites "have a chance to play their attack animation" → gated on having one, skipped otherwise. Line 36: "A monster with no attack GIF uses its idle sprite as the attack sprite (`toMonster`)" → describe the skip instead | docs-sync |
| `docs/architecture/systems-and-visuals.md` | edit | Line 22: the lobby monster's "25% chance ... to show the attack pose instead of wandering" gains "skipped entirely (always wanders) if the monster has no attack sprite" | docs-sync |

No `implementer-b` work this phase: no `.tsx`/`.styles.ts` file changes — `AnimatedMonster.tsx`, `LobbyBackground.tsx`, `MonsterAttackScreen.tsx`, `MonsterResultsScreen.tsx` are all unchanged (they render already-resolved strings; the resolution happens in `.hook.ts`/`.map.ts`). No `tester-b` work: no view/e2e behavior changes to assert beyond what the new preview states make visually checkable.

## Contracts
```ts
// ---------------------------------------------------------------------------
// src/lib/types/monsters.ts (EDIT)
// ---------------------------------------------------------------------------
export type Monster = {
  name: MonsterName;
  level: number;
  sprite: {
    idle: string;
    attack?: string; // undefined when the catalog entry has no uploaded attack.gif
    death: string;
  };
};

// ---------------------------------------------------------------------------
// src/modules/game-rules/monster-catalog.ts (EDIT — toMonster only)
// ---------------------------------------------------------------------------
/** Passes the catalog's optional attack sprite through unresolved; callers decide how to
 *  skip the attack step when it's absent (see AnimatedMonster.hook.ts, LobbyBackground
 *  .monster.hook.ts/.map.ts, MonsterCombatDialog.map.ts). */
export function toMonster(entry: MonsterCatalogEntry): Monster {
  return {
    name: entry.name,
    level: entry.level,
    sprite: {
      idle: entry.sprite.idle,
      attack: entry.sprite.attack, // no `?? entry.sprite.idle` fallback anymore
      death: SHARED_DEATH_SPRITE,
    },
  };
}

// ---------------------------------------------------------------------------
// src/modules/map/components/AnimatedMonster/AnimatedMonster.hook.ts (EDIT)
// ---------------------------------------------------------------------------
// Inside the existing useEffect(() => { ... }, []):
//   const canAttack = Boolean(monster.sprite.attack);
//   const animationInterval = setInterval(() => {
//     const currentlyAttacking = canAttack && Math.random() < 0.25;
//     ... (unchanged branches below; `isAttacking` can now only ever become true when canAttack)
//   }, Math.random() * 2500 + 3000);
//
// After the effect (render-time), unchanged signature, new body:
//   const spriteSrc = state.isAttacking
//     ? (monster.sprite.attack ?? monster.sprite.idle) // defense-in-depth; isAttacking implies attack is defined
//     : monster.sprite.idle;
// AnimatedMonsterState / useAnimatedMonster's exported signature is unchanged.

// ---------------------------------------------------------------------------
// src/modules/lobby/components/LobbyBackground/LobbyBackground.monster.hook.ts (EDIT)
// ---------------------------------------------------------------------------
function rollWander(canAttack: boolean): WanderRoll {
  if (canAttack && Math.random() < MONSTER_ATTACK_CHANCE) return { isAttacking: true };
  return { isAttacking: false, offsetPercent: Math.round(randomWithin(MONSTER_WANDER_OFFSET_RANGE)) };
}

export function useLobbyMonster(monster: Monster): LobbyMonsterViewModel {
  const [wander, setWander] = useState<MonsterWanderState>(INITIAL_WANDER);

  useEffect(() => {
    const canAttack = Boolean(monster.sprite.attack);
    const wanderTimer = setInterval(() => {
      const roll = rollWander(canAttack);
      setWander((previous) => applyWanderRoll(previous, roll));
    }, randomWithin(MONSTER_WANDER_INTERVAL_MS));

    return () => clearInterval(wanderTimer);
  }, []); // unchanged deps array — see Decisions

  return toLobbyMonsterViewModel(monster, wander);
}

// ---------------------------------------------------------------------------
// src/modules/lobby/components/LobbyBackground/LobbyBackground.map.ts (EDIT — toLobbyMonsterViewModel only)
// ---------------------------------------------------------------------------
export function toLobbyMonsterViewModel(monster: Monster, wander: MonsterWanderState): LobbyMonsterViewModel {
  return {
    spriteSrc: wander.isAttacking ? (monster.sprite.attack ?? monster.sprite.idle) : monster.sprite.idle,
    style: { /* unchanged */ },
  };
}

// ---------------------------------------------------------------------------
// src/modules/combat/components/MonsterCombatDialog/MonsterCombatDialog.map.ts (EDIT — two internal functions only)
// ---------------------------------------------------------------------------
function toMonsterAttackViewModel(
  attacker: { id: number; name: string; color: PlayerColor; attackPower: number },
  monster: { name: string; level: number; sprite: { idle: string; attack?: string } } | undefined,
  hasDecideCard: boolean,
  hasOvercomeCard: boolean,
  hasWarChiefCard: boolean,
  canUseCard: boolean,
): MonsterAttackViewModel {
  // ...unchanged body except:
  //   sprite: monster.sprite.attack ?? monster.sprite.idle,
}

function toMonsterResultsViewModel(
  attacker: { id: number; name: string; color: PlayerColor },
  monster: { name: string; sprite: { idle: string; death: string; attack?: string } } | undefined,
  attackerRolls: number[],
  monsterRolls: number[],
  winnerId: number | null,
): MonsterResultsViewModel {
  // ...unchanged body except:
  //   const monsterSprite = monster
  //     ? isPlayerWinner
  //       ? monster.sprite.death
  //       : (monster.sprite.attack ?? monster.sprite.idle)
  //     : null;
}
// MonsterCombatDialog.types.ts is NOT edited — MonsterAttackViewModel/MonsterResultsViewModel's
// `monster.sprite` fields stay plain, already-resolved string/string|null.

// ---------------------------------------------------------------------------
// src/modules/combat/components/MonsterCombatDialog/MonsterCombatDialog.fixtures.ts (EDIT — additions only)
// ---------------------------------------------------------------------------
const monsterWithNoAttackSprite: Monster = {
  name: MonsterName.Bear,
  level: 2,
  sprite: { idle: '/sprites/bear_idle.gif', death: '/sprites/death.gif' }, // no `attack` key
};

/** Attack screen — monster has no attack sprite; the shown picture must fall back to idle. */
export const attackScreenMonsterNoAttackSprite: GameState /* = buildGameState({ ...,
  monsterCombatState: { ...baseMonsterCombat, monster: monsterWithNoAttackSprite,
    attackerRolls: [], monsterRolls: [], winnerId: null, phase: 'rolling' } }) */;

/** Results — monster wins, no attack sprite; the "monster wins" pose must fall back to idle. */
export const resultsMonsterWinsNoAttackSprite: GameState /* = buildGameState({ ...,
  monsterCombatState: { ...baseMonsterCombat, monster: monsterWithNoAttackSprite,
    attackerRolls: [2, 2, 1], monsterRolls: [5, 4, 3], winnerId: null, phase: 'results' } }) */;
```

## Phases
### Phase 2: Optional attack animation (this plan, detailed)
1. `src/lib/types/monsters.ts` — `Monster.sprite.attack` → optional. (implementer-a) — **sonnet** (type change ripples through typecheck across the repo; L-tier escalation already in effect per triage).
2. `monster-catalog.ts`'s `toMonster()` rework + its test. (implementer-a, tester-a) — **sonnet**.
3. `AnimatedMonster.hook.ts` rework + its hook test. (implementer-a, tester-a) — **sonnet**.
4. `LobbyBackground.monster.hook.ts` + `LobbyBackground.map.ts` rework + both their tests. (implementer-a, tester-a) — **sonnet**.
5. `MonsterCombatDialog.map.ts` rework + new fixtures + `.map.test.ts` additions. (implementer-a, tester-a) — **sonnet**.
6. New preview states: `AnimatedMonster.preview.tsx` ("No attack sprite"), `MonsterCombatDialog.preview.tsx` ("Attack screen — no attack sprite", from the new fixture). (preview-a) — **sonnet** (triage override).
7. `docs/architecture/game-mechanics.md:30,36` and `docs/architecture/systems-and-visuals.md:22` updated (mandatory, same phase — CLAUDE.md docs-sync rule). (docs-sync)
8. Full-repo `npm run typecheck`, `npm run lint`, `npm test`; `ui-verify` screenshot of the two new preview states (`/testbed` → "Game map" → Animated Monster → "No attack sprite"; "Combat" → Monster Combat Dialog → "Attack screen — no attack sprite"), confirming the idle sprite renders where the attack sprite would have.

Model escalation: all of steps 1-6 require sonnet (triage overrides `implementer-a=sonnet`, `tester-a=sonnet`, `preview-a=sonnet` for this task).

## Test plan
- tester-a (logic, first):
  - `monster-catalog.test.ts`: `toMonster(entry without attack)` → `sprite.attack` is `undefined` (not the idle path); `toMonster(entry with attack)` unchanged (still returns that exact path).
  - `AnimatedMonster.hook.test.ts`: new case — a monster with no `sprite.attack`, `Math.random()` mocked to always return `0` (would trigger "attacking" under the old unconditional roll): `spriteSrc` stays `monster.sprite.idle` across multiple interval fires, and `styleTransform` always contains `translateX` (never the flip-only attack-pose shape). All 7 existing cases (idle/attack switch, boundary, flip tracking, interval delay, unmount cleanup) keep passing unchanged since `mockMonster` has both sprites.
  - `LobbyBackground.monster.hook.test.ts`: new case — a monster with no `sprite.attack`, queue a single low draw per step (`queueRandomDraws([0, 0.0], 0.5)`): `spriteSrc` stays idle and the transform keeps its wander offset (not the flip-only attack shape), proving the attack-roll draw was never consumed (one draw per step, not two — verified by the exact draw count needed to reach a specific offset). All 11 existing cases keep passing unchanged since `MONSTER` has both sprites.
  - `LobbyBackground.map.test.ts`: new case — `toLobbyMonsterViewModel(monsterWithNoAttack, { isAttacking: true, ... })` returns `spriteSrc === monster.sprite.idle`, not `undefined`.
  - `MonsterCombatDialog.map.test.ts`: new cases — `toMonsterCombatViewModel(attackScreenMonsterNoAttackSprite, ...)`'s attack screen has `screen.data.monster?.sprite === monsterWithNoAttackSprite.sprite.idle`; `toMonsterCombatViewModel(resultsMonsterWinsNoAttackSprite, ...)`'s results screen has `screen.data.monster?.sprite === monsterWithNoAttackSprite.sprite.idle` (the monster-wins pose). All existing cases (built from `baseMonster`, which has both sprites) keep passing unchanged.
- tester-b (view and e2e): none this phase — no `.tsx` behavior changes to assert beyond the preview states, which are verified visually (`ui-verify`), not via RTL.

## Preview states
- `AnimatedMonster`: new state "No attack sprite" — a monster literal with `sprite: { idle: '/sprites/bear_idle.gif', death: '/sprites/death.gif' }` (no `attack` key). Visually: the sprite only ever wanders side to side, never freezes into the flip-only attack pose (give it time in the browser across a few wander ticks, or temporarily note the 3-5.5s interval when checking).
- `MonsterCombatDialog`: new state "Attack screen — no attack sprite", rendered from `attackScreenMonsterNoAttackSprite`. Visually: the monster's picture in the attack screen is its idle sprite (not broken/missing).

## Risks
- **Random-draw-count change for the no-attack case is easy to get backwards in a test.** `AnimatedMonster.hook.test.ts`/`LobbyBackground.monster.hook.test.ts`'s new cases must queue exactly one `Math.random()` draw per step (the offset roll), not two — queuing an extra draw "for the attack roll that doesn't happen" will desync every subsequent queued value and produce a confusing, unrelated test failure. Cross-check against `LobbyBackground.monster.hook.test.ts`'s own `queueRandomDraws` doc comment (lines 18-22) when writing the new case.
- **`MonsterCombatDialog.map.ts`'s two edited functions are internal (not exported) — tester-a must assert through the exported `toMonsterCombatViewModel`, not call them directly.** Matches how every existing test in that file already works (verified in this session: `MonsterCombatDialog.map.test.ts` never imports `toMonsterAttackViewModel`/`toMonsterResultsViewModel` directly).
- **Scope creep into Phase 3.** The testbed uploader (`MonsterSpriteUploader`) is Phase 3, not this phase — nothing here should add upload UI or an API route, even though the fixtures/previews added here will make useful manual test data once Phase 3 exists.

## Review (architect-b)
VERDICT: APPROVED

Verified every cited path/symbol/line against the repo: `src/lib/types/monsters.ts:5-13` (Monster type, matches exactly), `src/modules/game-rules/monster-catalog.ts:30-40` (`toMonster`, line 36 `attack: entry.sprite.attack ?? entry.sprite.idle` confirmed), `AnimatedMonster.hook.ts:1-57` (line 20 `Math.random() < 0.25` unconditional, line 43 `monster.sprite.attack` unconditional, lines 47-51 attack-pose transform), `AnimatedMonster.hook.test.ts` (7 `it(` cases, not 6 — fixed below), `LobbyBackground.monster.hook.ts:1-51` (`rollWander` lines 17-21, called inside the mount-only effect lines 41-48), `LobbyBackground.monster.hook.test.ts` (11 `it(` cases, not 10 — fixed below; `queueRandomDraws` doc comment at lines 18-22 matches exactly), `LobbyBackground.map.ts:62-98` (`createMonsterIslandMonster`, `toLobbyMonsterViewModel` line 89 unconditional `monster.sprite.attack`), `MonsterCombatDialog.map.ts:63-154` (line 65 `sprite: { attack: string }` param type, line 85 `monster.sprite.attack`, line 99 `sprite: { death: string; attack: string }`, line 114 `monster.sprite.attack`; lines 71 and 109 confirmed as `PLAYER_DATA[attacker.color].sprite.attack`, the player's sprite — correctly excluded from this phase's scope), `MonsterCombatDialog.types.ts:23-47` (view-model `sprite` fields are plain pre-resolved `string`/`string | null` — confirms the "types.ts not touched" decision), `MonsterAttackScreen.tsx:27` and `CombatDialog.map.ts:27,30` (both read only `PLAYER_DATA[...].sprite.attack`, unaffected), `MonsterSelectionDialog.map.ts:13` (`.sprite.idle` only, unaffected), `combat-monster-resolve.reducer.ts:31` (`monster.sprite.death` only, unaffected), `eslint.config.mjs` (no `react-hooks/exhaustive-deps` rule, confirming the deps-array decision raises no lint warning), `game-mechanics.md:30,36` and `systems-and-visuals.md:22` (text matches the plan's quotes exactly — "have a chance to play their attack animation", "A monster with no attack GIF uses its idle sprite as the attack sprite (`toMonster`)", "25% chance ... to show the attack pose instead of wandering"), `AnimatedMonster.preview.tsx` (4 states, confirmed), `MonsterCombatDialog.preview.tsx` (5 states, confirmed), `MonsterCombatDialog.fixtures.ts` (`baseMonster` at lines 69-72, one off from the cited "68-71" — trivial, not fixed, doesn't affect any decision). No invented paths found.

Challenges addressed:
- **`Monster.sprite.attack` optional**: correctly deferred from Phase 1 (plan.md:43) to here; the only consumers of the field are the ones in the File plan, verified above. No simpler option — the type must reflect that a monster can genuinely lack an attack sprite for every consumer to make a real (not fallback) decision.
- **`canAttack` short-circuit instead of roll-and-discard**: reasonable and cheaper; verified it doesn't desync any *existing* test (all current fixtures have both sprites, so the draw count/order for those cases is unchanged) and the Risks section (plan.md:581) already flags the exact trap (queuing an extra draw for the no-attack case) for the builder.
- **`monster.sprite.attack ?? monster.sprite.idle` in the two static dialog view-model builders**: correct call — these are one-shot picture renders, not animation loops, so "skip" only ever means "show idle instead." Matches `MonsterSelectionDialog`'s existing precedent of reading only `.sprite.idle` for monsters with no concept of an attack frame.
- **Frozen-frame glitch claim (Decisions, plan.md:387)**: confirmed by reading `AnimatedMonster.hook.ts:43-51` myself. Under Phase 1's `toMonster` fallback (`attack: entry.sprite.attack ?? entry.sprite.idle`), a 25%-roll "attacking" tick for a no-attack-sprite monster sets `isAttacking: true`; `spriteSrc` (line 43) then resolves to the same idle image, but `styleTransform` (lines 47-51) drops `translateX` for that tick — the sprite stops wandering and shows a static (though not technically different-looking) frame for the tick's 3-5.5s duration, while every other tick moves it. The claim is accurate: it is a real freeze, not merely "the same picture."

Findings:
1. **Non-blocking, folded in**: `AnimatedMonster.hook.test.ts` has 7 `it(` cases, not "6" (Test plan, plan.md:570); `LobbyBackground.monster.hook.test.ts` has 11, not "10" (plan.md:571). Fixed directly in the Test plan section — counts don't change any test's content or the plan's design.
2. **Non-blocking suggestion, not required**: the `monster.sprite.attack ?? monster.sprite.idle` fallback (or its mirror, `canAttack = Boolean(monster.sprite.attack)`) is repeated at 4 sites: `AnimatedMonster.hook.ts` (render-time), `LobbyBackground.map.ts:89`, and twice in `MonsterCombatDialog.map.ts` (attack + results view models). DRY's own threshold ("extract at the third copy") is technically crossed, but each occurrence is a one-line `??` with a different surrounding shape (prop default vs. object-literal field vs. ternary branch) and the four files don't share a natural import point without creating a cross-module dependency from `map`/`lobby`/`combat` onto a new shared one-liner. Leaving it inline is the simpler choice; implementer-a may extract a tiny shared helper (e.g. in `src/modules/shared`) if they find a cleaner shape while implementing, but the plan doesn't need to mandate it.
3. **Not an issue (checked)**: `MonsterCombatDialog.map.ts`'s widened internal param types (`sprite: { idle: string; attack?: string }` for the attack view model, `sprite: { idle: string; death: string; attack?: string }` for the results one) correctly add `idle` even though today's narrower types omit it — both functions need it only once the fallback is added, and narrowing to a structural subset (not the full `Monster` type) matches this file's existing style and interface segregation.
4. **Not an issue (checked)**: the deps-array decision (`canAttack` computed once per mount, not added to `[]`) is safe — both call sites build their `Monster` prop once per component instance (verified `AnimatedMonster({ monster })`'s prop and `LobbyBackground.tsx`'s module-level `const MONSTER = createMonsterIslandMonster();`), so `canAttack` cannot change mid-lifecycle today, and no `exhaustive-deps` lint rule is configured to flag the omission either way.
5. **Not an issue (checked)**: `MonsterCombatDialog.types.ts` is correctly left untouched — its view-model `sprite` fields are already-resolved `string`/`string | null`, so the optionality is fully absorbed inside `.map.ts` before it reaches the `.tsx` screens, matching the view/map boundary.
6. **Not an issue (checked)**: docs-sync rows match the current doc text exactly at `game-mechanics.md:30,36` and `systems-and-visuals.md:22` (re-read in this session, post Phase-1 edits).

Phase sizing (15 files: 1 type, 2 hooks, 2 maps + 1 catalog function, 1 fixtures file, 5 test files, 2 previews, 2 docs; implementer-a/tester-a/preview-a only, correctly no implementer-b/tester-b since no `.tsx` changes) is appropriate for a mid-size L-tier phase and matches the "pure view vs. connected" guidance — nothing here renders JSX.

Status: APPROVED

---

# Plan: Filename-driven monster sprite system — Phase 3 (testbed uploader)

Status: APPROVED
Inputs: triage.md, game-design.md (Final spec), ui-design.md (Final spec and Spec sections, plus this plan's amendment below), plan.md Phase 1/2 (Decisions, Verified context), progress.md

## Goal and acceptance criteria
Carries forward every acceptance criterion in ui-design.md's "Acceptance criteria" section (unchanged by this plan except the Level-picker ones, amended below), plus:

- [ ] `/testbed/monster-sprite-uploader` renders under "Dev tools", next to "Tile Decoration Editor" (ui-design.md, confirmed registry pattern below).
- [ ] The Level select offers only levels valid for the current Boss toggle: 1-3 when Boss is off, 1-4 when Boss is on (amends ui-design.md's "1-4 always" — see ui-design.md amendment below and Decisions).
- [ ] A single `POST /api/monster-catalog` multipart request writes the idle (+ optional attack) GIF into `public/monster/`, rescans the directory, and rewrites both generated files (`monster-catalog.generated.ts`, `monsters.generated.ts`) — no second network call for regeneration (ui-design.md Final spec point 1, resolved here as the single-call shape).
- [ ] A submit with a name+level pair that already exists in the catalog (seed or previously uploaded) is rejected with `409` and the inline duplicate error under Name; nothing is written to disk.
- [ ] The four seed rows are always present, carry a "Seed" badge, and render no delete control; this is true with zero code change beyond reading the existing `MONSTER_CATALOG`/`SEED_MONSTER_CATALOG` exports — no new "is this a seed" data needs inventing.
- [ ] `npm run typecheck`, `npm run lint` and `npm test` pass full-repo.
- [ ] `ui-verify` screenshots of the live `/testbed/monster-sprite-uploader` page confirm: the empty state's dashed-border placeholders, a picked idle GIF looping in its preview box, the boss+level-1/2 soft warning appearing/disappearing, and a successful add appending a new Catalog row with correct badges.
- [ ] `docs/architecture/systems-and-visuals.md` gains a bullet for the new tool (docs-sync, same phase) alongside its existing Icon Editor / Testbed editor bullets. `docs/architecture/game-mechanics.md` needs **no edit**: re-read in this session, `game-mechanics.md:36` already documents the level caps ("Levels are capped at 1–3 for non-boss and 1–4 for boss; a higher level is skipped with a console warning") from Phase 1's build — this phase only adds a UI/route path to reach that already-documented rule, not a new rule.

## Verified context
| Symbol or file | Location | Why it matters |
|---|---|---|
| `parseMonsterSpriteFilename`, `MONSTER_SPRITE_FILENAME` regex, `MIN_LEVEL`/`MAX_NON_BOSS_LEVEL`/`MAX_BOSS_LEVEL` | `src/modules/game-rules/monster-catalog-generator.ts:4-58` | Level caps (non-boss ≤3, boss ≤4) are **already implemented** here (module-local consts, not yet exported) — built during Phase 1's implementation, ahead of the plan text. This phase exports them instead of re-deriving them. |
| `SEED_MONSTER_CATALOG` | `monster-catalog-generator.ts:14-19` | The 4 non-deletable rows; reused directly for the Catalog list's "Seed" badge (no new seed-tracking data needed). |
| `buildMonsterCatalogEntries`, `renderMonsterCatalogSource`, `renderMonsterNameSource` | `monster-catalog-generator.ts:94-137` | Reused verbatim by the new route, exactly as `scripts/generate-monster-catalog.ts` already reuses them — this phase's route is a second caller of the same pure functions, not a reimplementation. |
| `toEntryKey` | `monster-catalog-generator.ts:60` | Module-local today (`${name}|${level}`); needed by the route's duplicate check and the Catalog list's seed lookup — exported and renamed `toCatalogEntryKey` (Decisions). |
| `MonsterCatalogEntry` | `src/modules/game-rules/monster-catalog.types.ts:3-12` | `sprite.attack` already optional — the uploader's optional Attack file maps straight onto it, no type change needed. |
| `MONSTER_CATALOG`, `getFirstMonsterAtLevel`, `toMonster` | `src/modules/game-rules/monster-catalog.ts:1-6` (re-exported) and `index.ts:4-5` | `MONSTER_CATALOG` is the catalog's initial client-side state (static import, no fetch — see Decisions); already public. |
| `scripts/generate-monster-catalog.ts` | full file, 27 lines | `listGifFilenames` (sync `readdirSync`, lines 14-21) and the two `writeFileSync` calls (lines 25-26) are the shape the new async route repeats with `fs/promises` — see Decisions on why these aren't merged into one shared fs helper. |
| `src/app/api/tile-fog-variants/route.ts` (63 lines), `upload.ts` (31 lines) | full files | Single-`POST` precedent: parse multipart fields, validate, write asset(s), append/rewrite config, return `NextResponse.json`. `MAX_UPLOAD_BYTES` (upload.ts:4) and `isGifBytes` (upload.ts:19-21) are reused directly (see next row), not re-copied. |
| `src/app/api/tile-variants/images/route.ts:8` | `import { isGifBytes, isPngBytes, MAX_UPLOAD_BYTES } from '../../tile-fog-variants/upload';` | **Confirmed existing precedent for cross-route reuse of `upload.ts`'s byte-check helpers** — a second route already imports them instead of duplicating the GIF/PNG magic-byte check. The new `/api/monster-catalog` route follows this, not the (also-existing, but separately-justified) duplicated-`toSlug`-per-module pattern below. |
| `src/modules/map/components/TileVariants/TileVariants.validate.ts:16-22` (`toSlug`) vs. `src/app/api/tile-fog-variants/upload.ts:24-30` (`toVariantId`'s inline slug body) | both read in full | **Confirmed existing precedent that an identical slug-normalizing function body is duplicated per module/route** (not extracted to a shared `@/lib` helper) — justifies this phase's own `toMonsterSpriteSlug` living in `monster-catalog-generator.ts` rather than reaching into either of these unrelated domains (map vs. fog) or inventing a new shared slug module no existing code asked for. |
| `src/app/api/icon-editor/uploads/route.ts` (66 lines) + its `route.test.ts` (204 lines) | full files | Precedent for a `File`-accepting multipart `POST` route **and** its test harness: `request.formData()` stubbed as a `Map<string, FormDataEntryValue>` cast to `FormData` (route.test.ts:41-47), `File.arrayBuffer` polyfilled with `Object.defineProperty` (route.test.ts:50-55) since jsdom's `File` lacks it. This phase's `route.test.ts` copies this harness instead of attempting undici's real multipart parser (route.test.ts:37-40 explains why that fails under jsdom). |
| `src/app/api/tile-decoration-editor/default-elements/route.ts` (67 lines) + `regenerate-source.ts` (95 lines) + `regenerate-source.test.ts` | full files | Precedent for splitting a route into "pure validate/transform" (unit-testable without fs/`Request` polyfills) + "route owns fs I/O" — this phase's `validation.ts`/`route.ts` split mirrors it. |
| `ISLAND_TILE_SLOTS_PATH` | `src/modules/map/island-tile-slots.types.ts` (exported, consumed at `default-elements/route.ts:4,60`) | Precedent for a **shared, exported path constant** reused by both a generator-adjacent module and its route, instead of each hardcoding the path string — this phase adds the equivalent `MONSTER_CATALOG_GENERATED_PATH`/`MONSTER_NAMES_GENERATED_PATH`/`MONSTER_SPRITE_PUBLIC_DIRECTORY_FS` constants, reused by both the (edited) script and the (new) route. |
| `src/testbed/registry.ts` | 112 lines; `tileDecorationEditorPreview` imported at line 49, listed at line 104 (ui-design.md cites `:49,102` — off by 2 lines from an edit since that doc was written; non-blocking, folded in below) | Import-and-list pattern for a new preview; this phase adds `monsterSpriteUploaderPreview` the same way. |
| `src/testbed/testbed.types.ts:1-17` | `PreviewState { name; render }`, `ComponentPreview { slug; title; group; states }` | The preview's exact shape. |
| `src/testbed/components/TileDecorationEditor/TileDecorationEditor.preview.tsx` (11 lines) and `src/testbed/components/IconEditor/IconEditor.preview.tsx` (67 lines) | both read in full | **Confirmed precedent: a stateful dev-tool's preview registers exactly one state** ("Editor") rendering the real connected component (`TileDecorationEditor`) or a locally-faked stand-in that avoids the real network route (`IconEditorPreviewEditor`, which never calls `IconEditor()`/the real hook/service — see `IconEditor.preview.tsx:14-17`'s own comment). This phase follows the `TileDecorationEditor` variant: `/testbed/monster-sprite-uploader` **is** this tool's real entry point (the dev-only route already 404s in production, same gate as every other such route), so the preview renders the real connected `MonsterSpriteUploader`, not a faked stand-in — see Decisions. |
| `src/testbed/components/TileDecorationEditor/TileDecorationEditorSaveRow.tsx:12` | `error: 'Could not save — see console.',` | Confirms ui-design.md's corrected citation (`:12`, not `:13`) and the generic-error copy pattern this phase's "Could not add — see console." mirrors. |
| `src/modules/map/components/AnimatedMonster/AnimatedMonster.tsx:8,20-21` | `import { MONSTER_SPRITE_SIZE_PX } from '../../island-tile-slots.types'; ... width={MONSTER_SPRITE_SIZE_PX} height={MONSTER_SPRITE_SIZE_PX}` | ui-design.md cites `:9,19-20` — off by one line (non-blocking, folded in below). Confirms the constant's import path and that it is a plain number (sizes the two live preview boxes). |
| `src/components/ui/select.tsx`, `switch.tsx`, `badge.tsx`, `input.tsx`, `label.tsx`, `button.tsx` | all exist, confirmed by `ls` | Standard shadcn primitives: `Select`/`SelectTrigger`/`SelectContent`/`SelectItem` (controlled via `value`/`onValueChange`, both strings), `Switch` (`checked`/`onCheckedChange`), `Badge` (`variant`: `default`\|`secondary`\|`destructive`\|`outline`). No new primitive needed. |
| `docs/architecture/systems-and-visuals.md:180-181` | `- **Icon Editor (...):** ...` / `- **Status: testbed-only.** ...` | Exact insertion point and the bullet format every other testbed tool follows (name+route+group, then what it writes and which dev-only route(s) it calls, then "All N routes return 404 in production"). |
| `docs/architecture/game-mechanics.md:36` | `Levels are capped at 1–3 for non-boss and 1–4 for boss; a higher level is skipped with a console warning.` | Re-read in this session: **already accurate**, written during Phase 1's build. No edit needed — confirms the Goal/acceptance-criteria line above. |
| `eslint.config.mjs:12,38,65-69,107` | `LEGACY_PATHS` (line 12; no `src/testbed/**` or `src/app/api/**` entry), `MODULE_FILES = 'src/modules/**/*.{ts,tsx}'` (line 38; does not match either folder), `no-explicit-any`/`consistent-type-imports`/`no-console: warn`/`max-lines: 150` (lines 65-69, general rules, apply to both folders), `scripts/**/*.{js,mjs}` console exemption (line 107; does not cover this phase's `.ts` edit to the script, already noted in Phase 1's Risks) | Confirms: `src/testbed/**` and `src/app/api/**` get the general rules (150-line cap, `no-console` warn) but none of `src/modules`' import-boundary restrictions — a route may import `@/modules/game-rules/...` by a deep path exactly as `scripts/generate-monster-catalog.ts` already does, with no lint violation. |
| `src/testbed/components/IconEditor/{IconEditor.tsx,.hook.ts,.types.ts,.fixtures.ts,.preview.tsx}` | full files | Structural precedent followed for `MonsterSpriteUploader`'s own file split: `View`/connected split in `.tsx` (`IconEditor.tsx:53,88-90`), hook owns all state/handlers and returns a flat view model (`IconEditor.hook.ts`), `.types.ts` holds the view model and per-row types, `.fixtures.ts` holds deterministic sample data reused by tests. |

## ui-design.md amendment (architect-a)
The Level-cap decision (triage.md, "Resolved with the user (2026-10-17): level caps") postdates ui-design.md's lock (its Final spec still says Level is always 1-4). Appended to the end of `ui-design.md`, not rewritten in place, so the approved review trail stays intact:

> ## Amendment (architect-a, Phase 3 planning — level caps)
> Triage's level-cap decision (non-boss 1-3, boss 1-4; no level 5) was resolved after this doc's Final spec was locked. Three changes, nothing else:
> 1. **Level select is Boss-dependent, not always 1-4.** Options: "1 — Little", "2 — Little", "3 — Big" when Boss is off; add "4 — Big" when Boss is on. Toggling Boss off while Level 4 is selected clamps the selection down to 3 (the picker can never show an invalid combination — same category as the dashed-border preview placeholders, a UI-level guard, not a validation error the user has to notice and fix).
> 2. **"Name/level/boss filled, ready" state** (Spec line 22) now reads: "Submit button ('Add monster') becomes enabled once Name is non-blank, Level is 1-3 (non-boss) or 1-4 (boss), and an idle file is present." (was: "Level is 1-4").
> 3. **New error copy, defense-in-depth only (unreachable via the Level select itself, same category as the existing "missing idle" error):** "Non-boss monsters go up to level 3; boss monsters go up to level 4." — inline under the Level field, `aria-describedby`-associated like the other blocking field errors.
>
> No other state, copy, token, interaction, accessibility note or acceptance criterion changes.

## Decisions
- **One `POST /api/monster-catalog`, not upload-then-regenerate.** Resolves ui-design.md's open point (Final spec item 1). Matches the `tile-fog-variants` precedent (`route.ts` does the file write and the config update in one handler) and triage's locked "regenerated on upload" wording (singular action). Rejected: two calls — no stated reason to split, and it would need the client to hold an uncommitted upload across two round-trips for no benefit.
- **The route reuses the Phase 1 generator's pure functions verbatim** (`buildMonsterCatalogEntries`, `renderMonsterCatalogSource`, `renderMonsterNameSource`), exactly as `scripts/generate-monster-catalog.ts` already does — a second caller of code that was already written to be fs-free and reusable (Phase 1's own Decisions: "Phase 3's upload route reuses them verbatim instead of re-implementing filename parsing"). No duplication introduced.
- **No shared fs helper between the script and the route.** Both do "readdir `public/monster`, filter+sort `.gif`, build entries, write 2 generated files" — about 5-8 lines each — but one runs synchronously via a `tsx` CLI invocation and the other asynchronously inside a Next route handler; no existing precedent in this codebase unifies a CLI script and a route handler's fs calls into one shared function (`tile-decoration-editor`'s `regenerate-source.ts` is purely the *string-transform* half, not the fs half, which stays separately written in each of that domain's own route). Rejected: extracting a shared `regenerateMonsterCatalog()` fs helper — below DRY's "two copies, different runtime contexts, no precedent" bar; would also need an async/sync dual API for one call site each, adding a layer with no reuse benefit.
- **Shared path constants, not re-hardcoded strings.** `MONSTER_CATALOG_GENERATED_PATH`, `MONSTER_NAMES_GENERATED_PATH`, `MONSTER_SPRITE_PUBLIC_DIRECTORY_FS` are added as exports of `monster-catalog-generator.ts` and used by both the (edited) script and the (new) route — mirrors the `ISLAND_TILE_SLOTS_PATH` precedent (exported from the types file, imported by its route) instead of each fs-touching file inventing its own path string.
- **Filename building is the exact inverse of `parseMonsterSpriteFilename`, in the same file.** `toMonsterSpriteSlug` (new) normalizes the submitted name into the regex's `[a-z0-9]+(?:-[a-z0-9]+)*` slug shape; `buildMonsterSpriteFilename(name, level, isBoss, kind)` assembles `<boss->-<slug>-lvl<N>-<kind>.gif`. Kept in `monster-catalog-generator.ts` alongside the regex and `parseMonsterSpriteFilename`, not duplicated from `TileVariants.validate.ts`'s or `tile-fog-variants/upload.ts`'s own slug functions — see the Verified-context row on the confirmed existing precedent of per-domain slug duplication; borrowing either of those would cross an unrelated domain boundary (map/fog) for no shared benefit.
- **The route never computes the display (Title Case) name itself.** After writing the sprite file(s) under their slug-built filename, the route re-scans the directory and calls `buildMonsterCatalogEntries` again — the exact same function that turns every other filename's slug into its Title Case `name` via `parseMonsterSpriteFilename`'s `toTitleCase`. The newly written entry is then looked up from that fresh scan by `(slug, level)`, guaranteeing its `name` is produced by the identical code path as every other catalog entry (seed or previously uploaded) — not a second, possibly-diverging Title-Case implementation in the route.
- **Two separate lookups, not one, because they compare different kinds of names.** `toEntryKey` is exported and renamed `toCatalogEntryKey`, body unchanged — it still does exact-string `${name}|${level}` matching, used only where both sides are already-canonical catalog names from the same generator (unchanged inside `groupFilenamesIntoEntries`/`buildMonsterCatalogEntries`, and newly reused by the Catalog list's seed-badge check, `toCatalogRowViewModels`). A new `findMonsterEntry(catalog, name, level)` is added for the route's two lookups (pre-write duplicate check, post-write response lookup), both of which compare a raw, arbitrary user-submitted `name` against the catalog — it normalizes both sides through `toMonsterSpriteSlug` instead of exact string matching, so "fire ogre" correctly collides with an existing "Fire Ogre". Rejected: reusing `toCatalogEntryKey` for the route's lookups too — it would silently treat "fire ogre" and "Fire Ogre" as different monsters, defeating the duplicate check's purpose.
- **The uploader's initial Catalog list comes from the static `MONSTER_CATALOG` import, not a fetch.** Resolves ui-design.md's second open point (Final spec item 2): the generated catalog is a build-time artifact (Phase 1's model), so `useMonsterSpriteUploader` seeds its list state from `MONSTER_CATALOG` (already a public `game-rules` export) and appends the server's returned `entry` on success — no `GET` route needed at all. Matches ui-design.md's "optimistic, not a re-fetch" requirement exactly, and is simpler than adding a list endpoint.
- **The POST response carries the written entry (`{ entry: MonsterCatalogEntry }`), not just `{ ok: true }`.** The client doesn't know the server-computed Title-Case name or the exact sprite paths before the request resolves (both are server-derived from the slug), so the optimistic Catalog row needs them from the response. Rejected: `{ ok: true }` (matches `tile-decoration-editor/default-elements`'s shape) — insufficient here because that route never changes what `name` means, it only overwrites numeric/string style values the caller already knows.
- **Errors carry an optional `field` tag (`'name' | 'level' | 'idle' | 'attack'`).** Lets the hook route a validation failure to the right inline error slot (ui-design.md's per-field error states) without string-matching the message. An error with no `field` (network failure, unexpected 500) falls through to the generic "Could not add — see console." status line, matching ui-design.md's last two error rows.
- **The route is split into `validation.ts` (pure: parse/validate form fields and sprite bytes) and `route.ts` (fs I/O and orchestration), mirroring `tile-decoration-editor/default-elements`'s `regenerate-source.ts`/`route.ts` split and `tile-fog-variants`'s `upload.ts`/`route.ts` split.** Keeps `route.ts` under the 150-line lint cap and makes the validation logic testable without the `Request`/`File`/fs polyfill ceremony `route.test.ts` otherwise needs for every case.
- **GIF byte/size checks are imported from `tile-fog-variants/upload.ts` (`isGifBytes`, `MAX_UPLOAD_BYTES`), not re-copied.** Confirmed existing precedent: `tile-variants/images/route.ts:8` already cross-imports the same two from that file. Rejected: a third copy of the GIF-magic-byte check — the codebase already has one accepted cross-route reuse of this exact pair; duplicating a third time when a precedent for reuse exists would be the wrong call, unlike the slug-function case above where no reuse precedent exists.
- **The preview registers one state, "Uploader", rendering the real connected `MonsterSpriteUploader`** (not a faked stand-in). This tool's `/testbed` page is its real, only entry point — same as `TileDecorationEditor`'s preview — and the dev-only route already 404s outside development, so there is no "real network call in a preview" risk beyond what `TileDecorationEditor` already accepts today. Every other ui-design.md state (idle picked, soft warning, validating, success, each error) is exercised by interacting with this one live state in the browser (`ui-verify`), not by separate static preview states — matching `TileDecorationEditor.preview.tsx`'s and `IconEditor.preview.tsx`'s own "Editor"-only precedent (the latter fakes the network, the former doesn't; this phase follows the former since, unlike `IconEditor`, there's no separate "editing mode" to protect from accidental real saves — adding a monster via the preview *is* the feature working).
- **Boss toggle clamps the Level selection instead of leaving it invalid.** When Boss flips off while Level is 4, the hook sets Level to 3 (the new max) rather than leaving 4 selected and relying on the disabled-submit/inline-error path. Keeps the picker always representable by its own options list, matching the ui-design.md amendment above. Rejected: leave Level at 4 and disable submit until the user manually changes it — reachable through completely ordinary use (toggle Boss off), unlike the "missing idle" error's documented drag-drop-then-clear edge case; clamping is the smaller surprise.
- **Duplicate-name check is server-side only (`409`), never client-side.** Matches ui-design.md's Error-duplicate row verbatim ("Server rejects (409)"). The client's `MONSTER_CATALOG`-seeded local state could theoretically pre-check, but doing so would require the hook to re-implement the exact same `(slug, level)` match the server already performs authoritatively against the just-rescanned disk state — redundant, and could drift if another browser tab adds a monster first (single-dev-only tool, but still the authoritative source is the filesystem, not the client's stale copy).
- **Status (`idle`/`submitting`/`success`/`error`) persists until the next submit, not auto-cleared by a timer or by editing a field.** Matches `TileDecorationEditorSaveRow`'s non-timed `saved`/`error` states (its own `statusText` cva has no timeout), not `IconEditor`'s 2-second auto-revert (`SAVED_BADGE_DURATION_MS`) — ui-design.md's Success/Error rows describe no timer, and "form fields remain filled so the user can retry" (Error row) implies the message should still be visible when the user looks back at it, not auto-dismissed.

## File plan
| File | New / Edit | Responsibility | Owner |
|---|---|---|---|
| `src/modules/game-rules/monster-catalog-generator.ts` | edit | Export `MIN_LEVEL`, `MAX_NON_BOSS_LEVEL`, `MAX_BOSS_LEVEL`, `MONSTER_CATALOG_GENERATED_PATH`, `MONSTER_NAMES_GENERATED_PATH`, `MONSTER_SPRITE_PUBLIC_DIRECTORY_FS` (new path consts); export `toCatalogEntryKey` (renamed from `toEntryKey`); add `toMonsterSpriteSlug`, `buildMonsterSpriteFilename`, `getMaxLevelForBossFlag`, `findMonsterEntry` | implementer-a |
| `src/modules/game-rules/monster-catalog-generator.test.ts` | edit | Tests for the 4 new functions: slug normalization, filename round-trip against `parseMonsterSpriteFilename`, `getMaxLevelForBossFlag`, `findMonsterEntry` hit/miss | tester-a |
| `scripts/generate-monster-catalog.ts` | edit | Use the newly-exported path constants instead of its own `path.join` string literals; behavior unchanged | implementer-a |
| `src/modules/game-rules/index.ts` | edit | Re-export `SEED_MONSTER_CATALOG`, `toCatalogEntryKey`, `toMonsterSpriteSlug`, `buildMonsterSpriteFilename`, `getMaxLevelForBossFlag`, `findMonsterEntry`, `MIN_LEVEL`, `MAX_NON_BOSS_LEVEL`, `MAX_BOSS_LEVEL` | implementer-a |
| `src/app/api/monster-catalog/validation.ts` | new | Pure: parse multipart fields into `MonsterUploadFields` or a `FieldError`; validate sprite bytes (size + GIF magic, via imported `isGifBytes`/`MAX_UPLOAD_BYTES`) | implementer-a |
| `src/app/api/monster-catalog/validation.test.ts` | new | Field-parsing and byte-validation unit tests | tester-a |
| `src/app/api/monster-catalog/route.ts` | new | `POST`: 404-in-production guard, call `validation.ts`, duplicate check, write sprite file(s), rescan, write both generated files, return `{ entry }` or `{ error, field? }` | implementer-a |
| `src/app/api/monster-catalog/route.test.ts` | new | Route-level tests with fs/undici polyfills, mirroring `icon-editor/uploads/route.test.ts`'s harness | tester-a |
| `src/testbed/components/MonsterSpriteUploader/MonsterSpriteUploader.types.ts` | new | `MonsterCatalogRowViewModel`, `LevelOption`, `MonsterSpriteUploaderViewModel`, `UploadStatus`, `FieldErrors` | implementer-a |
| `src/testbed/components/MonsterSpriteUploader/MonsterSpriteUploader.map.ts` | new | Pure: `toCatalogRowViewModels`, `getLevelOptions`, `showsBossSoftWarning`, `clampLevelForBossFlag`, `validateMonsterName`, `isGifFile` | implementer-a |
| `src/testbed/components/MonsterSpriteUploader/MonsterSpriteUploader.map.test.ts` | new | Unit tests for every function above | tester-a |
| `src/testbed/components/MonsterSpriteUploader/MonsterSpriteUploader.service.ts` | new | `addMonster(request): Promise<MonsterCatalogEntry>`, throws `AddMonsterError` on failure | implementer-a |
| `src/testbed/components/MonsterSpriteUploader/MonsterSpriteUploader.hook.ts` | new | `useMonsterSpriteUploader()`: all form/catalog state, object-URL lifecycle, submit flow | implementer-a |
| `src/testbed/components/MonsterSpriteUploader/MonsterSpriteUploader.hook.test.ts` | new | Hook behavior: clamping, soft warning, submit success/error paths, object-URL cleanup | tester-a |
| `src/testbed/components/MonsterSpriteUploader/MonsterSpriteUploader.fixtures.ts` | new | Deterministic sample catalog (seeds + one extra entry) and a fake `File` builder, reused by tests and the preview | implementer-a |
| `src/testbed/components/MonsterSpriteUploader/index.ts` | new | Public export: `MonsterSpriteUploader` | implementer-a |
| `src/testbed/components/MonsterSpriteUploader/MonsterSpriteUploader.styles.ts` | new | Every Tailwind class/token the view uses, reusing `TileDecorationEditor.styles.ts`'s token names where identical | implementer-b |
| `src/testbed/components/MonsterSpriteUploader/MonsterSpriteUploader.tsx` | new | `MonsterSpriteUploaderView(viewModel)` (pure) + `MonsterSpriteUploader()` (connected, one line) | implementer-b |
| `src/testbed/components/MonsterSpriteUploader/MonsterSpriteUploaderForm.tsx` | new | Name/Level/Boss/Idle/Attack fields, the two live previews, soft warning, submit button, status line | implementer-b |
| `src/testbed/components/MonsterSpriteUploader/MonsterSpriteUploaderCatalogList.tsx` | new | Read-only catalog rows (thumbnail, name, level badge, Seed/Boss badges) | implementer-b |
| `src/testbed/components/MonsterSpriteUploader/MonsterSpriteUploader.test.tsx` | new | RTL tests against `MonsterSpriteUploaderView` with fixtures: disabled submit, soft warning show/hide, error rendering, catalog rows (seed badges, no delete control) | tester-b |
| `src/testbed/components/MonsterSpriteUploader/MonsterSpriteUploader.preview.tsx` | new | One state, "Uploader", rendering the real connected `MonsterSpriteUploader` | preview-a |
| `src/testbed/registry.ts` | edit | Import and list `monsterSpriteUploaderPreview` | preview-a |
| `docs/architecture/systems-and-visuals.md` | edit | New bullet after line 181 (after the Icon Editor "Status: testbed-only" line), same format as the Icon Editor/Testbed-editor bullets: tool name, route, group, what it writes (`public/monster/`, the two generated files), the dev-only route, 404-in-production note | docs-sync |
| `docs/architecture/game-mechanics.md` | **no edit** | Already documents the level caps (line 36) from Phase 1's build — re-verified this session | — |

## Contracts
```ts
// ---------------------------------------------------------------------------
// src/modules/game-rules/monster-catalog-generator.ts (EDIT — additions only)
// ---------------------------------------------------------------------------
export const MIN_LEVEL = 1;            // already a local const; now exported, value unchanged
export const MAX_NON_BOSS_LEVEL = 3;   // already a local const; now exported, value unchanged
export const MAX_BOSS_LEVEL = 4;       // already a local const; now exported, value unchanged

export const MONSTER_CATALOG_GENERATED_PATH = 'src/modules/game-rules/monster-catalog.generated.ts';
export const MONSTER_NAMES_GENERATED_PATH = 'src/lib/types/monsters.generated.ts';
/** Filesystem-relative path (joined with process.cwd()), distinct from MONSTER_SPRITE_DIRECTORY
 *  (the public URL prefix '/monster' already used in every rendered sprite path). */
export const MONSTER_SPRITE_PUBLIC_DIRECTORY_FS = 'public/monster';

/** Renamed from the existing module-local toEntryKey; same body, now exported. */
export function toCatalogEntryKey(name: string, level: number): string;

/** Lowercase, hyphenated, [a-z0-9]+ only — mirrors parseMonsterSpriteFilename's slug half. */
export function toMonsterSpriteSlug(name: string): string;

/** "<boss->-<slug>-lvl<level>-<kind>.gif" — the exact inverse of parseMonsterSpriteFilename. */
export function buildMonsterSpriteFilename(
  name: string,
  level: number,
  isBoss: boolean,
  kind: 'idle' | 'attack',
): string;

export function getMaxLevelForBossFlag(isBoss: boolean): number; // MAX_BOSS_LEVEL or MAX_NON_BOSS_LEVEL

/** Finds the entry matching (name, level), comparing by toMonsterSpriteSlug(entry.name) rather
 *  than entry.name directly, so a raw user-submitted "fire ogre" matches the catalog's canonical
 *  "Fire Ogre" (case/spacing-insensitive). Deliberately does NOT use toCatalogEntryKey (exact
 *  string match) — that function is for same-provenance comparisons only (both sides already
 *  canonical catalog names, e.g. the seed-badge check), not for arbitrary user input. Used both
 *  as the route's pre-write duplicate check and its post-write response lookup. */
export function findMonsterEntry(
  catalog: MonsterCatalogEntry[],
  name: string,
  level: number,
): MonsterCatalogEntry | undefined;

// ---------------------------------------------------------------------------
// src/app/api/monster-catalog/validation.ts (NEW — pure, no fs, no Next imports)
// ---------------------------------------------------------------------------
export interface MonsterUploadFields {
  name: string;
  level: number;
  isBoss: boolean;
  idle: File;
  attack: File | null;
}

export interface UploadFieldError {
  message: string;
  field: 'name' | 'level' | 'idle' | 'attack';
  status: 400 | 413;
}

/** Reads name/level/isBoss/idle/attack off FormData; validates presence, name normalizes to a
 *  non-empty slug, and level is within getMaxLevelForBossFlag(isBoss)'s range. Does not read
 *  file bytes (async; see validateSpriteBytes). */
export function parseMonsterUploadFields(formData: FormData): MonsterUploadFields | UploadFieldError;

/** Size (MAX_UPLOAD_BYTES, imported from tile-fog-variants/upload) and GIF magic-byte
 *  (isGifBytes, same import) checks for one already-read file's bytes. */
export function validateSpriteBytes(bytes: Uint8Array, field: 'idle' | 'attack'): UploadFieldError | null;

// ---------------------------------------------------------------------------
// src/app/api/monster-catalog/route.ts (NEW)
// ---------------------------------------------------------------------------
// export async function POST(request: Request): Promise<Response>
//
// 1. NODE_ENV === 'production' -> 404 (same guard every other dev-only route uses).
// 2. formData = await request.formData(); fields = parseMonsterUploadFields(formData);
//    if fields is an UploadFieldError -> NextResponse.json({ error: fields.message, field: fields.field }, { status: fields.status })
// 3. idleBytes = new Uint8Array(await fields.idle.arrayBuffer()); validateSpriteBytes(idleBytes, 'idle') -> 400/413 if it returns an error.
//    attackBytes = fields.attack ? new Uint8Array(await fields.attack.arrayBuffer()) : null; validateSpriteBytes if present.
// 4. currentFilenames = scan MONSTER_SPRITE_PUBLIC_DIRECTORY_FS (readdir, catch ENOENT -> []), filter+sort *.gif.
//    currentCatalog = buildMonsterCatalogEntries(currentFilenames);
//    if (findMonsterEntry(currentCatalog, fields.name, fields.level)) -> 409 { error: `A monster named "${fields.name}" at level ${fields.level} already exists.`, field: 'name' }
// 5. idleFilename = buildMonsterSpriteFilename(fields.name, fields.level, fields.isBoss, 'idle'); write it under public/monster/.
//    attackFilename = fields.attack ? buildMonsterSpriteFilename(..., 'attack') : null; write it if present.
// 6. nextFilenames = [...currentFilenames, idleFilename, attackFilename].filter(Boolean).sort();
//    nextEntries = buildMonsterCatalogEntries(nextFilenames);
//    write MONSTER_CATALOG_GENERATED_PATH <- renderMonsterCatalogSource(nextEntries)
//    write MONSTER_NAMES_GENERATED_PATH <- renderMonsterNameSource(nextEntries.map(e => e.name))
// 7. entry = findMonsterEntry(nextEntries, fields.name, fields.level); // guaranteed present
//    return NextResponse.json({ entry });

// ---------------------------------------------------------------------------
// src/testbed/components/MonsterSpriteUploader/MonsterSpriteUploader.types.ts (NEW)
// ---------------------------------------------------------------------------
import type { MonsterCatalogEntry } from '@/modules/game-rules';

export interface MonsterCatalogRowViewModel {
  name: string;
  level: 1 | 2 | 3 | 4;
  isBoss: boolean;
  idleSprite: string;
  isSeed: boolean;
}

export interface LevelOption {
  value: 1 | 2 | 3 | 4;
  label: string;
}

export type UploadStatus = 'idle' | 'submitting' | 'success' | 'error';

export interface FieldErrors {
  name?: string;
  level?: string;
  idle?: string;
  attack?: string;
}

export interface MonsterSpriteUploaderViewModel {
  name: string;
  level: 1 | 2 | 3 | 4 | null;
  isBoss: boolean;
  levelOptions: LevelOption[];
  idlePreviewUrl: string | null;
  attackPreviewUrl: string | null;
  showsBossSoftWarning: boolean;
  canSubmit: boolean;
  status: UploadStatus;
  fieldErrors: FieldErrors;
  catalogRows: MonsterCatalogRowViewModel[];
  onNameChange: (name: string) => void;
  onLevelChange: (level: 1 | 2 | 3 | 4) => void;
  onBossToggle: (isBoss: boolean) => void;
  onIdleFileChange: (file: File | null) => void;
  onAttackFileChange: (file: File | null) => void;
  onSubmit: () => void;
}

/** Body the POST route returns on success. */
export interface AddMonsterResponseBody {
  entry: MonsterCatalogEntry;
}

/** Body the POST route returns on a 400/409/413. */
export interface AddMonsterErrorBody {
  error: string;
  field?: 'name' | 'level' | 'idle' | 'attack';
}

// ---------------------------------------------------------------------------
// src/testbed/components/MonsterSpriteUploader/MonsterSpriteUploader.map.ts (NEW — pure)
// ---------------------------------------------------------------------------
export function toCatalogRowViewModels(catalog: MonsterCatalogEntry[]): MonsterCatalogRowViewModel[];
// isSeed per row: SEED_MONSTER_CATALOG.some(seed => toCatalogEntryKey(seed.name, seed.level) === toCatalogEntryKey(entry.name, entry.level))

export function getLevelOptions(isBoss: boolean): LevelOption[];
// [1,2,3].concat(isBoss ? [4] : []) mapped to { value, label: '<n> — Little'|'<n> — Big' }

export function showsBossSoftWarning(isBoss: boolean, level: number | null): boolean;
// isBoss && (level === 1 || level === 2)

export function clampLevelForBossFlag(level: 1 | 2 | 3 | 4 | null, isBoss: boolean): 1 | 2 | 3 | 4 | null;
// level === null ? null : Math.min(level, getMaxLevelForBossFlag(isBoss)) as 1|2|3|4

export function validateMonsterName(name: string): string | null;
// toMonsterSpriteSlug(name) === '' ? 'Name needs at least one letter or digit.' : null

export function isGifFile(file: File): boolean;
// file.type === 'image/gif' || file.name.toLowerCase().endsWith('.gif')

// ---------------------------------------------------------------------------
// src/testbed/components/MonsterSpriteUploader/MonsterSpriteUploader.service.ts (NEW)
// ---------------------------------------------------------------------------
export interface AddMonsterRequest {
  name: string;
  level: number;
  isBoss: boolean;
  idleFile: File;
  attackFile: File | null;
}

export class AddMonsterError extends Error {
  field?: 'name' | 'level' | 'idle' | 'attack';
}

/** POSTs multipart/form-data to /api/monster-catalog; throws AddMonsterError (with .field, when
 *  the server supplied one) on a non-ok response. */
export async function addMonster(request: AddMonsterRequest): Promise<MonsterCatalogEntry>;

// ---------------------------------------------------------------------------
// src/testbed/components/MonsterSpriteUploader/MonsterSpriteUploader.hook.ts (NEW)
// ---------------------------------------------------------------------------
import { MONSTER_CATALOG } from '@/modules/game-rules';

export function useMonsterSpriteUploader(): MonsterSpriteUploaderViewModel;
// State: name, level, isBoss, idleFile/attackFile, idlePreviewUrl/attackPreviewUrl (object URLs,
// created on file pick, revoked on replacement/unmount), status, fieldErrors, catalog (seeded
// from MONSTER_CATALOG, appended with the response's `entry` on success — see Decisions).
// onBossToggle(next) also calls setLevel(clampLevelForBossFlag(level, next)).
// onSubmit(): client-side guards only (validateMonsterName, idle file present, isGifFile on
// both files) — duplicate-name is server-only (see Decisions); on service success, append the
// returned entry to catalog and set status 'success' and clear every field back to its initial
// value; on AddMonsterError, set fieldErrors[error.field] = error.message when field is present,
// else set status 'error' and console.error(error).
```

## Phases
### Phase 3: Testbed uploader (this plan, detailed)
1. `monster-catalog-generator.ts` additions (exports + 4 new pure functions) + test additions; `scripts/generate-monster-catalog.ts` edit to use the new path constants; `game-rules/index.ts` re-exports. (implementer-a, tester-a) — **sonnet** (triage override; touches the generator Phase 1/2 already hardened).
2. `src/app/api/monster-catalog/validation.ts` + its test. (implementer-a, tester-a) — **sonnet**.
3. `src/app/api/monster-catalog/route.ts` + its test (fs/undici-polyfilled, mirroring `icon-editor/uploads/route.test.ts`). (implementer-a, tester-a) — **sonnet** (writes two checked-in generated source files; a bug here corrupts the catalog for every later game, same risk class as Phase 1's generator work).
4. `MonsterSpriteUploader.types.ts`, `.map.ts` (+ test), `.service.ts`, `.fixtures.ts`. (implementer-a, tester-a) — **sonnet**.
5. `MonsterSpriteUploader.hook.ts` + its test (object-URL lifecycle, clamp behavior, submit success/error paths). (implementer-a, tester-a) — **sonnet**.
6. `MonsterSpriteUploader.styles.ts`, `.tsx`, `MonsterSpriteUploaderForm.tsx`, `MonsterSpriteUploaderCatalogList.tsx`, `.test.tsx`. (implementer-b, tester-b) — **sonnet** (triage override).
7. `MonsterSpriteUploader.preview.tsx`, `src/testbed/registry.ts` edit. (preview-a) — **sonnet**.
8. `docs/architecture/systems-and-visuals.md` new bullet (mandatory, same phase — CLAUDE.md docs-sync rule; `game-mechanics.md` confirmed to need no edit). (docs-sync)
9. `ui-design.md` amendment (architect-a, already applied above — not a builder step).
10. Full-repo `npm run typecheck`, `npm run lint`, `npm test`; `ui-verify` on `/testbed/monster-sprite-uploader`: empty state, idle-GIF-picked preview, soft warning show/hide, a full successful add (confirm the new Catalog row and, ideally, that `public/monster/` and the two generated files actually changed on disk), and the duplicate-name 409 path.

Model escalation: all of steps 1-7 require sonnet (triage overrides `implementer-a=sonnet`, `implementer-b=sonnet`, `tester-a=sonnet`, `tester-b=sonnet`, `preview-a=sonnet` for this task).

## Test plan
- tester-a (logic, first):
  - `monster-catalog-generator.test.ts`: `toMonsterSpriteSlug` — lowercases, hyphenates, strips invalid chars, trims leading/trailing dashes, empty on punctuation-only input; `buildMonsterSpriteFilename` — round-trips through `parseMonsterSpriteFilename` for every (isBoss, kind) combination, including a multi-word name; `getMaxLevelForBossFlag(true) === 4`, `(false) === 3`; `findMonsterEntry` — hits an existing seed by exact name, hits case/spacing-insensitively (e.g. "lancer" finds "Lancer"), misses a different level, misses a different name.
  - `validation.test.ts`: `parseMonsterUploadFields` — valid fields returns `MonsterUploadFields`; missing name/idle/level each returns the right `UploadFieldError`; a name that normalizes to an empty slug returns the bad-name error; level 4 with `isBoss=false` and level 5 with `isBoss=true` both return the level-cap error (the two cases the triage task calls out explicitly). `validateSpriteBytes` — oversized bytes (> `MAX_UPLOAD_BYTES`) returns the size error with `status: 413`; non-GIF magic bytes returns the type error; valid GIF bytes under the size cap returns `null`.
  - `route.test.ts` (fs + `fs/promises` mocked, undici polyfill per the `icon-editor/uploads` precedent): 404 in production, writes nothing; 400 and writes nothing for each `validation.ts` rejection; 409 and writes nothing when `findMonsterEntry` on the rescanned directory already has the name+level; happy path — writes the idle file (and the attack file when present) under the built filename, writes both generated files with `renderMonsterCatalogSource`/`renderMonsterNameSource`'s output, returns `200` with `{ entry }` whose `sprite.idle`/`sprite.attack` match the written public paths.
  - `MonsterSpriteUploader.map.test.ts`: `toCatalogRowViewModels` marks all 4 seeds `isSeed: true` and a fixture extra entry `isSeed: false`; `getLevelOptions(false)` has exactly 3 options (no "4"), `getLevelOptions(true)` has 4; `showsBossSoftWarning` true only for `isBoss && level in {1,2}`; `clampLevelForBossFlag(4, false) === 3`, `clampLevelForBossFlag(2, false) === 2` (no-op below the cap), `clampLevelForBossFlag(null, true) === null`; `validateMonsterName('!!!')` returns the bad-name message, `validateMonsterName('Fire Ogre')` returns `null`; `isGifFile` true for `type: 'image/gif'` or a `.gif`-suffixed name, false otherwise.
  - `MonsterSpriteUploader.hook.test.ts` (service mocked): toggling Boss off while Level is 4 clamps the view model's `level` to 3; picking an idle file sets `idlePreviewUrl` to an object URL and revokes the previous one on replacement/unmount (spy on `URL.createObjectURL`/`revokeObjectURL`); `canSubmit` is false with no idle file or blank name, true once both plus a valid level are set; `onSubmit` success path appends the mocked service's returned entry to `catalogRows` and resets every field; `onSubmit` with a mocked `AddMonsterError` carrying `field: 'name'` sets `fieldErrors.name` and leaves the form filled; one with no `field` sets `status: 'error'`.
- tester-b (view and e2e):
  - `MonsterSpriteUploader.test.tsx` (against `MonsterSpriteUploaderView` with fixtures, no providers): submit button is `disabled` with no fields filled; becomes enabled once name/level/idle are all set (fixture view model); the soft-warning text renders only when `showsBossSoftWarning` is true in the view model; each field error renders under its field and is `aria-describedby`-linked; the 4 seed catalog rows render a "Seed" badge and no delete button/control; a non-seed row renders no "Seed" badge.
  - No new e2e spec: this is a dev-only testbed tool with no gameplay path, same as Phase 1/2 and every prior testbed-tool task; `ui-verify` (browser screenshots) is this phase's end-to-end check, per the step list above.

## Preview states
- `MonsterSpriteUploader`: one state, "Uploader", rendering the real connected `MonsterSpriteUploader` — see Decisions for why this isn't a per-ui-design-state set of fixtures. Every ui-design.md state (empty, idle-picked, attack-picked, soft warning, submitting, success, each error) is exercised live in the browser against this one state.

## Risks
- **The route writes two checked-in generated `.ts` files from an HTTP request.** A bug in `validation.ts`/`route.ts` corrupts `monster-catalog.generated.ts`/`monsters.generated.ts` for every subsequent map generation, not just the testbed session — same blast radius Phase 1's generator script already carries, now reachable without running a CLI command. Mitigated by reusing Phase 1's already-tested pure functions verbatim (this phase adds no new catalog-building logic, only a new caller) and by `route.test.ts`'s happy-path assertion that the written source text matches `renderMonsterCatalogSource`/`renderMonsterNameSource`'s actual output.
- **Clamping Level on Boss-toggle must not fight the user mid-typing.** `clampLevelForBossFlag` only ever lowers a now-too-high level; it must never raise one (e.g. toggling Boss on while Level is 2 must leave it at 2, not bump it to anything) — the hook test above pins this with an explicit no-op case.
- **jsdom's `File` has no `arrayBuffer()`.** Every `route.test.ts` case that constructs a `File` for `idle`/`attack` needs the same `Object.defineProperty(file, 'arrayBuffer', ...)` polyfill `icon-editor/uploads/route.test.ts:50-55` already uses — easy to forget and get a confusing "undefined is not a function" failure instead of the intended assertion.
- **Scope creep: do not add a delete/edit control for uploaded (non-seed) entries.** Out of scope per triage and ui-design.md's Final spec (adding only); if a builder adds one anyway, architect-b's final review rejects it.

## Review (architect-b)
VERDICT: APPROVED

Verified every cited path/symbol/line against the repo in this session:
- `src/modules/game-rules/monster-catalog-generator.ts` — `MIN_LEVEL`/`MAX_NON_BOSS_LEVEL`/`MAX_BOSS_LEVEL` (lines 7-9), `MONSTER_SPRITE_FILENAME` regex (line 10), `SEED_MONSTER_CATALOG` exported (lines 14-19), `parseMonsterSpriteFilename` enforcing the level cap with a `console.warn` (lines 36-58), local `toEntryKey` (line 60, not yet exported — matches the plan's rename-to-`toCatalogEntryKey` premise), `buildMonsterCatalogEntries`/`renderMonsterCatalogSource`/`renderMonsterNameSource` all exported (lines 94, 110, 127). All match the plan's Verified-context and Contracts claims.
- `scripts/generate-monster-catalog.ts` — 28 lines, hardcodes `catalogOutput`/`namesOutput`/`monsterDirectory` via `path.join` (lines 10-12), confirming the plan's "edit to use the new path constants" premise is real, not invented work.
- `docs/architecture/game-mechanics.md:36` — exact text confirmed: "Levels are capped at 1–3 for non-boss and 1–4 for boss; a higher level is skipped with a console warning." The plan's "no edit needed" claim for this file is correct.
- `docs/architecture/systems-and-visuals.md:180-181` — Icon Editor bullet and its "Status: testbed-only" line confirmed verbatim; insertion point ("new bullet after line 181") is correct.
- `src/modules/game-rules/index.ts:4-5` — already exports `MONSTER_CATALOG, getFirstMonsterAtLevel, toMonster` and `type MonsterCatalogEntry`. This means the Phase 1 Contracts' "Note on the `MonsterCatalogEntry` type import" (plan.md:256-257, since resolved) is stale but harmless: Phase 3's File plan row for `index.ts` only adds the *new* re-exports (`SEED_MONSTER_CATALOG`, `toCatalogEntryKey`, etc.), it doesn't redundantly re-add `MonsterCatalogEntry`. No fix needed.
- `src/modules/game-rules/monster-catalog.types.ts` — `sprite.attack?: string` already optional, confirmed verbatim, matching the plan's "no type change needed" claim.
- `src/app/api/tile-fog-variants/upload.ts` (`MAX_UPLOAD_BYTES` line 4, `isGifBytes` lines 19-21) and `route.ts` (single `POST` doing validate → duplicate-check → write asset(s) → write config → respond, lines 15-63) — confirms the single-`POST` precedent the new `/api/monster-catalog` route follows is real and matches its exact shape, not a loose analogy.
- `src/app/api/tile-variants/images/route.ts:8` — `import { isGifBytes, isPngBytes, MAX_UPLOAD_BYTES } from '../../tile-fog-variants/upload';` confirmed verbatim: a second route already cross-imports these two helpers, so the new route's cross-import is precedented reuse, not a new boundary-crossing pattern.
- `src/modules/map/components/TileVariants/TileVariants.validate.ts:16-22` (`toSlug`) vs. `src/app/api/tile-fog-variants/upload.ts:24-30` (`toVariantId`) — both bodies are near-identical normalize-to-slug functions, confirmed duplicated across the map and fog domains. This genuinely supports the Decisions' claim that per-domain slug duplication is accepted practice here, so `toMonsterSpriteSlug` living in `monster-catalog-generator.ts` (a third copy, in a third domain) is consistent rather than a new violation.
- `src/modules/map/island-tile-slots.types.ts:10` (`ISLAND_TILE_SLOTS_PATH`) and its use at `tile-decoration-editor/default-elements/route.ts:4,60` — confirms the shared-path-constant precedent for `MONSTER_CATALOG_GENERATED_PATH`/`MONSTER_NAMES_GENERATED_PATH`/`MONSTER_SPRITE_PUBLIC_DIRECTORY_FS`.
- `eslint.config.mjs` — `MODULE_FILES = 'src/modules/**/*.{ts,tsx}'` (line 38) does not match `src/testbed/**` or `src/app/api/**`; `max-lines: ['error', { max: 150, skipBlankLines: true, skipComments: true }]` (line 69) applies generally and is turned off only for `**/*.test.{ts,tsx}` (lines 110-115); `scripts/**/*.{js,mjs}` console exemption (line 107) does not cover the `.ts` script, matching Phase 1's already-recorded risk. Confirms the `validation.ts`/`route.ts` split is necessary to stay under the 150-line cap and is not optional ceremony.
- `src/app/api/icon-editor/uploads/route.test.ts` — `jest.mock('fs/promises', ...)` (lines 13-17), the `postUpload` hand-built `FormData`-shaped `Map` (lines 41-47), and the `File.arrayBuffer` `Object.defineProperty` polyfill (lines 50-55) all confirmed verbatim; this is a real, working harness for a multipart `POST` route under jsdom, not a hypothetical one, so Phase 3's `route.test.ts` has a concrete harness to copy.
- `src/testbed/components/TileDecorationEditor/TileDecorationEditor.preview.tsx` (11 lines, one state "Editor" rendering the real connected `<TileDecorationEditor />`) and `IconEditor.preview.tsx` (66 lines, not "67" — trivial, folded in below) — confirms the single-real-connected-state preview precedent this phase's `MonsterSpriteUploader.preview.tsx` follows.
- `src/testbed/registry.ts:49,104` — import at line 49, listed at line 104 (ui-design.md's own citation of `:49,102` is off by 2, already flagged and folded in by this plan at plan.md:644; the plan's own citation is correct).
- `AnimatedMonster.tsx:8,20-21` — `MONSTER_SPRITE_SIZE_PX` import is at line 8 (plan says 8, correct) and the two usages are at lines 20-21, not "19-20" as the plan states at plan.md:648. Trivial off-by-one, folded in below, no decision depends on it.
- `src/modules/game-rules/monster-catalog.generated.ts` is unaffected by this phase (confirmed: only `monster-catalog-generator.ts`, the script, and the new route touch generation logic).

Design points challenged:
- **Single `POST /api/monster-catalog` vs. the `tile-fog-variants` precedent:** confirmed identical shape (validate → duplicate check → write file(s) → write config/catalog → return the created entity). No deviation; this is the right call, not a new pattern needing justification.
- **Cross-import of `isGifBytes`/`MAX_UPLOAD_BYTES` from `tile-fog-variants/upload.ts`:** precedented by `tile-variants/images/route.ts:8`, a second route already doing exactly this. Correct reuse, not a new cross-domain coupling.
- **`toMonsterSpriteSlug`/`buildMonsterSpriteFilename`/`getMaxLevelForBossFlag`/`findMonsterEntry` in `monster-catalog-generator.ts`:** all four are pure, filename-domain functions that belong next to `parseMonsterSpriteFilename` and the level-cap consts they mirror/invert — correct placement, no file-boundary violation. `findMonsterEntry` vs. reusing `toCatalogEntryKey`: verified the reasoning holds — `toEntryKey`'s existing call sites (`groupFilenamesIntoEntries`, `buildMonsterCatalogEntries`) only ever compare two sides that are *both* already-canonical catalog names produced by the same `toTitleCase(slug)` path, so exact-string matching is safe there; the route's two lookups compare a raw, unnormalized user-submitted `name` against canonical catalog names, where exact-string matching would wrongly treat "fire ogre" and "Fire Ogre" as different monsters. Two distinct comparison semantics justify two functions; collapsing them would either break the seed-badge/grouping logic's performance-free exact match or silently fail to catch a real-world duplicate submission. No simpler option found.
- **Level caps already implemented and documented:** confirmed both halves independently — the code (`monster-catalog-generator.ts:7-9,45-50`) and the doc (`game-mechanics.md:36`) already state non-boss ≤3 / boss ≤4 with a console warning on violation, from Phase 1's build. This phase correctly scopes itself to exporting the existing constants and adding a UI/route path to reach the rule, not re-deriving or restating it — and correctly marks `game-mechanics.md` "no edit" rather than manufacturing docs-sync busywork.
- **ui-design.md Amendment (level picker boss-dependent, 3 options when non-boss):** read in full at the end of `ui-design.md`. Matches `getMaxLevelForBossFlag`/`getLevelOptions`/`clampLevelForBossFlag`'s contracts exactly (1-3 non-boss, 1-4 boss, clamp-down-only on Boss-off). The amendment is appended rather than rewriting the locked Final spec in place, preserving the review trail — correct per the pattern already used for Phase 1/2's own plan amendments.
- **Phase 3 docs-sync scope:** `systems-and-visuals.md` gets a new bullet (File plan row, Owner: docs-sync); `game-mechanics.md` is explicitly marked "no edit" with the reason given and independently re-verified above. `progress.md:38` already has a docs-sync checkbox for this phase ("if upload route shape or convention needs recording") — matches, since the route shape is now decided and the bullet is scoped. No missing docs-sync item found.
- **File plan completeness:** every file touched by the Contracts block, the Decisions, and the Phase steps list (monster-catalog-generator.ts, scripts/generate-monster-catalog.ts, game-rules/index.ts, the 4 new `api/monster-catalog/*` files, the 13 new `MonsterSpriteUploader/*` files, `src/testbed/registry.ts`, the 2 doc files) has a row in the File plan table with an owner. No orphaned file found; no file plan row lacks a corresponding step in the Phases list.
- **Phase size:** ~20 new/edited files across 2 builder pairs (implementer-a/tester-a for logic+route, implementer-b/tester-b for the 4 view files) plus preview-a — large for one phase but consistent with how Phase 1/2 were sized and with triage's 3-phase, L-tier split; no further split suggested.

Findings (non-blocking, folded in directly — no plan redesign needed):
1. `IconEditor.preview.tsx` is 66 lines, not "67" (plan.md:646).
2. `AnimatedMonster.tsx`'s two `MONSTER_SPRITE_SIZE_PX` usages are at lines 20-21, not "19-20" (plan.md:648).

Both are citation-only drift with no effect on any decision, contract or acceptance criterion.

Status: APPROVED
