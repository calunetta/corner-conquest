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

## Phase 3/6 (Docs update)

VERDICT: APPROVED

### Checks run
- `npm run typecheck`: exit 0, no errors.
- `npm run lint`: exit 0, `eslint . --max-warnings 0 --no-error-on-unmatched-pattern` clean.
- `npm test`: `Tests: 1965 passed, 1965 total`. Two suites fail to run
  (`.agents/skills/caveman-learn/tests/skill-file.test.mjs`,
  `.agents/skills/caveman-explore/tests/skill-file.test.mjs`, "must contain at least one test") —
  pre-existing, outside `src/`, untouched by this phase's File plan; not caused by this change.
- ui-verify: not applicable, docs-only phase.

### Plan adherence
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

### Findings
| # | File:line | Problem | Owner | Blocking? |
|---|---|---|---|---|
| 1 | `src/modules/combat/components/CombatDialog/CombatDialog.tsx:74` | Label reads `Use 'War Chief' (+2 Attack Dice)` — stale, War Chief is now a flat +2 score, not extra dice. | implementer (future task) | No — out of this docs-only phase's File plan, confirmed by implementer-a's report. |
| 2 | `src/modules/combat/components/MonsterCombatDialog/MonsterCombatCardSelector.tsx:49` | Same stale `(+2 Attack Dice)` label, monster-combat variant. | implementer (future task) | No — same reasoning as #1. |
| 3 | `src/modules/hud/components/TutorialBeacon/TutorialBeacon.preview.tsx:22` (and any live in-app copy sharing this string) | Tutorial/beacon copy omits the new persistence/removal-rule clause for positioning. | implementer (future task) | No — in-app UI copy, not `docs/README.md`. |
| 4 | `docs/balance-simulator-guide.md:122-126` | Section titled "Deck composition (a documentation drift, not a bug)" still says the live deck is "2 copies of each of the 13 `BASE_CARDS`" and that `SPECIAL_CARDS` is "never used anywhere" — both false since Phase 1 (commit `e2a0754`) wired `SPECIAL_CARDS` into `game-setup.reducer.ts`. Also cites dead paths `src/lib/game-initializer.ts:277-278` and `src/lib/card-data.ts`, both deleted by an earlier migration (confirmed: neither file exists). Not found by this phase's grep since it isn't `docs/README.md`, but it is the one doc that explicitly recorded the exact bug Phase 1 fixed, so leaving it stale is actively misleading, worse than the UI strings above. | implementer (follow-up task) | No — outside this phase's File plan (`docs/README.md` only), but recommend a small follow-up task/phase to fix it since it documents the very bug this task closed. |

