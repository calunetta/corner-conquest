# Game design: bot action-scoring model

## Proposal (game-designer-a)

### Problem

Bot army-action scoring (`src/modules/game-rules/bot-army-actions.reducer.ts:14-70`) is flat priority
constants with no odds, no VP weighting, no base awareness:

- `attack-player`: `8 + (botAttackPower - enemyAttackPower)` (line 40)
- `attack-monster`: flat `7`, ignores monster level/dice (line 54)
- position on free resource spot: flat `6` (`POSITION_PRIORITY`, line 9)
- move onto unrevealed (fog) tile: flat `6` (line 76)
- move onto unoccupied resource/base tile with open spots: flat `4` (line 77)
- move onto a Special tile: flat `3` (line 79)
- any other move: flat `2` (line 70, 80)

`possibleActions.sort(...).priority` picks the single top score per loop (line 95-97). Resource
positioning (6) ties fog exploration (6) and beats every move type and most attacks, so bots funnel
armies onto resource spots turn after turn ("farming") and never compute whether a fight is
winnable. Base defense is absent: nothing reads `state.baseTiles` in this file. Combat-resolution
calls (lines 103-120) hardcode `useWarChief: false`, `useOvercome: false`,
`useDecideCard: false` — Overcome, War Chief and Decide Dice Roll are bought by
`bot-card-strategy.reducer.ts` logic never applies them, so bots never use their best cards in a
fight they're already in.

Fun lens: agency and tension. A bot that only farms is a predictable wall, not an opponent; a bot
that fights only when the dice favor it, defends its base, and spends its combat cards creates real
risk/reward tension for the human player.

### Current model (for reference)
As listed above. Unchanged: `bot-card-strategy.reducer.ts` pre-turn card usage (Reinforce,
Efficient, MasterBuilder, Wealthy, Sabotage, Productive) and `bot-purchases.reducer.ts` — this
proposal only touches army-action scoring and in-combat card use.

### Win-probability reference (verified)
Combat: each side rolls dice = own `attackPower + 1` (`combat-player-roll.reducer.ts`,
`combat-monster-roll.reducer.ts`), sums them, higher wins; tie goes to the defender in PvP, to the
monster in monster combat (`docs/ai/templates/game-design.md` table; verified in both reducers).
`scripts/balance-simulator/combat-odds.ts` already computes this distribution for the balance
simulator; it is a dev script, not importable from `src/modules/game-rules`, so the bot needs its
own copy of the same sum-distribution math (a small new pure helper, e.g.
`bot-combat-odds.ts`, ported from `combat-odds.ts`'s `sumDistribution`/`probabilityStrictlyGreater`
functions — no architecture change, just duplication of ~20 lines of pure math into the game-rules
module). Values below computed with that logic (`node -e`, see commands):

PvP win% (attacker strictly greater, tie→defender), by dice count (= attackPower+1, range 2-5):
```
atk\def  2      3      4      5
2       .444   .152   .036   .006
3       .779   .454   .192   .061
4       .939   .743   .460   .220
5       .988   .909   .718   .464
```
vs-monster win% (attacker strictly greater, tie→monster), monster dice = its level (1-4):
```
atkDice\lvl  1      2      3      4
2           .838   .444   .152   .036
3           .973   .779   .454   .192
4           .997   .939   .743   .460
5          1.000   .988   .909   .718
```
Monster VP by level (`combat-monster-resolve.reducer.ts:24`, `MONSTER_VICTORY_POINTS_BY_LEVEL`):
2 / 5 / 7 / 10 for levels 1-4. PvP win VP: flat 5 (`combat-player-resolve.reducer.ts:7`,
`COMBAT_WIN_VICTORY_POINTS`).

### Proposed model

Keep the additive-score, pick-top-candidate structure (`bot-army-actions.reducer.ts:95-97`) — it's
cheap and easy to reason about. Change the scoring formulas and add one new candidate type (move to
defend base). All inputs are already legally visible to the bot: own `attackPower`, enemy
`attackPower` (public player stat, already read at line 36), `state.baseTiles` (not fog-gated — a
player always knows where every base is, same as today's opponent-base move restriction in
`movement.reducer.ts:39-40`), and `activeBot.revealedTiles` for anything about a tile's contents.

