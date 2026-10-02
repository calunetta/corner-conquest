# Game design: Bot-vs-bot balance simulator (metrics and report spec)

## Proposal (game-designer-a)

This task changes no rule. The design work is deciding **what the simulator measures, how the numbers are derived and how a designer acts on them**. A throwaway probe (scratchpad only, no project file written) ran the real `takeBotTurn` through jest with Firestore mocked, so the problems below are measured, not guessed.

### Problem or opportunity

Fun lens served: **mastery** (for us as designers: tune from data) and indirectly **tension and pacing** (pillar 2: about 20 turns).

Today every balance claim is intuition. The probe shows that intuition is far off, and that a naive "win rate + match length" report would be misread:

| Evidence | Source |
|---|---|
| Bot-only matches rarely finish in a reasonable time. 100 matches per config, safety cap 100 rounds: fog on finished 45 / 48 / 52 % (2 / 3 / 4 bots), average 73–75 rounds when they finish; fog off finished 2 / 4 / 10 %. Pillar target is about 20. | probe, table below |
| **Base-camping.** A bot's army on its Base scores "position on resource" at priority 9, which beats "move to unexplored tile" at 6. Positions are cleared after each collection (`src/lib/actions/player.ts:155-162`), so the army re-positions on its Base every turn. Seat 0 in 2-bot fog-on matches (N=200): its first army leaves the Base at median round 42 (p10 12, p90 82); 69/200 (34.5 %) never leave by round 100. | `src/lib/bot-logic.ts:159-169`, `:176-177` |
| **Productive trap.** If a player holds Productive and has positions, `handleEndTurn` opens `productiveDialogState` instead of collecting (`player.ts:242-247`). Bots never dispatch `UseProductiveCard`, so a bot holding Productive never collects again. In the probe, bots holding Productive at match end ≈ Productive cards bought (e.g. 4 bots fog on: 187 held, 187 bought). Ironically 97 of the 131 "left base" events above happened only because Productive froze the positions. | `player.ts:243-244`, `bot-logic.ts` (no `UseProductiveCard`) |
| **Dead cards.** In a bot-only match bots can only consume Reinforce, Efficient, Master Builder and Wealthy: 4 of 13 kinds (30.8 %). Sabotage targets only humans (`bot-logic.ts:71`). Overcome, War Chief, Decide Dice Roll, Extra Move, Steal, Scout, Teleport are never used (combat is rolled with all card flags false, `bot-logic.ts:209`, `:219`). | `bot-logic.ts:36-76`, `:206-224` |
| **Activation is not use.** Bots re-activate Reinforce / Efficient / Master Builder every turn; each activation logs "activated 'X'" (`card.ts:61`) without consuming the card. Probe: 3 770 Master Builder "activations" vs 90 bought. A card-usage metric that counts activations is wrong by ~40×. | `card.ts:56-61`, `bot-logic.ts:37-48` |
| **Seat asymmetry.** The map is 5 × 6 and the centre is (2, 3) (`game-initializer.ts:216`). Manhattan distance to centre: seat 0 (0,0) = 5, seat 1 (4,5) = 4, seat 2 (0,5) = 4, seat 3 (4,0) = 5. Probe wins (finished matches only): 3 bots 8 / 25 / 15, 4 bots 7 / 19 / 15 / 11. Chi-square for the 4-bot split = 6.15 (df 3, 5 % critical 7.81): suggestive, not yet significant at n=52. The simulator needs enough games to settle it. | `game-initializer.ts:161-166`, `:216` |
| **Deck drift.** The skill table says "weighted deck". The live deck is `BASE_CARDS` × 2 = 26 cards, 2 of each kind (`game-initializer.ts:277-278`); the weighted `SPECIAL_CARDS` list (`card-data.ts:12-26`) is not referenced anywhere in `src`. | grep `SPECIAL_CARDS` |

Consequence for this task: **the first reports will mostly measure bot weaknesses, not rule balance.** The report must therefore show bot-health metrics next to the balance metrics, or designers will "fix" rules to compensate for bot bugs.

Probe results (100 matches per config, cap 100 rounds; VP totals summed over all matches and players):

| Bots | Fog | Finished | Avg rounds (finished) | Seat wins | VP from discovery / monsters / PvP / Explorer |
|---|---|---|---|---|---|
| 2 | on | 45 | 75.4 | 20, 25 | 1575 / 927 / 95 / 180 |
| 2 | off | 2 | 87.5 | 1, 1 | 574 / 29 / 5 / 114 |
| 3 | on | 48 | 75.4 | 8, 25, 15 | 1834 / 1047 / 365 / 152 |
| 3 | off | 4 | 92.8 | 2, 0, 2 | 707 / 43 / 15 / 188 |
| 4 | on | 52 | 73.5 | 7, 19, 15, 11 | 2025 / 1353 / 555 / 176 |
| 4 | off | 10 | 90.8 | 4, 4, 1, 1 | 801 / 65 / 15 / 392 |