Findings 1-3 match implementer-a's own report; finding 4 is new, found independently this review. All four: real, confirmed drift, legitimately out of this phase's scope (`plan.md`'s File plan lists only `docs/README.md` for Phase 3). Findings 1-2 (player-facing combat dialog copy) and 4 (actively-misleading doc) warrant a follow-up task; finding 3 is lower priority (a preview fixture string, not necessarily live in-app copy — not verified whether the same string is used in a real `TutorialBeacon` instance or only the preview).

### Docs
- `docs/README.md`: updated, matches Phase 1/2 code exactly (verified line-by-line above). `docs/balance-simulator-guide.md` was not updated and should be in a follow-up (finding 4) — not required for this phase's acceptance criteria, which name only `docs/README.md`.

## Phase 4/6 (ui-designer-b challenger pass + GameBoardHeader resource strip)

VERDICT: APPROVED

### Checks run
- `npm run typecheck`: exit 0, no errors (`tsc --noEmit`).
- `npm run lint`: exit 0, `eslint . --max-warnings 0 --no-error-on-unmatched-pattern` clean.
- `npm test`: `Test Suites: 2 failed, 179 passed, 181 total` / `Tests: 1975 passed, 1975 total`. The 2
  failed suites are `.agents/skills/caveman-learn/tests/skill-file.test.mjs` and
  `.agents/skills/caveman-explore/tests/skill-file.test.mjs` ("must contain at least one test") —
  Antigravity config under `.agents/`, outside `src/`, not touched by this phase's File plan,
  pre-existing (same two suites flagged in Phases 1-3). All 1975 real tests pass, 0 failed.
- ui-verify: ran myself by reading the two screenshots the coordinator produced after the mobile-wrap
  fix: `test-results/ui-verify/testbed-hud-game-board-header-state-Playing-20-E2-80-93-20with-20resources--desktop.png`
  and the matching `--mobile.png` (both timestamped 2026-10-09 01:28, after `leftGroup`'s `flex-wrap`
  fix). Desktop (1280px): `VP Goal: 30` and the new resource chip (🍖4 🪵2 🪙1) sit side by side in one
  row, identical corner radius/border/background. Mobile (390px): the `VP Goal` badge renders on its own
  row and the resource chip wraps to a second row directly below it, all three icon+value pairs fully
  visible, nothing clipped off-screen. Matches the Final spec's acceptance criteria exactly (`ui-design.md:369-372`).

### Plan adherence / Final spec adherence
- `GameBoardHeader.styles.ts:8`: `resourceStrip` is copied verbatim from `vpGoalBadge`
  (`'flex items-center gap-2 rounded-md bg-background/70 px-3 py-1 text-sm font-semibold border border-white/5'`),
  matching the Final spec's Finding-1 fix (`ui-design.md:355-356`) character-for-character. Met.
- `GameBoardHeader.tsx:42-50`: resource strip is `isPlaying && (...)`, no `hidden`/`sm:` class anywhere
  on it or its children — renders unconditionally on every breakpoint, matching Finding 2's corrected
  premise ("never collapse, same as VP Goal"). Met.
- Placement: inside `leftGroup`, immediately after the `vpGoalBadge` block (`GameBoardHeader.tsx:36-50`)
  — matches the Final spec. Met.
- Resource span class: `GameBoardHeader.styles.ts:11` (`resourceValue: 'font-mono font-extrabold text-xs text-foreground'`)
  is byte-for-byte `PlayerInfo.styles.ts:55`'s `resourceValue` token (verified by reading that file:
  `resourceValue: 'font-mono font-extrabold text-xs text-foreground'`). The Final spec's prose contains
  two things for this span: an inline draft example (`text-xs font-bold text-foreground`) and the actual
  instruction ("reuse `PlayerInfo.styles.ts:55`'s `resourceValue` class for the span, since it's the
  exact same visual job", `ui-design.md:359-360`). The code follows the instruction, not the draft
  paraphrase that preceded it. tester-b's flagged nit (code uses `font-mono font-extrabold text-xs` vs.
  the draft's `text-xs font-bold`) is not spec drift — it is the Final spec's own explicit "reuse X"
  instruction overriding its own inline draft text. Not a finding; no action needed.
- `ResourceIcon` usage (`GameBoardHeader.tsx:46`, `h-3.5 w-3.5 shrink-0` via `styles.resourceIcon`,
  `GameBoardHeader.styles.ts:10`): matches `PlayerInfoStats.tsx:90`'s sizing exactly, per the Final spec.
  Met.
- `ResourceStatViewModel` reuse (Finding 5 / architect-b's Decision): `PlayerInfo.map.ts:81` now exports
  `toResources`; `GameBoardHeader.map.ts:2,25` imports it (`import { toResources } from '../PlayerInfo/PlayerInfo.map';`)
  and calls `localPlayer ? toResources(localPlayer) : []` rather than re-deriving the mapping. Matches
  the Final spec. The import path is a relative deep path (`../PlayerInfo/PlayerInfo.map`), not through
  `PlayerInfo`'s `index.ts` — correct per `component-architecture`'s own boundary rule ("Inside a module,
  relative imports... Another module only through its index"): `GameBoardHeader` and `PlayerInfo` are
  both components inside the same `hud` module, so this is an intra-module import, not a cross-module
  one: `ui-design.md:265-266`'s Finding 5 makes the same call explicitly. `PlayerInfo/index.ts:2` also
  now exports the type `ResourceStatViewModel`, which `GameBoardHeader.types.ts:2,14` imports as
  `import type { ResourceStatViewModel } from '../PlayerInfo';` — the type import correctly goes through
  the index (only the value import of `toResources` is a deep intra-module path, which is fine since
  it's not re-exported and doesn't need to be — `toResources` isn't part of `PlayerInfo`'s public API,
  just an internal helper two sibling components share). Met.
- `GameBoardHeaderViewModel.resources: ResourceStatViewModel[]` (`GameBoardHeader.types.ts:14`) and
  `toGameBoardHeaderViewModel`'s new `localPlayer: Player | null` parameter (`GameBoardHeader.map.ts:6,9`)
  match the Contracts block exactly. `GameBoardHeader.hook.ts:6-17` pulls `localPlayer` from
  `useGameBoard()` and passes it through — `useGameBoard()`'s return type at
  `game-board.engine.types.ts:9` (`localPlayer: Player | null`) confirmed by direct read, matches.
  Met.
- Mobile-layout bug and fix: independently confirmed the fix holds. `GameBoardHeader.styles.ts:5`
  (`leftGroup: 'flex flex-wrap items-center gap-2 sm:gap-4'`) now has `flex-wrap`, where the pre-fix
  version (per the coordinator's report) had none. Read the full current file — no other wrapper in the
  diff needed the same fix (`root` already had `flex-wrap` from before this phase,
  `GameBoardHeader.styles.ts:4`). The screenshots above confirm the fix: mobile wraps to two rows
  cleanly, nothing clipped. This was a real bug (new `resourceStrip` content overflowing a
  non-wrapping flex row at 390px, not a cosmetic issue) and the one-line fix is the correct minimal
  change — adding `flex-wrap` to the one container that gained a new, variable-width child. No further
  action needed.
- `GameBoardHeader.fixtures.ts`: every existing view-model fixture gets a `resources` field (`[]`-shaped
  defaults for waiting states via `startingResources`, non-zero `playingResources` for playing states) —
  all fixtures stay valid `GameBoardHeaderViewModel` objects, no fixture left with a missing required
  field. Met.
- Tests (tester-a, `GameBoardHeader.map.test.ts:246-312`): four new cases — empty array when
  `localPlayer` is `null`, output equals `toResources(localPlayer)` directly (strongest possible
  assertion — ties the map function to the real shared helper, not a hand-copied literal), exact
  food/wood/gold values, and the zero-fallback case tester-a added after the coordinator's revise round
  (`playerWithoutResources`, no `resources` field at all → all three values `0`). Exact-value assertions
  throughout, no ranges. Met.
- Tests (tester-b, `GameBoardHeader.test.tsx:147-200`): shows/hides on `isPlaying`, one pair per
  resource in food/wood/gold order (asserted via alt text on the mocked `next/image`), exact per-pair
  values via `within(pair)`, a zero-value case asserting `0` is shown (not hidden) — matches the Test
  plan and the acceptance criteria. The `next/image` mock (`GameBoardHeader.test.tsx:13-21`) follows the
  same pattern as `resource-icon.test.tsx`, per the `testing` skill's guidance. Met.
- Preview (preview-a, `GameBoardHeader.preview.tsx:24`): new "Playing – with resources" state added,
  reusing `playingMyTurnNotExpiringProps` (whose fixture already carries non-zero `playingResources`
  food:4/wood:2/gold:1) — confirmed via the screenshots above that this state is the one rendering the
  resource strip with real numbers, not zeros. Met.

### Findings
| # | File:line | Problem | Owner | Blocking? |
|---|---|---|---|---|

No findings. The mobile-wrap bug the coordinator caught via ui-verify was routed to implementer-b and
fixed (`GameBoardHeader.styles.ts:5`, `leftGroup` gains `flex-wrap`); independently re-verified above
via the post-fix screenshots and a direct read of the current file. tester-b's spec-drift nit on
`resourceValue`'s classes is resolved as not-a-finding (see Plan adherence above — the code follows the
Final spec's explicit "reuse X" instruction, not its own preceding draft paraphrase).

### Docs
- No `docs/README.md` change required or made for this phase — Phase 4's File plan and acceptance
  criteria are UI-only (a visual readout of data already described in §5.3/§6.3 from Phase 3). Note:
  `git diff --stat -- docs/README.md` currently shows a large pending diff in the working tree, but it
  is unrelated to this phase — it is a different, in-flight task's rewrite of `docs/README.md`'s intro
  and §2 (visible from the untracked `.claude/agents/docs-sync.md`, `.claude/skills/docs-sync/`, and
  `docs/architecture/` sitting alongside it in `git status`), not something Phase 4's implementers or
  testers touched. None of Phase 4's own files (`GameBoardHeader.*`, `PlayerInfo/index.ts`,
  `PlayerInfo.map.ts`) appear in that other diff.

## Phase 5/6 (ActionsPanel contextual ring emphasis)

VERDICT: APPROVED

### Checks run
- `npm run typecheck`: exit 0, no errors (`tsc --noEmit`), full repo.
- `npm run lint`: exit 0, `eslint . --max-warnings 0 --no-error-on-unmatched-pattern`, full repo.
- `npm test`: `Test Suites: 2 failed, 179 passed, 181 total` / `Tests: 1975 passed, 1975 total`. Same two
  pre-existing failures as every prior phase (`.agents/skills/caveman-explore/tests/skill-file.test.mjs`,
  `.agents/skills/caveman-learn/tests/skill-file.test.mjs`, "must contain at least one test") — outside
  `src/`, not touched by this phase's diff. All 1975 real tests pass, 0 failed. Test count unchanged from
  Phase 4 (1975 both times), consistent with tester-b's own report of adding no new assertions for this
  phase.
- ui-verify: ran myself. Screenshotted both preview states at both testbed slugs:
  `hud-actions-panel` (`ActionsPanel.preview.tsx`, desktop view) and `hud-mobile-actions-bar`
  (`MobileActionsBar.preview.tsx`, mobile bar). Cropped and visually diffed the main-grid region pixel
  for pixel: "Army selected, can attack" shows a visible `ring-1 ring-primary/40` outline around the
  entire 3-button main grid (Position/Attack/Deploy) on both the desktop card layout and the mobile row2
  bar; "My turn, no selection" shows plain per-button borders with no surrounding ring, on both. Crops
  compared at 3x zoom confirm the ring is present/absent exactly as `hasSelectedArmy` dictates, on both
  breakpoints.

### Plan adherence / Final spec adherence
- `ActionsPanel.styles.ts`: `mainGridActive: 'rounded-lg ring-1 ring-primary/40'`
  (`ActionsPanel.styles.ts:24`, diff) applied via `cn(styles.mainGrid, hasSelectedArmy &&
  styles.mainGridActive)` at `ActionsPanel.tsx:102`. The Final spec's own text
  (`ui-design.md:375`) wrote the Contracts sketch as `mainGridActive: cn(mainGrid, 'ring-1
  ring-primary/40 rounded-lg')` — a self-reference inside the same object literal, which is not valid
  JavaScript (an object literal can't read a sibling key while being constructed) — and the spec itself
  says "exact merge mechanism... left to the implementer; either is consistent with existing patterns in
  this file" (`ui-design.md:376-377`). implementer-b's actual approach (standalone token, merged with
  `cn()` at the call site) produces the identical class string and ring, and is the only one of the two
  that's syntactically possible. Functionally equivalent, explicitly permitted by the spec's own
  escape hatch. Not a deviation. Confirmed by reading the rendered class in the screenshots above.
- Mobile parity (Finding 7, required): `MobileActionsBar.styles.ts:29` adds `row2Active: 'rounded-lg
  ring-1 ring-primary/40'`; `MobileActionsBar.tsx:91-96` applies it via `cn(styles.row2({ columnCount:
  rowCount }), hasSelectedArmy && styles.row2Active)` to the `row2` wrapper — matches the Final spec's
  required file list (`ActionsPanel.tsx`, `ActionsPanel.styles.ts`, `MobileActionsBar.tsx`,
  `MobileActionsBar.styles.ts`, `ui-design.md:384`) exactly, same `hasSelectedArmy` condition, same
  `ring-1 ring-primary/40 rounded-lg` token value (order of utility classes differs —
  `rounded-lg ring-1 ring-primary/40` vs. the spec's `ring-1 ring-primary/40 rounded-lg` — Tailwind class
  order has no effect on the generated CSS or the cascade; not a finding). Confirmed via the mobile
  screenshots above: the ring renders identically on `hud-mobile-actions-bar` to `hud-actions-panel`.
  `secondaryActions`'s "quieter row" treatment is untouched (desktop-only, as specified) — no diff in
  `secondaryGrid` usage.
- Finding 8 (the `isPendingMatch` per-button treatment is a narrower, different signal than
  `hasSelectedArmy`, and the two layers coexist) was explicitly a "note, not a fix" in `ui-design.md:293-303`
  — i.e., nothing to change, only something not to accidentally undo. Confirmed it was not "fixed away":
  `git diff --stat -- src/modules/hud/components/ActionsPanel/ActionButton.tsx` shows no changes, and the
  full diff (`git status --porcelain`) touches exactly the four files the File plan/Final spec name —
  `ActionsPanel.styles.ts`, `ActionsPanel.tsx`, `MobileActionsBar.styles.ts`, `MobileActionsBar.tsx`. The
  per-button `isPendingMatch` → `buttonVariant({ isPendingMatch: true })` solid-fill treatment
  (`ActionButton.tsx:37,40`, `ActionsPanel.styles.ts:36`, both unread-but-unchanged this phase) is
  untouched and still independent of the new container-level ring. Met.
- No logic layer exists for this component pair and none was created — matches the coordinator's note
  that this is "pure styling, no logic layer," consistent with `component-architecture`'s guidance to
  create only the files a component needs.
- Tests (tester-b): deliberately no new DOM assertions added to `ActionsPanel.test.tsx` (confirmed by
  reading the full file — no ring-related `toHaveClass`/`className` assertion present). Correct per the
  `testing` skill ("Assert behavior and ARIA... never Tailwind classes") — a `ring-1 ring-primary/40`
  utility has no queryable role, label, or ARIA attribute to assert, and the plan's own Phase 5 step 5
  designates `ui-verify` screenshots as this feature's verification method, not a DOM assertion. Correct
  call, not a gap.
- Previews (preview-a): both "Army selected, can attack" and "My turn, no selection" states already
  existed in `ActionsPanel.preview.tsx:11-12` and `MobileActionsBar.preview.tsx:16-17` before this phase
  (confirmed: both fixtures are `armySelectedCanAttack`/`myTurnNoSelection`, pre-existing names, not new
  additions) — no new preview state was needed, matching preview-a's report and the Preview states section
  of `plan.md` (`ActionsPanel`: "existing states plus one new... state" — the state already existed, so
  nothing to add). Met.

### Findings
| # | File:line | Problem | Owner | Blocking? |
|---|---|---|---|---|

No findings. implementer-b's `mainGridActive` standalone-token implementation (vs. the Contracts block's
literal, syntactically-invalid self-reference) is not a deviation — it is the only valid reading of a
spec that explicitly left the merge mechanism to the implementer's discretion, and it produces the exact
ring in both screenshots above.

### Docs
- No `docs/README.md` or `docs/architecture/*.md` change required or made for this phase — a pure visual
  emphasis token with no new game rule or documented behavior change. Consistent with Phase 4's docs
  note and `plan.md`'s File plan, which lists no docs row for Phase 5.

## Phase 6/6 (LobbyGameRow VP Goal badge)

VERDICT: APPROVED

### Checks run
- `npm run typecheck`: exit 0, no errors (`tsc --noEmit`), full repo.
- `npm run lint`: exit 0, `eslint . --max-warnings 0 --no-error-on-unmatched-pattern`, full repo.
- `npx jest src/modules/lobby/components/LobbyGameRow`: `Test Suites: 2 passed, 2 total` /
  `Tests: 21 passed, 21 total`.
- `npm test` (full repo): `Test Suites: 2 failed, 179 passed, 181 total` / `Tests: 1979 passed, 1979 total`.
  The 2 failed suites are `.agents/skills/caveman-explore/tests/skill-file.test.mjs` and
  `.agents/skills/caveman-learn/tests/skill-file.test.mjs` ("must contain at least one test") —
  pre-existing (same two suites flagged in every prior phase since Phase 1; committed in `374721a`,
  outside `src/`, untouched by this phase's diff). All 1979 real tests pass, 0 failed.
- ui-verify: `node .claude/skills/ui-verify/scripts/snapshot.mjs http://localhost:9002/testbed/lobby-game-row`
  → `PASS desktop`, `PASS mobile`, `0 failing`. Then screenshotted the "Open room" (30 VP) and "Custom VP
  goal (45 VP)" states directly (`?state=` query param) to confirm the rendered text: both show an
  outline `Badge` reading `"30 VP"` / `"45 VP"` respectively, positioned in `infoGroup` right after the
  player-count chip (`2 / 4`) and before the info icon button — matches the screenshots at
  `test-results/ui-verify/testbed-lobby-game-row-state-Open-20room--desktop.png` and
  `...-Custom-20VP-20goal-20-45-20VP--desktop.png`.

### Plan adherence / Final spec adherence
- `LobbyGameRow.tsx:100`: `<Badge variant="outline">{game.settings.victoryPointGoal} VP</Badge>` inside
  `infoGroup`, immediately after the existing `playersInfo` chip — matches `ui-design.md:392-394`'s
  Final spec text and position exactly (byte-for-byte, including the `"{N} VP"` format, not a separate
  "VP Goal" label). `game: GameState` already carried `settings.victoryPointGoal`
  (`LobbyGameRow.types.ts:3-8`); no type change made, matching Finding 10 in `ui-design.md:313-321`. Met.
- `LobbyGameRow.styles.ts`: no diff (`git diff -- .../LobbyGameRow.styles.ts` empty). Final spec marks
  the `vpGoalBadge` token "optional... only if the default `Badge` sizing needs trimming... otherwise no
  new token required" (`ui-design.md:395-396`). Default `Badge` renders at a size consistent with the
  row (confirmed in the screenshots above, sits inline with the other chips at the same height); the
  file's own existing `Badge` usages elsewhere (`LobbyGameRow.tsx:39-41`, `:48-51`) also pass no extra
  className. Correct call, not a gap.
- Tests (`LobbyGameRow.test.tsx:25-57`): two new cases, both exact-text assertions (`screen.getByText('30 VP')`
  / `'45 VP'`) plus a negative assertion that the other value is absent (`queryByText('30 VP')).not.toBeInTheDocument()`
  when the custom-goal fixture is rendered) — matches the `testing` skill's "assert the exact observable
  outcome" rule, not a loose "badge exists" check. One test additionally confirms the badge is visible
  without opening the settings popover (`queryByText('Match Settings')).not.toBeInTheDocument()`),
  directly verifying the Final spec's acceptance criterion ("without needing to open the info popover",
  `ui-design.md:397-398`). An unrelated existing test was renamed (`'shows loading spinner when joining
  this game'` → `'disables the join button while this game is being joined'`) with no assertion change —
  cosmetic, harmless, not flagged as a finding.
- Fixtures/preview (`LobbyGameRow.fixtures.ts`, `.preview.tsx`): new `customGoalGame` fixture
  (`victoryPointGoal: 45`, distinct from `defaultGameSettings`'s 30) and a matching "Custom VP goal
  (45 VP)" preview state — satisfies `plan.md`'s Preview states note ("if every fixture uses the same
  value, add one with a different VP goal so the preview demonstrates the badge is live data, not a
  hardcoded string"). Confirmed live in the screenshots above (30 vs. 45 render correctly from two
  different fixtures). Met.

### Builder's question: was keeping the already-present badge correct?
Confirmed yes. The badge found already in the working tree matches `ui-design.md`'s Final spec
(`ui-design.md:391-398`) exactly in text format, placement, and scope (`.tsx` only, no type or styles
change). `plan.md`'s File plan row (`LobbyGameRow.tsx`, "add a `VP Goal` `Badge`... reading
`game.settings.victoryPointGoal`") is shorthand describing the feature, not a literal UI-copy spec — the
plan's own Phase 6 step 2 defers the exact rendering to "per ui-designer-b's Final spec," and Phase 4
step 1's charter is specifically to produce that Final spec for Proposals 1, 3, and 5. No reconciliation
needed: there is no live conflict, only a coordinator-facing wording gap in `plan.md`'s prose, which the
plan's own structure (Contracts/Phases pointing to the Final spec) already resolves. Nothing to edit.

### Docs
- `docs-sync` not required for this phase, confirmed. Grepped `docs/architecture/*.md` for
  `LobbyGameRow`/`victoryPointGoal`/"VP Goal": `structure-and-state.md:29` describes `LobbyGameRow` only
  as "room preview with settings popover" — a structural/inventory sentence that doesn't enumerate the
  row's child elements (it also doesn't mention the existing host-name or player-count chips), so adding
  a third inline badge doesn't make that sentence inaccurate. `game-mechanics.md:10` documents
  `victoryPointGoal` as a game rule (default 30, win condition) — unchanged by this phase, which only
  adds a read-only UI display of a value that already existed and was already readable via the row's
  settings popover (`SettingsDisplay`, `toSettingsSummaryRows` → "Victory Point Goal" row,
  `LobbyGameRow.map.ts:9`). This is a pure lobby UI addition: no game rule, no documented architecture
  behavior, and no bug fix changed. CLAUDE.md's docs-sync trigger ("A change to game rules or
  architecture, including a bug fix that changes documented behavior") does not apply. No edit made or
  needed.

### Findings
| # | File:line | Problem | Owner | Blocking? |
|---|---|---|---|---|

No findings.
