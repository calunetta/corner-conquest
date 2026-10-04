# Game design: Balance and fun review of the current ruleset

## Proposal (game-designer-a)

This is a review of the live rules, not a single feature. It covers three verified problems, each
with its own options and recommendation, plus a ranked backlog of smaller findings. All numbers
are read from `src/modules/game-rules/` in this session; dice math is computed with `node -e`
(commands and output pasted below, not estimated).

---

### Problem 1 — the card deck does not match its own design intent, and the one card that matters most (Overcome) is over-represented

**Fun lens:** mastery (a player who learns the deck should be rewarded; today the deck doesn't behave the way its own data describes) and risk and reward (a guaranteed-win card should be rare).

**Evidence**
- `card-data.ts:12-26` defines `SPECIAL_CARDS`, a weighted 19-card list ("More copies of common cards, fewer of rare ones"): `Extra Move` ×3, `Steal Resource` ×2, `Reinforce` ×2, `Wealthy` ×2, `Productive` ×2, and one copy each of `Efficient`, `Master Builder`, `War Chief`, `Decide Dice Roll`, `Scout`, `Overcome`, `Sabotage`, `Teleport`.
- `game-setup.reducer.ts:110-111` never uses that list. It builds the live deck from `BASE_CARDS` (`card-data.ts:4-9`, the 13 unique names, no weights) doubled: `[...finalCardDeck, ...finalCardDeck]` = 26 cards, exactly 2 of every kind.
- `grep -rn "SPECIAL_CARDS" src/` (excluding tests) returns zero matches outside `card-data.ts` itself: it is dead code. This exact drift was already found and confirmed by two independent design passes in `docs/ai/tasks/2026-10-02-bot-balance-simulator/game-design.md:21,167` and recorded as a known doc/code drift in `docs/balance-simulator-guide.md` ("Deck composition (a documentation drift, not a bug)"). I re-verified it fresh in this session rather than taking it on faith.
- Consequence: `Overcome` (automatic combat win, `combat-player-roll.reducer.ts:33-46`, `combat-monster-roll.reducer.ts:44-54`) is drawn at the same rate as `Extra Move` or `Wealthy` — 2/26 = 7.7% per draw — instead of the designed 1/19 = 5.3%. The designed deck already treats Overcome as equally common as `Master Builder`, `War Chief`, `Decide Dice Roll`, `Scout`, `Sabotage` and `Teleport`, which is itself worth reconsidering given Overcome's effect size (see Problem 2).

**Options**

| Option | Player-facing summary | Fun lens | Complexity cost |
|---|---|---|---|
| A (minimal) | Wire the deck construction to `SPECIAL_CARDS` instead of doubled `BASE_CARDS`. No new rule, no new card, no UI change — just make the shipped deck match the one the game's own data already describes. | mastery | None. Deletes a parameter mismatch; the weighted list already exists and is already filtered against `settings.availableCards` the same way `BASE_CARDS` is today. |
| B | A, plus demote `Overcome` and `Teleport` to a new "rare" tier at 1 copy in a deck trimmed to 24 cards (remove one `Extra Move` and one `Productive` to keep hand-limit pressure similar), so a 4-player, 7-card-hand game has a lower chance of two players holding an auto-win in the same match. | mastery, risk and reward | Low: a data-only change to one constant, same shape as A. |
| C | Split the deck into two draws: a "common" pool (everything except Overcome/Teleport/Sabotage) drawn by `BuyCard` and Special Island rolls, and a separate rare pool with its own, lower draw chance for those three. | risk and reward | Medium: two decks, two reshuffle paths, a new rule to explain in a tooltip ("some cards are rarer and only found a different way") — likely not worth it next to A/B. |

**Recommended rule spec**
- Adopt **Option A** now: `game-setup.reducer.ts` builds `initialDeck` from `SPECIAL_CARDS.filter((card) => settings.availableCards.includes(card))` instead of doubled `BASE_CARDS`. Deck size drops from 26 to 19 cards (filtered the same way `availableCards` already filters `BASE_CARDS`).
- Revisit Option B only after Problem 2's War Chief/Overcome rebalance ships and the simulator (see "How we will know it works") shows whether 1/19 is still too common for a guaranteed win.

---

### Problem 2 — War Chief turns an even fight into a near-certainty, and losing a fight costs the loser almost nothing

**Fun lens:** risk and reward, and tension and pacing (pillar 1: "every turn offers a meaningful choice" is undercut when one card removes the choice).

**Evidence**
- Dice: both sides roll `attackPower + 1` six-sided dice (`combat-player-roll.reducer.ts:60-61`), minimum 1 (`dice.ts:5`). Max attack power is 4 (`player-actions.reducer.ts:5`), so the dice pool never exceeds 5 per side without a card.
- Ties favour the defender in PvP (`combat-player-roll.reducer.ts:66`) and the monster in monster combat (`combat-monster-roll.reducer.ts:93`); this matches `docs/README.md` §6.4 exactly.
- `War Chief` adds a flat `+2` attack power for one fight (`combat-player-roll.reducer.ts:5,48-58`; same constant in `combat-monster-roll.reducer.ts:5`). `Overcome` skips the roll and wins outright (`combat-player-roll.reducer.ts:33-46`).
- Computed with `node -e` (enumerated dice distributions, exact, not simulated):
  ```
  node -e "
  function dist(n){let d=new Map([[0,1]]);for(let i=0;i<n;i++){const e=new Map();for(const[s,p]of d)for(let f=1;f<=6;f++)e.set(s+f,(e.get(s+f)||0)+p/6);d=e}return d}
  function pwin(a,b,tieWinsAttacker){const A=dist(a),B=dist(b);let w=0;for(const[x,p]of A)for(const[y,q]of B){if(x>y)w+=p*q;else if(x===y&&tieWinsAttacker)w+=p*q;}return w}
  console.log('Equal AP4 vs AP4, no card:', pwin(5,5,false).toFixed(4));
  console.log('AP4 + War Chief (+2) vs AP4:', pwin(7,5,false).toFixed(4));
  console.log('AP4 + War Chief (+1, proposed) vs AP4:', pwin(6,5,false).toFixed(4));
  console.log('AP0 + War Chief (+2) vs AP4 (today, underdog):', pwin(3,5,false).toFixed(4));
  console.log('AP0 + War Chief (+1, proposed) vs AP4:', pwin(2,5,false).toFixed(4));
  "
  ```
  Output:
  ```
  Equal AP4 vs AP4, no card: 0.4637
  AP4 + War Chief (+2) vs AP4: 0.8624
  AP4 + War Chief (+1, proposed) vs AP4: 0.6996
  AP0 + War Chief (+2) vs AP4 (today, underdog): 0.0607
  AP0 + War Chief (+1, proposed) vs AP4: 0.0061
  ```
  A card draw (not an investment) converts a coin-flip-ish fight (46%) into an 86% near-certainty. `Overcome` is strictly worse to balance than this, since it is already 100%, and both cards appear at the same 2/26 (or, after Problem 1's fix, 1/19) rate as cards with far smaller effects like `Scout`.
- The loser's cost is almost nothing by design: `combat-player-resolve.reducer.ts:47-50,82-84` and `combat-monster-resolve.reducer.ts:80-87` send the losing army back to its own Base with `hasActed` **reset to `false`** — it can act again immediately if the owner has another move this turn. The only real costs are losing a positioned resource spot if the defender was positioned (`combat-player-resolve.reducer.ts:53-61`) and the travel time to walk the army back across the map. There is no resource loss, VP loss, or card loss for losing. Meanwhile every PvP win pays a flat `+5 VP` regardless of how the fight was won (`combat-player-resolve.reducer.ts:5,31,66`) — the same 5 VP for a coin-flip dice win as for an Overcome-guaranteed win. Against a 30 VP goal (`defaultGameSettings.victoryPointGoal`, `game-setup.reducer.ts:9`), that is 16.7% of the game in one card-assisted, risk-free attack.
- Bots never raise this problem themselves — `bot-army-actions.reducer.ts:99-113` always rolls combat with `useWarChief: false, useOvercome: false` — but a human attacking a bot, or a human attacking another human, can use it every time they hold the card, and the bot has no way to hold back or play around it.

**Options**

| Option | Player-facing summary | Fun lens | Complexity cost |
|---|---|---|---|
| A (minimal) | Reduce War Chief's bonus from +2 to +1 attack power. One constant (`WAR_CHIEF_BONUS_POWER` in both combat-roll reducers). Tooltip: "Gain +1 attack power for your next battle." | risk and reward | Lowest: a number change, no new state, no new UI. |
| B | A, plus combine with Problem 1's Option A (rarer deck) so the card is both weaker and less common; no VP change. | risk and reward, mastery | Same as A; Problem 1 is already recommended. |
| C | Keep War Chief at +2, but make PvP win VP scale with risk: 5 VP for a normal win, 3 VP if the attacker used Overcome or War Chief (a card-assisted win is "cheaper" to the game's pacing because it was less earned). Requires tagging the win in `combatState` and reading it in `combat-player-resolve.reducer.ts`. | risk and reward | Medium: new field on `combatState`, a second VP constant, a line of UI/tooltip and a log-message change; touches the Firestore-written `combatState` shape. |

**Recommended rule spec**
- Adopt **Option A**: `WAR_CHIEF_BONUS_POWER = 1` in `combat-player-roll.reducer.ts:5` and `combat-monster-roll.reducer.ts:5`. It keeps War Chief useful (0.4637 → 0.6996 against an equal-AP target, still the single strongest card in the deck) without making an even fight a near-lock. Leave the flat 5 VP combat reward and the defender/monster tie rule alone — Option C's VP-scaling raises the complexity budget for a problem Option A already fixes at the source.

---

### Problem 3 — positioning is a one-shot action disguised as a passive one, which stalls pacing and is the root cause of the bots' Base-camping bug

**Fun lens:** tension and pacing (pillar 2 target is about 20 turns; see evidence below) and feedback and juice (the code's own comment says collection is "automatic each turn"; the actual behaviour contradicts it).

**Evidence**
- `resource-position.reducer.ts:3` doc comment: "Positions an army on a resource node so it yields that resource automatically each turn." The behaviour does not match: `player-turn.reducer.ts:7-33` (`applyAutomaticCollection`) collects once, then clears `player.positions` and the tile's `positionedBy` entry (`player-turn.reducer.ts:24-30`). The army keeps its map position but is no longer "positioned" for yield purposes until the owner clicks Position again.
- Positioning sets `hasActed = true` for that army (`resource-position.reducer.ts:36`), and `handleEndTurn` resets every one of the player's armies to `hasActed = false` at the start of their own next turn (`player-turn.reducer.ts:60`) — so re-positioning the same army on the same spot every single turn costs a click but never costs an action slot the player would have used for anything else, because it is the first thing available every turn.
- This is exactly the mechanism the balance-simulator review already measured as "Base-camping": a bot's lone army scores "position on resource" at priority 9, beating "move to unexplored tile" at priority 6 (confirmed again in this session, `bot-army-actions.reducer.ts:54-64` priority 9 vs `:70-77` fog-of-war move priority 6), so with positions clearing every turn the bot re-positions on its own Base forever instead of ever moving out. The prior probe (`docs/ai/tasks/2026-10-02-bot-balance-simulator/game-design.md:16,154-159`) measured fog-on matches finishing at a median 73–79 rounds against a pillar target of about 20, with 31–35% of seats never leaving Base by round 100.
- This is a rule problem, not only a bot problem: a human player faces the identical one-click-per-turn-per-army tax to keep the economy running, with zero strategic content in the re-click (there is never a reason not to reposition the same spot). It is busywork, which costs the "feedback and juice" and "every turn offers a meaningful choice" pillars even for attentive players, and it is the rule that makes the bots' stalling possible in the first place — fixing the bot's priority order alone (a bot-only change, out of this review's scope) would not remove the tedium for humans.

**Options**

| Option | Player-facing summary | Fun lens | Complexity cost |
|---|---|---|---|
| A (minimal) | Make positioning persistent: once an army positions on a resource, it keeps yielding that resource every turn without re-clicking, until the army moves, attacks, or is defeated. `player.positions` stops being cleared in `applyAutomaticCollection`; only `movement.reducer.ts`/combat-resolve clear a specific army's position when it actually leaves or dies (both already do this for the "army moved away" and "army died" cases — `combat-player-resolve.reducer.ts:53-61` already removes the position on death; movement needs the same check added for a voluntary move). Tooltip: "A positioned army keeps collecting its resource every turn until it moves or is defeated." | tension and pacing, feedback and juice | Low: removes a clearing step, adds one equivalent check to `movement.reducer.ts` for the case "army currently positioned moves away." No new state field — `player.positions` already exists and already survives turns in every other code path. |
| B | A, plus give positioning a one-time "settle" cost (small wheat fee) so persistent positions are a real economic decision instead of a free action, preventing a day-one rush to position every army and never move again. | agency, risk and reward | Medium: new cost constant, new UI copy, a reason to re-tune `initialDeployCost`/`deployCostIncrement` since the economy's shape changes. |
| C | Leave positioning one-shot, but remove it from the bot's blind priority order instead (rank exploration above Base positioning until the bot has 2+ armies). | tension and pacing | Bot-only; does not fix the human-facing busywork this review is scoped to, and was already flagged as a bot follow-up in `docs/balance-simulator-guide.md` ("Follow-ups the data already justifies") — out of scope for a rule change. |

**Recommended rule spec**
- Adopt **Option A**. It is a strict simplification (one rule removed — "re-position every turn" — nothing added) that fixes the human busywork and removes the bot's primary stalling loop at its root, rather than papering over the bot's priority order while leaving the rule that caused it.

---

### Balance math (summary)

All combat probabilities above are computed exactly by enumerating the two dice-pool distributions and summing the joint probability where attacker-sum > defender-sum (plus the tie term where the rule awards the tie to the attacker), not simulated — see the `node -e` command embedded in Problem 2. Re-run with different dice counts to check any other matchup before changing them further.

Deck-size math for Problem 1, Option A: `SPECIAL_CARDS.length` = 19 (`card-data.ts:12-26`, counted by hand: 3+2+2+2+2+1+1+1+1+1+1+1+1 = 19). Current live deck is `BASE_CARDS.length * 2` = 13 × 2 = 26 (`card-data.ts:4-9`, `game-setup.reducer.ts:111`). P(draw Overcome on a single `BuyCard` or Special Island roll) goes from 2/26 ≈ 7.69% to 1/19 ≈ 5.26%.

### Interactions and exploits checked
- **Overcome + War Chief stacking:** mutually exclusive in both combat dialogs today (`docs/README.md` §6.4: "rendered as a mutually exclusive `RadioGroup`"), confirmed by the `useOvercome`/`useWarChief` payload shape in `combat-player-roll.reducer.ts:10,14-15` where `useOvercome` short-circuits before `useWarChief` is ever read (`combat-player-roll.reducer.ts:33-46` returns before line 48). The War Chief nerf (Problem 2) does not change this; Overcome still fully bypasses dice.
- **Hand limit (7 cards):** none of these three changes touch acquisition rate or hand size. Problem 1's smaller deck (19 vs 26 cards) reshuffles the discard pile sooner in a long game; `handleBuyCardAction` (`card-acquisition.reducer.ts:20-29`) already reshuffles correctly when the deck empties, so this is a non-issue.
- **Fog of war:** Problem 3's persistent positioning does not change discovery or `revealedTiles` logic at all — it only changes when `player.positions` is cleared.
- **Bots:** Problem 1 and 2 need no bot change — bots already ignore War Chief/Overcome entirely (`bot-army-actions.reducer.ts:108-113`), so a weaker, rarer version of both cards only reduces the risk a *human* opponent poses to a bot, which is the direction bots need (they are already not using their strongest tools). Problem 3's persistent positioning **helps** today's known bot bug (`bot-turn.reducer.ts`'s unmodified priority order would stop re-triggering every turn once a position persists, since `isAlreadyPositioned` in `bot-army-actions.reducer.ts:54` already checks `activeBot.positions.some(...)` — today it's always false after collection clears it; with persistence it becomes a real, working guard that frees the bot to move instead of looping).
- **Turn order / seat distance:** untouched by all three problems; the existing seat-distance asymmetry noted in the prior balance review (`docs/ai/tasks/2026-10-02-bot-balance-simulator/game-design.md:20`) is a map-generation question, not addressed here.
- **Card-acquisition exploit check:** Problem 1's Option A was checked against `availableAbilities`/`availableCards` lobby settings (`game-setup.reducer.ts:17-18`) — `SPECIAL_CARDS.filter((c) => settings.availableCards.includes(c))` behaves identically to the current `BASE_CARDS.filter(...)` call when a lobby disables a card kind: the disabled kind simply has zero copies either way.

### Bot impact
- Problem 1 (deck wiring): no bot change. `bot-purchases.reducer.ts:39-47` buys cards blind regardless of the deck's contents; `bot-card-strategy.reducer.ts` only reacts to cards already in hand.
- Problem 2 (War Chief nerf): no bot change needed or possible — `bot-army-actions.reducer.ts:99-113` never sets `useWarChief`/`useOvercome` to `true`. This is a known, already-documented bot gap (`docs/balance-simulator-guide.md`, "Known bot facts": "Bots never play combat cards"); out of this review's scope to fix, but worth flagging again because it means these two cards currently only ever matter in human-involved matches.
- Problem 3 (persistent positioning): `bot-army-actions.reducer.ts:54-64`'s `isAlreadyPositioned` check already exists and already intends to stop a bot from re-positioning the same army — it is a dead guard today only because positions are cleared every turn. Making positions persistent turns this existing guard into a working one with zero bot-code changes; bots should be re-measured with the balance simulator afterward (not run in this review — no code changed) to confirm the Base-camping numbers in `docs/ai/tasks/2026-10-02-bot-balance-simulator/game-design.md` improve.

### UI needs
- Problem 1: none (the deck is invisible state).
- Problem 2: update the `War Chief` tooltip/description string (`card-data.ts:52`, `SPECIAL_CARD_DESCRIPTIONS`) from "+2 attack power" to "+1 attack power" and the matching `TutorialBeacon` copy per `docs/README.md` §6.10's maintenance rule.
- Problem 3: update the `Position` action's tooltip/help text (wherever `ActionsPanel` or its beacon describes Position today — not read in this session, flag for the ui-designer to locate and confirm the exact file) to say the position persists until the army moves or is defeated, and remove any "re-position each turn" guidance from the tutorial copy if present.

### How we will know it works
- Unit tests: `combat-player-roll.reducer.test.ts` and `combat-monster-roll.reducer.test.ts` already assert War Chief's bonus value — update the expected dice-pool size from `attackPower + 1 + 2` to `+ 1`. `resource-position.reducer.test.ts` and `player-turn.reducer.test.ts` need a new case asserting a position survives `handleEndTurn`'s collection and is only removed by a move or a combat loss.
- Playtest signal: re-run `scripts/balance-simulator` (bot-vs-bot, fog on, same seed as the prior probe) after Problem 3 ships. Expect the median finished-match length to drop from ~75 rounds toward the ~20 pillar target, and the "seats never off Base by round 100" share to drop from the probe's 31–35%. If it doesn't move, the bot's priority order (not this rule) is still the bottleneck and that is a separate, bot-only follow-up.
- Playtest signal for Problem 2: in human-vs-human or human-vs-bot sessions, a War Chief-assisted attack against an equal-AP target should feel winnable-but-not-automatic (~70%) rather than a near-sure thing (~86%).

## Review (game-designer-b)
VERDICT: APPROVED (with two folded-in fixes to Problems 2 and 3; Problem 1 approved unchanged)

Re-verified independently in this session: read `card-data.ts`, `game-setup.reducer.ts`, `combat-player-roll.reducer.ts`, `combat-monster-roll.reducer.ts`, `combat-player-resolve.reducer.ts`, `combat-monster-resolve.reducer.ts`, `resource-position.reducer.ts`, `player-turn.reducer.ts`, `movement.reducer.ts`, `combat-initiate.reducer.ts`, `bot-army-actions.reducer.ts`, `card-acquisition.reducer.ts`, `player-factory.ts`, `player-actions.reducer.ts`, `src/lib/types/actions.ts`. Re-ran the dice math independently with fresh `node -e` commands (not copy-pasted from Problem 2's output) — numbers matched exactly.

### Finding 1 — Problem 1 (deck wiring): confirmed correct, no changes requested
- `grep -rn "SPECIAL_CARDS" src/ --include="*.ts" --include="*.tsx" | grep -v ".test."` returns only the definition at `card-data.ts:12` — re-confirms the dead-code claim fresh, not on prior-session faith.
- Hand-counted `SPECIAL_CARDS` (card-data.ts:12-26): 3+2+2+2+2+1+1+1+1+1+1+1+1 = 19. `BASE_CARDS.length` (card-data.ts:4-9) = 13, doubled = 26 (`game-setup.reducer.ts:110-111`, confirmed live). 2/26 = 7.69% vs 1/19 = 5.26% for Overcome — matches the proposal exactly.
- Reshuffle path checked (`card-acquisition.reducer.ts:15-29,76-86`): both `BuyCard` and the special-island roll reshuffle the discard pile into the deck whenever it's empty, independent of starting deck size. A 19-card deck reshuffles sooner in a long game but never dead-ends. No exploit, no Firestore-write change (deck is part of the one game document already rewritten every action).
- Adopt as specified: **Option A, unchanged.**

### Finding 2 — Problem 2 (War Chief nerf): the +2→+1 fix only reaches "coinflip, not auto-win" at the one attack-power level that's rarest in practice
- The proposal's math is correct at AP4 (0.4637 → 0.6996, re-verified), but AP4 is the *most invested* state (costs 6 iron × 4 = 24 iron, capped by `MAX_ATTACK_POWER` in `player-actions.reducer.ts:120`, confirmed `attackPower` starts at `0` in `player-factory.ts:38`). Re-ran the same dice model across all five attack-power levels (0-4), using the attacker's own base dice pool (`attackPower+1`) for both sides at each level:
  ```
  node -e "
  function dist(n){let d=new Map([[0,1]]);for(let i=0;i<n;i++){const e=new Map();for(const[s,p]of d)for(let f=1;f<=6;f++)e.set(s+f,(e.get(s+f)||0)+p/6);d=e}return d}
  function pwin(a,b){const A=dist(a),B=dist(b);let w=0;for(const[x,p]of A)for(const[y,q]of B){if(x>y)w+=p*q;}return w}
  for (const ap of [0,1,2,3,4]) { const base=ap+1;
    console.log('AP'+ap,'no card:',pwin(base,base).toFixed(4),' WC+1(proposed):',pwin(base+1,base).toFixed(4),' WC+2(today):',pwin(base+2,base).toFixed(4)); }
  "
  ```
  Output:
  ```
  AP0 no card: 0.4167  WC+1: 0.8380  WC+2(today): 0.9730
  AP1 no card: 0.4437  WC+1: 0.7785  WC+2(today): 0.9392
  AP2 no card: 0.4536  WC+1: 0.7428  WC+2(today): 0.9093
  AP3 no card: 0.4595  WC+1: 0.7181  WC+2(today): 0.8840
  AP4 no card: 0.4637  WC+1: 0.6996  WC+2(today): 0.8624
  ```
  At AP0-AP2 — the attack-power range players actually sit in for most of a ~20-turn match, before 12-18 iron has been spent purely on attack upgrades — the proposed +1-die nerf still gives 74-84% win rate on an even fight. That is closer to today's broken 86% than to the "winnable but not automatic" feel the proposal's playtest signal (§"How we will know it works") asks for. The proposal only checked the AP4 case; the fix's own stated goal is not met for most of the game.
  - Cause: a flat "+1 die" bonus is proportionally much larger against a small dice pool (1-3 dice early) than against a large one (5 dice at AP4), since one extra d6 is a bigger fraction of a small pool's variance and mean.
- **Fix folded in**: replace the "+1 extra die" mechanic with a **flat +2 to the combat score total** (no extra die rolled at all) — same card, same trigger, smaller code footprint (removes the `attackerBonusPower` effect on `rollDice()`'s dice-count argument; adds it to the score sum instead). Re-verified with the same exact-enumeration method:
  ```
  node -e "
  function dist(n){let d=new Map([[0,1]]);for(let i=0;i<n;i++){const e=new Map();for(const[s,p]of d)for(let f=1;f<=6;f++)e.set(s+f,(e.get(s+f)||0)+p/6);d=e}return d}
  function pwinFlat(a,b,bonus){const A=dist(a),B=dist(b);let w=0;for(const[x,p]of A)for(const[y,q]of B){if(x+bonus>y)w+=p*q;}return w}
  for (const ap of [0,1,2,3,4]) { const base=ap+1; console.log('AP'+ap,'score+2:',pwinFlat(base,base,2).toFixed(4)); }
  console.log('AP0 attacker (+2 score) vs AP4 defender (underdog):', pwinFlat(1,5,2).toFixed(4));
  "
  ```
  Output:
  ```
  AP0 score+2: 0.7222
  AP1 score+2: 0.6644
  AP2 score+2: 0.6369
  AP3 score+2: 0.6198
  AP4 score+2: 0.6079
  AP0 attacker (+2 score) vs AP4 defender (underdog): 0.0006
  ```
  This holds the card to a 61-72% win rate across every attack-power level instead of 70-86% (today) or 70-84% (the proposal's +1 die) — a consistent "strong edge, not a lock" at every point in the match, and it still does essentially nothing (0.06%) to rescue a 4-level underdog, so it does not become a comeback mechanic either.
- Ties and Decide Dice Roll unaffected: tie-goes-to-defender is still `attackerScore > defenderScore` (no change to that comparison); Decide Dice Roll still sets one rolled die's face (`combat-monster-roll.reducer.ts:83-87`) before the flat bonus is added to the sum, so the two cards still compose exactly as before, just with a smaller War Chief contribution.
- Overcome vs War Chief mutual exclusivity (`combat-player-roll.reducer.ts:33-46` returns before line 48 is reached) is untouched by this change — re-confirmed.

### Finding 3 — Problem 3 (persistent positioning): the proposed Option A, as written, orphans a position entry on one specific loss path, creating a permanent free-income / tile-lock exploit
- Confirmed the core claims: `resource-position.reducer.ts:3`'s "automatically each turn" comment does not match behavior; `player-turn.reducer.ts:24-30` clears `player.positions` and `tile.positionedBy` every turn after collection; `movement.reducer.ts:84-93` already clears a specific army's position on a voluntary move; `combat-player-resolve.reducer.ts:53-61` already clears a *defender's* position when the defender loses. All matches the proposal.
- New finding, not in the proposal: `combat-initiate.reducer.ts:4-20` lets **any unacted army attack an enemy occupying the same tile**, with no requirement that the attacking army have just moved there — it can attack from wherever it already stands, including a tile it is positioned on (contested resource tiles are explicitly allowed by design: `movement.reducer.ts:36-40` only blocks moving onto an *opponent's* base, not a shared resource tile). Walk the sequence:
  1. Player A positions an army on a contested resource tile (persists under the proposed fix).
  2. Player B later moves an army onto that same tile (legal; tile isn't A's base).
  3. On a later turn, A's positioned army has `hasActed` reset to `false` (`player-turn.reducer.ts:60`) and can now initiate combat as the **attacker** against B's army, without ever moving off its position.
  4. If A's attack loses, `combat-player-resolve.reducer.ts`'s "Attacker lost" branch (lines 64-86) respawns A's army at A's base and resets `hasActed`, but — unlike the "defender lost" branch three lines above it (lines 53-61) — it never removes the stale entry from `loser.positions` or `tile.positionedBy`.
  - Today this gap is invisible: `applyAutomaticCollection` wipes **every** entry in `player.positions` at the start of the owner's very next turn regardless of cause, so the stale entry never survives long enough to matter.
  - Under the proposed persistent-positioning fix, nothing clears it anymore. The result: Player A's army physically sits at A's base, but A keeps collecting that resource from the old tile forever (free, permanent income with no army risk there), and — because the cleanup only ever ran on the tile's `positionedBy` array in the same missing branch — **the resource slot on that tile is now permanently unavailable to anyone**, including the tile's rightful occupant B, breaking pillar 3 ("contested islands") worse than the busywork the fix was meant to remove. The same dead branch pattern exists in `combat-monster-resolve.reducer.ts`'s loss path (lines 64-89, no position cleanup either), though that path looks unreachable today since a tile hosting a live monster has no `resources` for a position to exist on in the first place — flagged for the implementer to double-check against current monster/resource tile-type invariants, not confirmed exploitable.
- **Fix folded in**: Option A's implementation must add the same position/`positionedBy` cleanup that already exists in the "defender lost" branch (`combat-player-resolve.reducer.ts:53-61`) to the "Attacker lost" branch (lines 64-86) as well, keyed off `attackingArmyId` instead of `defendingArmyId`. This is a mechanical mirror of existing code, not a new rule — the player-facing rule text in the proposal ("persists until the army moves, attacks and loses, or is defeated") already covers this case; it's a code-completeness gap in Option A's listed line references, not a design gap.
- Bot-impact correction (not a blocker, but the proposal's reasoning needs a fix): `bot-army-actions.reducer.ts:54-65`'s `isAlreadyPositioned` guard will indeed stop adding a priority-9 reposition action once positions persist, as the proposal says. But the bot loop has no "stay put" action — every unacted army that isn't attacking or (now) repositioning still gets a move action queued at priority ≥2 (`bot-army-actions.reducer.ts:67-85`), and since that's the *only* action left for a positioned army once priority 9 is gone, the bot will usually move that army away on its very next turn anyway, which itself clears the position via `movement.reducer.ts`'s existing cleanup. This still fixes the measured stalling bug (bots stop looping forever on one tile), but it means persistent positioning mostly benefits *human* players who choose to leave an army parked; bots will tend to cycle through positions while exploring rather than holding one long-term. Re-measure with the balance simulator as planned — the pacing prediction (median turns toward ~20) should still hold, just not for the originally-stated mechanism.

### Interactions re-checked
- Overcome/War Chief exclusivity, hand limit, fog of war, Firestore write count: re-checked against the proposal's own section and found no additional issue beyond Findings 2 and 3 above.
- `card-acquisition.reducer.ts` reshuffle logic (Finding 1) and `combat-initiate.reducer.ts` attack-eligibility rule (Finding 3) were not cited in the original proposal; both are now load-bearing for the Final spec below.

---

## Final spec
Exact rules for the later stages to build from. All three problems are in scope; Problems 2 and 3 carry amendments from the review above.

### 1. Card deck (Problem 1) — adopt as proposed, unverified change required
- `game-setup.reducer.ts:110-111`: build `initialDeck` from `SPECIAL_CARDS.filter((card) => settings.availableCards.includes(card))` instead of `[...BASE_CARDS.filter(...), ...BASE_CARDS.filter(...)]`.
- Resulting deck size: 19 cards (unfiltered), down from 26. P(Overcome per draw): 1/19 ≈ 5.26%, down from 2/26 ≈ 7.69%.
- No other file changes. No UI change (deck is invisible state). No bot change.

### 2. War Chief (Problem 2) — amended: flat +2 score bonus, not +1 extra die
- `combat-player-roll.reducer.ts` and `combat-monster-roll.reducer.ts`: keep `WAR_CHIEF_BONUS_POWER` as a named constant, but change its meaning and value: `WAR_CHIEF_BONUS_POWER = 2`, applied as a flat addition to the attacker's **dice-sum total**, not to the dice-count passed into `rollDice()`.
  - `combat-player-roll.reducer.ts:60,63`: roll `attacker.attackPower + 1` dice unconditionally (drop `+ attackerBonusPower` from the `rollDice()` call); compute `attackerScore = combatState.attackerRolls.reduce((a,b)=>a+b,0) + (useWarChief-applied ? WAR_CHIEF_BONUS_POWER : 0)`.
  - `combat-monster-roll.reducer.ts:83,91`: same change — roll `attacker.attackPower + 1` dice, add `WAR_CHIEF_BONUS_POWER` to `attackerScore` only when War Chief was applied. Apply the bonus **after** Decide Dice Roll's die-face override (line 86) so the two cards still compose independently.
  - Resulting win rate on an even fight: 61-72% across attack-power 0-4 (today: 70-86% at +1 die as originally proposed; 86-97% today's live +2 die). Underdog rescue stays negligible (0.06% for a 4-level-behind attacker, vs 86-97% chance for the player who is already 4 levels ahead regardless of the card).
  - Log line and card description (`card-data.ts:52`, `SPECIAL_CARD_DESCRIPTIONS.War Chief`) change to: "Gain +2 to your combat score for your next battle." (not "+2 attack power" — that phrase is reserved for the permanent attack-power upgrade stat and must not be reused for this one-shot card bonus, to avoid confusing the two systems in the tooltip).
- Ties, Overcome exclusivity, and the flat 5 VP combat reward are unchanged — no further rebalancing needed per the review's math.
- Bots: no change. Bots never set `useWarChief: true` (`bot-army-actions.reducer.ts:108-113`), confirmed unchanged by this fix; still a known, separately-tracked bot gap.

### 3. Persistent positioning (Problem 3) — amended: Option A plus a required cleanup fix
- `player-turn.reducer.ts`'s `applyAutomaticCollection` (lines 7-33): stop clearing `player.positions` and `tile.positionedBy` after collecting. Collection runs every turn for every entry already in `player.positions`, same as today, just without the final clear (drop lines 24-30; keep the collection loop and log).
- `movement.reducer.ts:84-93`: unchanged — already clears the moving army's position and the tile's matching `positionedBy` entry on any voluntary move (plain move or Teleport).
- `combat-player-resolve.reducer.ts:53-61` ("defender lost" branch): unchanged — already clears the losing defender's position.
- **New, required**: `combat-player-resolve.reducer.ts`'s "Attacker lost" branch (lines 64-86) must gain the same cleanup, mirrored against `attackingArmyId`/`attackerId` instead of `defendingArmyId`/`defenderId`:
  ```ts
  const positionIndex = loser.positions.findIndex((p) => p.armyId === loserArmy.id);
  if (positionIndex > -1) {
    const removedPosition = loser.positions.splice(positionIndex, 1)[0];
    const oldTile = map[loserArmy.position... /* position before respawn */];
    if (oldTile?.positionedBy) {
      oldTile.positionedBy = oldTile.positionedBy.filter(
        (p) => !(p.playerId === loserId && p.resource === removedPosition.resource),
      );
    }
  }
  ```
  placed before `loserArmy.position` is overwritten with the base tile's coordinates (same ordering constraint as the existing defender-lost branch, which captures `oldPos` before moving the army).
- Before shipping, confirm whether `combat-monster-resolve.reducer.ts`'s loss branch (lines 64-89) can ever fire for a positioned army (i.e., whether a live monster and an active resource position can ever coexist on the same tile under current tile-type rules). If confirmed reachable, add the identical cleanup there; if confirmed unreachable, no change needed but leave a one-line comment recording why.
- Tooltip/rule text: "A positioned army keeps collecting its resource every turn until it moves, attacks and loses, or is defeated." (the "attacks and loses" clause is required precisely because of Finding 3 above — a positioned army that wins a fight from its tile keeps its position, matching existing behavior with no code change needed for the win case).
- Bots: no code change required. `bot-army-actions.reducer.ts:54-65`'s `isAlreadyPositioned` guard becomes live once positions persist, stopping the priority-9 reposition action; the bot's existing move-priority logic (lines 67-85) then takes over for that army on its next unacted turn, as it does for any other army, which fixes the measured stalling. Re-run `scripts/balance-simulator` (bot-vs-bot, fog on) after this ships to confirm the median match length moves toward the ~20-turn pillar target.

### Testing requirements (for tester stage)
- `combat-player-roll.reducer.test.ts`, `combat-monster-roll.reducer.test.ts`: update expected dice-pool size (no bonus dice at all now) and add an assertion that the final score includes the flat `+2` only when War Chief was used.
- `combat-player-resolve.reducer.test.ts` (or equivalent): new case — attacker loses while positioned on the tile they attacked from; assert `loser.positions` and the tile's `positionedBy` no longer contain that army afterward.
- `resource-position.reducer.test.ts` / `player-turn.reducer.test.ts`: new case — a position survives two consecutive `handleEndTurn` collections without re-clicking Position, and is only removed by a move, a combat loss, or death.
- `card-data.ts` / deck-build test: assert `initialDeck` length is 19 (filtered) and contains exactly the `SPECIAL_CARDS` weighting, not doubled `BASE_CARDS`.

### Docs
- `docs/README.md` §5-6 needs updates for: deck source (SPECIAL_CARDS, 19 cards), War Chief's new effect text (+2 score, not +1 die, not "+2 attack power"), and positioning's persistence rule (§6.4/6.10 TutorialBeacon copy per the constraint in skill `game-design`).

### Backlog (unchanged from the proposal, not actioned this review)
- Revisit Option B of Problem 1 (demote Overcome/Teleport to a rarer tier) only after this spec ships and the simulator shows whether 1/19 is still too common for a guaranteed win.
- Bots never use War Chief/Overcome/Decide Dice Roll (`bot-army-actions.reducer.ts:108-113`) — tracked, out of scope here, same as the proposal flagged.
