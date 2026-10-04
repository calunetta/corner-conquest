# Final review: Migrate game rules core logic into src/modules/game-rules, phase 4/4

VERDICT: APPROVED

## Checks run (this session)
- `npm run typecheck`: clean, no output (`tsc --noEmit` exit 0).
- `npx eslint <every file this phase created/edited>` (`src/modules/game-rules/bot-helpers.ts`,
  `bot-card-strategy.reducer.ts`, `bot-purchases.reducer.ts`, `bot-army-actions.reducer.ts`,
  `bot-turn.reducer.ts`, `bot-turn.reducer.test.ts`, `services/bot-turn.service.ts`,
  `services/bot-turn.service.test.ts`, `index.ts`, plus the two repointed call sites
  `src/hooks/use-game-engine.ts`, `scripts/balance-simulator/engine.ts`): `0 errors`, one expected
  warning (`use-game-engine.ts` is in `LEGACY_PATHS`, ignored by design).
- `npm run lint` (repo-wide): `eslint . --max-warnings 0 --no-error-on-unmatched-pattern` — no
  output, exit 0.
- `npx jest src/modules/game-rules`: `Test Suites: 23 passed, 23 total` /
  `Tests: 235 passed, 235 total`.
- `npm test` (full repo): `Test Suites: 149 passed, 149 total` / `Tests: 1473 passed, 1473 total`.
- `npx jest scripts/balance-simulator`: `Test Suites: 17 passed, 17 total` /
  `Tests: 110 passed, 110 total` — confirms the `engine.ts`/`acceptance.test.ts` repoint didn't
  break the simulator.
- e2e (`e2e/gameplay.spec.ts`): not run — `java -version` on this machine: "Unable to locate a
  Java Runtime." Confirms tester-b's report; not a blocker per CLAUDE.md's Phases section.

## Plan adherence
- `src/lib/bot-logic.ts` and `src/lib/__tests__/bot-logic.test.ts`: confirmed deleted (`ls` fails
  on both). All six legacy files named in the task's acceptance criteria
  (`game-logic.ts`, `turn-progression.ts`, `bot-logic.ts`, `game-initializer.ts`, `card-data.ts`,
  `player-data.ts`) are now gone from `src/lib/`.
- `bot-helpers.ts` (19 lines), `bot-card-strategy.reducer.ts` (59), `bot-purchases.reducer.ts`
  (50), `bot-army-actions.reducer.ts` (126), `bot-turn.reducer.ts` (27),
  `services/bot-turn.service.ts` (16): all under the 150-line cap; `bot-army-actions.reducer.ts`
  is the biggest as the plan predicted, with headroom to spare — the per-army-scoring extraction
  fallback was correctly not needed.
- Body comparison against `git show HEAD~N:src/lib/bot-logic.ts` (the file as it stood before
  deletion, read in full this session): every phase's logic is unchanged — same branching
  conditions, same cost/priority formulas, same combat auto-resolve payloads
  (`MonsterCombatRoll{useDecideCard:false, decidedValue:6, useOvercomeCard:false,
  useWarChief:false}`, `CombatRoll{useWarChild:false,useOvercome:false}` wording matches), same
  "mark first unacted army as acted" fallback on a failed action. Only changes: `state`/`activeBot`
  renamed `currentState`/`activeBot` (no behavior change), `any` annotations dropped in favor of
  inference (`(p: any) =>` → `(p) =>`), `console.log` debug lines dropped (per Decisions, not a
  game rule), guard moved from the reducer into the service exactly as Decisions specifies, and
  `JSON.parse(JSON.stringify())` replaced with `cloneDeep` from `lodash` — already the precedent
  in `src/modules/game-rules/game-rules.reducer.ts:3,34` for the same reason (deep-clone
  `GameState`), not an invented dependency.
- `BotAction.payload` is `unknown`, not `any` (`bot-helpers.ts:18`), matching the Contract and
  Decisions.
- `decideBotTurn(initialState)` has no guard and composes the three phase functions plus
  `handleGameAction({action: GameAction.EndTurn, ...})` in the exact order the Contract specifies
  (`bot-turn.reducer.ts:17-24`).
- `takeBotTurn` (service) guard is byte-equivalent to the original
  (`!botPlayer || !botPlayer.isBot || initialState.status !== 'playing'`,
  `services/bot-turn.service.ts:11`), checked against `initialState` directly as Decisions
  requires (no clone needed to read two fields).
- `index.ts` adds exactly one line, `export { takeBotTurn } from './services/bot-turn.service';`
  — no unplanned exports (the Phase 2 lesson still applied).