Fog off nearly removes monster VP: without the fog tier, a move onto a monster tile scores the default priority 2 (`bot-logic.ts:175-182`), so bots rarely reach monsters.

### Options considered

| Option | Designer-facing summary | Fun lens | Complexity cost |
|---|---|---|---|
| A (minimal) | Exactly the triage list: win rate per seat, average rounds, average final VP, resources mined, card usage; plus a count of capped matches. | mastery | Lowest. Misleading on today's bots: no VP breakdown, card usage ambiguous, no stall diagnosis. |
| B (recommended) | A, plus: seeded and reproducible runs, win rate with 95 % confidence interval against the fair share, round distribution (p10 / median / p90, % finished by round 20 / 40), VP by source, card acquired / consumed / held at end, monster fights by level with observed vs expected win rate, PvP fights, and a "bot health" block (capped %, first round the seat leaves its Base, Productive-trapped share). Each metric has an action threshold. | mastery | Medium. Everything comes from the existing state and log; no game code changes. |
| C | B, plus per-round VP curves per seat, lead changes and comeback rate (pillar 4), and `--set key=value` overrides of any `GameSettings` field for what-if runs. | mastery, tension and pacing | Highest. Comeback metrics stay mostly noise until bots finish matches in a sane length; overrides invite tuning rules against buggy bots. |

### Recommended rule spec

Recommendation: **Option B.** Option A would print "matches last 75 rounds, seat 0 wins least" without saying why. B adds exactly the metrics that tell a bot bug from a rule problem (VP sources, consumed-vs-held cards, Base-camping, stalls), and they are all cheap to derive. C's comeback analysis is worth a follow-up once bots play sane matches.

No game rule changes. Simulator behaviour spec:

**Run matrix and CLI (names are a proposal; architects own the final interface)**
- Configs: bots ∈ {2, 3, 4} × fog ∈ {on, off} = 6 configs. Flags `--players 2,3,4`, `--fog on,off` narrow the matrix.
- `--games N` per config, default **200**. `--seed S`, default **1**. `--max-rounds R`, default **150**. `--out <dir>`.
- All other settings = `defaultGameSettings` (`game-initializer.ts:8-21`): VP goal 30, deploy 6 (+2), upgrade 6, ability 15, density 0.6. `debugMode` false (in debug mode bots still get no cards, `game-initializer.ts:101`, but keep it off).
- Same `--seed` → identical report. Match *i* of a config uses seed `hash(S, players, fog, i)`, so two runs with the same seed see the same maps and dice. That is what makes before/after comparisons of a rule change meaningful.

**Faithfulness requirements (each found in the code; the simulator is wrong if it skips one)**
1. All-bot seating: `initializeGame` always seats a human in seat 0 and adds bots only when `maxPlayers === 1` (`game-initializer.ts:171`, `:189`). Create with `maxPlayers = 1, numBots = players − 1`, then set `players[0].isBot = true` before `startGame`.
2. `takeBotTurn` returns `void` and writes the end state with `setDoc` (`bot-logic.ts:241`); `src/lib/firebase.ts:30-31` initialises Firebase at import. The simulator needs the post-turn state without Firestore: either the module mock that `src/lib/__tests__/bot-logic.test.ts:5-10` already uses, or a behaviour-preserving extraction of a pure "compute bot turn" function. **Architect decision**; the triage's "unchanged" wording favours the mock.
3. Randomness: `Math.random` drives the map, monsters, deck shuffle, card draws and dice (`game-initializer.ts`, `attack.ts:92`, `:251`, `card.ts:37`). Seed it with a PRNG for the whole run. `Date.now` only feeds death-animation ids and timestamps; it doesn't affect outcomes.
4. Loop: call `takeBotTurn` while `status === 'playing'` and `turn ≤ max-rounds`. A match can end in the middle of a bot turn (discovery, combat), and the bot keeps acting on the finished state before `EndTurn` (no status checks in the handlers). Read `state.winner.id` and `state.turn`; never infer the winner from the highest VP.
5. "Match length" = `state.turn` at the end (rounds; it increments when play wraps to seat 0, `player.ts:198-199`). Also report total bot turns.
6. Cost control: after each turn, parse the new log lines, then reset `state.log = []`. Nothing in `src/lib` reads `log`; it only grows, and `handleGameAction` deep-clones the whole state on every action (`actions/index.ts:22`). Silence `console.log` during the run (`bot-logic.ts` logs every action).

