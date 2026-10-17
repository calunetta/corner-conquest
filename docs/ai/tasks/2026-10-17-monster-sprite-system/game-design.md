# Game design: Filename-driven monster spawn pool

## Proposal (game-designer-a)

### Problem or opportunity
The monster catalog is a hand-maintained 4-entry table keyed 1:1 by level (`src/modules/game-rules/monster-catalog.ts:4-9`: Lancer=1, Bear=2, Ogre=3, Minotaur=4), and the map-center tile is hardcoded to spawn exactly one level-4 Minotaur (`src/modules/game-rules/map-generation.ts:15-24`). Adding a monster today means editing an enum (`src/lib/types/monsters.ts:1-6`) and a reducer. The user wants content-only monster addition: drop GIFs in `public/monster/` using the naming convention `<name>-lvl<N>-idle.gif` (+ optional `-attack.gif`), with a `boss-` prefix marking center-spawn eligibility. This is an opportunity for discovery and surprise (new creatures appear without a code change) and feedback/juice (variety on monster islands), with no stated change to combat math. The design question is purely: what are the exact spawn/level rules once the pool can hold more than one candidate per level, and what happens when a level or the boss pool is thin.

Only one viable shape fits the decided mechanism (random pick among same-level candidates; random pick among boss-tagged candidates for center), so this is written as one recommended spec with the risk areas and fallback rules called out, per the minimal-change option already locked in by the user.

### Recommended rule spec

**Candidate pool.** The generator parses `public/monster/*.gif` into entries of `{ name, level: 1-4, isBoss: boolean, sprite: { idle, attack? } }`. `isBoss` is true iff the filename carries the `boss-` prefix. A monster with no `idle.gif` is not a valid entry (idle is required, per triage). A monster with no `attack.gif` is a valid entry whose attack animation step is skipped in combat (covered by the UI stage, not this doc).

**Big vs. little stays level-defined, not name-defined.** Current rule: level 3-4 is "big", level 1-2 is "little" (`monster-catalog.ts:25,36`; documented at `docs/architecture/game-mechanics.md:33-34`). This definition does not change — it is unaffected by how many names exist per level, because it drives dice count and VP, both keyed by `level`, never by `name`.

**Distance-gated level sets stay exactly as today** (`monster-catalog.ts:16-23`):
- distance ≤ 1 (ring around the center boss tile): possible levels {3, 4}
- distance ≤ 3: possible levels {1, 2, 3}
- distance > 3: possible levels {1, 2}

**Normal-island selection, two-step roll (level first, name second):**
1. Roll level(s) exactly as today — the 30% big-monster chance when the tile's level set includes 3/4, the 25% chance a level-4 big monster is a 4 instead of a 3, the little-monster pairing (60% level 1 / 40% level 2), the no-big-monster path (70% chance of 1 little monster, 30% chance of 2, each independently rolled from the eligible little levels).
2. For each rolled level, pick uniformly at random among all non-boss candidates in the pool at that exact level. `P(name | level) = 1 / (count of non-boss candidates at that level)`.
3. Dedupe stays name-based, unchanged: if step 2 produces the same `name` twice on one tile (e.g. the same species was uploaded at both level 1 and level 3 and both get rolled in one big+little pairing), the dedupe keeps only the first instance, exactly like today's "no two monsters with the same name on one tile" rule (`monster-catalog.ts:60-65`, documented at `game-mechanics.md:34`). This is a pre-existing rule, now reachable by a new path (same species at two different levels) instead of only by an unlucky double-roll of the same level.

**Empty-level fallback (new — not needed today because every level always had exactly one candidate).** If the rolled level has zero non-boss candidates in the pool:
- For the little-monster roll (levels 1-2): fall back to the other little level if it has a candidate; if both little levels are empty, skip spawning that slot (an island can end up with fewer monsters than rolled, including zero).
- For the big-monster roll (levels 3-4): fall back the same way between 3 and 4; if both are empty, treat the tile as "no big monster" and fall through to the little-monster-only path.
- If, after fallback, a Monster-type tile ends up with an empty monster list (every reachable level empty — an edge case only possible with a near-empty pool), regenerate that tile as a Resource island using the same resource-generation rule already used for every other Resource tile (`map-generation.ts:42-61`), instead of leaving a monster-less Monster island on the map.

