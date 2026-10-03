# Gameplay ideas backlog

Not implemented. Proposals for making Corner Conquest more fun, each with a concrete implementation sketch so a later session (or the `game-design` → `architect` swarm) can pick one up without re-deriving it from scratch. Numbers here are starting proposals, not final — they need the `game-designer-a` / `game-designer-b` stress-test pass (balance math, exploits, bot behavior) before being built. Verify every cited path/rule number against the code before implementing; this doc may drift.

Context this backlog was written against: `docs/README.md` §5–6, `.claude/skills/game-design/SKILL.md`, rule numbers as of 2026-10-03 (victory goal 30, deploy 6 wheat +2/army, upgrade 6 iron, ability 15 gems, card 10 gems, hand limit 7, max armies 5, max attack power 4, player dice = attack power + 1, monster dice = level, ties favor defender/monster, turn timer 120s).

---

## 1. Trade action between players

**Problem it solves:** no player-to-player interaction except force (attack, Sabotage, Steal Resource). Catan's core addictiveness is negotiation; CC has none.

**Proposed rule:** A new strategic action, `Propose Trade`, available once per turn like Deploy/Upgrade/Buy Card (doesn't set `hasActed` on any army).
- Proposer picks a target player, offers N of one resource for M of another (or another resource from the target), via a new `TradeDialog`.
- The offer is stored in `GameState` as `pendingTrade: { fromPlayerId, toPlayerId, offer: {resource, amount}, request: {resource, amount}, turnCreated }`.
- On the target's next turn, they see a prompt (dialog, similar to `SpecialIslandRollDialog`'s pattern of "appears once, must resolve") to Accept or Reject before taking any other action.
- Accept: both players' resources update atomically, trade cleared. Reject or left unresolved for 1 full turn cycle: trade cleared, no penalty.
- Only one pending trade per player pair at a time, to keep the shared state small and Firestore-cheap (fits the existing one-write-per-turn model, §6.9).