**Metrics (per config, then a summary across configs)**

| # | Metric | Derivation | Action threshold (what a designer does) |
|---|---|---|---|
| M1 | Finished %, capped % | `status === 'finished'` vs cap reached | Capped > 5 %: stalling. Check M10 bot health before touching rules. |
| M2 | Rounds: mean, p10, median, p90; % finished by round 20 and by round 40 | `state.turn` of finished matches | Median > 30 (1.5 × pillar target): pacing problem. |
| M3 | Win rate per seat with 95 % Wilson CI, next to the fair share 1/players | winners of finished matches | Fair share outside the CI: seat imbalance. Name the seat's distance to centre (5, 4, 4, 5) in the report. |
| M4 | Average final VP per seat; average winner margin (winner VP − runner-up VP) | final `victoryPoints` | Margin > 15 at goal 30: runaway leader. |
| M5 | VP by source per seat: discovery, monster (by level), PvP win, Explorer | log lines: `movement.ts:55`, `attack.ts:307`, `attack.ts:129` / `:160`, `player.ts:213` | One source > 50 % of all VP: dominant path. Integrity check: sources sum to final VP for every player; print the mismatch count (must be 0). |
| M6 | Resources mined per seat by type: positioned collection, Collector, Productive; Wealthy and Steal listed separately as "granted" | `player.ts:153`, `player.ts:236`, `card.ts:107`, `card.ts:148`, `card.ts:174` | One resource type < 20 % of mined: its sink (deploy / upgrade / cards) is starved. |
| M7 | Purchases: armies deployed, upgrades, abilities bought (which), cards bought; final armies and attack power | `player.ts:99`, `:134`, `card.ts:204`, `card.ts:41` | Ability bought by > 80 % of seats while the other < 20 %: ability imbalance. |
| M8 | Cards per kind: acquired (bought + Special island), **consumed**, held at match end. Consumption is counted only from consume logs (`player.ts:73`, `:84`, `:123`, `card.ts:67`, `:128`, `:148`, `:174`, `attack.ts:71`, `:86`, `:217`, `:232`, `:242`, `movement.ts:109`), **never** from "activated" (`card.ts:61`). | log + final hands | consumed / acquired < 10 %: dead card for bots (bot gap, not a rule problem). Hands at the 7-card limit (`types/actions.ts:3`) in > 25 % of seats: hand clog. |
| M9 | Monster fights by level: attempts, observed win %, **expected** win % for the attacker's dice; PvP fights: attempts, attacker win % | `monsterCombatState` before/after; log `attack.ts:307`, `:337`, `:187` | Observed outside the expected value's 95 % CI: rules bug. Many attempts at < 10 % expected win: the bot fights suicidally (bot gap). |
| M10 | Bot health: round in which each seat first has an army off its Base (median, % never); % of seats holding Productive while having positions (trapped); % of seats ending with ≥ 1 never-usable card | army positions vs `baseTiles`, final hands | Never-leaves > 10 % or trapped > 10 %: fix the bot before reading M3–M7 as balance data. |

**Report output**
- A Markdown file plus a JSON file with the same numbers, both in `--out`, and the Markdown tables printed to stdout. Header: seed, games per config, max rounds, git commit, settings snapshot.
- The Markdown opens with a **"Read this first"** block listing every threshold breached in M1, M10 and M8. Balance tables follow.
- A short guide (`docs/` location chosen by the architects) explains each metric, its threshold, and the rule: *fix bot health before changing rules; compare runs only with the same seed and games count.*

### Balance math

Expected monster and PvP odds (used by M9; ties go to the monster or the defender, `attack.ts:100`, `:263`):

```
node -e "function dist(n){let d=new Map([[0,1]]);for(let i=0;i<n;i++){const e=new Map();for(const[s,p]of d)for(let f=1;f<=6;f++)e.set(s+f,(e.get(s+f)||0)+p/6);d=e}return d}
function pw(a,b){const A=dist(a),B=dist(b);let w=0;for(const[x,p]of A)for(const[y,q]of B)if(x>y)w+=p*q;return w}
for(let ap=0;ap<=4;ap++)console.log('AP'+ap,[1,2,3,4].map(l=>pw(ap+1,l).toFixed(3)).join(' '));"
```

