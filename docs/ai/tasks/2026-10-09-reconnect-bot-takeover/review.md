# Final review: Replace a leaving player with a bot, phase 2

VERDICT: APPROVED

## Round 2 (2026-10-10)
Re-checked the one blocking finding: `docs/architecture/systems-and-visuals.md`'s §6.14 is now physically positioned after §6.13 (`grep -n '^## 6\.' docs/architecture/systems-and-visuals.md` → 6.7, 6.8, 6.9, 6.10, 6.11, 6.12, 6.13, 6.14, in order). Diffed against the previous version: the section's content is unchanged, only moved — confirmed no text was altered in the move. No other changes in this pass. Round 1's findings on the hook/service diffs (transactional `writeHeartbeat`, broadcast-vs-single-driver split) remain approved, unaffected by this fix.

## Checks run
- `npm run typecheck`: clean.
- Scoped `npx eslint` on the 8 files this phase touched/added (`game-board.engine.service.ts`/`.test.ts`, `game-board.heartbeat.hook.ts`/`.test.ts`, `game-board.staleness.hook.ts`/`.test.ts`, `game-board.engine.hook.ts`/`.test.ts`): clean, no output.
- `npx jest src --testPathIgnorePatterns='/\.claude/' --testPathIgnorePatterns='/\.agents/'` → `Test Suites: 1 failed, 167 passed, 168 total`, `Tests: 2054 passed, 2054 total`. The one failing suite is the same pre-existing `gameBoardTestKit.tsx` ("must contain at least one test") noted in the Phase 1 review — unrelated, predates this task. Matches implementer-a's reported numbers exactly.
- A literal repo-root `npm run lint`/`npm test` is still broken by the stray `.claude/worktrees/inspiring-kare-ee7f7f/` directory flagged in the Phase 1 review — still present, still unrelated to this phase. Not re-litigated here beyond this note.
- ui-verify: not applicable — Phase 2 is logic-only, no new UI (per plan.md's Preview states section).

## Plan adherence
Checked against plan.md's Phase 2 Contracts, with particular attention to the two things round 1 required:
- **`writeHeartbeat` is transactional, not a dotted-path `updateDoc`** (the exact defect round 1 blocked on): confirmed — `game-board.engine.service.ts` adds `writeHeartbeat` using `runTransaction`, reading the document, mutating `state.players[playerIndex].lastSeenAt`, and `transaction.set`-ing the whole document back. `game-board.engine.service.test.ts`'s new `writeHeartbeat` block directly tests the property round 1 required this transaction for: "keeps another seat's lastSeenAt from the transaction's read so a concurrent heartbeat is not dropped." Matches the plan's Contracts block exactly.
- **Broadcast vs. single-driver split**: confirmed sound and correctly implemented.
  - `useStalenessCheck` (`game-board.staleness.hook.ts`) is broadcast — every client's own interval scans peers (`findStalePeerIds` excludes `isBot` seats and the caller's own `playerId`) and calls `handlePlayerExit` for each stale one, matching the plan's "every client watches its peers" design and its stated reason (a pre-elected driver can be exactly the seat that went dark).
  - `isSessionDriver` (`game-board.engine.hook.ts`) stays single-driver for the two non-transactional effects (bot-turn-trigger, death-animation-clearing), computed as the lowest player `id` with `isBot === false`, replacing `isHost` only in those two effects' conditions. `isHost`'s returned value and its other consumer (`game-board.session.hook.ts`) are untouched — confirmed, that file has no diff in this phase.
  - New test `game-board.engine.hook.test.ts`: "the lowest human seat triggers bot turns when seat 0 is already a bot" / "a higher human seat does not" / "a bot seat never triggers bot turns, even when it is the lowest seat" directly exercises the exact scenario this design exists to fix (seat 0 disconnected and converted, no client left with `isHost === true`).
- `HEARTBEAT_INTERVAL_MS` (15 000), `STALE_THRESHOLD_MS` (45 000), `STALENESS_CHECK_INTERVAL_MS` (20 000): match the plan's Contracts exactly, in both hooks and the new docs section.
- `useHeartbeat`: no-op unless `playing` + human + not-bot, fires immediately on mount, clears on unmount/dep-change — all per contract, all covered by tests ("writes a heartbeat immediately on mount", "stops writing when the status changes away from playing", "clears the interval on unmount", "restarts for the new seat index when the local player changes seat").
- `useStalenessCheck`: ref-based interval (doesn't restart on every snapshot), self-exclusion by `playerId`, null-`lastSeenAt` skip, strict-greater-than threshold comparison — all per contract, all covered ("never exits the local player, even when its own lastSeenAt is stale", "does not exit a peer whose heartbeat is exactly at the threshold", "checks the latest snapshot on a tick without restarting the interval on each snapshot").
- The bug found and fixed during the tests stage (missing `.catch` on the fire-and-forget `handlePlayerExit` call) is a reasonable defensive fix and is covered by its own regression test ("does not throw and logs when handlePlayerExit rejects").

## Findings
| # | File:line | Problem | Owner | Blocking? |
|---|---|---|---|---|
| 1 | `docs/architecture/systems-and-visuals.md:92-99` | New `## 6.14. Disconnect Detection & Seat Takeover` is inserted **physically before** the pre-existing `## 6.13. Island Tile Visual Layout & Animated Sprite Architecture` (confirmed: `grep -n '^## 6\.' docs/architecture/systems-and-visuals.md` shows the heading order 6.7, 6.8, ..., 6.12, **6.14, 6.13**). The file's own stated convention is that section numbers are stable identifiers kept attached to their content "even if you reorder" — that permits reordering sections while keeping their numbers, it does not cover inserting new content out of numeric order by mistake. A reader scanning the file sees 6.14 before 6.13, which is confusing and looks like a docs-sync slip, not an intentional reorder (nothing explains why 6.14 would precede 6.13). | docs-sync | Yes — move the new section to after §6.13's content (physically last in the file, as §6.13 was before this edit), or, if an intentional reorder, add a one-line note like the existing 2026-10-09 renumbering note explaining why. Either way this must be fixed before Phase 2's commit, since Phase 3 will add more content to this same file and compound the confusion. |

No findings against the hook/service/test diffs themselves — they match the plan's Contracts precisely, including the specific transactional-write and broadcast-vs-driver requirements from round 1.

## Docs
- `docs-sync`: ran. Added `docs/architecture/systems-and-visuals.md` §6.14 (content accurate against the code — see Plan adherence), updated the §6.9 bot-logic cross-reference and the §6.12 Match Dismantling Rules' "Leaving a Match In Progress" bullet to mention the staleness trigger, updated `docs/README.md`'s index row, and added `game-board.heartbeat.hook.ts`/`game-board.staleness.hook.ts` to `docs/architecture/structure-and-state.md` §2's `game-board/` description. All content is correct; the one defect is the section's physical placement (Finding 1), not its content.