**Boss (center) tile.** Replace the hardcoded `MONSTER_DATA[4]` Minotaur (`map-generation.ts:17-22`) with: pick uniformly at random among all `isBoss`-tagged candidates in the pool, regardless of level. `P(boss candidate) = 1 / (count of boss-tagged candidates)`. If the boss pool is empty, the center tile falls back to the current level-3/4 big-monster roll used for distance ≤ 1 tiles (i.e. it degrades to an ordinary center-ring tile rather than crashing or leaving the center empty).

**Balance numbers that do not change:** monster dice = level (`combat-monster-roll.reducer.ts`), VP per level (2/5/7/10, `combat-monster-resolve.reducer.ts`), the 30%/25%/60/40/70/30 spawn probabilities above, the distance-gated level sets, the dedupe rule. Nothing here touches combat math, army deploy cost, or VP — this is purely which `name` string gets attached to an already-decided `level`.

### Balance math
Levels, dice and VP are keyed by `level`, never by `name`, so adding names at a level does not change the strength or reward of any tile — it only changes which sprite/name shows up. Concretely, for a tile that rolls level 2: before, `P(Bear) = 1`; after, with e.g. 3 level-2 candidates, `P(each) = 1/3`, but the fight itself is identical in every case (2 dice, 5 VP). The only thing that materially changes odds-of-an-outcome is the boss pool, because boss selection is not level-gated:

- Today: center is always level 4, 4 dice, 10 VP, deterministic.
- After: center dice/VP = the level of whichever boss gets picked. If someone uploads a `boss-goblin-lvl1-idle.gif`, the center tile has a `1 / (boss pool size)` chance of being a 1-die, 2-VP fight instead of the current guaranteed hardest fight on the map.

Computed example: with a boss pool of {Minotaur lvl4, Goblin-boss lvl1}, `P(center is level 1) = 0.5`, `P(center is level 4) = 0.5` — the center's expected dice drops from a guaranteed 4 to `0.5×1 + 0.5×4 = 2.5`, and expected VP drops from a guaranteed 10 to `0.5×2 + 0.5×10 = 6`. That is a real difficulty/reward swing at the single most important tile on the map, driven entirely by content (what someone uploads), not by code — flagged below as the one balance risk from this change.

### Interactions and exploits checked
- **Cards (Overcome, War Chief, Decide Dice Roll):** all act on the player's own dice roll during resolution; none read monster `name`, only `level` via the shared `combatState`/`monsterCombatState`. No interaction.
- **Hand limit, fog of war, turn order:** unaffected — spawn selection happens once at map generation (`generateIslandTerrain`), before any player sees the tile.
- **Bots:** `src/modules/game-rules/bot-turn.reducer.ts` has no reference to monster `name` or `level` when choosing to attack (`grep` found zero matches) — bots are unaffected by this change in either mode.
- **Dedupe exploit:** none found. Dedupe only ever removes a monster, never adds one or inflates a reward; collapsing a same-named big+little roll into one monster is strictly a minor loss of variety, not an exploitable gain.
- **Resource-island fallback for an empty Monster tile:** reuses the existing resource-generation function verbatim, so it cannot produce a resource amount or type outside what any other Resource tile can already roll.

### Bot impact
None. Bots never branch on monster `name` or `level` (`bot-turn.reducer.ts`, no matches for "monster"). No change needed there.

### UI needs (for the next stage)
- Combat dialogs must tolerate a monster with no `attack` sprite (skip that animation step) — already scoped to the UI/architecture stage per triage, not a rule change.
- No new numbers need to reach the UI beyond `name`, `level`, `isBoss` (internal to spawn logic, not rendered) and the sprite paths already on `Monster.sprite`.

