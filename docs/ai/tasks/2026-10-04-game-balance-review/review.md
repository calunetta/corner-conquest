# Final review: Game balance fixes, phase 3/6 (Docs update)

VERDICT: APPROVED

## Checks run
- `npm run typecheck`: exit 0, no errors.
- `npm run lint`: exit 0, `eslint . --max-warnings 0 --no-error-on-unmatched-pattern` clean.
- `npm test`: `Tests: 1965 passed, 1965 total`. Two suites fail to run
  (`.agents/skills/caveman-learn/tests/skill-file.test.mjs`,
  `.agents/skills/caveman-explore/tests/skill-file.test.mjs`, "must contain at least one test") —
  pre-existing, outside `src/`, untouched by this phase's File plan; not caused by this change.
- ui-verify: not applicable, docs-only phase.

## Plan adherence
- File plan for Phase 3 scopes only `docs/README.md`. Diff touches exactly that file. Met.
- §5.3 new "Collecting" bullet (`docs/README.md:156`): states a positioned army yields its resource
  every turn until the position is removed — matches Phase 2's committed behavior
  (`player-turn.reducer.ts`, `card-effects.reducer.ts` no longer clear `positions`/`positionedBy`
  after collection, commit 2004861). Met.
- §6.3 Position rule (`docs/README.md:195-198`): "keeps collecting it every turn... position is
  removed only when the army moves..., loses a fight..., or is defeated. Winning a fight... keeps
  the position." Verified against the actual reducers:
  - Move clears position: `movement.reducer.ts:85-89` (`positionIndex`/`removedPosition`/`positionedBy`
    filter) — confirmed present, unconditional on any voluntary move. Met.
  - Attacker-lost and defender-lost both clear position: `combat-player-resolve.reducer.ts:59-64`
    (defender-lost) and `:98-103` (attacker-lost, the branch Phase 2 added) — both read, both do the
    identical `positionIndex`/`splice`/`positionedBy.filter` cleanup. Met.
  - Winning a fight does not touch `positions` at all (read the full resolve reducer, lines 1-109;
    the winner branch never references `positions`). Consistent with "winning keeps the position." Met.
- §6.5 War Chief flat +2 (`docs/README.md:327`): "flat +2 added to the dice total... not extra dice...
  does not change permanent attack power." Verified against both roll reducers:
  - `combat-player-roll.reducer.ts:73-76`: dice pool is always `rollDice(attacker.attackPower + 1)`
    (line 73, no bonus added to the die count); `attackerScore` adds `WAR_CHIEF_BONUS_POWER` (= 2,
    line 6) only if `warChiefApplied` (line 76). Met.
  - `combat-monster-roll.reducer.ts:100,108`: same pattern — `attackerRolls = rollDice(attacker.attackPower + 1)`
    (line 100, unconditional), flat bonus added at line 108 after Decide Dice Roll's override at
    line 101-104. Order is correct per the plan's contract (override before the flat sum). Met.
  - `card-data.ts:52`: `SPECIAL_CARD_DESCRIPTIONS['War Chief']` reads "Gain +2 to your combat score
    for your next battle" — consistent with the README wording, no "attack power" language left in
    the tooltip text. Met.
- implementer-a's claim that §6.4 and §6.10 need no changes: verified independently.
  - §6.4 (`docs/README.md:254`): "Each player rolls a number of dice equal to their Attack Power + 1"
    — still exactly true; War Chief's bonus never changes the die count (confirmed above), so this
    sentence needed no edit.
  - §6.10 (`docs/README.md:400-404`, Tutorial System): generic overview/maintenance-rule prose, no
    numeric claim or War-Chief/positioning-cycle language to go stale. No change needed.
  - Commit hashes `e2a0754` (Phase 1) and `2004861` (Phase 2) checked with `git show --stat`: file
    lists match the plan's Phase 1/2 File plan rows; commit messages describe exactly the rebalance
    and position-persistence behavior the docs now describe.

## Findings
| # | File:line | Problem | Owner | Blocking? |
|---|---|---|---|---|
| 1 | `src/modules/combat/components/CombatDialog/CombatDialog.tsx:74` | Label reads `Use 'War Chief' (+2 Attack Dice)` — stale, War Chief is now a flat +2 score, not extra dice. | implementer (future task) | No — out of this docs-only phase's File plan, confirmed by implementer-a's report. |
| 2 | `src/modules/combat/components/MonsterCombatDialog/MonsterCombatCardSelector.tsx:49` | Same stale `(+2 Attack Dice)` label, monster-combat variant. | implementer (future task) | No — same reasoning as #1. |
| 3 | `src/modules/hud/components/TutorialBeacon/TutorialBeacon.preview.tsx:22` (and any live in-app copy sharing this string) | Tutorial/beacon copy omits the new persistence/removal-rule clause for positioning. | implementer (future task) | No — in-app UI copy, not `docs/README.md`. |
| 4 | `docs/balance-simulator-guide.md:122-126` | Section titled "Deck composition (a documentation drift, not a bug)" still says the live deck is "2 copies of each of the 13 `BASE_CARDS`" and that `SPECIAL_CARDS` is "never used anywhere" — both false since Phase 1 (commit `e2a0754`) wired `SPECIAL_CARDS` into `game-setup.reducer.ts`. Also cites dead paths `src/lib/game-initializer.ts:277-278` and `src/lib/card-data.ts`, both deleted by an earlier migration (confirmed: neither file exists). Not found by this phase's grep since it isn't `docs/README.md`, but it is the one doc that explicitly recorded the exact bug Phase 1 fixed, so leaving it stale is actively misleading, worse than the UI strings above. | implementer (follow-up task) | No — outside this phase's File plan (`docs/README.md` only), but recommend a small follow-up task/phase to fix it since it documents the very bug this task closed. |

Findings 1-3 match implementer-a's own report; finding 4 is new, found independently this review. All four: real, confirmed drift, legitimately out of this phase's scope (`plan.md`'s File plan lists only `docs/README.md` for Phase 3). Findings 1-2 (player-facing combat dialog copy) and 4 (actively-misleading doc) warrant a follow-up task; finding 3 is lower priority (a preview fixture string, not necessarily live in-app copy — not verified whether the same string is used in a real `TutorialBeacon` instance or only the preview).

## Docs
- `docs/README.md`: updated, matches Phase 1/2 code exactly (verified line-by-line above). `docs/balance-simulator-guide.md` was not updated and should be in a follow-up (finding 4) — not required for this phase's acceptance criteria, which name only `docs/README.md`.