P(win) vs monster, attacker dice = AP + 1, no cards:

| AP | Lancer L1 | Bear L2 | Ogre L3 | Minotaur L4 |
|---|---|---|---|---|
| 0 | 0.417 | 0.093 | 0.012 | 0.001 |
| 1 | 0.838 | 0.444 | 0.152 | 0.036 |
| 2 | 0.973 | 0.779 | 0.454 | 0.192 |
| 3 | 0.997 | 0.939 | 0.743 | 0.460 |
| 4 | 1.000 | 0.988 | 0.909 | 0.718 |

Expected VP per monster attack (reward × P(win)): AP 0 → 0.83 / 0.46 / 0.08 / 0.01; AP 2 → 1.95 / 3.89 / 3.18 / 1.92; AP 4 → 2.00 / 4.94 / 6.37 / 7.18. PvP attacker P(win) is the same table shifted (defender dice = defender AP + 1): equal AP gives the attacker 0.417 / 0.444 / 0.454 / 0.460 / 0.464 for AP 0–4, so the defender is favoured at every level. Bots still attack at priority 8 + (AP difference) (`bot-logic.ts:130`), and either combat result pays the winner 5 VP.

Sample size for M3 (95 % half-width = 1.96·√(p(1−p)/n)):

```
node -e "for (const n of [100,200,300,500]) for (const p of [0.5,0.333,0.25]) console.log(n,p,(100*1.96*Math.sqrt(p*(1-p)/n)).toFixed(1))"
```

n = 200 finished → ±6.9 / ±6.5 / ±6.0 pp for 2 / 3 / 4 players; n = 300 → ±5.7 / ±5.3 / ±4.9; n = 500 → ±4.4 / ±4.1 / ±3.8. Today about half the fog-on matches and under 10 % of fog-off matches finish, so 200 games yields about 100 decided fog-on matches (±8.5–9.8 pp) and only a handful fog off. The report must print the number of **decided** matches next to every win rate.

Runtime: the probe ran 600 matches (cap 100, mostly long or capped, log cleared each turn) in 309.8 s ≈ 0.52 s per match. Defaults (6 × 200 = 1 200 matches, cap 150) ≈ 10–16 min. Acceptable for an occasional offline tool; the `--players` / `--fog` filters keep focused runs short.

Productive-trap exposure: P(at least one Productive in the first k draws of the 26-card deck) = 1 − (26−k)(25−k)/650 → k = 1: 7.7 %, 3: 22.2 %, 5: 35.4 %, 8: 52.9 %.

### Interactions and exploits checked
- **Cards:** only consumption counts as use (Reinforce / Efficient / Master Builder are re-activated every turn). The Overcome, War Chief and Decide Dice Roll combos never occur with today's bots (all combat flags false, `bot-logic.ts:209`, `:219`), so M9 measures pure dice and must not be read as card balance.
- **Hand limit:** bots only consume 4 of 13 kinds, so dead cards pile up. M8 reports how many hands sit at 7. At 7, BuyCard silently does nothing (`card.ts:11-14`), yet the bot's own check (`bot-logic.ts:103`) already skips the purchase. No gem-loss path.
- **Sabotage:** dead in bot-only matches (`bot-logic.ts:71`), so turn skipping never happens and the `turn` increment inside the skip loop (`player.ts:186-188`) is never exercised by the simulator. Note it in the guide.
- **Fog of war:** the fog-off runs measure a different bot (no exploration tier). Report the two settings separately; never pool them.
- **Turn order:** seat 0 moves first in every round, and seats 0 and 3 are one step further from the centre. M3 cannot separate the two effects; a C-style follow-up could rotate seats over a fixed map.
- **Runaway leader / snowball:** M4 margin plus M5 PvP share. Early-combat snowballing is rare because bots only fight on a shared tile.
- **Stalling:** a capped match counts as no winner; it is excluded from M3 and reported in M1.
- **Exploits of the tool itself:** comparing runs with different seeds or games counts produces false signals. The header prints both, and the guide forbids comparing across them.

### Bot impact
- None. `src/lib/bot-logic.ts` is not changed (out of scope per triage). The simulator only reads it.
- Follow-ups the data already justifies (separate tasks, for the user to pick): (1) exclude Base tiles from the bot's priority-9 positioning, or rank exploration above it until the bot has 2 or more armies; (2) bots resolve `productiveDialogState` (dispatch `UseProductiveCard` with the most-positioned resource); (3) Sabotage targets the VP leader, not only humans; (4) bots use Overcome, War Chief and Decide Dice Roll in combat when expected win < 50 %. Re-run the simulator after each one with the same seed.

