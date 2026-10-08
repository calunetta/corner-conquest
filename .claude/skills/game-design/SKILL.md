---
name: game-design
description: Game design reference for Corner Conquest - core loop, verified rule numbers with source files, design pillars, fun lenses, balance math, constraints - and how the game designers propose and stress-test changes in game-design.md. Use when proposing or reviewing rules, balance, cards, monsters, economy, pacing, bot behavior, or ideas to make the game more fun.
---

# Game design

## The game
2–4 players (humans or bots) start in the corners of a 5 × 6 archipelago hidden by fog of war. Each turn they move armies to discover islands, position armies on resources, fight players and monsters, and spend wheat, iron and gems on armies, attack upgrades, cards and passive abilities. The first player to the victory point goal wins.

## Rule numbers
Verified at bootstrap. The code wins over this table: re-check the source before relying on a number.

| Rule | Value | Source |
|---|---|---|
| Victory point goal | 30 (lobby slider 10–100) | `src/modules/game-rules/game-setup.reducer.ts` (`defaultGameSettings`) |
| VP for first discovery of an island | 1 | same |
| Deploy an army | 6 wheat, +2 per army deployed | same (`initialDeployCost`, `deployCostIncrement`) |
| Upgrade attack power | 6 iron | same (`upgradeCost`), `src/modules/game-rules/player-actions.reducer.ts` |
| Passive ability | 15 gems | same (`abilityCost`), `src/modules/game-rules/card-acquisition.reducer.ts` |
| Buy a card / hand limit | 10 gems / 7 cards | `src/modules/game-rules/card-acquisition.reducer.ts`, `src/lib/types/actions.ts` |
| Max armies / max attack power | 5 / 4 | `src/modules/game-rules/player-actions.reducer.ts` |
| Player dice | attack power + 1 (+2 with War Chief), at least 1 | `src/modules/game-rules/combat-player-roll.reducer.ts`, `src/modules/game-rules/dice.ts` |
| Monster dice | its level: Lancer 1, Bear 2, Ogre 3, Minotaur 4 | `src/modules/game-rules/combat-monster-roll.reducer.ts`, `src/modules/game-rules/monster-catalog.ts` |
| Ties | player vs player: the defender wins; player vs monster: the monster wins | `src/modules/game-rules/combat-player-roll.reducer.ts`, `src/modules/game-rules/combat-monster-roll.reducer.ts` |
| Rewards | +5 VP for beating a player; 2 / 5 / 7 / 10 VP for monster levels 1–4 | `src/modules/game-rules/combat-player-resolve.reducer.ts`, `src/modules/game-rules/combat-monster-resolve.reducer.ts` |
| Turn timer | 120 s | `src/features/game/hooks/useTurnTimer.ts` |
| Cards | 13 kinds in a weighted deck | `src/modules/game-rules/card-data.ts` |

Full flows: `docs/architecture/game-mechanics.md`, `docs/architecture/special-cards.md` and `docs/architecture/systems-and-visuals.md` (§5–6.13). Bot strategy: `src/modules/game-rules/bot-turn.reducer.ts`.

## Design pillars
1. Every turn offers a meaningful choice: expand, exploit, fight or invest.
2. Matches stay short (about 20 turns) and readable at a glance.
3. Players interact: contested islands, combat, sabotage.
4. Trailing players keep a path back without arbitrary punishment of the leader.
5. Luck adds tension; skill decides most matches.

## Fun lenses
Name the one a proposal serves: agency, risk and reward, tension and pacing, discovery and surprise, mastery (depth without complexity), social interaction, feedback and juice (the game visibly reacts).

## Balance math
- One d6 averages 3.5 (variance 35/12); the sum of N dice averages 3.5 N.
- Compute probabilities instead of estimating them: enumerate or simulate dice outcomes with `node -e "…"` and paste the command and its result into `game-design.md`.
- Check every change for: a dominant strategy, a runaway leader, stalling, early-combat snowballing, card combos (Overcome, War Chief, Decide Dice Roll), the hand limit, fog of war, and bots.

## Constraints
- Complexity budget: a new rule replaces or simplifies something, or clearly earns its place. It must fit in one tooltip-sized sentence.
- Firestore cost: no extra writes per action (`docs/architecture/systems-and-visuals.md` §6.10).
- Bots: every new rule states what `src/modules/game-rules/bot-turn.reducer.ts` does with it.
- Tutorial: update the matching `TutorialBeacon` text (`docs/architecture/systems-and-visuals.md` §6.11).
- Docs: rule changes (features and bug fixes alike) update the relevant `docs/architecture/*.md` file in the same phase — agent `docs-sync`, skill `docs-sync`.

## Process
- **game-designer-a**: diagnose with evidence, propose 2–3 options (one of them minimal) with exact numbers and math, recommend one. Template: `docs/ai/templates/game-design.md`.
- **game-designer-b**: stress-test independently: redo the math, hunt exploits, check pillars and constraints. Write `VERDICT: APPROVED` or `VERDICT: CHANGES REQUESTED`; when approved, write the Final spec.
- **"Make the game more fun" with no specific feature**: produce a ranked backlog (impact, effort, risk) instead of one spec; the user picks what to build.
- The user approves the Final spec before the architects plan it.
