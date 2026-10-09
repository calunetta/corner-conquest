# Final review: hasActed/Extra Move consistency + Deselect Army card refund, phase 1/1

VERDICT: APPROVED

## Checks run
- `npm run typecheck`: clean, no output, exit 0.
- `npm run lint`: clean, no output, exit 0.
- `npm test`: `Test Suites: 2 failed, 180 passed, 182 total` / `Tests: 2003 passed, 2003 total`. The 2 failing suites are `.agents/skills/caveman-learn/tests/skill-file.test.mjs` and `.agents/skills/caveman-explore/tests/skill-file.test.mjs` ("Your test suite must contain at least one test"); `git status --porcelain -- .agents/` is clean, confirming these files are untouched by this task and fail identically on unmodified HEAD — pre-existing, unrelated. Every test this task touches or added passes (2003/2003 individual tests pass; the 2 "failed" suites are suite-level `.mjs` harness errors, not failing assertions).
- ui-verify: not applicable — no view changes (plan's Preview states: None).

## Plan adherence
- **Respawn sets `hasActed: true`** (criterion 1): met. `combat-player-resolve.reducer.ts:56,95` and `combat-monster-resolve.reducer.ts:98` each now have an explicit `losingArmy.hasActed = true;` / `loserArmy.hasActed = true;` replacing the deleted `= false` line, exactly per Contracts. Verified against `git diff` — matches the plan's required code shape byte-for-byte (comment wording differs slightly from the plan's suggested comment, immaterial). Tests cover the PvP defender case (never written during the roll) and a PvM attacker who used Extra Move then lost (`combat-player-resolve.reducer.test.ts:118-176`, `combat-monster-resolve.reducer.test.ts:148-163`), both of which the deletion-only fix was shown to fail.
- **Extra Move + already-acted army stays acted, across Move/Attack(PvP)/Attack(PvM)/Position** (criterion 2): met. `combat-player-roll.reducer.ts:26-36`, `combat-monster-roll.reducer.ts:30-40`, `resource-position.reducer.ts:37-46` all now follow the `if (hasExtraMove) { consume, no hasActed write } else { hasActed = true }` shape from `movement.reducer.ts:104-115`. Each has a dedicated "already-acted army … stays acted" test.
- **Extra Move + not-yet-acted army stays unacted, same four paths** (criterion 3): met, same code sites; each has a dedicated "unacted army … stays unacted" test, and Move's pre-existing correct behavior is unchanged (not touched by this diff).
- **Deselect Army refunds a pending card action like Cancel does** (criterion 4): met. `game-board.local-actions.hook.ts:6-18` extracts the shared `hasPendingCardAction` predicate (used by both the Escape handler and the new `local_DeselectArmy` branch at line 41-43), calling `handleCancelAction()` with no payload exactly as the Decisions section specifies. `game-board.local-actions.hook.test.ts` covers all four flag types plus `pendingAction` via `it.each` (lines 122-149), a full Extra-Move refund round-trip through `handleGameAction` (151-173), and a Scout un-scout round-trip (175-196), plus the two boundary cases (no pending action; not the local player's turn).

## Findings
| # | File:line | Problem | Owner | Blocking? |
|---|---|---|---|---|

No findings. Diff matches the File plan's owner list exactly (`implementer-a` for all 6 production files; tester-a's test files and the new `game-board.local-actions.hook.test.ts` are the only other changes in this task's scope). No invented paths or symbols — every file and line cited in plan.md was re-verified against the current working tree in this session.

## Docs
- `docs-sync`: ran. `docs/architecture/game-mechanics.md` §6.2 (Deselect Army button now cross-references the cancel behavior), §6.3 Position and Attack subsections (both now note the Extra-Move exception), and the Combat Resolution section (defeated armies respawn with `hasActed: true`, cleared only by the next turn's reset) — all now match the fixed code. `docs/architecture/special-cards.md`'s Extra Move entry is corrected to remove the stale claim that activating the card reactivates all armies (`hasActed: false`) — verified against `card-effects.reducer.ts:23-24`, which only ever sets `player.hasExtraMove = true` and never touches any army's `hasActed`; this was a pre-existing doc inaccuracy, now fixed as part of the same behavior clarification. A new §6.6-equivalent bullet documents the bonus-action semantics (consumes `hasExtraMove`, bypasses the acted-check, doesn't change `hasActed` either way) matching the reducer fix.
