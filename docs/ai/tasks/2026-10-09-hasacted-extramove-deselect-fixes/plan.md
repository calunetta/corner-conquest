# Plan: hasActed/Extra Move consistency + Deselect Army card refund

Status: APPROVED
Inputs: triage.md

## Goal and acceptance criteria
- [ ] An army defeated in combat (player or monster) respawns at base with `hasActed: true` — it does not get another action until its owner's next turn resets all armies.
- [ ] Using Extra Move's bonus action on an army that **had already acted** (`hasActed` was `true` before the bonus) leaves that army `hasActed: true` once the bonus action completes, for all three action types (Move, Attack/combat roll vs player, Attack/combat roll vs monster, Position).
- [ ] Using Extra Move's bonus action on an army that **had not yet acted** (`hasActed` was `false`) leaves that army `hasActed: false` after the bonus action, for all three action types — it keeps its normal action for later in the turn. (Move already does this correctly; Position and both combat-roll reducers currently do not.)
- [ ] Clicking "Deselect Army" (or the equivalent dispatch) while a pending card action (Teleport/Scout pendingAction, or an active Reinforce/Efficient/MasterBuilder/ExtraMove flag) is in progress but not yet completed refunds that card to hand, clears its flag, and un-scouts any revealed-by-scout tiles — the same outcome `handleCancelAction` already produces, just reachable from this button too.

## Verified context
| Symbol or file | Location | Why it matters |
|---|---|---|
| `handleCloseCombat` | `src/modules/game-rules/combat-player-resolve.reducer.ts:55,93` (current working tree; implementer-a already deleted the two `losingArmy.hasActed = false` lines that were at 56/95 in the approved plan — see Root cause) | Respawn sites for the defender-loses and attacker-loses branches. Neither branch sets `hasActed` after deletion, so the loser keeps whatever value it had going into combat. |
| `handleCombatRoll` | `src/modules/game-rules/combat-player-roll.reducer.ts:18-24` | Only sets `attackingArmy.hasActed`, never touches the defending army's army object — confirms the defender's `hasActed` is untouched for the entire length of combat. |
| `handleInitiateCombatAction` | `src/modules/game-rules/combat-initiate.reducer.ts:18` | Reads `attackingArmy.hasActed`; nothing in this file or `combat-player-roll.reducer.ts` ever writes a defending army's `hasActed`. |
| `handleCloseMonsterCombat` | `src/modules/game-rules/combat-monster-resolve.reducer.ts:96` (current working tree; implementer-a already deleted the `losingArmy.hasActed = false` line that was at line 98 in the approved plan) | Single respawn site, attacker-loses-to-monster. After the Extra Move fix to `combat-monster-roll.reducer.ts` (file plan row below), `attackingArmy.hasActed` can be `false` going into this function (extra-move-while-unacted case) — this branch must force it to `true`, it cannot rely on the roll reducer having already set it. |
| `nextPlayer.hasActed` reset | `src/modules/game-rules/player-turn.reducer.ts` (the per-army reset at turn start, described in `docs/README.md` §6.1) | This is the *only* place `hasActed` should flip back to `false` — confirms respawn should not also flip it. |
| `handleMoveAction` | `src/modules/game-rules/movement.reducer.ts:104-115` | The **correct** pattern already in production: `if (isTeleport) hasActed=true; else if (player.hasExtraMove) { hasExtraMove=false /* hasActed untouched */ } else { hasActed=true }`. Use this exact shape as the template for the two broken sites below. |
| `handleCombatRoll` | `src/modules/game-rules/combat-player-roll.reducer.ts:26` | `attackingArmy.hasActed = true;` runs unconditionally before the `hasExtraMove` check — bug: an unacted army using its bonus attack gets locked out of its normal action. |
| `handleMonsterCombatRoll` | `src/modules/game-rules/combat-monster-roll.reducer.ts:30` | Same unconditional `attackingArmy.hasActed = true;` bug, monster-combat path. |
| `handleSelectResourceForPosition` | `src/modules/game-rules/resource-position.reducer.ts:37` | Same unconditional `selectedArmy.hasActed = true;` bug, Position path. |
| `handleCancelAction` | `src/modules/game-rules/player-cancel-action.reducer.ts` | Already implements the exact refund behavior needed (restores card to hand, clears flag, un-scouts, removes the `UseCard` entry from `actionsThisTurn`) — just needs to be reachable from Deselect Army, not just from an explicit Cancel button. |
| `useLocalActions` | `src/modules/game-board/game-board.local-actions.hook.ts:25-27` | `local_DeselectArmy` only dispatches `SET_SELECTED_ARMY: null` — never calls `handleCancelAction`. This is the second bug site. |
| `uiState.pendingAction` / `localPlayer.reinforceActive/efficientActive/masterBuilderActive/hasExtraMove` | same file, lines 119-124 | The exact condition set already used by the Escape-key handler to decide whether a cancel is needed — reuse it for Deselect Army instead of duplicating logic. |