### UI needs
- None. CLI and files only. No `TutorialBeacon` change, no Firestore writes (zero cost, `docs/README.md` §6.9).
- Docs: the "how to read the report" guide. `docs/README.md` §6.8 could link to it. §5–6 rules don't change.
- Drift to fix in docs, not code: the skill table's "13 kinds in a weighted deck" is really 2 copies of each of 13 kinds (`game-initializer.ts:277-278`). Unverified: README §6.7 says fog-off visibility is shared; game logic keeps a per-player `revealedTiles` and awards discovery VP the same way in both modes (`movement.ts:52-53`). Only the UI layer (`globallyRevealedTiles` in `src/hooks/use-game-engine.ts`) may share it. I did not trace it.

### How we will know it works
- **Determinism:** two runs with the same seed and flags produce byte-identical JSON (apart from timestamp and commit fields).
- **Integrity:** for every player in every match, M5 sources sum to the final `victoryPoints` (mismatch count 0); M8 acquired = consumed + held for every card kind (no starting cards with `debugMode` off, `game-initializer.ts:101`).
- **Faithfulness:** M9 observed monster win % at each (AP, level) falls within the 95 % CI of the expected table above; a mismatch means the simulator or the dice code is wrong.
- **Reproduces the probe** at seed-independent tolerance: fog-on capped % in the 40–60 % band at cap 100; Productive held at the end ≈ Productive acquired. If a future bot fix moves these, the report should show it.
- **Unit tests:** the log parsers against the exact strings in the cited lines (so wording changes break a test, not the data silently); a tiny run (2 bots, 3 games, fixed seed) completes and writes both files.
- **Designer signal:** the first report's "Read this first" block flags Base-camping and the Productive trap. That's the expected verdict on today's bots.

## Review (game-designer-b)
VERDICT: APPROVED

Option B is the right scope: it changes no rule, writes nothing to Firestore, needs no tutorial or bot change, and it measures bot health next to balance. I re-checked the code it cites and ran my own probe. Every finding below is a fix to the measurement spec, not to the design, so I folded them into the Final spec myself.

**Independent probe.** Scratchpad only, no project file. esbuild bundled `src/lib/bot-logic.ts` with `firebase` aliased to a stub whose `setDoc` captures the state. `Math.random` was replaced by mulberry32 seeded `1000·players + 500·fog + i`, seat 0 was named "Bot 0" with `isBot = true`, and the cap was 100 rounds:

| Config | Finished | Median rounds (finished) | Seat wins | Seats never off Base by match end | Median first round off Base | Mined gems / iron / wheat |
|---|---|---|---|---|---|---|
| 2 bots, fog on, n=100 | 31 | 77 | 11, 20 | 70/200 | 43 | 13 398 / 4 457 / 1 267 |
| 3 bots, fog on, n=100 | 49 | 79 | 15, 18, 16 | 124/300 | 43 | 20 293 / 5 902 / 1 915 |
| 4 bots, fog on, n=100 | 53 | 70 | 14, 16, 14, 9 | 162/400 | 43 | 25 783 / 7 908 / 2 603 |
| 2 bots, fog off, n=50 | 0 | n/a | 0, 0 | 36/100 | 51 | 7 180 / 2 447 / 753 |

Runtime was 21.9 s for 100 two-bot matches (0.22 s per match bundled; designer-a measured 0.52 s under jest). The defaults stay affordable either way. The combat table matches mine to three decimals, and so do the equal-AP PvP values 0.417 / 0.444 / 0.454 / 0.460 / 0.464 (same `dist`/`pw` command). The Productive exposure formula C(24,k)/C(26,k) is also correct.

### Findings

1. **M6 and M7 thresholds fire on bot artifacts in every run (major, folded in).**
   - Base resources are listed Gems, Iron, Wheat (`game-initializer.ts:180-182`). The bot positions on the first free one (`bot-logic.ts:161`), and positioning sets `hasActed = true` (`resource.ts:36`). So a lone army on its Base mines only gems; the 2nd army takes iron, the 3rd wheat.
   - My probe: wheat is 6.6–7.2 % of positioned collection in every config. The M6 "< 20 % → sink starved" threshold would blame the wheat economy for a bot ordering quirk.
   - M7: the bot always buys `unownedAbilities[0]`, and `availableAbilities` is `[Explorer, Collector]` (`bot-logic.ts:82-84`, `game-initializer.ts:18`). Explorer will always be > 80 % and Collector < 20 %, so the "ability imbalance" flag is guaranteed.
   - Fix: when any M10 threshold is breached, M5–M7 thresholds print as "suppressed (bot health)" and are not listed as balance breaches. Add M10 "share of positions on own Base". Add the bot's fixed ability order to the guide.