**Files likely touched:** `src/lib/types/game.ts` (add `pendingTrade`), new `src/lib/actions/trade.ts` reducer (`ProposeTrade`, `RespondTrade`), new dialog under `src/modules/trade/` (new code goes in modules per `CLAUDE.md`), `ActionsPanel` wiring, `bot-logic.ts` (bots auto-reject, or accept only if the ratio favors them — needs explicit bot behavior per the game-design skill's constraints).

**Open questions for game-designer-a/b:** should trade ratio be free-form (exploit risk: 1-for-99 bluffing) or capped (e.g. max 10 units per side)? Does it bypass `hasActed`/turn economy cleanly? Tutorial beacon update needed (§6.10).

---

## 2. Raidable positioned armies

**Problem it solves:** Position (farming a resource) is a pure tempo cost with no visible risk, so it's a safe default rather than a tense decision.

**Proposed rule:** An army with `isPositioned: true` can already be attacked today if an enemy army lands on the same island (per §6.3 Attack flow — no rule currently prevents it, need to verify in `src/lib/actions/attack.ts`). The idea is to make this **visible and rewarding**, not to change the underlying legality:
- UI: positioned enemy armies get a distinct "farming / vulnerable" badge in `TileOccupants.tsx` so attackers can see an exposed target at a glance (currently farming collectors render, §6.12, but nothing marks them as a juicier target than a regular garrisoned army).
- Rule addition: winning an attack against a positioned army grants the attacker a one-time bonus of the resource that army was collecting (e.g. +3 of that resource), on top of the existing +5 VP for beating a player. Needs balance math (`node -e` dice simulation per the game-design skill) to confirm this doesn't make early rushing a positioned farmer dominant over normal expansion.

**Files likely touched:** `src/lib/actions/attack.ts` (reward branch), `TileOccupants.tsx` (badge), `docs/README.md` §5.1/§6.4 (reward table), tutorial copy for the Attack beacon.

**Open questions:** does this stack with monster-level VP table, or need its own line? Does it apply to all three resource types equally, or scale by hand-value (e.g. gold farmers are juicier targets than wheat farmers)?

---

## 3. Roaming monster (shared threat)

**Problem it solves:** monsters are static loot piñatas; nothing creates shared tension across players or forces indirect cooperation ("someone should deal with that before it reaches my base").

**Proposed rule:** one extra monster entity, `roamingMonster`, spawns around turn 5–8 near the map center.
- At the end of each full round (after the last player's turn), it moves 1 tile toward the richest unclaimed/undefended resource island within some radius (reuse the bot's island-scoring heuristic in `bot-logic.ts` if one already ranks islands — verify before reusing).
- If it moves onto an island with a player army, it initiates combat against that army automatically, using the existing monster combat resolution (§6.4), with the player required to resolve the fight on their next turn (similar to the existing Special Island re-roll prompt pattern).
- Suggested level: starts at Ogre (3 dice), does not VP-reward beyond the standard monster-level table unless that needs its own tier.

**Files likely touched:** `src/lib/game-initializer.ts` (spawn), `src/lib/actions/` new file for its turn-end movement step, `handleEndTurn` hook-in (§6.1), `AnimatedMonster.tsx` / `IslandTile.tsx` for rendering a monster that isn't tied to a fixed island, `docs/README.md` §5.2 (Monster Islands) and §6.4 (Combat Flow).

**Open questions:** does it despawn after being killed once, or respawn? Does fog of war hide its position/movement from players who haven't explored that tile (consistent with §6.7)? Firestore cost — this is a shared-state field, so it's one more value in the per-turn atomic write, should stay within the existing ~20-30 writes/match budget (§6.9).

---

## Backlog triage note

Per the `game-design` skill: a "make the game more fun" request with no single named feature should produce this ranked backlog rather than one full spec, and **the user picks which one to build**. When one is chosen, run `/triage` on it, then let `game-designer-a`/`game-designer-b` turn this sketch into a verified `game-design.md` (exact numbers, dice math, exploit check) before the architects plan it.

Ranking (impact vs. effort, from the original discussion):
1. Trade action — highest social/engagement impact, moderate effort (new dialog + reducer + bot stub).
2. Raidable positioned armies — low effort (mostly UI + one reward branch), medium impact.
3. Roaming monster — highest effort (new entity type, movement AI, fog-of-war interaction), high impact on tension/pacing.

---

## Batch 2 — assuming batch 1 is implemented

Written as a follow-on round, assuming ideas 1–3 above already exist. Same caveat: proposals, not final numbers; need the game-designer stress-test pass before building.

### 4. Alliance / ceasefire flag

**Problem it solves:** Trade (idea 1) adds negotiation, but there's still no way to de-risk a relationship — every other player is always a live attack threat. Real diplomacy (the thing that gives Catan/Risk-style games replay legs) needs a status, not just a transaction.

**Proposed rule:** A pair-wise boolean, `ceasefires: { [playerIdA_playerIdB]: { active: boolean, expiresTurn: number } }` in `GameState`. Either player can propose a ceasefire (reuses the Trade proposal/accept pattern from idea 1 — same dialog shape, different payload). While active for a pair: neither can target the other with Attack; both can still Trade and use non-combat cards (Steal Resource, Sabotage) against each other — open question below. Lasts a fixed number of turns (e.g. 10) or until either side cancels it, with a 1-turn cooldown before either side can re-propose after a cancel, to stop it being toggled mid-combat to dodge a counter-attack.

**Files likely touched:** `src/lib/types/game.ts` (add `ceasefires`), extend the trade reducer (idea 1) or add a sibling `src/lib/actions/ceasefire.ts`, `attack.ts` (block attack when active), `bot-logic.ts` (when bots accept/propose — e.g. only against the current VP leader, never with each other if that creates a permanent bot-bot non-aggression deadlock), `docs/README.md` §5/§6.

**Open questions:** does an active ceasefire also block Sabotage/Steal Resource, or only Attack? Should breaking it early (if allowed at all) cost something, to stop bluffing a false sense of safety right before a rush? Does the UI need a persistent map indicator (e.g. a dashed line between two bases) so other players can see alliances forming — that visibility is itself part of the social tension.

### 5. Escalating positioned-army yield

**Problem it solves:** Position (idea 2's target) currently yields a flat amount every turn forever, so once an army is parked the decision is made and stays static. No timing tension.

**Proposed rule:** Track `turnsPositioned` on each positioned army. Yield formula becomes base yield + floor(turnsPositioned / 3), capped at +3 (tune via `node -e` simulation — needs balance math to confirm it doesn't trivially outpace Deploy/Upgrade cost scaling). Resets to 0 if the army is moved off the resource or defeated. This makes idea 2 (raidable farmers) sharper: a long-parked army is now a known juicier target, which attackers can see and time around.

**Files likely touched:** `src/lib/actions/player.ts` (resource yield calculation, §5.3), `src/lib/types/player.ts` (`Army.turnsPositioned`), `TileResources.tsx` (visual tell for a "ripe" farm, e.g. a brighter sprite state), tutorial beacon copy.

**Open questions:** should the attacker's bonus from idea 2 scale with `turnsPositioned` too (stealing a ripe farm is worth more), tying the two mechanics together directly?

### 6. Shared event deck

**Problem it solves:** Special Cards (13 kinds) are per-player and opt-in; nothing happens to the whole table at once, so every match follows the same expand → fight → upgrade shape with no macro-level surprise.

**Proposed rule:** A separate, small global deck (distinct from `specialCardsDeck`). Every 5 full rounds (tracked via `turn % (5 * playerCount)` or a dedicated `nextEventTurn` counter in `GameState`), draw one event and apply it to all players simultaneously for the following round — e.g. "Storm: all Move actions this round cost an extra tile of distance," "Bounty: the current VP leader's base yields double resources to whoever attacks it successfully this round," "Windfall: every base produces +2 of a randomly chosen resource at the next turn start." Announce it in the game log the same way combat results are logged (§6.4's log pattern).

**Files likely touched:** new `src/lib/event-data.ts` (parallel to `card-data.ts`), a resolver in `handleEndTurn` (§6.1) to check/draw/apply, `GameLog.tsx` for the announcement, `docs/README.md` new §5.x section.

**Open questions:** should events be announced one round ahead (so players can plan around a known Storm) or resolve immediately (surprise, but less agency)? Favors "tension and pacing" and "discovery" fun lenses most directly — worth checking it doesn't just become background noise if players tune it out after a few events.

### 7. Trailing-player catch-up bonus

**Problem it solves:** Pillar 4 ("trailing players keep a path back without arbitrary punishment of the leader") isn't currently backed by any mechanic — the only catch-up lever is card-draw luck (Sabotage, Steal Resource).

**Proposed rule:** At the start of each turn, a player whose VP is more than some threshold (e.g. 8) behind the current leader gets a small, capped discount on their next Deploy or Upgrade cost this turn (e.g. 25% off, one action, doesn't stack with Reinforce/Efficient/Master Builder — or does, needs exploit-check). Scales off distance from the leader, not a flat rubber-band, so it fades naturally as the gap closes.

**Files likely touched:** `src/lib/actions/player.ts` (cost calculation for Deploy/Upgrade, §6.3), `src/lib/game-initializer.ts` if the threshold becomes a lobby setting, `bot-logic.ts` (bots already shop opportunistically — just needs to see the discounted cost), `docs/README.md` §5.1/§6.3.

**Open questions:** biggest exploit-check needed — does this let a trailing player snowball back past the leader too easily, inverting the problem? Needs the `game-designer-b` stress-test pass specifically for a runaway-reversal scenario, not just a runaway-leader one.

### 8. Asymmetric faction traits

**Problem it solves:** all 4 colors are mechanically identical; every match is a mirror match once the map is randomized. Small World's whole hook is that factions feel different.

**Proposed rule:** At game creation (lobby `CreateGameDialog`), each player/bot is assigned (or picks) one of 4 small passive traits, one per color to avoid duplicates in a 4-player match: e.g. cheaper first two Deploys, +1 die vs monsters only, starts with one Scout already revealed, 10% discount on Passive Abilities. Each trait is a single modifier consulted at one specific point in the existing reducers — no new systems, just conditional branches keyed off a new `player.faction` field.

**Files likely touched:** `src/lib/types/player.ts` (`faction` field), `CreateGameDialog.tsx` / lobby settings, the specific reducer each trait touches (`player.ts` for Deploy/Upgrade cost, `attack.ts` for monster dice, `card.ts` for ability cost), `bot-logic.ts` (bots should lean into their trait, e.g. a monster-bonus bot prioritizes monster islands), `docs/README.md` new subsection, tutorial copy (new beacon or extend `player-info`).

**Open questions:** fixed per color or player-chosen at lobby time (more agency, more lobby-UI work)? This is the highest-scope idea in this batch — probably wants its own `game-design.md` spec rather than folding into a larger task.

### Batch 2 ranking (impact vs. effort)

1. Alliance/ceasefire flag — near-free on top of existing Trade infra, large diplomacy payoff.
2. Escalating positioned-army yield — small, self-contained change, deepens idea 2 directly.
3. Shared event deck — new content but reuses the card/deck pattern; main risk is tuning so it doesn't become noise.
4. Trailing-player catch-up bonus — needs the most careful balance math (runaway-reversal risk).
5. Asymmetric faction traits — biggest scope; worth its own spec before building.

---

## Batch 3 — assuming batches 1–2 are implemented

Written as a third follow-on round, assuming ideas 1–8 above already exist. Same caveat as batches 1–2: proposals, not final numbers; need the game-designer stress-test pass before building.

### 9. Fog-of-war intel trading

**Problem it solves:** With Trade (1) and Alliances (4) in place, resources and non-aggression are tradeable but information isn't — there's no espionage layer.

**Proposed rule:** Extend the Trade payload (idea 1) with a new offer/request type: "reveal my view of tile (x, y)" instead of a resource amount. Resolution copies that tile's entry out of the proposer's `player.revealedTiles` into the recipient's, same atomic-write pattern as a resource trade. Creates backstab tension once alliances exist — a revealed tile can be weaponized by the very ally you traded it to.

**Files likely touched:** `src/lib/actions/trade.ts` (extend payload union), `TradeDialog` (new content-type toggle), `src/lib/types/map.ts` / `player.ts` (`revealedTiles` shape, confirm it's keyed by tile coordinate before assuming a single-tile copy is this cheap).

**Open questions:** single tile per trade, or a small radius? Does it leak the *army* currently on that tile (stale the instant it's revealed) or just terrain/resource type?

### 10. Base siege / capture-adjacent mechanic

**Problem it solves:** Bases can't be destroyed or meaningfully threatened today — defeated armies just respawn there (§6.4). With raidable farmers (2) and the roaming monster (3) normalizing "things near your base are vulnerable," sieging a base is the natural next escalation, and it gives the leaderboard ticker (7) actual teeth.

**Proposed rule:** If an enemy army occupies a player's base tile uncontested for N consecutive turns (e.g. 2), the occupier captures a one-time VP/resource bounty — not permanent base loss or elimination, which would be too swingy for a ~20-turn match. Needs a `baseOccupiedSinceTurn` tracker per base, cleared if the owner retakes the tile or the occupier leaves/is defeated.

**Files likely touched:** `src/lib/actions/attack.ts` or a new siege check in `handleEndTurn` (§6.1), `GameState` (occupation tracker per base), `docs/README.md` §5.2 (Base) and §6.4, tutorial copy.

**Open questions:** should the owner get a warning turn (siege telegraphed in the log before the bounty triggers), so it rewards board awareness rather than punishing an AFK-adjacent moment? Interacts with idea 12 below — a bot-takeover player's base shouldn't be an easy siege target just because the human stepped away.

### 11. Weather/terrain variety per island

**Problem it solves:** All resource islands function identically aside from resource type; Move/Attack decisions have no positional texture beyond "which resource" and "who's there."

**Proposed rule:** Add 1–2 terrain modifiers read off a new `island.terrainType`, e.g. a "mountain" island that halves the attacker's dice count (rounded up, min 1) in combat resolved there, or a "harbor" island that lets an army move one extra tile when departing from it. Pure multiplier/modifier read in the existing combat (`attack.ts`) and movement reducers — no new systems.

**Files likely touched:** `src/lib/types/map.ts` (`Island.terrainType`), `game-initializer.ts` (assign terrain during map generation), `src/lib/actions/attack.ts` and the movement reducer (apply modifier), `IslandTile.tsx` (visual tell), `bot-logic.ts` (bots should weigh terrain in their island-scoring heuristic), `docs/README.md` §5.2.

**Open questions:** does terrain affect monster combat too, or only player-vs-player? How does a "mountain" island interact with War Chief/Overcome cards — does it halve before or after card modifiers (order of operations needs to be explicit to avoid a rounding exploit)?

### 12. Elimination handling: bot takeover on quit (verified against the code)

**User's note on this one:** "I like the idea that if a player quits, the bot takes over, but I'm not sure the rest applies to the actual game logic, can you verify?" — **verified in this session.** Both parts of the original framing were checked against the actual reducers; findings below replace the earlier guesses.

**Verified finding 1 — no takeover concept exists today, and the real gap is worse than "idle seat":** repo-wide search for "takeover", "disconnect", "AFK", "abandon" turns up nothing but a generic "player abandonments" phrase in `docs/README.md` (about Firestore lobby hygiene, not mid-match handling). `bot-logic.ts` only reads a static `isBot` flag set at game creation — nothing ever flips a human seat to bot-controlled. `handlePlayerExit` (`src/lib/actions/player.ts:268-351`) only fires on an explicit exit action and has exactly two outcomes: delete the room (host leaves mid-game, no real players remain, or host leaves a ≤1-player lobby), or **splice the player entirely out of `state.players`**, renumbering IDs and stripping their map presence, advancing the turn if it was theirs. Neither path is what happens on a silent disconnect (tab close, crash, network drop) — that calls nothing. There is no server-side turn timer or AFK detection anywhere in `src/lib`, so a human who vanishes mid-turn leaves the game waiting forever on a client that will never respond: a true hang, not an "idle-but-skippable" seat. Building bot-takeover therefore requires adding disconnect detection from scratch (a presence heartbeat), not just extending an existing non-deletion branch.

**Verified finding 2 — the "armyless player stuck" framing was inaccurate; zero armies is never sustained:** Deploy cost (`initialDeployCost: 6`, `+2` per deploy, `game-initializer.ts:11-12`) is a monotonically increasing per-player counter (`nextArmyCost`), not a function of current army count — so a player who just lost their last army still faces whatever that counter has climbed to, which could exceed their wheat. But every combat defeat path (PvP: `attack.ts:153-155, 182-184`; monster: `attack.ts:362-364`) resets the losing army's position back to its owner's base and clears `hasActed` in the same synchronous reducer call that removed it from the losing tile — the army is relocated, never deleted. "Zero armies" is at most a transient in-memory moment inside one reducer, never a state a player can be stuck in across turns. A related but distinct state is real and already handled: a player with no affordable actions and no movable armies this turn has `hasPlayerRemainingActions` (`src/lib/turn-progression.ts:15-29`) return false, and `handleEndTurn` just skips them to the next player — that's "nothing to do this turn," not "armyless," and it's not broken.

**Revised proposed rule (only the half that holds up):** build disconnect detection (a presence heartbeat the client updates periodically, checked by whichever client/host currently drives `handleEndTurn`), and when a human is marked disconnected mid-match while other humans remain, hand their seat to the existing `bot-logic.ts` decision engine for subsequent turns instead of hanging the game. This is a real, verified gap (today: silent hang, not graceful skip) — the "second wind" / armyless-stuck half of the original idea is dropped, since the state it was solving for doesn't occur under current rules.

**Files likely touched:** new presence mechanism (`usePlayer.ts` or a dedicated hook, e.g. a Firestore heartbeat field with a staleness check), `handleEndTurn` / wherever turn advancement is driven (check for staleness before waiting on a human), `src/lib/actions/player.ts` (a new "mark as bot-controlled" transition, distinct from `handlePlayerExit`'s full removal), `bot-logic.ts` (reused as-is once a seat is flagged bot-controlled), `docs/README.md` §6.11.

**Open questions:** what staleness threshold counts as "disconnected" (missed one turn-timer cycle? N missed turns?) — needs to be generous enough to survive a brief reload without falsely triggering. Does the original player regain their seat on reconnect mid-match, and if so, do the bot's actions in the meantime stand?

### 13. Post-match meta-progression (cosmetic skins)

**Problem it solves:** Everything so far is single-match; nothing gives a structural reason to play a second match beyond wanting to.

**User's note on this one:** "is a cool idea, but we need to create a store for this, where player can buy custom skins" — this changes the scope meaningfully: a pure localStorage unlock track (as originally proposed) is nearly free, but a **store** implies a currency/earning loop and a purchase UI, which is a materially bigger build than the rest of this backlog and probably deserves its own sizing pass rather than folding into a single phase.

**Proposed rule (revised for a store):** Players earn a small amount of a new persistent currency (e.g. "Conquest Points," client-local via localStorage, same mechanism as the tutorial flag — no Firestore cost) per completed match, scaled by placement (win > top-half finish > loss). A store screen, reachable from the lobby, lets them spend Conquest Points on cosmetic sprite variants (recolors or alternate army/castle skins) — cosmetic only, no gameplay effect, to avoid pay-to-win-shaped concerns even though no real money is involved.

**Files likely touched:** new `src/modules/cosmetics-store/` (new code, per `CLAUDE.md` module layout), `usePlayer.ts` (currency balance, localStorage-backed), `player-data.ts` (sprite variant registry, currently fixed per color), lobby UI for a store entry point, `GameBoardHeader.tsx`/post-match dialog to award points on match end.

**Open questions:** are skins purely cosmetic (recolors of existing sprites) or do they need new art assets (bigger scope, outside a code-only task)? Does the store need to be visible to bots/spectators, or only the equipping player?

### Batch 3 ranking (impact vs. effort)

1. Bot-takeover-on-quit (revised idea 12) — solves a real, verified gap (silent hang on disconnect today, not a graceful skip), but needs disconnect detection built from scratch first — moderate-to-higher effort than originally scoped.
2. Weather/terrain variety — self-contained modifier, reuses existing reducers, no new entity types.
3. Fog-of-war intel trading — cheap on top of existing Trade infra (idea 1), but only valuable once Alliances (idea 4) exist to make betrayal meaningful.
4. Base siege/capture bounty — needs careful tuning (telegraphing, interaction with bot-takeover bases) before it stops feeling like punishing an AFK moment.
5. Cosmetic store (idea 13, revised scope) — biggest scope in this batch; needs its own sizing pass separate from the rest of this backlog, and a decision on art-asset scope before `/triage` can size it meaningfully.

---

## Batch 4 — two more, assuming batches 1–3 are implemented

### 14. Scored combat log / replay highlights

**Problem it solves:** Combat results (§6.4) flash in a dialog and then are gone except as a line in `GameLog.tsx`. With a roaming monster (3), sieges (10), and terrain (11) all adding more combat variety, there's no moment that makes a big win feel big after the fact.

**Proposed rule:** At match end, surface a short "highlights" summary (3–5 entries) pulled from the existing `log: string[]` — biggest single combat swing, most resources stolen in one Steal Resource, longest-held positioned farm before a raid, etc. Pure post-processing over data the game already tracks; no new `GameState` fields needed, just a derive function run once at the `finished` status transition.

**Files likely touched:** a new selector/derive function (reads `GameState.log` and `players`, no new state), the existing winner-announcement dialog (extend with a highlights section), `docs/README.md` §5.1 (winner declaration flow).

**Open questions:** does this need structured log entries (today `log` is likely plain strings per §3.2 — verify before assuming highlights can be derived cheaply, or whether the log needs to become structured events first, which is a bigger change).

### 15. Difficulty-tiered bot profiles

**Problem it solves:** `bot-logic.ts` currently has one behavior profile (§6.8's priority-scored evaluation). With asymmetric factions (8), terrain (11), and bot-takeover (12) all giving bots more to react to, a single fixed bot skill level means solo/practice play never gets harder or easier to match the player.

**Proposed rule:** Add an `aiDifficulty: 'casual' | 'standard' | 'aggressive'` lobby setting that scales existing priority weights in `bot-logic.ts` (e.g. casual bots under-value Attack priority and skip optimal-move search depth; aggressive bots over-value Attack and prioritize the human player's armies as targets over other bots). No new decision system — just different weight constants fed into the same scoring function.

**Files likely touched:** `game-initializer.ts` / lobby settings (new field), `bot-logic.ts` (parameterize the priority weights instead of hardcoding them), `CreateGameDialog.tsx` (difficulty selector), `docs/README.md` §6.8, balance-simulator config (`scripts/balance-simulator/`, since it already measures bot behavior and should be re-run per difficulty tier before shipping).

**Open questions:** should difficulty also affect bot behavior toward the new systems specifically (e.g. does an aggressive bot propose ceasefires it then bluffs, or never propose them at all)? This is the one idea in this batch that directly needs the balance simulator's existing tooling to validate rather than just dice math.

### Batch 4 ranking (impact vs. effort)

1. Difficulty-tiered bot profiles — reuses the existing scoring function and the balance simulator; mostly a tuning task, not a new system.
2. Scored combat log/replay highlights — low effort if `log` is already structured enough; otherwise gated on a bigger logging change first.
