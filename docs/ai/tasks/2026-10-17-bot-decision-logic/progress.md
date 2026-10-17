# Bot decision logic: progress

- [x] Scoring model proposed (game-designer-a) and challenged; final spec in `game-design.md`
- [x] Pure dice win-probability helper: `src/modules/game-rules/bot-combat-odds.ts`
- [x] Scoring constants and candidate scores: `bot-action-scoring.ts`, wired in `bot-army-actions.reducer.ts`
- [x] Base defence: move-to-own-base bonus from revealed enemy armies only
- [x] Monster attack scored by odds and monster VP (`MONSTER_VICTORY_POINTS_BY_LEVEL` now exported)
- [x] Combat cards chosen at roll time: `bot-combat-cards.ts`
- [x] Tests updated for the new ordering and new coverage (`bot-army-actions`, `bot-turn`, `bot-combat-odds`, `bot-combat-cards`, `e2e/bot-ui-actions`, `acceptance`)
- [x] docs-sync: `docs/architecture/systems-and-visuals.md` §6.9
- [ ] Balance run: baseline vs after, reviewed by balance-rule-reviewer

## Test expectations changed on purpose
- Attack-vs-position and attack-vs-move tests now give the bot attack power so the fight is favourable. An even fight (~42–44%) is now declined.
- Fog-vs-position regression test (game-design finding 1) is reversed: exploration (6) beats positioning (4) by design. The old tie-break no longer exists.
- Acceptance test no longer lists Overcome, War Chief or Decide Dice Roll as "never consumed by bots".

## Known gaps
- No decline-combat action in the engine: an army with no legal move but a hopeless attack still fights (accepted, see `game-design.md`).
- Combat cards are only used if the bot has not already spent its one card action this turn (pre-turn card strategy goes first).
