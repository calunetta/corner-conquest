# Lessons learned

A durable, cross-task record of non-obvious mistakes made in this project's AI-assisted work, and the rule that prevents each one. This is not a changelog and not per-task history (that's `docs/ai/tasks/*/progress.md`) — it only holds mistakes a future agent, working on unrelated code, would otherwise repeat.

Read the entries relevant to your stage before you start. Append one, using skill `lessons-learned`, when a review step (gate review, final review, cross-review) catches a real, non-obvious bug — not every `CHANGES REQUESTED`, only the kind that looks right and would pass casual review again.

Entry format: `- **<what went wrong>** → <the rule that prevents it>. (source: <task folder>, <date>)`

## Hooks & effects

- **Extracting an effect into its own hook file widened its dependency from a memoized derived boolean to the whole source object it was derived from**, so a 700ms auto-end-turn timer restarted on every unrelated state change instead of only when the dialog/pending-action status actually flipped. → When splitting a hook across files, recompute the derived primitive (`useMemo`) at the new call site and depend on *that*, never pass the whole source object across a hook boundary as a dependency proxy. (source: docs/ai/tasks/2026-10-02-gameboardcontext-migration, 2026-10-03)

## Testing / Jest

- **A shared test-utility file with no `test()` calls, placed directly in a `__tests__/` directory, was still picked up by Jest's directory-based `testMatch` and failed the whole run** ("Your test suite must contain at least one test") — even though its filename didn't contain `.test.`. → Put shared test builders, mocks, and fixtures in a `__tests__/test-utils/` subfolder, never loose in `__tests__/`. (source: docs/ai/tasks/2026-10-02-gameboardcontext-migration, 2026-10-03)

## TypeScript casts

- **A narrowed cast (`as NonNullable<X>['type']`) failed to typecheck** because the source object had a field the target type required as non-optional, which the source left optional. → Cast the whole object (`as TargetType`, or `as unknown as TargetType` when there's a genuine structural gap, with a comment naming the gap) rather than narrowing the cast further. (source: docs/ai/tasks/2026-10-02-gameboardcontext-migration, 2026-10-03)

## State with two sources

- **A field existed on both local derived state and server-synced state** (a player's `name`, on `localPlayer` vs `localPlayerFromServer`) **and an extraction risked silently reading the wrong one.** → When a plan splits a handler across files, state explicitly which source each duplicated field must read from, and put it on the gate-review checklist. (source: docs/ai/tasks/2026-10-02-gameboardcontext-migration, 2026-10-03)

## Test assertions

- **A new characterization test for "current player leaves the match" asserted only that `currentPlayerIndex` was in range and `turn` increased, which hid a real turn-order bug**: `handlePlayerExit` sets `currentPlayerIndex = playerIndex % players.length` (already the next player) and then calls `handleEndTurn`, which advances again, so the player who should go next is skipped (3 players, seat 1 leaves on their turn: turn goes to Host, P3 is skipped). The legacy code behaves identically, so the migration kept it. → In characterization or port tests, assert the exact observable outcome (who is current), not a range; a range assertion passes for any value and cannot catch wrong rotation. (source: docs/ai/tasks/2026-10-03-game-rules-actions-migration, 2026-10-03)

## Refactors

- **A directory-move plan inventoried imports and the main README but not skills, agent prompts, scripts or comments that cite the old path, which left agent-facing instructions pointing at a deleted folder** → Before approving a move or delete plan, run `grep -rn "<old/path>"` over the whole repo (excluding `node_modules` and task records) and list every hit in the File plan as fix or leave. (source: docs/ai/tasks/2026-10-03-game-rules-actions-migration, 2026-10-03)