- `bot-turn.reducer.test.ts`: 6 cases covering every branch the Test plan names (Reinforce
  pre-turn, attack-over-move, monster-combat auto-resolve, outer guard
  `unactedArmies.length === 0`, inner guard `possibleActions.length === 0`, purity) — the inner-
  guard test is correctly titled and its fixture (every reachable tile forced to `Empty`, origin
  occupied only by the bot's own army) actually produces an empty `possibleActions` array for that
  army, confirming tester-a's fix for tester-b's earlier finding landed.
- `services/bot-turn.service.test.ts`: ported integration case plus two guard cases
  (non-bot-current-player, non-'playing'-status) — matches the Test plan's named cases.
- Call-site repoints: `src/hooks/use-game-engine.ts:8` and
  `scripts/balance-simulator/engine.ts:4` both now import `takeBotTurn` from
  `@/modules/game-rules` / `'../../src/modules/game-rules'` — matches the File plan exactly, and
  `engine.ts`'s doc-comments were updated to describe the new file, not just the import line.
- `docs/README.md`: the five Phase-4-scoped edits all landed and match the plan
  (`§"src/modules/"`'s `game-rules/` description now lists setup/player-join/turn-progression/
  catalogs/bot-AI files; `§"src/lib/"`'s three legacy bullets removed and the `__tests__` bullet
  now lists only `firebase.test.ts`; the game-initializer/player-data prose at the old `:162-163`
  and the bot-logic prose at the old `:384` both repoint to `src/modules/game-rules/...`).

## Findings
None blocking. The 5 stale-citation findings from the first pass of this review are fixed, verified
independently in this session:
- `.claude/agents/game-designer-a.md:20` now reads `src/modules/game-rules/`,
  `src/modules/game-rules/game-setup.reducer.ts`, `src/modules/game-rules/card-data.ts`,
  `src/modules/game-rules/bot-turn.reducer.ts`.
- `.claude/skills/game-design/SKILL.md:16,24,28,30,50` now cite `game-setup.reducer.ts` (×2, VP
  goal and monster dice — line 24 actually cites `monster-catalog.ts`, correctly, not
  `game-setup.reducer.ts`), `card-data.ts`, and `bot-turn.reducer.ts` (×2) under
  `src/modules/game-rules/`.
- `.claude/skills/anti-hallucination/SKILL.md:18` now cites `src/modules/game-rules/`,
  `src/modules/game-rules/game-setup.reducer.ts`, `src/modules/game-rules/card-data.ts`.
- `.claude/skills/component-architecture/SKILL.md:81` now cites `MONSTER_DATA` in
  `src/modules/game-rules/monster-catalog.ts`.
- `scripts/balance-simulator/acceptance.test.ts:7-11`: rewritten to cite
  `src/modules/game-rules/bot-card-strategy.reducer.ts` and corrected the line-number citation to
  `bot-card-strategy.reducer.ts:51` — verified against the actual file: line 51 is
  `const opponent = currentState.players.find((p) => !p.isBot && p.id !== activeBot.id);`, the
  exact Sabotage-targeting line the comment describes. Accurate, not a guessed line-shift.

Re-grepped the whole repo (`scripts src e2e .claude`) for all six legacy path strings: zero hits
outside the already-known, non-blocking `src/docs/README.md` (see below).

Not re-flagging (already recorded, out of this plan's scope, non-blocking): `src/docs/README.md`
is a stray tracked duplicate of `docs/README.md` that still says `src/lib/player-data.ts`
(`:157`) and `src/lib/bot-logic.ts` (`:378`) — Phase 3's review already identified this exact file
as unreachable from the app and recommended a separate cleanup task, not a fix inside this plan
(the acceptance criteria name `docs/README.md`, not `src/docs/README.md`). Still true.

## Docs
- `docs/README.md`: updated, matches plan (see Plan adherence above).
- `.claude/skills/*`, `.claude/agents/game-designer-a.md`, `scripts/balance-simulator/acceptance.test.ts`:
  updated by implementer-b in revise mode; re-verified in this session (see Findings).

## Checks re-run after implementer-b's fix (this session)
- `npx eslint scripts/balance-simulator/acceptance.test.ts`: no output, exit 0.
- `npm run typecheck`: clean, no output.
- `npm run lint` (repo-wide): no output, exit 0.
- `npm test` (full repo): `Test Suites: 149 passed, 149 total` / `Tests: 1473 passed, 1473 total`.

## progress.md
Phase 4 boxes ticked after independent re-verification in this session: plan approved (already
APPROVED from architect-b's original sign-off on the whole task), implementation, tests, checks,
final review. Previews/UI-verify stay unticked — not applicable, per plan (no UI change).