2. **M3 per-seat CIs produce false seat-imbalance flags (major, folded in).**
   - Six configs give 2+3+4 seats × 2 fog settings = 18 per-seat 95 % tests. If seats are fair, P(at least one flag) ≈ 1 − 0.95¹⁸ = 0.60 (independence approximation).
   - Designer-a's seat evidence doesn't reproduce. Their 3-bot split 8/25/15 gives χ² = 9.13 (df 2, p ≈ 0.01). Mine, 15/18/16, gives χ² = 0.29. Their 4-bot split gives 6.15; mine (14/16/14/9) gives 2.02.
   - Fix: flag one χ² goodness-of-fit test per config (critical 3.84 / 5.99 / 7.81 for df 1 / 2 / 3) and only when decided matches ≥ 5 × players. Wilson CIs stay as display. Distance to centre stays as context, not as a conclusion.
   - Command: `node -e "const chi=o=>{const n=o.reduce((a,b)=>a+b),e=n/o.length;return o.reduce((s,x)=>s+(x-e)**2/e,0)};console.log(chi([8,25,15]),chi([15,18,16]),chi([7,19,15,11]),chi([14,16,14,9]),1-0.95**18)"` → `9.125 0.286 6.15 2.02 0.603`.
3. **M9 relies on state the simulator never sees (major, folded in).**
   - `takeBotTurn` initiates, rolls and closes combat internally (`bot-logic.ts:199-224`). It hands out only the final post-EndTurn state (`:241`), so "`monsterCombatState` before/after" is unobservable.
   - The attacker's AP can't change during the army loop: Upgrade happens only in the purchase phase (`bot-logic.ts:90`), before the loop at `:113`. So the post-turn `attackPower` is the combat AP.
   - Fix: derive monster fights from the log (`attack.ts:307` win, `:337` loss; monster name → level) and PvP fights from `attack.ts:187`. The attacker is the seat whose turn it was.
   - With about 20 (AP, level) cells, per-cell CI tests repeat the multiple-comparison problem. Use one aggregate test: z = (O − Σp)/√Σp(1−p) over all fights, flag |z| > 3. Show cells with ≥ 30 attempts; 97 attempts are needed for ±10 pp at p = 0.5.
4. **"Same seed → same maps" doesn't hold after a bot or rule change (medium, folded in).**
   - One `Math.random` stream feeds the map, the deck and then the play. Any change in a decision shifts every later draw. A change in `initializeGame` (density, deck) also shifts the map.
   - Fix: two streams per match. `mapSeed` is installed before `initializeGame`; `playSeed` is installed after `startGame`. A bot change then keeps maps and decks identical.
   - The guide must say the runs are still not paired. Judge differences with a two-proportion z-test or by non-overlapping CIs.
5. **The "reproduces the probe" acceptance band is not reproducible (medium, folded in).**
   - At cap 100, my 2-bot fog-on run finished 31/100 (69 % capped) against designer-a's 45/100 (z = 2.04). That falls outside their 40–60 % capped band.
   - Fix: replace the band with deterministic faithfulness checks. The consume count is 0 for every card kind today's bots can't use (Productive, Sabotage, Overcome, War Chief, Decide Dice Roll, Extra Move, Steal Resource, Scout, Teleport). Sabotage skip logs (`player.ts:181`) are 0.
6. **VP keeps changing after the win (minor, folded in).**
   - The bot keeps acting after the winning action. EndTurn then still adds Explorer VP to the next seat (`player.ts:202-214`); the win guard is `!state.winner`.
   - My probe: winner final VP = goal + 1.2 (2 bots) to 1.9 (4 bots) on average.
   - Fix: M4 uses final VP (it matches the M5 integrity sum) and also prints "winner overshoot". The winner always comes from `state.winner.id`.
7. **Hand-limit losses aren't counted (minor, folded in).** A Special-island discovery with 7 cards loses the draw and logs it (`movement.ts:65-66`). M8 adds "draws lost to a full hand" per seat. That is the real hand-clog cost; the 7-card count alone doesn't show it.
8. **Seat identity and log parsing (minor, folded in).**
   - Bots are named `Bot ${i+1}` (`game-initializer.ts:197`), and colours are the first unused in `PLAYER_COLORS` = Blue, Red, Purple, Yellow (`player-data.ts:4`).
   - Fix: create seat 0 as name "Bot 0" with colour Blue, so seat i ↔ "Bot i" ↔ colours Blue/Red/Purple/Yellow. Parsers anchor on `^<name>( |'s )`.