## Root cause
- **Respawn bug**: `combat-player-resolve.reducer.ts` and `combat-monster-resolve.reducer.ts` were written to mirror "defeated armies go back to base and are usable again next turn," but implemented it as an immediate flag flip to `false` instead of relying on the existing per-turn reset in `player-turn.reducer.ts`. Since `hasActed` is otherwise only ever cleared at turn start, this immediate `false` let a defeated army act again *the same turn* it respawned — not intended. Simply deleting the `= false` line (the original revision of this plan's fix) is **not** sufficient: the defending army in a PvP combat never gets `hasActed` written at all during the roll (`combat-player-roll.reducer.ts` only touches the attacking army; `combat-initiate.reducer.ts:18` only reads it), so a defender that loses while deleted-line-only-fixed keeps whatever `hasActed` it had before combat started — usually `false`, violating acceptance criterion 1. Confirmed in `combat-player-resolve.reducer.test.ts:110`'s "defender respawns with hasActed true" case, which fails against the deletion-only fix. The monster-combat attacker-loses branch has the same exposure once the Extra Move fix below lands: `combat-monster-roll.reducer.ts`'s Extra-Move branch leaves `attackingArmy.hasActed` untouched (stays `false` for a previously-unacted army), so an attacker who uses Extra Move and then loses to the monster would also respawn with `hasActed: false` under a deletion-only fix. The correct fix sets `losingArmy.hasActed = true` explicitly on every respawn path, in both PvP branches and the PvM branch, rather than deleting the line and relying on an incidental prior value.
- **Extra Move inconsistency**: `movement.reducer.ts` was fixed at some point to branch on `hasExtraMove` before setting `hasActed`, but the two combat-roll reducers and the position reducer were never updated to match, so they always force `hasActed = true` regardless of whether the acting army had already acted. Copy-paste drift between four reducers that should share one rule.
- **Deselect Army bug**: `local_DeselectArmy` and `local_CancelAction` are two different dispatch paths that happen to overlap in when a user would reach for either, but only the latter calls `handleCancelAction`. The button literally named "Deselect Army" was wired to the narrower of the two.

## Decisions
- Fix the two combat-roll reducers and the position reducer to follow `movement.reducer.ts`'s existing branch shape exactly, rather than introducing a new shared helper — three call sites, each already structurally similar; a helper would be a premature abstraction for this size of change.
- Fix the two respawn sites (both branches of `handleCloseCombat`, and the single losing branch of `handleCloseMonsterCombat`) by setting `losingArmy.hasActed = true;` explicitly, not by deleting the existing `= false` line and leaving the field untouched. Rejected: "delete the line, the loser already has `hasActed: true` from its own roll" — false for a PvP defender, which never gets `hasActed` written during combat at all, and false for any attacker who used Extra Move then lost (see Root cause). An explicit `= true` is correct and no more code than the deletion-only version.
- Make `local_DeselectArmy` call `handleCancelAction()` **with no payload** whenever a pending card/flag exists, in addition to its existing `SET_SELECTED_ARMY: null` dispatch — not conditional on whether an army is also selected. `handleCancelAction` (`src/modules/game-board/game-board.card-actions.hook.ts:17-40`) already self-infers which card to cancel when called bare (checks `pendingAction?.cardName`, then `reinforceActive`, `efficientActive`, `masterBuilderActive`, `hasExtraMove` in that order, and auto-attaches `scoutedTiles` for an in-progress Scout) — this is exactly how the Escape-key handler already invokes it (`game-board.local-actions.hook.ts:126`, also no payload). No new inference logic needs writing. Rejected: only refunding via Escape (current state) — the user explicitly wants the button to match.

## File plan
| File | New / Edit | Responsibility | Owner |
|---|---|---|---|
| `src/modules/game-rules/combat-player-resolve.reducer.ts` | edit | implementer-a already deleted the two `losingArmy.hasActed = false` / `loserArmy.hasActed = false` lines (previously at 56 and 95, now-removed code sat at what is currently line 55 and 93 in the working tree). Add `losingArmy.hasActed = true;` back in the defender-loses branch (currently ~line 55, right after `losingArmy.position = { x: baseTile.x, y: baseTile.y };`) and `loserArmy.hasActed = true;` in the attacker-loses branch (currently ~line 93, right after the equivalent `loserArmy.position = …` line). | implementer-a |
| `src/modules/game-rules/combat-monster-resolve.reducer.ts` | edit | implementer-a already deleted the `losingArmy.hasActed = false` line (previously at 98). Add `losingArmy.hasActed = true;` back, right after `losingArmy.position = { x: baseTile.x, y: baseTile.y };` (currently ~line 96). | implementer-a |
| `src/modules/game-rules/combat-player-roll.reducer.ts` | edit | Replace unconditional `attackingArmy.hasActed = true;` (line 26) with the Extra-Move-aware branch from `movement.reducer.ts`. | implementer-a |
| `src/modules/game-rules/combat-monster-roll.reducer.ts` | edit | Same branch fix at line 31. | implementer-a |
| `src/modules/game-rules/resource-position.reducer.ts` | edit | Same branch fix at line 37. | implementer-a |
| `src/modules/game-board/game-board.local-actions.hook.ts` | edit | `local_DeselectArmy` case also calls `handleCancelAction()` with no payload (it self-infers the active card, matching the Escape-key handler) when `uiState.pendingAction` or any of `reinforceActive/efficientActive/masterBuilderActive/hasExtraMove` is set. | implementer-a |

## Contracts
No type or signature changes — all reducers keep their existing exported function signatures.

Respawn fix, both branches of `handleCloseCombat` (`combat-player-resolve.reducer.ts`) and the losing branch of `handleCloseMonsterCombat` (`combat-monster-resolve.reducer.ts`): immediately after the line that resets the loser's `position` to the base tile, add
```ts
losingArmy.hasActed = true; // Always acted once it respawns, regardless of its pre-combat value
```
(name the local variable as it already appears at that call site — `losingArmy` in the defender-loses PvP branch and the PvM branch, `loserArmy` in the attacker-loses PvP branch). This is an explicit assignment, not a restoration of the deleted `= false` line with its value flipped — it must win over whatever value the army already had, including `false` for a PvP defender (never written during combat) or an attacker who used Extra Move then lost.

For the Extra Move branch, the shape to copy from `movement.reducer.ts:104-115`:
```ts
if (isTeleport /* or the equivalent "this is the bonus/special path" condition */) {
  army.hasActed = true;
} else if (player.hasExtraMove) {
  player.hasExtraMove = false;
  // army.hasActed is left untouched — true stays true, false stays false
} else {
  army.hasActed = true;
}
```
For the two combat-roll reducers there is no `isTeleport` equivalent — the shape collapses to:
```ts
if (attacker.hasExtraMove) {
  attacker.hasExtraMove = false;
} else {
  attackingArmy.hasActed = true;
}
```
(Existing extra-move logging stays, just moved inside this branch instead of running after an unconditional `hasActed = true`.)

## Phases
### Phase 1: all five fixes, one commit
1. Fix `combat-player-resolve.reducer.ts` and `combat-monster-resolve.reducer.ts` respawn lines: add back `losingArmy.hasActed = true;` (or `loserArmy.hasActed = true;`) explicitly in each losing branch, per Contracts. (implementer-a)
2. Fix `combat-player-roll.reducer.ts`, `combat-monster-roll.reducer.ts`, `resource-position.reducer.ts` Extra Move branches. (implementer-a)
3. Wire `local_DeselectArmy` to also call `handleCancelAction()` (no payload — it self-infers). (implementer-a)
4. Run `npm run typecheck && npm run lint && npm test`. (implementer-a)

Model escalation: none expected — this is mechanical reducer logic matching an existing in-repo pattern.

## Test plan
- tester-a:
  - Respawn: confirm the pre-existing "attacker/positioned army sets hasActed:true on its own roll" behavior is untouched for the winner; the *loser's* post-respawn flag is `true` (both PvP and PvM) regardless of its pre-combat value. PvP defender case specifically: set the defending army's `hasActed` to `false` before combat (defenders never get it set during the roll), have it lose, assert `true` after respawn — this is the case the deletion-only fix failed.
  - Extra Move + Move (regression only, should already pass): unacted army uses bonus move → `hasActed:false` after. Acted army uses bonus move → `hasActed:true` after (unchanged, was already `true`).
  - Extra Move + Attack (PvP and PvM): unacted army uses bonus attack → `hasActed:false` after the roll resolves. Acted army uses bonus attack → `hasActed:true` after.
  - Extra Move + Position: unacted army uses bonus position → `hasActed:false` after. Acted army uses bonus position → `hasActed:true` after.
  - Respawned army + Extra Move same turn: an army that just respawned (`hasActed:true` under the fix) cannot act again without Extra Move; with Extra Move it can, and afterward reverts to `hasActed:true` once the bonus is consumed (matches "already acted" branch).
  - `local_DeselectArmy` with an active Teleport `pendingAction`: card returns to hand, `pendingAction` clears, `actionsThisTurn` no longer includes `UseCard`.
  - `local_DeselectArmy` with `reinforceActive`/`efficientActive`/`masterBuilderActive`/`hasExtraMove` true but no `pendingAction`: same refund.
  - `local_DeselectArmy` with no active card state: unchanged, only deselects.

## Preview states
None — no view changes.

## Risks
- `hasActed` is read in many places (`getPossibleMoves`, combat-initiate guard, bot logic). Run the full `npm test` suite, not just the touched files' tests, since bot reducers also branch on `hasActed`/`hasExtraMove`.

## Review (architect-b)
Verified every cited path/symbol/line against the actual files: `combat-player-resolve.reducer.ts:56,95`, `combat-monster-resolve.reducer.ts:98`, `movement.reducer.ts:104-115`, `combat-player-roll.reducer.ts:26`, `game-board.local-actions.hook.ts:25-27,118-132`, `player-cancel-action.reducer.ts` (full file), `game-board.card-actions.hook.ts:17-40` — all match. Confirmed `handleCancelAction`'s self-inference (cardName from `pendingAction` → `reinforceActive` → `efficientActive` → `masterBuilderActive` → `hasExtraMove`, scoutedTiles auto-attached) lives in the hook, not the reducer, exactly as the plan's Decisions section describes; the reducer itself is a no-op when `cardName` is undefined, so calling it bare is safe. Confirmed `ActionsPanel.hook.ts:53` is the only other `local_DeselectArmy` call site and needs no change — File plan is complete. Confirmed the 5 existing reducer tests that assert today's buggy `hasActed` behavior (`combat-player-resolve.reducer.test.ts:108,129`, `combat-monster-resolve.reducer.test.ts:142`) will need updating by tester-a per the Test plan's first bullet — already covered there, no gap.

Found and fixed two trivial line-number citations (off by one against the actual files): `combat-monster-roll.reducer.ts:31`→`:30`, `resource-position.reducer.ts:36`→`:37`. Found and fixed a real wording contradiction in the File plan row for `game-board.local-actions.hook.ts`, which said "calls `handleCancelAction` with the active card name" while the Decisions section (correctly, matching verified code) says "with no payload" since the hook self-infers — reworded the File plan row to match the Decisions section so implementer-a doesn't have to resolve the contradiction itself.

No simpler design available: three structurally-identical reducer branches is correctly judged too small to warrant a shared helper; reusing `handleCancelAction`'s existing self-inference instead of writing new logic in the hook is the right reuse call. Contracts are complete for a single implementer (no parallel split needed at this tier). Scope and phasing are appropriate for tier S.

## Review (architect-b, round 2)
Re-verified the revised contract against the current working tree, not just the diff. `combat-player-resolve.reducer.ts:55` (defender-loses branch) and `:93` (attacker-loses branch) both still end their position-reset code with no `hasActed` write — confirmed neither branch sets it, matching the plan's claim. `combat-monster-resolve.reducer.ts` has its losing-branch position reset at line 97 (plan says "~96", off by one but marked approximate — not worth a round trip). No `hasActed` write there either. Confirmed via `combat-player-roll.reducer.ts:34-36` that only `attackingArmy.hasActed` is ever touched during a PvP roll — the defending army's `hasActed` is genuinely never written before `handleCloseCombat` runs, so the revised explicit `losingArmy.hasActed = true;` (not a restored `=false` with the value flipped) is the correct fix for the blocker tester-a raised. Grepped both `*.resolve.reducer.test.ts` files for `hasActed).toBe(false)` post-respawn: no hits, so the unconditional assignment breaks no existing assertion.

The three Extra Move reducer fixes (`combat-player-roll.reducer.ts:27-36`, `combat-monster-roll.reducer.ts:31-40`, `resource-position.reducer.ts:38-52`) and the `local_DeselectArmy` wiring (`game-board.local-actions.hook.ts:37-41`, guarded by `hasPendingCardAction`, no payload) are already in the working tree from implementer-a's first pass and match the plan's Contracts section exactly — no change needed there.

Design unchanged from round 1 and still correct: explicit `= true` over a bare deletion is the minimal fix that actually closes the gap, not a new abstraction. No simpler option exists for a one-line-per-branch bug fix.

VERDICT: APPROVED
