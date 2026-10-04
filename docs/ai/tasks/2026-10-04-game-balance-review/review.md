# Final review: Game balance fixes

## Phase 1/6

VERDICT: APPROVED

### Checks run
- `npm run typecheck`: clean, no errors (`tsc --noEmit`).
- `npm run lint`: clean, `eslint . --max-warnings 0 --no-error-on-unmatched-pattern` passed.
- `npm test`: `Test Suites: 2 failed, 174 passed, 176 total` / `Tests: 1811 passed, 1811 total`. The 2
  failed suites are `.agents/skills/caveman-explore/tests/skill-file.test.mjs` and
  `.agents/skills/caveman-learn/tests/skill-file.test.mjs` ("must contain at least one test") —
  Antigravity config, not `src/modules/game-rules`, not touched by this phase's diff, pre-existing.
  All 1811 real tests pass, 0 failed.
- ui-verify: not applicable, logic-only phase (no view files touched).

### Plan adherence
- `game-setup.reducer.ts:110` builds `initialDeck` from `SPECIAL_CARDS.filter(...)`, not doubled
  `BASE_CARDS`. Matches File plan. Met.
- `game-setup.reducer.ts:3,17`: Finding 1 from the prior pass (unplanned `defaultGameSettings.availableCards`
  swapped to `[...SPECIAL_CARDS]`, which would have duplicated every "Available Cards" badge in
  `LobbyGameRow.tsx:38` for default-settings games) is fixed — line 17 reverted to
  `availableCards: [...BASE_CARDS]`, line 3's import restored to `import { BASE_CARDS, SPECIAL_CARDS } from './card-data';`.
  Verified by reading the file directly. Resolved.
- `combat-player-roll.reducer.ts:45-65` and `combat-monster-roll.reducer.ts:57-91`: War Chief is now a
  flat `+2` added to the score total (`warChiefApplied ? WAR_CHIEF_BONUS_POWER : 0`), dice pool stays
  `attacker.attackPower + 1` unconditionally — matches the Contracts block exactly, including the
  monster-roll ordering (flat bonus summed after Decide Dice Roll's `attackerRolls[0]` override). Met.
- `card-data.ts:52`: `SPECIAL_CARD_DESCRIPTIONS['War Chief']` now reads "+2 to your combat score for
  your next battle." Met.
- Tests (tester-a): `game-setup.reducer.test.ts` asserts `specialCardsDeck.length === SPECIAL_CARDS.length`
  (19) and every card is drawn from `SPECIAL_CARDS`. `combat-player-roll.reducer.test.ts` and
  `combat-monster-roll.reducer.test.ts` assert dice-pool length is exactly 1 (no bonus dice) and
  recompute `winnerId` from the actual rolled values plus the fixed `+2`, matching production's formula
  — exact-value assertions, not ranges. Met.

### Findings
| # | File:line | Problem | Owner | Blocking? |
|---|---|---|---|---|

No open findings. Finding 1 from the previous pass (`game-setup.reducer.ts:17`, unplanned
`availableCards` swap) was fixed by implementer-a and verified above.

### Docs
- `docs/README.md`: not needed in this phase — scoped to Phase 3 per `plan.md`'s Phases section;
  confirmed untouched in Phase 1's file set.

## Phase 2/6

VERDICT: APPROVED

### Checks run
- `npm run typecheck`: clean, no errors (`tsc --noEmit`).
- `npm run lint`: clean, `eslint . --max-warnings 0 --no-error-on-unmatched-pattern` passed.
- `npm test`: `Test Suites: 2 failed, 174 passed, 176 total` / `Tests: 1811 passed, 1811 total`. The 2
  failed suites are `.agents/skills/caveman-learn/tests/skill-file.test.mjs` and
  `.agents/skills/caveman-explore/tests/skill-file.test.mjs` ("must contain at least one test") —
  Antigravity config, not `src/modules/game-rules`, not touched by this phase's diff, pre-existing.
  All 1811 real tests pass, 0 failed. Re-run after the Phase 1 review.md overwrite was discovered;
  Phase 2's files are unchanged since my original approval (`git diff --stat` on the Phase 2 file set
  matches what I reviewed).
- ui-verify: not applicable, logic-only phase (no view files touched).

### Plan adherence
- `player-turn.reducer.ts`'s `applyAutomaticCollection` no longer clears `player.positions`/`positionedBy`
  after collecting — `player-turn.reducer.ts:21-26` (diff), matches File plan and Contracts. Met.
- `card-effects.reducer.ts`'s `handleUseProductiveCard` no longer clears positions after collecting —
  `card-effects.reducer.ts:76` (comment replacing the removed clear block), matches Decision ("fold
  Productive-card cleanup into Phase 2"). Met.
- `combat-player-resolve.reducer.ts` "Attacker lost" branch: `oldPos` captured before respawn
  (`combat-player-resolve.reducer.ts:72`) and `loser.positions`/tile `positionedBy` cleanup added
  (`:87-96`), mirroring the existing "defender lost" branch (`:47,53-62`) byte-for-byte in shape, keyed on
  `attackingArmyId` per the Contracts block's `cleanupStalePosition` sketch. Met.
- `combat-monster-resolve.reducer.ts` loss branch: one-line comment only
  (`combat-monster-resolve.reducer.ts:66-67`), no cleanup code — matches architect-b's Decision that the
  scenario is unreachable. Met.
- No stale `positions`/`positionedBy` entry left on any loss path: verified all three removal sites
  (`player-turn.reducer.ts` auto-collect no longer touches positions at all since persistence is now the
  rule; `combat-player-resolve.reducer.ts` both win/loss branches now symmetrically clear the loser's
  entry; monster-resolve confirmed unreachable). Met.
- Test plan: `player-turn.reducer.test.ts` adds a two-consecutive-`handleEndTurn` persistence case
  (`:88-116`) with exact gold-delta assertion (`goldAfterFirstCollection + goldYield`), not a range.
  `card-effects.reducer.test.ts` updates three assertions from "cleared" to "persists" with exact
  `toHaveLength(1)` / exact `positionedBy` array equality. `combat-player-resolve.reducer.test.ts` adds
  the attacker-loss case (`:131-143`) asserting both `loser.positions` and `tile.positionedBy` are empty
  of the losing army, reusing the existing `placeCombatants` helper (not a new fixture). All exact-value
  assertions per the `testing` skill. Met.
- `resource-position.reducer.test.ts` and `combat-monster-resolve.reducer.test.ts`: untouched — consistent
  with the plan's "no new case needed" / architect-b's unreachable-scenario finding, and within the File
  plan's flagged tester-a judgment call (Phase 1 review's "Minor, non-blocking" note). Met.

### Findings
| # | File:line | Problem | Owner | Blocking? |
|---|---|---|---|---|

No findings.

### Docs
- `docs/README.md`: not needed in this phase — scoped to Phase 3 per `plan.md`'s Phases section; confirmed
  untouched (`git diff --stat -- docs/README.md` empty), correct for phase 2/6.