9. **`deathAnimations` depend on wall-clock time (minor, folded in).** `handleEndTurn` filters them by `Date.now()` (`player.ts:260-263`). They don't affect outcomes, but a fast loop accumulates them and they are deep-cloned on every action. Fix: reset `deathAnimations = []` alongside `log = []` after each turn, and keep them out of the JSON.

Checked with no issue found:
- Faithfulness of the trigger: the host calls `takeBotTurn` whenever the current seat is a bot and the status is `playing` (`use-game-engine.ts:140-148`). The live game also never resolves `productiveDialogState` for bots, so the simulator measures what players see.
- No other VP sources exist beyond the four in M5 (grep `victoryPoints +=` in `src/lib`: `attack.ts:128,159,295`, `player.ts:212`, `movement.ts:54`).
- Nothing in `src/lib` reads `state.log` (grep).
- Pillars: none is affected (tooling only). Complexity budget: 0 rules. Firestore: 0 writes. Tutorial: none. Bots: unchanged.

Input for the follow-up bot task (not this one): the Base has 3 resource slots, and positioning consumes the army's action. So without Productive, an army only leaves the Base once the bot owns a 4th army. A "position on Base only until 2 armies" fix still camps 2 armies. Rank exploration above Base positioning outright, and fix the Gems-first slot order.

## Final spec

Tooling only. No game rule, bot heuristic, UI, tutorial or Firestore write changes. Fun lens: mastery (designers tune from data).

### Run matrix and CLI (names may be adjusted by the architects; semantics may not)
- Configs: players ∈ {2, 3, 4} × fog ∈ {on, off}. Flags `--players 2,3,4` and `--fog on,off` narrow the matrix.
- `--games N` per config (default 200), `--seed S` (default 1), `--max-rounds R` (default 150), `--out <dir>`.
- Settings: `defaultGameSettings` (`src/lib/game-initializer.ts:8-21`) with only `fogOfWar` varied. `debugMode = false`.

### Match setup
1. Seeds per match i of a config: `mapSeed = hash(S, players, fog, i, "map")` and `playSeed = hash(S, players, fog, i, "play")`. The simulator replaces `Math.random` with a seeded PRNG.
   - Install the `mapSeed` stream, then call `initializeGame(id, name, 1, { playerId: "bot_0", name: "Bot 0", color: Blue }, players − 1, false, settings)`.
   - Set `players[0].isBot = true`, call `startGame`, then install the `playSeed` stream.
2. Seat i is "Bot i", with colours Blue, Red, Purple, Yellow for seats 0–3. Base corners are seat 0 (0,0), 1 (4,5), 2 (0,5), 3 (4,0); distance to centre (2,3) is 5 / 4 / 4 / 5.
3. Firestore is replaced by a stub (jest-style module mock or a bundler alias; architect decision) whose `setDoc` captures the state. Whatever stub is used must cover every specifier that resolves to `src/lib/firebase.ts`, including `./firebase` and `@/lib/firebase`. No network access and no production module edits.

### Loop
- While `status === 'playing'` and `turn ≤ R`: `await takeBotTurn(state)` and take the captured state. Parse its new `log` lines and record the post-turn observations below. Then set `log = []` and `deathAnimations = []`. Silence `console.*` during the run.
- Finished: `status === 'finished'`; the winner is `state.winner.id` (never the highest VP). Capped: the loop ended with `status === 'playing'`.
- Match length is the final `state.turn` (rounds). Also count total bot turns.

### Observations per turn
- Post-turn state of the seat that just played:
  - Its armies' positions (off-Base check).
  - Its `positions` (on own Base or not). These are exactly what it collects at its next turn start.
  - Its `attackPower`, which is the AP used in every combat of that turn.
- Log lines, each matched with an anchored pattern and a unit test against the exact source string:
  - Discovery VP: `movement.ts:55`.
  - Monster win: `attack.ts:307`. Monster loss: `:337`. Monster name maps to level: Lancer 1, Bear 2, Ogre 3, Minotaur 4.
  - PvP VP: `attack.ts:129` and `:160`. PvP result: `:187`; the attacker is the acting seat.
  - Explorer VP: `player.ts:213`.
  - Collection: `player.ts:153`. Collector: `:236`. Productive: `card.ts:107`.
  - Granted resources: Wealthy `card.ts:148`, Steal `:174`.
  - Purchases: deploy `player.ts:99`, upgrade `:134`, ability `card.ts:204`, card bought `:41`.
  - Card from a Special island: `movement.ts:82`. Draw lost to a full hand: `movement.ts:66`.
  - Card consumed: `player.ts:73`, `:84`, `:123`; `card.ts:67`, `:70`, `:128`, `:148`, `:174`; `attack.ts:71`, `:86`, `:217`, `:232`, `:242`; `movement.ts:109`.
  - Sabotage skip: `player.ts:181`.
  - Never count "activated" (`card.ts:61`) as use.