### How we will know it works
- Unit tests: given a pool, `generateMonsters(x, y)` never returns two monsters with the same `name`; for a tile whose rolled level has zero candidates, it falls back per the rule above and never returns `undefined`/throws; for a pool with zero boss candidates, the center tile falls back to the distance ≤ 1 big-monster roll instead of erroring.
- Playtest signal: center-tile difficulty should still feel like "the hardest fight on the map" in typical content sets (i.e. flag to content creators: keep boss-tagged uploads at level 3-4 unless you deliberately want an easier center some games).

## Review (game-designer-b)
VERDICT: APPROVED (with fixes folded into the Final spec below)

### Math re-check
Re-ran independently, matches the proposal:
```
node -e "
let c4=0,c1=0,N=2000000;
for(let i=0;i<N;i++){ if(Math.random()<0.5)c4++; else c1++; }
console.log('P(4)=',c4/N,'P(1)=',c1/N);
console.log('Edice',0.5*1+0.5*4,'EVP',0.5*2+0.5*10);
"
→ P(4)= 0.5007 P(1)= 0.4993, Edice 2.5, EVP 6
```
Confirms the boss-pool example: center expected dice 4→2.5, expected VP 10→6 if a `boss-goblin-lvl1` is added alongside Minotaur. Code checked against this claim: `src/modules/game-rules/map-generation.ts:15-24` does hardcode `MONSTER_DATA[4]` for the center tile today (always 4 dice, 10 VP, deterministic) — the "before" side of the comparison is correct. `MONSTER_VICTORY_POINTS_BY_LEVEL = [0, 2, 5, 7, 10]` (`src/modules/game-rules/combat-monster-resolve.reducer.ts:6`) confirms the VP table used.

### Findings

**1. Boss-level variance — acceptable, not a design flaw, but needs a guardrail against accidental zero-boss-pool and against silently trivializing the center.** The locked decision (triage.md:32: "boss selection is random among all boss-tagged candidates") forecloses gating boss picks by level — I won't re-open that. But two gaps must be closed, both via a soft convention, not a hard rule change:
- **Robustness gap:** nothing in the proposal guarantees the boss pool, or any single level 1-4, is ever non-empty. `generateMonsters()`'s own existing empty-fallback (`monster-catalog.ts:46`: `if (availableLevels.length === 0) availableLevels = [1]`) assumes `MONSTER_DATA[1]` exists — if a content set deletes/never uploads a level-1 monster, this throws. The center-tile boss-empty fallback (proposal line 31) degrades to this same `generateMonsters`-style roll, so it inherits the same crash risk.
- **Baseline-regression gap:** before any new content is uploaded, the game must behave exactly as it does today (deterministic Minotaur boss, 4 dice, 10 VP) — not become probabilistic from day one with a pool of size 1 that happens to equal today's data, but with no protection against someone later deleting it.
- **Fix, folded into Final spec below:** the generated catalog always carries 4 permanent seed entries — today's Lancer(1)/Bear(2)/Ogre(3)/Minotaur(4) — that the testbed tool cannot delete (only additional uploads can supplement them). Minotaur keeps `isBoss: true` by default. This guarantees every level and the boss pool are never empty, and that an untouched install reproduces today's deterministic center exactly (boss pool starts at size 1 = Minotaur). Variance only appears once a content creator deliberately adds a second boss-tagged sprite, which is the intended discovery/surprise lever, not an accident.