**Attack a player** (replaces line 40):
```
score = ATTACK_PLAYER_BASE + ATTACK_PLAYER_SCALE * (winProb - 0.5) + onOwnBase * OWN_BASE_DEFENSE_BONUS
```
Constants: `ATTACK_PLAYER_BASE = 2`, `ATTACK_PLAYER_SCALE = 10`, `OWN_BASE_DEFENSE_BONUS = 4`.
`onOwnBase` = 1 when the fight's tile is this bot's own base tile (`state.baseTiles.find(b => b.owner === activeBot.id)`), else 0. `winProb` from the PvP table above using
`(botAttackPower+1, enemyAttackPower+1)` dice.

**Attack a monster** (replaces line 54):
```
score = ATTACK_MONSTER_BASE + ATTACK_MONSTER_SCALE * (winProb - 0.5) + monsterVP * MONSTER_VP_WEIGHT
```
Constants: `ATTACK_MONSTER_BASE = 3`, `ATTACK_MONSTER_SCALE = 8`, `MONSTER_VP_WEIGHT = 0.15`.
`winProb` from the monster table using `(botAttackPower+1, monster.level)`. `monsterVP` from
`MONSTER_VICTORY_POINTS_BY_LEVEL[monster.level]` (`combat-monster-resolve.reducer.ts`, already
imported by that reducer — re-export or duplicate the constant, it's a plain object literal).

**Defend base (new)**: for each move candidate whose destination is the bot's own base tile, add
```
defendBonus = enemyWithinDistance(1) ? DEFEND_BASE_NEAR : (enemyWithinDistance(2) ? DEFEND_BASE_FAR : 0)
```
Constants: `DEFEND_BASE_NEAR = 5`, `DEFEND_BASE_FAR = 3`, `THREAT_RADIUS = 2`. "Enemy within
distance N" checks Manhattan distance from the base tile to any enemy army currently on a tile in
`activeBot.revealedTiles` (fog-respecting: an un-revealed tile's occupants are never read). Skip the
bonus entirely if a bot army already occupies the base tile (defense is already in place; that
army instead gets the `attack-player` score above if an enemy is there too).

**Resource positioning** (replaces `POSITION_PRIORITY = 6` at line 9): `RESOURCE_SPOT_PRIORITY = 4`.
**Move onto unrevealed (fog) tile** (line 76): unchanged, `FOG_MOVE_PRIORITY = 6`. Now it strictly
beats resource positioning (was a tie), so early-game exploration no longer competes on a coin
flip.
**Move onto unoccupied resource/base tile with open spots** (line 77): `MOVE_TOWARD_RESOURCE = 3`
(was 4), merged with the Special-tile tier below it for simplicity.
**Move onto a Special tile** (line 79): unchanged, `MOVE_SPECIAL_PRIORITY = 3`.
**Any other move** (line 70, 80): unchanged, `MOVE_OTHER_PRIORITY = 2`.

**In-combat card use** — three one-line heuristics computed at the point `bot-army-actions.reducer.ts`
builds the `CombatRoll`/`MonsterCombatRoll` payload (lines 108-120), using the same `winProb` already
computed for the chosen attack:
- **Decide Dice Roll** (monster only): `useDecideCard: activeBot.specialCards.includes(CardName.DecideDiceRoll)`, `decidedValue: 6`. Already wired (`decidedValue: 6` is hardcoded at line 112 today, only `useDecideCard` needs to flip from `false`). No downside — it only ever helps, so use it whenever held.
- **War Chief** (either combat type): `useWarChief: hasCard && Math.abs(winProb - 0.5) <= WAR_CHIEF_SWING = 0.2`. Spend it only on a close fight, where the flat +2 score is most likely to flip the result; a lopsided fight doesn't need it and a hopeless one still loses with it.
- **Overcome** (either combat type): `useOvercomeCard: hasCard && winProb < OVERCOME_THRESHOLD = 0.3 && (onOwnBase || (isMonster && monster.level >= 3))`. Spend the single-use auto-win only to save a base invasion or bag a high-value monster the bot would otherwise lose; never burn it on a routine losing skirmish.

### Worked examples

**1. Base invasion, bot favored.** Bot `attackPower = 2` (dice 3), enemy invader on the bot's own
base tile with `attackPower = 1` (dice 2). PvP table: `winProb(3,2) = .779`.
`score = 2 + 10*(.779-.5) + 1*4 = 2 + 2.79 + 4 = 8.79`. Compare: resource positioning elsewhere
scores 4, fog move 6 — defending wins outright. War Chief check: `|.779-.5| = .279 > .2`, not used
(already favored). Overcome check: `.779 ≥ .3`, not used. Off-base, the same matchup would score
`2 + 2.79 = 4.79` — still attacks, but no longer dominant over a fog move (6), which is correct: a
routine kill elsewhere is less urgent than exploring.

**2. Monster, strong vs weak.** Bot `attackPower = 2` (dice 3). Weak option: Lancer, level 1
(`winProb(3,1) = .973`, VP 2): `score = 3 + 8*(.473) + 2*.15 = 3 + 3.784 + 0.3 = 7.08`. Strong
option: Ogre, level 3 (`winProb(3,3) = .454`, VP 7): `score = 3 + 8*(-.046) + 7*.15 = 3 - .368 + 1.05
= 3.68`. The bot picks the safe Lancer (7.08 > 3.68) over the far more valuable but near-coinflip
Ogre, matching goal 3 ("attack when winnable"). War Chief check on the Ogre: `|.454-.5| = .046 ≤
.2`, so if the bot also chose to engage the Ogre (e.g., no weak monster were present) it spends War
Chief: `node -e` recomputed `attacker(dice 3)+2 vs monster(dice 3)` win% = `.637` (command used:
shift the attacker's 3-dice sum distribution by +2, then `probabilityStrictlyGreater` against the
monster's 3-dice distribution — same functions as `combat-odds.ts`). Overcome check: `.454 ≥ .3`,
not used — saved for a worse spot.

### Expected effects
- Bots stop auto-farming: resource score (4) now loses to any attack with `winProb > .55` or so, and to fog exploration (6) and base defense (5/3) outright.
- Bots disengage from hopeless fights: a monster or player fight with `winProb` well under 0.5 scores near or below `MOVE_OTHER_PRIORITY (2)`, so the bot's other unacted armies' ordinary moves (including moving a different army away) can outrank it; the losing army still fights if it's the only legal action that turn (existing engine has no "decline combat" action — see Risks).
- Base defense becomes visible: a bot pulls an idle army home when an enemy is within 2 tiles, without needing combat to already be happening.
- Combat cards get used: Decide Dice Roll always when held in a monster fight; War Chief on close fights; Overcome only to save a base or bag a top monster.

### Risks
- **No decline-combat action exists.** If an army sits on a tile with a now-unfavorable enemy or monster and has no other unacted army this turn, `attack-player`/`attack-monster` can still be the only candidate with `priority > 0` (e.g., `winProb = .1` still scores `2 + 10*(-.4) = -2` for PvP, which is negative, so the engine would instead pick any move, even `MOVE_OTHER_PRIORITY (2)` — confirm during implementation that `getPossibleMoves` always returns at least one non-attack option when the army hasn't acted, else the bot is stuck proposing the negative-score attack by default since `possibleActions` could otherwise be empty). This needs a code check, not a design change.
- **`DEFEND_BASE_NEAR/FAR` can thrash with resource scoring** if an enemy patrols just outside radius 2 repeatedly — low risk since it only affects move-to-base candidates, not all moves, and recomputes fresh every loop from current positions (no memory/hysteresis needed).
- **Duplicating `combat-odds.ts` math into `src/modules/game-rules`** is small (two pure functions, ~20 lines) but is a second source of truth for the same formula; flag for the architect to consider extracting a single shared `dice-odds.ts` used by both the balance simulator and the bot, rather than truly duplicating it.
- **Monster VP weight (`0.15`) is a new number with no existing anchor**; it was picked so a safe level-1 kill (VP 2, weight 0.3) still loses to a risky level-4 kill (VP 10, weight 1.5) when win odds are close, but always loses to a safe kill when odds differ sharply (worked example 2). Playtesting may want it higher if bots still avoid high-value monsters too often.

### Open questions
- Should `OWN_BASE_DEFENSE_BONUS` also reduce the bot's own resource-positioning score on the base tile while a threat is near (i.e., pull the defending army off auto-farming its own base resource to stay combat-ready)? Not modeled here — `isArmyEligibleToPosition` already prevents a positioned army from being double-counted as a combat candidate until it moves, so this only matters if the current design under-defends in practice.
- Should fog-move priority (6) decay over the match (e.g., once `activeBot.revealedTiles.length` covers most of the map) so late-game bots stop wandering into fog instead of reinforcing fights? Out of scope for this pass; goal 5 only asked that early exploration still happens, which this model preserves unchanged.

## Review (game-designer-b)

VERDICT: APPROVED

Math re-verified independently (`node -e`, enumerating both dice-sum distributions): PvP and
monster tables match exactly. War Chief recompute (atk dice3+2 vs monster dice3 = .637) also
matches. Code citations for Overcome (`combat-player-roll.reducer.ts:40-57`,
`combat-monster-roll.reducer.ts:51-65`), War Chief (`:59-73`, `:68-82`) and Decide Dice Roll
(`combat-monster-roll.reducer.ts:84-106`, monster-only, non-decreasing since `decidedValue=6`
only replaces a lower roll) all check out against the actual reducers.

Findings:
1. **"Expected effects" breakeven is wrong.** Off-base, resource score (4) beats
   `ATTACK_PLAYER_BASE(2) + 10*(winProb-.5)` until `winProb > 0.7`, not ".55 or so"
   (`2+10(x-.5)=4 → x=0.7`). Fix: correct the sentence; bots keep farming through any winProb up to
   0.7, more conservative than described, not a balance bug.
2. **One-card-per-turn interaction undocumented.** `card-effects.reducer.ts:17` throws past one
   `GameAction.UseCard` per turn; `player-turn.reducer.ts:81` resets it only at turn start. Any
   pre-turn card bot-card-strategy fires (Reinforce/Wealthy/Sabotage/etc.) sets
   `actionsThisTurn` before army-actions run, so `canUseCard` (`combat-player-roll.reducer.ts:38`,
   `combat-monster-roll.reducer.ts:49`) silently no-ops War Chief/Overcome/Decide that same turn.
   No crash, pre-existing constraint, not introduced by this proposal — but "combat cards get used"
   overstates frequency. Fix: one sentence in the spec, no code change.
3. **No-decline-combat risk — resolved, no new rule.** A cornered army with zero legal moves and
   only a hopeless attack still auto-fights (engine has no decline action). This is pre-existing:
   today's flat `8 + diff` formula already always attacks unconditionally when an enemy is present.
   The new scoring reduces frequency (other armies' moves now outrank a negative-score attack) but
   can't eliminate the zero-alternative edge case. Adding a decline-combat action is out of the
   complexity budget for a scoring-only task (new player-facing action, not a tooltip-sized rule).
   Smallest option: accept and document the edge case, not add a mechanism.
4. `MONSTER_VICTORY_POINTS_BY_LEVEL` is module-private (`const`, not exported) in
   `combat-monster-resolve.reducer.ts:6` — must be exported or duplicated, it is not already
   importable as the proposal's parenthetical implies.
5. Dice-odds helper plan (new `bot-combat-odds.ts` pure functions inside
   `src/modules/game-rules`, no import from `scripts/`) is compliant and correctly scoped.

No dominant strategy, runaway leader, or Firestore-write regression found: this is pure reducer
math, no new writes, no new UI, fog-respecting inputs only (`activeBot.revealedTiles`, public
`attackPower`, always-visible `baseTiles`).

## Final spec

Replace flat priorities in `bot-army-actions.reducer.ts` with:
- `attack-player`: `2 + 10*(winProb-0.5) + (onOwnBase ? 4 : 0)`, `winProb` from the PvP table
  above using dice `(botAttackPower+1, enemyAttackPower+1)`.
- `attack-monster`: `3 + 8*(winProb-0.5) + monsterVP*0.15`, `winProb` from the monster table using
  `(botAttackPower+1, monster.level)`, `monsterVP = MONSTER_VICTORY_POINTS_BY_LEVEL[monster.level]`
  (export it from `combat-monster-resolve.reducer.ts` rather than duplicating the literal).
- New move candidate, own base tile only: add `5` if an enemy army is within Manhattan distance 1,
  `3` within distance 2, else `0`, to that tile's existing move score (fog-respecting: scan only
  `activeBot.revealedTiles`).
- Resource positioning: `4` (was 6). Fog move: `6` (unchanged). Move to open resource/base/Special:
  `3` (merged, was 4/3). Any other move: `2` (unchanged).
- New pure helper `bot-combat-odds.ts` in `src/modules/game-rules`: port `sumDistribution` /
  `probabilityStrictlyGreater` from `scripts/balance-simulator/combat-odds.ts` verbatim (~20 lines,
  no import from `scripts/`).
- In-combat cards at the `CombatRoll`/`MonsterCombatRoll` call sites: `useDecideCard` = held
  (monster only, `decidedValue: 6`); `useWarChief` = held and `|winProb-0.5| <= 0.2`; `useOvercome`
  = held and `winProb < 0.3` and (`onOwnBase` or monster `level >= 3`). All three are already
  guarded by `canUseCard`/`actionsThisTurn` in the existing reducers — no new guard needed, and the
  payload safely no-ops if a pre-turn card already spent this turn's one card use.
- Known accepted edge case, not fixed here: an army with zero legal moves and only a hopeless
  attack still fights (no decline-combat action exists in the engine).