### Metrics (per config; fog on and fog off are never pooled)
| # | Metric | Flag |
|---|---|---|
| M1 | Finished %, capped %, decided matches | Capped > 5 %: stalling |
| M2 | Rounds of finished matches: mean, p10, median, p90; % finished by round 20 and by round 40; total bot turns | Median > 30 |
| M3 | Wins per seat with 95 % Wilson CI next to the fair share 1/players, plus the decided-match count; one χ² goodness-of-fit per config | χ² above 3.84 / 5.99 / 7.81 (df 1/2/3), only when decided ≥ 5 × players |
| M4 | Mean final VP per seat; mean winner margin (winner − runner-up, final values); mean winner overshoot (winner VP − goal) | Margin > 15 |
| M5 | VP by source per seat: discovery, monster by level, PvP, Explorer. Integrity: sources sum to final VP for every player in every match; print the mismatch count | One source > 50 % of all VP |
| M6 | Resources per seat by type: positioned collection, Collector, Productive; Wealthy and Steal separately as "granted" | One type < 20 % of mined |
| M7 | Armies deployed, upgrades, abilities bought (by name), cards bought; final armies and AP | Ability bought by > 80 % of seats while the other < 20 % |
| M8 | Per card kind: acquired (bought + Special island), consumed, held at the end. Draws lost to a full hand per seat; % of seats ending at 7 cards. Integrity: acquired = consumed + held | consumed / acquired < 10 %: dead for bots. Seats at 7 > 25 %: hand clog |
| M9 | Monster fights by (attacker AP, level): attempts, observed win %, expected win % from the table in Balance math; cells shown when ≥ 30 attempts. One aggregate z = (wins − Σp)/√Σp(1−p). PvP: attempts, attacker win % | \|z\| > 3: simulator or dice bug |
| M10 | Bot health: per seat, the first round with an army off its own Base (median, % never); % of collected positions that were on the own Base; % of seats ending with Productive in hand and non-empty positions (trapped); % of seats ending with ≥ 1 card bots never use | Never leaves > 10 %, Base positions > 50 %, or trapped > 10 % |

Gating: if any M10 flag fires, the M5–M7 flags print as "suppressed (bot health)" and are not listed as balance breaches. The values are still shown.

### Report
- Write `report.md` and `report.json` (same numbers) to `--out`, and print the Markdown tables to stdout.
- Header: seed, games per config, max rounds, git commit, settings snapshot. Only the timestamp and commit may differ between identical runs.
- The Markdown opens with **"Read this first"**: every M1, M10, M8 and integrity flag. Balance tables follow, with the M3/M5–M7 flags marked "(suppressed)" when gated.
- A guide in `docs/` (location chosen by the architects; `docs/README.md` §6.8 links to it) explains each metric, its flag and the gating. It covers these known bot facts:
  - Gems-first Base positioning.
  - Explorer always bought first.
  - Productive trap.
  - Sabotage targets humans only.
  - Combat cards are never played.
  - Fog off removes the exploration priority.

  It also states the rules for comparing runs: same seed and games count; maps are paired, play is not; judge differences by CIs or a two-proportion z-test.
- Docs drift to record in the guide or README, not code: the deck is 2 copies of each of the 13 `BASE_CARDS` (`game-initializer.ts:277-278`); `SPECIAL_CARDS` is unused.

### Acceptance
1. **Determinism:** two runs with identical flags produce identical JSON apart from the timestamp and commit.
2. **Integrity:** M5 mismatch count 0; M8 acquired = consumed + held for every kind.
3. **Faithfulness:**
   - Consumed = 0 for Productive, Sabotage, Overcome, War Chief, Decide Dice Roll, Extra Move, Steal Resource, Scout and Teleport.
   - Sabotage skips = 0.
   - M9 |z| ≤ 3.
4. **Unit tests:** every log parser runs against its exact source string. A tiny run (2 bots, 3 games, fixed seed, small cap) completes and writes both files.
5. **Zero Firestore writes, zero network, no change to `src/lib` game or bot logic.**