**2. Sibling fallback (1↔2, 3↔4) — sound, does not skew odds unfairly.** It only activates when a level is completely empty, which is a content-curation gap, not a balance lever: whichever level the fallback lands on was already a reachable outcome of the same big/little roll (e.g. the little roll is 60% level 1 / 40% level 2 either way; if level 1 has zero candidates, 100% of little rolls land on level 2's existing candidates — still within the existing level-2 difficulty/VP band, never level 3+). No exploit: a player cannot engineer which level they fight by choosing which island to attack, since the roll happens once at map generation before any player acts (confirmed: `generateIslandTerrain` runs at map setup, `map-generation.ts:5`, before player turns).

**3. Dedupe across two levels of the same species — confirmed pre-existing, no new exploit.** `monster-catalog.ts:60-65` dedupes by `name` only, strictly removes, never adds a monster or inflates a reward — verified by reading the reduce (keeps first match, drops the rest). The new path proposal describes (same species uploaded at level 1 and level 3, both rolled on one tile) hits the identical code, confirmed correct.

**4. Bots — confirmed no reference to monster `name`.** `grep -n -i "monster" src/modules/game-rules/bot-turn.reducer.ts` → zero matches, matching the proposal's claim. Separately, `docs/architecture/systems-and-visuals.md:59` documents the bot's monster-attack priority as "flat priority 7, regardless of the monster's level" — confirms bots don't even branch on `level`, let alone `name`. No bot work needed for this change.

**5. Missed consumer: `LobbyBackground` reads `MONSTER_DATA[4]` directly, not through `generateMonsters`.** The proposal's "Interactions and exploits checked" section covers cards, hand limit, fog, turn order, bots, dedupe and the resource fallback, but not other direct consumers of the current `MONSTER_DATA` shape. Found by grep: `docs/architecture/systems-and-visuals.md:22` ("Sprite paths still come from `MONSTER_DATA`") and `docs/ai/tasks/2026-10-13-lobby-login-background-v2/plan.md:115` (`createMonsterIslandMonster(): Monster; // built from MONSTER_DATA[4] (Minotaur), level 4`) — the lobby's decorative monster island is built by indexing `MONSTER_DATA[4]` directly, a single fixed entry per level. Once level 4 can hold multiple candidates, that lookup shape changes (array/list, not a single object) and this direct index breaks or silently behaves randomly on every page load, which isn't right for static decorative art. **Not a balance issue — a correctness gap for the architecture stage.** Folded into Final spec as an explicit requirement so architect-a doesn't have to rediscover it.

**6. Complexity budget, Firestore cost, tutorial — no issues.** This is backend map-generation logic with no new player-facing rule statement (spawn variety was never tooltip'd; "the center is the hardest fight" was never promised in a tutorial beacon — grep of `docs/architecture/systems-and-visuals.md` §6.11 area finds no monster-specific beacon text to update). Generation happens once per map at creation, same call site as today (`generateIslandTerrain`) — no new Firestore writes per player action.

**7. Pillars check.** Pillar 4 ("trailing players keep a path back") is, if anything, helped by the variance (an easier-than-usual center is an extra comeback opportunity, not a punishment of anyone). Pillar 5 ("luck adds tension, skill decides") — this is content-set luck fixed for the whole match (decided at map generation before any turn), the same category of randomness the game already uses for every other tile's level roll; it does not add moment-to-moment luck inside a fight. No pillar violation.

## Final spec

**Candidate pool.** Generator parses `public/monster/*.gif` into `{ name, level: 1-4, isBoss: boolean, sprite: { idle, attack? } }`. `isBoss` true iff filename has `boss-` prefix. `idle.gif` required; missing `attack.gif` is valid (combat skips that animation step, per triage — UI stage owns this).

**Permanent seed entries (new, closes findings 1 and the robustness gap).** The generated catalog always includes 4 built-in, non-deletable entries, seeded with today's data and sprite paths: Lancer (level 1, non-boss), Bear (level 2, non-boss), Ogre (level 3, non-boss), Minotaur (level 4, `isBoss: true`). The testbed upload tool can add further entries at any level/boss flag but cannot remove these four. This guarantees every level 1-4 and the boss pool always have at least one candidate (no empty-pool crash possible) and that an install with zero additional uploads reproduces today's game exactly: deterministic Minotaur boss, 4 dice, 10 VP center tile.

**Big vs. little stays level-defined** — unchanged from proposal (`monster-catalog.ts:25,36`; `game-mechanics.md:33-34`), unaffected by names-per-level.

**Distance-gated level sets — unchanged** (`monster-catalog.ts:16-23`): distance ≤ 1 → {3,4}; distance ≤ 3 → {1,2,3}; distance > 3 → {1,2}.

**Normal-island selection (two-step: level, then name) — as proposed:**
1. Roll level(s) exactly as today (30% big-monster chance, 25% level-4-vs-3 split, 60/40 little-level split, 70/30 one-vs-two little monsters).
2. For each rolled level, pick uniformly among non-boss candidates at that level: `P(name | level) = 1 / count`.
3. Dedupe by `name`, unchanged (`monster-catalog.ts:60-65`): keeps first instance if a tile rolls the same name twice (including the new same-species-at-two-levels path).

**Empty-level fallback — as proposed, now unreachable in practice because of the seed entries, but kept as defense-in-depth for a future catalog format change:** little roll (1,2) falls back to the other little level if empty; big roll (3,4) falls back to the other big level if empty, then to little-only if both empty; a Monster tile left with zero monsters after fallback regenerates as a Resource tile via the existing resource-generation rule (`map-generation.ts:42-61`).

**Boss (center) tile.** Pick uniformly at random among all `isBoss`-tagged candidates, regardless of level: `P(boss candidate) = 1 / count`. With only the seed Minotaur present, this is deterministic (today's behavior). Each additional boss-tagged upload is a deliberate content choice that introduces variance — e.g. adding one level-1 boss alongside Minotaur drops expected center dice 4→2.5 and expected VP 10→6 (computed above). If the boss pool is somehow still empty (seed entries bypassed by a future catalog edit), fall back to the distance ≤ 1 big-monster roll.

**Consumer requirement (new, closes finding 5).** Any direct reader of the old single-entry-per-level `MONSTER_DATA[n]` shape — specifically `LobbyBackground`'s `createMonsterIslandMonster()` (decorative, non-match monster island) — must be migrated to a deterministic accessor (e.g. "first non-boss level-4 candidate, or the seed Minotaur if none") rather than a raw array index, since the catalog's level-4 slot can now hold more than one candidate. This is an architecture-stage task, called out so it isn't missed when `monster-catalog.ts`'s exported shape changes from `Record<number, single entry>` to a pool.

**UI forward note (not spec'd here, for ui-designer-a/b):** when a content creator tags a sprite as `boss-` at level 1 or 2 in the testbed tool, show a non-blocking warning that this lowers the average difficulty/reward of the map's center tile — soft nudge, not a block, consistent with the locked decision that boss picks are random regardless of level.

**Balance numbers unchanged:** monster dice = level, VP table [0,2,5,7,10] by level, the 30/25/60/40/70/30 spawn probabilities, the distance-gated level sets, name-based dedupe. No change to combat math, deploy cost, or VP sources.

**Bot impact:** none — confirmed zero references to monster `name` in `bot-turn.reducer.ts`, and the documented attack priority (`systems-and-visuals.md:59`) doesn't branch on `level` either.

**Docs to update (docs-sync, same phase):** `docs/architecture/game-mechanics.md:31` ("center tile always a solo level-4 Minotaur... not subject to any roll") must change to describe the boss pool and seed-entry guarantee; `docs/architecture/systems-and-visuals.md:21-22` (LobbyBackground's "monster (level 4, Minotaur)" and "Sprite paths still come from MONSTER_DATA") must reflect the new deterministic-accessor requirement once implemented.

**Tests to add (carried from proposal, unchanged):** `generateMonsters` never returns duplicate names; empty-level fallback never throws/returns undefined; empty boss pool falls back correctly; **new:** seed entries are present and non-deletable in the generated catalog; `LobbyBackground`'s decorative monster accessor is deterministic across repeated calls (not randomly different per render).
